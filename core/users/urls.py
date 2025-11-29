from django.urls import path
from .views import ConfirmPasswordResetView, DeleteAccountView, LogoutView, RegisterView, ProfileView, RequestPasswordResetView, SelfieAppealView, SelfieStatusView, SelfieVerificationView, SetHandleView, UniversityFollowView, UniversityListView, UniversityUnfollowView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('verify-selfie/', SelfieVerificationView.as_view(), name='verify-selfie'),
     path('universities/', UniversityListView.as_view(), name='universities-list'),
    path('universities/follow/', UniversityFollowView.as_view(), name='follow-university'),
    path('universities/unfollow/', UniversityUnfollowView.as_view(), name='unfollow-university'),
    path('selfie-status/', SelfieStatusView.as_view(), name='selfie-status'),

    # JWT login/logout
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
     path('forgot-password/', RequestPasswordResetView.as_view(), name='forgot-password'),
    path('reset-password/', ConfirmPasswordResetView.as_view(), name='reset-password'),
        path('logout/', LogoutView.as_view(), name='logout'),
    path('delete-account/', DeleteAccountView.as_view(), name='delete-account'),
    path('selfie-appeal/', SelfieAppealView.as_view(), name='selfie-appeal'),
      path('set-handle/', SetHandleView.as_view(), name='set-handle'),  # NEW

]
