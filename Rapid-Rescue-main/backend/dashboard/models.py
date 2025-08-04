from django.db import models

# The dashboard app doesn't need its own models as it will use data from other apps
# Instead, it will provide views that aggregate and present data from other models

class DashboardSetting(models.Model):
    """
    Model for storing dashboard settings and preferences
    """
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField()
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.key
        
    class Meta:
        ordering = ['key']
        verbose_name = 'Dashboard Setting'
        verbose_name_plural = 'Dashboard Settings'
