from rest_framework import serializers
from .models import Accident

class AccidentSerializer(serializers.ModelSerializer):
    severity_display = serializers.SerializerMethodField()
    formatted_date = serializers.SerializerMethodField()
    formatted_time = serializers.SerializerMethodField()
    days_since_accident = serializers.SerializerMethodField()
    
    class Meta:
        model = Accident
        fields = '__all__'
    
    def get_severity_display(self, obj):
        """Return the human-readable severity value"""
        return dict(obj._meta.get_field('severity').choices).get(obj.severity, obj.severity)
    
    def get_formatted_date(self, obj):
        """Return date in a more readable format"""
        if obj.date:
            return obj.date.strftime('%B %d, %Y')
        return None
    
    def get_formatted_time(self, obj):
        """Return time in a more readable format"""
        if obj.time:
            return obj.time.strftime('%I:%M %p')
        return None
    
    def get_days_since_accident(self, obj):
        """Calculate days since accident occurred"""
        from django.utils import timezone
        if obj.date:
            delta = timezone.now().date() - obj.date
            return delta.days
        return None 