# posts/serializers.py

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from users.models import University
from .models import (
    Post, PostFlagVote, ReportedPost, SavedPost, VoteReaction,
    Hashtag, SeenPost, SeenReply
)

User = get_user_model()


# ---------- Helpers ----------

def normalize_tag(t: str) -> str:
    t = (t or "").strip().lower()
    if t.startswith("#"):
        t = t[1:]
    return "".join(ch for ch in t if ch.isalnum() or ch == "_")[:50]


def extract_hashtags_from_text(text: str):
    if not text:
        return []
    tags = []
    word = ""
    in_tag = False
    for ch in text:
        if ch == "#":
            if in_tag and word:
                tags.append(word)
            in_tag = True
            word = ""
        elif in_tag and (ch.isalnum() or ch == "_"):
            word += ch
        else:
            if in_tag and word:
                tags.append(word)
            in_tag = False
            word = ""
    if in_tag and word:
        tags.append(word)
    norm = [normalize_tag(t) for t in tags if normalize_tag(t)]
    return list(dict.fromkeys(norm))


def resolve_image_url(file_field) -> str | None:
    if not file_field:
        return None
    s = str(file_field or "").strip()
    if not s:
        return None
    if s.startswith("http://") or s.startswith("https://"):
        return s
    try:
        return file_field.url
    except Exception:
        return None


# ---------- User & University ----------

class UserSerializer(serializers.ModelSerializer):
    university = serializers.StringRelatedField()
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'university']

    def get_name(self, obj):
        dob = getattr(obj, 'date_of_birth', None) or getattr(obj, 'dob', None)
        if not dob:
            return getattr(obj, "email", "f").split('@')[0]

        today = timezone.now().date()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        age = max(age, 0)

        g = (getattr(obj, "gender", None) or "").strip().lower()
        if g in ("m", "male", "man"):
            prefix = "m"
        else:
            prefix = "f"

        return f"{prefix}{age}"


class UniversityPreviewSerializer(serializers.ModelSerializer):
    city = serializers.StringRelatedField()
    country = serializers.SerializerMethodField()

    class Meta:
        model = University
        fields = ['id', 'name', 'city', 'country']

    def get_country(self, obj):
        return str(obj.city.country) if getattr(obj, "city", None) and getattr(obj.city, "country", None) else None


# ---------- Reactions ----------

class VoteReactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoteReaction
        fields = ['id', 'reaction']

    def validate(self, data):
        reaction = data.get("reaction")
        if reaction != "up":
            raise serializers.ValidationError("Only 'up' (like) is allowed.")
        return data


class PostFlagVoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostFlagVote
        fields = ['id', 'vote']

    def validate(self, data):
        vote = data.get("vote")
        if vote not in ("red", "green"):
            raise serializers.ValidationError("Vote must be 'red' or 'green'.")
        return data


# ---------- Saved & Reported ----------

class SavedPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedPost
        fields = ['id', 'user', 'post', 'saved_at']
        read_only_fields = ['user', 'saved_at']


class ReportedPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportedPost
        fields = ['id', 'user', 'post', 'reason', 'comment', 'reported_at']
        read_only_fields = ['user', 'reported_at']


# ---------- Post Serializers ----------

class PostPreviewSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    university = serializers.StringRelatedField()
    flag = serializers.CharField(required=False, allow_null=True)
    image = serializers.SerializerMethodField()
    image_url = serializers.URLField(read_only=True)  # ADD THIS LINE

    # Interaction mode determines what voting options to show
    interaction_mode = serializers.SerializerMethodField()
    
    # Different counts based on post type
    likes = serializers.SerializerMethodField()  # For Tea posts only
    red_votes = serializers.SerializerMethodField()  # For flagged posts only
    green_votes = serializers.SerializerMethodField()  # For flagged posts only
    
    views = serializers.SerializerMethodField()
    hashtags = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()
    user_flag_vote = serializers.SerializerMethodField()
    saved = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id", "first_name", "person_age", "content", "flag", "university", "created_at", "author",
            "image", "interaction_mode", "likes", "red_votes", "green_votes", "views", "hashtags", 
            "user_reaction", "user_flag_vote", "saved","image_url",
        ]

    def get_image(self, obj):
        return resolve_image_url(getattr(obj, "image", None))

    def get_interaction_mode(self, obj):
        """Returns 'flag_vote' for red/green posts, 'like_only' for tea posts"""
        return "flag_vote" if obj.flag in ("red", "green") else "like_only"

    def get_likes(self, obj):
        """Only show likes for Tea posts (no flag)"""
        if obj.flag in ("red", "green"):
            return 0
        return getattr(obj, "upvotes", None) or obj.reactions.filter(reaction="up").count()

    def get_red_votes(self, obj):
        """Only show red votes for flagged posts"""
        if obj.flag not in ("red", "green"):
            return 0
        return getattr(obj, "red_votes", None) or obj.flag_votes.filter(vote="red").count()

    def get_green_votes(self, obj):
        """Only show green votes for flagged posts"""
        if obj.flag not in ("red", "green"):
            return 0
        return getattr(obj, "green_votes", None) or obj.flag_votes.filter(vote="green").count()

    def get_views(self, obj):
        return getattr(obj, "views", None) or SeenPost.objects.filter(post=obj).count()

    def get_hashtags(self, obj):
        return [f"#{t.name}" for t in obj.hashtags.all()]

    def get_user_reaction(self, obj):
        """For Tea posts - show if user liked it"""
        request = self.context.get('request')
        if request and request.user.is_authenticated and obj.flag not in ("red", "green"):
            reaction = VoteReaction.objects.filter(user=request.user, post=obj).first()
            return reaction.reaction if reaction else None
        return None

    def get_user_flag_vote(self, obj):
        """For flagged posts - show if user voted red/green"""
        request = self.context.get('request')
        if request and request.user.is_authenticated and obj.flag in ("red", "green"):
            vote = PostFlagVote.objects.filter(user=request.user, post=obj).first()
            return vote.vote if vote else None
        return None

    def get_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return SavedPost.objects.filter(user=request.user, post=obj).exists()
        return False


class ReplySerializer(serializers.ModelSerializer):
    """Replies/comments can only be liked, never flag-voted"""
    author = UserSerializer(read_only=True)
    university = serializers.StringRelatedField()
    
    image = serializers.SerializerMethodField()
    likes = serializers.SerializerMethodField()  # Always likes for replies
    views = serializers.SerializerMethodField()
    hashtags = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()
    replies_count = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id", "content", "image", "created_at", "author", "university", "parent", "thread",
            "likes", "views", "hashtags", "user_reaction", "replies_count",
        ]

    def get_image(self, obj):
        # Try image_url first (Cloudinary), then fall back to image field
        if obj.image_url:
            return obj.image_url
        return resolve_image_url(getattr(obj, "image", None))

    def get_likes(self, obj):
        annotated = getattr(obj, "upvotes", None)
        if annotated is not None:
            return int(annotated)
        return obj.reactions.filter(reaction="up").count()

    def get_views(self, obj):
        annotated = getattr(obj, "views", None)
        if annotated is not None:
            return int(annotated)
        return SeenReply.objects.filter(reply=obj).count()

    def get_hashtags(self, obj):
        return [f"#{t.name}" for t in obj.hashtags.all()]

    def get_user_reaction(self, obj):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            reaction = VoteReaction.objects.filter(user=request.user, post=obj).first()
            return reaction.reaction if reaction else None
        return None

    def get_replies_count(self, obj):
        annotated = getattr(obj, "child_count", None)
        if annotated is not None:
            try:
                return int(annotated)
            except (TypeError, ValueError):
                pass
        return obj.replies.count()


class PostSerializer(PostPreviewSerializer):
    """Extended post serializer with additional fields"""
    replies_count = serializers.SerializerMethodField()
    vote_score = serializers.SerializerMethodField()
    is_seen = serializers.SerializerMethodField()

    class Meta(PostPreviewSerializer.Meta):
        fields = PostPreviewSerializer.Meta.fields + ['replies_count', 'vote_score', 'is_seen']

    def get_replies_count(self, obj):
        return getattr(obj, "comment_count", None) or obj.replies.count()

    def get_vote_score(self, obj):
        """Different scoring for different post types"""
        if obj.flag in ("red", "green"):
            return self.get_green_votes(obj) - self.get_red_votes(obj)
        return self.get_likes(obj)

    def get_is_seen(self, obj):
        return bool(getattr(obj, '_is_seen', False))


class PostDetailSerializer(PostSerializer):
    parent = ReplySerializer(read_only=True)
    thread = ReplySerializer(read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta(PostSerializer.Meta):
        fields = PostSerializer.Meta.fields + ['parent', 'thread', 'replies']

    def get_replies(self, obj):
        replies = obj.replies.all().order_by('created_at')[:10]
        return ReplySerializer(replies, many=True, context=self.context).data


# ---------- P# serializers.py - Updated PostCreateSerializer with flexible content validation
# Updated PostCreateSerializer in serializers.py

class PostCreateSerializer(serializers.ModelSerializer):
    # Required person identification
    first_name = serializers.CharField(max_length=30, required=True)
    person_age = serializers.IntegerField(required=False, min_value=16, max_value=60, allow_null=True)
    
    # University selection - user can choose which university this post belongs to
    university = serializers.PrimaryKeyRelatedField(
        queryset=University.objects.all(),
        required=False,  # If not provided, will use author's university as fallback
        allow_null=True
    )
    
    # Optional hashtags
    hashtags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True
    )
    
    # Asset from Cloudinary (optional) - this will be converted to image_url
    asset = serializers.DictField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = Post
        fields = [
            'first_name', 'person_age', 'flag', 'content', 'image', 'image_url',
            'university', 'parent', 'thread', 'hashtags', 'asset'
        ]

    def validate(self, data):
        content = (data.get('content') or "").strip()
        asset = data.get('asset')
        image = data.get('image')
        image_url = data.get('image_url')
        parent = data.get('parent')  # Check if this is a reply/comment
        
        # For replies/comments, only require non-empty content
        if parent:
            if not content:
                raise serializers.ValidationError("Comment content cannot be empty.")
            # No minimum length for comments - any non-empty content is valid
            return data
        
        # For main posts, require either substantial content OR media
        if not content and not asset and not image and not image_url:
            raise serializers.ValidationError("Post must have either text content or an image.")
        
        # For main posts with only text, require minimum 20 characters
        if content and not asset and not image and not image_url and len(content) < 20:
            raise serializers.ValidationError("Post description must be at least 20 characters.")
            
        return data

    def create(self, validated_data):
        # Extract asset data and convert to image_url
        asset = validated_data.pop('asset', None)
        if asset and asset.get('secure_url'):
            validated_data['image_url'] = asset['secure_url']
        
        # Handle university selection
        university = validated_data.get('university')
        if not university:
            # Fallback to author's university if no university specified
            author = validated_data.get('author') or self.context['request'].user
            if author and author.university:
                validated_data['university'] = author.university
            else:
                raise serializers.ValidationError("University is required for this post.")
        
        # Handle hashtags
        hashtags_data = validated_data.pop('hashtags', [])
        
        # Extract hashtags from content
        content_hashtags = extract_hashtags_from_text(validated_data.get('content', ''))
        all_hashtags = list(set(hashtags_data + content_hashtags))
        
        # Create the post
        post = super().create(validated_data)
        
        # Add hashtags
        if all_hashtags:
            hashtag_objects = []
            for tag_name in all_hashtags:
                normalized = normalize_tag(tag_name)
                if normalized:
                    hashtag, created = Hashtag.objects.get_or_create(name=normalized)
                    hashtag_objects.append(hashtag)
            post.hashtags.set(hashtag_objects)
        
        return post
    # ---------- Hashtag Serializer ----------

class HashtagSerializer(serializers.ModelSerializer):
    posts_count = serializers.SerializerMethodField()

    class Meta:
        model = Hashtag
        fields = ['id', 'name', 'posts_count']

    def get_posts_count(self, obj):
        return obj.posts.count()
    



# Add this to posts/serializers.py

class ReplyCreateSerializer(serializers.ModelSerializer):
    """Dedicated serializer for creating replies/comments"""
    content = serializers.CharField(allow_blank=False, max_length=4000)

    class Meta:
        model = Post
        fields = ['content', 'image', 'hashtags']

    def validate(self, data):
        content = (data.get('content') or '').strip()
        if not content:
            raise serializers.ValidationError("Reply content cannot be empty.")
        return data