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
