from rest_framework import permissions

class IsAuthenticatedOrReadOnly(permissions.BasePermission):
    """
    Custom permission to allow read-only access to unauthenticated users.
    For any other operations, users must be authenticated.
    """
    def has_permission(self, request, view):
        # Allow GET, HEAD, OPTIONS requests for everyone
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # For any other methods, require authentication
        return request.user and request.user.is_authenticated

class IsAdminUser(permissions.BasePermission):
    """
    Custom permission to only allow admin users to access a view.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser)

class IsDriverOwner(permissions.BasePermission):
    """
    Custom permission to only allow drivers to access their own data.
    """
    def has_permission(self, request, view):
        # Allow all authenticated requests to pass through to has_object_permission
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True

        # Check if user is associated with the driver
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # Check if user is the driver
        if hasattr(request.user, 'api_driver'):
            return obj == request.user.api_driver

        return False 