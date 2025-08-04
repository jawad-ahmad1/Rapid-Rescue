import ApiService from './apiService';

// Helper function to process alert data and ensure consistency
const processAlertData = (alert) => {
  if (!alert) return null;

  // Create a copy to avoid modifying the original
  const processedAlert = { ...alert };
  
  // Always use the numeric ID
  processedAlert.id = alert.id;
  processedAlert.status = alert.status === "pending" ? "Waiting" : alert.status;
  processedAlert.location = alert.location || 'Location not available';
  processedAlert.created_at = alert.created_at || new Date().toISOString();
  
  // Transform driver_name to driverName for frontend consistency
  if (alert.driver_name) {
    processedAlert.driverName = alert.driver_name;
    processedAlert.driver_name = alert.driver_name;
  }
  
  // Transform response_time to responseTime for frontend consistency
  if (alert.response_time) {
    processedAlert.responseTime = alert.response_time;
    processedAlert.response_time = alert.response_time;
  }
  
  // Handle response_time_formatted from backend
  if (alert.response_time_formatted) {
    processedAlert.responseTime = alert.response_time_formatted;
    processedAlert.response_time = alert.response_time_formatted;
  }
  
  // Status-specific data transformations
  switch(processedAlert.status.toLowerCase()) {
    case 'complete':
    case 'completed':
      // Normalize status to 'complete'
      processedAlert.status = 'complete';
      // Only set default driver name if no driver info exists
      if (!processedAlert.driverName && !processedAlert.driver_name) {
      processedAlert.driverName = "Unknown Driver";
        processedAlert.driver_name = "Unknown Driver";
    }
      // Ensure response time format is correct if not already formatted
    if (processedAlert.responseTime && !processedAlert.responseTime.includes('mins')) {
      processedAlert.responseTime = `${processedAlert.responseTime} mins`;
        processedAlert.response_time = processedAlert.responseTime;
      }
      break;
      
    case 'assigned':
      // Only set default driver info if none exists
      if (!processedAlert.driverName && !processedAlert.driver_name) {
      processedAlert.driverName = "Driver information unavailable";
        processedAlert.driver_name = "Driver information unavailable";
      }
      break;
      
    case 'rejected':
    case 'REJECTED':
      // Normalize status to lowercase 'rejected'
      processedAlert.status = 'rejected';
      // Clear driver info for rejected alerts
      processedAlert.driverName = "Alert Rejected";
      processedAlert.driver_name = "Alert Rejected";
    processedAlert.responseTime = null;
      processedAlert.response_time = null;
      break;
      
    case 'pending':
    default:
      // Set status to pending for any unknown status
      processedAlert.status = 'pending';
      // Only set default driver info if none exists
      if (!processedAlert.driverName && !processedAlert.driver_name) {
    processedAlert.driverName = "No driver responded yet";
        processedAlert.driver_name = "No driver responded yet";
      }
    processedAlert.responseTime = null;
      processedAlert.response_time = null;
      break;
  }
  
  // Add timestamp if not present
  processedAlert.timestamp = processedAlert.timestamp || processedAlert.created_at || new Date().toISOString();
  
  // Ensure all required fields are present
  processedAlert.timeRemaining = processedAlert.timeRemaining || 30;
  
  // Mark as new for UI handling
  processedAlert.isNew = true;
  
  return processedAlert;
};

export const alertService = {
  // Get all alerts
  getAllAlerts: async () => {
    try {
      const data = await ApiService.getAllAlerts();
      return data.map(processAlertData);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      throw error;
    }
  },

  // Get pending alerts - optimized for ambulance dashboard
  getPendingAlerts: async () => {
    try {
      const data = await ApiService.getPendingAlerts();
      if (!data) return []; // Return empty array if no data
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 5000);
      });

      // Race between the actual request and timeout
      const result = await Promise.race([
        Promise.resolve(data),
        timeoutPromise
      ]);

      return result.map(processAlertData);
    } catch (error) {
      console.error('Error fetching pending alerts:', error);
      // Return empty array instead of throwing to prevent loading state from getting stuck
      return [];
    }
  },

  // Force refresh alerts - call this from ambulance dashboard when status changes
  forceRefreshAlerts: async () => {
    try {
      console.log('Force refreshing alerts data');
      const data = await ApiService.getPendingAlerts(); // Use getPendingAlerts for efficiency
      if (!data) return []; // Return empty array if no data
      return data.map(processAlertData);
    } catch (error) {
      console.error('Error force refreshing alerts:', error);
      return []; // Return empty array instead of throwing
    }
  },

  // Get alert by ID
  getAlertById: async (id) => {
    try {
      const data = await ApiService.getAlertById(id);
      return processAlertData(data);
    } catch (error) {
      console.error('Error fetching alert:', error);
      throw error;
    }
  },

  // Update alert status
  updateAlertStatus: async (id, status) => {
    try {
      console.log('Updating alert status:', id, status);
      
      // Add retry logic for more resilient updates
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`Attempt ${attempts}/${maxAttempts} to update alert ${id} status to ${status}`);
          
          const data = await ApiService.updateAlertStatus(id, status);
          
          // If successful, trigger a refresh of alerts after a short delay
          setTimeout(() => {
            alertService.forceRefreshAlerts()
              .then(() => console.log('Alert data refreshed after status update'))
              .catch(err => console.error('Failed to refresh alerts after status update:', err));
          }, 500);
          
          return processAlertData(data);
        } catch (error) {
          console.error(`Attempt ${attempts} failed:`, error);
          lastError = error;
          
          // Wait a bit before retrying
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // If we get here, all attempts failed
      throw new Error(`Failed to update alert status after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`);
    } catch (error) {
      console.error('Error updating alert status:', error);
      
      // Try to provide more helpful error messages
      let errorMessage = error.message;
      if (error.message?.includes('400')) {
        errorMessage = 'Server rejected the status update. The alert may have been modified by another user or the status is invalid.';
      } else if (error.message?.includes('401') || error.message?.includes('403')) {
        errorMessage = 'You do not have permission to update this alert. Your session may have expired.';
      } else if (error.message?.includes('404')) {
        errorMessage = 'Alert not found. It may have been deleted or never existed.';
      } else if (error.message?.includes('500')) {
        errorMessage = 'Server error occurred while updating the alert. Please try again later.';
      }
      
      throw new Error(`Failed to update alert status: ${errorMessage}`);
    }
  },

  // Add new alert
  addAlert: async (location, coordinates) => {
    try {
      const alertData = {
        location,
        coordinates_lat: coordinates.lat,
        coordinates_lng: coordinates.lng,
        alert_id: `#${Math.floor(Math.random() * 10000)}`, // We'll let the backend generate this
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: 'Today',
        status: 'pending'
      };
      const data = await ApiService.addAlert(alertData);
      return processAlertData(data);
    } catch (error) {
      console.error('Error adding new alert:', error);
      throw error;
    }
  },

  // Update alert
  updateAlert: async (id, updateData) => {
    try {
      const data = await ApiService.updateAlertStatus(id, updateData);
      return processAlertData(data);
    } catch (error) {
      console.error('Error updating alert:', error);
      throw error;
    }
  },
  
  // Assign driver to alert
  assignDriver: async (alertId, driverId) => {
    try {
      const data = await ApiService.assignDriver(alertId, driverId);
      // After successful assignment, trigger a global refresh
      setTimeout(() => {
        // This slight delay ensures the server has time to update the database
        alertService.forceRefreshAlerts()
          .then(() => console.log('Alert data refreshed after assignment'))
          .catch(err => console.error('Failed to refresh alerts after assignment:', err));
      }, 500);
      return processAlertData(data);
    } catch (error) {
      console.error('Error assigning driver to alert:', error);
      throw error;
    }
  },
  
  // Complete alert
  completeAlert: async (alertId, responseTime) => {
    try {
      const data = await ApiService.completeAlert(alertId, responseTime);
      // After successful completion, trigger a global refresh
      setTimeout(() => {
        // This slight delay ensures the server has time to update the database
        alertService.forceRefreshAlerts()
          .then(() => console.log('Alert data refreshed after completion'))
          .catch(err => console.error('Failed to refresh alerts after completion:', err));
      }, 500);
      return processAlertData(data);
    } catch (error) {
      console.error('Error completing alert:', error);
      throw error;
    }
  },
  
  // Get assigned alerts
  getAssignedAlerts: async () => {
    try {
      const data = await ApiService.getAssignedAlerts();
      return data.map(processAlertData);
    } catch (error) {
      console.error('Error fetching assigned alerts:', error);
      throw error;
    }
  },
  
  // Get completed alerts
  getCompletedAlerts: async () => {
    try {
      const data = await ApiService.getCompletedAlerts();
      return data.map(processAlertData);
    } catch (error) {
      console.error('Error fetching completed alerts:', error);
      throw error;
    }
  },

  // Broadcast alert status change
  broadcastStatusChange: () => {
    window.dispatchEvent(new CustomEvent('alertStatusChanged'));
  }
}; 