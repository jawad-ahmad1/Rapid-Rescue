from django.core.management.base import BaseCommand
from alerts_app.models import Alert
import random
from datetime import datetime

class Command(BaseCommand):
    help = 'Updates all alert locations to be within Lahore, Pakistan'

    def handle(self, *args, **kwargs):
        self.stdout.write('Checking alerts...')

        # Define Lahore area boundaries
        # These coordinates roughly cover the main Lahore city area
        LAT_MIN = 31.4000  # South boundary
        LAT_MAX = 31.6000  # North boundary
        LNG_MIN = 74.2000  # West boundary
        LNG_MAX = 74.4000  # East boundary

        # Define popular locations in Lahore
        locations = [
            'Johar Town, Lahore',
            'Model Town, Lahore',
            'DHA Phase 5, Lahore',
            'Gulberg III, Lahore',
            'Garden Town, Lahore',
            'Cavalry Ground, Lahore',
            'Faisal Town, Lahore',
            'Allama Iqbal Town, Lahore',
            'Valencia Town, Lahore',
            'Bahria Town, Lahore',
            'Mall Road, Lahore',
            'Liberty Market, Lahore',
            'Gaddafi Stadium, Lahore',
            'Fortress Stadium, Lahore',
            'Packages Mall, Lahore'
        ]

        # Get all alerts
        alerts = Alert.objects.all()
        
        # If no alerts exist, create some test alerts
        if not alerts.exists():
            self.stdout.write('No alerts found. Creating test alerts...')
            
            # Create 5 test alerts
            for i in range(5):
                # Generate random coordinates within Lahore
                lat = random.uniform(LAT_MIN, LAT_MAX)
                lng = random.uniform(LNG_MIN, LNG_MAX)
                location = random.choice(locations)
                
                # Generate current time and date as strings
                current_time = datetime.now().strftime('%I:%M %p')
                current_date = datetime.now().strftime('%d/%m/%Y')
                
                alert = Alert.objects.create(
                    alert_id=f'TEST-{random.randint(1000, 9999)}',
                    time=current_time,
                    date=current_date,
                    location=location,
                    status='pending',
                    coordinates_lat=lat,
                    coordinates_lng=lng,
                    time_remaining=30
                )
                self.stdout.write(f'Created alert {alert.alert_id} at {location} ({lat}, {lng})')
        else:
            # Update existing alerts with Lahore coordinates
            updated_count = 0
            for alert in alerts:
                # Generate random coordinates within Lahore
                lat = random.uniform(LAT_MIN, LAT_MAX)
                lng = random.uniform(LNG_MIN, LNG_MAX)
                location = random.choice(locations)
                
                alert.location = location
                alert.coordinates_lat = lat
                alert.coordinates_lng = lng
                alert.save()
                
                self.stdout.write(f'Updated alert {alert.alert_id} to {location} ({lat}, {lng})')
                updated_count += 1
            
            self.stdout.write(f'Successfully updated {updated_count} alerts') 