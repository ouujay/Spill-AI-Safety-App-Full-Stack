# notifications/services.py
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
        tokens = PushToken.objects.filter(user=user, is_active=True)
        
        if not tokens.exists():
            logger.warning(f"No active push tokens found for user {user.id}")
            return False
        
        success_count = 0
        
        for token_obj in tokens:
            try:
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
                    )
                )
                
                # Update log with ticket ID
                if hasattr(response, 'id'):
                    notification_log.expo_ticket_id = response.id
                
                notification_log.status = 'sent'
                notification_log.sent_at = timezone.now()
                notification_log.save()
                
                success_count += 1
                
            except PushServerError as exc:
                # Handle server errors
                logger.error(f"Push server error: {exc}")
                notification_log.status = 'failed'
                notification_log.error_message = str(exc)
                notification_log.save()
                
            except (ConnectionError, HTTPError) as exc:
                # Handle connection errors
                logger.error(f"Connection error: {exc}")
                notification_log.status = 'failed'
                notification_log.error_message = str(exc)
                notification_log.save()
                
            except DeviceNotRegisteredError:
                # Token is invalid, deactivate it
                logger.warning(f"Invalid token for user {user.id}, deactivating")
                token_obj.is_active = False
                token_obj.save()
                
                notification_log.status = 'failed'
                notification_log.error_message = 'Device not registered'
                notification_log.save()
            except Exception as e:
                # Catch any other errors
                logger.error(f"Unexpected error sending notification: {e}")
                notification_log.status = 'failed'
                notification_log.error_message = str(e)
                notification_log.save()
        
        return success_count > 0
    
    @staticmethod
    def send_bulk_notification(users, title, body, data=None):
        """Send notifications to multiple users"""
        success_count = 0
        
        for user in users:
            if PushNotificationService.send_push_notification(user, title, body, data):
                success_count += 1
        
        return success_count