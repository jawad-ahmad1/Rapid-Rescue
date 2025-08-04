# Backend Testing Guide

This document provides guidelines for testing the new backend structure to ensure all functionality works as expected.

## Testing Strategy

The testing strategy consists of the following components:

1. **Unit Testing**: Test individual models, serializers, and views
2. **Integration Testing**: Test how components work together
3. **API Testing**: Test API endpoints and responses
4. **Data Migration Testing**: Test data migration from old to new structure
5. **Authentication Testing**: Test user authentication and permissions

## Setting Up Test Environment

1. Create a test database by running:

   ```
   python manage.py test
   ```

2. For manual testing, you can use the development server:

   ```
   python manage.py runserver
   ```

3. Use tools like Postman or curl to test API endpoints.

## Unit Testing

### Models Testing

Create test cases for each model in their respective app's `tests.py` file. Example for the Driver model:

```python
from django.test import TestCase
from drivers_app.models import Driver
from django.contrib.auth.models import User

class DriverModelTest(TestCase):
    def setUp(self):
        # Create a user
        self.user = User.objects.create_user(
            username='testdriver',
            password='testpassword'
        )

        # Create a driver
        self.driver = Driver.objects.create(
            user=self.user,
            phone_number='1234567890',
            license_number='DL12345',
            status='available'
        )

    def test_driver_creation(self):
        """Test driver creation"""
        self.assertEqual(self.driver.user.username, 'testdriver')
        self.assertEqual(self.driver.phone_number, '1234567890')
        self.assertEqual(self.driver.license_number, 'DL12345')
        self.assertEqual(self.driver.status, 'available')
```

### Serializers Testing

Test that serializers correctly serialize and deserialize data:

```python
from django.test import TestCase
from rest_framework.test import APIRequestFactory
from drivers_app.serializers import DriverSerializer
from drivers_app.models import Driver
from django.contrib.auth.models import User

class DriverSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testdriver',
            password='testpassword'
        )

        self.driver = Driver.objects.create(
            user=self.user,
            phone_number='1234567890',
            license_number='DL12345',
            status='available'
        )

        self.serializer = DriverSerializer(instance=self.driver)

    def test_contains_expected_fields(self):
        """Test that serializer contains expected fields"""
        data = self.serializer.data
        self.assertEqual(set(data.keys()), set(['id', 'user', 'phone_number', 'license_number', 'status']))
```

### Views Testing

Test API views using Django REST framework's testing tools:

```python
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from django.contrib.auth.models import User
from drivers_app.models import Driver

class DriverViewsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpassword'
        )
        self.client.force_authenticate(user=self.user)

        self.driver = Driver.objects.create(
            user=self.user,
            phone_number='1234567890',
            license_number='DL12345',
            status='available'
        )

    def test_get_all_drivers(self):
        """Test retrieving all drivers"""
        response = self.client.get(reverse('driver-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
```

## API Testing

Test all API endpoints to ensure they return the expected responses:

1. Authentication endpoints
2. CRUD operations for all models
3. Special endpoints for specific functionality

Example API test cases:

```python
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from django.contrib.auth.models import User

class AuthenticationAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpassword'
        )

    def test_login(self):
        """Test user login"""
        response = self.client.post(
            '/api/v1/auth/login/',
            {'username': 'testuser', 'password': 'testpassword'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue('token' in response.data)
```

## Data Migration Testing

Test the data migration commands to ensure data is correctly migrated from the old structure to the new structure:

```bash
# First, check for potential issues
python manage.py migrate_driver_data --check-only

# Then, run the actual migration
python manage.py migrate_driver_data

# Test other migration commands
python manage.py migrate_ambulance_data
python manage.py migrate_alert_data
python manage.py migrate_accident_data
```

Verify that the data has been correctly migrated by:

1. Checking the database records
2. Using the API endpoints to retrieve the data
3. Ensuring relationships between models are maintained

## Authentication Testing

Test user authentication and permissions:

1. Test that unauthenticated users cannot access protected endpoints
2. Test that users can only access resources they have permission for
3. Test login, logout, and token authentication

## Running All Tests

Run all tests with a single command:

```bash
python manage.py test
```

For specific app tests:

```bash
python manage.py test drivers_app
python manage.py test ambulances_app
python manage.py test alerts_app
python manage.py test accidents_app
```

## Test Coverage

To measure test coverage, install the `coverage` package:

```bash
pip install coverage
```

Run tests with coverage:

```bash
coverage run --source='.' manage.py test
coverage report
```

Generate an HTML report for detailed analysis:

```bash
coverage html
```

## Continuous Integration

Set up continuous integration to run tests automatically on each commit:

1. Add a CI configuration file (e.g., for GitHub Actions)
2. Configure the CI to run tests, linting, and other checks
3. Ensure all tests pass before merging pull requests
