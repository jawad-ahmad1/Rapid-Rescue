from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from api.models import Driver
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Find and clean up orphaned user records that have no associated driver'

    def add_arguments(self, parser):
        parser.add_argument('--check-only', action='store_true', 
                            help='Only check for orphaned users without deleting')
        parser.add_argument('--username', type=str, 
                            help='Check specific username instead of all users')
        parser.add_argument('--force', action='store_true',
                            help='Force deletion without confirmation')

    def handle(self, *args, **options):
        check_only = options['check_only']
        specific_username = options.get('username')
        force = options.get('force', False)
        
        action = "Checking for" if check_only else "Cleaning up"
        
        if specific_username:
            self.stdout.write(f"{action} orphaned user with username: {specific_username}")
            self._process_specific_username(specific_username, check_only, force)
        else:
            self.stdout.write(f"{action} all orphaned users...")
            self._process_all_users(check_only, force)
    
    def _process_specific_username(self, username, check_only, force):
        """Process a specific username"""
        try:
            user = User.objects.get(username=username)
            
            # Check if user has an associated driver
            try:
                driver = Driver.objects.get(user=user)
                self.stdout.write(self.style.SUCCESS(
                    f"User '{username}' (ID: {user.id}) has an associated driver (ID: {driver.id}). Not orphaned."
                ))
            except Driver.DoesNotExist:
                # This is an orphaned user
                self.stdout.write(self.style.WARNING(
                    f"Found orphaned user '{username}' (ID: {user.id}) with no associated driver"
                ))
                
                if not check_only:
                    if force or self.confirm_delete(username):
                        user.delete()
                        self.stdout.write(self.style.SUCCESS(f"Deleted orphaned user '{username}'"))
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"No user found with username: {username}"))
    
    def _process_all_users(self, check_only, force):
        """Process all users to find orphaned ones"""
        # Get all users
        all_users = User.objects.all()
        
        # Initialize counters
        total_users = all_users.count()
        orphaned_count = 0
        deleted_count = 0
        
        self.stdout.write(f"Processing {total_users} users...")
        
        # Go through each user
        for user in all_users:
            # Skip superusers and staff
            if user.is_superuser or user.is_staff:
                continue
                
            # Check if this user has an associated driver
            if not Driver.objects.filter(user=user).exists():
                orphaned_count += 1
                self.stdout.write(
                    f"Found orphaned user '{user.username}' (ID: {user.id}) with no associated driver"
                )
                
                # Delete if not in check-only mode
                if not check_only:
                    if force or self.confirm_delete(user.username):
                        user.delete()
                        deleted_count += 1
                        self.stdout.write(self.style.SUCCESS(f"Deleted orphaned user '{user.username}'"))
        
        # Print summary
        self.stdout.write("\nSummary:")
        self.stdout.write(f"Total users: {total_users}")
        self.stdout.write(f"Orphaned users found: {orphaned_count}")
        
        if not check_only:
            self.stdout.write(f"Orphaned users deleted: {deleted_count}")
    
    def confirm_delete(self, username):
        """Ask for confirmation before deleting"""
        self.stdout.write(f"Delete orphaned user '{username}'? [y/N] ", ending='')
        answer = input().lower()
        return answer in ('y', 'yes') 