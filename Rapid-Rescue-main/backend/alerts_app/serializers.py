from rest_framework import serializers
from .models import Alert
from drivers_app.models import Driver
from django.conf import settings
import re

class AlertSerializer(serializers.ModelSerializer):
    driver_name = serializers.CharField(source='driver.name', read_only=True)
    driver_contact = serializers.CharField(source='driver.contact_no', read_only=True)
    days_since_created = serializers.SerializerMethodField()
    accident_clip_url = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Alert
        fields = '__all__'
    
    def get_days_since_created(self, obj):
        """Calculate days since alert was created"""
        from django.utils import timezone
        if obj.created_at:
            delta = timezone.now().date() - obj.created_at.date()
            return delta.days
        return None
    
    def _get_base_url(self, request):
        """Get the base URL considering both local and ngrok environments"""
        if request and request.META.get('HTTP_HOST'):
            # Check if it's an ngrok request
            if 'ngrok' in request.META['HTTP_HOST']:
                return f"https://{request.META['HTTP_HOST']}"
            # Local development
            scheme = request.scheme or 'http'
            return f"{scheme}://{request.META['HTTP_HOST']}"
        return settings.BASE_URL

    def get_accident_clip_url(self, obj):
        """Get the URL for the accident clip if it exists"""
        if obj.accident_clip:
            request = self.context.get('request')
            base_url = self._get_base_url(request)
            
            # Get the relative path
            relative_path = str(obj.accident_clip.url)
            if relative_path.startswith('/'):
                relative_path = relative_path[1:]
            
            return f"{base_url}/{relative_path}"
        return None
    
    def get_video_url(self, obj):
        """Get the video URL, either from video_url field or accident_clip"""
        if obj.video_url:
            # If it's already a full URL, return as is
            if obj.video_url.startswith(('http://', 'https://')):
                return obj.video_url
                
            # Otherwise, make it absolute
            request = self.context.get('request')
            base_url = self._get_base_url(request)
            
            # Get the relative path
            relative_path = obj.video_url
            if relative_path.startswith('/'):
                relative_path = relative_path[1:]
            
            return f"{base_url}/{relative_path}"
            
        # Fall back to accident_clip URL
        return self.get_accident_clip_url(obj)
    
    def to_representation(self, instance):
        """Add additional driver details when available"""
        representation = super().to_representation(instance)
        
        # Remove null values for cleaner response
        if representation['driver'] is None:
            representation.pop('driver_name', None)
            representation.pop('driver_contact', None)
            
        # Ensure video_url is included if available
        video_url = self.get_video_url(instance)
        if video_url:
            representation['video_url'] = video_url
            
        # Ensure accident_clip_url is included if available
        accident_clip_url = self.get_accident_clip_url(instance)
        if accident_clip_url:
            representation['accident_clip_url'] = accident_clip_url
            
        return representation 