from rest_framework import viewsets, status
from rest_framework.decorators import action, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.core.files.base import ContentFile
import base64
import os
from datetime import datetime
from .models import Alert
from .serializers import AlertSerializer

class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        # Handle coordinates
        if 'coordinates_lat' in data and 'coordinates_lng' in data:
            data['latitude'] = data.pop('coordinates_lat')
            data['longitude'] = data.pop('coordinates_lng')

        # Map priority to severity
        if 'priority' in data:
            priority_to_severity = {
                'low': 'LOW',
                'medium': 'MEDIUM',
                'high': 'HIGH',
                'critical': 'CRITICAL'
            }
            data['severity'] = priority_to_severity.get(data['priority'].lower(), 'MEDIUM')

        # Handle video URL if provided
        if 'video_url' in data and data['video_url']:
            # Store the URL directly
            pass  # URL field will be handled by serializer
        
        # Handle base64 encoded video
        if 'accident_clip_data' in data and data['accident_clip_data']:
            try:
                # Decode base64 data
                video_data = base64.b64decode(data['accident_clip_data'])
                
                # Generate filename if not provided
                if 'accident_clip_name' not in data or not data['accident_clip_name']:
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    data['accident_clip_name'] = f'accident_clip_{timestamp}.avi'

                # Save the file
                data['accident_clip'] = ContentFile(
                    video_data,
                    name=data['accident_clip_name']
                )
                data['clip_uploaded_at'] = timezone.now()

                # If video URL not provided, generate one for the uploaded file
                if not data.get('video_url'):
                    # Generate a URL for the uploaded file
                    file_name = data['accident_clip_name']
                    data['video_url'] = f'/media/accident_clips/{file_name}'
                    
            except Exception as e:
                return Response(
                    {'error': f'Error processing video data: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Remove base64 data after processing
        data.pop('accident_clip_data', None)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.status = 'RESOLVED'
        alert.resolved_at = timezone.now()
        alert.save()
        return Response({'status': 'alert resolved'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        alert = self.get_object()
        alert.status = 'CANCELLED'
        alert.save()
        return Response({'status': 'alert cancelled'})

    @action(detail=False, methods=['get'])
    def active(self, request):
        active_alerts = Alert.objects.filter(status='ACTIVE')
        serializer = self.get_serializer(active_alerts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    @parser_classes([MultiPartParser, FormParser])
    def upload_clip(self, request, pk=None):
        alert = self.get_object()
        if 'accident_clip' not in request.FILES:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        alert.accident_clip = request.FILES['accident_clip']
        alert.clip_uploaded_at = timezone.now()
        alert.save()
        
        serializer = self.get_serializer(alert)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save() 