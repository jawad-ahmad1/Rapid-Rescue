from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
import logging
from ambulances_app.models import Ambulance
from drivers_app.models import Driver

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Migrates ambulance data from the old api.Ambulance model to the new ambulances_app.Ambulance model'

    def add_arguments(self, parser):
        parser.add_argument('--check-only', action='store_true', 
                            help='Only check for migration issues without performing the migration')
        parser.add_argument('--force', action='store_true',
                            help='Force migration even if there are conflicts')

    def handle(self, *args, **options):
        check_only = options['check_only']
        force = options.get('force', False)
        
        self.stdout.write(self.style.SUCCESS('Starting ambulance data migration'))
        
        # Ensure the api app is available
        try:
            from api.models import Ambulance as OldAmbulance
        except ImportError:
            self.stdout.write(self.style.ERROR('Cannot import the old Ambulance model from api.models. Make sure the api app is installed.'))
            return
        
        # Get old ambulances
        old_ambulances = OldAmbulance.objects.all()
        total_count = old_ambulances.count()
        
        self.stdout.write(f'Found {total_count} ambulances in the old structure')
        
        if check_only:
            self.stdout.write('Check-only mode: No migration will be performed')
            
            # Check for potential issues
            self._check_conflicts(old_ambulances)
            return
        
        # Perform migration
        self._migrate_ambulances(old_ambulances, force)
    
    def _check_conflicts(self, old_ambulances):
        """Check for potential conflicts in the migration"""
        conflicts = 0
        
        for old_ambulance in old_ambulances:
            # Check if ambulance with the same ID already exists
            if Ambulance.objects.filter(id=old_ambulance.id).exists():
                self.stdout.write(self.style.WARNING(
                    f'Conflict: Ambulance with ID {old_ambulance.id} already exists in the new structure'
                ))
                conflicts += 1
        
        if conflicts == 0:
            self.stdout.write(self.style.SUCCESS('No conflicts found. Safe to migrate.'))
        else:
            self.stdout.write(self.style.ERROR(f'Found {conflicts} potential conflicts. Use --force to migrate anyway.'))
    
    def _migrate_ambulances(self, old_ambulances, force):
        """Perform the actual migration"""
        migrated = 0
        skipped = 0
        errors = 0
        
        for old_ambulance in old_ambulances:
            try:
                # Check if ambulance already exists
                if Ambulance.objects.filter(id=old_ambulance.id).exists():
                    if not force:
                        self.stdout.write(f'Skipping ambulance {old_ambulance.id}: Already exists')
                        skipped += 1
                        continue
                    else:
                        # Update existing ambulance
                        new_ambulance = Ambulance.objects.get(id=old_ambulance.id)
                        self.stdout.write(f'Updating existing ambulance {old_ambulance.id}')
                else:
                    # Create new ambulance
                    new_ambulance = Ambulance(id=old_ambulance.id)
                
                # Copy all fields
                with transaction.atomic():
                    new_ambulance.vehicle_no = old_ambulance.vehicle_no
                    
                    # Map status from old to new
                    new_ambulance.status = old_ambulance.status
                    
                    # Try to find the model field in the old ambulance
                    # This is assuming the old model had a model field or similar
                    # If not, you'll need to adjust this
                    new_ambulance.model = "Standard Ambulance"  # Default value
                    
                    # Link to the same driver if it exists in the new structure
                    if old_ambulance.driver:
                        try:
                            driver = Driver.objects.get(id=old_ambulance.driver.id)
                            new_ambulance.driver = driver
                        except Driver.DoesNotExist:
                            self.stdout.write(self.style.WARNING(
                                f'Driver {old_ambulance.driver.id} not found in new structure. Ambulance will be created without driver.'
                            ))
                    
                    # Copy location coordinates
                    new_ambulance.location_lat = old_ambulance.coordinates_lat
                    new_ambulance.location_lng = old_ambulance.coordinates_lng
                    
                    new_ambulance.save()
                    migrated += 1
                    self.stdout.write(self.style.SUCCESS(f'Migrated ambulance {old_ambulance.id}: {old_ambulance.vehicle_no}'))
            
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error migrating ambulance {old_ambulance.id}: {str(e)}'))
                errors += 1
        
        # Print summary
        self.stdout.write('\nMigration Summary:')
        self.stdout.write(f'Total ambulances: {old_ambulances.count()}')
        self.stdout.write(f'Successfully migrated: {migrated}')
        self.stdout.write(f'Skipped: {skipped}')
        self.stdout.write(f'Errors: {errors}')
        
        if errors == 0 and skipped == 0:
            self.stdout.write(self.style.SUCCESS('Migration completed successfully'))
        else:
            self.stdout.write(self.style.WARNING('Migration completed with issues')) 