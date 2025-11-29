from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from datetime import date

from .models import University, UniversityFollow

User = get_user_model()


# ========== Auth / User ==========
class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    date_of_birth = serializers.DateField(required=True)
    university = serializers.PrimaryKeyRelatedField(queryset=University.objects.all(), required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'date_of_birth', 'university']

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def create(self, validated_data):
        dob = validated_data['date_of_birth']
        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return User.objects.create_user(
            email=validated_data['email'].strip().lower(),
            password=validated_data['password'],
            date_of_birth=dob,
            university=validated_data.get('university', None),
            age=age
        )

class UserSerializer(serializers.ModelSerializer):
    university = serializers.StringRelatedField()
    university_id = serializers.IntegerField(source='university.id', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'date_of_birth', 'age',
            'university', 'university_id', 'selfie_verified',
            'handle', 'handle_locked',              # NEW
        ]
class HandleSetSerializer(serializers.Serializer):
    handle = serializers.RegexField(regex=r'^[a-z0-9_]{3,20}$')

    def validate_handle(self, value):
        value = value.lower()
        User = get_user_model()
        if User.objects.filter(handle__iexact=value).exists():
            raise serializers.ValidationError("Handle is taken.")
        return value

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile updates (currently only university).
    Allow null to clear university selection.
    """
    university = serializers.PrimaryKeyRelatedField(
        queryset=University.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = User
        fields = ['university']


# ========== Selfie ==========
class SelfieVerificationSerializer(serializers.Serializer):
    selfie = serializers.ImageField()


# ========== Universities / Follows ==========
class UniversitySerializer(serializers.ModelSerializer):
    city = serializers.StringRelatedField()

    class Meta:
        model = University
        fields = ['id', 'name', 'city']


class UniversityFollowSerializer(serializers.ModelSerializer):
    """
    Write with university_id; read returns nested university details.
    `user` is always taken from request, not the payload.
    """
    university_id = serializers.PrimaryKeyRelatedField(
        source='university',
        queryset=University.objects.all(),
        write_only=True
    )
    university = UniversitySerializer(read_only=True)

    class Meta:
        model = UniversityFollow
        fields = ['id', 'university_id', 'university', 'created_at']
        read_only_fields = ['created_at']


# ========== Password Reset (OTP) ==========
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        return value.strip().lower()

    def validate_new_password(self, value):
        # We can’t validate against a user here (no user yet),
        # but basic validators still run; view will run full validation with user.
        validate_password(value)
        return value
