from rest_framework import serializers
from .models import Ad, AdImpression, AdClick
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from users.models import University  # FIXED: Import from users, not core

User = get_user_model()

class AdCreateSerializer(serializers.ModelSerializer):
    target_universities = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Ad
        fields = [
            'title', 'description', 'media', 'media_type', 
            'ad_type', 'cta_url', 'target_universities', 
            'target_all_universities', 'duration_days'
        ]
    
    def validate_media(self, value):
        # Check file size (max 50MB)
        if value.size > 50 * 1024 * 1024:
            raise serializers.ValidationError("File size cannot exceed 50MB")
        return value
    
    def validate(self, data):
        # Ensure either target_all or specific universities
        if not data.get('target_all_universities') and not data.get('target_universities'):
            raise serializers.ValidationError(
                "Must target either all universities or specific universities"
            )
        
        # Video validation
        if data['media_type'] == 'video':
            # Add video duration check if needed
            pass
        
        return data
    
    def create(self, validated_data):
        target_universities = validated_data.pop('target_universities', [])
        user = self.context['request'].user
        
        # Calculate target user count
        if validated_data['target_all_universities']:
            target_user_count = User.objects.filter(
                university__isnull=False,
                is_active=True
            ).count()
        else:
            target_user_count = User.objects.filter(
                university_id__in=target_universities,
                is_active=True
            ).count()
        
        # Calculate price
        base_rate = 4  # ₦4 per user per day
        position_multiplier = 1.5 if validated_data['ad_type'] == 'banner' else 1.0
        total_cost = target_user_count * base_rate * validated_data['duration_days'] * position_multiplier
        
        # Create ad
        ad = Ad.objects.create(
            user=user,
            target_user_count=target_user_count,
            total_cost=total_cost,
            **validated_data
        )
        
        # Set target universities
        if not validated_data['target_all_universities']:
            ad.target_universities.set(target_universities)
        
        return ad


class AdDetailSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    target_universities = serializers.SerializerMethodField()
    total_impressions = serializers.IntegerField(read_only=True)
    total_clicks = serializers.IntegerField(read_only=True)
    ctr = serializers.FloatField(read_only=True)
    days_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = Ad
        fields = [
            'id', 'user', 'title', 'description', 'media', 'media_type',
            'ad_type', 'cta_url', 'target_universities', 'target_all_universities',
            'duration_days', 'total_cost', 'target_user_count', 'status',
            'rejection_reason', 'start_date', 'end_date', 'created_at',
            'total_impressions', 'total_clicks', 'ctr', 'days_remaining'
        ]
    
    def get_user(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'full_name': obj.user.get_full_name(),
        }
    
    def get_target_universities(self, obj):
        if obj.target_all_universities:
            return "All Universities"
        return [
            {'id': uni.id, 'name': uni.name} 
            for uni in obj.target_universities.all()
        ]
    
    def get_days_remaining(self, obj):
        if obj.status != 'active' or not obj.end_date:
            return None
        remaining = (obj.end_date - timezone.now()).days
        return max(0, remaining)


class AdListSerializer(serializers.ModelSerializer):
    total_impressions = serializers.IntegerField(read_only=True)
    total_clicks = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Ad
        fields = [
            'id', 'title', 'media', 'ad_type', 'status',
            'start_date', 'end_date', 'total_impressions', 'total_clicks'
        ]


class PriceCalculatorSerializer(serializers.Serializer):
    ad_type = serializers.ChoiceField(choices=['in_feed', 'banner'])
    duration_days = serializers.IntegerField(min_value=1, max_value=30)
    target_all_universities = serializers.BooleanField(default=False)
    target_universities = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    
    def validate(self, data):
        if not data.get('target_all_universities') and not data.get('target_universities'):
            raise serializers.ValidationError(
                "Must specify either all universities or specific universities"
            )
        return data