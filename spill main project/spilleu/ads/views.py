from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db.models import Count, Q
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Ad, AdImpression, AdClick
from .serializers import (
    AdCreateSerializer, AdDetailSerializer, 
    AdListSerializer, PriceCalculatorSerializer
)

User = get_user_model()

class AdViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.action in ['pending', 'approve', 'reject']:
            # Admin only
            return Ad.objects.all()
        # User's own ads
        return Ad.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AdCreateSerializer
        elif self.action == 'list':
            return AdListSerializer
        return AdDetailSerializer
    
    @action(detail=False, methods=['post'])
    def calculate_price(self, request):
        """Calculate ad price before creation"""
        serializer = PriceCalculatorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Get target user count
        if data['target_all_universities']:
            target_user_count = User.objects.filter(
                university__isnull=False,
                is_active=True
            ).count()
        else:
            target_user_count = User.objects.filter(
                university_id__in=data['target_universities'],
                is_active=True
            ).count()
        
        # Calculate price
        base_rate = 4  # ₦4 per user per day
        position_multiplier = 1.5 if data['ad_type'] == 'banner' else 1.0
        total_cost = target_user_count * base_rate * data['duration_days'] * position_multiplier
        
        return Response({
            'target_user_count': target_user_count,
            'base_rate_per_user_per_day': base_rate,
            'position_multiplier': position_multiplier,
            'duration_days': data['duration_days'],
            'total_cost': total_cost,
            'estimated_impressions': f"{int(target_user_count * 0.3)}-{int(target_user_count * 0.6)}"
        })
    
    @action(detail=False, methods=['get'])
    def my_ads(self, request):
        """Get current user's ads"""
        ads = self.get_queryset().annotate(
            total_impressions=Count('impressions'),
            total_clicks=Count('clicks')
        )
        serializer = AdListSerializer(ads, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active_ads(self, request):
        """Get active ads for display (in-feed or banner)"""
        ad_type = request.query_params.get('type', 'in_feed')
        user = request.user
        
        # Get active ads
        now = timezone.now()
        ads = Ad.objects.filter(
            status='active',
            ad_type=ad_type,
            start_date__lte=now,
            end_date__gte=now
        ).filter(
            Q(target_all_universities=True) |
            Q(target_universities=user.university)
        ).distinct()
        
        # Check for expired ads
        for ad in ads:
            ad.check_expiry()
        
        # Re-filter after expiry check
        ads = ads.filter(status='active')
        
        serializer = AdDetailSerializer(ads, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def impression(self, request, pk=None):
        """Track ad impression"""
        ad = self.get_object()
        
        if not ad.is_active():
            return Response(
                {'error': 'Ad is not active'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create impression (will fail silently if duplicate due to unique constraint)
        try:
            AdImpression.objects.create(ad=ad, user=request.user)
            return Response({'status': 'impression recorded'})
        except Exception:
            # Duplicate impression today
            return Response({'status': 'already recorded today'})
    
    @action(detail=True, methods=['post'])
    def click(self, request, pk=None):
        """Track ad click"""
        ad = self.get_object()
        
        if not ad.is_active():
            return Response(
                {'error': 'Ad is not active'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        AdClick.objects.create(ad=ad, user=request.user)
        return Response({'status': 'click recorded'})
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get ad analytics"""
        ad = self.get_object()
        
        # Check if user owns this ad
        if ad.user != request.user:
            return Response(
                {'error': 'Not authorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return Response({
            'total_impressions': ad.total_impressions,
            'total_clicks': ad.total_clicks,
            'ctr': ad.ctr,
            'days_remaining': (ad.end_date - timezone.now()).days if ad.end_date else None,
            'status': ad.status,
            'daily_impressions': list(
                ad.impressions.values('timestamp__date')
                .annotate(count=Count('id'))
                .order_by('timestamp__date')
            )
        })
    
    # Admin actions
    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def pending(self, request):
        """Get pending ads for moderation"""
        ads = Ad.objects.filter(status='pending').annotate(
            total_impressions=Count('impressions'),
            total_clicks=Count('clicks')
        )
        serializer = AdDetailSerializer(ads, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        """Approve an ad"""
        ad = self.get_object()
        
        if ad.status != 'pending':
            return Response(
                {'error': 'Only pending ads can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check user has sufficient tea balance
        if ad.user.tea_balance < ad.total_cost:
            return Response(
                {'error': 'User has insufficient tea balance'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Deduct tea
        ad.user.tea_balance -= ad.total_cost
        ad.user.save()
        
        # Activate ad
        ad.activate()
        
        return Response({
            'status': 'approved',
            'ad': AdDetailSerializer(ad).data
        })
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        """Reject an ad"""
        ad = self.get_object()
        
        if ad.status != 'pending':
            return Response(
                {'error': 'Only pending ads can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        ad.status = 'rejected'
        ad.rejection_reason = request.data.get('reason', 'No reason provided')
        ad.save()
        
        return Response({
            'status': 'rejected',
            'reason': ad.rejection_reason
        })