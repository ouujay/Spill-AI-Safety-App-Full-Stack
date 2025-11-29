from rest_framework.permissions import BasePermission

class IsSelfieVerified(BasePermission):
    message = "You must verify your selfie to access this feature."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.selfie_verified)
