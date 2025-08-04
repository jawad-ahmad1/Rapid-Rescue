from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from django.db import transaction
import logging
from drivers_app.models import Driver

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Migrates driver data from the old api.Driver model to the new drivers_app.Driver model'

    def add_arguments(self, parser):
        parser.add_argument('--check-only', action='store_true', 
                            help='Only check for migration issues without performing the migration')
        parser.add_argument('--force', action='store_true',
                            help='Force migration even if there are conflicts')

    def handle(self, *args, **options):
        check_only = options['check_only']
        force = options.get('force', False)
        
        self.stdout.write(self.style.SUCCESS('Starting driver data migration'))
        
        # Ensure the api app is available
        try:
            from api.models import Driver as OldDriver
        except ImportError:
            self.stdout.write(self.style.ERROR('Cannot import the old Driver model from api.models. Make sure the api app is installed.'))
            return
        
        # Get old drivers
        old_drivers = OldDriver.objects.all()
        total_count = old_drivers.count()
        
        self.stdout.write(f'Found {total_count} drivers in the old structure')
        
        if check_only:
            self.stdout.write('Check-only mode: No migration will be performed')
            
            # Check for potential issues
            self._check_conflicts(old_drivers)
            return
        
        # Perform migration
        self._migrate_drivers(old_drivers, force)
    
    def _check_conflicts(self, old_drivers):
        """Check for potential conflicts in the migration"""
        conflicts = 0
        
        for old_driver in old_drivers:
            # Check if driver with the same ID already exists
            if Driver.objects.filter(id=old_driver.id).exists():
                self.stdout.write(self.style.WARNING(
                    f'Conflict: Driver with ID {old_driver.id} already exists in the new structure'
                ))
                conflicts += 1
            
            # Check if user is linked to another driver
            if old_driver.user and Driver.objects.filter(user=old_driver.user).exists():
                self.stdout.write(self.style.WARNING(
                    f'Conflict: User {old_driver.user.username} is already linked to another driver in the new structure'
                ))
                conflicts += 1
        
        if conflicts == 0:
            self.stdout.write(self.style.SUCCESS('No conflicts found. Safe to migrate.'))
        else:
            self.stdout.write(self.style.ERROR(f'Found {conflicts} potential conflicts. Use --force to migrate anyway.'))
    
    def _migrate_drivers(self, old_drivers, force):
        """Perform the actual migration"""
        migrated = 0
        skipped = 0
        errors = 0
        
        for old_driver in old_drivers:
            try:
                # Check if driver already exists
                if Driver.objects.filter(id=old_driver.id).exists():
                    if not force:
                        self.stdout.write(f'Skipping driver {old_driver.id}: Already exists')
                        skipped += 1
                        continue
                    else:
                        # Update existing driver
                        new_driver = Driver.objects.get(id=old_driver.id)
                        self.stdout.write(f'Updating existing driver {old_driver.id}')
                else:
                    # Create new driver
                    new_driver = Driver(id=old_driver.id)
                
                # Copy all fields
                with transaction.atomic():
                    new_driver.name = old_driver.name
                    new_driver.contact_no = old_driver.contact_no
                    new_driver.status = old_driver.status
                    new_driver.license_no = old_driver.license_no
                    new_driver.experience = old_driver.experience
                    new_driver.address = old_driver.address
                    
                    # Handle photo if exists
                    if old_driver.photo:
                        new_driver.photo = old_driver.photo
                    
                    # Link to same user
                    if old_driver.user:
                        new_driver.user = old_driver.user
                    
                    new_driver.save()
                    migrated += 1
                    self.stdout.write(self.style.SUCCESS(f'Migrated driver {old_driver.id}: {old_driver.name}'))
            
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error migrating driver {old_driver.id}: {str(e)}'))
                errors += 1
        
        # Print summary
        self.stdout.write('\nMigration Summary:')
        self.stdout.write(f'Total drivers: {old_drivers.count()}')
        self.stdout.write(f'Successfully migrated: {migrated}')
        self.stdout.write(f'Skipped: {skipped}')
        self.stdout.write(f'Errors: {errors}')
        
        if errors == 0 and skipped == 0:
            self.stdout.write(self.style.SUCCESS('Migration completed successfully'))
        else:
            self.stdout.write(self.style.WARNING('Migration completed with issues')) 