from django.db import models
from drivers_app.models import Driver

class Ambulance(models.Model):
    """
    Model representing an ambulance in the Rapid Rescue system.
    """
    vehicle_no = models.CharField(max_length=20)
    model = models.CharField(max_length=100)
    status = models.CharField(
        max_length=20, 
        default='available',
        choices=[
            ('available', 'Available'),
            ('in_use', 'In Use'),
            ('maintenance', 'Under Maintenance'),
            ('out_of_service', 'Out of Service')
        ]
    )
    driver = models.ForeignKey(
        Driver, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='ambulances'
    )
    location_lat = models.FloatField(null=True, blank=True)
    location_lng = models.FloatField(null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.vehicle_no} - {self.model}"
        
    class Meta:
        ordering = ['vehicle_no']
        verbose_name = 'Ambulance'
        verbose_name_plural = 'Ambulances'
