from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Driver

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'password')
        extra_kwargs = {
            'password': {'write_only': True}
        }

class DriverSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', required=False, allow_null=True)
    email = serializers.EmailField(source='user.email', required=False, allow_null=True, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False)
    user_id = serializers.IntegerField(source='user.id', read_only=True, allow_null=True)
    active_alert = serializers.SerializerMethodField()
    
    class Meta:
        model = Driver
        fields = ('id', 'name', 'contact_no', 'status', 'license_no', 'experience', 
                 'address', 'photo', 'user', 'user_id', 'username', 'email', 
                 'password', 'active_alert', 'created_at', 'updated_at')
        extra_kwargs = {
            'user': {'read_only': True}
        }
    
    def get_active_alert(self, obj):
        """Returns the current active alert for this driver, if any"""
        active_alert = obj.alerts.filter(status='assigned').first()
        if active_alert:
            # Return a minimal representation to avoid circular references
            return {
                'id': active_alert.id,
                'alert_id': active_alert.alert_id,
                'location': active_alert.location,
                'time': active_alert.time,
                'date': active_alert.date
            }
        return None
    
    def to_representation(self, instance):
        """
        Add username and email directly from the related User model
        """
        representation = super().to_representation(instance)
        if instance.user:
            representation['username'] = instance.user.username
            representation['email'] = instance.user.email
            representation['user_id'] = instance.user.id
        return representation
    
    def create(self, validated_data):
        try:
            import logging
            logger = logging.getLogger(__name__)
            logger.debug("Creating driver with data: %s", validated_data)
            
            user_data = {}
            
            # Extract user data
            if 'user' in validated_data:
                user_data = validated_data.pop('user')
                logger.debug("User data extracted: %s", user_data)
            
            # Handle password separately
            password = validated_data.pop('password', None)
            logger.debug("Password extracted (not logging value)")
            
            # Create driver instance
            driver = Driver.objects.create(**validated_data)
            logger.debug("Driver created with ID: %s", driver.id)
            
            # Create user if username is provided
            if user_data and 'username' in user_data and user_data['username']:
                username = user_data['username']
                logger.debug("Creating user with username: %s", username)
                
                # Final safety check if user exists
                if User.objects.filter(username=username).exists():
                    logger.warning("Username %s already exists, attempting cleanup", username)
                    try:
                        # Force delete any existing user with this username
                        User.objects.filter(username=username).delete()
                        logger.debug("Successfully deleted existing user in serializer")
                    except Exception as e:
                        logger.error("Final cleanup failed: %s", str(e))
                        driver.delete()
                        raise serializers.ValidationError({
                            "username": f"Could not create user '{username}'. Please try again or choose a different username."
                        })
                
                try:
                    user = User.objects.create(
                        username=username,
                        email=user_data.get('email', ''),
                        first_name=driver.name.split()[0] if driver.name else '',
                        last_name=' '.join(driver.name.split()[1:]) if driver.name and len(driver.name.split()) > 1 else ''
                    )
                    
                    if password:
                        user.set_password(password)
                    else:
                        # Set a default password if none provided
                        user.set_password(username + '12345')
                    
                    user.save()
                    logger.debug("User created with ID: %s", user.id)
                    
                    # Link user to driver
                    driver.user = user
                    driver.save()
                    logger.debug("User linked to driver successfully")
                except Exception as e:
                    # If user creation fails, delete the driver to avoid orphaned records
                    logger.error("Error creating user: %s", str(e))
                    driver.delete()
                    raise serializers.ValidationError({"username": str(e)})
            
            return driver
        except Exception as e:
            import traceback
            logger.error("Unexpected error creating driver: %s", str(e))
            logger.error(traceback.format_exc())
            raise
    
    def update(self, instance, validated_data):
        # Extract user data
        user_data = {}
        if 'user' in validated_data:
            user_data = validated_data.pop('user')
        
        # Handle password separately
        password = validated_data.pop('password', None)
        
        # Update driver instance fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Update or create user
        if user_data and ('username' in user_data or 'email' in user_data):
            if instance.user:
                # Update existing user
                user = instance.user
                
                if 'username' in user_data and user_data['username']:
                    user.username = user_data['username']
                
                if 'email' in user_data:
                    user.email = user_data['email'] or ''
                
                if password:
                    user.set_password(password)
                
                user.save()
            elif 'username' in user_data and user_data['username']:
                # Create new user
                user = User.objects.create(
                    username=user_data['username'],
                    email=user_data.get('email', ''),
                    first_name=instance.name.split()[0] if instance.name else '',
                    last_name=' '.join(instance.name.split()[1:]) if instance.name and len(instance.name.split()) > 1 else ''
                )
                
                if password:
                    user.set_password(password)
                else:
                    # Set a default password
                    user.set_password(user_data['username'] + '12345')
                
                user.save()
                
                # Link user to driver
                instance.user = user
        
        instance.save()
        return instance 