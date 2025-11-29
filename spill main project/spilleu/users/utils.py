import random
import ssl
import smtplib
from email.message import EmailMessage
from django.conf import settings
from rest_framework.exceptions import APIException

# If using dotenv or other env loader, do it here (optional)
# from dotenv import load_dotenv
# load_dotenv()

EMAIL_SENDER = getattr(settings, 'DEFAULT_FROM_EMAIL', 'orderingpau@gmail.com')
EMAIL_PASSWORD = getattr(settings, 'EMAIL_HOST_PASSWORD', None)  # Should be set in settings.py

def generate_otp():
    """Generate a 6-digit OTP code as a string."""
    return str(random.randint(100000, 999999))

def send_otp_email(to_email, code, subject=None):
    """
    Send an OTP code to the user via HTML email.
    """
    subject = subject or "Your Ordering OTP Code"
    html = f"""
    <html><body style="font-family:Arial,sans-serif">
      <h2>Your One-Time Code</h2>
      <p>Use <strong>{code}</strong> to complete your request. It expires in 10 minutes.</p>
      <footer>© Ordering</footer>
    </body></html>
    """
    msg = EmailMessage()
    msg['From'] = EMAIL_SENDER
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.set_content("Your OTP code has been sent. View in HTML client.")
    msg.add_alternative(html, subtype='html')

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=context) as smtp:
            smtp.login(EMAIL_SENDER, EMAIL_PASSWORD)
            smtp.send_message(msg)
    except Exception as e:
        raise APIException(f"Failed to send OTP: {str(e)}")
# Add this to your existing utils.py file (wherever it is in your project):

import smtplib
from email.message import EmailMessage
import ssl
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def send_appeal_notification(user, verification_obj):
    """Send email notification when user appeals"""
    
    admin_email = "sbnuf.11@gmail.com"
    sender_email = settings.EMAIL_HOST_USER  
    sender_password = settings.EMAIL_HOST_PASSWORD
    
    subject = "🚨 NEW APPEAL REQUEST - Selfie Verification"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px;">
            <h1 style="color: #ff4757; text-align: center;">🚨 APPEAL REQUEST</h1>
            
            <h2 style="color: #333;">User Details:</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f8f9fa;">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Email:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{user.email}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Handle:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">@{user.handle or 'Not set'}</td>
                </tr>
                <tr style="background: #f8f9fa;">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">University:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{user.university.name if user.university else 'Not set'}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Attempts:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{verification_obj.retry_count}</td>
                </tr>
                <tr style="background: #f8f9fa;">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Last Confidence:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{verification_obj.confidence:.2f}%</td>
                </tr>
            </table>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #856404; margin: 0;">⚠️ Action Required</h3>
                <p style="margin: 10px 0 0; color: #856404;">
                    Search for "<strong>{user.email}</strong>" in admin panel to review their selfie and approve/reject appeal.
                </p>
            </div>
            
            <div style="text-align: center;">
                <a href="https://spilleu-esfdc6baccdvhjde.westeurope-01.azurewebsites.net/admin/users/selfieverification/" 
                   style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    🔧 Open Admin Panel
                </a>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=context) as smtp:
            smtp.login(sender_email, sender_password)
            
            em = EmailMessage()
            em['From'] = sender_email
            em['To'] = admin_email
            em['Subject'] = subject
            em.set_content("Appeal notification - please view in HTML.", subtype='plain')
            em.add_alternative(html_body, subtype='html')
            
            smtp.send_message(em)
            logger.info(f"✅ Appeal notification sent for user {user.email}")
            return True
            
    except Exception as e:
        logger.error(f"❌ Failed to send appeal email: {e}")
        return False