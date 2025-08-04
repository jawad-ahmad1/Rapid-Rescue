from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.urls import reverse
from .models import Driver, Ambulance, Alert, Accident

class ModelsTestCase(TestCase):
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword123'
        )
        
        # Create test driver
        self.driver = Driver.objects.create(
            user=self.user,
            name='Test Driver',
            contact_no='1234567890',
            status='available',
            license_no='DL12345',
            experience=5
        )
        
        # Create test ambulance
        self.ambulance = Ambulance.objects.create(
            vehicle_no='AMB001',
            model='Emergency Van',
            status='available',
            driver=self.driver,
            location_lat=12.9716,
            location_lng=77.5946
        )
        
        # Create test alert
        self.alert = Alert.objects.create(
            alert_id='ALT001',
            time='10:30 AM',
            date='2025-05-25',
            location='Test Location',
            status='pending',
            driver=self.driver,
            coordinates_lat=12.9716,
            coordinates_lng=77.5946,
            time_remaining=15
        )
        
        # Create test accident
        self.accident = Accident.objects.create(
            location='Test Accident Location',
            date='2025-05-25',
            time='10:30:00',
            severity='Medium',
            injured=2,
            fatalities=0,
            coordinates_lat=12.9716,
            coordinates_lng=77.5946
        )
    
    def test_driver_model(self):
        """Test that the Driver model is working correctly"""
        self.assertEqual(self.driver.name, 'Test Driver')
        self.assertEqual(self.driver.user, self.user)
        self.assertEqual(str(self.driver), 'Test Driver')
    
    def test_ambulance_model(self):
        """Test that the Ambulance model is working correctly"""
        self.assertEqual(self.ambulance.vehicle_no, 'AMB001')
        self.assertEqual(self.ambulance.driver, self.driver)
        self.assertEqual(str(self.ambulance), 'AMB001 - Emergency Van')
    
    def test_alert_model(self):
        """Test that the Alert model is working correctly"""
        self.assertEqual(self.alert.alert_id, 'ALT001')
        self.assertEqual(self.alert.driver, self.driver)
        self.assertEqual(str(self.alert), 'ALT001')
    
    def test_accident_model(self):
        """Test that the Accident model is working correctly"""
        self.assertEqual(self.accident.location, 'Test Accident Location')
        self.assertEqual(self.accident.severity, 'Medium')
        self.assertTrue('Accident at Test Accident Location' in str(self.accident))

class APIJWTTestCase(APITestCase):
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword123'
        )
        
        # Create a test driver
        self.driver = Driver.objects.create(
            user=self.user,
            name='Test Driver',
            contact_no='1234567890',
            status='available',
            license_no='DL12345',
            experience=5
        )
        
        # Get JWT tokens
        response = self.client.post(
            reverse('authentication:token_obtain_pair'), 
            {'username': 'testuser', 'password': 'testpassword123'},
            format='json'
        )
        
        self.token = response.data['access']
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
    
    def test_driver_list(self):
        """Test driver list endpoint with JWT authentication"""
        url = reverse('api:driver-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) > 0)
    
    def test_driver_detail(self):
        """Test driver detail endpoint with JWT authentication"""
        url = reverse('api:driver-detail', args=[self.driver.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Test Driver')
