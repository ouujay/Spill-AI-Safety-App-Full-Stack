from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import F
from django.utils import timezone

from .models import SeenPost, SeenReply, PostViewDaily, ReplyViewDaily

@receiver(post_save, sender=SeenPost)
def bump_post_daily_views(sender, instance: SeenPost, created, **kwargs):
    if not created:
        return
    day = instance.seen_at.date() if hasattr(instance, "seen_at") and instance.seen_at else timezone.now().date()
    obj, _ = PostViewDaily.objects.get_or_create(post=instance.post, day=day, defaults={"unique_count": 0})
    PostViewDaily.objects.filter(pk=obj.pk).update(unique_count=F("unique_count") + 1)

@receiver(post_save, sender=SeenReply)
def bump_reply_daily_views(sender, instance: SeenReply, created, **kwargs):
    if not created:
        return
    day = instance.seen_at.date() if hasattr(instance, "seen_at") and instance.seen_at else timezone.now().date()
    obj, _ = ReplyViewDaily.objects.get_or_create(reply=instance.reply, day=day, defaults={"unique_count": 0})
    ReplyViewDaily.objects.filter(pk=obj.pk).update(unique_count=F("unique_count") + 1)

    # posts/signals.py
from django.db.models.signals import post_save, post_delete, pre_save
from django.db.models import F
from django.dispatch import receiver
from django.utils.functional import cached_property

from .models import Post, VoteReaction  # adjust import paths if needed

# ---------- Replies counter on parent ----------

@receiver(post_save, sender=Post)
def bump_parent_replies_count_on_create(sender, instance: Post, created, **kwargs):
    """
    When a new Post with a parent (i.e., a reply) is created, bump parent's replies_count.
    """
    if created and instance.parent_id:
        Post.objects.filter(pk=instance.parent_id).update(replies_count=F('replies_count') + 1)


@receiver(post_delete, sender=Post)
def decrease_parent_replies_count_on_delete(sender, instance: Post, **kwargs):
    """
    When a reply is hard-deleted, decrement the parent's replies_count.
    (If you only soft-delete, skip decrement or gate on instance.is_deleted)
    """
    if instance.parent_id:
        Post.objects.filter(pk=instance.parent_id, replies_count__gt=0).update(
            replies_count=F('replies_count') - 1
        )

# ---------- Like counter on Post (denormalized) ----------

def _is_like(reaction_value: str) -> bool:
    return reaction_value == 'up'  # treat 'up' as a like; change if your enum differs

@receiver(pre_save, sender=VoteReaction)
def cache_old_reaction_on_update(sender, instance: VoteReaction, **kwargs):
    """
    Before saving, cache the previous reaction if this is an update.
    Useful to decide whether to increment/decrement like_count.
    """
    if instance.pk:
        try:
            old = VoteReaction.objects.only('reaction', 'post_id').get(pk=instance.pk)
            instance._old_reaction = old.reaction
            instance._old_post_id = old.post_id
        except VoteReaction.DoesNotExist:
            instance._old_reaction = None
            instance._old_post_id = None
    else:
        instance._old_reaction = None
        instance._old_post_id = None

@receiver(post_save, sender=VoteReaction)
def maintain_like_count_on_save(sender, instance: VoteReaction, created, **kwargs):
    """
    Keep Post.like_count in sync.
    - If created and it's a like: +1
    - If updated: handle like -> unlike, unlike -> like, move between posts, etc.
    """
    # Case 1: brand new reaction
    if created:
        if _is_like(instance.reaction):
            Post.objects.filter(pk=instance.post_id).update(like_count=F('like_count') + 1)
        return

    # Case 2: update
    prev = getattr(instance, '_old_reaction', None)
    prev_post_id = getattr(instance, '_old_post_id', None)

    now_is_like = _is_like(instance.reaction)
    prev_was_like = _is_like(prev) if prev is not None else False

    # If the target post changed (rare), adjust both
    if prev_post_id and prev_post_id != instance.post_id:
        if prev_was_like:
            Post.objects.filter(pk=prev_post_id, like_count__gt=0).update(like_count=F('like_count') - 1)
        if now_is_like:
            Post.objects.filter(pk=instance.post_id).update(like_count=F('like_count') + 1)
        return

    # Same post, reaction value changed
    if not prev_was_like and now_is_like:
        Post.objects.filter(pk=instance.post_id).update(like_count=F('like_count') + 1)
    elif prev_was_like and not now_is_like:
        Post.objects.filter(pk=instance.post_id, like_count__gt=0).update(like_count=F('like_count') - 1)

@receiver(post_delete, sender=VoteReaction)
def maintain_like_count_on_delete(sender, instance: VoteReaction, **kwargs):
    """
    When a like reaction is deleted, decrement like_count.
    """
    if _is_like(instance.reaction):
        Post.objects.filter(pk=instance.post_id, like_count__gt=0).update(like_count=F('like_count') - 1)


