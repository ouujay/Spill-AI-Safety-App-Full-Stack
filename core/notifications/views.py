from django.shortcuts import render

# Create your views here.
# notifications/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q
from posts.models import Hashtag, Post
from posts.serializers import PostPreviewSerializer
from users.models import University, UniversityFollow, User
from .models import HashtagFollow, UserFollow, Notification

class FollowUserView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"error": "Missing user_id"}, status=400)
        
        if str(user_id) == str(request.user.id):
            return Response({"error": "Cannot follow yourself"}, status=400)
        
        followee = get_object_or_404(User, pk=user_id)
        follow, created = UserFollow.objects.get_or_create(
            follower=request.user, 
            followee=followee
        )
        
        message = "Followed" if created else "Already following"
        return Response({"message": f"{message} {followee.email}"}, status=201)
    
    def delete(self, request):
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"error": "Missing user_id"}, status=400)
        
        deleted_count, _ = UserFollow.objects.filter(
            follower=request.user, 
            followee_id=user_id
        ).delete()
        
        message = "Unfollowed" if deleted_count > 0 else "Already not following"
        return Response({"message": message}, status=200)

class FollowHashtagView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        name = (request.data.get("name") or "").lstrip("#").strip().lower()
        if not name:
            return Response({"error": "Missing hashtag name"}, status=400)
        
        hashtag = get_object_or_404(Hashtag, name=name)
        follow, created = HashtagFollow.objects.get_or_create(
            user=request.user, 
            hashtag=hashtag
        )
        
        message = "Followed" if created else "Already following"
        return Response({"message": f"{message} #{name}"}, status=201)
    
    def delete(self, request):
        name = (request.data.get("name") or "").lstrip("#").strip().lower()
        if not name:
            return Response({"error": "Missing hashtag name"}, status=400)
        
        deleted_count, _ = HashtagFollow.objects.filter(
            user=request.user, 
            hashtag__name=name
        ).delete()
        
        message = "Unfollowed" if deleted_count > 0 else "Already not following"
        return Response({"message": f"{message} #{name}"}, status=200)

class FollowUniversityView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        university_id = request.data.get("university_id")
        if not university_id:
            return Response({"error": "Missing university_id"}, status=400)
        
        university = get_object_or_404(University, pk=university_id)
        follow, created = UniversityFollow.objects.get_or_create(
            user=request.user, 
            university=university
        )
        
        message = "Followed" if created else "Already following"
        return Response({"message": f"{message} {university.name}"}, status=201)
    
    def delete(self, request):
        university_id = request.data.get("university_id")
        if not university_id:
            return Response({"error": "Missing university_id"}, status=400)
        
        deleted_count, _ = UniversityFollow.objects.filter(
            user=request.user, 
            university_id=university_id
        ).delete()
        
        message = "Unfollowed" if deleted_count > 0 else "Already not following"
        return Response({"message": message}, status=200)

class NotificationsListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        
        # Calculate offset
        offset = (page - 1) * page_size
        
        # Get notifications with related data
        notifications = (Notification.objects
                        .filter(user=request.user)
                        .select_related("post", "actor", "post__author", "post__university")
                        .prefetch_related("post__hashtags")
                        .order_by("-created_at")
                        [offset:offset + page_size])
        
        # Get unread count
        unread_count = Notification.objects.filter(
            user=request.user, 
            is_read=False
        ).count()
        
        # Serialize notifications
        items = []
        for notif in notifications:
            item = {
                "id": notif.id,
                "kind": notif.kind,
                "created_at": notif.created_at.isoformat(),
                "is_read": notif.is_read,
                "actor": None,
                "post": None,
            }
            
            # Add actor info if exists
            if notif.actor:
                item["actor"] = {
                    "id": notif.actor.id,
                    "email": notif.actor.email,
                    "handle": notif.actor.handle,

                }
            
            # Add post info if exists
            if notif.post:
                item["post"] = PostPreviewSerializer(
                    notif.post, 
                    context={"request": request}
                ).data
            
            items.append(item)
        
        # Check if there are more notifications
        total_count = Notification.objects.filter(user=request.user).count()
        has_more = offset + page_size < total_count
        
        return Response({
            "unread_count": unread_count,
            "items": items,
            "has_more": has_more,
            "page": page,
            "page_size": page_size,
            "total_count": total_count,
        }, status=200)

class NotificationsMarkReadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        ids = request.data.get("ids", [])
        if not isinstance(ids, list) or not ids:
            return Response({"error": "ids must be a non-empty list"}, status=400)
        
        updated_count = Notification.objects.filter(
            user=request.user, 
            id__in=ids
        ).update(is_read=True)
        
        return Response({
            "message": f"Marked {updated_count} notifications as read"
        }, status=200)

class NotificationsMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        updated_count = Notification.objects.filter(
            user=request.user, 
            is_read=False
        ).update(is_read=True)
        
        return Response({
            "message": f"Marked all {updated_count} notifications as read"
        }, status=200)

class FollowStatusView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Check if user is following users, hashtags, or universities"""
        data = request.data
        result = {}
        
        # Check user follows
        user_ids = data.get("user_ids", [])
        if user_ids:
            following = UserFollow.objects.filter(
                follower=request.user,
                followee_id__in=user_ids
            ).values_list('followee_id', flat=True)
            result["users"] = {str(uid): uid in following for uid in user_ids}
        
        # Check hashtag follows
        hashtag_names = data.get("hashtag_names", [])
        if hashtag_names:
            # Clean hashtag names
            clean_names = [(name or "").lstrip("#").strip().lower() for name in hashtag_names]
            following = HashtagFollow.objects.filter(
                user=request.user,
                hashtag__name__in=clean_names
            ).values_list('hashtag__name', flat=True)
            result["hashtags"] = {name: name.lower() in following for name in hashtag_names}
        
        # Check university follows
        university_ids = data.get("university_ids", [])
        if university_ids:
            following = UniversityFollow.objects.filter(
                user=request.user,
                university_id__in=university_ids
            ).values_list('university_id', flat=True)
            result["universities"] = {str(uid): uid in following for uid in university_ids}
        
        return Response(result, status=200)
    
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import PushToken

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_push_token(request):
    token = request.data.get('token')
    platform = request.data.get('platform', 'ios')
    
    if not token:
        return Response(
            {'error': 'Token is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create or update token
    push_token, created = PushToken.objects.get_or_create(
        user=request.user,
        token=token,
        defaults={'platform': platform, 'is_active': True}
    )
    
    if not created:
        push_token.is_active = True
        push_token.platform = platform
        push_token.save()
    
    return Response({
        'message': 'Token registered successfully',
        'created': created
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unregister_push_token(request):
    token = request.data.get('token')
    
    if not token:
        return Response(
            {'error': 'Token is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        push_token = PushToken.objects.get(user=request.user, token=token)
        push_token.is_active = False
        push_token.save()
        
        return Response({'message': 'Token unregistered successfully'})
    except PushToken.DoesNotExist:
        return Response(
            {'error': 'Token not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )