# notifications/urls.py
from django.urls import path
from .views import (
    FollowUserView, 
    FollowHashtagView, 
    FollowUniversityView,
    NotificationsListView, 
    NotificationsMarkReadView, 
    NotificationsMarkAllReadView,
    FollowStatusView,
    register_push_token,
    unregister_push_token
)

urlpatterns = [
    # Follow endpoints
    path('follow/user/', FollowUserView.as_view(), name='follow-user'),
    path('follow/hashtag/', FollowHashtagView.as_view(), name='follow-hashtag'),
    path('follow/university/', FollowUniversityView.as_view(), name='follow-university'),
    
    # Follow status check
    path('follow/status/', FollowStatusView.as_view(), name='follow-status'),
    
    # Notifications endpoints
    path('notifications/', NotificationsListView.as_view(), name='notifications-list'),
    path('notifications/mark-read/', NotificationsMarkReadView.as_view(), name='notifications-mark-read'),
    path('notifications/mark-all-read/', NotificationsMarkAllReadView.as_view(), name='notifications-mark-all-read'),

    path('register-token/', register_push_token, name='register_push_token'),
    path('unregister-token/', unregister_push_token, name='unregister_push_token'),

]