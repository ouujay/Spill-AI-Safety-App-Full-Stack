# posts/views.py

import time
from datetime import datetime, timedelta
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count, F, Case, When, Value, FloatField, Max
from django.db.models.functions import Greatest
from django.utils import timezone

from django.shortcuts import get_object_or_404
from rest_framework import generics, status, throttling
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.decorators import api_view, permission_classes

from users.permissions import IsSelfieVerified
from users.models import UniversityFollow

from posts.feed_engine import calculate_post_score, get_for_you_feed, rank_posts
from .models import (
    Post, PostFlagVote, SeenPost, SeenReply,
    VoteReaction, SavedPost, ReportedPost, Hashtag
)
from .serializers import (
    PostCreateSerializer, PostDetailSerializer, PostSerializer,
    PostPreviewSerializer, ReplyCreateSerializer, ReplySerializer, VoteReactionSerializer,
    PostFlagVoteSerializer, SavedPostSerializer, ReportedPostSerializer,
    UniversityPreviewSerializer,
)
from .search_service import (
    posts_for_hashtag, search_posts, search_universities,
    search_hashtags, trending_hashtags,
)
from .selectors import scope_filter
from .utils import encode_cursor, decode_cursor, apply_keyset

# Cloudinary imports
import cloudinary
import cloudinary.uploader
from cloudinary.utils import api_sign_request


# --------------------------------------------------
# Throttles
# --------------------------------------------------
class BurstBatchThrottle(throttling.UserRateThrottle):
    scope = "batch_burst"

class SustainedBatchThrottle(throttling.UserRateThrottle):
    scope = "batch_sustained"


# --------------------------------------------------
# Batch actions (updated for new voting system)
# --------------------------------------------------
class BatchActionsView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [BurstBatchThrottle, SustainedBatchThrottle]

    def post(self, request):
        actions = request.data.get("actions", []) or []
        commit_seen_hdr = (request.headers.get("X-Commit-Seen") or "").strip().lower() in {"1", "true", "yes"}
        commit_seen_body = bool(request.data.get("commit_seen"))
        commit_seen = commit_seen_hdr or commit_seen_body

        out = []
        view_ids_unique = []

        for action in actions:
            action_type = (action.get('type') or 'unknown').lower()
            pid = action.get('id')

            if action_type == 'view':
                if pid and isinstance(pid, int):
                    view_ids_unique.append(pid)
                if not commit_seen:
                    out.append({"ok": True, "kind": "view", "id": pid, "skipped": True, "reason": "not committed"})
                continue

            try:
                if action_type == "like":
                    # Handle likes (Tea posts and comments only)
                    post = get_object_or_404(Post, pk=pid)
                    if post.parent_id is None and post.flag in ("red", "green"):
                        out.append({"ok": False, "kind": "like", "id": pid, "error": "Use flag voting on flagged posts"})
                        continue
                    
                    op = action.get("op", "").lower()
                    if op == "add":
                        VoteReaction.objects.update_or_create(
                            user=request.user, post=post, defaults={"reaction": "up"}
                        )
                        out.append({"ok": True, "kind": "like", "id": pid})
                    elif op == "remove":
                        deleted, _ = VoteReaction.objects.filter(user=request.user, post=post).delete()
                        out.append({"ok": bool(deleted), "kind": "like", "id": pid})

                elif action_type == "flag_vote":
                    # Handle flag votes (Red/Green posts only)
                    post = get_object_or_404(Post, pk=pid, parent__isnull=True)
                    if post.flag not in ("red", "green"):
                        out.append({"ok": False, "kind": "flag_vote", "id": pid, "error": "Only flagged posts accept red/green votes"})
                        continue
                    
                    vote = action.get("vote", "").lower()
                    if vote in ("red", "green"):
                        PostFlagVote.objects.update_or_create(
                            user=request.user, post=post, defaults={"vote": vote}
                        )
                        out.append({"ok": True, "kind": "flag_vote", "id": pid, "vote": vote})
                    elif vote == "remove":
                        deleted, _ = PostFlagVote.objects.filter(user=request.user, post=post).delete()
                        out.append({"ok": bool(deleted), "kind": "flag_vote", "id": pid})

                elif action_type == "save":
                    op = action.get("op", "").lower()
                    if op == "add":
                        SavedPost.objects.get_or_create(user=request.user, post_id=pid)
                        out.append({"ok": True, "kind": "save", "id": pid})
                    elif op == "remove":
                        deleted, _ = SavedPost.objects.filter(user=request.user, post_id=pid).delete()
                        out.append({"ok": bool(deleted), "kind": "save", "id": pid})

                else:
                    out.append({"ok": False, "id": pid, "error": "unknown type"})

            except Post.DoesNotExist:
                out.append({"ok": False, "kind": action_type, "id": pid, "error": "post not found"})
            except Exception as e:
                out.append({"ok": False, "kind": action_type, "id": pid, "error": str(e)})

        # Bulk commit of view actions
        if commit_seen and view_ids_unique:
            try:
                existing_posts = set(Post.objects.filter(id__in=view_ids_unique).values_list("id", flat=True))
                if existing_posts:
                    already = set(SeenPost.objects.filter(user=request.user, post_id__in=existing_posts).values_list("post_id", flat=True))
                    to_insert_ids = [pid for pid in existing_posts if pid not in already]
                    to_create = [SeenPost(user=request.user, post_id=pid) for pid in to_insert_ids]

                    if to_create:
                        SeenPost.objects.bulk_create(to_create, ignore_conflicts=True, batch_size=500)

                    for pid in view_ids_unique:
                        out.append({"ok": True, "kind": "view", "id": pid, "committed": True})

            except Exception as e:
                for pid in view_ids_unique:
                    try:
                        SeenPost.objects.get_or_create(user=request.user, post_id=pid)
                        out.append({"ok": True, "kind": "view", "id": pid, "committed": True})
                    except Exception as inner:
                        out.append({"ok": False, "kind": "view", "id": pid, "error": str(inner)})

        return Response({"results": out}, status=200)


# --------------------------------------------------
# Post Creation & Detail (FIXED)
# --------------------------------------------------
class CreatePostView(APIView):
    permission_classes = [IsAuthenticated, IsSelfieVerified]

    def post(self, request):
        data = request.data.copy()
        parent_id = data.get('parent')
        parent = None

        if parent_id:
            parent = Post.objects.filter(id=parent_id).first()
            if not parent:
                return Response({"error": "Parent post not found."}, status=404)
            data['thread'] = parent.thread.id if parent.thread else parent.id

        serializer = PostCreateSerializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        
        # FIXED: Set the author to the authenticated user
        post = serializer.save(author=request.user, parent=parent)
        
        output = PostDetailSerializer(post, context={"request": request})
        return Response(output.data, status=201)


class PostDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, post_id):
        post = get_object_or_404(
            Post.objects
                .select_related('author', 'university', 'parent', 'thread')
                .prefetch_related('replies', 'hashtags'),
            id=post_id
        )
        return Response(PostDetailSerializer(post, context={"request": request}).data)


# --------------------------------------------------
# Replies/Comments (pagination)
# --------------------------------------------------
class ReplyPagination(PageNumberPagination):
    page_size = 6
    page_size_query_param = 'page_size'
    max_page_size = 20


class PostRepliesView(generics.ListAPIView):
    serializer_class = ReplySerializer
    permission_classes = [AllowAny]
    pagination_class = ReplyPagination

    def get_serializer_context(self):
        return {"request": self.request}

    def get_queryset(self):
        parent_id = self.kwargs.get('post_id')
        sort = (self.request.query_params.get('sort') or 'top').lower()
        now = timezone.now()

        qs = (
            Post.objects
            .filter(parent_id=parent_id)
            .select_related('author', 'university', 'parent', 'thread')
            .prefetch_related('hashtags')
        )

        # Annotations for sorting
        qs = qs.annotate(
            upvotes=Count('reactions', filter=Q(reactions__reaction='up'), distinct=True),
            child_count=Count('replies', distinct=True),
            last_activity_at=Greatest(
                F('created_at'),
                Max('replies__created_at'),
                Max('reactions__created_at'),
            ),
            recent_boost=Case(
                When(created_at__gte=now - timedelta(days=1), then=Value(1.0)),
                When(created_at__gte=now - timedelta(days=7), then=Value(0.5)),
                default=Value(0.0),
                output_field=FloatField(),
            ),
            score=F('upvotes') + (Value(0.5) * F('child_count')) + F('recent_boost')
        )

        if sort == 'new':
            qs = qs.order_by('-created_at', '-id')
        else:
            qs = qs.order_by('-score', '-last_activity_at', '-created_at', '-id')

        return qs


# --------------------------------------------------
# Voting Systems (Like vs Flag Vote)
# --------------------------------------------------
class VoteReactionView(APIView):
    """Handle likes for Tea posts and comments"""
    permission_classes = [IsAuthenticated]
    throttle_classes = [BurstBatchThrottle, SustainedBatchThrottle]

    def post(self, request, post_id):
        post = get_object_or_404(Post, pk=post_id)
        
        # Only allow likes on Tea posts (no flag) OR replies/comments
        if post.parent_id is None and post.flag in ("red", "green"):
            return Response({
                "error": "Use red/green voting on flagged posts.",
                "interaction_mode": "flag_vote"
            }, status=400)

        serializer = VoteReactionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        VoteReaction.objects.update_or_create(
            user=request.user, post=post, defaults={"reaction": "up"}
        )
        return Response({"message": "Post liked"}, status=200)


class RemoveVoteReactionView(APIView):
    """Remove like from Tea posts and comments"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, post_id):
        post = get_object_or_404(Post, pk=post_id)
        
        if post.parent_id is None and post.flag in ("red", "green"):
            return Response({"error": "Use flag vote removal for flagged posts"}, status=400)

        deleted, _ = VoteReaction.objects.filter(user=request.user, post=post).delete()
        if deleted:
            return Response({"message": "Like removed"}, status=200)
        return Response({"message": "No like to remove"}, status=404)


class FlagVoteView(APIView):
    """Handle red/green flag votes for flagged posts only"""
    permission_classes = [IsAuthenticated]
    throttle_classes = [BurstBatchThrottle, SustainedBatchThrottle]

    def post(self, request, post_id):
        post = get_object_or_404(Post, pk=post_id, parent__isnull=True)
        
        if post.flag not in ("red", "green"):
            return Response({
                "error": "Only flagged posts accept red/green votes.",
                "interaction_mode": "like_only"
            }, status=400)

        serializer = PostFlagVoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        PostFlagVote.objects.update_or_create(
            user=request.user, post=post, 
            defaults={"vote": serializer.validated_data["vote"]}
        )
        return Response({"message": "Flag vote recorded"}, status=200)


class RemoveFlagVoteView(APIView):
    """Remove red/green flag vote"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, post_id):
        post = get_object_or_404(Post, pk=post_id, parent__isnull=True)
        
        if post.flag not in ("red", "green"):
            return Response({"error": "Only flagged posts have flag votes"}, status=400)

        deleted, _ = PostFlagVote.objects.filter(user=request.user, post=post).delete()
        if deleted:
            return Response({"message": "Flag vote removed"}, status=200)
        return Response({"message": "No flag vote to remove"}, status=404)


# --------------------------------------------------
# Feed with Person Search
# --------------------------------------------------
class FeedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        scope = request.query_params.get('scope', 'for_you')
        page_size = int(request.query_params.get('page_size', 20))
        cursor_token = request.query_params.get('cursor')
        
        # NEW: Person search filters
        name = (request.query_params.get("name") or "").strip()
        uni_id = request.query_params.get("university_id")
        age = request.query_params.get("age")
        
        now = timezone.now()

        if scope not in ['for_you', 'following', 'my_uni']:
            return Response({'error': 'Invalid scope. Must be: for_you, following, or my_uni'}, status=400)

        # Cursor management
        cursor = {
            "mode": "unseen",
            "last_created_at": None,
            "last_id": None,
            "refresh_watermark": now.isoformat(),
        }
        if cursor_token:
            try:
                cursor = decode_cursor(cursor_token)
            except Exception:
                pass

        refresh_cutoff = cursor.get("refresh_watermark", now.isoformat())
        try:
            refresh_cutoff_dt = datetime.fromisoformat(refresh_cutoff.replace('Z', '+00:00'))
        except Exception:
            refresh_cutoff_dt = now

        # Base queryset with person search filters
        base_qs = (Post.objects
                   .filter(created_at__lte=refresh_cutoff_dt, parent__isnull=True)
                   .select_related('author', 'university')
                   .prefetch_related('hashtags'))

        # Apply person search filters
        if name:
            base_qs = base_qs.filter(first_name__icontains=name)
        if uni_id and str(uni_id).isdigit():
            base_qs = base_qs.filter(university_id=int(uni_id))
        if age and str(age).isdigit():
            base_qs = base_qs.filter(person_age=int(age))

        base_qs = scope_filter(base_qs, scope, user)

        # Exclude suppressed posts
        base_qs = base_qs.exclude(
            Q(moderation_status__in=[Post.MOD_SOFT, Post.MOD_ESC]) &
            (Q(moderation_until__isnull=True) | Q(moderation_until__gt=now))
        )

        # Annotations for different post types
        from django.db.models import OuterRef, Subquery
        views_subq = (SeenPost.objects.filter(post_id=OuterRef('pk')).values('post_id').annotate(c=Count('id')).values('c')[:1])

        annotated_qs = base_qs.annotate(
            seen=Q(id__in=SeenPost.objects.filter(user=user).values_list('post_id', flat=True)),
            upvotes=Count('reactions', filter=Q(reactions__reaction='up'), distinct=True),
            red_votes=Count('flag_votes', filter=Q(flag_votes__vote='red'), distinct=True),
            green_votes=Count('flag_votes', filter=Q(flag_votes__vote='green'), distinct=True),
            repost_count=Count('reposts', distinct=True),
            comment_count=Count('replies', distinct=True),
            views=Subquery(views_subq),
        )

        # Split unseen/seen
        unseen_qs = annotated_qs.filter(seen=False)
        seen_qs = annotated_qs.filter(seen=True)

        # Pagination logic
        last_created_at = cursor.get("last_created_at")
        last_id = cursor.get("last_id")

        def page_queryset(qs):
            if last_created_at and last_id:
                try:
                    last_created_dt = datetime.fromisoformat(last_created_at.replace('Z', '+00:00'))
                    return list(apply_keyset(qs, last_created_dt, last_id)[:page_size])
                except Exception:
                    return list(qs.order_by('-created_at', '-id')[:page_size])
            return list(qs.order_by('-created_at', '-id')[:page_size])

        # Fetch items based on mode
        items = []
        mode_next = cursor.get("mode", "unseen")

        if cursor.get("mode", "unseen") == "unseen":
            unseen_posts = page_queryset(unseen_qs)
            if len(unseen_posts) < page_size:
                needed = page_size - len(unseen_posts)
                seen_posts = list(seen_qs.order_by('-created_at', '-id')[:needed])
                items = unseen_posts + seen_posts
                mode_next = "seen" if seen_posts else "seen"
            else:
                items = unseen_posts
                mode_next = "unseen"
        else:
            seen_posts = page_queryset(seen_qs)
            items = seen_posts
            mode_next = "seen"

        # Mark seen status for serializer
        for obj in items:
            obj._is_seen = getattr(obj, 'seen', False)

        serialized_data = PostSerializer(items, many=True, context={'request': request}).data

        # Next cursor
        next_cursor = None
        if items:
            last_item = items[-1]
            next_cursor = encode_cursor({
                "mode": mode_next,
                "last_created_at": last_item.created_at.isoformat(),
                "last_id": last_item.id,
                "refresh_watermark": refresh_cutoff_dt.isoformat(),
            })

        return Response({
            "items": serialized_data,
            "next_cursor": next_cursor,
            "scope": scope,
            "has_more": bool(next_cursor),
            "mode": mode_next,
            "filters": {"name": name, "university_id": uni_id, "age": age}
        })


# --------------------------------------------------
# Views tracking, Saves, Reports (unchanged logic)
# --------------------------------------------------
class MarkPostSeenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        post_id = request.data.get('post_id')
        if not post_id:
            return Response({'error': 'Missing post_id'}, status=400)
        post = Post.objects.filter(id=post_id).first()
        if not post:
            return Response({'error': 'Post not found'}, status=404)

        SeenPost.objects.get_or_create(user=request.user, post=post)
        return Response({'message': 'Marked as seen.'}, status=200)


class SavePostView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        post_id = request.data.get('post_id')
        if not post_id:
            return Response({'error': 'Missing post_id'}, status=400)
        post = Post.objects.filter(id=post_id).first()
        if not post:
            return Response({'error': 'Post not found'}, status=404)

        obj, created = SavedPost.objects.get_or_create(user=request.user, post=post)
        if not created:
            return Response({'message': 'Already saved.'}, status=200)
        return Response({'message': 'Post saved!'}, status=201)

    def delete(self, request):
        post_id = request.data.get('post_id')
        if not post_id:
            return Response({'error': 'Missing post_id'}, status=400)
        
        try:
            saved_post = SavedPost.objects.get(user=request.user, post_id=post_id)
            saved_post.delete()
            return Response({'message': 'Post unsaved!'}, status=200)
        except SavedPost.DoesNotExist:
            return Response({'error': 'Not in saved posts.'}, status=404)


class SavedPostsListView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (Post.objects
                .filter(saved_by__user=self.request.user)
                .select_related('author', 'university')
                .prefetch_related('hashtags')
                .order_by('-saved_by__saved_at'))

    def get_serializer_context(self):
        return {"request": self.request}


class ReportPostView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        post_id = request.data.get('post_id')
        reason = request.data.get('reason')
        comment = request.data.get('comment', '')

        if not post_id or not reason:
            return Response({'error': 'Missing post_id or reason.'}, status=400)

        post = get_object_or_404(Post, pk=post_id)

        ReportedPost.objects.update_or_create(
            user=request.user, post=post, 
            defaults={'reason': reason, 'comment': comment}
        )

        # Auto-moderation logic
        now = timezone.now()
        c60 = ReportedPost.objects.filter(post=post, reported_at__gte=now - timedelta(minutes=60)).count()
        c24h = ReportedPost.objects.filter(post=post, reported_at__gte=now - timedelta(hours=24)).count()

        new_status, new_until = post.moderation_status, post.moderation_until
        if c60 >= 20 and post.moderation_status != Post.MOD_ESC:
            new_status = Post.MOD_SOFT
            until = now + timedelta(hours=12)
            new_until = max(post.moderation_until, until) if post.moderation_until else until
        if c24h >= 50:
            new_status = Post.MOD_ESC
            until = now + timedelta(days=7)
            new_until = max(post.moderation_until, until) if post.moderation_until else until

        if new_status != post.moderation_status or new_until != post.moderation_until:
            post.moderation_status = new_status
            post.moderation_until = new_until
            post.save(update_fields=["moderation_status", "moderation_until"])

        return Response({'message': 'Report submitted!'}, status=201)


# --------------------------------------------------
# Search & Discovery
# --------------------------------------------------
class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        tab = request.query_params.get("type", "all")

        if len(q) < 2 and tab in ("hashtags", "all"):
            my_uni_id = request.user.university_id if request.user.is_authenticated else None
            overall = trending_hashtags(limit=10, days=1)
            in_my_uni = trending_hashtags(limit=10, days=1, university_id=my_uni_id) if my_uni_id else []

            if tab == "hashtags":
                return Response({"trending": overall, "trending_in_my_uni": in_my_uni}, status=200)
            else:
                return Response({"hashtags_trending": overall, "hashtags_trending_in_my_uni": in_my_uni}, status=200)

        if len(q) < 2:
            return Response({"error": "Query too short."}, status=400)

        data = {}

        if tab in ("all", "posts"):
            posts = search_posts(q)
            data["posts"] = PostPreviewSerializer(posts, many=True, context={"request": request}).data

        if tab in ("all", "people"):
            # Search people by first name
            people_posts = Post.objects.filter(
                first_name__icontains=q, 
                parent__isnull=True
            ).select_related("author", "university").prefetch_related("hashtags")[:10]
            data["people"] = PostPreviewSerializer(people_posts, many=True, context={"request": request}).data

        if tab in ("all", "university"):
            unis = search_universities(q)
            data["universities"] = UniversityPreviewSerializer(unis, many=True).data

        if tab in ("all", "hashtags"):
            tags = search_hashtags(q)
            data["hashtags"] = [{"name": f"#{t.name}", "count": t.posts.count()} for t in tags]

        return Response(data, status=200)


# --------------------------------------------------
# Cloudinary helpers (unchanged)
# --------------------------------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cloudinary_signature(request):
    try:
        from decouple import config
        
        cloud_name = config('CLOUDINARY_CLOUD_NAME', default=None)
        api_key = config('CLOUDINARY_API_KEY', default=None)
        api_secret = config('CLOUDINARY_API_SECRET', default=None)

        if not all([cloud_name, api_key, api_secret]):
            return Response({"error": "Cloudinary not configured"}, status=503)

        user = request.user
        ts = int(time.time())
        folder = f"app_uploads/user_{user.id}/{timezone.now().date().isoformat()}"

        params_to_sign = {"folder": folder, "timestamp": ts}
        sorted_params = dict(sorted(params_to_sign.items()))
        signature = api_sign_request(sorted_params, api_secret)

        return Response({
            "timestamp": ts,
            "signature": signature,
            "api_key": api_key,
            "cloud_name": cloud_name,
            "folder": folder,
        }, status=200)

    except Exception as e:
        return Response({"error": "Failed to generate upload signature", "detail": str(e)}, status=500)


# --------------------------------------------------
# Additional views for completeness
# --------------------------------------------------
class UniversityPostsView(generics.ListAPIView):
    serializer_class = PostPreviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        uid = int(self.kwargs["university_id"])
        return (Post.objects
                .filter(university_id=uid, parent__isnull=True)
                .select_related("author", "university")
                .prefetch_related("hashtags")
                .order_by("-created_at"))

    def get_serializer_context(self):
        return {"request": self.request}


class HashtagPostsView(generics.ListAPIView):
    serializer_class = PostPreviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        name = self.kwargs.get("name", "")
        return posts_for_hashtag(name)

    def get_serializer_context(self):
        return {"request": self.request}


class UserPostsView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user_id = int(self.kwargs["user_id"])
        return (Post.objects
                .filter(author_id=user_id, parent__isnull=True)
                .select_related("author", "university")
                .prefetch_related("hashtags")
                .order_by("-created_at"))

    def get_serializer_context(self):
        return {"request": self.request}
    


# Add this to posts/views.py

class CreateReplyView(APIView):
    """Dedicated view for creating replies/comments"""
    permission_classes = [IsAuthenticated, IsSelfieVerified]

    def post(self, request, post_id):
        parent = get_object_or_404(Post, pk=post_id)
        
        serializer = ReplyCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        # Inherit thread + university from parent; replies never have a flag
        thread = parent.thread or parent
        inherited_first_name = parent.first_name or "anon"

        reply = serializer.save(
            author=request.user,
            parent=parent,
            thread=thread,
            university=parent.university,
            flag=None,
            first_name=inherited_first_name,
        )

        return Response(
            PostDetailSerializer(reply, context={"request": request}).data, 
            status=201
        )
    


# Update your UserPostsView in posts/views.py

class UserPostsView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user_param = self.kwargs.get("user_id", "")
        
        # Handle "me" for current user
        if user_param == "me":
            if not self.request.user.is_authenticated:
                return Post.objects.none()
            user_id = self.request.user.id
        else:
            try:
                user_id = int(user_param)
            except (ValueError, TypeError):
                return Post.objects.none()
        
        return (Post.objects
                .filter(author_id=user_id, parent__isnull=True)
                .select_related("author", "university")
                .prefetch_related("hashtags")
                .annotate(
                    # Add the same annotations as other views
                    upvotes=Count('reactions', filter=Q(reactions__reaction='up'), distinct=True),
                    red_votes=Count('flag_votes', filter=Q(flag_votes__vote='red'), distinct=True),
                    green_votes=Count('flag_votes', filter=Q(flag_votes__vote='green'), distinct=True),
                    comment_count=Count('replies', distinct=True),
                )
                .order_by("-created_at"))

    def get_serializer_context(self):
        return {"request": self.request}