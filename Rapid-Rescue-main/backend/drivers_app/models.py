from django.db import models
from django.contrib.auth.models import User

class Driver(models.Model):
    """
    Model representing a driver in the Rapid Rescue system.
    """
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='drivers_app_driver'
    )
    name = models.CharField(max_length=100)
    contact_no = models.CharField(max_length=20, null=True, blank=True)
    status = models.CharField(max_length=20, default='available', 
                              choices=[
                                  ('available', 'Available'),
                                  ('on_duty', 'On Duty'),
                                  ('offline', 'Offline'),
                                  ('on_leave', 'On Leave')
                              ])
    license_no = models.CharField(max_length=50, null=True, blank=True)
    experience = models.PositiveIntegerField(default=0)
    address = models.TextField(null=True, blank=True)
    photo = models.ImageField(upload_to='driver_photos/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
        
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Driver'
        verbose_name_plural = 'Drivers'
