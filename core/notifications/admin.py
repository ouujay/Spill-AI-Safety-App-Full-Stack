# notifications/admin.py

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import Count, Q
from django.urls import reverse
from django.utils.safestring import mark_safe
from datetime import timedelta

from .models import (
    Notification, PushToken, NotificationLog,
    HashtagFollow, UserFollow
)

# ============== ACTIONS ==============

@admin.action(description="Mark selected notifications as read")
def mark_as_read(modeladmin, request, queryset):
    updated = queryset.update(is_read=True)
    modeladmin.message_user(request, f"{updated} notifications marked as read.")

@admin.action(description="Mark selected notifications as unread")
def mark_as_unread(modeladmin, request, queryset):
    updated = queryset.update(is_read=False)
    modeladmin.message_user(request, f"{updated} notifications marked as unread.")

@admin.action(description="Delete old notifications (>30 days)")
def delete_old_notifications(modeladmin, request, queryset):
    cutoff = timezone.now() - timedelta(days=30)
    deleted_count = queryset.filter(created_at__lt=cutoff).count()
    queryset.filter(created_at__lt=cutoff).delete()
    modeladmin.message_user(request, f"{deleted_count} old notifications deleted.")

@admin.action(description="Test push notification (mock)")
def test_push_notification(modeladmin, request, queryset):
    # Mock test since you'd need your actual push service
    success_count = queryset.filter(is_active=True).count()
    modeladmin.message_user(request, f"Would send test notifications to {success_count} active tokens.")

# ============== ADMIN CLASSES ==============

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'user_link', 'kind', 'actor_link', 'post_link', 
        'is_read', 'created_at'
    )
    list_filter = ('kind', 'is_read', 'created_at')
    search_fields = ('user__email', 'user__handle', 'actor__email', 'actor__handle')
    readonly_fields = ('id', 'created_at')
    raw_id_fields = ('user', 'actor', 'post')
    date_hierarchy = 'created_at'
    actions = [mark_as_read, mark_as_unread, delete_old_notifications]
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'kind', 'actor', 'post')
        }),
        ('Status', {
            'fields': ('is_read',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.email or obj.user.handle)
        return '-'
    user_link.short_description = 'User'
    user_link.admin_order_field = 'user__email'
    
    def actor_link(self, obj):
        if obj.actor:
            url = reverse('admin:users_user_change', args=[obj.actor.pk])
            return format_html('<a href="{}">{}</a>', url, obj.actor.email or obj.actor.handle)
        return '-'
    actor_link.short_description = 'Actor'
    actor_link.admin_order_field = 'actor__email'
    
    def post_link(self, obj):
        if obj.post:
            url = reverse('admin:posts_post_change', args=[obj.post.pk])
            return format_html('<a href="{}">Post #{}</a>', url, obj.post.pk)
        return '-'
    post_link.short_description = 'Post'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'actor', 'post')


@admin.register(PushToken)
class PushTokenAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'user_link', 'platform', 'is_active', 
        'created_at', 'updated_at', 'token_preview'
    )
    list_filter = ('platform', 'is_active', 'created_at', 'updated_at')
    search_fields = ('user__email', 'user__handle', 'token')
    readonly_fields = ('id', 'created_at', 'updated_at', 'token_preview')
    raw_id_fields = ('user',)
    date_hierarchy = 'created_at'
    actions = [test_push_notification]
    
    fieldsets = (
        ('Token Info', {
            'fields': ('user', 'token', 'token_preview', 'platform')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.email or obj.user.handle)
        return '-'
    user_link.short_description = 'User'
    user_link.admin_order_field = 'user__email'
    
    def token_preview(self, obj):
        if obj.token:
            return f"{obj.token[:20]}...{obj.token[-10:]}"
        return '-'
    token_preview.short_description = 'Token Preview'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'user_link', 'title', 'status', 
        'created_at', 'sent_at', 'expo_ticket_id'
    )
    list_filter = ('status', 'created_at', 'sent_at')
    search_fields = ('title', 'body', 'user__email', 'user__handle', 'expo_ticket_id')
    readonly_fields = ('id', 'created_at', 'sent_at', 'data_display')
    raw_id_fields = ('user',)
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Message Info', {
            'fields': ('user', 'title', 'body', 'status')
        }),
        ('Push Details', {
            'fields': ('expo_ticket_id', 'error_message')
        }),
        ('Data', {
            'fields': ('data_display',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'sent_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.email or obj.user.handle)
        return '-'
    user_link.short_description = 'User'
    user_link.admin_order_field = 'user__email'
    
    def data_display(self, obj):
        if obj.data:
            return format_html('<pre>{}</pre>', str(obj.data))
        return '-'
    data_display.short_description = 'Additional Data'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(HashtagFollow)
class HashtagFollowAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_link', 'hashtag_link', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__email', 'user__handle', 'hashtag__name')
    raw_id_fields = ('user', 'hashtag')
    date_hierarchy = 'created_at'
    
    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.email or obj.user.handle)
        return '-'
    user_link.short_description = 'User'
    user_link.admin_order_field = 'user__email'
    
    def hashtag_link(self, obj):
        if obj.hashtag:
            return format_html('<span>#{}</span>', obj.hashtag.name)
        return '-'
    hashtag_link.short_description = 'Hashtag'
    hashtag_link.admin_order_field = 'hashtag__name'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'hashtag')


@admin.register(UserFollow)
class UserFollowAdmin(admin.ModelAdmin):
    list_display = ('id', 'follower_link', 'followee_link', 'created_at')
    list_filter = ('created_at',)
    search_fields = (
        'follower__email', 'follower__handle', 
        'followee__email', 'followee__handle'
    )
    raw_id_fields = ('follower', 'followee')
    date_hierarchy = 'created_at'
    
    def follower_link(self, obj):
        if obj.follower:
            url = reverse('admin:users_user_change', args=[obj.follower.pk])
            return format_html('<a href="{}">{}</a>', url, obj.follower.email or obj.follower.handle)
        return '-'
    follower_link.short_description = 'Follower'
    follower_link.admin_order_field = 'follower__email'
    
    def followee_link(self, obj):
        if obj.followee:
            url = reverse('admin:users_user_change', args=[obj.followee.pk])
            return format_html('<a href="{}">{}</a>', url, obj.followee.email or obj.followee.handle)
        return '-'
    followee_link.short_description = 'Following'
    followee_link.admin_order_field = 'followee__email'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('follower', 'followee')


# ============== ADMIN SITE CUSTOMIZATION ==============

# Custom admin site title and header
admin.site.site_header = 'Notifications Administration'
admin.site.site_title = 'Notifications Admin'
admin.site.index_title = 'Manage Notifications & Follows'