from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
import random
from api.models import Driver, Ambulance, Alert, Accident

class Command(BaseCommand):
    help = 'Seed database with initial data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding database...')
        
        # Clear existing data
        Driver.objects.all().delete()
        Ambulance.objects.all().delete()
        Alert.objects.all().delete()
        Accident.objects.all().delete()
        
        # Create drivers
        drivers = [
            {
                'name': 'Ali Razaq',
                'contact_no': '0313 66583695',
                'status': 'available',
                'license_no': 'LHR-123456',
                'experience': 5,
                'address': 'Model Town, Lahore'
            },
            {
                'name': 'Usman Khan',
                'contact_no': '0321 1234567',
                'status': 'available',
                'license_no': 'LHR-789012',
                'experience': 3,
                'address': 'Johar Town, Lahore'
            },
            {
                'name': 'Ahmed Raza',
                'contact_no': '0300 9876543',
                'status': 'on_duty',
                'license_no': 'LHR-456789',
                'experience': 7,
                'address': 'DHA Phase 5, Lahore'
            },
            {
                'name': 'Bilal Ahmad',
                'contact_no': '0333 5555555',
                'status': 'available',
                'license_no': 'LHR-101010',
                'experience': 2,
                'address': 'Gulberg III, Lahore'
            }
        ]
        
        driver_objects = []
        for driver_data in drivers:
            driver = Driver.objects.create(**driver_data)
            driver_objects.append(driver)
            self.stdout.write(f'Created driver: {driver.name}')
        
        # Create ambulances
        ambulances = [
            {
                'vehicle_no': 'LHR-1234',
                'model': 'Toyota Hiace 2020',
                'status': 'available',
                'driver': driver_objects[0],
                'location_lat': 31.4697,
                'location_lng': 74.2728
            },
            {
                'vehicle_no': 'LHR-5678',
                'model': 'Mercedes Sprinter 2021',
                'status': 'available',
                'driver': driver_objects[1],
                'location_lat': 31.4818,
                'location_lng': 74.3162
            },
            {
                'vehicle_no': 'LHR-9012',
                'model': 'Toyota Hiace 2019',
                'status': 'on_duty',
                'driver': driver_objects[2],
                'location_lat': 31.4750,
                'location_lng': 74.2900
            },
            {
                'vehicle_no': 'LHR-3456',
                'model': 'Mercedes Sprinter 2022',
                'status': 'available',
                'driver': driver_objects[3],
                'location_lat': 31.5010,
                'location_lng': 74.3440
            }
        ]
        
        for ambulance_data in ambulances:
            ambulance = Ambulance.objects.create(**ambulance_data)
            self.stdout.write(f'Created ambulance: {ambulance.vehicle_no}')
        
        # Create alerts
        alerts = [
            {
                'alert_id': '#2234',
                'time': '12:30 PM',
                'date': 'Today',
                'location': 'Johar Town Lahore',
                'status': 'pending',
                'driver': None,
                'response_time': None,
                'coordinates_lat': 31.4697,
                'coordinates_lng': 74.2728,
                'time_remaining': 30
            },
            {
                'alert_id': '#2235',
                'time': '12:45 PM',
                'date': 'Today',
                'location': 'Model Town, Lahore',
                'status': 'assigned',
                'driver': driver_objects[0],
                'response_time': None,
                'coordinates_lat': 31.4818,
                'coordinates_lng': 74.3162,
                'time_remaining': 30
            },
            {
                'alert_id': '#2236',
                'time': '11:30 AM',
                'date': 'Yesterday',
                'location': 'DHA Phase 5, Lahore',
                'status': 'complete',
                'driver': driver_objects[0],
                'response_time': '10 mins',
                'coordinates_lat': 31.4750,
                'coordinates_lng': 74.2900,
                'time_remaining': 0
            },
            {
                'alert_id': '#2237',
                'time': '10:15 AM',
                'date': 'Today',
                'location': 'Gulberg III, Lahore',
                'status': 'pending',
                'driver': None,
                'response_time': None,
                'coordinates_lat': 31.5010,
                'coordinates_lng': 74.3440,
                'time_remaining': 30
            },
            {
                'alert_id': '#2238',
                'time': '09:45 AM',
                'date': 'Today',
                'location': 'Garden Town, Lahore',
                'status': 'assigned',
                'driver': driver_objects[1],
                'response_time': None,
                'coordinates_lat': 31.4920,
                'coordinates_lng': 74.3000,
                'time_remaining': 25
            }
        ]
        
        for alert_data in alerts:
            alert = Alert.objects.create(**alert_data)
            self.stdout.write(f'Created alert: {alert.alert_id}')
        
        # Create accidents (historical data)
        locations = [
            'Johar Town Lahore',
            'Model Town, Lahore',
            'DHA Phase 5, Lahore',
            'Gulberg III, Lahore',
            'Garden Town, Lahore',
            'Cavalry Ground, Lahore',
            'Faisal Town, Lahore',
            'Allama Iqbal Town, Lahore',
            'Valencia Town, Lahore',
            'Bahria Town, Lahore'
        ]
        
        severities = ['Low', 'Medium', 'High']
        
        today = timezone.now().date()
        
        for i in range(50):  # Create 50 historical accidents
            days_ago = random.randint(1, 365)
            accident_date = today - timedelta(days=days_ago)
            
            hour = random.randint(0, 23)
            minute = random.randint(0, 59)
            accident_time = datetime.strptime(f'{hour}:{minute}', '%H:%M').time()
            
            location = random.choice(locations)
            
            # Base coordinates for Lahore
            base_lat = 31.5
            base_lng = 74.3
            
            accident = Accident.objects.create(
                location=location,
                date=accident_date,
                time=accident_time,
                severity=random.choice(severities),
                description=f'Accident at {location}',
                injured=random.randint(0, 5),
                fatalities=random.randint(0, 2),
                coordinates_lat=base_lat + (random.random() * 0.1 - 0.05),
                coordinates_lng=base_lng + (random.random() * 0.1 - 0.05)
            )
            
        self.stdout.write(f'Created {Accident.objects.count()} historical accidents')
        self.stdout.write('Database seeding completed!') 