# posts/feed_engine.py

from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q, OuterRef, Subquery
from posts.models import Post, SeenPost
from users.models import UniversityFollow

# ----- Tunables -----
ENG_PRIOR_VIEWS = 30.0
ENG_BASELINE = 0.015
ZERO_START = 100
ZERO_SLOPE = 0.01
ZERO_CAP = 10.0


def calculate_post_score(post, user, user_data):
    """
    Updated scoring for new flag system:
    - Tea posts (no flag): scored by likes
    - Red/Green posts: scored by green_votes - red_votes
    """
    comment_count = getattr(post, 'comment_count', 0) or 0
    repost_count = getattr(post, 'repost_count', 0) or 0
    views = getattr(post, 'views', 0) or 0

    # Different engagement calculation based on post type
    if getattr(post, 'flag', None) in ('red', 'green'):
        # Flagged posts: use red/green votes
        red_votes = getattr(post, 'red_votes', 0) or 0
        green_votes = getattr(post, 'green_votes', 0) or 0
        vote_score = green_votes - red_votes
        engagement = green_votes + red_votes  # Total voting activity
    else:
        # Tea posts: use likes only
        likes = getattr(post, 'upvotes', 0) or 0
        vote_score = likes
        engagement = likes

    score = 0.0
    
    # Core engagement scoring
    score += vote_score * 3.0
    score += comment_count * 2.0
    score += repost_count * 2.0

    # Engagement rate adjustment (Bayesian smoothing)
    total_engagement = engagement + 0.6 * comment_count + 0.8 * repost_count
    eng_rate = (total_engagement + ENG_PRIOR_VIEWS * ENG_BASELINE) / (max(1.0, views) + ENG_PRIOR_VIEWS)
    score += 25.0 * (eng_rate - ENG_BASELINE)

    # Penalty for posts with many views but zero engagement
    if total_engagement == 0 and views >= ZERO_START:
        import math
        penalty = min(ZERO_CAP, ZERO_SLOPE * math.sqrt(max(0.0, views - ZERO_START)) * 100)
        score -= penalty

    # Time decay
    hours_since = (timezone.now() - post.created_at).total_seconds() / 3600.0
    score += 4.0 / (hours_since + 2.0) ** 0.5

    # University preferences
    if user and post.university_id == user.university_id:
        score += 2.0
    elif user and post.university_id in user_data.get('followed_uni_ids', set()):
        score += 1.5

    # Flag preference (if user has a preferred flag type)
    if user:
        pref_flag = user_data.get('preferred_flag_type')
        if pref_flag and getattr(post, 'flag', None) == pref_flag:
            score += 1.0

    # Penalize very old posts
    if hours_since > 24 * 7:  # Older than 1 week
        score -= 100.0

    return score


def rank_posts(posts, user=None, limit=50, user_data=None):
    """
    Rank posts using the updated scoring system
    """
    if user_data is None:
        user_data = {
            "followed_uni_ids": set(
                UniversityFollow.objects.filter(user=user).values_list("university_id", flat=True)
            ) if user else set(),
        }
    
    scored = []
    now = timezone.now()
    
    for post in posts:
        # Check if post is actively suppressed
        if getattr(post, "moderation_status", None) in (Post.MOD_SOFT, Post.MOD_ESC):
            if not getattr(post, "moderation_until", None) or post.moderation_until > now:
                scored.append((-1e9, post))  # Bury suppressed posts
                continue
        
        score = calculate_post_score(post, user, user_data)
        scored.append((score, post))
    
    # Sort by score (highest first)
    scored.sort(key=lambda t: t[0], reverse=True)
    
    # Return top posts
    return [post for _, post in scored[:limit]]


def get_for_you_feed(user, seen_ids=None, limit=20):
    """
    Generate personalized For You feed with updated scoring
    """
    followed_uni_ids = set(
        UniversityFollow.objects.filter(user=user).values_list('university_id', flat=True)
    )
    followed_uni_ids.add(user.university_id)

    user_data = {
        'followed_uni_ids': followed_uni_ids,
        'preferred_flag_type': getattr(user, 'preferred_flag_type', None),
    }

    # Look at posts from last 3 days
    days_back = 3
    qs = Post.objects.filter(
        created_at__gte=timezone.now() - timedelta(days=days_back),
        parent__isnull=True  # Only top-level posts
    )
    
    if seen_ids:
        qs = qs.exclude(id__in=seen_ids)

    # Exclude actively suppressed posts
    now = timezone.now()
    qs = qs.exclude(
        Q(moderation_status__in=[Post.MOD_SOFT, Post.MOD_ESC]) &
        (Q(moderation_until__isnull=True) | Q(moderation_until__gt=now))
    )

    # Views via subquery
    views_subq = (SeenPost.objects
                  .filter(post_id=OuterRef('pk'))
                  .values('post_id')
                  .annotate(c=Count('id'))
                  .values('c')[:1])

    # Annotate with engagement metrics for both post types
    qs = qs.annotate(
        # Like-based metrics (for Tea posts)
        upvotes=Count('reactions', filter=Q(reactions__reaction='up'), distinct=True),
        
        # Flag-based metrics (for Red/Green posts)
        red_votes=Count('flag_votes', filter=Q(flag_votes__vote='red'), distinct=True),
        green_votes=Count('flag_votes', filter=Q(flag_votes__vote='green'), distinct=True),
        
        # Common metrics
        repost_count=Count('reposts', distinct=True),
        comment_count=Count('replies', distinct=True),
        views=Subquery(views_subq),
    ).select_related('author', 'university').prefetch_related('hashtags')

    posts = list(qs)
    
    # Calculate vote scores for each post based on type
    for post in posts:
        if post.flag in ('red', 'green'):
            post.vote_score = (getattr(post, 'green_votes', 0) or 0) - (getattr(post, 'red_votes', 0) or 0)
        else:
            post.vote_score = getattr(post, 'upvotes', 0) or 0

    # Score and rank posts
    scored = [(calculate_post_score(post, user, user_data), post) for post in posts]
    scored.sort(key=lambda t: t[0], reverse=True)

    # Deduplicate and return
    result, seen = [], set()
    for _, post in scored:
        if post.id in seen:
            continue
        result.append(post)
        seen.add(post.id)
        if len(result) >= limit:
            break
    
    return result