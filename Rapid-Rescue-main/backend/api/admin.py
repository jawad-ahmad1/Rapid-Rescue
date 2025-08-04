from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import Driver, Ambulance, Alert, Accident

# Register the models for admin interface
@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'status', 'experience', 'get_username')
    list_filter = ('status',)
    search_fields = ('name', 'phone', 'user__username')
    
    def get_username(self, obj):
        return obj.user.username if obj.user else '-'
    get_username.short_description = 'Username'

@admin.register(Ambulance)
class AmbulanceAdmin(admin.ModelAdmin):
    list_display = ('vehicle_no', 'model', 'status', 'get_driver')
    list_filter = ('status',)
    search_fields = ('vehicle_no', 'model')
    
    def get_driver(self, obj):
        return obj.driver.name if obj.driver else '-'
    get_driver.short_description = 'Driver'

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('alert_id', 'location', 'status', 'get_driver', 'created_at')
    list_filter = ('status',)
    search_fields = ('alert_id', 'location')
    
    def get_driver(self, obj):
        return obj.driver.name if obj.driver else '-'
    get_driver.short_description = 'Driver'

@admin.register(Accident)
class AccidentAdmin(admin.ModelAdmin):
    list_display = ('location', 'date', 'time', 'severity', 'injured', 'fatalities')
    list_filter = ('severity', 'date')
    search_fields = ('location', 'description')

# Unregister the default User admin
admin.site.unregister(User)

# Register our custom User admin
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser')
    fieldsets = UserAdmin.fieldsets
    
    # Customize to make it easier to create admin users
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'is_staff', 'is_superuser'),
        }),
    )
