# notifications/services.py - Enhanced push notification service

from exponent_server_sdk import (
    DeviceNotRegisteredError,
    PushClient,
    PushMessage,
    PushServerError,
    PushTicketError,
)
from requests.exceptions import ConnectionError, HTTPError

from .models import PushToken, NotificationLog
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class PushNotificationService:
    @staticmethod
    def send_push_notification(user, title, body, data=None):
        """Send push notification to a specific user"""
        print(f"🔔 Attempting to send push notification to user {user.id}: {title}")
        
        tokens = PushToken.objects.filter(user=user, is_active=True)
        
        if not tokens.exists():
            print(f"⚠️ No active push tokens found for user {user.id}")
            logger.warning(f"No active push tokens found for user {user.id}")
            return False
        
        print(f"📱 Found {tokens.count()} active push tokens for user {user.id}")
        success_count = 0
        
        for token_obj in tokens:
            try:
                print(f"📤 Sending to token: {token_obj.token[:20]}...")
                
                # Create notification log
                notification_log = NotificationLog.objects.create(
                    user=user,
                    title=title,
                    body=body,
                    data=data or {}
                )
                
                # Send notification
                response = PushClient().publish(
                    PushMessage(
                        to=token_obj.token,
                        title=title,
                        body=body,
                        data=data or {},
                        sound='default',
                        priority='normal',
                        channel_id='default',
                    )
                )
                
                print(f"✅ Push notification sent successfully to user {user.id}")
                
                # Update log with ticket ID
                if hasattr(response, 'id'):
                    notification_log.expo_ticket_id = response.id
                    print(f"📋 Expo ticket ID: {response.id}")
                
                notification_log.status = 'sent'
                notification_log.sent_at = timezone.now()
                notification_log.save()
                
                success_count += 1
                
            except DeviceNotRegisteredError as exc:
                # Token is no longer valid, deactivate it
                print(f"❌ Device not registered, deactivating token: {exc}")
                token_obj.is_active = False
                token_obj.save()
                
                notification_log.status = 'failed'
                notification_log.error_message = f"Device not registered: {str(exc)}"
                notification_log.save()
                
            except PushServerError as exc:
                # Handle server errors
                print(f"❌ Push server error: {exc}")
                logger.error(f"Push server error: {exc}")
                notification_log.status = 'failed'
                notification_log.error_message = str(exc)
                notification_log.save()
                
            except (ConnectionError, HTTPError) as exc:
                # Handle connection errors
                print(f"❌ Connection error: {exc}")
                logger.error(f"Connection error: {exc}")
                notification_log.status = 'failed'
                notification_log.error_message = str(exc)
                notification_log.save()
                
            except Exception as exc:
                # Handle any other errors
                print(f"❌ Unexpected error sending push notification: {exc}")
                logger.error(f"Unexpected error sending push notification: {exc}")
                notification_log.status = 'failed'
                notification_log.error_message = str(exc)
                notification_log.save()
        
        print(f"📊 Push notification summary: {success_count}/{tokens.count()} sent successfully")
        return success_count > 0
    
    @staticmethod
    def send_test_notification(user):
        """Send a test notification to verify the push setup"""
        return PushNotificationService.send_push_notification(
            user=user,
            title="🧪 Test Notification",
            body="Your push notifications are working correctly!",
            data={
                'type': 'test',
                'timestamp': timezone.now().isoformat(),
            }
        )