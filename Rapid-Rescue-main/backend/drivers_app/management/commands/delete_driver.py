from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from drivers_app.models import Driver
import logging
from django.db import transaction

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Properly deletes a driver and all associated data to prevent orphaned records'

    def add_arguments(self, parser):
        parser.add_argument('--id', type=int, help='Driver ID to delete')
        parser.add_argument('--username', type=str, help='Username of the driver to delete')
        parser.add_argument('--check-only', action='store_true', 
                            help='Only check for driver without deleting')
        parser.add_argument('--force', action='store_true',
                            help='Force deletion without confirmation')

    def handle(self, *args, **options):
        check_only = options['check_only']
        force = options.get('force', False)
        action = "Checking" if check_only else "Deleting"
        
        if not options['id'] and not options['username']:
            self.stdout.write(self.style.ERROR(
                "Please provide either --id or --username to identify the driver to delete"
            ))
            return
        
        # Find driver by ID
        if options['id']:
            driver_id = options['id']
            self.stdout.write(f"{action} driver with ID: {driver_id}")
            
            try:
                driver = Driver.objects.get(id=driver_id)
                self._process_driver(driver, check_only, force)
            except Driver.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"No driver found with ID: {driver_id}"))
        
        # Find driver by username
        elif options['username']:
            username = options['username']
            self.stdout.write(f"{action} driver with username: {username}")
            
            try:
                user = User.objects.get(username=username)
                try:
                    driver = Driver.objects.get(user=user)
                    self._process_driver(driver, check_only, force)
                except Driver.DoesNotExist:
                    self.stdout.write(self.style.ERROR(
                        f"User '{username}' exists but has no associated driver"
                    ))
                    
                    # Check if we should delete the user anyway
                    if not check_only and (force or self.confirm_delete_user(username)):
                        user.delete()
                        self.stdout.write(self.style.SUCCESS(f"Deleted user '{username}'"))
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"No user found with username: {username}"))
    
    def _process_driver(self, driver, check_only, force):
        """Helper method to process and optionally delete a driver"""
        
        # Display driver info
        driver_id = driver.id
        username = driver.user.username if driver.user else "No username"
        
        self.stdout.write(self.style.SUCCESS(
            f"Found driver: ID={driver_id}, Name={driver.name}, Username={username}"
        ))
        
        # Show associated alerts if any
        alert_count = driver.alerts.count() if hasattr(driver, 'alerts') else 0
        if alert_count > 0:
            self.stdout.write(f"Driver has {alert_count} associated alerts")
        
        # Show associated ambulances if any
        ambulance_count = driver.ambulances.count() if hasattr(driver, 'ambulances') else 0
        if ambulance_count > 0:
            self.stdout.write(f"Driver has {ambulance_count} associated ambulances")
        
        # If check only, we're done
        if check_only:
            return
        
        # Confirm deletion
        if not force and not self.confirm_delete(driver.name):
            self.stdout.write(self.style.WARNING("Driver deletion cancelled"))
            return
        
        # Proceed with deletion
        try:
            with transaction.atomic():
                # Store user for later if exists
                user = None
                if driver.user:
                    user = driver.user
                    # Unlink user from driver to avoid cascade issues
                    driver.user = None
                    driver.save()
                
                # Break any associations
                if alert_count > 0:
                    self.stdout.write("Breaking alert associations")
                    driver.alerts.update(driver=None)
                
                if ambulance_count > 0:
                    self.stdout.write("Breaking ambulance associations")
                    driver.ambulances.update(driver=None)
                
                # Delete driver
                driver.delete()
                self.stdout.write(self.style.SUCCESS(f"Deleted driver (ID: {driver_id})"))
                
                # Delete user if exists
                if user:
                    user.delete()
                    self.stdout.write(self.style.SUCCESS(f"Deleted associated user '{username}'"))
                
                self.stdout.write(self.style.SUCCESS("Driver and all associated data successfully deleted"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error deleting driver: {str(e)}"))
    
    def confirm_delete(self, name):
        """Ask for confirmation before deleting"""
        self.stdout.write(f"Are you sure you want to delete driver '{name}'? [y/N] ", ending='')
        answer = input().lower()
        return answer in ('y', 'yes')
    
    def confirm_delete_user(self, username):
        """Ask for confirmation before deleting an orphaned user"""
        self.stdout.write(f"User '{username}' has no associated driver. Delete user anyway? [y/N] ", ending='')
        answer = input().lower()
        return answer in ('y', 'yes') 