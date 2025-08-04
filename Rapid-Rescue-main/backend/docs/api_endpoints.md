# Rapid Rescue API Documentation

This document provides information about all available API endpoints in the Rapid Rescue application.

## Authentication

All API endpoints require authentication except where noted. Use JWT authentication by including the following header in your requests:

```
Authorization: Bearer <your_access_token>
```

Access tokens expire after 4 hours. Use the refresh token endpoint to get a new access token when it expires.

## Authentication Endpoints

### Login

- **URL**: `/api/v1/auth/login/`
- **Method**: `POST`
- **Auth Required**: No
- **Data**:
  ```json
  {
    "username": "your_username",
    "password": "your_password"
  }
  ```
- **Success Response**:
  ```json
  {
    "user_id": 1,
    "username": "your_username",
    "refresh": "refresh_token_string",
    "access": "access_token_string"
  }
  ```

### Register

- **URL**: `/api/v1/auth/register/`
- **Method**: `POST`
- **Auth Required**: No
- **Data**:
  ```json
  {
    "username": "new_username",
    "email": "user@example.com",
    "password": "new_password"
  }
  ```
- **Success Response**:
  ```json
  {
    "user_id": 1,
    "username": "new_username",
    "email": "user@example.com",
    "refresh": "refresh_token_string",
    "access": "access_token_string"
  }
  ```

### Logout

- **URL**: `/api/v1/auth/logout/`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data**:
  ```json
  {
    "refresh": "your_refresh_token"
  }
  ```
- **Success Response**:
  ```json
  {
    "message": "Successfully logged out"
  }
  ```

### User Profile

- **URL**: `/api/v1/auth/profile/`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  ```json
  {
    "user_id": 1,
    "username": "your_username",
    "email": "user@example.com",
    "first_name": "First",
    "last_name": "Last"
  }
  ```

## Drivers Endpoints

### List Drivers

- **URL**: `/api/v1/drivers/`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: List of all drivers

### Get Driver

- **URL**: `/api/v1/drivers/<id>/`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Details of the specified driver

### Create Driver

- **URL**: `/api/v1/drivers/`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data**: Driver data
- **Success Response**: Created driver object

### Update Driver

- **URL**: `/api/v1/drivers/<id>/`
- **Method**: `PUT/PATCH`
- **Auth Required**: Yes
- **Data**: Driver data to update
- **Success Response**: Updated driver object

### Delete Driver

- **URL**: `/api/v1/drivers/<id>/`
- **Method**: `DELETE`
- **Auth Required**: Yes
- **Success Response**: 204 No Content

## Ambulances Endpoints

### List Ambulances

- **URL**: `/api/v1/ambulances/`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: List of all ambulances

### Get Ambulance

- **URL**: `/api/v1/ambulances/<id>/`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Details of the specified ambulance

### Create Ambulance

- **URL**: `/api/v1/ambulances/`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data**: Ambulance data
- **Success Response**: Created ambulance object

### Update Ambulance

- **URL**: `/api/v1/ambulances/<id>/`
- **Method**: `PUT/PATCH`
- **Auth Required**: Yes
- **Data**: Ambulance data to update
- **Success Response**: Updated ambulance object

### Delete Ambulance

- **URL**: `/api/v1/ambulances/<id>/`
- **Method**: `DELETE`
- **Auth Required**: Yes
- **Success Response**: 204 No Content

## Alerts Endpoints

### List Alerts

- **URL**: `/api/v1/alerts/`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: List of all alerts

### Get Alert

- **URL**: `/api/v1/alerts/<id>/`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Details of the specified alert

### Create Alert

- **URL**: `/api/v1/alerts/`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data**: Alert data
- **Success Response**: Created alert object

### Update Alert

- **URL**: `/api/v1/alerts/<id>/`
- **Method**: `PUT/PATCH`
- **Auth Required**: Yes
- **Data**: Alert data to update
- **Success Response**: Updated alert object

### Delete Alert

- **URL**: `/api/v1/alerts/<id>/`
- **Method**: `DELETE`
- **Auth Required**: Yes
- **Success Response**: 204 No Content

## Accidents Endpoints

### List Accidents

- **URL**: `/api/v1/accidents/`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: List of all accidents

### Get Accident

- **URL**: `/api/v1/accidents/<id>/`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Details of the specified accident

### Create Accident

- **URL**: `/api/v1/accidents/`
- **Method**: `POST`
- **Auth Required**: Yes
- **Data**: Accident data
- **Success Response**: Created accident object

### Update Accident

- **URL**: `/api/v1/accidents/<id>/`
- **Method**: `PUT/PATCH`
- **Auth Required**: Yes
- **Data**: Accident data to update
- **Success Response**: Updated accident object

### Delete Accident

- **URL**: `/api/v1/accidents/<id>/`
- **Method**: `DELETE`
- **Auth Required**: Yes
- **Success Response**: 204 No Content

## Dashboard Endpoints

### Dashboard Statistics

- **URL**: `/api/v1/dashboard/statistics/`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:
  ```json
  {
    "total_drivers": 10,
    "total_ambulances": 5,
    "total_alerts": 20,
    "total_accidents": 15,
    "available_drivers": 7,
    "available_ambulances": 3,
    "pending_alerts": 5
  }
  ```

### Heatmap Data

- **URL**: `/api/v1/dashboard/heatmap/`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: List of accident locations with severity for heatmap visualization

## JWT Token Endpoints

### Obtain Token

- **URL**: `/api/v1/auth/token/`
- **Method**: `POST`
- **Auth Required**: No
- **Data**:
  ```json
  {
    "username": "your_username",
    "password": "your_password"
  }
  ```
- **Success Response**:
  ```json
  {
    "refresh": "refresh_token_string",
    "access": "access_token_string"
  }
  ```

### Refresh Token

- **URL**: `/api/v1/auth/token/refresh/`
- **Method**: `POST`
- **Auth Required**: No
- **Data**:
  ```json
  {
    "refresh": "your_refresh_token"
  }
  ```
- **Success Response**:
  ```json
  {
    "access": "new_access_token_string"
  }
  ```

### Verify Token

- **URL**: `/api/v1/auth/token/verify/`
- **Method**: `POST`
- **Auth Required**: No
- **Data**:
  ```json
  {
    "token": "your_access_token"
  }
  ```
- **Success Response**: 200 OK if the token is valid
