from django.shortcuts import render, get_object_or_404
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.db.models import Count
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, authentication_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import DriverSerializer, AmbulanceSerializer, AlertSerializer, AccidentSerializer
from .models import Driver, Ambulance, Alert, Accident, AlertHistory, DriverHistory
from datetime import timedelta, datetime
import random
from .permissions import IsAuthenticatedOrReadOnly, IsAdminUser, IsDriverOwner
import subprocess
import os
import sys
from django.db import transaction
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import JsonResponse

# Authentication views


@api_view(['POST'])
@authentication_classes([])  # No authentication required for login
@permission_classes([])  # No permissions required for login
def driver_login(request):
    """
    Login for drivers with JWT token
    """
    username = request.data.get('username')
    password = request.data.get('password')
    role = request.data.get('role')

    if not username or not password:
        return Response({'error': 'Please provide both username and password'},
                        status=status.HTTP_400_BAD_REQUEST)

    if role != 'driver':
        return Response({'error': 'Invalid role. Must be "driver"'},
                        status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)

    if not user:
        return Response({'error': 'Invalid credentials'},
                        status=status.HTTP_401_UNAUTHORIZED)

    # Check if the user is associated with a driver
    try:
        driver = Driver.objects.get(user=user)
    except Driver.DoesNotExist:
        return Response({'error': 'No driver profile associated with this user'},
                        status=status.HTTP_404_NOT_FOUND)

    # Generate JWT token
    refresh = RefreshToken.for_user(user)

    # Get driver data
    serializer = DriverSerializer(driver)

    return Response({
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'driver': serializer.data
    })


@api_view(['POST'])
@authentication_classes([])  # No authentication required for login
@permission_classes([])  # No permissions required for login
def admin_login(request):
    """
    Secure login for admin users
    """
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({'error': 'Please provide both username and password'},
                        status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)

    if not user:
        return Response({'error': 'Invalid credentials'},
                        status=status.HTTP_401_UNAUTHORIZED)

    # Check if user has admin/staff permissions
    if not (user.is_staff or user.is_superuser):
        return Response({'error': 'This user does not have admin privileges'},
                        status=status.HTTP_403_FORBIDDEN)

    # Generate JWT token
    refresh = RefreshToken.for_user(user)

    # Ensure user has admin permissions for the admin site
    if not user.is_staff:
        user.is_staff = True
        user.save()

    # Return admin user data
    return Response({
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': 'admin'
        }
    })


@api_view(['POST'])
def logout_view(request):
    """
    Logout current user with safety check for active alerts
    """
    if request.user.is_authenticated:
        try:
            # Check if the user is a driver
            try:
                driver = Driver.objects.get(user=request.user)

                # Check if driver has active alerts
                active_alerts = Alert.objects.filter(
                    driver=driver, status='assigned')

                if active_alerts.exists():
                    # Driver has active alerts, prevent logout
                    return Response({
                        'error': 'Cannot logout while you have active alerts',
                        'active_alerts': [
                            {
                                'id': alert.id,
                                'location': alert.location,
                                'created_at': alert.created_at
                            } for alert in active_alerts
                        ],
                        'message': 'Please complete or cancel your active alerts before logging out'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except Driver.DoesNotExist:
                # Not a driver, so proceed with logout
                pass

            # If we reach here, it's safe to logout
            logout(request)
            return Response({'message': 'Successfully logged out'})
        except Exception as e:
            print(f"Error during logout: {str(e)}")
            return Response({'error': f'Error during logout: {str(e)}'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({'message': 'You are not logged in'},
                    status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_data(request):
    """
    Get current authenticated user data with active alert status
    """
    try:
        # Handle both DRF and Django request objects
        if hasattr(request, '_request'):
            user = request._request.user
        else:
            user = request.user

        response_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'hasActiveAlert': False
        }

        # Check if user is a driver
        try:
            driver = Driver.objects.get(user=user)
            # Get driver data
            driver_serializer = DriverSerializer(driver)
            response_data.update(driver_serializer.data)
            
            # Check for active alert
            active_alert = Alert.objects.filter(
                driver=driver,
                status='assigned'
            ).first()
            
            response_data['hasActiveAlert'] = bool(active_alert)
            if active_alert:
                response_data['activeAlert'] = AlertSerializer(active_alert).data
                
        except Driver.DoesNotExist:
            # If not a driver, check if admin
            if user.is_staff or user.is_superuser:
                response_data.update({
                    'isAdmin': True,
                    'role': 'admin'
                })
            else:
                response_data.update({
                    'role': 'user'
                })

        return Response(response_data)
        
    except Exception as e:
        print(f"Error in get_user_data: {str(e)}")
        return Response(
            {'error': 'Failed to fetch user data', 'detail': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """
    Get current authenticated user data with active alert status
    """
    try:
        # Get the underlying Django request
        django_request = request._request
        return get_user_data(django_request)
    except Exception as e:
        print(f"Error in current_user: {str(e)}")
        return Response(
            {'error': 'Failed to fetch user data', 'detail': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    permission_classes = [IsAuthenticated]  # Base permission class

    def get_permissions(self):
        """
        Instantiate and return the list of permissions that this view requires.
        """
        if self.action in ['update', 'partial_update']:
            # For update operations, check if user is either admin or the driver
            return [IsAuthenticated()]
        elif self.action in ['create', 'destroy']:
            # Only admins can create or delete drivers
            return [IsAuthenticated(), IsAdminUser()]
        # For other actions like list and retrieve
        return [IsAuthenticated()]

    def check_object_permissions(self, request, obj):
        """
        Check if the user has permission to perform the requested action on the object.
        """
        super().check_object_permissions(request, obj)
        
        # Allow admins to do anything
        if request.user.is_staff or request.user.is_superuser:
            return True
            
        # For update operations, check if user is the driver
        if self.action in ['update', 'partial_update']:
            if hasattr(request.user, 'api_driver') and request.user.api_driver == obj:
                return True
            if obj.user and obj.user == request.user:
                return True
            raise PermissionError("You do not have permission to update this driver profile")

    def perform_update(self, serializer):
        """
        Perform the update operation.
        """
        instance = self.get_object()
        user = self.request.user
        
        # If user is admin, allow all updates
        if user.is_staff or user.is_superuser:
            serializer.save()
            return
            
        # If user is the driver, only allow certain fields to be updated
        if (hasattr(user, 'api_driver') and user.api_driver == instance) or (instance.user and instance.user == user):
            # Get the fields that drivers are allowed to update
            allowed_fields = {'name', 'contact_no', 'phone', 'email', 'address', 'photo'}
            data = {k: v for k, v in serializer.validated_data.items() if k in allowed_fields}
            serializer.save(**data)
            return
            
        raise PermissionError("You do not have permission to update this driver profile")

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
            print(
                f"CLEAN_PREVIOUS_USER - Looking for user: {username}",
                file=sys.stderr)
            user = User.objects.get(username=username)
            logger.debug(
                f"Found existing user with username '{username}', checking for related driver")
            print(
                f"CLEAN_PREVIOUS_USER - Found user: {username} (ID: {user.id})", file=sys.stderr)

            # Use transaction to ensure atomic operation
            with transaction.atomic():
                # Check for related driver
                try:
                    print(
                        f"CLEAN_PREVIOUS_USER - Looking for driver linked to user: {username}",
                        file=sys.stderr)
                    driver = Driver.objects.get(user=user)
                    logger.debug(
                        f"Found related driver (ID: {
                            driver.id}), deleting it")
                    print(
                        f"CLEAN_PREVIOUS_USER - Found driver (ID: {driver.id}), deleting", file=sys.stderr)

                    # Get any relationships before deleting
                    alert_count = driver.alerts.count() if hasattr(driver, 'alerts') else 0
                    if alert_count > 0:
                        print(
                            f"CLEAN_PREVIOUS_USER - Driver has {alert_count} associated alerts",
                            file=sys.stderr)

                    # Get ambulance associations
                    ambulance_count = driver.ambulances.count() if hasattr(driver, 'ambulances') else 0
                    if ambulance_count > 0:
                        print(
                            f"CLEAN_PREVIOUS_USER - Driver has {ambulance_count} associated ambulances",
                            file=sys.stderr)

                    # Break any associations
                    if alert_count > 0:
                        print(
                            "CLEAN_PREVIOUS_USER - Breaking alert associations",
                            file=sys.stderr)
                        driver.alerts.update(driver=None)

                    if ambulance_count > 0:
                        print(
                            "CLEAN_PREVIOUS_USER - Breaking ambulance associations",
                            file=sys.stderr)
                        driver.ambulances.update(driver=None)

                    # Now disconnect user from driver to avoid cascade issues
                    driver.user = None
                    driver.save()

                    # Delete the driver
                    driver.delete()
                    print(
                        f"CLEAN_PREVIOUS_USER - Successfully deleted driver for user '{username}'",
                        file=sys.stderr)
                except Driver.DoesNotExist:
                    logger.debug(
                        f"No related driver found for user '{username}'")
                    print(
                        f"CLEAN_PREVIOUS_USER - No related driver found for user '{username}'",
                        file=sys.stderr)
                except Exception as driver_error:
                    logger.error(f"Error deleting driver: {str(driver_error)}")
                    print(
                        f"CLEAN_PREVIOUS_USER - Error deleting driver: {str(driver_error)}", file=sys.stderr)
                    print(traceback.format_exc(), file=sys.stderr)
                    raise

                # Delete the user
                try:
                    logger.debug(f"Deleting user '{username}'")
                    print(
                        f"CLEAN_PREVIOUS_USER - Deleting user '{username}'",
                        file=sys.stderr)
                    user.delete()
                    logger.debug(f"Successfully deleted user '{username}'")
                    print(
                        f"CLEAN_PREVIOUS_USER - Successfully deleted user '{username}'",
                        file=sys.stderr)
                except Exception as user_error:
                    logger.error(f"Error deleting user: {str(user_error)}")
                    print(
                        f"CLEAN_PREVIOUS_USER - Error deleting user: {str(user_error)}", file=sys.stderr)
                    print(traceback.format_exc(), file=sys.stderr)
                    raise

            return True
        except User.DoesNotExist:
            logger.debug(f"No user found with username '{username}'")
            print(
                f"CLEAN_PREVIOUS_USER - No user found with username '{username}'",
                file=sys.stderr)
            return False
        except Exception as e:
            logger.error(f"Unexpected error in _clean_previous_user: {str(e)}")
            print(
                f"CLEAN_PREVIOUS_USER - Unexpected error: {str(e)}", file=sys.stderr)
            print(traceback.format_exc(), file=sys.stderr)
            raise

    def create(self, request, *args, **kwargs):
        """
        Custom create method with enhanced error handling
        """
        import logging
        import traceback
        import sys
        logger = logging.getLogger(__name__)

        try:
            logger.debug(
                "Starting driver creation with data: %s",
                request.data)
            print(f"DRIVER CREATION DATA: {request.data}", file=sys.stderr)

            # Check for required fields
            if not request.data.get('name'):
                return Response(
                    {'name': ['This field is required.']}, status=status.HTTP_400_BAD_REQUEST)

            # Check if username exists when provided
            if 'username' in request.data and request.data['username']:
                username = request.data['username']
                logger.debug("Checking if username '%s' exists", username)
                print(f"CHECKING USERNAME: {username}", file=sys.stderr)

                # If user exists, clean it up before proceeding
                if User.objects.filter(username=username).exists():
                    logger.debug(
                        f"Username '{username}' exists, cleaning up before recreation")
                    print(
                        f"USERNAME EXISTS, CLEANING UP: {username}",
                        file=sys.stderr)
                    try:
                        self._clean_previous_user(username)
                        logger.debug(
                            f"Cleanup complete, proceeding with creation of new driver with username '{username}'")
                        print(f"CLEANUP COMPLETE: {username}", file=sys.stderr)
                    except Exception as cleanup_error:
                        logger.error(
                            f"Error cleaning up user '{username}': {
                                str(cleanup_error)}")
                        print(
                            f"CLEANUP ERROR: {
                                str(cleanup_error)}",
                            file=sys.stderr)
                        print(traceback.format_exc(), file=sys.stderr)
                        return Response(
                            {
                                'error': f"Failed to clean up existing user: {
                                    str(cleanup_error)}"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Process the serializer
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                logger.error("Validation error: %s", serializer.errors)
                print(
                    f"VALIDATION ERROR: {
                        serializer.errors}",
                    file=sys.stderr)
                return Response(
                    serializer.errors,
                    status=status.HTTP_400_BAD_REQUEST)

            try:
                print("PERFORMING CREATE...", file=sys.stderr)
                self.perform_create(serializer)
                print("CREATE SUCCESSFUL", file=sys.stderr)
                headers = self.get_success_headers(serializer.data)
                return Response(
                    serializer.data,
                    status=status.HTTP_201_CREATED,
                    headers=headers)
            except Exception as e:
                logger.error("Error during driver creation: %s", str(e))
                logger.error(traceback.format_exc())
                print(f"CREATE ERROR: {str(e)}", file=sys.stderr)
                print(traceback.format_exc(), file=sys.stderr)
                return Response({'error': str(e)},
                                status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error("Unexpected error in create method: %s", str(e))
            logger.error(traceback.format_exc())
            print(f"UNEXPECTED ERROR: {str(e)}", file=sys.stderr)
            print(traceback.format_exc(), file=sys.stderr)
            return Response({'error': f'Internal server error: {str(e)}'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def available(self, request):
        drivers = Driver.objects.filter(status='available')
        serializer = self.get_serializer(drivers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'],
            permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Get the driver profile of the current authenticated user
        """
        # Check if the user is an admin
        if request.user.is_staff or request.user.is_superuser:
            # Return admin user data instead of a driver profile
            admin_data = {
                'id': request.user.id,
                'username': request.user.username,
                'name': f"{
                    request.user.first_name} {
                    request.user.last_name}".strip() or request.user.username,
                'email': request.user.email,
                'status': 'active',
                'role': 'admin',
                'is_admin': True}
            return Response(admin_data)

        # Otherwise, try to get the driver profile
        try:
            driver = Driver.objects.get(user=request.user)
            serializer = self.get_serializer(driver)
            return Response(serializer.data)
        except Driver.DoesNotExist:
            # If the user is authenticated but doesn't have a driver profile,
            # return a basic user profile instead of a 404 error
            basic_user_data = {
                'id': request.user.id,
                'username': request.user.username,
                'name': f"{
                    request.user.first_name} {
                    request.user.last_name}".strip() or request.user.username,
                'email': request.user.email,
                'status': 'available',
                'role': 'user',
                'is_admin': request.user.is_staff or request.user.is_superuser}
            return Response(basic_user_data)
        except Exception as e:
            # Catch any other exceptions to prevent 500 errors
            error_data = {
                'id': request.user.id if request.user else 'unknown',
                'username': request.user.username if request.user else 'unknown',
                'name': 'User',
                'error': str(e),
                'status': 'error',
                'role': 'unknown'}
            return Response(error_data)

    @action(detail=True, methods=['get'])
    def user_details(self, request, pk=None):
        """
        Get user details for a driver
        """
        driver = self.get_object()
        if not driver.user:
            return Response(
                {'error': 'This driver has no user account'}, status=status.HTTP_404_NOT_FOUND)

        user_serializer = UserSerializer(driver.user)
        return Response(user_serializer.data)

    @action(detail=True, methods=['put', 'patch'])
    def update_user_details(self, request, pk=None):
        """
        Update user details for a driver
        """
        driver = self.get_object()
        if not driver.user:
            # Create a new user if one doesn't exist
            username = request.data.get('username')
            password = request.data.get('password')
            email = request.data.get('email', '')

            if not username or not password:
                return Response(
                    {
                        'error': 'Username and password are required to create a user account'},
                    status=status.HTTP_400_BAD_REQUEST)

            user = User.objects.create(
                username=username,
                email=email,
                first_name=driver.name.split()[0] if driver.name else '',
                last_name=' '.join(
                    driver.name.split()[
                        1:]) if driver.name and len(
                    driver.name.split()) > 1 else '')
            user.set_password(password)
            user.save()

            # Link user to driver
            driver.user = user
            driver.save()

            user_serializer = UserSerializer(user)
            return Response(user_serializer.data)
        else:
            # Update existing user
            user = driver.user

            # Update username if provided
            if 'username' in request.data:
                user.username = request.data.get('username')

            # Update email if provided
            if 'email' in request.data:
                user.email = request.data.get('email')

            # Update password if provided
            if 'password' in request.data:
                user.set_password(request.data.get('password'))

            user.save()

            user_serializer = UserSerializer(user)
            return Response(user_serializer.data)

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """
        Reset a driver's password
        """
        driver = self.get_object()
        new_password = request.data.get('new_password')

        if not driver.user:
            return Response(
                {'error': 'This driver has no user account'}, status=status.HTTP_404_NOT_FOUND)

        if not new_password:
            return Response({'error': 'New password is required'},
                            status=status.HTTP_400_BAD_REQUEST)

        user = driver.user
        user.set_password(new_password)
        user.save()

        return Response({'message': 'Password reset successfully'},
                        status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        """
        Change a driver's password (requires current password)
        """
        driver = self.get_object()
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not driver.user:
            return Response(
                {'error': 'This driver has no user account'}, status=status.HTTP_404_NOT_FOUND)

        if not current_password or not new_password:
            return Response(
                {
                    'error': 'Current password and new password are required'},
                status=status.HTTP_400_BAD_REQUEST)

        # Make sure authorization is present
        if not request.auth:
            return Response({'error': 'Authentication required'},
                            status=status.HTTP_401_UNAUTHORIZED)

        user = driver.user

        # Check if the request is for the current user
        is_self = request.user == user
        is_admin = request.user.is_staff or request.user.is_superuser

        # Only allow if it's the user's own password or an admin
        if not (is_self or is_admin):
            return Response(
                {
                    'error': 'You do not have permission to change this password'},
                status=status.HTTP_403_FORBIDDEN)

        # Verify current password
        if not user.check_password(current_password):
            return Response({'error': 'Current password is incorrect'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Set the new password
        user.set_password(new_password)
        user.save()

        # If the user changed their own password, invalidate their current
        # tokens
        if is_self:
            # For JWT, we can't invalidate tokens without using a token blacklist
            # The user will need to log in again by clearing tokens on the
            # client side
            pass

        return Response(
            {'message': 'Password changed successfully'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def create_with_credentials(self, request):
        """
        Create a driver with login credentials
        """
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            driver = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def alert_history(self, request, pk=None):
        """
        Get full alert history for a specific driver
        """
        driver = self.get_object()

        # Get all alerts assigned to this driver
        alerts = driver.alerts.all().order_by('-created_at')

        # Get counts by status
        pending_count = alerts.filter(status='pending').count()
        assigned_count = alerts.filter(status='assigned').count()
        completed_count = alerts.filter(status='complete').count()

        # Format response with statistics and categorized alerts
        active_alert = alerts.filter(status='assigned').first()
        completed_alerts = alerts.filter(status='complete')

        # Serialize alerts with appropriate serializer
        active_serializer = AlertSerializer(
            active_alert) if active_alert else None
        completed_serializer = AlertSerializer(completed_alerts, many=True)

        response_data = {
            'driver_id': driver.id,
            'driver_name': driver.name,
            'stats': {
                'total_alerts': alerts.count(),
                'pending_count': pending_count,
                'assigned_count': assigned_count,
                'completed_count': completed_count,
            },
            'active_alert': active_serializer.data if active_serializer else None,
            'completed_alerts': completed_serializer.data}

        return Response(response_data)

    @action(detail=False, methods=['post'],
            permission_classes=[IsAuthenticated])
    def fix_incomplete_data(self, request):
        """
        Administrative endpoint to fix data inconsistencies,
        particularly completed alerts without drivers
        """
        # Only allow staff/admin users to use this endpoint
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({"error": "Admin privileges required"},
                            status=status.HTTP_403_FORBIDDEN)

        # Find completed alerts without drivers
        inconsistent_alerts = Alert.objects.filter(
            status='complete', driver=None)
        inconsistent_count = inconsistent_alerts.count()

        # Get available drivers to assign
        available_drivers = Driver.objects.filter(status='available')

        if not available_drivers.exists():
            return Response(
                {
                    "error": "No available drivers to fix data. Please create some drivers first."},
                status=status.HTTP_400_BAD_REQUEST)

        # Fix each inconsistent alert
        fixed_count = 0
        for alert in inconsistent_alerts:
            # Assign a random available driver
            driver = random.choice(available_drivers)
            alert.driver = driver
            alert.save()
            fixed_count += 1

        return Response({
            "message": f"Fixed {fixed_count} of {inconsistent_count} inconsistent alerts",
            "details": "Completed alerts without assigned drivers have been fixed"
        })

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

        logger.debug(
            f"Deleting driver with ID: {driver_id}, username: {username}")
        print(
            f"DESTROY - Deleting driver with ID: {driver_id}, username: {username}",
            file=sys.stderr)

        try:
            # Use transaction to ensure atomicity
            with transaction.atomic():
                # Check for related alerts and ambulances
                alert_count = driver.alerts.count() if hasattr(driver, 'alerts') else 0
                if alert_count > 0:
                    print(
                        f"DESTROY - Driver has {alert_count} associated alerts, breaking associations",
                        file=sys.stderr)
                    driver.alerts.update(driver=None)

                ambulance_count = driver.ambulances.count() if hasattr(driver, 'ambulances') else 0
                if ambulance_count > 0:
                    print(
                        f"DESTROY - Driver has {ambulance_count} associated ambulances, breaking associations",
                        file=sys.stderr)
                    driver.ambulances.update(driver=None)

                # If driver has user, delete the user as well
                if driver.user:
                    user = driver.user
                    print(
                        f"DESTROY - Driver has associated user (ID: {user.id}), will delete both", file=sys.stderr)

                    # We need to temporarily set driver.user to None to avoid
                    # issues with cascade delete
                    driver.user = None
                    driver.save()

                    # Now delete user
                    user.delete()
                    print(
                        f"DESTROY - Deleted user '{username}' (ID: {user.id})", file=sys.stderr)

                # Now delete the driver itself
                result = super().destroy(request, *args, **kwargs)
                print(
                    f"DESTROY - Deleted driver (ID: {driver_id})",
                    file=sys.stderr)

                return result
        except Exception as e:
            logger.error(f"Error during driver deletion: {str(e)}")
            print(
                f"DESTROY - Error during driver deletion: {str(e)}", file=sys.stderr)
            print(traceback.format_exc(), file=sys.stderr)
            return Response(
                {'error': f'Failed to delete driver: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'],
            permission_classes=[IsAuthenticated])
    def reset_driver_status(self, request):
        """
        Reset a driver's status and clear any assigned alerts that might be in an inconsistent state.
        This is the primary method for fixing driver status inconsistencies.
        """
        try:
            # Get the driver ID from the request - handle both form data and JSON
            driver_id = request.data.get('driver_id')
            if not driver_id and request.POST:
                driver_id = request.POST.get('driver_id')

            # Get the current user for logging
            username = request.user.username if hasattr(
                request.user, 'username') else 'unknown'

            print(
                f"Driver status reset requested by user '{username}' for driver_id: {driver_id}")

            if not driver_id:
                # If no driver_id provided, try to get the current user's
                # driver profile
                try:
                    driver = Driver.objects.get(user=request.user)
                    driver_id = driver.id
                    print(
                        f"No driver_id provided, using current user's driver profile: {driver_id}")
                except Driver.DoesNotExist:
                    return Response(
                        {"error": "No driver_id provided and no driver profile found for current user"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                # Convert to integer if it's a string
                if isinstance(driver_id, str) and driver_id.isdigit():
                    driver_id = int(driver_id)

                # Try to get the driver by ID
                try:
                    driver = Driver.objects.get(id=driver_id)
                except Driver.DoesNotExist:
                    return Response(
                        {"error": f"Driver with ID {driver_id} not found"},
                        status=status.HTTP_404_NOT_FOUND
                    )

            # Reset the driver's status
            current_status = driver.status
            driver.status = 'available'
            driver.save()
            print(
                f"Reset driver {driver.id} ({driver.name}) status from '{current_status}' to 'available'")

            # Check if there are any alerts assigned to this driver
            assigned_alerts = Alert.objects.filter(
                driver=driver, status='assigned')
            assigned_count = assigned_alerts.count()
            print(
                f"Found {assigned_count} assigned alerts for driver {driver.id}")

            # Reset all assigned alerts to pending
            alert_ids = []
            if assigned_count > 0:
                for alert in assigned_alerts:
                    alert_ids.append(alert.id)
                    alert.status = 'pending'
                    alert.driver = None
                    alert.save()
                    print(
                        f"Reset alert {alert.id} from 'assigned' to 'pending' and removed driver assignment")

            return Response({
                "message": f"Reset driver status to available and cleared {assigned_count} assigned alerts",
                "driver_id": driver.id,
                "driver_name": driver.name,
                "status": driver.status,
                "previous_status": current_status,
                "cleared_alerts": alert_ids
            })

        except Exception as e:
            print(f"Error in reset_driver_status: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return Response(
                {"error": f"Server error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def performance(self, request, pk=None):
        """
        Get performance metrics for a specific driver
        """
        try:
            driver = self.get_object()
            
            # Get all alerts assigned to this driver
            alerts = Alert.objects.filter(driver=driver)
            
            # Calculate metrics
            total_trips = alerts.count()
            completed_trips = alerts.filter(status='complete').count()
            
            # Calculate average response time (in minutes)
            completed_with_time = alerts.filter(
                status='complete',
                response_time__isnull=False
            )
            
            # Initialize metrics with safe defaults
            avg_response_time = 0
            success_rate = 0
            avg_rating = 0
            
            # Calculate average response time if we have completed trips with response times
            if completed_with_time.exists():
                total_response_time = 0
                for alert in completed_with_time:
                    try:
                        # Extract numeric value from response time string (e.g., "10 mins" -> 10)
                        time_str = alert.response_time.split()[0]
                        total_response_time += float(time_str)
                    except (ValueError, IndexError, AttributeError):
                        continue
                avg_response_time = total_response_time / completed_with_time.count()
            
            # Calculate success rate if we have any trips
            if total_trips > 0:
                success_rate = (completed_trips / total_trips) * 100
            
            # Calculate average rating if we have rated alerts
            rated_alerts = alerts.filter(rating__isnull=False)
            if rated_alerts.exists():
                total_rating = sum(alert.rating for alert in rated_alerts)
                avg_rating = total_rating / rated_alerts.count()
            
            performance_data = {
                'totalTrips': total_trips,
                'completedTrips': completed_trips,
                'averageResponseTime': round(avg_response_time, 1),
                'successRate': round(success_rate, 1),
                'averageRating': round(avg_rating, 1)
            }
            
            return Response(performance_data)
            
        except Exception as e:
            print(f"Error calculating driver performance: {str(e)}")
            return Response(
                {"error": f"Failed to calculate performance metrics: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Get trip history for a specific driver
        """
        try:
            driver = self.get_object()
            
            # Get all alerts assigned to this driver
            alerts = Alert.objects.filter(driver=driver).order_by('-created_at')
            
            # Get driver history entries
            driver_history = DriverHistory.objects.filter(driver=driver).order_by('-created_at')
            
            # Transform alerts into history data
            history_data = []
            for alert in alerts:
                # Get the history entry for this alert if it exists
                alert_history = AlertHistory.objects.filter(alert=alert, driver=driver).first()
                
                # Transform status from 'complete' to 'completed' for frontend compatibility
                status = 'completed' if alert.status == 'complete' else alert.status
                
                history_item = {
                    'id': alert.id,  # Numeric ID
                    'alert_id': alert.alert_id,  # Formatted ID (e.g., A250419690)
                    'location': alert.location,
                    'created_at': alert.created_at,
                    'status': status,
                    'response_time': alert.response_time,
                    'completed_at': alert.completed_at,
                    'coordinates': {
                        'lat': alert.coordinates_lat,
                        'lng': alert.coordinates_lng
                    }
                }
                
                # Add history details if available
                if alert_history:
                    history_item.update({
                        'action': alert_history.action,
                        'details': alert_history.details,
                        'history_created_at': alert_history.created_at
                    })
                
                history_data.append(history_item)
            
            # Add any additional history entries that might not be tied to alerts
            for history in driver_history:
                if not any(h['id'] == history.alert.id for h in history_data if history.alert):
                    history_data.append({
                        'id': history.alert.id if history.alert else None,
                        'alert_id': history.alert.alert_id if history.alert else None,
                        'action': history.action,
                        'status_change': history.status_change,
                        'response_time': history.response_time,
                        'completed_at': history.completed_at,
                        'created_at': history.created_at,
                        'status': 'completed' if history.action == 'complete_alert' else 'pending'
                    })
            
            # Sort by created_at in descending order
            history_data.sort(key=lambda x: x.get('created_at', x.get('history_created_at')), reverse=True)
            
            # Log the data being returned
            print(f"Returning {len(history_data)} history entries for driver {driver.id}")
            
            return Response(history_data)
            
        except Driver.DoesNotExist:
            return Response(
                {'error': 'Driver not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"Error in history endpoint: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AmbulanceViewSet(viewsets.ModelViewSet):
    queryset = Ambulance.objects.all()
    serializer_class = AmbulanceSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def available(self, request):
        ambulances = Ambulance.objects.filter(status='available')
        serializer = self.get_serializer(ambulances, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'],
            permission_classes=[IsAuthenticated])
    def my_ambulance(self, request):
        """
        Get the ambulance assigned to the current driver
        """
        try:
            driver = Driver.objects.get(user=request.user)
            ambulance = Ambulance.objects.filter(driver=driver).first()

            if not ambulance:
                return Response(
                    {'error': 'No ambulance assigned to this driver'}, status=status.HTTP_404_NOT_FOUND)

            serializer = self.get_serializer(ambulance)
            return Response(serializer.data)
        except Driver.DoesNotExist:
            return Response({'error': 'Driver profile not found'},
                            status=status.HTTP_404_NOT_FOUND)


class AlertViewSet(viewsets.ModelViewSet):
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
        """Create a new alert with video handling"""
        try:
            # Handle video upload if present
            if 'accident_clip' in request.FILES:
                # Generate a URL for the uploaded file
                file_name = request.FILES['accident_clip'].name
                request.data['video_url'] = f'/media/accident_clips/{file_name}'
            
            return super().create(request, *args, **kwargs)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def list(self, request, *args, **kwargs):
        """
        Override the list method to ensure we return ALL alerts without time filtering
        """
        # Get all alerts without any time-based filtering
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        # Log the number of alerts being returned for debugging
        print(
            f"Returning {len(serializer.data)} alerts from AlertViewSet list method")

        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def assign_driver(self, request, pk=None):
        """
        Assign a driver to an alert with enhanced error handling and data validation
        to prevent inconsistencies from occurring
        """
        try:
            alert = self.get_object()
            
            # Log the full request for debugging
            print(f"assign_driver request data: {request.data}")
            print(f"request content type: {request.content_type}")
            
            # Get driver_id from request data with better error handling
            driver_id = None
            
            # Handle both JSON and form data
            if request.content_type == 'application/json':
                if isinstance(request.data, dict):
                    driver_id = request.data.get('driver_id')
                else:
                    try:
                        import json
                        data = json.loads(request.data)
                        driver_id = data.get('driver_id')
                    except json.JSONDecodeError:
                        pass
            else:
                # Handle form data
                driver_id = request.POST.get('driver_id') or request.data.get('driver_id')
            
            if not driver_id:
                return Response(
                    {"error": "Driver ID is required", "received_data": request.data},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Convert to integer if it's a string
            if isinstance(driver_id, str) and driver_id.isdigit():
                driver_id = int(driver_id)
            
            # Try to get the driver by ID
            try:
                driver = Driver.objects.get(id=driver_id)
            except Driver.DoesNotExist:
                return Response(
                    {"error": f"Driver with ID {driver_id} not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if alert is already assigned to the same driver - if so, just return success
            if alert.status == 'assigned' and alert.driver and alert.driver.id == driver.id:
                print(f"Alert {alert.id} is already assigned to driver {driver.name} (ID: {driver.id})")
                serializer = self.get_serializer(alert)
                return Response(serializer.data)
            
            # Start a transaction to ensure atomic operations
            with transaction.atomic():
                # Check if driver already has an active alert - with detailed logging
                active_alerts = Alert.objects.filter(driver=driver, status='assigned')
                
                if active_alerts.exists():
                    active_alert = active_alerts.first()
                    error_msg = f"Driver {driver.name} (ID: {driver.id}) already has an active alert (ID: {active_alert.id})"
                    print(error_msg)
                    return Response(
                        {"error": error_msg},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Check if alert is already assigned to a different driver
                if alert.status == 'assigned' and alert.driver and alert.driver.id != driver.id:
                    current_driver = alert.driver
                    error_msg = f"Alert is already assigned to driver {current_driver.name} (ID: {current_driver.id})"
                    print(error_msg)
                    return Response(
                        {"error": error_msg},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Clear any other assigned alerts for this driver (shouldn't happen, but ensure consistency)
                other_assigned_alerts = Alert.objects.filter(driver=driver, status='assigned').exclude(id=alert.id)
                if other_assigned_alerts.exists():
                    print(f"Warning: Found {other_assigned_alerts.count()} other assigned alerts for driver {driver.id}")
                    # Reset all other alerts to pending and remove driver assignment
                    for other_alert in other_assigned_alerts:
                        print(f"Resetting alert {other_alert.id} from 'assigned' to 'pending'")
                        other_alert.status = 'pending'
                        other_alert.driver = None
                        other_alert.save()
                
                # Update the alert with driver info and status
                previous_status = alert.status
                alert.driver = driver
                alert.status = 'assigned'
                alert.assigned_at = timezone.now()
                alert.save()
                
                # Update driver status to unavailable when alert is assigned
                if driver:
                    previous_driver_status = driver.status
                    driver.status = 'unavailable'  # Changed from 'available' to 'unavailable'
                    driver.save()
                    print(f"Updated driver {driver.name} (ID: {driver.id}) from '{previous_driver_status}' to 'unavailable' status")
                
                # Log the assignment for tracking
                print(f"Alert {alert.id} assigned to driver {driver.name} (ID: {driver.id})")
                print(f"Alert status changed from {previous_status} to 'assigned'")
                
                serializer = self.get_serializer(alert)
                return Response(serializer.data)
                
        except Exception as e:
            print(f"Error in assign_driver: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return Response(
                {"error": f"Server error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Mark an alert as complete with better error handling and
        improved data consistency checks
        """
        try:
            alert = self.get_object()
            response_time = request.data.get('response_time')
            completed_at = request.data.get('completed_at')

            if not response_time:
                return Response(
                    {"error": "Response time is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verify driver exists and is valid
            driver = alert.driver

            # Case 1: Alert has no driver assigned - fix this inconsistency
            if not driver:
                # This is an inconsistency - we should log it
                print(f"Warning: Attempt to complete alert {alert.id} without driver assignment")

                # If the user who made the request is a driver, use them
                try:
                    driver = Driver.objects.get(user=request.user)
                    alert.driver = driver
                    print(f"Auto-assigned driver {driver.name} (ID: {driver.id}) to alert {alert.id} during completion")
                except Driver.DoesNotExist:
                    # Cannot complete without a driver and couldn't auto-assign
                    return Response(
                        {"error": "Cannot complete alert without assigned driver"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Update alert status and response time
            previous_status = alert.status
            alert.status = 'complete'
            alert.response_time = str(response_time)  # Convert to string to ensure compatibility
            alert.completed_at = completed_at or timezone.now()
            alert.save()

            # Create alert history entry
            AlertHistory.objects.create(
                alert=alert,
                driver=driver,
                action='complete',
                status='complete',
                response_time=str(response_time),
                completed_at=alert.completed_at,
                details=f"Alert completed by driver {driver.name} with response time {response_time} minutes"
            )

            # Update driver status to available
            if driver:
                # Update driver status to available regardless of their current status
                previous_driver_status = driver.status
                driver.status = 'available'
                driver.save()
                
                # Update driver history
                DriverHistory.objects.create(
                    driver=driver,
                    alert=alert,
                    action='complete_alert',
                    status_change=f"from '{previous_driver_status}' to 'available'",
                    response_time=str(response_time),
                    completed_at=alert.completed_at
                )
                
                print(f"Reset driver {driver.name} (ID: {driver.id}) from '{previous_driver_status}' to 'available' status")

            # Log the completion for tracking
            print(f"Alert {alert.id} completed by driver {driver.name if driver else 'Unknown'} with response time {response_time} minutes")
            print(f"Alert status changed from {previous_status} to complete")

            # Return the updated alert data
            serializer = self.get_serializer(alert)
            return Response(serializer.data)
            
        except Exception as e:
            # Log the full error for debugging
            import traceback
            print(f"Unexpected error in complete alert: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {"error": f"Server error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def pending(self, request):
        pending_alerts = Alert.objects.filter(
            status='pending').order_by('-created_at')
        serializer = self.get_serializer(pending_alerts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def assigned(self, request):
        alerts = Alert.objects.filter(status='assigned')
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def completed(self, request):
        alerts = Alert.objects.filter(status='complete')
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'],
            permission_classes=[IsAuthenticated])
    def my_alerts(self, request):
        """
        Get alerts assigned to the current driver
        """
        try:
            driver = Driver.objects.get(user=request.user)
            alerts = Alert.objects.filter(
                driver=driver).order_by('-created_at')
            serializer = self.get_serializer(alerts, many=True)
            return Response(serializer.data)
        except Driver.DoesNotExist:
            return Response({'error': 'Driver profile not found'},
                            status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'],
            permission_classes=[IsAuthenticated])
    def my_active_alert(self, request):
        """
        Get the active alert for the current driver (assigned but not completed)
        """
        try:
            driver = Driver.objects.get(user=request.user)
            alert = Alert.objects.filter(
                driver=driver, status='assigned').first()

            if not alert:
                return Response({'error': 'No active alert found'},
                                status=status.HTTP_404_NOT_FOUND)

            serializer = self.get_serializer(alert)
            return Response(serializer.data)
        except Driver.DoesNotExist:
            return Response({'error': 'Driver profile not found'},
                            status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'],
            permission_classes=[IsAuthenticated])
    def reset_driver_status(self, request):
        """
        Reset a driver's status and clear any assigned alerts that might be in an inconsistent state.
        This is the primary method for fixing driver status inconsistencies.
        """
        try:
            # Get the driver ID from the request - handle both form data and JSON
            driver_id = request.data.get('driver_id')
            if not driver_id and request.POST:
                driver_id = request.POST.get('driver_id')

            # Get the current user for logging
            username = request.user.username if hasattr(
                request.user, 'username') else 'unknown'

            print(
                f"Driver status reset requested by user '{username}' for driver_id: {driver_id}")

            if not driver_id:
                # If no driver_id provided, try to get the current user's
                # driver profile
                try:
                    driver = Driver.objects.get(user=request.user)
                    driver_id = driver.id
                    print(
                        f"No driver_id provided, using current user's driver profile: {driver_id}")
                except Driver.DoesNotExist:
                    return Response(
                        {"error": "No driver_id provided and no driver profile found for current user"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                # Convert to integer if it's a string
                if isinstance(driver_id, str) and driver_id.isdigit():
                    driver_id = int(driver_id)

                # Try to get the driver by ID
                try:
                    driver = Driver.objects.get(id=driver_id)
                except Driver.DoesNotExist:
                    return Response(
                        {"error": f"Driver with ID {driver_id} not found"},
                        status=status.HTTP_404_NOT_FOUND
                    )

            # Reset the driver's status
            current_status = driver.status
            driver.status = 'available'
            driver.save()
            print(
                f"Reset driver {driver.id} ({driver.name}) status from '{current_status}' to 'available'")

            # Check if there are any alerts assigned to this driver
            assigned_alerts = Alert.objects.filter(
                driver=driver, status='assigned')
            assigned_count = assigned_alerts.count()
            print(
                f"Found {assigned_count} assigned alerts for driver {driver.id}")

            # Reset all assigned alerts to pending
            alert_ids = []
            if assigned_count > 0:
                for alert in assigned_alerts:
                    alert_ids.append(alert.id)
                    alert.status = 'pending'
                    alert.driver = None
                    alert.save()
                    print(
                        f"Reset alert {alert.id} from 'assigned' to 'pending' and removed driver assignment")

            return Response({
                "message": f"Reset driver status to available and cleared {assigned_count} assigned alerts",
                "driver_id": driver.id,
                "driver_name": driver.name,
                "status": driver.status,
                "previous_status": current_status,
                "cleared_alerts": alert_ids
            })

        except Exception as e:
            print(f"Error in reset_driver_status: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return Response(
                {"error": f"Server error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AccidentViewSet(viewsets.ModelViewSet):
    queryset = Accident.objects.all().order_by('-date', '-time')
    serializer_class = AccidentSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def recent(self, request):
        # Get accidents from the last 30 days
        thirty_days_ago = timezone.now().date() - timedelta(days=30)
        accidents = Accident.objects.filter(date__gte=thirty_days_ago)
        serializer = self.get_serializer(accidents, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def hotspots(self, request):
        # Group accidents by location and count them
        accidents = Accident.objects.all()
        serializer = self.get_serializer(accidents, many=True)

        # In a real implementation, you would use database aggregation
        # This is a simplified version for the example
        locations = {}
        for accident in serializer.data:
            location = accident['location']
            if location in locations:
                locations[location]['count'] += 1
            else:
                locations[location] = {
                    'location': location,
                    'coordinates': accident['coordinates'],
                    'count': 1
                }

        hotspots = [locations[loc] for loc in locations]
        hotspots.sort(key=lambda x: x['count'], reverse=True)

        return Response(hotspots[:10])  # Return top 10 hotspots


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_statistics(request):
    """
    Get dashboard statistics for all alerts - filtering will be handled on the frontend
    """
    # Check if specific time filtering is requested
    time_filter = request.query_params.get(
        'time_filter', 'all')  # Default to 'all'

    print(f"Statistics requested with time_filter: {time_filter}")

    # Initialize queryset for alerts without time filtering
    alerts_queryset = Alert.objects.all()

    # Apply time filtering only if explicitly requested
    if time_filter == 'recent':
        # If recent data is requested, apply 24-hour filter
        last_24_hours = timezone.now() - timedelta(hours=24)
        alerts_queryset = alerts_queryset.filter(created_at__gte=last_24_hours)

    # Count alerts by status
    total_alerts = alerts_queryset.count()
    pending_alerts = alerts_queryset.filter(status='pending').count()
    completed_alerts = alerts_queryset.filter(status='complete').count()
    assigned_alerts = alerts_queryset.filter(status='assigned').count()

    print(
        f"Statistics counts: total={total_alerts}, pending={pending_alerts}, completed={completed_alerts}")

    # Keep these counts for context
    total_accidents = Accident.objects.count()
    total_ambulances = Ambulance.objects.count()
    available_ambulances = Ambulance.objects.filter(status='available').count()

    total_drivers = Driver.objects.count()
    available_drivers = Driver.objects.filter(status='available').count()

    # Calculate average response time from all completed alerts
    completed_alerts_objs = alerts_queryset.filter(status='complete')

    if completed_alerts_objs.exists():
        # Extract numeric values from response_time strings like "10 mins"
        response_times = []
        for alert in completed_alerts_objs:
            if alert.response_time:
                try:
                    # Extract number from strings like "10 mins"
                    time_str = alert.response_time.split()[0]
                    response_times.append(float(time_str))
                except (ValueError, IndexError):
                    pass

        avg_response_time = sum(response_times) / \
            len(response_times) if response_times else 9
    else:
        # Default if no completed alerts
        avg_response_time = 9

    return Response({
        'total_accidents': total_accidents,
        'total_alerts': total_alerts,
        'pending_alerts': pending_alerts,
        'completed_alerts': completed_alerts,
        'assigned_alerts': assigned_alerts,
        'total_ambulances': total_ambulances,
        'available_ambulances': available_ambulances,
        'total_drivers': total_drivers,
        'available_drivers': available_drivers,
        'avg_response_time': avg_response_time,
        'accident_trends': {
            'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            'data': [12, 19, 15, 8, 22, 14]
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_heatmap_data(request):
    """
    Get heatmap data for accident locations
    """
    accidents = Accident.objects.all()
    points = []

    for accident in accidents:
        points.append({
            'lat': accident.coordinates_lat,
            'lng': accident.coordinates_lng,
            'weight': accident.severity == 'High' and 3 or (accident.severity == 'Medium' and 2 or 1)
        })

    return Response(points)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clean_database(request):
    """
    Administrative endpoint to clean up database inconsistencies
    related to the driver status two-state system
    """
    # Only allow staff/admin users to use this endpoint
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({"error": "Admin privileges required"},
                        status=status.HTTP_403_FORBIDDEN)

    updates = {
        'driver_updates': 0,
        'alert_updates': 0,
        'ambulance_updates': 0
    }

    # Run in a transaction to ensure consistency
    with transaction.atomic():
        try:
            # Clean up driver statuses
            # Get all drivers with invalid statuses
            invalid_drivers = Driver.objects.exclude(
                status__in=['available', 'unavailable'])

            # Update all invalid statuses to 'available'
            for driver in invalid_drivers:
                old_status = driver.status
                driver.status = 'available'
                driver.save()
                updates['driver_updates'] += 1
                print(
                    f"Updated driver {
                        driver.id} ({
                        driver.name}) status from '{old_status}' to 'available'")

            # Ensure drivers with active alerts are marked as unavailable
            drivers_with_alerts = Driver.objects.filter(
                alerts__status='assigned').distinct()
            for driver in drivers_with_alerts:
                if driver.status != 'unavailable':
                    old_status = driver.status
                    driver.status = 'unavailable'
                    driver.save()
                    updates['driver_updates'] += 1
                    print(
                        f"Updated driver {
                            driver.id} ({
                            driver.name}) status from '{old_status}' to 'unavailable' due to active alert")

            # Fix alerts that are assigned but have no driver
            no_driver_alerts = Alert.objects.filter(
                status='assigned', driver=None)

            # Reset these alerts to pending
            for alert in no_driver_alerts:
                alert.status = 'pending'
                alert.save()
                updates['alert_updates'] += 1
                print(
                    f"Reset alert {
                        alert.id} from 'assigned' to 'pending' (no driver assigned)")

            # Fix the case where a driver has multiple assigned alerts
            for driver in drivers_with_alerts:
                assigned_alerts = Alert.objects.filter(
                    driver=driver, status='assigned')
                if assigned_alerts.count() > 1:
                    print(
                        f"Driver {
                            driver.id} ({
                            driver.name}) has {
                            assigned_alerts.count()} active alerts")

                    # Keep the most recent alert and reset others to
                    # pending
                    most_recent = assigned_alerts.order_by(
                        '-updated_at').first()
                    alerts_to_reset = assigned_alerts.exclude(
                        id=most_recent.id)

                    for alert in alerts_to_reset:
                        alert.status = 'pending'
                        alert.driver = None
                        alert.save()
                        updates['alert_updates'] += 1
                        print(
                            f"Reset alert {
                                alert.id} from 'assigned' to 'pending' (driver had multiple assignments)")

            # Clean up ambulance statuses
            # Get all ambulances with invalid statuses
            invalid_ambulances = Ambulance.objects.exclude(
                status__in=['available', 'unavailable'])

            # Update all invalid statuses to 'available'
            for ambulance in invalid_ambulances:
                old_status = ambulance.status
                ambulance.status = 'available'
                ambulance.save()
                updates['ambulance_updates'] += 1
                print(
                    f"Updated ambulance {
                        ambulance.id} ({
                        ambulance.vehicle_no}) status from '{old_status}' to 'available'")

            # Ensure ambulances with active drivers are marked as unavailable
            ambulances_with_drivers = Ambulance.objects.filter(
                driver__status='unavailable')
            for ambulance in ambulances_with_drivers:
                if ambulance.status != 'unavailable':
                    old_status = ambulance.status
                    ambulance.status = 'unavailable'
                    ambulance.save()
                    updates['ambulance_updates'] += 1
                    print(
                        f"Updated ambulance {
                            ambulance.id} ({
                            ambulance.vehicle_no}) status from '{old_status}' to 'unavailable' due to driver status")

            # Calculate total updates
            total_updates = sum(updates.values())

            return Response({
                "success": True,
                "message": f"Database cleanup completed successfully with {total_updates} updates",
                "updates": updates
            })

        except Exception as e:
            print(f"Error cleaning database: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return Response(
                {"error": f"Database cleanup failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clean_alerts(request):
    """
    Administrative endpoint to clean up alert inconsistencies and synchronize driver statuses
    Only assigned alerts will be affected, pending and completed alerts remain untouched
    """
    # Only allow staff/admin users to use this endpoint
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({"error": "Admin privileges required"},
                        status=status.HTTP_403_FORBIDDEN)

    # Check if force mode is requested
    force_cleanup = request.data.get('force', False)

    updates = {
        'alert_updates': 0,
        'driver_updates': 0
    }

    # Run in a transaction to ensure consistency
    with transaction.atomic():
        try:
            # 1. Get all assigned alerts
            assigned_alerts = Alert.objects.filter(status='assigned')
            assigned_count = assigned_alerts.count()

            print(f"Found {assigned_count} alerts with 'assigned' status")

            if force_cleanup:
                # If force mode, reset all assigned alerts to pending
                for alert in assigned_alerts:
                    # Store the driver for status update later
                    driver = alert.driver

                    # Reset the alert
                    alert.status = 'pending'
                    alert.driver = None
                    alert.save()

                    updates['alert_updates'] += 1
                    print(
                        f"Reset alert {
                            alert.id} from 'assigned' to 'pending' (force cleanup)")
            else:
                # Find alerts that are assigned but have no driver
                no_driver_alerts = assigned_alerts.filter(driver=None)

                # Reset these alerts to pending
                for alert in no_driver_alerts:
                    alert.status = 'pending'
                    alert.save()
                    updates['alert_updates'] += 1
                    print(
                        f"Reset alert {
                            alert.id} from 'assigned' to 'pending' (no driver assigned)")

                # Find alerts that are assigned but were created or updated
                # more than 2 days ago (likely stale)
                two_days_ago = timezone.now() - timezone.timedelta(days=2)
                stale_alerts = assigned_alerts.filter(
                    updated_at__lt=two_days_ago)

                # Reset these alerts to pending
                for alert in stale_alerts:
                    # Store the driver for status update later
                    driver = alert.driver

                    # Reset the alert
                    alert.status = 'pending'
                    alert.driver = None
                    alert.save()

                    updates['alert_updates'] += 1
                    print(
                        f"Reset alert {
                            alert.id} from 'assigned' to 'pending' (stale alert)")

                # Fix the case where a driver has multiple assigned alerts
                drivers_with_alerts = Driver.objects.filter(
                    alerts__status='assigned').distinct()
                for driver in drivers_with_alerts:
                    assigned_alerts = Alert.objects.filter(
                        driver=driver, status='assigned')
                    if assigned_alerts.count() > 1:
                        print(
                            f"Driver {
                                driver.id} ({
                                driver.name}) has {
                                assigned_alerts.count()} active alerts")

                        # Keep the most recent alert and reset others to
                        # pending
                        most_recent = assigned_alerts.order_by(
                            '-updated_at').first()
                        alerts_to_reset = assigned_alerts.exclude(
                            id=most_recent.id)

                        for alert in alerts_to_reset:
                            alert.status = 'pending'
                            alert.driver = None
                            alert.save()
                            updates['alert_updates'] += 1
                            print(
                                f"Reset alert {
                                    alert.id} from 'assigned' to 'pending' (driver had multiple assignments)")

            # 2. Synchronize driver statuses with their alert assignments
            drivers = Driver.objects.all()

            for driver in drivers:
                # Check if driver has any assigned alerts
                has_assigned_alerts = Alert.objects.filter(
                    driver=driver, status='assigned').exists()

                # Update driver status if needed
                if has_assigned_alerts and driver.status != 'unavailable':
                    old_status = driver.status
                    driver.status = 'unavailable'
                    driver.save()
                    updates['driver_updates'] += 1
                    print(
                        f"Updated driver {
                            driver.id} ({
                            driver.name}) status to 'unavailable' (has assigned alert)")

                elif not has_assigned_alerts and driver.status != 'available':
                    old_status = driver.status
                    driver.status = 'available'
                    driver.save()
                    updates['driver_updates'] += 1
                    print(
                        f"Updated driver {
                            driver.id} ({
                            driver.name}) status to 'available' (no assigned alerts)")

            # Calculate total updates
            total_updates = sum(updates.values())

            return Response({
                "success": True,
                "message": f"Alert cleanup completed successfully with {total_updates} updates",
                "updates": updates,
                "details": {
                    "alerts_fixed": updates['alert_updates'],
                    "drivers_updated": updates['driver_updates']
                }
            })
        except Exception as e:
            print(f"Error cleaning alerts: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return Response(
                {"error": f"Alert cleanup failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def admin_profile(request):
    """
    Get or update admin user profile
    """
    # Check if the user is an admin
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({"error": "Admin privileges required"},
                        status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        # Return admin user data
        user_data = {
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'is_staff': request.user.is_staff,
            'is_superuser': request.user.is_superuser,
            'role': 'admin'
        }
        return Response(user_data)

    elif request.method == 'PUT':
        # Update admin user data
        user = request.user

        # Update fields if provided
        if 'username' in request.data:
            # Check if username is already taken
            if User.objects.filter(
                    username=request.data['username']).exclude(
                    id=user.id).exists():
                return Response({"error": "Username already taken"},
                                status=status.HTTP_400_BAD_REQUEST)
            user.username = request.data['username']

        if 'email' in request.data:
            # Check if email is already taken
            if User.objects.filter(
                    email=request.data['email']).exclude(
                    id=user.id).exists():
                return Response({"error": "Email already taken"},
                                status=status.HTTP_400_BAD_REQUEST)
            user.email = request.data['email']

        if 'first_name' in request.data:
            user.first_name = request.data['first_name']

        if 'last_name' in request.data:
            user.last_name = request.data['last_name']

        user.save()

        # Return updated user data
        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'role': 'admin'
        }
        return Response(user_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_change_password(request):
    """
    Change admin user password
    """
    # Check if the user is an admin
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({"error": "Admin privileges required"},
                        status=status.HTTP_403_FORBIDDEN)

    # Get current and new passwords
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')

    if not current_password or not new_password:
        return Response({"error": "Current password and new password are required"},
                        status=status.HTTP_400_BAD_REQUEST)

    user = request.user

    # Verify current password
    if not user.check_password(current_password):
        return Response({"error": "Current password is incorrect"},
                        status=status.HTTP_400_BAD_REQUEST)

    # Set new password
    user.set_password(new_password)
    user.save()

    # Generate new tokens
    refresh = RefreshToken.for_user(user)

    return Response({
        "message": "Password changed successfully",
        "refresh": str(refresh),
        "access": str(refresh.access_token)
    })


@api_view(['GET', 'OPTIONS'])
@permission_classes([AllowAny])
def status_check(request):
    """Simple endpoint to check if the server is running"""
    return JsonResponse({
        'status': 'ok',
        'message': 'Server is running'
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})
