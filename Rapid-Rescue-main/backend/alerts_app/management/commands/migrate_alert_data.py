from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
import logging
from alerts_app.models import Alert
from drivers_app.models import Driver

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Migrates alert data from the old api.Alert model to the new alerts_app.Alert model'

    def add_arguments(self, parser):
        parser.add_argument('--check-only', action='store_true', 
                            help='Only check for migration issues without performing the migration')
        parser.add_argument('--force', action='store_true',
                            help='Force migration even if there are conflicts')

    def handle(self, *args, **options):
        check_only = options['check_only']
        force = options.get('force', False)
        
        self.stdout.write(self.style.SUCCESS('Starting alert data migration'))
        
        # Ensure the api app is available
        try:
            from api.models import Alert as OldAlert
        except ImportError:
            self.stdout.write(self.style.ERROR('Cannot import the old Alert model from api.models. Make sure the api app is installed.'))
            return
        
        # Get old alerts
        old_alerts = OldAlert.objects.all()
        total_count = old_alerts.count()
        
        self.stdout.write(f'Found {total_count} alerts in the old structure')
        
        if check_only:
            self.stdout.write('Check-only mode: No migration will be performed')
            
            # Check for potential issues
            self._check_conflicts(old_alerts)
            return
        
        # Perform migration
        self._migrate_alerts(old_alerts, force)
    
    def _check_conflicts(self, old_alerts):
        """Check for potential conflicts in the migration"""
        conflicts = 0
        
        for old_alert in old_alerts:
            # Check if alert with the same ID already exists
            if Alert.objects.filter(id=old_alert.id).exists():
                self.stdout.write(self.style.WARNING(
                    f'Conflict: Alert with ID {old_alert.id} already exists in the new structure'
                ))
                conflicts += 1
            
            # Check if alert with the same alert_id already exists
            if hasattr(old_alert, 'alert_id') and Alert.objects.filter(alert_id=old_alert.alert_id).exists():
                self.stdout.write(self.style.WARNING(
                    f'Conflict: Alert with alert_id {old_alert.alert_id} already exists in the new structure'
                ))
                conflicts += 1
        
        if conflicts == 0:
            self.stdout.write(self.style.SUCCESS('No conflicts found. Safe to migrate.'))
        else:
            self.stdout.write(self.style.ERROR(f'Found {conflicts} potential conflicts. Use --force to migrate anyway.'))
    
    def _migrate_alerts(self, old_alerts, force):
        """Perform the actual migration"""
        migrated = 0
        skipped = 0
        errors = 0
        
        for old_alert in old_alerts:
            try:
                # Check if alert already exists
                if Alert.objects.filter(id=old_alert.id).exists():
                    if not force:
                        self.stdout.write(f'Skipping alert {old_alert.id}: Already exists')
                        skipped += 1
                        continue
                    else:
                        # Update existing alert
                        new_alert = Alert.objects.get(id=old_alert.id)
                        self.stdout.write(f'Updating existing alert {old_alert.id}')
                else:
                    # Create new alert
                    new_alert = Alert(id=old_alert.id)
                
                # Copy all fields
                with transaction.atomic():
                    # Ensure there's an alert_id, generate if not present
                    if hasattr(old_alert, 'alert_id') and old_alert.alert_id:
                        new_alert.alert_id = old_alert.alert_id
                    else:
                        # Generate a unique alert_id
                        import uuid
                        prefix = 'AL'
                        unique_id = str(uuid.uuid4())[:6].upper()
                        new_alert.alert_id = f"{prefix}{unique_id}"
                    
                    # Copy other fields
                    new_alert.time = old_alert.time if hasattr(old_alert, 'time') else ''
                    new_alert.date = old_alert.date if hasattr(old_alert, 'date') else ''
                    new_alert.location = old_alert.location if hasattr(old_alert, 'location') else ''
                    new_alert.status = old_alert.status if hasattr(old_alert, 'status') else 'pending'
                    new_alert.response_time = old_alert.response_time if hasattr(old_alert, 'response_time') else None
                    
                    # Link to the same driver if it exists in the new structure
                    if hasattr(old_alert, 'driver') and old_alert.driver:
                        try:
                            driver = Driver.objects.get(id=old_alert.driver.id)
                            new_alert.driver = driver
                        except Driver.DoesNotExist:
                            self.stdout.write(self.style.WARNING(
                                f'Driver {old_alert.driver.id} not found in new structure. Alert will be created without driver.'
                            ))
                    
                    # Copy coordinates
                    if hasattr(old_alert, 'coordinates_lat'):
                        new_alert.coordinates_lat = old_alert.coordinates_lat
                    if hasattr(old_alert, 'coordinates_lng'):
                        new_alert.coordinates_lng = old_alert.coordinates_lng
                    
                    # Copy accident clip if exists
                    if hasattr(old_alert, 'accident_clip') and old_alert.accident_clip:
                        new_alert.accident_clip = old_alert.accident_clip
                    
                    # Copy time remaining
                    if hasattr(old_alert, 'time_remaining'):
                        new_alert.time_remaining = old_alert.time_remaining
                    
                    new_alert.save()
                    migrated += 1
                    self.stdout.write(self.style.SUCCESS(f'Migrated alert {old_alert.id}'))
            
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error migrating alert {old_alert.id}: {str(e)}'))
                errors += 1
        
        # Print summary
        self.stdout.write('\nMigration Summary:')
        self.stdout.write(f'Total alerts: {old_alerts.count()}')
        self.stdout.write(f'Successfully migrated: {migrated}')
        self.stdout.write(f'Skipped: {skipped}')
        self.stdout.write(f'Errors: {errors}')
        
        if errors == 0 and skipped == 0:
            self.stdout.write(self.style.SUCCESS('Migration completed successfully'))
        else:
            self.stdout.write(self.style.WARNING('Migration completed with issues')) 