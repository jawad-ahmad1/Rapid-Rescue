from django.db import models
from django.contrib.auth.models import User

# No custom models needed for authentication since we're using Django's built-in User model
# However, we could create a UserProfile model if needed in the future

class UserSession(models.Model):
    """
    Model for tracking user sessions
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    session_key = models.CharField(max_length=40)
    user_agent = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    login_time = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.login_time}"
        
    class Meta:
        ordering = ['-login_time']
        verbose_name = 'User Session'
        verbose_name_plural = 'User Sessions'
