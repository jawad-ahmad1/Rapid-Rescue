# Rapid Rescue Backend

This is the backend for the Rapid Rescue application, which helps coordinate emergency medical services for accidents and other medical emergencies.

## Project Structure

The backend is organized into multiple Django apps for better separation of concerns:

- `drivers_app`: Manages driver data and locations
- `ambulances_app`: Manages ambulance data and statuses
- `alerts_app`: Handles alert notifications and dispatch
- `accidents_app`: Manages accident reports and data
- `authentication`: Handles user authentication and authorization
- `dashboard`: Provides analytics and monitoring data
- `api`: Legacy monolithic app (for backward compatibility)

## Authentication

The backend uses JWT (JSON Web Tokens) authentication exclusively. All API endpoints require authentication with a valid JWT token, which can be obtained by logging in or registering.

### JWT Authentication

Authentication is handled through the following endpoints:

- `POST /api/v1/auth/register/`: Register a new user
- `POST /api/v1/auth/login/`: Login and get JWT tokens
- `POST /api/v1/auth/token/`: Get JWT tokens directly
- `POST /api/v1/auth/token/refresh/`: Refresh an access token
- `POST /api/v1/auth/token/verify/`: Verify a token is valid
- `POST /api/v1/auth/logout/`: Logout and blacklist token

JWT tokens consist of:

- Access token: Short-lived (4 hours)
- Refresh token: Longer-lived (7 days)

Include the access token in API requests with the Authorization header:

```
Authorization: Bearer <access_token>
```

## Setup and Installation

1. Clone the repository
2. Create a virtual environment:
   ```
   python -m venv venv
   ```
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Unix/MacOS: `source venv/bin/activate`
4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
5. Apply migrations:
   ```
   python manage.py migrate
   ```
6. Create a superuser:
   ```
   python manage.py createsuperuser
   ```
7. Run the development server:
   ```
   python manage.py runserver
   ```

## API Documentation

For detailed API documentation, see:

- `docs/api_endpoints.md`: Comprehensive list of all API endpoints
- `docs/frontend_migration_guide.md`: Guide for updating frontend code to use the new API structure

## Testing

Run tests with:

```
python manage.py test
```

To test authentication specifically:

```
python manage.py test authentication
```

## Legacy API Support

The legacy API endpoints under `/api/` are still supported for backward compatibility. However, all new development should use the new endpoints under `/api/v1/`.
