from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
import json

class JWTAuthenticationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('authentication:register')
        self.login_url = reverse('authentication:login')
        self.profile_url = reverse('authentication:profile')
        self.logout_url = reverse('authentication:logout')
        self.token_url = reverse('authentication:token_obtain_pair')
        self.refresh_url = reverse('authentication:token_refresh')
        self.verify_url = reverse('authentication:token_verify')
        
        # Create a test user
        self.test_user = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpassword123'
        }
        
        # For testing existing user
        User.objects.create_user(
            username='existinguser',
            email='existing@example.com',
            password='existingpassword123'
        )

    def test_user_registration(self):
        """Test user registration with JWT token response"""
        response = self.client.post(
            self.register_url, 
            data=json.dumps(self.test_user),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['username'], self.test_user['username'])
        self.assertEqual(response.data['email'], self.test_user['email'])
        
        # Verify user was created in database
        self.assertTrue(
            User.objects.filter(username=self.test_user['username']).exists()
        )

    def test_user_login(self):
        """Test user login with JWT token response"""
        # First create a user
        User.objects.create_user(
            username=self.test_user['username'],
            email=self.test_user['email'],
            password=self.test_user['password']
        )
        
        # Login with created user
        response = self.client.post(
            self.login_url,
            data=json.dumps({
                'username': self.test_user['username'],
                'password': self.test_user['password']
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['username'], self.test_user['username'])

    def test_token_obtain(self):
        """Test obtaining JWT token pair"""
        # First create a user
        User.objects.create_user(
            username=self.test_user['username'],
            email=self.test_user['email'],
            password=self.test_user['password']
        )
        
        # Get token pair
        response = self.client.post(
            self.token_url,
            data=json.dumps({
                'username': self.test_user['username'],
                'password': self.test_user['password']
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_token_refresh(self):
        """Test refreshing access token with refresh token"""
        # First create a user
        User.objects.create_user(
            username=self.test_user['username'],
            email=self.test_user['email'],
            password=self.test_user['password']
        )
        
        # Get token pair