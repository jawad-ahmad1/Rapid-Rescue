from django.contrib import admin
from .models import Driver

@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'status', 'user', 'contact_no', 'license_no', 'experience')
    list_filter = ('status', 'experience')
    search_fields = ('name', 'contact_no', 'license_no', 'user__username')
    raw_id_fields = ('user',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('name', 'status', 'user')
        }),
        ('Details', {
            'fields': ('contact_no', 'license_no', 'experience', 'address', 'photo')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
