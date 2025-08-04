// Make sure we import axios
import axios from 'axios';

// API base URL - replace this with your backend URL
export const API_BASE_URL = 'http://localhost:8000/api';

// Debug flag - set to true to enable console logging of API requests
const DEBUG_API = true;

// Debug helper function
const debugLog = (message, data) => {
  if (DEBUG_API) {
    console.log(`[API Debug] ${message}`, data || '');
  }
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  try {
    // Debug log the response
    debugLog(`Handling response from ${response.url}:`, { status: response.status });
    
    // For 204 No Content responses, return empty object
    if (response.status === 204) {
      return {};
    }
    
    // Try to parse as JSON
    let data;
    try {
      data = await response.json();
      debugLog('Response data:', data);
    } catch (parseError) {
      debugLog('Error parsing JSON response:', parseError);
      
      // If we can't parse as JSON, try to get text
      const text = await response.text();
      if (text.length > 0) {
        debugLog('Response text:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      } else {
        // Empty response
        return {};
      }
    }
    
  if (!response.ok) {
      // Try to extract error message from response
      const errorMessage = data.message || data.error || data.detail || `HTTP error ${response.status}`;
      debugLog('Error response:', { status: response.status, message: errorMessage });
      throw new Error(errorMessage);
    }
    
    return data;
  } catch (error) {
    debugLog('Error in handleResponse:', error);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    throw error;
  }
};

// Helper function to add delay for smoother UI (optional)
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Get access token from local storage (JWT only)
const getToken = () => {
  return localStorage.getItem('access_token');
};

// Get auth headers for requests that require authentication
export const getAuthHeaders = () => {
  const accessToken = localStorage.getItem('access_token');
  
  if (accessToken) {
    return { 'Authorization': `Bearer ${accessToken}` };
  }
  return {};
};

// Authenticated fetch wrapper to ensure all API calls include auth headers
const authenticatedFetch = async (url, options = {}) => {
  try {
  // Ensure headers exist and include auth headers
  options.headers = {
    ...options.headers || {},
    ...getAuthHeaders()
  };
    
    // Add cache control to avoid browser caching
    if (!options.cache) {
      options.cache = 'no-cache';
    }
    
    // Debug log the request
    debugLog(`Making authenticated request to: ${url}`, { method: options.method || 'GET' });
  
  const response = await fetch(url, options);
    
    // Debug log the response status
    debugLog(`Response from ${url}:`, { status: response.status });
    
    // If unauthorized, try to refresh token and retry
    if (response.status === 401) {
      try {
        debugLog('Unauthorized response, attempting token refresh');
        const newToken = await ApiService.refreshToken();
        
        if (newToken) {
        // Update headers with new token
        options.headers = {
          ...options.headers,
            Authorization: `Bearer ${newToken}`
        };
        
        // Retry the request
        debugLog('Retrying request after token refresh');
        return await fetch(url, options);
        } else {
          throw new Error('Token refresh failed');
        }
      } catch (refreshError) {
        debugLog('Token refresh failed:', refreshError);
        // Clear tokens and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Authentication failed. Please login again.');
      }
    }
    
  return response;
  } catch (error) {
    debugLog(`Error in authenticatedFetch for ${url}:`, error);
    throw error;
  }
};

// Base API URL
const API_URL = 'http://localhost:8000/api';

// Default headers
const getHeaders = () => {
  // Get token from localStorage if available
  const accessToken = localStorage.getItem('access_token');
  
  if (accessToken) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    };
  }
  return { 'Content-Type': 'application/json' };
};

// Custom events for system operations
export const alertStatusChanged = new CustomEvent('alertStatusChanged');
export const cleanupPerformed = new CustomEvent('cleanupPerformed', { 
  detail: { type: 'info', message: 'System cleanup performed' }
});

// Helper function to broadcast status changes
const broadcastStatusChange = () => {
  window.dispatchEvent(alertStatusChanged);
};

// Helper method to ensure authentication
const ensureAuthenticated = async () => {
  const accessToken = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  
  // If we have a valid access token, we're good
  if (accessToken) {
    return true;
  }
  
  // If we have a refresh token but no access token, try to refresh
  if (!accessToken && refreshToken) {
    try {
      await ApiService.refreshToken();
      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return false;
    }
  }
  
  return false;
};

// API service
const ApiService = {
  // Export helper functions so they can be used elsewhere
  API_BASE_URL,
  getToken,
  getAuthHeaders,
  handleResponse,
  ensureAuthenticated,
  broadcastStatusChange,
  
  // Check if we have a valid token
  hasValidToken: () => {
    const token = localStorage.getItem('access_token');
    return !!token;
  },
  
  // Get driver profile
  getDriverProfile: async () => {
    try {
      debugLog('Fetching driver profile');
      const response = await authenticatedFetch(`${API_URL}/drivers/me/`);
      return handleResponse(response);
    } catch (error) {
      debugLog('Error fetching driver profile:', error);
      throw error;
    }
  },
  
  // Sync active alert state with server
  syncActiveAlertState: async () => {
    try {
      debugLog('Syncing alert state with server');
      
      // Get current driver info
      const driver = JSON.parse(localStorage.getItem('driver') || '{}');
      if (!driver || !driver.id) {
        return { hasActiveAlert: false, message: 'No driver information found' };
      }

      // Check for active alert from server
      const activeAlert = await ApiService.getMyActiveAlert();
      
      if (activeAlert) {
        debugLog('Found active alert on server:', activeAlert);
        
        // Update local storage with server data
        localStorage.setItem('activeAlert', JSON.stringify(activeAlert));
        localStorage.setItem('navigationAlertData', JSON.stringify(activeAlert));
        
        return {
          hasActiveAlert: true,
          alertData: activeAlert,
          message: 'Active alert found and synced'
        };
      } else {
        debugLog('No active alert found on server');
        
        // Clear any stale local data
        localStorage.removeItem('activeAlert');
        localStorage.removeItem('navigationAlertData');
        localStorage.removeItem('navigationStartTime');
        
        return {
          hasActiveAlert: false,
          message: 'No active alerts found'
        };
      }
    } catch (error) {
      console.error('Error syncing alert state:', error);
      
      // On error, assume no active alert for safety
      localStorage.removeItem('activeAlert');
      localStorage.removeItem('navigationAlertData');
      localStorage.removeItem('navigationStartTime');
      
      return {
        hasActiveAlert: false,
        error: error.message,
        message: 'Error syncing alert state'
      };
    }
  },
  
  // Check if backend server is running
  checkServerStatus: async () => {
    try {
      debugLog('Checking server status');
      // Use an endpoint we know exists in the backend
      const response = await fetch(`${API_BASE_URL}/drivers/`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders() 
        },
        // Add cache control to avoid browser caching
        cache: 'no-cache'
      });
      
      if (response.ok || response.status === 401) {
        // Even a 401 (Unauthorized) means the server is running
        debugLog('Server is running', { status: response.status });
        return { 
          running: true, 
          status: response.status,
          message: 'Server is running'
        };
      } else {
        debugLog('Server returned error status', { status: response.status });
        return { 
          running: false, 
          status: response.status,
          message: `Server returned status ${response.status}`
        };
      }
    } catch (error) {
      debugLog('Server connection error', { error: error.message });
      return { 
        running: false, 
        status: 'error',
        message: 'Cannot connect to server',
        error: error.message
      };
    }
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) return false;
    
    // Here we could add JWT expiration check if needed
    // For now, we just check if token exists
    return true;
  },
  
  // Authentication
  login: async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await handleResponse(response);
    
    // Store JWT credentials
    if (data.access) {
      localStorage.setItem('access_token', data.access);
    }
    if (data.refresh) {
      localStorage.setItem('refresh_token', data.refresh);
    }
    
    if (data.driver) {
      localStorage.setItem('driver', JSON.stringify(data.driver));
    }
    
    return data;
  },
  
  // Secure Admin Authentication
  adminLogin: async (username, password) => {
    try {
      debugLog(`Attempting admin login for user: ${username}`, { endpoint: `${API_BASE_URL}/auth/admin-login/` });
      
      // Clear any existing tokens before login attempt
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token');
      localStorage.removeItem('driver');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userSession');
      
      const response = await fetch(`${API_BASE_URL}/auth/admin-login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        cache: 'no-cache',
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.detail || 'Login failed';
        } catch {
          errorMessage = errorText || 'Login failed';
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Admin login error:', error);
      throw error;
    }
  },
  
  // JWT token refresh
  refreshToken: async () => {
    try {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
      const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }
      
      const data = await response.json();
      
      // Store new tokens
      if (data.access) {
        localStorage.setItem('access_token', data.access);
      }
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }
      
        return data.access;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // Clear tokens on refresh failure
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token');
      throw error;
    }
  },
  
  logout: async () => {
    try {
      // First sync with server to ensure we have accurate information about active alerts
      const syncResult = await ApiService.syncActiveAlertState();
      
      // Check if driver has any active alerts
      const hasActiveAlert = syncResult.hasActiveAlert;
      
      if (hasActiveAlert) {
        throw new Error("Cannot logout while you have an active alert. Please complete or cancel the alert first.");
      }
      
      const response = await fetch(`${API_BASE_URL}/auth/logout/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });
      
      // Clear all auth tokens and local storage data
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token');
      localStorage.removeItem('driver');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userSession');
      localStorage.removeItem('activeAlert');
      localStorage.removeItem('navigationAlertData');
      
      // Add a small delay to ensure all data is cleared
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return handleResponse(response);
    } catch (error) {
      // If the error is about active alerts, propagate it
      if (error.message && error.message.includes("active alert")) {
        throw error;
      }
      
      // For other errors, proceed with client-side logout anyway
      console.warn("Error during server logout, proceeding with client-side logout:", error);
      
      // Clear all auth tokens and local storage data
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token');
      localStorage.removeItem('driver');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userSession');
      localStorage.removeItem('activeAlert');
      localStorage.removeItem('navigationAlertData');
      
      // Add a small delay to ensure all data is cleared
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return { success: true, message: "Logged out on client side only" };
    }
  },
  
  getCurrentUser: async () => {
    try {
      debugLog('Fetching current user data');
      const response = await authenticatedFetch(`${API_URL}/auth/current-user/`);
      return handleResponse(response);
    } catch (error) {
      debugLog('Error fetching current user:', error);
      throw error;
    }
  },
  
  // Alerts
  getAllAlerts: async () => {
    try {
      const response = await axios.get(`${API_URL}/alerts/`, { headers: getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Error fetching alerts:', error);
      throw error;
    }
  },

  getAlertById: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/alerts/${id}/`, { headers: getHeaders() });
      return response.data;
    } catch (error) {
      console.error(`Error fetching alert with ID ${id}:`, error);
      throw error;
    }
  },

  updateAlertStatus: async (id, status) => {
    try {
      console.log(`Updating alert ${id} status to: ${status}`);
      
      // Map frontend status names to backend status values
      const statusMap = {
        'Waiting': 'pending',
        'Accepted': 'assigned',
        'Assigned': 'assigned',
        'Completed': 'complete',
        'Rejected': 'pending', // Rejected alerts go back to pending
        // Also handle direct backend status values
        'pending': 'pending',
        'assigned': 'assigned',
        'complete': 'complete'
      };
      
      // Use the mapped status or default to the original if not in map
      const backendStatus = statusMap[status] || status;
      
      console.log(`Mapped status ${status} to backend status: ${backendStatus}`);
      
      // Add retry logic for more resilient updates
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`Attempt ${attempts}/${maxAttempts} to update alert ${id} status to ${backendStatus}`);
          
          // Ensure we have a valid token
          const token = localStorage.getItem('access_token');
          if (!token) {
            throw new Error('No authentication token found');
          }
          
          // Format data as form-encoded
          const formData = new URLSearchParams();
          formData.append('status', backendStatus);
          
          // Use consistent API URL with proper headers
      const response = await fetch(`${API_BASE_URL}/alerts/${id}/`, {
        method: 'PATCH',
        headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
        },
            body: formData.toString()
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Error response: ${response.status}`, errorData);
        throw new Error(`HTTP error ${response.status}: ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log(`Alert ${id} status updated to ${backendStatus} successfully`);
      
      // Broadcast that the status has changed
      ApiService.broadcastStatusChange();
      
      return data;
        } catch (error) {
          console.error(`Attempt ${attempts} failed:`, error);
          lastError = error;
          
          // If token is invalid, try to refresh it
          if (error.message.includes('401')) {
            try {
              await ApiService.refreshToken();
              continue; // Try again with new token
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
            }
          }
          
          // Wait before retrying
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // If we get here, all attempts failed
      throw new Error(`Failed to update alert status after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`);
    } catch (error) {
      console.error(`Error updating alert ${id} status:`, error);
      throw error;
    }
  },

  assignDriver: async (alertId, driverId) => {
    try {
      console.log(`Assigning driver ${driverId} to alert ${alertId}`);
      
      // Add retry logic for more resilient updates
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`Attempt ${attempts}/${maxAttempts} to assign driver to alert`);
          
          // Ensure we have a valid token
          const token = localStorage.getItem('access_token');
          if (!token) {
            throw new Error('No authentication token found');
          }
      
      // Format the data correctly for the API endpoint
      const requestData = { driver_id: driverId };
      
          // Use consistent API URL with proper headers
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/assign_driver/`, {
        method: 'POST',
        headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
        },
            // Convert data to URL-encoded format
            body: new URLSearchParams({
              driver_id: driverId
            }).toString()
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Error response: ${response.status}`, errorData);
        throw new Error(`HTTP error ${response.status}: ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await response.json();
      
      // Store assigned time in localStorage
      localStorage.setItem('alertAssignedTime', new Date().toISOString());
      
      // Update local driver data if this is the current driver
      const currentDriver = JSON.parse(localStorage.getItem('driver') || '{}');
          if (currentDriver.id === driverId) {
        currentDriver.status = 'unavailable';
        localStorage.setItem('driver', JSON.stringify(currentDriver));
      }
      
          return data;
        } catch (error) {
          console.error(`Attempt ${attempts} failed:`, error);
          lastError = error;
          
          if (attempts === maxAttempts) {
            throw new Error(`Failed to assign driver after ${maxAttempts} attempts: ${error.message}`);
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      throw lastError || new Error('Failed to assign driver');
    } catch (error) {
      console.error(`Error assigning driver to alert ${alertId}:`, error);
      throw error;
    }
  },
  
  // Reset driver status
  resetDriverStatus: async (driverId) => {
    try {
      console.log("Resetting status for driver", driverId);
      
      // Try form data first
      const formData = new FormData();
      formData.append('driver_id', driverId);

      let response = await fetch(`${API_BASE_URL}/alerts/reset_driver_status/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          // Remove Content-Type header to let browser set it with boundary for FormData
        },
        body: formData
      });

      // If form data fails, try JSON
      if (!response.ok && response.status === 500) {
        console.log("Form data attempt failed, trying JSON...");
        response = await fetch(`${API_BASE_URL}/alerts/reset_driver_status/`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
          body: JSON.stringify({ driver_id: driverId })
      });
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
        console.error("Error response:", response.status, errorData);
        throw new Error(`HTTP error ${response.status}: ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log("Driver status reset successful:", data);
      
      // Broadcast that the status has changed
      ApiService.broadcastStatusChange();
      
      // Dispatch cleanup event with details
      const cleanupEvent = new CustomEvent('cleanupPerformed', { 
        detail: { 
          type: 'info', 
          title: 'Driver Status Reset',
          message: `Reset driver ${driverId} status and cleared ${data.cleared_alerts?.length || 0} alerts` 
        }
      });
      window.dispatchEvent(cleanupEvent);
      
      return data;
    } catch (error) {
      console.error(`Error resetting driver status for driver ${driverId}:`, error);
      throw error;
    }
  },

  completeAlert: async (alertId, responseTime) => {
    try {
      console.log(`Completing alert ${alertId} with response time: ${responseTime} minutes`);
      
      // Add retry logic for more resilient updates
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`Attempt ${attempts}/${maxAttempts} to complete alert`);
          
          // Ensure we have a valid token
          const token = localStorage.getItem('access_token');
          if (!token) {
            throw new Error('No authentication token found');
          }
          
          // Format the data as form-encoded
          const formData = new URLSearchParams();
          formData.append('status', 'complete');
          formData.append('response_time', responseTime);
          formData.append('completed_at', new Date().toISOString());
      
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/complete/`, {
        method: 'POST',
        headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
        },
            body: formData.toString()
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      
      // Broadcast that the status has changed
      ApiService.broadcastStatusChange();
      
      // Clear local storage
      localStorage.removeItem(`navigationStartTime_${alertId}`);
      localStorage.removeItem("navigationAlertData");
      localStorage.removeItem("activeAlert");
          
          // Update driver status to available after alert completion
          try {
            const currentDriver = JSON.parse(localStorage.getItem('driver') || '{}');
            if (currentDriver && currentDriver.id) {
              await ApiService.updateDriver(currentDriver.id, { status: 'available' });
              
              // Update local storage with new status
              currentDriver.status = 'available';
              localStorage.setItem('driver', JSON.stringify(currentDriver));
            }
          } catch (driverUpdateError) {
            console.error('Error updating driver status:', driverUpdateError);
          }
      
      // Dispatch a custom event for alert completion
      window.dispatchEvent(new CustomEvent('alertCompleted', {
        detail: {
          alertId,
          responseTime,
          completedAt: new Date().toISOString()
        }
      }));
      
      // Force refresh alerts after completion
      setTimeout(async () => {
        try {
          // Trigger a refresh of alerts
          const alertService = (await import('../api/alertService')).alertService;
          await alertService.forceRefreshAlerts();
          console.log('Alert data refreshed after completion');
        } catch (err) {
          console.error('Failed to refresh alerts after completion:', err);
        }
      }, 500);
      
      return data;
        } catch (error) {
          console.error(`Attempt ${attempts} failed:`, error);
          lastError = error;
          
          // If token is invalid, try to refresh it
          if (error.message.includes('401')) {
            try {
              await ApiService.refreshToken();
              continue; // Try again with new token
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
            }
          }
          
          // Wait before retrying
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // If we get here, all attempts failed
      throw new Error(`Failed to complete alert after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`);
    } catch (error) {
      console.error(`Error completing alert ${alertId}:`, error);
      throw error;
    }
  },

  addAlert: async (alertData) => {
    const response = await fetch(`${API_BASE_URL}/alerts/`, {
      method: 'POST',
      headers: { 
        ...getAuthHeaders(),
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(alertData)
    });
    const data = await handleResponse(response);
    return data;
  },

  getPendingAlerts: async () => {
    const response = await fetch(`${API_BASE_URL}/alerts/pending/`, {
      headers: getAuthHeaders()
    });
    const data = await handleResponse(response);
    return data;
  },

  getAssignedAlerts: async () => {
    try {
      const response = await axios.get(`${API_URL}/alerts/assigned/`, { headers: getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Error fetching assigned alerts:', error);
      throw error;
    }
  },

  getCompletedAlerts: async () => {
    const response = await fetch(`${API_BASE_URL}/alerts/completed/`, {
      headers: getAuthHeaders()
    });
    const data = await handleResponse(response);
    return data;
  },
  
  getMyAlerts: async () => {
    const response = await fetch(`${API_BASE_URL}/alerts/my_alerts/`, {
      headers: getAuthHeaders()
    });
    const data = await handleResponse(response);
    return data;
  },
  
  getMyActiveAlert: async () => {
    try {
    const response = await fetch(`${API_BASE_URL}/alerts/my_active_alert/`, {
      headers: getAuthHeaders()
    });
      
      // If the response is 404, it means there's no active alert
      if (response.status === 404) {
        console.log("No active alert found for the current driver");
        return null;
      }
      
    const data = await handleResponse(response);
    return data;
    } catch (error) {
      console.error("Error fetching active alert:", error);
      // Return null instead of throwing error to prevent app crashes
      return null;
    }
  },

  // Ambulance
  getAllAmbulances: async () => {
    const response = await fetch(`${API_BASE_URL}/ambulances/`, {
      headers: getAuthHeaders()
    });
    const data = await handleResponse(response);
    return data;
  },

  getAmbulanceById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/ambulances/${id}/`, {
      headers: getAuthHeaders()
    });
    const data = await handleResponse(response);
    return data;
  },

  updateAmbulance: async (id, ambulanceData) => {
    const response = await fetch(`${API_BASE_URL}/ambulances/${id}/`, {
      method: 'PATCH',
      headers: { 
        ...getAuthHeaders(),
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(ambulanceData)
    });
    const data = await handleResponse(response);
    return data;
  },

  getAvailableAmbulances: async () => {
    const response = await fetch(`${API_BASE_URL}/ambulances/available/`, {
      headers: getAuthHeaders()
    });
    const data = await handleResponse(response);
    return data;
  },
  
  getMyAmbulance: async () => {
    const response = await fetch(`${API_BASE_URL}/ambulances/my_ambulance/`, {
      headers: getAuthHeaders()
    });
    const data = await handleResponse(response);
    return data;
  },

  // Drivers
  getAllDrivers: async () => {
    try {
      debugLog('Fetching all drivers');
    const response = await authenticatedFetch(`${API_BASE_URL}/drivers/`);
    const data = await handleResponse(response);
      
      // Transform data if needed to ensure consistent field names
      const transformedData = data.map(driver => ({
        ...driver,
        // Ensure phone field is available even if backend returns contact_no
        phone: driver.phone || driver.contact_no || null,
        // Ensure license_no field is available
        license_no: driver.license_no || null,
        // Ensure address field is available
        address: driver.address || null,
        // Ensure status is one of the expected values
        status: ['available', 'unavailable'].includes(driver.status) 
          ? driver.status 
          : 'available'
      }));
      
      debugLog(`Fetched ${transformedData.length} drivers`);
      return transformedData;
    } catch (error) {
      debugLog('Error fetching drivers:', error);
      throw error;
    }
  },

  getDriverById: async (id) => {
    try {
      // Get the basic driver info
      const response = await fetch(`${API_BASE_URL}/drivers/${id}/`, {
        headers: getAuthHeaders()
      });
      const driverData = await handleResponse(response);
      console.log("Initial driver data:", driverData);
      
      // If driver data already includes username and email, use it directly
      if (driverData.username || driverData.email) {
        console.log("Driver data includes user credentials");
        
        // Normalize field names
        const normalizedData = {
          ...driverData,
          phone: driverData.phone || driverData.contact_no || null,
          license_no: driverData.license_no || null,
          address: driverData.address || null,
          status: ['available', 'unavailable'].includes(driverData.status) 
            ? driverData.status 
            : 'available'
        };
        
        return normalizedData;
      }
      
      // Otherwise, try to fetch user details through the dedicated endpoint
      try {
      const userResponse = await fetch(`${API_BASE_URL}/drivers/${id}/user_details/`, {
        headers: getAuthHeaders()
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
          console.log("User details fetched:", userData);
          
          // Merge user data into driver data and normalize fields
        return {
          ...driverData,
            username: userData.username || '',
            email: userData.email || '',
            user_id: userData.id,
            phone: driverData.phone || driverData.contact_no || null,
            license_no: driverData.license_no || null,
            address: driverData.address || null,
            status: ['available', 'unavailable'].includes(driverData.status) 
              ? driverData.status 
              : 'available'
        };
        }
      } catch (userDetailsError) {
        console.error("Error fetching user details:", userDetailsError);
      }
      
      // Return what we have with normalized fields
      return {
        ...driverData,
        phone: driverData.phone || driverData.contact_no || null,
        license_no: driverData.license_no || null,
        address: driverData.address || null,
        status: ['available', 'unavailable'].includes(driverData.status) 
          ? driverData.status 
          : 'available'
      };
    } catch (err) {
      console.error("Error in getDriverById:", err);
      throw err;
    }
  },

  // Update driver
  updateDriver: async (driverId, driverData) => {
    try {
      // Ensure we have auth
      await ensureAuthenticated();
      
      console.log(`Updating driver ${driverId} with data:`, driverData);
      
      // Normalize data to ensure field compatibility
      const normalizedData = {
        ...driverData,
        // Ensure phone field is set (backend uses phone, frontend might use contact_no)
        phone: driverData.phone || driverData.contact_no || null,
      };
      
      // Remove contact_no if it exists to avoid duplicate fields
      if (normalizedData.contact_no) {
        delete normalizedData.contact_no;
      }
      
      const response = await fetch(`${API_BASE_URL}/drivers/${driverId}/`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(normalizedData)
      });
      
      // Check if the response is OK
      if (!response.ok) {
          const errorData = await response.json();
        console.error("Error updating driver:", errorData);
          return {
            success: false,
          message: errorData.error || `Failed to update driver: ${response.status}`
          };
      }
      
      // Parse the response
      const data = await response.json();
      
      // Update local storage with the new driver data
      const currentDriver = JSON.parse(localStorage.getItem('driver') || '{}');
      if (currentDriver && currentDriver.id === driverId) {
        localStorage.setItem('driver', JSON.stringify({
          ...currentDriver,
          ...driverData
        }));
      }
      
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error("Error in updateDriver:", error);
      return {
        success: false,
        message: error.message || "Failed to update driver"
      };
    }
  },

  /**
   * Updates a driver's information in the backend using FormData (for file uploads)
   * @param {number} driverId - The ID of the driver to update
   * @param {FormData} formData - Form data including file uploads
   * @returns {Promise<object>} Response with success status, message and updated data
   */
  updateDriverWithFormData: async (driverId, formData) => {
    try {
      // Ensure we have auth token
      await ensureAuthenticated();
      
      console.log(`Updating driver with ID: ${driverId} using FormData`);
      
      // Get auth token
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get CSRF token from cookie if available
      const csrfToken = document.cookie.split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const headers = {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type, let browser set it with boundary for FormData
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      };

      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      // Make the update request
      const response = await fetch(`${API_BASE_URL}/drivers/${driverId}/`, {
        method: 'PATCH',
        headers,
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Update error response:', errorData);

        if (response.status === 403) {
          // Try to refresh token
          const newToken = await ApiService.refreshToken();
          if (!newToken) {
            throw new Error('Failed to refresh authentication');
          }

          // Retry with new token
          const retryResponse = await fetch(`${API_BASE_URL}/drivers/${driverId}/`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              ...(csrfToken && { 'X-CSRFToken': csrfToken })
            },
            body: formData,
            credentials: 'include'
          });

          if (!retryResponse.ok) {
            const retryErrorData = await retryResponse.json().catch(() => ({}));
            throw new Error(retryErrorData.detail || `Failed to update driver: ${retryResponse.status}`);
          }

          const retryData = await retryResponse.json();
          return {
            success: true,
            message: 'Driver profile updated successfully',
            data: retryData
          };
        }

        throw new Error(errorData.detail || `Failed to update driver: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: 'Driver profile updated successfully',
        data
      };

    } catch (error) {
      console.error('Error updating driver with FormData:', error);
      throw error;
    }
  },

  createDriver: async (driverData) => {
    try {
      // Ensure we are authenticated before making the call
      await ApiService.ensureAuthenticated();
      
      const response = await fetch(`${API_BASE_URL}/drivers/`, {
        method: 'POST',
        headers: { 
          ...getAuthHeaders(),
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(driverData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Driver creation error:', errorData);
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating driver:', error);
      throw error;
    }
  },
  
  // Create driver with login credentials
  async driverLogin(username, password) {
    try {
      debugLog(`Attempting driver login for user: ${username}`, { endpoint: `${API_BASE_URL}/auth/login/` });
      
      // Clear any existing tokens before login attempt
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token');
      localStorage.removeItem('driver');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userSession');
      localStorage.removeItem('loginSuccess');
      localStorage.removeItem('loginRedirectPath');
      localStorage.removeItem('activeAlert');
      localStorage.removeItem('navigationAlertData');
      
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username, 
          password,
          role: 'driver'
        }),
        cache: 'no-cache',
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          debugLog('Driver login error response:', errorData);
        } catch (parseError) {
          debugLog('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      debugLog('Driver login successful', { driver: data.driver });
      
      // Store JWT credentials
      if (data.access) {
        localStorage.setItem('access_token', data.access);
      }
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }
      
      // Store driver data in localStorage
      if (data.driver) {
        localStorage.setItem('driver', JSON.stringify(data.driver));
        localStorage.setItem('user', JSON.stringify(data.driver));
        localStorage.setItem('userRole', 'driver');
      }
      
      // Set login success flag and redirect path
      localStorage.setItem('loginSuccess', 'true');
      localStorage.setItem('loginRedirectPath', '/ambulance-dashboard');
      
      // Create a more detailed session object with expiry
      const expiryTime = 8 * 60 * 60 * 1000; // 8 hours
      const session = {
        role: 'driver',
        expiry: new Date().getTime() + expiryTime,
        userId: data.driver?.id || 'unknown'
      };
      localStorage.setItem('userSession', JSON.stringify(session));
      
      return {
        ...data,
        success: true,
        redirectPath: '/ambulance-dashboard'
      };
    } catch (error) {
      console.error('Driver login error:', error);
      throw error;
    }
  },

  // Update admin profile
  updateAdminProfile: async (profileData) => {
    try {
      debugLog('Updating admin profile:', profileData);
      
      const response = await authenticatedFetch(`${API_BASE_URL}/admin/profile/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData)
      });
      
      return await handleResponse(response);
    } catch (error) {
      debugLog('Error updating admin profile:', error);
      throw new Error(error.message || 'Failed to update profile');
    }
  },
  
  // Change password
  changePassword: async (currentPassword, newPassword) => {
    try {
      debugLog('Changing password');
      
      const response = await authenticatedFetch(`${API_BASE_URL}/admin/change-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      
      return await handleResponse(response);
    } catch (error) {
      debugLog('Error changing password:', error);
      throw new Error(error.message || 'Failed to change password');
    }
  },

  // Driver performance metrics
  getDriverPerformance: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/drivers/${id}/performance/`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch driver performance data');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching driver performance:', error);
      throw error;
    }
  },

  // Driver trip history
  getDriverHistory: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/drivers/${id}/history/`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch driver history data');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching driver history:', error);
      throw error;
    }
  },

  // Add the createDriverWithCredentials method
  async createDriverWithCredentials(formData) {
    try {
      debugLog('Creating driver with credentials:', formData);
      
      const response = await authenticatedFetch(`${API_URL}/drivers/create_with_credentials/`, {
        method: 'POST',
        body: formData, // Send as FormData directly
        headers: {
          // Don't set Content-Type as it will be automatically set for FormData
          ...getAuthHeaders()
        }
      });
      
      return handleResponse(response);
    } catch (error) {
      debugLog('Error creating driver:', error);
      throw error;
    }
  },
};

export default ApiService; 