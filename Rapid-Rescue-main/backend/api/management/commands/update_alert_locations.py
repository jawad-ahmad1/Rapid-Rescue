from django.core.management.base import BaseCommand
from api.models import Alert
import random

class Command(BaseCommand):
    help = 'Updates alert locations to be within Lahore boundaries'

    def handle(self, *args, **options):
        # Define Lahore boundaries
        LAHORE_BOUNDS = {
            'LAT_MIN': 31.4000,
            'LAT_MAX': 31.6000,
            'LNG_MIN': 74.2000,
            'LNG_MAX': 74.4000
        }

        # Popular locations in Lahore with their coordinates
        LAHORE_LOCATIONS = [
            {'name': 'Johar Town', 'lat': 31.4697, 'lng': 74.2728},
            {'name': 'Model Town', 'lat': 31.4818, 'lng': 74.3162},
            {'name': 'DHA Phase 5', 'lat': 31.4750, 'lng': 74.2900},
            {'name': 'Gulberg III', 'lat': 31.5010, 'lng': 74.3440},
            {'name': 'Garden Town', 'lat': 31.4920, 'lng': 74.3000},
            {'name': 'Allama Iqbal Town', 'lat': 31.4833, 'lng': 74.2833},
            {'name': 'Cavalry Ground', 'lat': 31.4989, 'lng': 74.3475},
            {'name': 'Faisal Town', 'lat': 31.4833, 'lng': 74.3000},
        ]

        # Get all alerts
        alerts = Alert.objects.all()
        updated_count = 0
        total_count = alerts.count()

        self.stdout.write(f'Found {total_count} alerts to check')

        for alert in alerts:
            needs_update = False
            
            # Check if coordinates are outside Lahore boundaries
            if (alert.coordinates_lat < LAHORE_BOUNDS['LAT_MIN'] or 
                alert.coordinates_lat > LAHORE_BOUNDS['LAT_MAX'] or
                alert.coordinates_lng < LAHORE_BOUNDS['LNG_MIN'] or
                alert.coordinates_lng > LAHORE_BOUNDS['LNG_MAX']):
                needs_update = True
            
            # Also check for invalid coordinates
            if (not alert.coordinates_lat or not alert.coordinates_lng or
                isinstance(alert.coordinates_lat, str) or isinstance(alert.coordinates_lng, str)):
                needs_update = True

            if needs_update:
                # Choose a random location from our predefined list
                new_location = random.choice(LAHORE_LOCATIONS)
                
                # Add small random offset to avoid all alerts at exact same spot
                lat_offset = random.uniform(-0.002, 0.002)
                lng_offset = random.uniform(-0.002, 0.002)
                
                alert.coordinates_lat = new_location['lat'] + lat_offset
                alert.coordinates_lng = new_location['lng'] + lng_offset
                alert.location = new_location['name']
                alert.save()
                
                updated_count += 1
                self.stdout.write(f'Updated alert {alert.id} to location: {alert.location} ({alert.coordinates_lat}, {alert.coordinates_lng})')

        self.stdout.write(self.style.SUCCESS(
            f'Successfully updated {updated_count} out of {total_count} alerts to be within Lahore boundaries'
        )) 