# posts/models.py

from django.conf import settings
from django.db import models
from django.utils import timezone

from users.models import University

User = settings.AUTH_USER_MODEL


# ---------- Hashtags ----------

class Hashtag(models.Model):
    name = models.CharField(max_length=50, unique=True, db_index=True)

    def __str__(self):
        return f"#{self.name}"


# ---------- Posts / Threads ----------

class Post(models.Model):
    FLAG_CHOICES = (
        ("red", "Red Flag"),
        ("green", "Green Flag"),
    )

    # --- Moderation ---
    MOD_OK   = "ok"
    MOD_SOFT = "soft"
    MOD_ESC  = "esc"
    MODERATION_CHOICES = [
        (MOD_OK, "OK"),
        (MOD_SOFT, "Soft Suppressed"),
        (MOD_ESC, "Escalated"),
    ]

    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    
    # Flag is optional — can be "red", "green", or null (Tea posts)
    flag = models.CharField(max_length=10, choices=FLAG_CHOICES, null=True, blank=True)
    
    # NEW: Person identification fields for flagged posts
    first_name = models.CharField(max_length=30, db_index=True)
    person_age = models.PositiveSmallIntegerField(null=True, blank=True, db_index=True)

    content = models.TextField()

    # Threading
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    thread = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='thread_posts')

    # Repost
    reposted_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='reposts')

    # Context
    university = models.ForeignKey(University, on_delete=models.CASCADE, related_name='posts')
    hashtags = models.ManyToManyField(Hashtag, blank=True, related_name='posts')

    # Media / timestamps
    image = models.ImageField(upload_to='post_images/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    image_url = models.URLField(blank=True, null=True)

    # DENORMALIZED COUNTER FIELDS
    replies_count = models.PositiveIntegerField(default=0, db_index=True)
    like_count = models.PositiveIntegerField(default=0, db_index=True)

    moderation_status = models.CharField(
        max_length=4, choices=MODERATION_CHOICES, default=MOD_OK, db_index=True
    )
    moderation_until = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['created_at']),
            models.Index(fields=['university', 'created_at']),
            models.Index(fields=['first_name']),  # NEW
            models.Index(fields=['person_age']),  # NEW
        ]

    @property
    def is_actively_suppressed(self):
        if self.moderation_status == self.MOD_OK:
            return False
        if self.moderation_until is None:
            return True
        return self.moderation_until > timezone.now()

    def save(self, *args, **kwargs):
        if self.parent and not self.thread:
            self.thread = self.parent.thread or self.parent
        super().save(*args, **kwargs)

    def __str__(self):
        kind = self.flag.upper() if self.flag else "TEA"
        return f"{self.author} - {kind} #{self.pk} - {self.first_name}"


# ---------- Reactions / Saves ----------

class VoteReaction(models.Model):
    # UPDATED: Only "up" (like) for Tea posts and comments
    REACTION_CHOICES = (
        ("up", "Like"),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='reactions')
    reaction = models.CharField(max_length=10, choices=REACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post')
        indexes = [
            models.Index(fields=['post']),
            models.Index(fields=['user', 'post']),
        ]

    def __str__(self):
        return f"{self.user} liked Post {self.post_id}"


# NEW: Flag voting system for Red/Green flagged posts
class PostFlagVote(models.Model):
    VOTE_CHOICES = (
        ("red", "Red Flag"),
        ("green", "Green Flag"),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='flag_votes')
    vote = models.CharField(max_length=6, choices=VOTE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post')
        indexes = [
            models.Index(fields=['post']),
            models.Index(fields=['user', 'post']),
        ]

    def __str__(self):
        return f"{self.user} voted {self.vote} on Post {self.post_id}"


class SavedPost(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_posts')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='saved_by')
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post')
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['post']),
        ]

    def __str__(self):
        return f"{self.user} saved Post {self.post_id}"


# ---------- Views / Impressions ----------

class SeenPost(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    seen_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post')
        indexes = [
            models.Index(fields=['post']),
            models.Index(fields=['user', 'post']),
        ]

    def __str__(self):
        return f"{self.user} saw Post {self.post_id}"


class SeenReply(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    reply = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='reply_views')
    seen_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'reply')
        indexes = [
            models.Index(fields=['reply']),
            models.Index(fields=['user', 'reply']),
        ]

    def __str__(self):
        return f"{self.user} saw Reply {self.reply_id}"


class PostViewDaily(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='view_days')
    day = models.DateField()
    unique_count = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('post', 'day')
        indexes = [
            models.Index(fields=['day']),
            models.Index(fields=['post', 'day']),
        ]

    def __str__(self):
        return f"Views {self.unique_count} for Post {self.post_id} on {self.day}"


class ReplyViewDaily(models.Model):
    reply = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='reply_view_days')
    day = models.DateField()
    unique_count = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('reply', 'day')
        indexes = [
            models.Index(fields=['day']),
            models.Index(fields=['reply', 'day']),
        ]

    def __str__(self):
        return f"Views {self.unique_count} for Reply {self.reply_id} on {self.day}"


# ---------- Reports ----------

class ReportedPost(models.Model):
    REASON_CHOICES = [
        ('spam', 'Spam or scam'),
        ('abuse', 'Harassment or hate'),
        ('false', 'False information'),
        ('other', 'Other'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='reports')
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    comment = models.TextField(blank=True)
    reported_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post')
        indexes = [
            models.Index(fields=['post']),
            models.Index(fields=['user']),
            models.Index(fields=['reason']),
        ]

    def __str__(self):
        return f"{self.user} reported Post {self.post_id} ({self.reason})"
    

    