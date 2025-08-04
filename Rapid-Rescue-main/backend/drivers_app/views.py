from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.contrib.auth.models import User
from django.db import transaction
import logging
import traceback
import sys

from .models import Driver
from .serializers import DriverSerializer, UserSerializer

logger = logging.getLogger(__name__)

class DriverViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing drivers
    """
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    
    def get_permissions(self):
        """
        Override permissions based on action:
        - List and retrieve are available to authenticated users
        - Create, update, delete require admin privileges
        """
        if self.action in ['list', 'retrieve', 'available_drivers', 'create_with_credentials']:
            permission_classes = [IsAuthenticated]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def create(self, request, *args, **kwargs):
        """
        Custom create method with enhanced error handling
        """
        try:
            logger.debug("Starting driver creation with data: %s", request.data)
            print(f"DRIVER CREATION DATA: {request.data}", file=sys.stderr)
            
            # Check for required fields
            if not request.data.get('name'):
                return Response({'name': ['This field is required.']}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if username exists when provided
            if 'username' in request.data and request.data['username']:
                username = request.data['username']
                logger.debug("Checking if username exists: %s", username)
                
                # Clean up previous user if it exists
                if self._clean_previous_user(username):
                    logger.debug("Previous user with same username was cleaned up")
            
            # Proceed with creation
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            driver = serializer.save()
            
            logger.debug("Driver created successfully with ID: %s", driver.id)
            
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
            
        except Exception as e:
            logger.error("Error creating driver: %s", str(e))
            logger.error(traceback.format_exc())
            return Response(
                {"detail": f"Failed to create driver: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        """
        Custom update method with enhanced error handling
        """
        try:
            instance = self.get_object()
            logger.debug("Updating driver ID %s with data: %s", instance.id, request.data)
            
            # Check if username changed and needs cleanup
            if 'username' in request.data and request.data['username']:
                new_username = request.data['username']
                old_username = instance.user.username if instance.user else None
                
                if new_username != old_username and User.objects.filter(username=new_username).exists():
                    # Clean up previous user with same username
                    if not self._clean_previous_user(new_username):
                        return Response(
                            {"username": f"Username '{new_username}' is already taken and could not be cleaned up."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
            
            # Proceed with update
            serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
            serializer.is_valid(raise_exception=True)
            driver = serializer.save()
            
            logger.debug("Driver updated successfully")
            
            return Response(serializer.data)
            
        except Exception as e:
            logger.error("Error updating driver: %s", str(e))
            logger.error(traceback.format_exc())
            return Response(
                {"detail": f"Failed to update driver: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        """
        Override the default destroy method to ensure proper cleanup
        """
        import logging
        import traceback
        import sys
        from django.db import transaction
        logger = logging.getLogger(__name__)
        
        driver = self.get_object()
        driver_id = driver.id
        username = driver.user.username if driver.user else None
        
        logger.debug(f"Deleting driver with ID: {driver_id}, username: {username}")
        print(f"DESTROY - Deleting driver with ID: {driver_id}, username: {username}", file=sys.stderr)
        
        try:
            # Use transaction to ensure atomicity
            with transaction.atomic():
                # Check for related alerts and ambulances
                # Clear references to this driver in related models
                if hasattr(driver, 'alerts'):
                    alert_count = driver.alerts.count()
                    if alert_count > 0:
                        print(f"DESTROY - Breaking {alert_count} alert references", file=sys.stderr)
                        driver.alerts.update(driver=None)
                
                if hasattr(driver, 'ambulances'):
                    ambulance_count = driver.ambulances.count()
                    if ambulance_count > 0:
                        print(f"DESTROY - Breaking {ambulance_count} ambulance references", file=sys.stderr)
                        driver.ambulances.update(driver=None)
                
                # Store user for later deletion
                user = None
                if driver.user:
                    user = driver.user
                    # Unlink user from driver to avoid cascade issues
                    driver.user = None
                    driver.save()
                
                # Delete the driver
                driver.delete()
                print(f"DESTROY - Driver deleted successfully", file=sys.stderr)
                
                # Delete the user if it exists
                if user:
                    try:
                        user.delete()
                        print(f"DESTROY - Associated user {username} deleted successfully", file=sys.stderr)
                    except Exception as e:
                        print(f"DESTROY - Error deleting user: {str(e)}", file=sys.stderr)
                        logger.error(f"Error deleting user: {str(e)}")
                
                return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            error_message = f"Error deleting driver: {str(e)}"
            print(f"DESTROY - {error_message}", file=sys.stderr)
            logger.error(error_message)
            logger.error(traceback.format_exc())
            return Response({"detail": error_message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _clean_previous_user(self, username):
        """
        Helper method to clean up a previous user with the given username
        Returns True if cleanup was performed, False if no user was found
        """
        import logging
        import traceback
        import sys
        from django.db import transaction
        logger = logging.getLogger(__name__)
        
        try:
            # Check if user exists
            print(f"CLEAN_PREVIOUS_USER - Looking for user: {username}", file=sys.stderr)
            user = User.objects.get(username=username)
            logger.debug(f"Found existing user with username '{username}', checking for related driver")
            print(f"CLEAN_PREVIOUS_USER - Found user: {username} (ID: {user.id})", file=sys.stderr)
            
            # Process with atomic transaction
            with transaction.atomic():
                # Check for related driver
                try:
                    driver = Driver.objects.get(user=user)
                    logger.warning(f"User '{username}' is associated with existing driver ID: {driver.id}")
                    print(f"CLEAN_PREVIOUS_USER - User is linked to driver ID: {driver.id}", file=sys.stderr)
                    
                    # Don't delete if driver is not to be reused - that should go through proper driver deletion
                    return False
                    
                except Driver.DoesNotExist:
                    # This is an orphaned user we can safely delete
                    logger.debug(f"User '{username}' has no associated driver, will delete")
                    print(f"CLEAN_PREVIOUS_USER - No driver found, deleting orphaned user", file=sys.stderr)
                    user.delete()
                    logger.debug(f"Deleted orphaned user '{username}'")
                    print(f"CLEAN_PREVIOUS_USER - User deleted successfully", file=sys.stderr)
                    return True
                    
        except User.DoesNotExist:
            # No user found with this username, nothing to clean
            return True
        except Exception as e:
            logger.error(f"Error cleaning previous user: {str(e)}")
            print(f"CLEAN_PREVIOUS_USER - Error: {str(e)}", file=sys.stderr)
            logger.error(traceback.format_exc())
            return False
    
    @action(detail=False, methods=['get'])
    def available_drivers(self, request):
        """
        Get a list of available drivers
        """
        available = Driver.objects.filter(status='available')
        serializer = self.get_serializer(available, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def create_with_credentials(self, request):
        """
        Create a driver with login credentials and handle file upload
        """
        try:
            logger.debug("Starting driver creation with credentials")
            print(f"CREATE_WITH_CREDENTIALS - Request data: {request.data}", file=sys.stderr)
            
            # Validate required fields
            required_fields = ['name', 'contact_no', 'email', 'username', 'password']
            for field in required_fields:
                if not request.data.get(field):
                    return Response(
                        {field: ['This field is required.']},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Create user first
            user_data = {
                'username': request.data['username'],
                'password': request.data['password'],
                'email': request.data['email'],
                'first_name': request.data['name'].split()[0] if request.data['name'] else '',
                'last_name': ' '.join(request.data['name'].split()[1:]) if request.data['name'] and len(request.data['name'].split()) > 1 else ''
            }
            
            with transaction.atomic():
                # Check if username exists
                if User.objects.filter(username=user_data['username']).exists():
                    return Response(
                        {'username': ['This username is already taken.']},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Create user
                user = User.objects.create_user(**user_data)
                
                # Prepare driver data
                driver_data = request.data.copy()
                driver_data['user'] = user.id
                
                # Create serializer with data
                serializer = self.get_serializer(data=driver_data)
                if not serializer.is_valid():
                    # If driver creation fails, rollback by deleting the user
                    user.delete()
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
                # Save driver
                driver = serializer.save()
                
                # Handle photo upload if present
                if 'photo' in request.FILES:
                    driver.photo = request.FILES['photo']
                    driver.save()
                
                logger.debug(f"Driver created successfully with ID: {driver.id}")
                print(f"CREATE_WITH_CREDENTIALS - Driver created with ID: {driver.id}", file=sys.stderr)
                
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Error in create_with_credentials: {str(e)}")
            print(f"CREATE_WITH_CREDENTIALS - Error: {str(e)}", file=sys.stderr)
            print(traceback.format_exc(), file=sys.stderr)
            return Response(
                {"error": f"Failed to create driver: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
