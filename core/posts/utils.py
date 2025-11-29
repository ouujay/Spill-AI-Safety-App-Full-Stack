# posts/utils.py - NEW FILE
import base64
import json
from django.utils import timezone
from django.db.models import Q


def encode_cursor(d: dict) -> str:
    """Encode cursor data as opaque token"""
    return base64.urlsafe_b64encode(json.dumps(d).encode()).decode()


def decode_cursor(token: str) -> dict:
    """Decode cursor token back to dict"""
    try:
        return json.loads(base64.urlsafe_b64decode(token.encode()).decode())
    except Exception:
        return {}


def apply_keyset(qs, last_created_at, last_id):
    """Apply keyset pagination for consistent ordering"""
    if last_created_at and last_id:
        return qs.filter(
            Q(created_at__lt=last_created_at) |
            Q(created_at=last_created_at, id__lt=last_id)
        ).order_by('-created_at', '-id')
    return qs.order_by('-created_at', '-id')

# posts/utils.py

def resolve_image_url(file_field) -> str | None:
    """
    Return a safe image URL from an ImageField that may contain either:
      - a managed storage name (use .url), or
      - a full remote URL accidentally stored in the field (return as-is).
    """
    if not file_field:
        return None
    s = str(file_field or "").strip()
    if not s:
        return None
    if s.startswith("http://") or s.startswith("https://"):
        # A full URL was stored directly in the ImageField's name -> use it as-is
        return s
    try:
        return file_field.url
    except Exception:
        return None
