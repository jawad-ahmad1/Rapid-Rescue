from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Driver, Ambulance, Alert, Accident
import logging
from django.conf import settings

# Get logger for this module
logger = logging.getLogger(__name__)

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'password')
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        
        if password:
            user.set_password(password)
            user.save()
            
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        if password:
            instance.set_password(password)
            
        instance.save()
        return instance

class DriverSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', required=False, allow_null=True)
    email = serializers.EmailField(source='user.email', required=False, allow_null=True, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False)
    user_id = serializers.IntegerField(source='user.id', read_only=True, allow_null=True)
    contact_no = serializers.CharField(source='phone', required=False, allow_null=True)
    
    class Meta:
        model = Driver
        fields = ('id', 'name', 'contact_no', 'phone', 'status', 'license_no', 'experience', 
                 'address', 'photo', 'user', 'user_id', 'username', 'email', 
                 'password', 'created_at', 'updated_at')
        extra_kwargs = {
            'user': {'write_only': True, 'required': False},
            'phone': {'required': False},
            'photo': {'required': False},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True}
        }

    def create(self, validated_data):
        # Extract user data and password
        user_data = {}
        if 'user' in validated_data:
            user_data = validated_data.pop('user')
        password = validated_data.pop('password', None)
        
        # Handle phone/contact_no mapping
        if 'phone' in validated_data:
            phone = validated_data['phone']
        elif 'contact_no' in validated_data:
            phone = validated_data.pop('contact_no')
            validated_data['phone'] = phone
        
        # Create driver instance first
        driver = Driver.objects.create(**validated_data)
        
        # Create user if username is provided
        username = user_data.get('username', None)
        if username:
            email = user_data.get('email', '')
            
            # Create user
            user = User.objects.create(
                username=username,
                email=email,
                first_name=driver.name.split()[0] if driver.name else '',
                last_name=' '.join(driver.name.split()[1:]) if driver.name and len(driver.name.split()) > 1 else ''
            )
            
            # Set password
            if password:
                user.set_password(password)
            else:
                user.set_password(username + '12345')  # Default password if none provided
            
            user.save()
            
            # Link user to driver
            driver.user = user
            driver.save()
        
        return driver

    def to_representation(self, instance):
        """
        Override to_representation to ensure contact_no is always populated
        and photo URL is properly formatted
        """
        data = super().to_representation(instance)
        
        # Ensure contact_no is always populated with phone value
        if 'phone' in data and not data.get('contact_no'):
            data['contact_no'] = data['phone']
        elif 'contact_no' in data and not data.get('phone'):
            data['phone'] = data['contact_no']
            
        # Ensure photo URL is properly formatted
        if data.get('photo'):
            if not data['photo'].startswith(('http', '/')):
                data['photo'] = '/' + data['photo']
                
        return data

    def update(self, instance, validated_data):
        # Extract user data and password
        user_data = {}
        if 'user' in validated_data:
            user_data = validated_data.pop('user')
        password = validated_data.pop('password', None)
        
        # Handle phone/contact_no mapping
        if 'phone' in validated_data:
            validated_data['phone'] = validated_data['phone']
        elif 'contact_no' in validated_data:
            validated_data['phone'] = validated_data.pop('contact_no')
        
        # Update driver instance fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Update or create user if username is provided
        if user_data:
            username = user_data.get('username')
            if username:
                if instance.user:
                    # Update existing user
                    user = instance.user
                    user.username = username
                    user.email = user_data.get('email', user.email)
                    if password:
                        user.set_password(password)
                    user.save()
                else:
                    # Create new user
                    user = User.objects.create(
                        username=username,
                        email=user_data.get('email', ''),
                        first_name=instance.name.split()[0] if instance.name else '',
                        last_name=' '.join(instance.name.split()[1:]) if instance.name and len(instance.name.split()) > 1 else ''
                    )
                    if password:
                        user.set_password(password)
                    else:
                        user.set_password(username + '12345')
                    user.save()
                    instance.user = user
        
        instance.save()
        return instance

class AmbulanceSerializer(serializers.ModelSerializer):
    driver_name = serializers.CharField(source='driver.name', read_only=True)
    
    class Meta:
        model = Ambulance
        fields = '__all__'

class AlertSerializer(serializers.ModelSerializer):
    driver_name = serializers.SerializerMethodField()
    driver_contact = serializers.SerializerMethodField()
    coordinates = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    location_address = serializers.SerializerMethodField()
    emergency_address = serializers.SerializerMethodField()
    time_reported = serializers.SerializerMethodField()
    completion_time = serializers.SerializerMethodField()
    response_time_formatted = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()
    accident_clip_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Alert
        fields = '__all__'

    def get_accident_clip_url(self, obj):
        """Get the URL for the accident clip if it exists"""
        if obj.accident_clip:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.accident_clip.url)
            return f"{settings.BASE_URL}{obj.accident_clip.url}"
        return None

    def get_video_url(self, obj):
        """Get the video URL, either from video_url field or accident_clip"""
        if obj.video_url:
            # If it's already a full URL, return as is
            if obj.video_url.startswith(('http://', 'https://')):
                return obj.video_url
            # Otherwise, make it absolute
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video_url)
            return f"{settings.BASE_URL}{obj.video_url}"
        # Fall back to accident_clip URL
        return self.get_accident_clip_url(obj)

    def get_driver_name(self, obj):
        """Get driver name with null check"""
        return obj.driver.name if obj.driver else None

    def get_driver_contact(self, obj):
        """Get driver contact with null check"""
        if not obj.driver:
            return None
        return obj.driver.phone or None
        
    def get_coordinates(self, obj):
        return {
            'lat': obj.coordinates_lat,
            'lng': obj.coordinates_lng
        }
        
    def get_location(self, obj):
        """Get proper location name"""
        return obj.get_location_name()

    def get_address(self, obj):
        """Get address with proper location name"""
        return obj.get_location_name()
        
    def get_location_address(self, obj):
        """Get location address with proper location name"""
        return obj.get_location_name()
        
    def get_emergency_address(self, obj):
        """Get emergency address with proper location name"""
        return obj.get_location_name()

    def get_time_reported(self, obj):
        """Format the created_at time in a readable format"""
        try:
            if obj.created_at:
                return obj.created_at.strftime("%Y-%m-%d %H:%M:%S")
            return None
        except Exception as e:
            logger.error(f"Error formatting time_reported for alert {obj.id}: {str(e)}")
            return None

    def get_completion_time(self, obj):
        """Format the completion time in a readable format"""
        try:
            if obj.completed_at:
                return obj.completed_at.strftime("%Y-%m-%d %H:%M:%S")
            return None
        except Exception as e:
            logger.error(f"Error formatting completion_time for alert {obj.id}: {str(e)}")
            return None

    def get_response_time_formatted(self, obj):
        """Format response time with 'mins' if not already formatted"""
        try:
            if obj.response_time:
                if isinstance(obj.response_time, str):
                    if 'mins' not in obj.response_time:
                        return f"{obj.response_time} mins"
                    return obj.response_time
                return f"{obj.response_time} mins"
            return None
        except Exception as e:
            logger.error(f"Error formatting response_time for alert {obj.id}: {str(e)}")
            return None
        
    def to_representation(self, instance):
        """Add additional fields and ensure video URLs are present"""
        representation = super().to_representation(instance)
        
        # Ensure video URLs are included
        video_url = self.get_video_url(instance)
        if video_url:
            representation['video_url'] = video_url
            
        accident_clip_url = self.get_accident_clip_url(instance)
        if accident_clip_url:
            representation['accident_clip_url'] = accident_clip_url
            
        return representation

class AccidentSerializer(serializers.ModelSerializer):
    coordinates = serializers.SerializerMethodField()
    
    class Meta:
        model = Accident
        fields = '__all__'
    
    def get_coordinates(self, obj):
        return {
            'lat': obj.coordinates_lat,
            'lng': obj.coordinates_lng
        } 