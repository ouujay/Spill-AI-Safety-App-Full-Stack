# notifications/views.py - COMPLETE UPDATED VERSION with hashtag and university fixes

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404

# Import models from correct locations
from users.models import User, University, UniversityFollow
from posts.models import Hashtag, Post
from .models import (
    Notification, PushToken, NotificationLog,
    HashtagFollow, UserFollow
)
from .serializers import NotificationSerializer

# ============= NOTIFICATION VIEWS =============

class NotificationsListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        page = int(request.GET.get('page', 1))
        page_size = min(int(request.GET.get('page_size', 20)), 50)  # Max 50 per page
        
        # Calculate offset
        offset = (page - 1) * page_size
        
        # Get notifications with related data
        notifications = (Notification.objects
                        .filter(user=request.user)
                        .select_related("post", "actor", "post__author", "post__university")
                        .prefetch_related("post__hashtags")
                        .order_by("-created_at")
                        [offset:offset + page_size])
        
        # Get unread count
        unread_count = Notification.objects.filter(
            user=request.user, 
            is_read=False
        ).count()
        
        # Serialize notifications
        serializer = NotificationSerializer(notifications, many=True)
        
        # Check if there are more notifications
        total_count = Notification.objects.filter(user=request.user).count()
        has_more = offset + page_size < total_count
        
        return Response({
            "unread_count": unread_count,
            "items": serializer.data,
            "has_more": has_more,
            "page": page,
            "page_size": page_size,
            "total_count": total_count,
        })

class NotificationsMarkReadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Handle both single notification_id and bulk ids
        notification_id = request.data.get("notification_id")
        ids = request.data.get("ids", [])
        
        # If single notification_id provided
        if notification_id:
            try:
                notification = Notification.objects.get(
                    id=notification_id,
                    user=request.user
                )
                notification.is_read = True
                notification.save()
                
                return Response({
                    "message": "Notification marked as read",
                    "notification_id": notification_id
                })
            except Notification.DoesNotExist:
                return Response(
                    {"error": "Notification not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # If bulk ids provided
        elif ids and isinstance(ids, list) and len(ids) > 0:
            try:
                # Validate all IDs belong to current user
                valid_notifications = Notification.objects.filter(
                    id__in=ids,
                    user=request.user
                )
                
                if not valid_notifications.exists():
                    return Response(
                        {"error": "No valid notifications found"}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Mark as read
                updated_count = valid_notifications.update(is_read=True)
                
                return Response({
                    "message": f"Marked {updated_count} notifications as read",
                    "updated_count": updated_count,
                    "ids": ids
                })
            except Exception as e:
                return Response(
                    {"error": f"Failed to mark notifications as read: {str(e)}"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Neither provided
        else:
            return Response(
                {"error": "Either 'notification_id' or 'ids' array is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class NotificationsMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        updated_count = Notification.objects.filter(
            user=request.user, 
            is_read=False
        ).update(is_read=True)
        
        return Response({
            "message": f"Marked all {updated_count} notifications as read",
            "updated_count": updated_count
        })

# ============= FOLLOW VIEWS (FIXED WITH DUPLICATE PREVENTION) =============

class FollowUserView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            followee = User.objects.get(id=user_id)
            if followee == request.user:
                return Response(
                    {'error': 'Cannot follow yourself'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # FIXED: Use get_or_create to prevent duplicates
            follow, created = UserFollow.objects.get_or_create(
                follower=request.user,
                followee=followee
            )
            
            # Get follower count
            follower_count = UserFollow.objects.filter(followee=followee).count()
            
            return Response({
                'following': True,
                'created': created,
                'follower_count': follower_count,
                'message': 'Followed successfully' if created else 'Already following'
            })
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request):
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            followee = User.objects.get(id=user_id)
            deleted_count = UserFollow.objects.filter(
                follower=request.user,
                followee=followee
            ).delete()[0]
            
            # Get updated follower count
            follower_count = UserFollow.objects.filter(followee=followee).count()
            
            return Response({
                'following': False,
                'deleted': deleted_count > 0,
                'follower_count': follower_count,
                'message': 'Unfollowed successfully' if deleted_count > 0 else 'Was not following'
            })
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

class FollowHashtagView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # FIXED: Use 'name' parameter for consistency
        hashtag_name = request.data.get('name', '').strip()
        if not hashtag_name:
            return Response(
                {'error': 'name is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Remove # if present
        hashtag_name = hashtag_name.lstrip('#')
        
        try:
            hashtag = Hashtag.objects.get(name=hashtag_name)
            
            # FIXED: Use get_or_create to prevent duplicates
            follow, created = HashtagFollow.objects.get_or_create(
                user=request.user,
                hashtag=hashtag
            )
            
            # Get current follower count
            follower_count = HashtagFollow.objects.filter(hashtag=hashtag).count()
            
            return Response({
                'following': True,
                'hashtag': hashtag_name,
                'created': created,
                'follower_count': follower_count,
                'message': 'Followed successfully' if created else 'Already following'
            })
        except Hashtag.DoesNotExist:
            return Response(
                {'error': 'Hashtag not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request):
        # FIXED: Use 'name' parameter for consistency
        hashtag_name = request.data.get('name', '').strip()
        if not hashtag_name:
            return Response(
                {'error': 'name is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        hashtag_name = hashtag_name.lstrip('#')
        
        try:
            hashtag = Hashtag.objects.get(name=hashtag_name)
            deleted_count = HashtagFollow.objects.filter(
                user=request.user,
                hashtag=hashtag
            ).delete()[0]
            
            # Get updated follower count
            follower_count = HashtagFollow.objects.filter(hashtag=hashtag).count()
            
            return Response({
                'following': False,
                'deleted': deleted_count > 0,
                'follower_count': follower_count,
                'message': 'Unfollowed successfully' if deleted_count > 0 else 'Was not following'
            })
        except Hashtag.DoesNotExist:
            return Response(
                {'error': 'Hashtag not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

class FollowUniversityView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        university_id = request.data.get('university_id')
        if not university_id:
            return Response(
                {'error': 'university_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            university = University.objects.get(id=university_id)
            
            # FIXED: Use get_or_create to prevent duplicates
            follow, created = UniversityFollow.objects.get_or_create(
                user=request.user,
                university=university
            )
            
            # Get current follower count
            follower_count = UniversityFollow.objects.filter(university=university).count()
            
            return Response({
                'following': True,
                'university_id': university_id,
                'university_name': university.name,
                'created': created,
                'follower_count': follower_count,
                'message': 'Followed successfully' if created else 'Already following'
            })
        except University.DoesNotExist:
            return Response(
                {'error': 'University not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request):
        university_id = request.data.get('university_id')
        if not university_id:
            return Response(
                {'error': 'university_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            university = University.objects.get(id=university_id)
            deleted_count = UniversityFollow.objects.filter(
                user=request.user,
                university=university
            ).delete()[0]
            
            # Get updated follower count
            follower_count = UniversityFollow.objects.filter(university=university).count()
            
            return Response({
                'following': False,
                'deleted': deleted_count > 0,
                'follower_count': follower_count,
                'university_name': university.name,
                'message': 'Unfollowed successfully' if deleted_count > 0 else 'Was not following'
            })
        except University.DoesNotExist:
            return Response(
                {'error': 'University not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

# ============= NEW STATS VIEWS =============

class HashtagStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, hashtag_name):
        hashtag_name = hashtag_name.strip().lstrip('#')
        
        try:
            hashtag = Hashtag.objects.get(name=hashtag_name)
            
            # Get follower count
            follower_count = HashtagFollow.objects.filter(hashtag=hashtag).count()
            
            # Get post count
            post_count = hashtag.posts.count()
            
            # Check if current user is following
            is_following = HashtagFollow.objects.filter(
                user=request.user,
                hashtag=hashtag
            ).exists()
            
            return Response({
                'hashtag': hashtag_name,
                'follower_count': follower_count,
                'post_count': post_count,
                'is_following': is_following
            })
        except Hashtag.DoesNotExist:
            return Response(
                {'error': 'Hashtag not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

class UniversityStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, university_id):
        try:
            university = University.objects.get(id=university_id)
            
            # Get follower count
            follower_count = UniversityFollow.objects.filter(university=university).count()
            
            # Get post count
            post_count = university.posts.count()
            
            # Check if current user is following
            is_following = UniversityFollow.objects.filter(
                user=request.user,
                university=university
            ).exists()
            
            return Response({
                'university_id': university_id,
                'university_name': university.name,
                'follower_count': follower_count,
                'post_count': post_count,
                'is_following': is_following
            })
        except University.DoesNotExist:
            return Response(
                {'error': 'University not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

# ============= FOLLOW STATUS AND STATS VIEWS =============

class FollowStatusView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Check if user is following users, hashtags, or universities via GET params"""
        user_ids = request.GET.get('user_ids', '').split(',') if request.GET.get('user_ids') else []
        hashtag_names = request.GET.get('hashtag_names', '').split(',') if request.GET.get('hashtag_names') else []
        university_ids = request.GET.get('university_ids', '').split(',') if request.GET.get('university_ids') else []
        
        result = {}
        
        # Check user follows
        if user_ids and user_ids != ['']:
            valid_ids = [uid for uid in user_ids if uid.isdigit()]
            following = UserFollow.objects.filter(
                follower=request.user,
                followee_id__in=valid_ids
            ).values_list('followee_id', flat=True)
            result["users"] = {str(uid): int(uid) in following for uid in valid_ids}
        
        # Check hashtag follows
        if hashtag_names and hashtag_names != ['']:
            clean_names = [name.strip().lstrip("#") for name in hashtag_names if name.strip()]
            following = HashtagFollow.objects.filter(
                user=request.user,
                hashtag__name__in=clean_names
            ).values_list('hashtag__name', flat=True)
            result["hashtags"] = {name: name in following for name in clean_names}
        
        # Check university follows
        if university_ids and university_ids != ['']:
            valid_ids = [uid for uid in university_ids if uid.isdigit()]
            following = UniversityFollow.objects.filter(
                user=request.user,
                university_id__in=valid_ids
            ).values_list('university_id', flat=True)
            result["universities"] = {str(uid): int(uid) in following for uid in valid_ids}
        
        return Response(result, status=200)

# ============= SEARCH VIEWS =============

class HashtagSearchView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        query = request.query_params.get('q', '').strip()
        limit = min(int(request.query_params.get('limit', 10)), 50)
        
        if not query:
            return Response({'results': []})
        
        # Remove # if present
        query = query.lstrip('#')
        
        # Search hashtags
        hashtags = Hashtag.objects.filter(
            name__icontains=query
        ).annotate(
            post_count=Count('posts', distinct=True)
        )
        
        # Order by relevance (exact match first, then by popularity)
        hashtags = hashtags.order_by('-post_count')
        
        hashtags_data = hashtags[:limit].values('name', 'post_count')
        
        return Response({
            'results': list(hashtags_data)
        })

# ============= PUSH NOTIFICATION VIEWS =============

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_push_token(request):
    token = request.data.get('token')
    device_type = request.data.get('device_type', 'expo')
    
    if not token:
        return Response(
            {'error': 'Token is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create or update token
    push_token, created = PushToken.objects.get_or_create(
        user=request.user,
        token=token,
        defaults={'platform': device_type, 'is_active': True}
    )
    
    if not created:
        push_token.is_active = True
        push_token.platform = device_type
        push_token.save()
    
    return Response({
        'message': 'Token registered successfully',
        'created': created
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unregister_push_token(request):
    token = request.data.get('token')
    
    if not token:
        return Response(
            {'error': 'Token is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        push_token = PushToken.objects.get(user=request.user, token=token)
        push_token.is_active = False
        push_token.save()
        
        return Response({'message': 'Token unregistered successfully'})
    except PushToken.DoesNotExist:
        return Response(
            {'error': 'Token not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )