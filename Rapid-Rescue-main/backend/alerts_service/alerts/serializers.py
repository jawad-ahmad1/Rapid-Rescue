from rest_framework import serializers
from django.conf import settings
from .models import Alert

class AlertSerializer(serializers.ModelSerializer):
    coordinates_lat = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, write_only=True)
    coordinates_lng = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, write_only=True)
    priority = serializers.CharField(required=False, write_only=True)
    accident_clip_data = serializers.CharField(required=False, write_only=True)
    time = serializers.TimeField(required=False, write_only=True)
    date = serializers.DateField(required=False, write_only=True)
    video_url = serializers.URLField(required=False)

    class Meta:
        model = Alert
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'clip_uploaded_at')
        extra_kwargs = {
            'alert_id': {'required': True},
            'latitude': {'required': False},
            'longitude': {'required': False},
            'severity': {'required': False},
            'accident_clip': {'required': False},
            'accident_clip_name': {'required': False},
            'accident_clip_type': {'required': False},
            'video_url': {'required': False},
        }

    def to_representation(self, instance):
        """Convert the object instance to a dictionary representation"""
        ret = super().to_representation(instance)
        
        # Add full URL for video_url if it's a relative path
        if ret.get('video_url') and not ret['video_url'].startswith(('http://', 'https://')):
            # Get the base URL from settings or use a default
            base_url = getattr(settings, 'BASE_URL', 'http://localhost:8001')
            ret['video_url'] = f"{base_url}{ret['video_url']}"
            
        # Add full URL for accident_clip if it exists
        if ret.get('accident_clip'):
            base_url = getattr(settings, 'BASE_URL', 'http://localhost:8001')
            ret['accident_clip'] = f"{base_url}{ret['accident_clip']}"
            
        return ret 