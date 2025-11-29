"""
Django settings for core project – API-only, Azure-ready with Supavisor optimization
"""
import os
from pathlib import Path
from datetime import timedelta

import cloudinary
from decouple import config
import dj_database_url

# --- Paths ---
BASE_DIR = Path(__file__).resolve().parent.parent

# --- Core security ---
SECRET_KEY = config('SECRET_KEY', default='django-insecure--7)peiadam!d8x*m5ia1^cj8g19!hx21gweka1(-e7v7)h6j4b')
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = [
    'spilleu-esfdc6baccdvhjde.westeurope-01.azurewebsites.net',
    '127.0.0.1',
    'localhost',
    '0.0.0.0',
    '10.181.95.15',  # Local network IP for development
]

# --- CSRF protection for Azure ---
CSRF_TRUSTED_ORIGINS = [
    'https://spilleu-esfdc6baccdvhjde.westeurope-01.azurewebsites.net',
]

# --- CORS Configuration (Production) ---
CORS_ALLOWED_ORIGINS = [
    # Production URLs only
    "https://spilleu-esfdc6baccdvhjde.westeurope-01.azurewebsites.net",
]

# Disable CORS_ALLOW_ALL_ORIGINS in production
CORS_ALLOW_ALL_ORIGINS = False

# Additional CORS settings for production
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_HEADERS = True

# --- Apps ---
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'whitenoise.runserver_nostatic',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'cloudinary',
    'cloudinary_storage',
    
    # Local apps
    'users',
    'posts',
    'notifications',
        'ads',

]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# --- Cloudinary (Media) ---
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': config('CLOUDINARY_CLOUD_NAME', default=''),
    'API_KEY': config('CLOUDINARY_API_KEY', default=''),
    'API_SECRET': config('CLOUDINARY_API_SECRET', default=''),
    'SECURE': True,
}

cloudinary.config(
    cloud_name=CLOUDINARY_STORAGE['CLOUD_NAME'],
    api_key=CLOUDINARY_STORAGE['API_KEY'],
    api_secret=CLOUDINARY_STORAGE['API_SECRET'],
    secure=True
)

DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

# --- Database (Production) ---
DATABASE_CONFIG = dj_database_url.config(
    default=config('DATABASE_URL', default='sqlite:///db.sqlite3'),
    conn_max_age=600,
    conn_health_checks=True,
)

DATABASES = {
    'default': {
        **DATABASE_CONFIG,
        'ATOMIC_REQUESTS': True,
        'OPTIONS': {
            **DATABASE_CONFIG.get('OPTIONS', {}),
            'sslmode': 'require',
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000',
        } if 'postgres' in DATABASE_CONFIG.get('ENGINE', '') else DATABASE_CONFIG.get('OPTIONS', {}),
    }
}

AUTH_USER_MODEL = 'users.User'

# --- Password validation ---
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# --- I18N ---
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# --- Static files (Production) ---
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

STATICFILES_FINDERS = [
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
]

WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = False  # Disabled in production
WHITENOISE_SKIP_COMPRESS_EXTENSIONS = ['map', 'woff2']

# --- Media (Cloudinary) ---
MEDIA_URL = '/media/'

# --- Default primary key field type ---
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- DRF Configuration ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "user": "60/min",
        "batch_burst": "40/min",
        "batch_sustained": "200/hour",
    },
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 15,
    "DEFAULT_RENDERER_CLASSES": (
        'rest_framework.renderers.JSONRenderer',
    )
}

# --- JWT ---
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1000),
    'BLACKLIST_AFTER_ROTATION': True,
    'ROTATE_REFRESH_TOKENS': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_BLACKLIST_ENABLED': True,
    'UPDATE_LAST_LOGIN': False,
}

# --- Email (Production) ---
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='orderingpau@gmail.com')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

# --- Production Security Settings ---
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# --- Enhanced Logging ---
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
        },
        'file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'django.log'),
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'users': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'posts': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'notifications': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        }
    },
}

# Create logs directory if it doesn't exist
os.makedirs(os.path.join(BASE_DIR, 'logs'), exist_ok=True)