from django.db import models

class Accident(models.Model):
    """
    Model representing an accident in the Rapid Rescue system.
    """
    location = models.CharField(max_length=255)
    date = models.DateField()
    time = models.TimeField()
    severity = models.CharField(
        max_length=20,
        choices=[
            ('Low', 'Low'),
            ('Medium', 'Medium'),
            ('High', 'High'),
            ('Critical', 'Critical')
        ]
    )
    description = models.TextField(null=True, blank=True)
    injured = models.PositiveIntegerField(default=0)
    fatalities = models.PositiveIntegerField(default=0)
    coordinates_lat = models.FloatField()
    coordinates_lng = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Accident at {self.location} on {self.date}"
        
    class Meta:
        ordering = ['-date', '-time']
        verbose_name = 'Accident'
        verbose_name_plural = 'Accidents'
