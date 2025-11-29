
# posts/selectors.py - NEW FILE  
from django.db.models import Q
from users.models import UniversityFollow
from .models import Post


def scope_filter(base_qs, scope, user):
    """Filter posts based on feed scope"""
    if scope == 'for_you':
        # Global feed - could add more sophisticated logic later
        return base_qs
    elif scope == 'following':
        # Posts from universities the user follows
        followed_uni_ids = UniversityFollow.objects.filter(user=user).values_list('university_id', flat=True)
        return base_qs.filter(university_id__in=followed_uni_ids)
    elif scope == 'my_uni':
        # Posts from user's own university
        if user.university_id:
            return base_qs.filter(university_id=user.university_id)
        else:
            return base_qs.none()
    return base_qs.none()

