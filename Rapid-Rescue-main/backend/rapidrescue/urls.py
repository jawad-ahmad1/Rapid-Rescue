"""
URL configuration for rapidrescue project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.http import HttpResponse, StreamingHttpResponse
import mimetypes
import os
import re

def serve_media_with_cors(request, path, document_root=None):
    """Custom view to serve media files with proper CORS and content-type headers"""
    # Get the full path to the file
    full_path = os.path.join(document_root, path)
    
    # Ensure the file exists
    if not os.path.exists(full_path):
        return HttpResponse(status=404)
    
    # Get content type and file size
    content_type, encoding = mimetypes.guess_type(full_path)
    if content_type is None:
        content_type = 'application/octet-stream'
    
    file_size = os.path.getsize(full_path)
    
    # Handle range request
    range_header = request.META.get('HTTP_RANGE', '').strip()
    range_match = re.match(r'bytes=(\d+)-(\d*)', range_header)
    
    if range_match:
        start_byte = int(range_match.group(1))
        end_byte = int(range_match.group(2)) if range_match.group(2) else file_size - 1
        if end_byte >= file_size:
            end_byte = file_size - 1
        content_length = end_byte - start_byte + 1
        
        def file_iterator(start, end, chunk_size=8192):
            with open(full_path, 'rb') as f:
                f.seek(start)
                remaining = end - start + 1
                while remaining > 0:
                    chunk = f.read(min(chunk_size, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk
        
        response = StreamingHttpResponse(
            file_iterator(start_byte, end_byte),
            status=206,
            content_type=content_type
        )
        response['Content-Range'] = f'bytes {start_byte}-{end_byte}/{file_size}'
        response['Content-Length'] = str(content_length)
        response['Accept-Ranges'] = 'bytes'
    else:
        # Serve the entire file
        response = StreamingHttpResponse(
            open(full_path, 'rb'),
            content_type=content_type
        )
        response['Content-Length'] = str(file_size)
        response['Accept-Ranges'] = 'bytes'
    
    # Add CORS headers
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
    response["Access-Control-Allow-Headers"] = "range, accept-ranges, content-type"
    response["Access-Control-Expose-Headers"] = "content-length, content-range, accept-ranges"
    response["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response["Pragma"] = "no-cache"
    response["Expires"] = "0"
    
    return response

urlpatterns = [
    path('admin/', admin.site.urls),
    # Legacy API endpoint - keep for backward compatibility
    path('api/', include('api.urls')),
    # New modular API endpoints
    path('api/v1/', include([
        path('', include('drivers_app.urls')),
        path('', include('ambulances_app.urls')),
        path('', include('alerts_app.urls')),
        path('', include('accidents_app.urls')),
        path('dashboard/', include('dashboard.urls')),
        path('auth/', include('authentication.urls')),
    ])),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Custom media serving with CORS headers
if settings.DEBUG:
    urlpatterns += [
        path('media/<path:path>', serve_media_with_cors, {'document_root': settings.MEDIA_ROOT}),
    ]
