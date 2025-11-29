# notifications/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone

# Import models from the correct apps
from posts.models import Post, VoteReaction, PostFlagVote
from .models import Notification, HashtagFollow, UserFollow
from .services import PushNotificationService

@receiver(post_save, sender=Post)
def handle_new_reply_notification(sender, instance: Post, created, **kwargs):
    """
    Create in-app notification and send push notification when someone replies to a post
    """
    if not created or not instance.parent_id:
        return
    
    try:
        parent_post = Post.objects.select_related('author').get(pk=instance.parent_id)
        
        # Don't notify if user is replying to their own post
        if parent_post.author != instance.author:
            # Create in-app notification
            Notification.objects.create(
                user=parent_post.author,
                kind=Notification.COMMENT_ON_MY_POST,
                post=parent_post,
                actor=instance.author
            )
            
            # Determine push notification content based on post type
            if parent_post.flag == 'red':
                title = "New reply to your red flag!"
                body = "Someone replied to your red flag post"
            elif parent_post.flag == 'green':
                title = "New reply to your green flag!"
                body = "Someone replied to your green flag post"
            else:
                title = "New reply to your tea!"
                body = "Someone replied to your post"
            
            # Send push notification
            PushNotificationService.send_push_notification(
                user=parent_post.author,
                title=title,
                body=body,
                data={
                    'type': 'reply',
                    'postId': str(parent_post.id),
                    'replyId': str(instance.id),
                    'userId': str(instance.author.id) if instance.author else None,
                    'flag': parent_post.flag or 'tea'
                }
            )
            
    except (Post.DoesNotExist, Exception) as e:
        print(f"Error handling reply notification: {e}")

@receiver(post_save, sender=VoteReaction)
def handle_like_notification(sender, instance: VoteReaction, created, **kwargs):
    """
    Create in-app notification and send push notification when someone likes a post
    """
    if not created or instance.reaction != 'up':
        return
    
    try:
        post = Post.objects.select_related('author').get(pk=instance.post_id)
        
        # Don't notify if user liked their own post
        if post.author != instance.user:
            # Create in-app notification
            Notification.objects.create(
                user=post.author,
                kind=Notification.LIKE_ON_MY_POST,
                post=post,
                actor=instance.user
            )
            
            # Determine push notification content based on post type
            if post.parent_id:  # This is a reply/comment
                title = "Someone liked your reply!"
                body = "Your reply got a like"
            elif post.flag == 'red':
                title = "Someone liked your red flag!"
                body = "Your red flag post got a like"
            elif post.flag == 'green':
                title = "Someone liked your green flag!"
                body = "Your green flag post got a like"
            else:
                title = "Someone liked your tea!"
                body = "Your post got a like"
            
            # Send push notification
            PushNotificationService.send_push_notification(
                user=post.author,
                title=title,
                body=body,
                data={
                    'type': 'like',
                    'postId': str(post.id),
                    'userId': str(instance.user.id),
                    'flag': post.flag or 'tea',
                    'isReply': bool(post.parent_id)
                }
            )
            
    except (Post.DoesNotExist, Exception) as e:
        print(f"Error handling like notification: {e}")

@receiver(post_save, sender=PostFlagVote)
def handle_flag_vote_notification(sender, instance: PostFlagVote, created, **kwargs):
    """
    Create in-app notification and send push notification when someone votes on a flagged post
    """
    if not created:
        return
    
    try:
        post = Post.objects.select_related('author').get(pk=instance.post_id)
        
        # Don't notify if user voted on their own post
        if post.author != instance.user:
            # Create in-app notification
            Notification.objects.create(
                user=post.author,
                kind=Notification.FLAG_VOTE_ON_MY_POST,
                post=post,
                actor=instance.user
            )
            
            # Determine push notification content
            if instance.vote == 'red':
                title = "Red flag vote!"
                body = "Someone thinks your post is a red flag"
            else:  # green vote
                title = "Green flag vote!"
                body = "Someone thinks your post is a green flag"
            
            # Send push notification
            PushNotificationService.send_push_notification(
                user=post.author,
                title=title,
                body=body,
                data={
                    'type': 'flag_vote',
                    'postId': str(post.id),
                    'userId': str(instance.user.id),
                    'vote': instance.vote,
                    'flag': post.flag
                }
            )
            
    except (Post.DoesNotExist, Exception) as e:
        print(f"Error handling flag vote notification: {e}")

@receiver(post_save, sender=Post)
def handle_new_post_from_followed_user(sender, instance: Post, created, **kwargs):
    """
    Notify followers when a user they follow creates a new post
    """
    if not created or instance.parent_id:  # Only for top-level posts
        return
    
    try:
        # Get all users who follow this post's author
        followers = UserFollow.objects.filter(followee=instance.author).select_related('follower')
        
        for follow in followers:
            # Create in-app notification for each follower
            Notification.objects.create(
                user=follow.follower,
                kind=Notification.NEW_POST_USER,
                post=instance,
                actor=instance.author
            )
            
            # Send push notification
            if instance.flag == 'red':
                title = f"New red flag from {instance.first_name}"
                body = "Someone you follow shared a red flag"
            elif instance.flag == 'green':
                title = f"New green flag from {instance.first_name}"
                body = "Someone you follow shared a green flag"
            else:
                title = f"New tea from {instance.first_name}"
                body = "Someone you follow shared new tea"
            
            PushNotificationService.send_push_notification(
                user=follow.follower,
                title=title,
                body=body,
                data={
                    'type': 'new_post_user',
                    'postId': str(instance.id),
                    'userId': str(instance.author.id),
                    'flag': instance.flag or 'tea'
                }
            )
            
    except Exception as e:
        print(f"Error handling new post notification for followers: {e}")

@receiver(post_save, sender=Post)
def handle_new_post_hashtag_followers(sender, instance: Post, created, **kwargs):
    """
    Notify hashtag followers when a post is created with their followed hashtags
    """
    if not created or instance.parent_id:  # Only for top-level posts
        return
    
    try:
        # Get all hashtags in this post
        hashtags = instance.hashtags.all()
        if not hashtags:
            return
        
        # Find users who follow any of these hashtags
        hashtag_followers = HashtagFollow.objects.filter(
            hashtag__in=hashtags
        ).select_related('user', 'hashtag').distinct()
        
        for follow in hashtag_followers:
            # Don't notify the post author
            if follow.user == instance.author:
                continue
                
            # Create in-app notification
            Notification.objects.create(
                user=follow.user,
                kind=Notification.NEW_POST_HASHTAG,
                post=instance,
                actor=instance.author
            )
            
            # Send push notification
            hashtag_name = follow.hashtag.name
            if instance.flag == 'red':
                title = f"New red flag in #{hashtag_name}"
                body = f"New red flag post in hashtag you follow"
            elif instance.flag == 'green':
                title = f"New green flag in #{hashtag_name}"
                body = f"New green flag post in hashtag you follow"
            else:
                title = f"New tea in #{hashtag_name}"
                body = f"New post in hashtag you follow"
            
            PushNotificationService.send_push_notification(
                user=follow.user,
                title=title,
                body=body,
                data={
                    'type': 'new_post_hashtag',
                    'postId': str(instance.id),
                    'hashtag': hashtag_name,
                    'userId': str(instance.author.id),
                    'flag': instance.flag or 'tea'
                }
            )
            
    except Exception as e:
        print(f"Error handling hashtag followers notification: {e}")

@receiver(post_save, sender=Post)
def handle_new_post_university_followers(sender, instance: Post, created, **kwargs):
    """
    Notify university followers when a post is created in their followed university
    """
    if not created or instance.parent_id:  # Only for top-level posts
        return
    
    try:
        from users.models import UniversityFollow
        
        # Get users who follow this university
        uni_followers = UniversityFollow.objects.filter(
            university=instance.university
        ).select_related('user')
        
        for follow in uni_followers:
            # Don't notify the post author or users from the same university
            if follow.user == instance.author or follow.user.university == instance.university:
                continue
                
            # Create in-app notification
            Notification.objects.create(
                user=follow.user,
                kind=Notification.NEW_POST_UNI,
                post=instance,
                actor=instance.author
            )
            
            # Send push notification
            uni_name = instance.university.name if instance.university else "University"
            if instance.flag == 'red':
                title = f"New red flag at {uni_name}"
                body = f"New red flag from university you follow"
            elif instance.flag == 'green':
                title = f"New green flag at {uni_name}"
                body = f"New green flag from university you follow"
            else:
                title = f"New tea at {uni_name}"
                body = f"New post from university you follow"
            
            PushNotificationService.send_push_notification(
                user=follow.user,
                title=title,
                body=body,
                data={
                    'type': 'new_post_uni',
                    'postId': str(instance.id),
                    'universityId': str(instance.university.id) if instance.university else None,
                    'userId': str(instance.author.id),
                    'flag': instance.flag or 'tea'
                }
            )
            
    except Exception as e:
        print(f"Error handling university followers notification: {e}")

@receiver(post_save, sender=UserFollow)
def handle_new_follower_notification(sender, instance: UserFollow, created, **kwargs):
    """
    Notify user when someone starts following them
    """
    if not created:
        return
    
    try:
        # Create in-app notification for the person being followed
        Notification.objects.create(
            user=instance.followee,
            kind="new_follower",  # You might want to add this to your KIND_CHOICES
            post=None,
            actor=instance.follower
        )
        
        # Send push notification
        PushNotificationService.send_push_notification(
            user=instance.followee,
            title="New follower!",
            body="Someone started following you",
            data={
                'type': 'new_follower',
                'userId': str(instance.follower.id)
            }
        )
        
    except Exception as e:
        print(f"Error handling new follower notification: {e}")

# Clean up notifications when objects are deleted
@receiver(post_delete, sender=Post)
def cleanup_post_notifications(sender, instance: Post, **kwargs):
    """
    Clean up notifications related to a deleted post
    """
    try:
        Notification.objects.filter(post=instance).delete()
    except Exception as e:
        print(f"Error cleaning up post notifications: {e}")

@receiver(post_delete, sender=VoteReaction)
def cleanup_like_notifications(sender, instance: VoteReaction, **kwargs):
    """
    Remove like notifications when a like is removed
    """
    try:
        Notification.objects.filter(
            kind=Notification.LIKE_ON_MY_POST,
            post_id=instance.post_id,
            actor=instance.user
        ).delete()
    except Exception as e:
        print(f"Error cleaning up like notifications: {e}")

@receiver(post_delete, sender=PostFlagVote)
def cleanup_flag_vote_notifications(sender, instance: PostFlagVote, **kwargs):
    """
    Remove flag vote notifications when a vote is removed
    """
    try:
        Notification.objects.filter(
            kind=Notification.FLAG_VOTE_ON_MY_POST,
            post_id=instance.post_id,
            actor=instance.user
        ).delete()
    except Exception as e:
        print(f"Error cleaning up flag vote notifications: {e}")

@receiver(post_delete, sender=UserFollow)
def cleanup_follow_notifications(sender, instance: UserFollow, **kwargs):
    """
    Remove follow notifications when someone unfollows
    """
    try:
        Notification.objects.filter(
            kind="new_follower",
            user=instance.followee,
            actor=instance.follower
        ).delete()
    except Exception as e:
        print(f"Error cleaning up follow notifications: {e}")