from django.db import models

# Create your models here.
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from users.models import University  # FIXED: Import from users

class Ad(models.Model):
    AD_TYPE_CHOICES = [
        ('in_feed', 'In-Feed'),
        ('banner', 'Banner'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('active', 'Active'),
        ('expired', 'Expired'),
    ]
    
    MEDIA_TYPE_CHOICES = [
        ('image', 'Image'),
        ('video', 'Video'),
    ]
    
    # Basic Info
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ads')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Media
    media = models.FileField(upload_to='ads/media/%Y/%m/%d/')
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES)
    
    # Ad Configuration
    ad_type = models.CharField(max_length=10, choices=AD_TYPE_CHOICES)
    cta_url = models.URLField(blank=True, null=True, help_text="Call-to-action URL")
    
    # Targeting
    target_universities = models.ManyToManyField(University, related_name='targeted_ads')  # Now correct
    target_all_universities = models.BooleanField(default=False)

    # Duration & Pricing
    duration_days = models.IntegerField()
    total_cost = models.DecimalField(max_digits=10, decimal_places=2)
    target_user_count = models.IntegerField(help_text="Number of users this ad can reach")
    
    # Status & Dates
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(blank=True, null=True)
    
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'ad_type']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.get_ad_type_display()} ({self.status})"
    
    def activate(self):
        """Activate the ad after approval"""
        self.status = 'active'
        self.start_date = timezone.now()
        self.end_date = self.start_date + timedelta(days=self.duration_days)
        self.save()
    
    def is_active(self):
        """Check if ad is currently active"""
        if self.status != 'active':
            return False
        now = timezone.now()
        return self.start_date <= now <= self.end_date
    
    def check_expiry(self):
        """Check and update if ad has expired"""
        if self.status == 'active' and self.end_date and timezone.now() > self.end_date:
            self.status = 'expired'
            self.save()
            return True
        return False
    
    @property
    def total_impressions(self):
        return self.impressions.count()
    
    @property
    def total_clicks(self):
        return self.clicks.count()
    
    @property
    def ctr(self):
        """Click-through rate"""
        if self.total_impressions == 0:
            return 0
        return (self.total_clicks / self.total_impressions) * 100


class AdImpression(models.Model):
    ad = models.ForeignKey(Ad, on_delete=models.CASCADE, related_name='impressions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ad_impressions')
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Prevent duplicate impressions from same user on same day
        constraints = [
            models.UniqueConstraint(
                fields=['ad', 'user', 'timestamp__date'],
                name='unique_daily_impression'
            )
        ]
        indexes = [
            models.Index(fields=['ad', 'timestamp']),
        ]
    
    def __str__(self):
        return f"Impression: {self.ad.title} by {self.user.username}"


class AdClick(models.Model):
    ad = models.ForeignKey(Ad, on_delete=models.CASCADE, related_name='clicks')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ad_clicks')
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['ad', 'timestamp']),
        ]
    
    def __str__(self):
        return f"Click: {self.ad.title} by {self.user.username}"