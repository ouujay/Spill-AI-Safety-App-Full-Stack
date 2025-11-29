# notifications/signals.py - Complete and updated version
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
            print(f"📩 Creating reply notification: Reply {instance.id} to post {parent_post.id}")
            
            # Create in-app notification
            notification = Notification.objects.create(
                user=parent_post.author,
                kind=Notification.COMMENT_ON_MY_POST,
                post=parent_post,
                actor=instance.author
            )
            
            print(f"✅ Created in-app notification {notification.id} for user {parent_post.author.id}")
            
            # Determine push notification content based on post type
            if parent_post.flag == 'red':
                title = "New reply to your red flag!"
                body = f"Someone replied to your red flag about {parent_post.first_name}"
            elif parent_post.flag == 'green':
                title = "New reply to your green flag!"
                body = f"Someone replied to your green flag about {parent_post.first_name}"
            else:
                title = "New reply to your tea!"
                body = "Someone replied to your post"
            
            # Send push notification
            try:
                success = PushNotificationService.send_push_notification(
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
                print(f"🔔 Push notification {'sent' if success else 'failed'} for reply notification")
            except Exception as push_error:
                print(f"❌ Failed to send push notification for reply: {push_error}")
            
    except Post.DoesNotExist:
        print(f"❌ Parent post {instance.parent_id} not found for reply {instance.id}")
    except Exception as e:
        print(f"❌ Error handling reply notification: {e}")

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
            print(f"👍 Creating like notification: User {instance.user.id} liked post {post.id}")
            
            # Create in-app notification
            notification = Notification.objects.create(
                user=post.author,
                kind=Notification.LIKE_ON_MY_POST,
                post=post,
                actor=instance.user
            )
            
            print(f"✅ Created in-app like notification {notification.id} for user {post.author.id}")
            
            # Determine push notification content based on post type
            if post.parent_id:  # This is a reply/comment
                title = "Someone liked your reply!"
                body = "Your reply got a like"
            elif post.flag == 'red':
                title = "Someone liked your red flag!"
                body = f"Your red flag about {post.first_name} got a like"
            elif post.flag == 'green':
                title = "Someone liked your green flag!"
                body = f"Your green flag about {post.first_name} got a like"
            else:
                title = "Someone liked your tea!"
                body = "Your post got a like"
            
            # Send push notification
            try:
                success = PushNotificationService.send_push_notification(
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
                print(f"🔔 Push notification {'sent' if success else 'failed'} for like notification")
            except Exception as push_error:
                print(f"❌ Failed to send push notification for like: {push_error}")
            
    except Post.DoesNotExist:
        print(f"❌ Post {instance.post_id} not found for like from user {instance.user.id}")
    except Exception as e:
        print(f"❌ Error handling like notification: {e}")

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
            print(f"🚩 Creating flag vote notification: User {instance.user.id} voted {instance.vote} on post {post.id}")
            
            # Create in-app notification
            notification = Notification.objects.create(
                user=post.author,
                kind=Notification.FLAG_VOTE_ON_MY_POST,
                post=post,
                actor=instance.user
            )
            
            print(f"✅ Created in-app flag vote notification {notification.id} for user {post.author.id}")
            
            # Determine push notification content
            if instance.vote == 'red':
                title = "🔴 Red flag vote!"
                body = f"Someone thinks your post about {post.first_name} is a red flag"
            else:  # green vote
                title = "🟢 Green flag vote!"
                body = f"Someone thinks your post about {post.first_name} is a green flag"
            
            # Send push notification
            try:
                success = PushNotificationService.send_push_notification(
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
                print(f"🔔 Push notification {'sent' if success else 'failed'} for flag vote notification")
            except Exception as push_error:
                print(f"❌ Failed to send push notification for flag vote: {push_error}")
            
    except Post.DoesNotExist:
        print(f"❌ Post {instance.post_id} not found for flag vote from user {instance.user.id}")
    except Exception as e:
        print(f"❌ Error handling flag vote notification: {e}")

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
        
        if not followers.exists():
            return
            
        print(f"📢 New post {instance.id} from followed user {instance.author.id}, notifying {followers.count()} followers")
        
        for follow in followers:
            try:
                # Create in-app notification for each follower
                notification = Notification.objects.create(
                    user=follow.follower,
                    kind=Notification.NEW_POST_USER,
                    post=instance,
                    actor=instance.author
                )
                
                print(f"✅ Created follower notification {notification.id} for user {follow.follower.id}")
                
                # Send push notification
                if instance.flag == 'red':
                    title = f"🔴 New red flag from {instance.first_name}"
                    body = "Someone you follow shared a red flag"
                elif instance.flag == 'green':
                    title = f"🟢 New green flag from {instance.first_name}"
                    body = "Someone you follow shared a green flag"
                else:
                    title = f"☕ New tea from {instance.first_name}"
                    body = "Someone you follow shared new tea"
                
                try:
                    success = PushNotificationService.send_push_notification(
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
                    print(f"🔔 Follower push notification {'sent' if success else 'failed'} to user {follow.follower.id}")
                except Exception as push_error:
                    print(f"❌ Failed to send follower push notification: {push_error}")
                    
            except Exception as follower_error:
                print(f"❌ Error notifying follower {follow.follower.id}: {follower_error}")
            
    except Exception as e:
        print(f"❌ Error handling new post notification for followers: {e}")

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
        if not hashtags.exists():
            return
        
        print(f"🏷️ New post {instance.id} with hashtags, checking followers")
        
        # Find users who follow any of these hashtags
        hashtag_followers = HashtagFollow.objects.filter(
            hashtag__in=hashtags
        ).select_related('user', 'hashtag').distinct()
        
        notified_users = set()  # Prevent duplicate notifications to same user
        
        for follow in hashtag_followers:
            # Don't notify the post author or if already notified
            if follow.user == instance.author or follow.user.id in notified_users:
                continue
            
            try:
                # Create in-app notification
                notification = Notification.objects.create(
                    user=follow.user,
                    kind=Notification.NEW_POST_HASHTAG,
                    post=instance,
                    actor=instance.author
                )
                
                notified_users.add(follow.user.id)
                print(f"✅ Created hashtag notification {notification.id} for user {follow.user.id}")
                
                # Send push notification
                hashtag_name = follow.hashtag.name
                if instance.flag == 'red':
                    title = f"🔴 New red flag in #{hashtag_name}"
                    body = f"New red flag post in hashtag you follow"
                elif instance.flag == 'green':
                    title = f"🟢 New green flag in #{hashtag_name}"
                    body = f"New green flag post in hashtag you follow"
                else:
                    title = f"☕ New tea in #{hashtag_name}"
                    body = f"New post in hashtag you follow"
                
                try:
                    success = PushNotificationService.send_push_notification(
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
                    print(f"🔔 Hashtag push notification {'sent' if success else 'failed'} to user {follow.user.id}")
                except Exception as push_error:
                    print(f"❌ Failed to send hashtag push notification: {push_error}")
                    
            except Exception as hashtag_error:
                print(f"❌ Error notifying hashtag follower {follow.user.id}: {hashtag_error}")
        
        print(f"📊 Hashtag notifications: Notified {len(notified_users)} unique users")
            
    except Exception as e:
        print(f"❌ Error handling hashtag followers notification: {e}")

@receiver(post_save, sender=Post)
def handle_new_post_university_followers(sender, instance: Post, created, **kwargs):
    """
    Notify university followers when a post is created in their followed university
    """
    if not created or instance.parent_id or not instance.university:  # Only for top-level posts with university
        return
    
    try:
        from users.models import UniversityFollow
        
        # Get users who follow this university
        uni_followers = UniversityFollow.objects.filter(
            university=instance.university
        ).select_related('user')
        
        if not uni_followers.exists():
            return
            
        print(f"🏫 New post {instance.id} at {instance.university.name}, checking followers")
        
        notified_count = 0
        for follow in uni_followers:
            # Don't notify the post author or users from the same university
            if follow.user == instance.author or follow.user.university == instance.university:
                continue
            
            try:
                # Create in-app notification
                notification = Notification.objects.create(
                    user=follow.user,
                    kind=Notification.NEW_POST_UNI,
                    post=instance,
                    actor=instance.author
                )
                
                notified_count += 1
                print(f"✅ Created university notification {notification.id} for user {follow.user.id}")
                
                # Send push notification
                uni_name = instance.university.name
                if instance.flag == 'red':
                    title = f"🔴 New red flag at {uni_name}"
                    body = f"New red flag from university you follow"
                elif instance.flag == 'green':
                    title = f"🟢 New green flag at {uni_name}"
                    body = f"New green flag from university you follow"
                else:
                    title = f"☕ New tea at {uni_name}"
                    body = f"New post from university you follow"
                
                try:
                    success = PushNotificationService.send_push_notification(
                        user=follow.user,
                        title=title,
                        body=body,
                        data={
                            'type': 'new_post_uni',
                            'postId': str(instance.id),
                            'universityId': str(instance.university.id),
                            'userId': str(instance.author.id),
                            'flag': instance.flag or 'tea'
                        }
                    )
                    print(f"🔔 University push notification {'sent' if success else 'failed'} to user {follow.user.id}")
                except Exception as push_error:
                    print(f"❌ Failed to send university push notification: {push_error}")
                    
            except Exception as uni_error:
                print(f"❌ Error notifying university follower {follow.user.id}: {uni_error}")
        
        print(f"📊 University notifications: Notified {notified_count} users")
            
    except Exception as e:
        print(f"❌ Error handling university followers notification: {e}")

@receiver(post_save, sender=UserFollow)
def handle_new_follower_notification(sender, instance: UserFollow, created, **kwargs):
    """
    Notify user when someone starts following them
    """
    if not created:
        return
    
    try:
        print(f"👥 New follower: User {instance.follower.id} followed user {instance.followee.id}")
        
        # Create in-app notification for the person being followed
        # Note: You might need to add "new_follower" to your Notification.KIND_CHOICES
        notification = Notification.objects.create(
            user=instance.followee,
            kind="new_follower",  # Make sure this exists in your KIND_CHOICES
            post=None,
            actor=instance.follower
        )
        
        print(f"✅ Created new follower notification {notification.id}")
        
        # Send push notification
        try:
            success = PushNotificationService.send_push_notification(
                user=instance.followee,
                title="👥 New follower!",
                body=f"{instance.follower.handle or 'Someone'} started following you",
                data={
                    'type': 'new_follower',
                    'userId': str(instance.follower.id)
                }
            )
            print(f"🔔 New follower push notification {'sent' if success else 'failed'}")
        except Exception as push_error:
            print(f"❌ Failed to send new follower push notification: {push_error}")
        
    except Exception as e:
        print(f"❌ Error handling new follower notification: {e}")

# Cleanup signal handlers
@receiver(post_delete, sender=Post)
def cleanup_post_notifications(sender, instance: Post, **kwargs):
    """
    Clean up notifications related to a deleted post
    """
    try:
        deleted_count = Notification.objects.filter(post=instance).delete()[0]
        print(f"🗑️ Cleaned up {deleted_count} notifications for deleted post {instance.id}")
    except Exception as e:
        print(f"❌ Error cleaning up post notifications: {e}")

@receiver(post_delete, sender=VoteReaction)
def cleanup_like_notifications(sender, instance: VoteReaction, **kwargs):
    """
    Remove like notifications when a like is removed
    """
    try:
        deleted_count = Notification.objects.filter(
            kind=Notification.LIKE_ON_MY_POST,
            post_id=instance.post_id,
            actor=instance.user
        ).delete()[0]
        print(f"🗑️ Cleaned up {deleted_count} like notifications for post {instance.post_id}")
    except Exception as e:
        print(f"❌ Error cleaning up like notifications: {e}")

@receiver(post_delete, sender=PostFlagVote)
def cleanup_flag_vote_notifications(sender, instance: PostFlagVote, **kwargs):
    """
    Remove flag vote notifications when a vote is removed
    """
    try:
        deleted_count = Notification.objects.filter(
            kind=Notification.FLAG_VOTE_ON_MY_POST,
            post_id=instance.post_id,
            actor=instance.user
        ).delete()[0]
        print(f"🗑️ Cleaned up {deleted_count} flag vote notifications for post {instance.post_id}")
    except Exception as e:
        print(f"❌ Error cleaning up flag vote notifications: {e}")

# Note: UserFollow cleanup not needed since new follower notifications aren't implemented

# Additional debugging signal to track all post creations
@receiver(post_save, sender=Post)
def debug_post_creation(sender, instance: Post, created, **kwargs):
    """
    Debug signal to log all post creations for troubleshooting
    """
    if created:
        post_type = "reply" if instance.parent_id else "post"
        flag_info = f" ({instance.flag} flag)" if instance.flag else " (tea)"
        print(f"🆕 New {post_type} created: ID={instance.id}, Author={instance.author.id}{flag_info}, University={instance.university.name if instance.university else 'None'}")
        
        if instance.hashtags.exists():
            hashtag_names = [f"#{h.name}" for h in instance.hashtags.all()]
            print(f"🏷️ Post {instance.id} hashtags: {', '.join(hashtag_names)}")
        
        # Check for potential notification triggers
        if instance.parent_id:
            print(f"📝 Reply created - will check for parent notification")
        else:
            follower_count = UserFollow.objects.filter(followee=instance.author).count()
            print(f"📢 Top-level post created - author has {follower_count} followers")