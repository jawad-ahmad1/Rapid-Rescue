from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Alert
from .serializers import AlertSerializer
import os
import re
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.http import FileResponse, HttpResponse, StreamingHttpResponse
from wsgiref.util import FileWrapper
import mimetypes
import stat

def add_cors_headers(response):
    """Add CORS headers to response"""
    response["Access-Control-Allow-Origin"] = "http://localhost:5173"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Range, Origin, Accept-Encoding, Accept"
    response["Access-Control-Expose-Headers"] = "Content-Length, Content-Range, Content-Type"
    return response

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_check(request):
    """Health check endpoint for testing connectivity"""
    return Response({"status": "ok"}, status=status.HTTP_200_OK)

def is_ngrok_request(request):
    """Check if request is coming through ngrok"""
    return any(
        header in request.META.get('HTTP_HOST', '').lower()
        for header in ['ngrok', 'tunnel']
    )

class AlertViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows alerts to be viewed or edited.
    """
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_serializer_context(self):
        """Add request to serializer context"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def create(self, request, *args, **kwargs):
        """Create a new alert with optional video upload"""
        try:
            # Handle file upload
            accident_clip = request.FILES.get('accident_clip')
            
            # Create alert
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Set AI detection flag
            serializer.validated_data['is_ai_detected'] = True
            
            # Save alert
            alert = serializer.save()
            
            # Handle video if provided
            if accident_clip:
                # Ensure media directory exists
                media_path = os.path.join(settings.MEDIA_ROOT, 'accident_clips')
                os.makedirs(media_path, exist_ok=True)
                
                # Generate unique filename
                file_extension = os.path.splitext(accident_clip.name)[1]
                filename = f'accident_clips/{alert.alert_id}{file_extension}'
                
                # Save video file
                file_path = default_storage.save(filename, ContentFile(accident_clip.read()))
                
                # Update alert with video path
                alert.accident_clip = file_path
                
                # Build URL with correct scheme (http/https)
                url = request.build_absolute_uri(settings.MEDIA_URL + file_path)
                if 'ngrok' in request.get_host():
                    url = url.replace('http://', 'https://')
                
                alert.video_url = url
                alert.save()
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to create alert: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _stream_video_file(self, file_path, start_byte=0, chunk_size=8192):
        """Stream a video file from the given start byte"""
        with open(file_path, 'rb') as f:
            f.seek(start_byte)
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                yield chunk

    @action(detail=True, methods=['GET', 'OPTIONS'])
    def video(self, request, pk=None):
        """Stream video with proper range request handling"""
        try:
            alert = self.get_object()
            if not alert.accident_clip:
                return Response({'error': 'No video available'}, status=404)
            
            file_path = alert.accident_clip.path
            if not os.path.exists(file_path):
                return Response({'error': 'Video file not found'}, status=404)

            # Get file info
            file_size = os.path.getsize(file_path)
            content_type = mimetypes.guess_type(file_path)[0] or 'video/mp4'

            # Handle range request
            range_header = request.META.get('HTTP_RANGE', '').strip()
            range_match = re.match(r'bytes=(\d+)-(\d*)', range_header)
            
            start_byte = 0
            end_byte = file_size - 1

            if range_match:
                start_byte = int(range_match.group(1))
                if range_match.group(2):
                    end_byte = min(int(range_match.group(2)), file_size - 1)

            # Calculate content length
            content_length = end_byte - start_byte + 1

            # Prepare response headers
            response = StreamingHttpResponse(
                self._stream_video_file(file_path, start_byte),
                status=206 if range_header else 200,
                content_type=content_type
            )

            # Essential streaming headers
            response['Accept-Ranges'] = 'bytes'
            response['Content-Length'] = str(content_length)
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            
            if range_header:
                response['Content-Range'] = f'bytes {start_byte}-{end_byte}/{file_size}'

            # Comprehensive CORS headers for video streaming
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
            response["Access-Control-Allow-Headers"] = (
                "range, accept-ranges, content-type, origin, accept-encoding, "
                "cache-control, x-requested-with, authorization"
            )
            response["Access-Control-Expose-Headers"] = (
                "content-length, content-range, accept-ranges, content-type, "
                "content-encoding, content-disposition"
            )
            
            # Set content disposition to inline to encourage browser playback
            response['Content-Disposition'] = f'inline; filename="{os.path.basename(file_path)}"'
            
            # Log request details for debugging
            print(f"Serving video: {file_path}")
            print(f"Content-Type: {content_type}")
            print(f"Content-Length: {content_length}")
            print(f"Range: {range_header if range_header else 'None'}")
            
            return response

        except Alert.DoesNotExist:
            return Response({'error': 'Alert not found'}, status=404)
        except Exception as e:
            print(f"Error serving video: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['POST'], url_path='upload-video')
    def upload_video(self, request, pk=None):
        """Upload a video for an existing alert"""
        try:
            alert = self.get_object()
            if 'video' not in request.FILES:
                return Response({'error': 'No video file provided'}, status=400)
            
            # Delete old video if it exists
            if alert.accident_clip:
                if os.path.exists(alert.accident_clip.path):
                    os.remove(alert.accident_clip.path)
            
            # Save new video
            video_file = request.FILES['video']
            file_extension = os.path.splitext(video_file.name)[1]
            filename = f'accident_clips/{alert.alert_id}{file_extension}'
            
            file_path = default_storage.save(filename, ContentFile(video_file.read()))
            
            alert.accident_clip = file_path
            alert.video_url = request.build_absolute_uri(settings.MEDIA_URL + file_path)
            alert.save()
            
            serializer = self.get_serializer(alert)
            return Response(serializer.data)
            
        except Alert.DoesNotExist:
            return Response({'error': 'Alert not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['GET'])
    def ai_detected(self, request):
        """Get all AI-detected alerts"""
        alerts = self.queryset.filter(is_ai_detected=True)
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)
