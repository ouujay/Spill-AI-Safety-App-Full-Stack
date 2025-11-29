from django.db.models import Q, Count, OuterRef, Subquery
from django.utils import timezone
from datetime import timedelta

from users.models import University
from .models import Post, Hashtag, SeenPost
from .feed_engine import rank_posts

DEFAULT_LIMIT = 10  # items per bucket / page


# -------- Posts --------

def search_posts(q, limit=DEFAULT_LIMIT, exclude_seen_ids=None):
    q = (q or "").strip()
    if not q:
        return Post.objects.none()

    base = (Post.objects
            .select_related("author", "university")
            .prefetch_related("hashtags"))

    if q.startswith("#"):
        tag = q[1:].lower()
        qs = base.filter(hashtags__name__icontains=tag)
    else:
        qs = base.filter(
            Q(content__icontains=q) | Q(hashtags__name__icontains=q.lstrip("#"))
        ).distinct()

    if exclude_seen_ids:
        qs = qs.exclude(id__in=exclude_seen_ids)

    return qs.order_by("-created_at")[:limit]


# -------- Hashtags --------

def search_hashtags(q, limit=DEFAULT_LIMIT):
    q = (q or "").lstrip("#").strip().lower()
    if not q:
        return Hashtag.objects.none()
    return Hashtag.objects.filter(name__icontains=q).order_by("name")[:limit]


# -------- Universities --------

def search_universities(q, limit=DEFAULT_LIMIT):
    q = (q or "").strip()
    if not q:
        return University.objects.none()
    qs = University.objects.all()
    return qs.filter(
        Q(name__icontains=q) |
        Q(city__name__icontains=q) |
        Q(city__country__name__icontains=q)
    ).order_by("name")[:limit]


# -------- Trending posts (with views-aware ranking) --------

def trending_posts(limit=10, days=1):
    """Global trending with the same scorer used by For-You."""
    since = timezone.now() - timedelta(days=days)
    now = timezone.now()
    qs = (Post.objects
          .filter(parent__isnull=True, created_at__gte=since)
          .exclude(
              Q(moderation_status__in=[Post.MOD_SOFT, Post.MOD_ESC]) &
              (Q(moderation_until__isnull=True) | Q(moderation_until__gt=now))
          )
          .select_related("author", "university")
          .prefetch_related("hashtags"))
    return rank_posts(list(qs), user=None, limit=limit)


def trending_hashtags(limit=10, days=1, university_id=None):
    """
    Top hashtags used in posts in the last `days`.
    If university_id is given, restrict to that university.
    Returns: list of dicts: { name: '#tag', total: int }
    """
    since = timezone.now() - timedelta(days=days)

    base = Hashtag.objects.filter(posts__created_at__gte=since)
    if university_id:
        base = base.filter(posts__university_id=university_id)

    top = (base
           .annotate(total=Count('posts', filter=Q(posts__created_at__gte=since), distinct=True))
           .order_by('-total', 'name')[:limit])

    return [{'name': f'#{h.name}', 'total': h.total or 0} for h in top]


def posts_for_hashtag(tag_name, limit=DEFAULT_LIMIT):
    """
    Return recent posts for a given hashtag name (case-insensitive),
    ordered by recency. `tag_name` can include a leading '#'.
    """
    tag = (tag_name or "").lstrip("#").strip().lower()
    if not tag:
        return Post.objects.none()
    # NOTE: no slicing here; let DRF pagination handle page size
    return (Post.objects
            .filter(hashtags__name__iexact=tag)
            .select_related("author", "university")
            .prefetch_related("hashtags")
            .order_by("-created_at"))