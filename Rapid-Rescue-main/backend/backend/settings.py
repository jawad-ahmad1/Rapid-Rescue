import os
from pathlib import Path

# Media files configuration
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# CORS settings
CORS_ALLOW_ALL_ORIGINS = True  # Only for development
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = [
    'GET',
    'OPTIONS',
]
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'range',
]
CORS_EXPOSE_HEADERS = [
    'accept-ranges',
    'content-encoding',
    'content-length',
    'content-range',
    'content-type',
]

# For development only - allow serving media files
if DEBUG:
    INSTALLED_APPS += [
        'corsheaders',
    ]
    
    MIDDLEWARE.insert(0, 'corsheaders.middleware.CorsMiddleware')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'api',
    'alerts_app',
    'drivers_app',
] 