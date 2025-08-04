# Rapid Rescue - Alert Service

This is a standalone microservice for handling alerts in the Rapid Rescue system. It provides REST API endpoints for creating, updating, and managing emergency alerts.

## Setup

1. Create a virtual environment:

```bash
python -m venv venv
```

2. Activate the virtual environment:

- Windows:

```bash
.\venv\Scripts\activate
```

- Unix/MacOS:

```bash
source venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Apply database migrations:

```bash
python manage.py migrate
```

5. Create a superuser (optional):

```bash
python manage.py createsuperuser
```

6. Run the development server:

```bash
python manage.py runserver 8001
```

## API Endpoints

- `GET /api/alerts/` - List all alerts
- `POST /api/alerts/` - Create a new alert
- `GET /api/alerts/{id}/` - Retrieve a specific alert
- `PUT /api/alerts/{id}/` - Update an alert
- `DELETE /api/alerts/{id}/` - Delete an alert
- `POST /api/alerts/{id}/resolve/` - Mark an alert as resolved
- `POST /api/alerts/{id}/cancel/` - Cancel an alert
- `GET /api/alerts/active/` - List all active alerts

## Environment Variables

Create a `.env` file in the project root with the following variables:

```
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1
```

## Integration with Main Application

To integrate this service with the main Rapid Rescue application:

1. Update the main application's settings to include the alerts service URL
2. Use the provided API endpoints to communicate with the alerts service
3. Implement proper error handling for service communication

## Development

The service uses:

- Django REST framework for API development
- SQLite as the default database (can be changed in settings.py)
- CORS headers for cross-origin resource sharing
