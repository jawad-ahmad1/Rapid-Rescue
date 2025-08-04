from django.db import models

class Alert(models.Model):
    SEVERITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACTIVE', 'Active'),
        ('RESOLVED', 'Resolved'),
        ('CANCELLED', 'Cancelled'),
    ]

    alert_id = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    location = models.CharField(max_length=200)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='MEDIUM')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    external_reference_id = models.CharField(max_length=100, null=True, blank=True)
    
    # Fields for video and accident data
    video_url = models.URLField(max_length=500, null=True, blank=True)
    accident_clip = models.FileField(upload_to='accident_clips/', null=True, blank=True)
    clip_uploaded_at = models.DateTimeField(null=True, blank=True)
    confidence_score = models.FloatField(null=True, blank=True)
    accident_clip_name = models.CharField(max_length=255, null=True, blank=True)
    accident_clip_type = models.CharField(max_length=50, null=True, blank=True)
    accident_clip_data = models.TextField(null=True, blank=True)  # For base64 encoded data

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.alert_id} - {self.severity} ({self.status})"

    def has_media(self):
        """Check if the alert has any associated media"""
        return bool(self.video_url or self.accident_clip or self.accident_clip_data) 