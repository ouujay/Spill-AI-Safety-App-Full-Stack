from datetime import timedelta
import requests

from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    SelfieVerification, PasswordResetOTP, User as UserModel,
    University, UniversityFollow
)
from .serializers import (
    UserRegisterSerializer, UserSerializer, SelfieVerificationSerializer,
    UniversitySerializer
)
from .utils import generate_otp, send_appeal_notification, send_otp_email
from .permissions import IsSelfieVerified  # <<< added

User = get_user_model()

# --- 1. Register ---
class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)

        return Response({
            "user": UserSerializer(user).data,
            "access": access,
            "refresh": str(refresh),
        }, status=status.HTTP_201_CREATED)

# --- 2. Profile view/update ---
class ProfileView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

# --- 3. Selfie verification ---
FLASK_ENDPOINT = "https://genapp-dgeugtftfmaea7ds.southafricanorth-01.azurewebsites.net/predict-gender"  # Update if needed

class SelfieVerificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    MAX_TRIALS = 1

    def post(self, request):
        serializer = SelfieVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        selfie = serializer.validated_data['selfie']
        selfie_bytes = selfie.read()
        user = request.user

        obj, _created = SelfieVerification.objects.get_or_create(user=user)

        if obj.verified:
            return Response({'success': True, 'message': 'Already verified.'}, status=status.HTTP_200_OK)

        if obj.retry_count >= self.MAX_TRIALS and not obj.appeal_requested:
            return Response({
                'success': False,
                'locked': True,
                'message': 'Maximum attempts reached. Please appeal.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Send to  API
        files = {'file': ('selfie.jpg', selfie_bytes, 'image/jpeg')}
        try:
            r = requests.post(FLASK_ENDPOINT, files=files, timeout=15)
            result = r.json()
        except requests.exceptions.RequestException:
            return Response({'error': 'Flask service not available.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        is_female = result.get('is_female', False)
        confidence = result.get('confidence', 0)

        # Save latest attempt
        obj.raw_image_bytes = selfie_bytes
        obj.confidence = confidence
        obj.retry_count += 1
        obj.verified = is_female
        obj.save(update_fields=['raw_image_bytes', 'confidence', 'retry_count', 'verified'])

        if is_female:
            if not user.selfie_verified:
                user.selfie_verified = True
                user.save(update_fields=['selfie_verified'])
            return Response(
                {'success': True, 'confidence': confidence, 'message': '✅ Female verified, signup complete.'},
                status=status.HTTP_200_OK
            )

        attempts_left = max(0, self.MAX_TRIALS - obj.retry_count)
        return Response({
            'success': False,
            'confidence': confidence,
            'attempts_left': attempts_left,
            'message': f'❌ Not verified as female. {attempts_left} attempts left.'
        }, status=status.HTTP_200_OK)

# --- 4. Password reset (request) ---
class RequestPasswordResetView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'message': 'If this email exists, an OTP has been sent.'}, status=status.HTTP_200_OK)

        now = timezone.now()

        latest = PasswordResetOTP.objects.filter(user=user).order_by('-created_at').first()
        if latest and (now - latest.created_at) < timedelta(seconds=60):
            return Response({'error': 'Please wait a minute before requesting another code.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        day_ago = now - timedelta(hours=24)
        count_24h = PasswordResetOTP.objects.filter(user=user, created_at__gte=day_ago).count()
        if count_24h >= 5:
            return Response({'error': 'Daily OTP limit reached. Try again later.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Invalidate any outstanding codes
        PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)

        otp = generate_otp()
        PasswordResetOTP.create_for_user(user, otp)
        send_otp_email(email, otp, subject="Your Password Reset Code")
        return Response({'message': 'OTP sent to your email.'}, status=status.HTTP_200_OK)

# --- 5. Password reset (confirm) ---
class ConfirmPasswordResetView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')
        new_password = request.data.get('new_password')

        try:
            user = User.objects.get(email=email)
            record = PasswordResetOTP.objects.filter(user=user, is_used=False).latest('created_at')
        except (User.DoesNotExist, PasswordResetOTP.DoesNotExist):
            return Response({'error': 'Invalid email or OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        if record.is_expired() or not record.verify(otp):
            return Response({'error': 'Invalid email or OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user)
        except Exception as e:
            return Response({'new_password': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        record.mark_used()
        PasswordResetOTP.objects.filter(user=user, is_used=False).exclude(id=record.id).update(is_used=True)

        return Response({'message': 'Password reset successful.'}, status=status.HTTP_200_OK)

# --- 6. Logout (JWT blacklist) ---
class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Logout successful."}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"error": "Invalid or missing refresh token."}, status=status.HTTP_400_BAD_REQUEST)

# --- 7. Universities ---
class UniversityListView(generics.ListAPIView):
    queryset = University.objects.all()
    serializer_class = UniversitySerializer
    permission_classes = [permissions.AllowAny]

class UniversityFollowView(APIView):
    # Gate main-app write actions behind selfie verification
    permission_classes = [permissions.IsAuthenticated, IsSelfieVerified]

    def post(self, request):
        university_id = request.data.get('university_id')
        if not university_id:
            return Response({'error': 'Missing university_id.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            uni = University.objects.get(id=university_id)
        except University.DoesNotExist:
            return Response({'error': 'University not found.'}, status=status.HTTP_404_NOT_FOUND)

        obj, created = UniversityFollow.objects.get_or_create(user=request.user, university=uni)
        if not created:
            return Response({'message': 'Already following.'}, status=status.HTTP_200_OK)
        return Response({'message': 'Followed successfully.'}, status=status.HTTP_201_CREATED)

class UniversityUnfollowView(APIView):
    # Gate main-app write actions behind selfie verification
    permission_classes = [permissions.IsAuthenticated, IsSelfieVerified]

    def post(self, request):
        university_id = request.data.get('university_id')
        if not university_id:
            return Response({'error': 'Missing university_id.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            uni = University.objects.get(id=university_id)
            obj = UniversityFollow.objects.get(user=request.user, university=uni)
            obj.delete()
            return Response({'message': 'Unfollowed successfully.'}, status=status.HTTP_200_OK)
        except (University.DoesNotExist, UniversityFollow.DoesNotExist):
            return Response({'error': 'Not following this university.'}, status=status.HTTP_404_NOT_FOUND)

# --- 8. Delete account ---
class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        # purge related
        SelfieVerification.objects.filter(user=user).delete()
        PasswordResetOTP.objects.filter(user=user).delete()
        UniversityFollow.objects.filter(user=user).delete()
        # anonymize + deactivate (your model method)
        user.anonymize_and_deactivate()
        return Response(status=status.HTTP_204_NO_CONTENT)

# --- 9. Selfie status (now includes attempts_left) ---
class SelfieStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        status_payload = {
            'selfie_verified': user.selfie_verified,
            'locked': False,
            'retry_count': 0,
            'appeal_requested': False,
            'attempts_left': 1,
        }
        try:
            obj = SelfieVerification.objects.get(user=user)
            status_payload.update({
                'locked': (obj.retry_count >= 1 and not obj.verified and not obj.appeal_requested),
                'retry_count': obj.retry_count,
                'appeal_requested': obj.appeal_requested,
            })
            status_payload['attempts_left'] = max(0, 1 - obj.retry_count)
        except SelfieVerification.DoesNotExist:
            pass
        return Response(status_payload, status=status.HTTP_200_OK)

# Then update your existing SelfieAppealView:
class SelfieAppealView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        obj, _ = SelfieVerification.objects.get_or_create(user=user)
        
        if obj.appeal_requested:
            return Response({"detail": "You have already submitted an appeal."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Mark appeal as requested
        obj.appeal_requested = True
        obj.save(update_fields=['appeal_requested'])
        
        # Send email notification to admin
        try:
            email_sent = send_appeal_notification(user, obj)
            if email_sent:
                message = "Your appeal has been submitted. Admin has been notified."
            else:
                message = "Your appeal has been submitted. (Email notification failed)"
        except Exception as e:
            message = "Your appeal has been submitted."
        
        return Response({"detail": message}, status=status.HTTP_200_OK)

from .serializers import (
    UserRegisterSerializer, UserSerializer, SelfieVerificationSerializer,
    UniversitySerializer, HandleSetSerializer   # add this
)

class SetHandleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.handle_locked:
            return Response({"error": "Handle already set and locked."}, status=status.HTTP_403_FORBIDDEN)

        ser = HandleSetSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user.handle = ser.validated_data['handle'].lower()
        user.handle_locked = True
        user.save(update_fields=['handle', 'handle_locked'])
        return Response({"message": "Handle set successfully.", "handle": user.handle}, status=200)
