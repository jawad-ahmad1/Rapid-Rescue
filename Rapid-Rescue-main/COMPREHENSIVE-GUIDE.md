# Rapid Rescue - Comprehensive Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Getting Started](#getting-started)
   - [Installation Options](#installation-options)
   - [Starting the Application](#starting-the-application)
   - [Creating an Admin User](#creating-an-admin-user)
4. [Project Structure](#project-structure)
   - [Standard Django Structure](#standard-django-structure)
   - [Frontend Structure](#frontend-structure)
   - [Backend Reorganization](#backend-reorganization)
5. [Authentication](#authentication)
   - [JWT Authentication](#jwt-authentication)
   - [Admin Authentication](#admin-authentication)
   - [Secure Authentication Flow](#secure-authentication-flow)
6. [Security Improvements](#security-improvements)
7. [Dependencies](#dependencies)
   - [Backend Dependencies](#backend-dependencies)
   - [Frontend Dependencies](#frontend-dependencies)
8. [API Documentation](#api-documentation)
   - [Authentication Endpoints](#authentication-endpoints)
   - [Alerts Endpoints](#alerts-endpoints)
   - [Drivers Endpoints](#drivers-endpoints)
   - [Ambulances Endpoints](#ambulances-endpoints)
   - [Accidents Endpoints](#accidents-endpoints)
   - [Statistics Endpoints](#statistics-endpoints)
9. [Integration with Google Maps](#integration-with-google-maps)
10. [Navigation Component](#navigation-component)
11. [Backend Integration](#backend-integration)
12. [Troubleshooting](#troubleshooting)
    - [Package Installation Issues](#package-installation-issues)
    - [Authentication Issues](#authentication-issues)
    - [Navigation Issues](#navigation-issues)
    - [CORS Issues](#cors-issues)
13. [Migration Guide](#migration-guide)

---

## Introduction

Rapid Rescue is a full-stack application with a Django backend and React frontend for emergency response coordination. The application helps coordinate emergency medical services for accidents and other medical emergencies.

## Prerequisites

- Python 3.9+
- Node.js 16+
- npm 8+
- Windows PowerShell 5.1+

## Getting Started

### Installation Options

The application includes scripts to automatically install dependencies and start both backend and frontend servers.

#### Option 1: Start Everything at Once

To start both frontend and backend servers in one command:

```powershell
# From the project root directory
.\start-all.ps1
```

This will:

1. Check and create virtual environment if needed
2. Install backend dependencies if needed
3. Run database migrations
4. Install frontend dependencies if needed
5. Start both backend and frontend servers

#### Option 2: Start Backend Only

To only start the backend server:

```powershell
# From the backend directory
cd backend
.\start_server.ps1
```

#### Option 3: Manual Setup

If you prefer to set up manually:

##### Backend Setup

```powershell
# From the backend directory
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

##### Frontend Setup

```powershell
# From the project root
npm install
npm run dev
```

### Starting the Application

After setup, the application will be available at:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/
- API Documentation: http://localhost:8000/api/docs/

### Creating an Admin User

Before using the application, you should create an admin user:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python manage.py createsuperuser
```

Follow the prompts to create your admin username and password.

## Project Structure

### Standard Django Structure

The project follows the standard Django structure:

```
backend/
  ├── api/                 # Django app
  │   ├── migrations/      # Database migrations
  │   ├── models.py        # Data models
  │   ├── serializers.py   # REST Framework serializers
  │   ├── views.py         # API view logic
  │   ├── urls.py          # API URL routing
  │   └── permissions.py   # Custom permission classes
  ├── rapidrescue/         # Django project settings
  │   ├── settings.py      # Django settings
  │   ├── urls.py          # Main URL routing
  │   └── wsgi.py          # WSGI configuration
  ├── manage.py            # Django command-line utility
  └── requirements.txt     # Python dependencies
```

### Frontend Structure

The frontend follows a standard React structure with Vite:

```
src/
  ├── components/          # React components
  ├── services/            # API services
  │   ├── api/             # Real API services
  │   └── auth/            # Authentication services
  ├── pages/               # Page components
  ├── App.jsx              # Main application component
  └── main.jsx             # Entry point
```

### Backend Reorganization

The backend has been reorganized into a modular structure with dedicated apps for each functionality:

1. **drivers_app**: Driver management and operations
2. **ambulances_app**: Ambulance fleet management
3. **alerts_app**: Emergency alert handling
4. **accidents_app**: Accident data and reporting
5. **authentication**: User authentication and management
6. **dashboard**: Statistics and analytics

The original API structure remains accessible at `/api/` for backward compatibility. The new structure is available at `/api/v1/`.

## Authentication

### JWT Authentication

The application now uses JWT (JSON Web Token) authentication exclusively. All API endpoints require authentication with a valid JWT token, which can be obtained by logging in or registering.

Authentication is handled through the following endpoints:

- `POST /api/auth/login/` - Driver login
- `POST /api/auth/admin/login/` - Admin login
- `POST /api/auth/logout/` - Logout current user
- `POST /api/auth/token/refresh/` - Refresh an access token

JWT tokens consist of:

- Access token: Short-lived (4 hours)
- Refresh token: Longer-lived (7 days)

Include the access token in API requests with the Authorization header:

```
Authorization: Bearer <access_token>
```

### Admin Authentication

The system implements secure admin authentication with the following features:

#### Admin User Management

To create an admin user:

1. Navigate to the backend directory
2. Run the command:

   ```
   python manage.py create_admin --username admin --email admin@example.com --password securepassword --superuser
   ```

   The `--superuser` flag is optional and grants full superuser access.

#### Django Built-in Admin Panel

The system includes Django's powerful built-in admin panel for administrative tasks:

1. Access the admin panel at `http://localhost:8000/admin/` after starting the Django server
2. Log in using the admin credentials you created with the `create_admin` command
3. From here you can:
   - Create, edit, and delete all system resources
   - Manage users and permissions
   - Create additional admin users

### Secure Authentication Flow

1. Admin authentication is now handled by the backend Django server
2. Credentials are securely validated against the Django User model
3. Only users with `is_staff` or `is_superuser` privileges can log in as admin
4. Authentication tokens are stored securely with a 4-hour expiration
5. No admin credentials are ever stored in the frontend code or environment variables

## Security Improvements

The following security improvements have been made to the application:

| Area                 | Previous Implementation  | Current Implementation               |
| -------------------- | ------------------------ | ------------------------------------ |
| Data storage         | In-memory list           | Django ORM and database              |
| Project structure    | Single script            | Full Django project + apps           |
| Authentication check | Always-allowed           | Strict JWT authentication required   |
| JWT integration      | Hand-rolled + SimpleJWT  | Uses TokenObtainPairView             |
| CORS handling        | Naive middleware         | Uses django-cors-headers package     |
| Admin user           | Hardcoded password       | Securely created admin users         |
| API security         | Mixed, often unprotected | All endpoints require authentication |

### Security Best Practices

- Never store admin credentials in frontend code or environment variables
- Use strong, unique passwords for admin accounts
- Regularly rotate admin passwords
- Use the built-in Django permissions system for granular access control
- In production, ensure all API endpoints use HTTPS

## Dependencies

### Backend Dependencies

#### Core Django and REST Framework

- **Django**: Web framework for building the backend API
- **djangorestframework**: API toolkit for building the REST API
- **djangorestframework-simplejwt**: JWT authentication for the API
- **django-cors-headers**: Handles Cross-Origin Resource Sharing for API requests

#### Authentication

- **PyJWT**: Python library for JWT token handling
- **djangorestframework-api-key**: API key authentication for non-user access

#### Documentation and API Tools

- **drf-yasg**: Swagger/OpenAPI documentation generator
- **django-rest-swagger**: API documentation UI

#### Data Management

- **django-filter**: Filtering support for the Django REST Framework
- **django-import-export**: Import/export data from admin
- **Pillow**: Python Imaging Library for image processing

#### Deployment and Production

- **whitenoise**: Static file serving for production
- **gunicorn**: WSGI HTTP Server for deploying Django in production
- **psycopg2-binary**: PostgreSQL adapter for Python

#### Other

- **python-dotenv**: Environment variable management
- **requests**: HTTP library for API requests
- **pydantic**: Data validation library

### Frontend Dependencies

#### Core React

- **react**: JavaScript library for building user interfaces
- **react-dom**: React package for DOM rendering
- **react-router-dom**: Routing library for React

#### UI Components

- **bootstrap**: CSS framework
- **react-bootstrap**: Bootstrap components for React
- **@fortawesome/fontawesome-free**: Icons library

#### Data Visualization

- **chart.js**: JavaScript charting library
- **react-chartjs-2**: React wrapper for Chart.js

#### Maps and Location

- **@react-google-maps/api**: Google Maps React components

#### HTTP and API

- **axios**: Promise based HTTP client

#### Development Tools

- **vite**: Frontend build tool
- **eslint**: JavaScript linter
- **tailwindcss**: Utility-first CSS framework
- **autoprefixer**: CSS postprocessor
- **postcss**: CSS transformer

## API Documentation

### Authentication Endpoints

- `POST /api/auth/login/` - Driver login
- `POST /api/auth/admin/login/` - Admin login
- `POST /api/auth/logout/` - Logout current user
- `GET /api/auth/user/` - Get current authenticated user data
- `POST /api/auth/token/refresh/` - Refresh access token

### Alerts Endpoints

- `GET /api/alerts/` - Get all alerts
- `GET /api/alerts/{id}/` - Get alert by ID
- `PATCH /api/alerts/{id}/` - Update alert
- `POST /api/alerts/` - Create new alert
- `POST /api/alerts/{id}/assign_driver/` - Assign driver to alert
- `POST /api/alerts/{id}/complete/` - Mark alert as complete
- `GET /api/alerts/pending/` - Get pending alerts
- `GET /api/alerts/assigned/` - Get assigned alerts
- `GET /api/alerts/completed/` - Get completed alerts
- `GET /api/alerts/my_alerts/` - Get alerts assigned to current driver
- `GET /api/alerts/my_active_alert/` - Get active alert for current driver

### Drivers Endpoints

- `GET /api/drivers/` - Get all drivers
- `GET /api/drivers/{id}/` - Get driver by ID
- `PATCH /api/drivers/{id}/` - Update driver
- `POST /api/drivers/` - Create new driver
- `GET /api/drivers/available/` - Get available drivers
- `GET /api/drivers/me/` - Get current driver profile

### Ambulances Endpoints

- `GET /api/ambulances/` - Get all ambulances
- `GET /api/ambulances/{id}/` - Get ambulance by ID
- `PATCH /api/ambulances/{id}/` - Update ambulance
- `POST /api/ambulances/` - Create new ambulance
- `GET /api/ambulances/available/` - Get available ambulances
- `GET /api/ambulances/my_ambulance/` - Get ambulance assigned to current driver

### Accidents Endpoints

- `GET /api/accidents/` - Get all accidents
- `GET /api/accidents/{id}/` - Get accident by ID
- `POST /api/accidents/` - Create new accident
- `GET /api/accidents/recent/` - Get recent accidents
- `GET /api/accidents/hotspots/` - Get accident hotspots

### Statistics Endpoints

- `GET /api/statistics/` - Get dashboard statistics
- `GET /api/heatmap/` - Get heatmap data

## Integration with Google Maps

The application redirects to Google Maps in a new tab for turn-by-turn directions instead of using the built-in navigation with Google Maps API.

### Benefits

1. **Reliability**: Google Maps is a stable, well-tested platform that works across all devices
2. **Familiarity**: Most users are already familiar with Google Maps navigation
3. **Maintenance**: Less code to maintain in our application
4. **Features**: Access to all Google Maps features like traffic, alternate routes, etc.
5. **Performance**: No need to load heavy mapping libraries in our application

### Using Google Maps Navigation

When you accept an alert from the Ambulance Dashboard, you'll be redirected to the Navigation page which now provides:

1. A simple interface showing alert details
2. A "OPEN IN GOOGLE MAPS" button
3. Patient information (if available)
4. Alert management controls

## Navigation Component

The AmbulanceNavigation component is responsible for providing turn-by-turn directions, displaying maps, and managing emergency response navigation for ambulance drivers.

### Component Features

When working correctly, the navigation page includes:

1. **Map Display**: Google Maps with current location, destination, and route
2. **Alert Information**: Alert ID, status, location details
3. **Navigation Controls**: Start Navigation, route refresh, emergency mode toggle
4. **Turn-by-Turn Directions**: Step-by-step instructions

### Emergency Workflow

The typical workflow for the navigation page is:

1. Ambulance Dashboard shows an alert
2. Driver accepts the alert
3. Navigation page loads with alert data
4. Driver reviews the route and starts navigation
5. Driver uses the turn-by-turn directions to reach the location
6. Once arrived, driver completes or cancels the alert
7. System returns to the dashboard

## Backend Integration

The frontend communicates with the Django backend through the API service.

### Key Frontend Service Files

- **`src/services/api/apiService.js`**: The main API service that communicates with the backend
- **`src/services/api/alertService.js`**: Alert-specific API service that uses the main API service

### Authentication System

The backend now includes a complete authentication system for drivers:

- Drivers can be created with login credentials (username/password)
- Each driver has a dedicated dashboard accessible after authentication
- Token-based authentication is used for secure API access
- Authentication state is managed in localStorage

## Troubleshooting

### Package Installation Issues

#### Backend Issues

1. **Timeout during package installation**:

   ```
   ReadTimeoutError: HTTPSConnectionPool(host='files.pythonhosted.org', port=443): Read timed out.
   ```

   **Solution**:

   - The scripts now include retry logic with increased timeouts
   - Manually install with longer timeout: `pip install -r requirements.txt --timeout 120`
   - Try using an alternative package index: `pip install -r requirements.txt --index-url https://pypi.org/simple/`

2. **JWT dependency conflicts**:

   ```
   ERROR: Cannot install PyJWT==2.8.0 and djangorestframework-jwt because these package versions have conflicting dependencies.
   ```

   **Solution**:

   - We've updated requirements.txt to use compatible versions
   - If issues persist, try: `pip install djangorestframework-simplejwt==5.3.1 PyJWT>=1.7.1,<3.0.0 --force-reinstall`

3. **Missing critical packages**:
   **Solution**:
   - Check the installation log in `backend/venv/.package_install_log.txt`
   - Install individual packages manually: `pip install <package_name>`

#### Frontend Issues

1. **npm install fails**:
   **Solution**:

   - Clear npm cache: `npm cache clean --force`
   - Try with no package lock: `npm install --no-package-lock`
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`

2. **Missing or broken packages**:
   **Solution**:
   - Check for specific errors in `.npm_install_log.txt`
   - Install individual packages: `npm install <package_name>`

### Authentication Issues

If you encounter permission issues with the Django admin panel:

1. Make sure your admin user is properly configured with both staff and superuser status:

   ```python
   python manage.py shell
   ```

   Then in the Python shell:

   ```python
   from django.contrib.auth.models import User
   user = User.objects.get(username='your_admin_username')
   user.is_staff = True
   user.is_superuser = True
   user.save()
   ```

2. Alternatively, create a new superuser with the built-in command:

   ```
   python manage.py createsuperuser
   ```

3. If you encounter 401 Unauthorized errors:
   - Clear the browser's localStorage and log in again
   - Check that the token is being stored correctly
   - Verify that the user exists and is associated with a driver profile

### Navigation Issues

If Google Maps doesn't open:

1. Check that you have internet connectivity
2. Ensure your browser allows pop-ups from the application
3. Verify that the coordinates in the alert data are valid

If you encounter a blank page when trying to access the navigation page:

1. Check the Browser Console for errors
2. Try accessing the test route (`/ambulance-navigation-test`)
3. Check the Google Maps API key in `AmbulanceNavigation.jsx`

### CORS Issues

If you encounter CORS issues, make sure:

1. The Django backend has `django-cors-headers` installed and configured
2. The frontend is making requests to the correct backend URL

## Migration Guide

The backend has been reorganized into a more modular structure. A migration plan exists to transition from the legacy structure to the new structure, which includes:

1. **Setup & Parallel Structure**: Create new app modules and set up models
2. **Data Migration**: Backup database, create migrations, run migrations, migrate data
3. **API Transition**: Keep both API structures running in parallel
4. **Cleanup**: Deprecate old API endpoints, update documentation

### Database Relations Mapping

- Old: `api.Driver.user` → New: `drivers_app.Driver.user`
- Old: `api.Ambulance` → New: `ambulances_app.Ambulance`
- Old: `api.Alert` → New: `alerts_app.Alert`
- Old: `api.Accident` → New: `accidents_app.Accident`

## Features

- Real-time alert management
- Driver assignment and tracking
- Ambulance status monitoring
- Administrative dashboard
- Accident analytics and heatmaps
- Driver management portal
- JWT Authentication with token refresh
- Proper permission handling
- Data persistence using Django ORM and database
- CORS protection with specific allowed origins
