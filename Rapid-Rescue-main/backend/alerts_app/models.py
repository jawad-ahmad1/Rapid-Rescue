from django.db import models
from drivers_app.models import Driver

class Alert(models.Model):
    """
    Model representing an emergency alert in the Rapid Rescue system.
    """
    alert_id = models.CharField(max_length=10, unique=True)
    time = models.CharField(max_length=20)
    date = models.CharField(max_length=20)
    location = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20, 
        default='pending',
        choices=[
            ('pending', 'Pending'),
            ('assigned', 'Assigned'),
            ('complete', 'Complete'),
            ('rejected', 'Rejected')
        ]
    )
    driver = models.ForeignKey(
        Driver, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='alerts'
    )
    response_time = models.CharField(max_length=20, null=True, blank=True)
    coordinates_lat = models.FloatField()
    coordinates_lng = models.FloatField()
    accident_clip = models.FileField(upload_to='accident_clips/', null=True, blank=True)
    video_url = models.URLField(max_length=500, null=True, blank=True)
    time_remaining = models.IntegerField(default=30)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # New fields for accident detection
    type = models.CharField(max_length=50, default='Accident Emergency')
    priority = models.CharField(
        max_length=20,
        default='high',
        choices=[
            ('low', 'Low'),
            ('medium', 'Medium'),
            ('high', 'High')
        ]
    )
    confidence_score = models.FloatField(default=0.0)
    is_ai_detected = models.BooleanField(default=False)

    def __str__(self):
        return self.alert_id
        
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Alert'
        verbose_name_plural = 'Alerts'
