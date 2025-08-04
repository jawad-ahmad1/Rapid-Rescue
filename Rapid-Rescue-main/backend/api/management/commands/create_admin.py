from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Permission
from django.contrib.contenttypes.models import ContentType
import getpass
import sys

class Command(BaseCommand):
    help = 'Creates an admin user with staff permissions'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help='Admin username')
        parser.add_argument('--email', type=str, help='Admin email')
        parser.add_argument('--password', type=str, help='Admin password')
        parser.add_argument('--superuser', action='store_true', help='Create a superuser')

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']
        is_superuser = options['superuser']
        
        if not username:
            username = input('Enter admin username: ')
        
        if not email:
            email = input('Enter admin email: ')
        
        if not password:
            password = getpass.getpass('Enter admin password: ')
            password_confirm = getpass.getpass('Confirm admin password: ')
            
            if password != password_confirm:
                self.stdout.write(self.style.ERROR('Passwords do not match'))
                sys.exit(1)
        
        # Check if user already exists
        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'User {username} already exists'))
            update = input('Would you like to update this user? (y/n): ')
            
            if update.lower() == 'y':
                user = User.objects.get(username=username)
                user.email = email
                user.set_password(password)
                user.is_staff = True
                user.is_superuser = is_superuser
                user.save()
                
                # Grant all necessary permissions for Django admin access
                self.grant_permissions(user)
                
                self.stdout.write(self.style.SUCCESS(f'User {username} has been updated with admin permissions'))
            else:
                self.stdout.write(self.style.WARNING('Operation cancelled'))
            
            return
        
        # Create the user
        if is_superuser:
            user = User.objects.create_superuser(username=username, email=email, password=password)
            self.stdout.write(self.style.SUCCESS(f'Superuser {username} has been created successfully'))
        else:
            user = User.objects.create_user(username=username, email=email, password=password)
            user.is_staff = True
            user.save()
            
            # Grant all necessary permissions for Django admin access
            self.grant_permissions(user)
            
            self.stdout.write(self.style.SUCCESS(f'Admin user {username} has been created successfully'))
    
    def grant_permissions(self, user):
        """Grant all model permissions to the user for admin access"""
        if user.is_superuser:
            return  # Superusers already have all permissions
        
        # Get all available permissions
        for content_type in ContentType.objects.all():
            permissions = Permission.objects.filter(content_type=content_type)
            for permission in permissions:
                user.user_permissions.add(permission)
        
        user.save()
        self.stdout.write(self.style.SUCCESS(f'Granted all permissions to user {user.username}')) 