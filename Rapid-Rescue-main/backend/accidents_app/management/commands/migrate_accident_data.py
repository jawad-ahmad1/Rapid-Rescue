from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
import logging
from accidents_app.models import Accident

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Migrates accident data from the old api.Accident model to the new accidents_app.Accident model'

    def add_arguments(self, parser):
        parser.add_argument('--check-only', action='store_true', 
                            help='Only check for migration issues without performing the migration')
        parser.add_argument('--force', action='store_true',
                            help='Force migration even if there are conflicts')

    def handle(self, *args, **options):
        check_only = options['check_only']
        force = options.get('force', False)
        
        self.stdout.write(self.style.SUCCESS('Starting accident data migration'))
        
        # Ensure the api app is available
        try:
            from api.models import Accident as OldAccident
        except ImportError:
            self.stdout.write(self.style.ERROR('Cannot import the old Accident model from api.models. Make sure the api app is installed.'))
            return
        
        # Get old accidents
        old_accidents = OldAccident.objects.all()
        total_count = old_accidents.count()
        
        self.stdout.write(f'Found {total_count} accidents in the old structure')
        
        if check_only:
            self.stdout.write('Check-only mode: No migration will be performed')
            
            # Check for potential issues
            self._check_conflicts(old_accidents)
            return
        
        # Perform migration
        self._migrate_accidents(old_accidents, force)
    
    def _check_conflicts(self, old_accidents):
        """Check for potential conflicts in the migration"""
        conflicts = 0
        
        for old_accident in old_accidents:
            # Check if accident with the same ID already exists
            if Accident.objects.filter(id=old_accident.id).exists():
                self.stdout.write(self.style.WARNING(
                    f'Conflict: Accident with ID {old_accident.id} already exists in the new structure'
                ))
                conflicts += 1
        
        if conflicts == 0:
            self.stdout.write(self.style.SUCCESS('No conflicts found. Safe to migrate.'))
        else:
            self.stdout.write(self.style.ERROR(f'Found {conflicts} potential conflicts. Use --force to migrate anyway.'))
    
    def _migrate_accidents(self, old_accidents, force):
        """Perform the actual migration"""
        migrated = 0
        skipped = 0
        errors = 0
        
        for old_accident in old_accidents:
            try:
                # Check if accident already exists
                if Accident.objects.filter(id=old_accident.id).exists():
                    if not force:
                        self.stdout.write(f'Skipping accident {old_accident.id}: Already exists')
                        skipped += 1
                        continue
                    else:
                        # Update existing accident
                        new_accident = Accident.objects.get(id=old_accident.id)
                        self.stdout.write(f'Updating existing accident {old_accident.id}')
                else:
                    # Create new accident
                    new_accident = Accident(id=old_accident.id)
                
                # Copy all fields
                with transaction.atomic():
                    new_accident.location = old_accident.location
                    new_accident.date = old_accident.date
                    new_accident.time = old_accident.time
                    
                    # Map severity to the new choices if needed
                    severity = old_accident.severity
                    valid_severities = ['Low', 'Medium', 'High', 'Critical']
                    if severity not in valid_severities:
                        if severity.lower() == 'minor':
                            severity = 'Low'
                        elif severity.lower() == 'major':
                            severity = 'High'
                        elif severity.lower() == 'severe':
                            severity = 'Critical'
                        else:
                            severity = 'Medium'  # Default
                    
                    new_accident.severity = severity
                    
                    # Copy other fields
                    new_accident.description = old_accident.description if hasattr(old_accident, 'description') else ''
                    new_accident.injured = old_accident.injured if hasattr(old_accident, 'injured') else 0
                    new_accident.fatalities = old_accident.fatalities if hasattr(old_accident, 'fatalities') else 0
                    
                    # Copy coordinates
                    new_accident.coordinates_lat = old_accident.coordinates_lat
                    new_accident.coordinates_lng = old_accident.coordinates_lng
                    
                    new_accident.save()
                    migrated += 1
                    self.stdout.write(self.style.SUCCESS(f'Migrated accident {old_accident.id}: {old_accident.location}'))
            
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error migrating accident {old_accident.id}: {str(e)}'))
                errors += 1
        
        # Print summary
        self.stdout.write('\nMigration Summary:')
        self.stdout.write(f'Total accidents: {old_accidents.count()}')
        self.stdout.write(f'Successfully migrated: {migrated}')
        self.stdout.write(f'Skipped: {skipped}')
        self.stdout.write(f'Errors: {errors}')
        
        if errors == 0 and skipped == 0:
            self.stdout.write(self.style.SUCCESS('Migration completed successfully'))
        else:
            self.stdout.write(self.style.WARNING('Migration completed with issues')) 