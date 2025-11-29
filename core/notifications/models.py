# notifications/models.py
from django.conf import settings
from django.db import models
from posts.models import Post, Hashtag
from users.models import University

class HashtagFollow(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    hashtag = models.ForeignKey(Hashtag, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'hashtag')
        db_table = 'notifications_hashtagfollow'
    
    def __str__(self):
        return f"{self.user.email} follows #{self.hashtag.name}"

class UserFollow(models.Model):
    follower = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='following')
    followee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('follower', 'followee')
        db_table = 'notifications_userfollow'
    
    def __str__(self):
        return f"{self.follower.email} follows {self.followee.email}"

class Notification(models.Model):
    # Notification types
    NEW_POST_USER = "new_post_user"
    NEW_POST_HASHTAG = "new_post_hashtag"
    NEW_POST_UNI = "new_post_uni"
    COMMENT_ON_MY_POST = "comment_on_my_post"
    LIKE_ON_MY_POST = "like_on_my_post"
    FLAG_VOTE_ON_MY_POST = "flag_vote_on_my_post"  # NEW: For flag post votes

    KIND_CHOICES = [
        (NEW_POST_USER, "New post by followed user"),
        (NEW_POST_HASHTAG, "New post under followed hashtag"),
        (NEW_POST_UNI, "New post under followed university"),
        (COMMENT_ON_MY_POST, "Comment on my post"),
        (LIKE_ON_MY_POST, "Like on my post"),
        (FLAG_VOTE_ON_MY_POST, "Vote on my flag post"),  # NEW
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="notifications"
    )
    kind = models.CharField(max_length=32, choices=KIND_CHOICES)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, null=True, blank=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name="notif_actions"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'notifications_notification'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Notification for {self.user.email}: {self.kind}"
    

from django.db import models
from django.conf import settings

class PushToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True)
    platform = models.CharField(max_length=10, choices=[('ios', 'iOS'), ('android', 'Android')])
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'token']

class NotificationLog(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('delivered', 'Delivered'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    body = models.TextField()
    data = models.JSONField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    expo_ticket_id = models.CharField(max_length=255, blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(blank=True, null=True)