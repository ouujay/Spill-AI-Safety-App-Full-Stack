from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Ad, AdImpression, AdClick

@admin.register(Ad)
class AdAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'ad_type', 'status', 'total_cost', 'start_date', 'end_date']
    list_filter = ['status', 'ad_type', 'created_at']
    search_fields = ['title', 'user__username']
    readonly_fields = ['created_at', 'updated_at', 'total_impressions', 'total_clicks', 'ctr']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'title', 'description', 'media', 'media_type')
        }),
        ('Ad Configuration', {
            'fields': ('ad_type', 'cta_url', 'target_all_universities', 'target_universities')
        }),
        ('Pricing & Duration', {
            'fields': ('duration_days', 'total_cost', 'target_user_count')
        }),
        ('Status & Dates', {
            'fields': ('status', 'rejection_reason', 'start_date', 'end_date')
        }),
        ('Analytics', {
            'fields': ('total_impressions', 'total_clicks', 'ctr')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )

@admin.register(AdImpression)
class AdImpressionAdmin(admin.ModelAdmin):
    list_display = ['ad', 'user', 'timestamp']
    list_filter = ['timestamp']
    search_fields = ['ad__title', 'user__username']

@admin.register(AdClick)
class AdClickAdmin(admin.ModelAdmin):
    list_display = ['ad', 'user', 'timestamp']
    list_filter = ['timestamp']
    search_fields = ['ad__title', 'user__username']