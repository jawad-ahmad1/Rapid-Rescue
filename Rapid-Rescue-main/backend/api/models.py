from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.utils import timezone

# Create your models here.

class Driver(models.Model):
    # Define status choices for clarity and consistency
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('unavailable', 'Unavailable'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, null=True, blank=True)  # This maps to contact_no in frontend
    email = models.EmailField(null=True, blank=True)
    experience = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    location_lat = models.FloatField(null=True, blank=True)
    location_lng = models.FloatField(null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)     
    # Replace the current status field with a simpler two-state field
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    photo = models.ImageField(upload_to='driver_photos/', null=True, blank=True)
    # Add new fields for address and license_no
    address = models.TextField(null=True, blank=True)
    license_no = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.id})"

    def save(self, *args, **kwargs):
        if not self.created_at:
            self.created_at = timezone.now()
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-created_at']

class Ambulance(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('unavailable', 'Unavailable'),
    ]
    
    vehicle_no = models.CharField(max_length=20)
    model = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='ambulances')
    location_lat = models.FloatField(null=True, blank=True)
    location_lng = models.FloatField(null=True, blank=True)

    def __str__(self):
        return self.vehicle_no

class Alert(models.Model):
    PRIORITY_CHOICES = [
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('assigned', 'Assigned'),
        ('complete', 'Complete'),
        ('rejected', 'Rejected'),
    ]
    
    alert_id = models.CharField(max_length=10, unique=True)
    time = models.CharField(max_length=20)
    date = models.CharField(max_length=20)
    location = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='alerts')
    response_time = models.CharField(max_length=20, null=True, blank=True)
    coordinates_lat = models.FloatField()
    coordinates_lng = models.FloatField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='high')
    type = models.CharField(max_length=50, default='Emergency')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    rating = models.FloatField(null=True, blank=True)  # Rating from 1-5
    video_url = models.URLField(max_length=500, null=True, blank=True)
    accident_clip = models.FileField(upload_to='accident_clips/', null=True, blank=True)

    def get_location_name(self):
        """Get a proper location name based on coordinates"""
        if not self.coordinates_lat or not self.coordinates_lng:
            return "Location not available"
            
        # Define Lahore area names based on coordinates
        LAHORE_LOCATIONS = {
            (31.4697, 74.2728): 'Johar Town, Lahore',
            (31.4818, 74.3162): 'Model Town, Lahore',
            (31.4750, 74.2900): 'DHA Phase 5, Lahore',
            (31.5010, 74.3440): 'Gulberg III, Lahore',
            (31.4920, 74.3000): 'Garden Town, Lahore',
            (31.4833, 74.2833): 'Allama Iqbal Town, Lahore',
            (31.4989, 74.3475): 'Cavalry Ground, Lahore',
            (31.4833, 74.3000): 'Faisal Town, Lahore'
        }
        
        # Find the closest location
        closest_location = min(
            LAHORE_LOCATIONS.items(),
            key=lambda x: abs(x[0][0] - self.coordinates_lat) + abs(x[0][1] - self.coordinates_lng)
        )
        
        return closest_location[1]

    def save(self, *args, **kwargs):
        # Update location if it's a test location or empty
        if not self.location or self.location.startswith('Test Emergency'):
            self.location = self.get_location_name()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.alert_id

class Accident(models.Model):
    SEVERITY_CHOICES = [
        ('High', 'High'),
        ('Medium', 'Medium'),
        ('Low', 'Low'),
    ]
    
    location = models.CharField(max_length=255)
    date = models.DateField()
    time = models.TimeField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='Medium')
    description = models.TextField(null=True, blank=True)
    injured = models.PositiveIntegerField(default=0)
    fatalities = models.PositiveIntegerField(default=0)
    coordinates_lat = models.FloatField()
    coordinates_lng = models.FloatField()

    def __str__(self):
        return f"Accident at {self.location} on {self.date}"

class AlertHistory(models.Model):
    """
    Model to track alert history and changes
    """
    alert = models.ForeignKey(Alert, on_delete=models.CASCADE, related_name='history')
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, related_name='alert_history')
    action = models.CharField(max_length=50)  # e.g., 'complete', 'assign', etc.
    status = models.CharField(max_length=20)
    response_time = models.CharField(max_length=20, null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    details = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Alert History'
        verbose_name_plural = 'Alert Histories'

    def __str__(self):
        return f"{self.alert.alert_id} - {self.action} - {self.created_at}"

class DriverHistory(models.Model):
    """
    Model to track driver history and status changes
    """
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='history')
    alert = models.ForeignKey(Alert, on_delete=models.SET_NULL, null=True, related_name='driver_history')
    action = models.CharField(max_length=50)  # e.g., 'complete_alert', 'status_change', etc.
    status_change = models.CharField(max_length=100, null=True, blank=True)
    response_time = models.CharField(max_length=20, null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Driver History'
        verbose_name_plural = 'Driver Histories'

    def __str__(self):
        return f"{self.driver.name} - {self.action} - {self.created_at}"
