# notifications/urls.py - COMPLETE VERSION with all missing endpoints

from django.urls import path
from .views import (
    # Notification endpoints
    NotificationsListView, 
    NotificationsMarkReadView, 
    NotificationsMarkAllReadView,
    
    # Follow endpoints
    FollowUserView,
    FollowHashtagView, 
    FollowUniversityView,
    
    # ADDED: Missing follow status endpoint
    FollowStatusView,
    
    # Stats endpoints
    HashtagStatsView,
    UniversityStatsView,
    
    # Search endpoints
    HashtagSearchView,
    
    # Push notification endpoints
    register_push_token,
    unregister_push_token
)

urlpatterns = [
    # ============= NOTIFICATION ENDPOINTS =============
    path('notifications/', NotificationsListView.as_view(), name='notifications-list'),
    path('notifications/mark-read/', NotificationsMarkReadView.as_view(), name='notifications-mark-read'),
    path('notifications/mark-all-read/', NotificationsMarkAllReadView.as_view(), name='notifications-mark-all-read'),

    # ============= FOLLOW ENDPOINTS =============
    path('follow/user/', FollowUserView.as_view(), name='follow-user'),
    path('follow/hashtag/', FollowHashtagView.as_view(), name='follow-hashtag'),
    path('follow/university/', FollowUniversityView.as_view(), name='follow-university'),
    
    # ADDED: Missing follow status endpoint
    path('follow/status/', FollowStatusView.as_view(), name='follow-status'),
    
    # ============= STATS ENDPOINTS =============
    path('hashtags/<str:hashtag_name>/stats/', HashtagStatsView.as_view(), name='hashtag-stats'),
    path('universities/<int:university_id>/stats/', UniversityStatsView.as_view(), name='university-stats'),
    
    # ============= SEARCH ENDPOINTS =============
    path('search/hashtags/', HashtagSearchView.as_view(), name='hashtag-search'),

    # ============= PUSH NOTIFICATION ENDPOINTS =============
    path('register-token/', register_push_token, name='register_push_token'),
    path('unregister-token/', unregister_push_token, name='unregister_push_token'),
]