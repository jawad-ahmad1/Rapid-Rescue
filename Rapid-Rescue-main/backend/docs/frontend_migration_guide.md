# Frontend Migration Guide

This document provides guidance on updating the frontend to work with the new backend API structure.

## API Changes

The backend has been restructured into multiple specialized apps with their own models, views, and endpoints. While the legacy API endpoints (`/api/`) will continue to work during the transition period, all new development should use the new modular API endpoints (`/api/v1/`).

## Authentication Changes

The authentication system now uses JWT (JSON Web Tokens) exclusively. This requires changes to how authentication is handled in the frontend:

1. **JWT Token Storage**:

   ```javascript
   // After login/registration, store both tokens
   const storeTokens = (tokens) => {
     localStorage.setItem("access_token", tokens.access);
     localStorage.setItem("refresh_token", tokens.refresh);
   };
   ```

2. **Adding Authorization Headers**:

   ```javascript
   // Include the JWT token in all API requests
   const apiRequest = async (url, options = {}) => {
     const accessToken = localStorage.getItem("access_token");

     const headers = {
       ...options.headers,
       Authorization: `Bearer ${accessToken}`,
       "Content-Type": "application/json",
     };

     return fetch(url, {
       ...options,
       headers,
     });
   };
   ```

3. **Token Refresh Logic**:

   ```javascript
   // Refreshing the access token when it expires
   const refreshToken = async () => {
     const refresh = localStorage.getItem("refresh_token");

     if (!refresh) {
       // No refresh token, redirect to login
       window.location.href = "/login";
       return null;
     }

     try {
       const response = await fetch("/api/v1/auth/token/refresh/", {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
         },
         body: JSON.stringify({ refresh }),
       });

       if (response.ok) {
         const tokens = await response.json();
         localStorage.setItem("access_token", tokens.access);
         return tokens.access;
       } else {
         // Refresh token invalid, redirect to login
         localStorage.removeItem("access_token");
         localStorage.removeItem("refresh_token");
         window.location.href = "/login";
         return null;
       }
     } catch (error) {
       console.error("Token refresh failed:", error);
       return null;
     }
   };
   ```

4. **Handling Expired Tokens**:

   ```javascript
   // Handle 401 responses by attempting to refresh the token
   const apiRequestWithRefresh = async (url, options = {}) => {
     let response = await apiRequest(url, options);

     // If unauthorized, try refreshing the token
     if (response.status === 401) {
       const newToken = await refreshToken();

       if (newToken) {
         // Retry the request with the new token
         response = await apiRequest(url, options);
       }
     }

     return response;
   };
   ```

5. **Logout Function**:
   ```javascript
   // Properly logout by blacklisting the refresh token
   const logout = async () => {
     const refresh = localStorage.getItem("refresh_token");
     const access = localStorage.getItem("access_token");

     if (refresh && access) {
       try {
         await fetch("/api/v1/auth/logout/", {
           method: "POST",
           headers: {
             Authorization: `Bearer ${access}`,
             "Content-Type": "application/json",
           },
           body: JSON.stringify({ refresh }),
         });
       } catch (error) {
         console.error("Logout API call failed:", error);
       }
     }

     // Clear tokens regardless of API success
     localStorage.removeItem("access_token");
     localStorage.removeItem("refresh_token");

     // Redirect to login
     window.location.href = "/login";
   };
   ```

## New API Endpoints

The following new endpoints are available:

### Drivers API

- **Endpoint**: `/api/v1/drivers/`
- **Methods**: GET, POST, PUT, PATCH, DELETE
- **Authentication**: Required
- **Description**: Manage driver data

### Ambulances API

- **Endpoint**: `/api/v1/ambulances/`
- **Methods**: GET, POST, PUT, PATCH, DELETE
- **Authentication**: Required
- **Description**: Manage ambulance data

### Alerts API

- **Endpoint**: `/api/v1/alerts/`
- **Methods**: GET, POST, PUT, PATCH, DELETE
- **Authentication**: Required
- **Description**: Manage alerts data

### Accidents API

- **Endpoint**: `/api/v1/accidents/`
- **Methods**: GET, POST, PUT, PATCH, DELETE
- **Authentication**: Required
- **Description**: Manage accident data

### Dashboard API

- **Endpoint**: `/api/v1/dashboard/statistics/`
- **Methods**: GET
- **Authentication**: Required
- **Description**: Dashboard data and statistics

- **Endpoint**: `/api/v1/dashboard/heatmap/`
- **Methods**: GET
- **Authentication**: Required
- **Description**: Accident heatmap data

## Frontend Update Steps

1. Update API client configuration:

   ```javascript
   // OLD
   const API_BASE_URL = "/api";

   // NEW
   const API_BASE_URL = "/api/v1";
   ```

2. Update API service calls to use the new endpoints:

   ```javascript
   // OLD
   fetch(`${API_BASE_URL}/drivers/`);

   // NEW
   fetch(`${API_BASE_URL}/drivers/`);
   ```

3. Update any direct references to API endpoints in your components:

   ```jsx
   // OLD
   axios.get("/api/ambulances/");

   // NEW
   axios.get("/api/v1/ambulances/");
   ```

4. Test all API calls in development to ensure they work correctly.

## Data Model Changes

The data models have been reorganized but maintain the same structure for compatibility. Key relationships to be aware of:

- `Driver` has a one-to-one relationship with `User`
- `Ambulance` has a foreign key to `Driver`
- `Alert` has a foreign key to `Driver`

## Testing

After updating your frontend code:

1. Test all API calls in development mode
2. Verify that authentication still works
3. Check that data is displayed correctly
4. Test all form submissions and data updates

## Transition Period

During the transition period, both old and new API endpoints will work. This allows for a gradual migration of the frontend. The legacy API endpoints will eventually be deprecated after all frontend code has been updated.

## Need Help?

If you encounter any issues during the migration, please contact the backend team for assistance.
