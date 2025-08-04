from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from api.models import Driver, Alert, Ambulance


class Command(BaseCommand):
    help = 'Clean up database inconsistencies related to the driver status two-state system'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        self.stdout.write(self.style.SUCCESS("=== Starting Rapid-Rescue database cleanup ==="))
        self.stdout.write(f"Timestamp: {timezone.now()}")
        
        # Run all cleanup functions
        driver_updates = self.clean_driver_status(dry_run)
        alert_updates = self.clean_alert_assignments(dry_run)
        ambulance_updates = self.clean_ambulance_status(dry_run)
        
        total_updates = driver_updates + alert_updates + ambulance_updates
        
        self.stdout.write(self.style.SUCCESS("\n=== Cleanup Summary ==="))
        self.stdout.write(f"Driver status updates: {driver_updates}")
        self.stdout.write(f"Alert assignment fixes: {alert_updates}")
        self.stdout.write(f"Ambulance status updates: {ambulance_updates}")
        self.stdout.write(f"Total database updates: {total_updates}")
        self.stdout.write(self.style.SUCCESS("=== Cleanup complete ==="))

    def clean_driver_status(self, dry_run=False):
        """Clean up driver statuses to ensure they are only 'available' or 'unavailable'"""
        self.stdout.write("Starting driver status cleanup...")
        total_drivers = Driver.objects.count()
        updated_count = 0
        
        # Use transaction only in real run mode
        if not dry_run:
            transaction_context = transaction.atomic()
            transaction_context.__enter__()
        
        try:
            # Get all drivers with invalid statuses
            invalid_drivers = Driver.objects.exclude(status__in=['available', 'unavailable'])
            invalid_count = invalid_drivers.count()
            
            if invalid_count:
                self.stdout.write(f"Found {invalid_count} drivers with invalid status values")
                
                # Update all invalid statuses to 'available'
                for driver in invalid_drivers:
                    old_status = driver.status
                    if not dry_run:
                        driver.status = 'available'
                        driver.save()
                    updated_count += 1
                    self.stdout.write(f"{'Would update' if dry_run else 'Updated'} driver {driver.id} ({driver.name}) status from '{old_status}' to 'available'")
            
            # Ensure drivers with active alerts are marked as unavailable
            drivers_with_alerts = Driver.objects.filter(alerts__status='assigned').distinct()
            for driver in drivers_with_alerts:
                if driver.status != 'unavailable':
                    old_status = driver.status
                    if not dry_run:
                        driver.status = 'unavailable'
                        driver.save()
                    updated_count += 1
                    self.stdout.write(f"{'Would update' if dry_run else 'Updated'} driver {driver.id} ({driver.name}) status from '{old_status}' to 'unavailable' due to active alert")
            
            if not dry_run:
                transaction_context.__exit__(None, None, None)
                
        except Exception as e:
            if not dry_run:
                transaction_context.__exit__(type(e), e, e.__traceback__)
            self.stdout.write(self.style.ERROR(f"Error during driver status cleanup: {str(e)}"))
            return 0
        
        self.stdout.write(self.style.SUCCESS(f"Driver status cleanup complete. {updated_count} of {total_drivers} drivers {'would be' if dry_run else 'were'} updated."))
        return updated_count

    def clean_alert_assignments(self, dry_run=False):
        """Fix inconsistencies in alert assignments"""
        self.stdout.write("\nStarting alert assignment cleanup...")
        alert_count = Alert.objects.count()
        updated_count = 0
        
        # Use transaction only in real run mode
        if not dry_run:
            transaction_context = transaction.atomic()
            transaction_context.__enter__()
        
        try:
            # Fix alerts that are assigned but have no driver
            no_driver_alerts = Alert.objects.filter(status='assigned', driver=None)
            no_driver_count = no_driver_alerts.count()
            
            if no_driver_count:
                self.stdout.write(f"Found {no_driver_count} alerts with 'assigned' status but no driver")
                
                # Reset these alerts to pending
                for alert in no_driver_alerts:
                    if not dry_run:
                        alert.status = 'pending'
                        alert.save()
                    updated_count += 1
                    self.stdout.write(f"{'Would reset' if dry_run else 'Reset'} alert {alert.id} from 'assigned' to 'pending' (no driver assigned)")
            
            # Fix the case where a driver has multiple assigned alerts
            drivers_with_alerts = Driver.objects.filter(alerts__status='assigned').distinct()
            for driver in drivers_with_alerts:
                assigned_alerts = Alert.objects.filter(driver=driver, status='assigned')
                if assigned_alerts.count() > 1:
                    self.stdout.write(f"Driver {driver.id} ({driver.name}) has {assigned_alerts.count()} active alerts")
                    
                    # Keep the most recent alert and reset others to pending
                    most_recent = assigned_alerts.order_by('-created_at').first()
                    alerts_to_reset = assigned_alerts.exclude(id=most_recent.id)
                    
                    for alert in alerts_to_reset:
                        if not dry_run:
                            alert.status = 'pending'
                            alert.driver = None
                            alert.save()
                        updated_count += 1
                        self.stdout.write(f"{'Would reset' if dry_run else 'Reset'} alert {alert.id} from 'assigned' to 'pending' (driver had multiple assignments)")
            
            if not dry_run:
                transaction_context.__exit__(None, None, None)
                
        except Exception as e:
            if not dry_run:
                transaction_context.__exit__(type(e), e, e.__traceback__)
            self.stdout.write(self.style.ERROR(f"Error during alert assignment cleanup: {str(e)}"))
            return 0
        
        self.stdout.write(self.style.SUCCESS(f"Alert assignment cleanup complete. {updated_count} of {alert_count} alerts {'would be' if dry_run else 'were'} fixed."))
        return updated_count

    def clean_ambulance_status(self, dry_run=False):
        """Clean up ambulance statuses to ensure they are only 'available' or 'unavailable'"""
        self.stdout.write("\nStarting ambulance status cleanup...")
        total_ambulances = Ambulance.objects.count()
        updated_count = 0
        
        # Use transaction only in real run mode
        if not dry_run:
            transaction_context = transaction.atomic()
            transaction_context.__enter__()
        
        try:
            # Get all ambulances with invalid statuses
            invalid_ambulances = Ambulance.objects.exclude(status__in=['available', 'unavailable'])
            invalid_count = invalid_ambulances.count()
            
            if invalid_count:
                self.stdout.write(f"Found {invalid_count} ambulances with invalid status values")
                
                # Update all invalid statuses to 'available'
                for ambulance in invalid_ambulances:
                    old_status = ambulance.status
                    if not dry_run:
                        ambulance.status = 'available'
                        ambulance.save()
                    updated_count += 1
                    self.stdout.write(f"{'Would update' if dry_run else 'Updated'} ambulance {ambulance.id} ({ambulance.vehicle_no}) status from '{old_status}' to 'available'")
            
            # Ensure ambulances with active drivers are marked as unavailable
            ambulances_with_drivers = Ambulance.objects.filter(driver__status='unavailable')
            for ambulance in ambulances_with_drivers:
                if ambulance.status != 'unavailable':
                    old_status = ambulance.status
                    if not dry_run:
                        ambulance.status = 'unavailable'
                        ambulance.save()
                    updated_count += 1
                    self.stdout.write(f"{'Would update' if dry_run else 'Updated'} ambulance {ambulance.id} ({ambulance.vehicle_no}) status from '{old_status}' to 'unavailable' due to driver status")
            
            if not dry_run:
                transaction_context.__exit__(None, None, None)
                
        except Exception as e:
            if not dry_run:
                transaction_context.__exit__(type(e), e, e.__traceback__)
            self.stdout.write(self.style.ERROR(f"Error during ambulance status cleanup: {str(e)}"))
            return 0
        
        self.stdout.write(self.style.SUCCESS(f"Ambulance status cleanup complete. {updated_count} of {total_ambulances} ambulances {'would be' if dry_run else 'were'} updated."))
        return updated_count 