from rest_framework import serializers
from .models import Ambulance
from drivers_app.models import Driver

class AmbulanceSerializer(serializers.ModelSerializer):
    driver_name = serializers.CharField(source='driver.name', read_only=True)
    driver_status = serializers.CharField(source='driver.status', read_only=True)
    
    class Meta:
        model = Ambulance
        fields = '__all__'
        
    def to_representation(self, instance):
        """Add additional driver details when available"""
        representation = super().to_representation(instance)
        
        # Remove null values for cleaner response
        if representation['driver'] is None:
            representation.pop('driver_name', None)
            representation.pop('driver_status', None)
            
        return representation 