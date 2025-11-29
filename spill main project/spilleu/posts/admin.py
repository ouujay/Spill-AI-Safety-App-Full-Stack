# posts/admin.py

from django.contrib import admin
from django.db.models import Count, Q
from django.utils.html import format_html
from django.utils import timezone
from datetime import timedelta

from .models import (
    Post, PostFlagVote, VoteReaction,
    SeenPost, SeenReply, SavedPost, ReportedPost,
    Hashtag, PostViewDaily, ReplyViewDaily
)

# ============== UTIL / ACTIONS ==============

@admin.action(description="Recompute PostViewDaily for selected posts (last 30 days)")
def recompute_post_views_last_30(modeladmin, request, queryset):
    today = timezone.now().date()
    start = today - timedelta(days=30)
    PostViewDaily.objects.filter(post__in=queryset, day__gte=start).delete()
    
    seen_rows = (
        SeenPost.objects
        .filter(post__in=queryset, seen_at__date__gte=start)
        .values('post_id', 'seen_at__date', 'user_id')
    )
    
    buckets = {}
    counts = {}
    for r in seen_rows:
        key = (r['post_id'], r['seen_at__date'])
        if r['user_id'] is None:
            counts[key] = counts.get(key, 0) + 1
        else:
            buckets.setdefault(key, set()).add(r['user_id'])
    
    to_create = []
    keys = set(list(buckets.keys()) + list(counts.keys()))
    for key in keys:
        pid, d = key
        unique_set = buckets.get(key, set())
        extra = counts.get(key, 0)
        unique_count = max(len(unique_set), extra) if unique_set else extra
        to_create.append(PostViewDaily(post_id=pid, day=d, unique_count=unique_count))
    
    if to_create:
        PostViewDaily.objects.bulk_create(to_create, batch_size=500)


# ============== INLINE DEFINITIONS ==============

class PostHashtagInline(admin.TabularInline):
    model = Post.hashtags.through
    extra = 0
    verbose_name = "Hashtag"
    verbose_name_plural = "Hashtags"


# ============== LIST FILTERS ==============

class HasImageFilter(admin.SimpleListFilter):
    title = "has image"
    parameter_name = "has_image"

    def lookups(self, request, model_admin):
        return (("yes", "Yes"), ("no", "No"))

    def queryset(self, request, queryset):
        if self.value() == "yes":
            return queryset.exclude(image__isnull=True).exclude(image__exact="")
        if self.value() == "no":
            return queryset.filter(Q(image__isnull=True) | Q(image__exact=""))
        return queryset


class PostTypeFilter(admin.SimpleListFilter):
    title = "post type"
    parameter_name = "post_type"

    def lookups(self, request, model_admin):
        return (("tea", "Tea (No Flag)"), ("red", "Red Flag"), ("green", "Green Flag"))

    def queryset(self, request, queryset):
        if self.value() == "tea":
            return queryset.filter(flag__isnull=True)
        if self.value() in ("red", "green"):
            return queryset.filter(flag=self.value())
        return queryset


# ============== ADMIN CLASSES ==============

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'post_type_display', 'first_name', 'person_age', 'short_content', 
        'author', 'university', 'created_at', 'has_image',
        'likes_count', 'red_votes_count', 'green_votes_count', 
        'replies_count', 'views_count', 'engagement_score', 'image_thumb'
    )
    list_filter = ('flag', PostTypeFilter, 'university', 'person_age', 'created_at', HasImageFilter)
    search_fields = ('content', 'first_name', 'author__email')
    raw_id_fields = ('author', 'parent', 'thread', 'reposted_from')
    date_hierarchy = 'created_at'
    list_select_related = ('author', 'university', 'parent', 'thread', 'reposted_from')
    inlines = [PostHashtagInline]
    readonly_fields = ('image_thumb', 'engagement_score')
    list_per_page = 50

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'author', 'university', 'parent', 'thread', 'reposted_from'
        ).prefetch_related('hashtags')

    @admin.display(description="Type")
    def post_type_display(self, obj):
        if obj.flag == 'red':
            return "🚩 Red Flag"
        elif obj.flag == 'green':
            return "💚 Green Flag"
        else:
            return "🫖 Tea"

    @admin.display(description="Content")
    def short_content(self, obj):
        txt = (obj.content or "").strip()
        return (txt[:60] + "…") if len(txt) > 60 else txt

    @admin.display(boolean=True, description="Image")
    def has_image(self, obj):
        return bool(getattr(obj, "image", None))

    @admin.display(description="Likes")
    def likes_count(self, obj):
        if obj.flag in ('red', 'green'):
            return "-"  # Flag posts don't have likes
        return obj.reactions.filter(reaction="up").count()

    @admin.display(description="Red Votes")
    def red_votes_count(self, obj):
        if obj.flag not in ('red', 'green'):
            return "-"  # Tea posts don't have flag votes
        return obj.flag_votes.filter(vote="red").count()

    @admin.display(description="Green Votes")
    def green_votes_count(self, obj):
        if obj.flag not in ('red', 'green'):
            return "-"  # Tea posts don't have flag votes
        return obj.flag_votes.filter(vote="green").count()

    @admin.display(description="Replies")
    def replies_count(self, obj):
        return obj.replies.count()

    @admin.display(description="Views")
    def views_count(self, obj):
        return SeenPost.objects.filter(post=obj).count()

    @admin.display(description="Score")
    def engagement_score(self, obj):
        if obj.flag in ('red', 'green'):
            green = self.green_votes_count(obj)
            red = self.red_votes_count(obj)
            return f"+{green - red}" if green >= red else f"{green - red}"
        else:
            return f"+{self.likes_count(obj)}"

    @admin.display(description="Preview")
    def image_thumb(self, obj):
        url = getattr(obj, "image", None)
        if not url:
            return "—"
        return format_html('<img src="{}" style="max-height:60px;border-radius:6px;" />', url)


@admin.register(PostFlagVote)
class PostFlagVoteAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'post', 'vote', 'created_at')
    list_filter = ('vote', 'created_at')
    search_fields = ('user__email', 'post__first_name', 'post__content')
    raw_id_fields = ('user', 'post')
    date_hierarchy = 'created_at'
    list_select_related = ('user', 'post')

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'post')


@admin.register(VoteReaction)
class VoteReactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'post', 'reaction', 'created_at')
    list_filter = ('reaction', 'created_at')
    search_fields = ('user__email', 'post__content')
    raw_id_fields = ('user', 'post')
    date_hierarchy = 'created_at'
    list_select_related = ('user', 'post')


@admin.register(Hashtag)
class HashtagAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'posts_count')
    search_fields = ('name',)
    list_per_page = 100

    @admin.display(description="Posts")
    def posts_count(self, obj):
        return obj.posts.count()


@admin.register(SeenPost)
class SeenPostAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'post', 'seen_at', 'day')
    raw_id_fields = ('user', 'post')
    list_filter = ('seen_at',)
    search_fields = ('user__email', 'post__content')
    date_hierarchy = 'seen_at'
    actions = [recompute_post_views_last_30]

    @admin.display(description="Day")
    def day(self, obj):
        return obj.seen_at.date() if obj.seen_at else None


@admin.register(SeenReply)
class SeenReplyAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'reply', 'seen_at', 'day')
    raw_id_fields = ('user', 'reply')
    list_filter = ('seen_at',)
    search_fields = ('user__email', 'reply__content')
    date_hierarchy = 'seen_at'

    @admin.display(description="Day")
    def day(self, obj):
        return obj.seen_at.date() if obj.seen_at else None


@admin.register(PostViewDaily)
class PostViewDailyAdmin(admin.ModelAdmin):
    list_display = ('id', 'post', 'day', 'unique_count')
    raw_id_fields = ('post',)
    date_hierarchy = 'day'
    list_filter = ('day',)
    ordering = ('-day',)
    search_fields = ('post__content', 'post__author__email')


@admin.register(ReplyViewDaily)
class ReplyViewDailyAdmin(admin.ModelAdmin):
    list_display = ('id', 'reply', 'day', 'unique_count')
    raw_id_fields = ('reply',)
    date_hierarchy = 'day'
    list_filter = ('day',)
    ordering = ('-day',)
    search_fields = ('reply__content', 'reply__author__email')


@admin.register(SavedPost)
class SavedPostAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'post', 'saved_at')
    raw_id_fields = ('user', 'post')
    list_filter = ('saved_at',)
    search_fields = ('user__email', 'post__content')
    date_hierarchy = 'saved_at'


@admin.register(ReportedPost)
class ReportedPostAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'post', 'reason', 'reported_at')
    search_fields = ('reason', 'comment', 'user__email', 'post__content')
    raw_id_fields = ('user', 'post')
    list_filter = ('reason', 'reported_at')
    date_hierarchy = 'reported_at'