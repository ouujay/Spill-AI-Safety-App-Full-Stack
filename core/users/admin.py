from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
import base64

from .models import (
    User, SelfieVerification,
    Country, City, University, UniversityFollow
)

# --- Custom User Admin ---
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('email', 'handle', 'handle_locked', 'university', 'is_staff', 'selfie_verified')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'selfie_verified', 'handle_locked')
    search_fields = ('email', 'handle')
    ordering = ('email',)
    
    # Fields for existing users
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('age', 'date_of_birth', 'university', 'handle', 'handle_locked')}),
        ('Verification', {'fields': ('selfie_verified',)}),
        ('Permissions', {'fields': ('is_staff', 'is_active', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    # Fields for creating new users (this was missing!)
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'university', 'date_of_birth', 'is_staff', 'is_active'),
        }),
    )
    
    # Remove username-related fields since we use email
    username_field = 'email'
    readonly_fields = ['date_joined', 'last_login']


admin.site.register(User, CustomUserAdmin)

# --- Selfie Verification Admin with image preview ---
@admin.register(SelfieVerification)
class SelfieVerificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'verified', 'confidence', 'retry_count', 'appeal_requested', 'verified_at', 'selfie_image']
    list_filter = ['verified', 'appeal_requested']
    search_fields = ['user__email']
    readonly_fields = ['selfie_image', 'raw_image_bytes', 'confidence', 'retry_count', 'appeal_requested', 'verified_at']
    actions = ['approve_verify', 'reset_attempts']

    def selfie_image(self, obj):
        if obj.raw_image_bytes:
            img_b64 = base64.b64encode(obj.raw_image_bytes).decode('utf-8')
            return format_html(
                '<img src="data:image/jpeg;base64,{}" style="width:128px; height:128px; object-fit:cover; border-radius:8px;" />',
                img_b64
            )
        return "No image"
    selfie_image.short_description = "Selfie"

    def approve_verify(self, request, queryset):
        """Approve appeal: mark verified, clear appeal, set user flag."""
        updated = 0
        for obj in queryset.select_related('user'):
            obj.verified = True
            obj.appeal_requested = False
            obj.save(update_fields=['verified', 'appeal_requested'])
            if not obj.user.selfie_verified:
                obj.user.selfie_verified = True
                obj.user.save(update_fields=['selfie_verified'])
            updated += 1
        self.message_user(request, f"Approved and verified {updated} record(s).")
    approve_verify.short_description = "Approve & verify (set user.selfie_verified = True)"

    def reset_attempts(self, request, queryset):
        """Reset attempts to allow retry; clears appeal and verification flags."""
        updated = 0
        for obj in queryset.select_related('user'):
            obj.retry_count = 0
            obj.verified = False
            obj.appeal_requested = False
            obj.save(update_fields=['retry_count', 'verified', 'appeal_requested'])
            if obj.user.selfie_verified:
                obj.user.selfie_verified = False
                obj.user.save(update_fields=['selfie_verified'])
            updated += 1
        self.message_user(request, f"Reset attempts on {updated} record(s).")
    reset_attempts.short_description = "Reset attempts & clear appeal (set user.selfie_verified = False)"

# --- Country Admin ---
@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)

# --- City Admin ---
@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'country')
    search_fields = ('name',)
    list_filter = ('country',)

# --- University Admin ---
@admin.register(University)
class UniversityAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'city')
    search_fields = ('name',)
    list_filter = ('city',)

# --- University Follow Admin ---
@admin.register(UniversityFollow)
class UniversityFollowAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'university', 'created_at')
    search_fields = ('user__email', 'university__name')
    list_filter = ('university',)
    raw_id_fields = ('user', 'university')