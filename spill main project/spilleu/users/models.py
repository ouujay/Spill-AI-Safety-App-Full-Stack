from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone

# =========================
# Geo structure
# =========================
class Country(models.Model):
    name = models.CharField(max_length=100)
    def __str__(self): return self.name


class City(models.Model):
    name = models.CharField(max_length=100)
    country = models.ForeignKey(Country, on_delete=models.CASCADE)
    def __str__(self): return f"{self.name}, {self.country.name}"


class University(models.Model):
    name = models.CharField(max_length=150)
    city = models.ForeignKey(City, on_delete=models.CASCADE)
    def __str__(self): return f"{self.name} ({self.city.name})"


class UniversityFollow(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='followed_universities')
    university = models.ForeignKey(University, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'university')

    def __str__(self):
        return f"{self.user.email} follows {self.university.name}"


# =========================
# User + Manager
# =========================
class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

from django.core.validators import RegexValidator

class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    # NEW: one-shot handle
    handle = models.CharField(
        max_length=20,
        unique=True,
        null=True, blank=True,
        validators=[RegexValidator(regex=r'^[a-z0-9_]{3,20}$',
                                   message="Handle must be 3–20 chars: a–z, 0–9, underscore.")]
    )
    handle_locked = models.BooleanField(default=False)  # once set, cannot change

    university = models.ForeignKey(University, on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    date_of_birth = models.DateField(null=True, blank=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    selfie_verified = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    def __str__(self):
        return self.email

    def anonymize_and_deactivate(self):
        self.is_active = False
        self.deleted_at = timezone.now()
        self.email = f"deleted+{self.id}@example.com"
        self.age = None
        self.university = None
        self.set_unusable_password()
        self.save(update_fields=["is_active", "deleted_at", "email", "age", "university", "password"])


# =========================
# Selfie verification
# =========================
class SelfieVerification(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    raw_image_bytes = models.BinaryField()  # overwritten on each attempt
    verified = models.BooleanField(default=False)
    confidence = models.FloatField(null=True, blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    appeal_requested = models.BooleanField(default=False)
    verified_at = models.DateTimeField(auto_now_add=True)


# =========================
# Password reset OTP (simple/plaintext)
# =========================
class PasswordResetOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_expired(self):
        # 10 minutes
        return (timezone.now() - self.created_at).total_seconds() > 600
