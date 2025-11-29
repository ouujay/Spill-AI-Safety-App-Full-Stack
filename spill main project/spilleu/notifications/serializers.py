# notifications/serializers.py - FIXED VERSION with correct User fields
from rest_framework import serializers
from .models import Notification, PushToken, NotificationLog
from posts.models import Post
from django.contrib.auth import get_user_model

User = get_user_model()


class UserMinimalSerializer(serializers.ModelSerializer):
    """
    FIXED: Use actual User model fields (handle, age) not non-existent first_name
    """
    
    class Meta:
        model = User
        fields = ['id', 'handle', 'age']  # FIXED: Removed first_name (doesn't exist)
    
    def to_representation(self, instance):
        """Custom representation with fallbacks"""
        data = super().to_representation(instance)
        
        # If handle doesn't exist, create anonymous identifier
        if not data.get('handle'):
            data['handle'] = f"user{instance.id}"
        
        return data


class PostMinimalSerializer(serializers.ModelSerializer):
    """Minimal post info for notifications"""
    author = UserMinimalSerializer(read_only=True)
    university_name = serializers.CharField(source='university.name', read_only=True)
    hashtag_names = serializers.SerializerMethodField()
    
    # Add the missing fields as SerializerMethodFields since they don't exist on the model
    likes = serializers.SerializerMethodField()
    red_votes = serializers.SerializerMethodField()
    green_votes = serializers.SerializerMethodField()
    replies_count = serializers.SerializerMethodField()
    
    # Post's first_name and person_age (these DO exist on Post model)
    first_name = serializers.CharField(read_only=True)
    person_age = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Post
        fields = [
            'id', 'content', 'flag', 'created_at', 'author', 
            'university_name', 'hashtag_names', 'likes', 
            'red_votes', 'green_votes', 'replies_count',
            'first_name', 'person_age', 'image_url'  # These exist on Post
        ]
    
    def get_hashtag_names(self, obj):
        return [hashtag.name for hashtag in obj.hashtags.all()]
    
    def get_likes(self, obj):
        """Get likes for tea posts (no flag)"""
        if obj.flag is None:  # Tea posts
            return obj.reactions.filter(reaction='up').count()
        return 0
    
    def get_red_votes(self, obj):
        """Get red votes for flagged posts"""
        if obj.flag in ['red', 'green']:  # Flagged posts
            return obj.flag_votes.filter(vote='red').count()
        return 0
    
    def get_green_votes(self, obj):
        """Get green votes for flagged posts"""
        if obj.flag in ['red', 'green']:  # Flagged posts
            return obj.flag_votes.filter(vote='green').count()
        return 0
    
    def get_replies_count(self, obj):
        """Get count of replies to this post"""
        return obj.replies.count()


class NotificationSerializer(serializers.ModelSerializer):
    """
    FIXED: Now uses correct fields from User model
    """
    actor = UserMinimalSerializer(read_only=True)
    post = PostMinimalSerializer(read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'kind', 'actor', 'post', 'created_at', 'is_read'
        ]


class PushTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushToken
        fields = ['id', 'token', 'platform', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class NotificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationLog
        fields = [
            'id', 'title', 'body', 'status', 'expo_ticket_id', 
            'error_message', 'created_at', 'sent_at'
        ]
        read_only_fields = ['id', 'created_at', 'sent_at']


class PostMinimalSerializer(serializers.ModelSerializer):
    """Minimal post info for notifications"""
    author = UserMinimalSerializer(read_only=True)
    university_name = serializers.CharField(source='university.name', read_only=True)
    hashtag_names = serializers.SerializerMethodField()
    
    # Add the missing fields as SerializerMethodFields since they don't exist on the model
    likes = serializers.SerializerMethodField()
    red_votes = serializers.SerializerMethodField()
    green_votes = serializers.SerializerMethodField()
    replies_count = serializers.SerializerMethodField()
    
    # ADDED: Include post's first_name and person_age for fallback
    first_name = serializers.CharField(read_only=True)
    person_age = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Post
        fields = [
            'id', 'content', 'flag', 'created_at', 'author', 
            'university_name', 'hashtag_names', 'likes', 
            'red_votes', 'green_votes', 'replies_count',
            'first_name', 'person_age', 'image_url'  # ADDED: needed fields
        ]
    
    def get_hashtag_names(self, obj):
        return [hashtag.name for hashtag in obj.hashtags.all()]
    
    def get_likes(self, obj):
        """Get likes for tea posts (no flag)"""
        if obj.flag is None:  # Tea posts
            return obj.reactions.filter(reaction='up').count()
        return 0
    
    def get_red_votes(self, obj):
        """Get red votes for flagged posts"""
        if obj.flag in ['red', 'green']:  # Flagged posts
            return obj.flag_votes.filter(vote='red').count()
        return 0
    
    def get_green_votes(self, obj):
        """Get green votes for flagged posts"""
        if obj.flag in ['red', 'green']:  # Flagged posts
            return obj.flag_votes.filter(vote='green').count()
        return 0
    
    def get_replies_count(self, obj):
        """Get count of replies to this post"""
        return obj.replies.count()


class NotificationSerializer(serializers.ModelSerializer):
    """
    FIXED: Now includes all needed fields for consistent user display
    """
    actor = UserMinimalSerializer(read_only=True)
    post = PostMinimalSerializer(read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'kind', 'actor', 'post', 'created_at', 'is_read'
        ]


class PushTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushToken
        fields = ['id', 'token', 'platform', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class NotificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationLog
        fields = [
            'id', 'title', 'body', 'status', 'expo_ticket_id', 
            'error_message', 'created_at', 'sent_at'
        ]
        read_only_fields = ['id', 'created_at', 'sent_at']