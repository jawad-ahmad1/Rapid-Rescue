from django.core.management.base import BaseCommand
from django.apps import apps
from django.db import connection
import sys
import os

class Command(BaseCommand):
    help = 'Checks the application structure and database configuration'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Checking Rapid Rescue application structure'))
        
        # Check installed apps
        self._check_installed_apps()
        
        # Check models
        self._check_models()
        
        # Check database tables
        self._check_database_tables()
        
        # Check for potential conflicts
        self._check_conflicts()
        
        self.stdout.write(self.style.SUCCESS('\nApplication structure check completed'))
    
    def _check_installed_apps(self):
        """Check if all required apps are installed"""
        self.stdout.write('\nChecking installed apps:')
        
        required_apps = [
            'drivers_app',
            'ambulances_app',
            'alerts_app',
            'accidents_app',
            'authentication',
            'dashboard',
        ]
        
        installed_apps = [app.label for app in apps.get_app_configs()]
        
        for app in required_apps:
            if app in installed_apps:
                self.stdout.write(f'  ✓ {app} is installed')
            else:
                self.stdout.write(self.style.ERROR(f'  ✗ {app} is NOT installed'))
    
    def _check_models(self):
        """Check if all required models are registered"""
        self.stdout.write('\nChecking models:')
        
        required_models = [
            ('drivers_app', 'Driver'),
            ('ambulances_app', 'Ambulance'),
            ('alerts_app', 'Alert'),
            ('accidents_app', 'Accident'),
            ('authentication', 'UserSession'),
            ('dashboard', 'DashboardSetting'),
        ]
        
        for app_label, model_name in required_models:
            try:
                model = apps.get_model(app_label, model_name)
                self.stdout.write(f'  ✓ {app_label}.{model_name} is registered')
            except LookupError:
                self.stdout.write(self.style.ERROR(f'  ✗ {app_label}.{model_name} is NOT registered'))
    
    def _check_database_tables(self):
        """Check if database tables are created"""
        self.stdout.write('\nChecking database tables:')
        
        required_tables = [
            'drivers_app_driver',
            'ambulances_app_ambulance',
            'alerts_app_alert',
            'accidents_app_accident',
            'authentication_usersession',
            'dashboard_dashboardsetting',
        ]
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [table[0] for table in cursor.fetchall()]
        
        for table in required_tables:
            if table in tables:
                self.stdout.write(f'  ✓ Table {table} exists')
            else:
                self.stdout.write(self.style.ERROR(f'  ✗ Table {table} does NOT exist'))
    
    def _check_conflicts(self):
        """Check for potential conflicts in the models"""
        self.stdout.write('\nChecking for conflicts:')
        
        # Check for driver model conflicts
        try:
            from api.models import Driver as OldDriver
            from drivers_app.models import Driver as NewDriver
            
            self.stdout.write('  ✓ Both api.Driver and drivers_app.Driver models are available')
            
            # Check related_name conflicts
            old_related_name = OldDriver._meta.get_field('user').remote_field.related_name
            new_related_name = NewDriver._meta.get_field('user').remote_field.related_name
            
            if old_related_name != new_related_name:
                self.stdout.write(f'  ✓ No conflict in related_name: {old_related_name} vs {new_related_name}')
            else:
                self.stdout.write(self.style.ERROR(f'  ✗ related_name conflict: both using {old_related_name}'))
                
        except ImportError as e:
            self.stdout.write(self.style.WARNING(f'  ⚠ Cannot check for conflicts: {str(e)}')) 