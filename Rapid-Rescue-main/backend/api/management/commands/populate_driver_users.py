from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import Driver
import random
import string


class Command(BaseCommand):
    help = 'Create user accounts for drivers that do not have them'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Reset all driver users, not just missing ones',
        )

    def handle(self, *args, **options):
        reset_all = options['all']
        drivers = Driver.objects.all()
        
        self.stdout.write(self.style.SUCCESS(f'Found {drivers.count()} drivers'))
        
        created_count = 0
        updated_count = 0
        
        for driver in drivers:
            if driver.user is None or reset_all:
                # Generate username from driver name
                base_username = driver.name.lower().replace(' ', '')
                username = base_username
                
                # Check if username exists
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1
                
                # Generate a simple password
                password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
                
                # Generate email
                email = f"{username}@example.com"
                
                if driver.user is None:
                    # Create new user
                    user = User.objects.create(
                        username=username,
                        email=email,
                        first_name=driver.name.split()[0] if driver.name else '',
                        last_name=' '.join(driver.name.split()[1:]) if driver.name and len(driver.name.split()) > 1 else ''
                    )
                    user.set_password(password)
                    user.save()
                    
                    # Link user to driver
                    driver.user = user
                    driver.save()
                    
                    self.stdout.write(self.style.SUCCESS(
                        f'Created user for driver {driver.name}: username={username}, password={password}'
                    ))
                    created_count += 1
                else:
                    # Update existing user
                    user = driver.user
                    user.username = username
                    user.email = email
                    user.set_password(password)
                    user.save()
                    
                    self.stdout.write(self.style.SUCCESS(
                        f'Updated user for driver {driver.name}: username={username}, password={password}'
                    ))
                    updated_count += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'Completed: {created_count} users created, {updated_count} users updated'
        )) 