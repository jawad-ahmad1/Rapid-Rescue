from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from api.models import Driver, Alert, Ambulance


class Command(BaseCommand):
    help = 'Clean up alert inconsistencies and remove incorrectly assigned alerts'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')
        parser.add_argument('--force', action='store_true', help='Force cleanup of all assigned alerts regardless of state')

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        force_cleanup = options.get('force', False)
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        if force_cleanup:
            self.stdout.write(self.style.WARNING('FORCE MODE - All assigned alerts will be reset to pending'))
        
        self.stdout.write(self.style.SUCCESS("=== Starting Rapid-Rescue alert cleanup ==="))
        self.stdout.write(f"Timestamp: {timezone.now()}")
        
        # Run cleanup functions
        alert_updates = self.clean_assigned_alerts(dry_run, force_cleanup)
        driver_updates = self.reset_driver_statuses(dry_run)
        
        total_updates = alert_updates + driver_updates
        
        self.stdout.write(self.style.SUCCESS("\n=== Cleanup Summary ==="))
        self.stdout.write(f"Alert status fixes: {alert_updates}")
        self.stdout.write(f"Driver status updates: {driver_updates}")
        self.stdout.write(f"Total database updates: {total_updates}")
        self.stdout.write(self.style.SUCCESS("=== Cleanup complete ==="))

    def clean_assigned_alerts(self, dry_run=False, force_cleanup=False):
        """Clean up assigned alerts that don't meet the criteria for being active"""
        self.stdout.write("\nStarting assigned alert cleanup...")
        updated_count = 0
        
        # Use transaction only in real run mode
        if not dry_run:
            transaction_context = transaction.atomic()
            transaction_context.__enter__()
        
        try:
            # Get all assigned alerts
            assigned_alerts = Alert.objects.filter(status='assigned')
            assigned_count = assigned_alerts.count()
            
            self.stdout.write(f"Found {assigned_count} alerts with 'assigned' status")
            
            if force_cleanup:
                # If force mode, reset all assigned alerts to pending
                for alert in assigned_alerts:
                    if not dry_run:
                        # Store the driver for status update later
                        driver = alert.driver
                        
                        # Reset the alert
                        alert.status = 'pending'
                        alert.driver = None
                        alert.save()
                        
                    updated_count += 1
                    self.stdout.write(f"{'Would reset' if dry_run else 'Reset'} alert {alert.id} from 'assigned' to 'pending' (force cleanup)")
            else:
                # Find alerts that are assigned but have no driver
                no_driver_alerts = assigned_alerts.filter(driver=None)
                
                # Reset these alerts to pending
                for alert in no_driver_alerts:
                    if not dry_run:
                        alert.status = 'pending'
                        alert.save()
                    updated_count += 1
                    self.stdout.write(f"{'Would reset' if dry_run else 'Reset'} alert {alert.id} from 'assigned' to 'pending' (no driver assigned)")
                
                # Find alerts that are assigned but were created or updated more than 2 days ago (likely stale)
                two_days_ago = timezone.now() - timezone.timedelta(days=2)
                stale_alerts = assigned_alerts.filter(updated_at__lt=two_days_ago)
                
                # Reset these alerts to pending
                for alert in stale_alerts:
                    if not dry_run:
                        # Store the driver for status update later
                        driver = alert.driver
                        
                        # Reset the alert
                        alert.status = 'pending'
                        alert.driver = None
                        alert.save()
                        
                    updated_count += 1
                    self.stdout.write(f"{'Would reset' if dry_run else 'Reset'} alert {alert.id} from 'assigned' to 'pending' (stale alert)")
                
                # Fix the case where a driver has multiple assigned alerts
                drivers_with_alerts = Driver.objects.filter(alerts__status='assigned').distinct()
                for driver in drivers_with_alerts:
                    assigned_alerts = Alert.objects.filter(driver=driver, status='assigned')
                    if assigned_alerts.count() > 1:
                        self.stdout.write(f"Driver {driver.id} ({driver.name}) has {assigned_alerts.count()} active alerts")
                        
                        # Keep the most recent alert and reset others to pending
                        most_recent = assigned_alerts.order_by('-updated_at').first()
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
            self.stdout.write(self.style.ERROR(f"Error during alert cleanup: {str(e)}"))
            return 0
        
        self.stdout.write(self.style.SUCCESS(f"Alert cleanup complete. {updated_count} alerts {'would be' if dry_run else 'were'} fixed."))
        return updated_count
    
    def reset_driver_statuses(self, dry_run=False):
        """Reset driver statuses based on alert assignments"""
        self.stdout.write("\nSynchronizing driver statuses with alert assignments...")
        updated_count = 0
        
        # Use transaction only in real run mode
        if not dry_run:
            transaction_context = transaction.atomic()
            transaction_context.__enter__()
        
        try:
            # Get all drivers
            drivers = Driver.objects.all()
            
            for driver in drivers:
                # Check if driver has any assigned alerts
                has_assigned_alerts = Alert.objects.filter(driver=driver, status='assigned').exists()
                
                # Update driver status if needed
                if has_assigned_alerts and driver.status != 'unavailable':
                    if not dry_run:
                        old_status = driver.status
                        driver.status = 'unavailable'
                        driver.save()
                    updated_count += 1
                    self.stdout.write(f"{'Would update' if dry_run else 'Updated'} driver {driver.id} ({driver.name}) status to 'unavailable' (has assigned alert)")
                
                elif not has_assigned_alerts and driver.status != 'available':
                    if not dry_run:
                        old_status = driver.status
                        driver.status = 'available'
                        driver.save()
                    updated_count += 1
                    self.stdout.write(f"{'Would update' if dry_run else 'Updated'} driver {driver.id} ({driver.name}) status to 'available' (no assigned alerts)")
            
            if not dry_run:
                transaction_context.__exit__(None, None, None)
                
        except Exception as e:
            if not dry_run:
                transaction_context.__exit__(type(e), e, e.__traceback__)
            self.stdout.write(self.style.ERROR(f"Error during driver status synchronization: {str(e)}"))
            return 0
        
        self.stdout.write(self.style.SUCCESS(f"Driver status synchronization complete. {updated_count} drivers {'would be' if dry_run else 'were'} updated."))
        return updated_count 