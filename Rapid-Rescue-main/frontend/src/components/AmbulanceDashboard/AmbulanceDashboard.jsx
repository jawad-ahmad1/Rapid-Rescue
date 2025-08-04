/** @jsxImportSource react */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaCheckCircle, 
  FaTimesCircle, 
  FaClock,
  FaMapMarkerAlt,
  FaFileAlt,
  FaMapMarkedAlt,
  FaVideo,
  FaInfoCircle,
  FaExclamationTriangle,
  FaTimes,
  FaRoute
} from "react-icons/fa";
import DashboardLayout from "../layouts/DashboardLayout";
import "./AmbulanceDashboard.css";
import "./AlertAnimation.css";
import "./ColorFixes.css";
import "./AlertCardStyles.css";
import "./InconsistencyFix.css";
import ApiService, { API_BASE_URL, getAuthHeaders } from "../../services/api/apiService";
import { useSidebar } from '../../contexts/SidebarContext';

// Add additional styles for the status reason display
const statusReasonStyle = `
.status-reason {
  margin-left: 8px;
  font-size: 0.85em;
  color: #666;
  font-style: italic;
}

.status-value.unavailable {
  color: #e74c3c;
  font-weight: bold;
}

.status-value.available {
  color: #2ecc71;
  font-weight: bold;
}

/* Notification Popup Styles */
.notification-popup {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #fff;
  border-left: 4px solid #3498db;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 15px 20px;
  border-radius: 4px;
  z-index: 1000;
  max-width: 350px;
  animation: slideIn 0.3s ease-out forwards;
}

.notification-popup.success {
  border-left-color: #2ecc71;
}

.notification-popup.warning {
  border-left-color: #f39c12;
}

.notification-popup.error {
  border-left-color: #e74c3c;
}

.notification-popup.info {
  border-left-color: #3498db;
}

.notification-popup h4 {
  margin: 0 0 5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.notification-popup p {
  margin: 0;
  font-size: 0.9rem;
  color: #555;
}

.notification-popup .notification-icon {
  margin-right: 8px;
}

.notification-popup .close-notification {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #999;
}

.notification-popup .close-notification:hover {
  color: #333;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

.notification-popup.closing {
  animation: slideOut 0.3s ease-in forwards;
}
`;

// Add this function near the top with other utility functions
const format12HourTime = (timeString) => {
  try {
    // If timeString is already in 12-hour format, return as is
    if (timeString.toLowerCase().includes('am') || timeString.toLowerCase().includes('pm')) {
      return timeString;
    }

    // Create a date object
    let date;
    if (timeString.includes('T')) {
      // If it's an ISO string
      date = new Date(timeString);
    } else {
      // If it's just a time string, create a date object for today with this time
      const [hours, minutes] = timeString.split(':');
      date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
    }

    // Add 5 hours to match Pakistan timezone (UTC+5)
    date.setHours(date.getHours() + 5);

    // Format the time in 12-hour format
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeString; // Return original string if there's an error
  }
};

const AmbulanceDashboardContent = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("Available");
  const [changeStatus, setChangeStatus] = useState(true);
  const alertsRef = useRef([]);
  const { isSidebarOpen } = useSidebar();

  // Popup states
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const [showMapPopup, setShowMapPopup] = useState(false);
  const [showAccidentPopup, setShowAccidentPopup] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  
  // Notification popup state
  const [notification, setNotification] = useState(null);
  const [notificationClosing, setNotificationClosing] = useState(false);
  const notificationTimeoutRef = useRef(null);
  
  // Alert popup states - only used for auto-reject timer
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [currentAlertPopup, setCurrentAlertPopup] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const timerActiveRef = useRef(false);
  
  // Add new state for staggered animations
  const [visibleAlerts, setVisibleAlerts] = useState([]);
  const activeAlertRef = useRef(null);
  const timersRef = useRef({});

  // Load notification settings
  const [notificationSettings] = useState(() => {
    const savedNotifications = localStorage.getItem("ambulanceNotifications");
    return savedNotifications ? JSON.parse(savedNotifications) : {
      alertSound: true,
      vibration: true
    };
  });

  // Inject status styles on component mount
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = statusReasonStyle;
    document.head.appendChild(styleElement);

    // Cleanup on unmount
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Function to check for active alerts
  const checkForActiveAlerts = useCallback(() => {
    // First check local state
    const acceptedAlert = alertsRef.current.find(alert => alert.status === "Accepted");
    const hasLocalActiveAlert = !!acceptedAlert || (activeAlertRef.current !== null);
    
    // If we already know there's an active alert, no need to check the backend
    if (hasLocalActiveAlert) {
      return true;
    }
    
    // If we're not sure, check localStorage for any saved active alert
    const savedActiveAlert = localStorage.getItem("activeAlert");
    if (savedActiveAlert) {
      try {
        const parsedAlert = JSON.parse(savedActiveAlert);
        if (parsedAlert && parsedAlert.id) {
          console.log("Found active alert in localStorage:", parsedAlert);
          return true;
        }
      } catch (err) {
        console.error("Error parsing saved active alert:", err);
      }
    }
    
    // No active alerts found locally
    return false;
  }, []);

  // Show notification function - MOVED TO TOP
  const showNotification = useCallback((type, title, message, duration = 5000) => {
    // Clear any existing timeout
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    
    // Reset closing state if there was one
    setNotificationClosing(false);
    
    // Set the new notification
    setNotification({
      type, // 'success', 'error', 'warning', 'info'
      title,
      message,
      timestamp: new Date()
    });
    
    // Auto-hide after duration
    notificationTimeoutRef.current = setTimeout(() => {
      hideNotification();
    }, duration);
  }, []);
  
  // Hide notification function
  const hideNotification = useCallback(() => {
    setNotificationClosing(true);
    
    // After animation completes, remove the notification
    setTimeout(() => {
      setNotification(null);
      setNotificationClosing(false);
    }, 300); // Match the animation duration
  }, []);

  // Function to update driver status
  const updateDriverStatus = useCallback(async (newStatus) => {
    try {
      const driver = JSON.parse(localStorage.getItem('driver') || '{}');
      
      if (driver && driver.id) {
        console.log(`Updating driver ${driver.id} status to ${newStatus}`);
        
        // Update backend
        await ApiService.updateDriver(driver.id, { status: newStatus.toLowerCase() });
        
        // Update localStorage
        const updatedDriver = { ...driver, status: newStatus.toLowerCase() };
        localStorage.setItem('driver', JSON.stringify(updatedDriver));
        
        // Update UI
        setStatus(newStatus);
        setChangeStatus(newStatus === 'Available');
        
        console.log('Driver status updated successfully:', newStatus);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating driver status:', error);
      
      // Show error notification
      showNotification(
        'error',
        'Status Update Failed',
        'Failed to update status. Please try again.',
        5000
      );
      return false;
    }
  }, [showNotification]);

  // Handle Reject Alert
  const handleReject = useCallback((alertId) => {
    // Clean up the timer for this alert
    if (timersRef.current[alertId]) {
      clearInterval(timersRef.current[alertId]);
      delete timersRef.current[alertId];
    }
    
    // Mark the alert as rejected in the UI first for immediate feedback
    setAlerts((prevAlerts) => {
      const updated = prevAlerts.map((alert) =>
        alert.id === alertId 
          ? { ...alert, status: "Rejected", timeRemaining: 0, animating: true }
          : alert
      );
      alertsRef.current = updated;
      return updated;
    });
      
    // Update alert status in the backend
    ApiService.updateAlertStatus(alertId, "Rejected")
      .then(async () => {
        console.log("Alert status updated to Rejected");
        
        // Update driver status to Available
        await updateDriverStatus('Available');
        
        // After 3 seconds, remove the alert from view
        setTimeout(() => {
          setAlerts(currentAlerts => 
            currentAlerts.filter(alert => alert.id !== alertId)
          );
        }, 3000);
      })
      .catch(async err => {
        console.error("Error updating alert status:", err);
        setError(`Failed to update alert status: ${err.message}`);
        
        // Try alternative approach
        try {
          const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/`, {
            method: 'PATCH',
            headers: {
              ...getAuthHeaders(),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              status: 'pending',
              driver: null 
            })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
          }
          
          // Update driver status to Available
          await updateDriverStatus('Available');
          
          // After 3 seconds, remove the alert from view
          setTimeout(() => {
            setAlerts(currentAlerts => 
              currentAlerts.filter(alert => alert.id !== alertId)
            );
          }, 3000);
        } catch (altError) {
          console.error("Alternative approach also failed:", altError);
          
          // Show error notification
          showNotification(
            'error',
            'Status Update Failed',
            'Failed to update alert status. Please try again.',
            5000
          );
          
          // Revert changes on error
          setAlerts(prevAlerts => {
            return prevAlerts.map(alert => 
              alert.id === alertId ? { ...alert, status: "Waiting" } : alert
            );
          });
        }
      });
    
    // Close the alert popup if this was the current alert
    if (currentAlertPopup && currentAlertPopup.id === alertId) {
      timerActiveRef.current = false;
      setShowAlertPopup(false);
    }
  }, [currentAlertPopup, getAuthHeaders, setError, showNotification, updateDriverStatus]);

  // Effect to initialize driver status from localStorage
  useEffect(() => {
    const initializeDriverStatus = async () => {
      try {
        // Get driver from localStorage
        const driver = JSON.parse(localStorage.getItem('driver') || '{}');
        
        if (driver && driver.id) {
          // Get fresh status from backend
          const driverData = await ApiService.getDriver(driver.id);
          
          if (driverData) {
            // Update localStorage with fresh data
            const updatedDriver = { ...driver, status: driverData.status };
            localStorage.setItem('driver', JSON.stringify(updatedDriver));
            
            // Update UI status
            const newStatus = driverData.status === 'available' ? 'Available' : 'Unavailable';
            setStatus(newStatus);
            setChangeStatus(driverData.status === 'available');
            
            console.log('Driver status initialized:', newStatus);
          }
        }
      } catch (error) {
        console.error('Error initializing driver status:', error);
        // Fallback to localStorage if backend fails
        const driver = JSON.parse(localStorage.getItem('driver') || '{}');
        if (driver && driver.status) {
          const newStatus = driver.status === 'available' ? 'Available' : 'Unavailable';
          setStatus(newStatus);
          setChangeStatus(driver.status === 'available');
        }
      }
    };

    initializeDriverStatus();
  }, []);

  // Move playNotifications function definition up before its usage
  const playNotifications = useCallback(async () => {
    try {
      if (!notificationSettings.alertSound) {
        console.log("Alert sound is disabled in settings");
        return;
      }

      // Create a new Audio instance each time
      const sound = new Audio('/notification.mp3');
      
      console.log("Attempting to play notification sound...");
      
      // Set up audio properties
      sound.preload = 'auto';
      sound.volume = 1.0;
      
      // Add event listeners for debugging
      sound.addEventListener('canplaythrough', () => {
        console.log('Sound loaded and ready to play');
      });
      
      sound.addEventListener('error', (e) => {
        console.error('Sound loading error:', e);
      });
      
      try {
        await sound.load();
        await sound.play();
        console.log("Alert sound played successfully");
        
        // Try vibration after successful sound play
        if (notificationSettings.vibration && navigator.vibrate) {
          try {
            await navigator.vibrate([200, 100, 200]);
            console.log("Vibration successful");
          } catch (vibrateError) {
            console.log("Vibration failed:", vibrateError);
          }
        }
      } catch (playError) {
        console.error("Error playing sound:", playError);
        throw playError;
      }
    } catch (error) {
      console.error("Error in playNotifications:", error);
      showNotification(
        'warning',
        'Sound Playback Issue',
        'Unable to play alert sound. Please check your browser settings and volume.',
        5000
      );
    }
  }, [notificationSettings, showNotification]);

  // Add effect to handle new alerts with immediate sound feedback
  useEffect(() => {
    const handleNewAlert = (newAlerts) => {
      // Only play notifications if there are new alerts and driver is available
      if (newAlerts.length > 0 && status === "Available") {
        console.log("New alerts detected, playing notification:", newAlerts);
        
        // Immediate sound feedback
        setTimeout(() => {
          playNotifications();
        }, 100);
        
        // Show notification for each new alert
        newAlerts.forEach(alert => {
          showNotification(
            'info',
            'New Alert',
            `New emergency alert received from ${alert.location || 'unknown location'}`,
            5000
          );
        });
      }
    };

    // Watch for changes in alerts
    const prevAlerts = alertsRef.current;
    const currentAlerts = alerts;
    
    if (currentAlerts.length > prevAlerts.length) {
      const newAlerts = currentAlerts.filter(alert => 
        !prevAlerts.find(a => a.id === alert.id) && 
        alert.status === "Waiting"
      );
      
      if (newAlerts.length > 0) {
        console.log("Processing new alerts:", newAlerts);
        handleNewAlert(newAlerts);
      }
    }
    
    // Update reference after processing
    alertsRef.current = currentAlerts;
  }, [alerts, status, playNotifications, showNotification]);

  // Initialize notification sound
  useEffect(() => {
    // Preload the notification sound
    const preloadSound = async () => {
      try {
        const sound = new Audio('/notification.mp3');
        sound.preload = 'auto';
        await sound.load();
        console.log("Notification sound preloaded successfully");
      } catch (error) {
        console.error("Error preloading notification sound:", error);
      }
    };

    preloadSound();
  }, []);

  // Add effect to sync alert state with server on initial load
  useEffect(() => {
    // This effect ensures we have a clean, consistent state when the dashboard loads
    const syncWithServer = async () => {
      try {
        // First check localStorage for active alerts to avoid unnecessary API calls
        const activeAlert = localStorage.getItem("activeAlert");
        const navigationData = localStorage.getItem("navigationAlertData");
        
        if (activeAlert || navigationData) {
          console.log("Found potential active alert in localStorage, verifying...");
          // Parse the data
          const alertData = activeAlert ? 
            JSON.parse(activeAlert) : 
            JSON.parse(navigationData);
          
          if (alertData && alertData.id) {
            // If we have an ID, verify this alert is still active on the server
            try {
              const alertCheck = await ApiService.getAlertById(alertData.id);
              if (alertCheck && alertCheck.status === 'assigned') {
                console.log("Verified active alert:", alertCheck);
                // Navigate to navigation page since this is a valid active alert
                navigate(`/ambulance-navigation`, { replace: true });
                return;
              } else {
                console.log("Alert exists but is no longer assigned to this driver, cleaning local state");
                localStorage.removeItem("activeAlert");
                localStorage.removeItem("navigationAlertData");
              }
            } catch (alertCheckError) {
              console.error("Error checking alert, proceeding with sync:", alertCheckError);
            }
          }
        }
        
        // If we didn't find an active alert in localStorage or it wasn't valid,
        // perform a lightweight sync with the server
        console.log("Syncing alert state with server on dashboard load");
        const syncResult = await ApiService.syncActiveAlertState();
        
        if (syncResult.hasActiveAlert && syncResult.alertData) {
          console.log("Found active alert during sync:", syncResult.alertData);
          // If there's an active alert, we should redirect to navigation
          navigate(`/ambulance-navigation`, { replace: true });
        } else {
          console.log("No active alerts found during sync, local state cleaned:", syncResult.message);
        }
      } catch (error) {
        console.error("Error syncing with server on dashboard load:", error);
      }
    };
    
    // Start sync process immediately
    syncWithServer();
  }, [navigate]);
  
  // Check for active alert in localStorage
  useEffect(() => {
    const savedActiveAlert = localStorage.getItem("activeAlert");
    if (savedActiveAlert) {
      try {
        const parsedAlert = JSON.parse(savedActiveAlert);
        activeAlertRef.current = parsedAlert;
        
        // Navigate to navigation view if there's an active alert
        navigate(`/ambulance-navigation`, { replace: true });
      } catch (err) {
        console.error("Error parsing saved active alert:", err);
        localStorage.removeItem("activeAlert");
      }
    }
  }, [navigate]);

  // Handle Accept Alert - updated to ensure proper database update
  const handleAccept = async (alert) => {
    // Validate alert object and ensure we have an ID
    if (!alert) {
      setError("Invalid alert data. Unable to accept.");
      return;
    }
    
    // Make sure we have a valid ID - try both id and alert_id
    const alertId = alert.id || alert.alert_id;
    if (!alertId) {
      setError("Alert is missing an ID. Unable to accept.");
      console.error("Alert is missing an ID:", alert);
      return;
    }
    
    // Get current driver ID from localStorage
    const driver = JSON.parse(localStorage.getItem('driver') || '{}');
    const driverId = driver.id;
    
    if (!driverId) {
      setError("Driver information is missing. Please log out and log back in.");
      console.error("Driver ID missing when accepting alert");
      return;
    }
    
    // Set loading state
    setIsLoading(true);
    
    try {
      // Format coordinates properly for navigation
      const coordinates = {
        lat: parseFloat(alert.coordinates_lat),
        lng: parseFloat(alert.coordinates_lng)
      };
      
      // Validate coordinates are within Lahore boundaries
      const LAHORE_BOUNDS = {
        LAT_MIN: 31.4000,
        LAT_MAX: 31.6000,
        LNG_MIN: 74.2000,
        LNG_MAX: 74.4000
      };

      // Check if coordinates are valid and within Lahore bounds
      if (!coordinates.lat || !coordinates.lng || 
          isNaN(coordinates.lat) || isNaN(coordinates.lng) ||
          coordinates.lat < LAHORE_BOUNDS.LAT_MIN || coordinates.lat > LAHORE_BOUNDS.LAT_MAX ||
          coordinates.lng < LAHORE_BOUNDS.LNG_MIN || coordinates.lng > LAHORE_BOUNDS.LNG_MAX) {
        console.error("Invalid coordinates or outside Lahore boundaries:", coordinates);
        setError("Invalid coordinates or location outside Lahore boundaries");
        setIsLoading(false);
        return;
      }

      // Prepare complete alert data for navigation
      const completeAlertData = {
        ...alert,
        id: alertId,
        status: "Accepted",
        driver: driverId,
        driverName: driver.name || "Current Driver",
        coordinates: coordinates,
        coordinates_lat: coordinates.lat,
        coordinates_lng: coordinates.lng,
        address: alert.address || alert.location_address || alert.emergency_address || alert.location || "Address not available",
        location_address: alert.address || alert.location_address || alert.emergency_address || alert.location || "Address not available",
        emergency_address: alert.address || alert.location_address || alert.emergency_address || alert.location || "Address not available",
        location: alert.location || alert.address || alert.location_address || alert.emergency_address || "Address not available"
      };
      
      console.log("Prepared alert data for navigation:", completeAlertData);

      // Update UI status to show driver as unavailable
      setStatus("Unavailable");
      setChangeStatus(false);
          
      // Clear the timer for this alert
      if (timersRef.current[alertId]) {
        clearInterval(timersRef.current[alertId]);
        delete timersRef.current[alertId];
      }
          
      // Track retry attempts
      let retryCount = 0;
      const maxRetries = 2;
      
      const attemptAcceptAlert = async () => {
        try {
        // First, verify the alert is still available before proceeding
          const currentAlertState = await ApiService.getAlertById(alertId);
          
            // Check if alert is still in pending state and available for assignment
            if (currentAlertState.status !== 'pending') {
              throw new Error(`Alert is no longer available (current status: ${currentAlertState.status})`);
            }
            
            console.log("Alert verified as available, proceeding with assignment");
            
            // Now proceed with assignment
          const response = await ApiService.assignDriver(alertId, driverId);
            console.log("Driver assigned to alert:", response);
            
            // Format coordinates from the response
            const updatedCoordinates = {
              lat: parseFloat(response.coordinates_lat),
              lng: parseFloat(response.coordinates_lng)
            };
            
            // Validate updated coordinates
            if (!updatedCoordinates.lat || !updatedCoordinates.lng || 
                isNaN(updatedCoordinates.lat) || isNaN(updatedCoordinates.lng) ||
                updatedCoordinates.lat < LAHORE_BOUNDS.LAT_MIN || updatedCoordinates.lat > LAHORE_BOUNDS.LAT_MAX ||
                updatedCoordinates.lng < LAHORE_BOUNDS.LNG_MIN || updatedCoordinates.lng > LAHORE_BOUNDS.LNG_MAX) {
              throw new Error("Invalid coordinates received from server or location outside Lahore boundaries");
            }
            
            // Update the alert data with the latest coordinates and address
            const updatedAlertData = {
              ...completeAlertData,
              coordinates: updatedCoordinates,
              coordinates_lat: updatedCoordinates.lat,
              coordinates_lng: updatedCoordinates.lng,
              address: response.address || response.location_address || response.emergency_address || response.location || completeAlertData.address || "Address not available",
              location_address: response.address || response.location_address || response.emergency_address || response.location || completeAlertData.location_address || "Address not available",
              emergency_address: response.address || response.location_address || response.emergency_address || response.location || completeAlertData.emergency_address || "Address not available",
              location: response.location || response.address || response.location_address || response.emergency_address || completeAlertData.location || "Address not available"
            };

            // Store the alert data in localStorage with all address fields
          localStorage.setItem("activeAlert", JSON.stringify(updatedAlertData));
          localStorage.setItem("navigationAlertData", JSON.stringify(updatedAlertData));

            // On success, navigate to the navigation view
            navigate(`/ambulance-navigation`, { replace: true });
            setIsLoading(false);
            
            // Broadcast the status change event for other components to react
          await ApiService.broadcastStatusChange();
        } catch (error) {
            console.error(`Error accepting alert (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
            
            if (retryCount < maxRetries) {
              // Increment retry counter and try again after a delay
              retryCount++;
              console.log(`Retrying... (${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            return attemptAcceptAlert();
          }
          
          throw error; // Re-throw if all retries failed
        }
      };

      // Start the first attempt
      await attemptAcceptAlert();
    } catch (error) {
      console.error("Error accepting alert:", error);
      setError(error.message || "Failed to accept alert. Please try again.");
              setIsLoading(false);
              
              // Revert UI changes on error
              const revertedAlerts = alerts.map(a => {
                if ((a.id === alertId) || (a.alert_id === alertId)) {
                  return { ...a, status: "Waiting" };
                }
                return a;
              });
              setAlerts(revertedAlerts);
              alertsRef.current = revertedAlerts;
              
              // Reset driver status in UI
              setStatus("Available");
              setChangeStatus(true);
              
              // Check if we need to perform cleanup
      try {
        const alertState = await ApiService.getAlertById(alertId);
                  // Only perform cleanup if the alert is in an inconsistent state
                  if (alertState.status === 'assigned' && alertState.driver == driverId) {
                    console.log("Alert is in inconsistent state, performing cleanup");
                    
                    // Show notification about cleanup
                    showNotification(
                      'warning',
                      'Cleanup Required',
                      'Inconsistent alert state detected. Performing automatic cleanup...'
                    );
                    
                    // Use the dedicated endpoint for cleanup
          const response = await fetch(`${API_BASE_URL}/alerts/reset_driver_status/`, {
                      method: 'POST',
                      headers: {
                        ...getAuthHeaders(),
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ driver_id: driverId })
                    });

                  if (!response.ok) {
            const data = await response.json();
                      throw new Error(`Cleanup failed: ${data.error || response.status}`);
                  }

          const data = await response.json().catch(() => ({}));
                  console.log("Cleanup result:", data);
                  
                  // Show success notification if cleanup was performed
                  if (data && data.cleared_alerts && data.cleared_alerts.length > 0) {
                    showNotification(
                      'success',
                      'Cleanup Completed',
                      `Successfully cleaned up ${data.cleared_alerts.length} alerts and reset driver status.`,
                      8000
                    );
                  }
        } else {
          console.log("Alert is in consistent state, no cleanup needed");
        }
      } catch (cleanupError) {
                  console.error("Error during cleanup:", cleanupError);
                  
                  // Show error notification
                  showNotification(
                    'error',
                    'Cleanup Failed',
                    `Error during cleanup: ${cleanupError.message}`,
                    10000
                  );
      }
              
              // Clear localStorage regardless of cleanup result
              localStorage.removeItem("activeAlert");
              localStorage.removeItem("navigationAlertData");
    }
  };

  // Timer countdown effect with memoized callback to prevent re-renders
  const updateTimer = useCallback(() => {
    setTimeLeft(prev => {
      const newTimeLeft = prev - 1;
        
        // Update timeRemaining for all waiting alerts
      if (newTimeLeft >= 0) {
        setAlerts(prevAlerts => {
          const shouldUpdate = prevAlerts.some(
            alert => alert.status === "Waiting" && alert.timeRemaining > 0
          );
          
          if (!shouldUpdate) return prevAlerts;
          
          const updated = prevAlerts.map(alert => 
            alert.status === "Waiting" 
              ? { ...alert, timeRemaining: alert.timeRemaining > 0 ? alert.timeRemaining - 1 : 0 }
              : alert
          );
          alertsRef.current = updated;
          return updated;
        });
      }
      
      return newTimeLeft;
    });
  }, []);

  // Timer effect using setInterval instead of setTimeout for better performance
  useEffect(() => {
    let timer;
    
    if (timeLeft > 0 && currentAlertPopup) {
      timer = setInterval(updateTimer, 1000);
    } else if (timeLeft === 0 && currentAlertPopup) {
      // Auto-reject when timer runs out
      handleReject(currentAlertPopup.id);
      // Reset timer for next alert
      setTimeLeft(30);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timeLeft, currentAlertPopup, handleReject, updateTimer]);

  // View alert details
  const handleViewDetails = (alert) => {
    setSelectedAlert(alert);
    setShowDetailsPopup(true);
  };

  // View map
  const handleMapView = (alert) => {
    setSelectedAlert(alert);
    setShowMapPopup(true);
  };

  // View accident footage
  const handleAccidentView = (alert) => {
    setSelectedAlert(alert);
    setShowAccidentPopup(true);
  };

  // Close all popups
  const closeAllPopups = () => {
    setShowDetailsPopup(false);
    setShowMapPopup(false);
    setShowAccidentPopup(false);
    setSelectedAlert(null);
  };
  
  // Cleanup notification timeout on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  // Add effect to listen for cleanup events
  useEffect(() => {
    // Handler for cleanup events
    const handleCleanupEvent = (event) => {
      const { type, title, message } = event.detail;
      
      // Show notification with the event details
      showNotification(
        type || 'info',
        title || 'System Cleanup',
        message || 'A system cleanup operation was performed',
        8000
      );
    };
    
    // Add event listener
    window.addEventListener('cleanupPerformed', handleCleanupEvent);
    
    // Cleanup
    return () => {
      window.removeEventListener('cleanupPerformed', handleCleanupEvent);
    };
  }, [showNotification]);

  // Initialize currentAlertPopup with the first waiting alert if available
  const updateCurrentAlertPopup = useCallback(() => {
    // Never show any alert popups at all
    setShowAlertPopup(false);
    timerActiveRef.current = false;
    
    // We're keeping track of alerts but not showing popups
    const waitingAlerts = alertsRef.current.filter(alert => alert.status === "Waiting");
    if (waitingAlerts.length > 0 && (!currentAlertPopup || currentAlertPopup.status !== "Waiting")) {
      setCurrentAlertPopup(waitingAlerts[0]);
    }
  }, [currentAlertPopup]);

  useEffect(() => {
    updateCurrentAlertPopup();
  }, [alerts, updateCurrentAlertPopup]);
  
  // Check if there is an active alert
  const hasActiveAlert = checkForActiveAlerts();
  
  // Debug logs
  const alertsBeingRendered = alerts.filter(alert => alert.status !== "Rejected");
  const waitingAlerts = alertsBeingRendered.filter(alert => alert.status === "Waiting");
  console.log("Alerts being rendered:", alertsBeingRendered);
  console.log("Waiting alerts count:", waitingAlerts.length);
  console.log("hasActiveAlert:", hasActiveAlert);

  // Handle manual cleanup of database inconsistencies
  const handleManualReset = async () => {
    setIsLoading(true);
    
    try {
      // Show initial notification
      showNotification(
        'info',
        'Cleanup Started',
        'Database cleanup operation initiated...',
        3000
      );
      
      // Call the database cleanup endpoint
      const result = await ApiService.cleanDatabaseInconsistencies();
      console.log("Database cleanup result:", result);
      
      // Clear any error message
      setError(null);
      
      // Clear any active alert references
      localStorage.removeItem("activeAlert");
      localStorage.removeItem("navigationAlertData");
      activeAlertRef.current = null;
      
      // Show success message
      if (result.success) {
        showNotification(
          'success',
          'Cleanup Successful',
          `Database cleaned successfully with ${Object.values(result.updates || {}).reduce((a, b) => a + b, 0)} updates.`,
          5000
        );
      } else {
        showNotification(
          'warning',
          'Cleanup Completed',
          result.message || 'Database cleanup completed with warnings.',
          5000
        );
      }
      
      // Refresh the alerts to update the UI
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (resetError) {
      console.error("Error during database cleanup:", resetError);
      setError(`Failed to clean database: ${resetError.message || 'Unknown error'}`);
      
      // Show error notification
      showNotification(
        'error',
        'Cleanup Failed',
        `Failed to clean database: ${resetError.message || 'Unknown error'}`,
        8000
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Add effect to sync status when returning from navigation
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        const driver = JSON.parse(localStorage.getItem('driver') || '{}');
        if (driver && driver.id) {
          try {
            const driverData = await ApiService.getDriver(driver.id);
            if (driverData) {
              const newStatus = driverData.status === 'available' ? 'Available' : 'Unavailable';
              setStatus(newStatus);
              setChangeStatus(driverData.status === 'available');
            }
          } catch (error) {
            console.error('Error syncing driver status:', error);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Handle window resize and update mobile state
  useEffect(() => {
    const handleResize = () => {
      // Removed unused mobile state handling
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Add effect to fetch pending alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setIsLoading(true);
        const data = await ApiService.getPendingAlerts();
        
        if (Array.isArray(data)) {
          // Map pending status to Waiting for UI consistency
          const statusMappedData = data.map(alert => ({
            ...alert,
            status: alert.status === "pending" ? "Waiting" : alert.status,
            timeRemaining: 30 // Initialize timer for each alert
          }));
          
          setAlerts(statusMappedData);
          alertsRef.current = statusMappedData;
          
          // Set all alerts as visible initially
          const alertIds = statusMappedData.map(alert => alert.id);
          setVisibleAlerts(alertIds);
          
          // Play notification if there are waiting alerts and driver is available
          const hasWaitingAlerts = statusMappedData.some(alert => alert.status === "Waiting");
          if (hasWaitingAlerts && status === "Available") {
            console.log("Playing notification for new alerts");
            playNotifications();
          }
        }
      } catch (error) {
        console.error("Error fetching alerts:", error);
        setError("Failed to fetch alerts. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchAlerts();

    // Set up polling interval
    const pollInterval = setInterval(fetchAlerts, 10000); // Poll every 10 seconds

    // Cleanup
    return () => {
      clearInterval(pollInterval);
    };
  }, [status, playNotifications]); // Dependencies for the effect

  return (
    <div className={`ambulance-dashboard ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          {/* Status Controls at Top */}
          <div className="status-controls">
            <div className="status-display">
              <span>Status:</span>
              <span className={`status-value ${status.toLowerCase()}`}>{status}</span>
              {status === "Unavailable" && hasActiveAlert && (
                <span className="status-reason">(Responding to alert)</span>
              )}
            </div>
            
            <div className="change-status">
              <span>Change Status:</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={changeStatus}
                  onChange={async () => {
                    // Toggle state in UI first for immediate feedback
                    setChangeStatus(!changeStatus);
                    const newStatus = changeStatus ? "Unavailable" : "Available";
                    setStatus(newStatus);
                    
                    // Update the status in the backend
                    await updateDriverStatus(newStatus.toLowerCase());
                    
                    // Auto-reject all alerts when status changes to Unavailable
                    if (newStatus === "Unavailable") {
                      setAlerts((prevAlerts) => {
                        const updated = prevAlerts.map((alert) => ({
                          ...alert,
                          status: "Rejected"
                        }));
                        alertsRef.current = updated;
                        return updated;
                      });
                      
                      // Close any open alert popup
                      if (showAlertPopup) {
                        timerActiveRef.current = false;
                        setShowAlertPopup(false);
                      }
                    } else {
                      // If status changed to Available, force refresh alerts and play sound if there are pending alerts
                      try {
                        const data = await ApiService.getPendingAlerts();
                        if (Array.isArray(data)) {
                          const statusMappedData = data.map(alert => ({
                            ...alert,
                            status: alert.status === "pending" ? "Waiting" : alert.status
                          }));

                          // Check if there are any waiting alerts
                          const hasWaitingAlerts = statusMappedData.some(alert => alert.status === "Waiting");
                          
                          // Play notification if there are waiting alerts
                          if (hasWaitingAlerts) {
                            console.log("Playing notification for existing alerts on status change");
                            playNotifications();
                            showNotification(
                              'info',
                              'Available for Alerts',
                              'You have pending alerts waiting for response',
                              5000
                            );
                          }

                          setAlerts(statusMappedData);
                          alertsRef.current = statusMappedData;
                          
                          // Reset visibility for new alerts
                          const alertIds = statusMappedData.map(alert => alert.id);
                          setVisibleAlerts(alertIds);
                        }
                      } catch (error) {
                        console.error("Error refreshing alerts:", error);
                      }
                    }
                  }}
                />
                <span className="slider round"></span>
              </label>
            </div>
        
        {/* Reset Button (hidden until needed) */}
        {error && (
          <button className="reset-button" onClick={handleManualReset} disabled={isLoading}>
            {isLoading ? "Cleaning..." : "Reset Database Inconsistencies"}
          </button>
        )}
          </div>

          {/* Alerts Section */}
          <div className="alerts-section">
            <div className="alerts-header">
              <h2>Alerts</h2>
            </div>
            
            <div className="alerts-container">
              {error && (
                <div className="error-message">
                  <p>{error}</p>
                  {error.includes("Data inconsistency") && (
                    <button 
                      className="fix-inconsistency-btn" 
                      onClick={handleManualReset}
                      disabled={isLoading}
                    >
                      Fix Data
                    </button>
                  )}
                  <button onClick={() => window.location.reload()}>Retry</button>
                </div>
              )}

              {isLoading && !error ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <p>Loading alerts...</p>
                </div>
              ) : (
                <>
                  {alerts.length > 0 && !hasActiveAlert ? (
                    alerts
                      .filter(alert => alert.status !== "Rejected")
                      .map((alert) => (
                        <div
                          key={alert.id}
                          className={`alert-card ${alert.status.toLowerCase()} ${alert.isNew ? 'new-alert' : ''} ${visibleAlerts.includes(alert.id) ? 'visible' : 'hidden'}`}
                          style={{
                            animationDelay: `${alerts.indexOf(alert) * 5}s`
                          }}
                        >
                          {alert.status === "Waiting" && (
                            <div className="timer-status-container">
                              <div className="loading-animation">
                                <div className="pulse-ring"></div>
                              </div>
                            </div>
                          )}
                          <div className="alert-left-border"></div>
                          <div className="alert-content">
                            <div className="alert-header">
                              <div className="alert-id-time">
                                <div className="alert-id">
                                  Alert No: {alert.id}
                                </div>
                                <div className="alert-time-location">
                                  <FaClock className="alert-icon" /> {format12HourTime(alert.time)}
                                </div>
                                <div className="alert-time-location">
                                  <FaMapMarkerAlt className="alert-icon" /> {alert.location}
                                </div>
                              </div>
                              
                              <div className="alert-status">
                                {alert.status !== "Waiting" && (
                                  <span className="status-badge accepted">
                                    <FaCheckCircle className="status-icon" /> {alert.status}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="incident-info">
                              <span 
                                className="view-details-text"
                                onClick={() => handleViewDetails(alert)}
                              >
                                <FaFileAlt className="view-icon" /> View Details
                              </span>
                              
                              <div className="map-view">
                                <button 
                                  className="view-btn map-btn"
                                  onClick={() => handleMapView(alert)}
                                >
                                  <FaMapMarkedAlt className="view-icon" />
                                  <span>Map View</span>
                                </button>
                              </div>
                              
                              <div className="view-accident">
                                <button 
                                  className="view-btn accident-btn"
                                  onClick={() => handleAccidentView(alert)}
                                >
                                  <FaVideo className="view-icon" />
                                  <span>View Accident</span>
                                </button>
                              </div>
                            </div>
                            
                            {/* Always show accept/reject buttons for Waiting alerts */}
                            {alert.status === "Waiting" && (
                              <div className="alert-actions">
                                <button 
                                  className="accept-btn" 
                                  onClick={() => handleAccept(alert)}
                                  disabled={hasActiveAlert}
                                  title={hasActiveAlert ? "Complete or cancel the current alert before accepting a new one" : "Accept this alert"}
                                >
                                  <FaCheckCircle className="action-icon" /> Accept
                                </button>
                                <button className="reject-btn" onClick={() => handleReject(alert.id)}>
                                  <FaTimesCircle className="action-icon" /> Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="no-alerts">
                      {hasActiveAlert ? (
                        <p>An alert is currently active. Complete or cancel it to see new alerts.</p>
                      ) : (
                        <p>No active alerts found</p>
                      )}
                    </div>
                  )}
                </>
              )}
        </div>
      </div>

      {/* Popup for Alert Details */}
      {showDetailsPopup && selectedAlert && (
        <div className="popup-overlay">
          <div className="popup-content">
            <div className="popup-header">
              <h3>Alert Details</h3>
              <button className="close-btn" onClick={closeAllPopups}>×</button>
            </div>
            <div className="popup-body">
              <div className="detail-item">
                <span className="detail-label">Alert No:</span>
                <span className="detail-value">{selectedAlert.id}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Time:</span>
                <span className="detail-value">{format12HourTime(selectedAlert.time)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Location:</span>
                <span className="detail-value">{selectedAlert.location}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className={`status-badge ${selectedAlert.status.toLowerCase()}`} style={{ backgroundColor: '#757575', color: 'white' }}>
                  {selectedAlert.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup for Map View */}
      {showMapPopup && selectedAlert && (
        <div className="map-view-popup">
          <div className="map-view-overlay" onClick={closeAllPopups} />
          <div className="map-view-content">
            <div className="map-view-header">
              <div className="map-view-title">
                <FaMapMarkerAlt />
                <h2>Location Map</h2>
              </div>
              <button className="map-view-close" onClick={closeAllPopups}>
                <FaTimes />
              </button>
            </div>
            
            <div className="map-view-body">
              <div className="map-view-container">
                {selectedAlert.coordinates ? (
                  <iframe
                    title="Emergency Location"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedAlert.coordinates.lng-0.01},${selectedAlert.coordinates.lat-0.01},${selectedAlert.coordinates.lng+0.01},${selectedAlert.coordinates.lat+0.01}&layer=mapnik&marker=${selectedAlert.coordinates.lat},${selectedAlert.coordinates.lng}`}
                    allowFullScreen
                  />
                ) : (
                  <div className="map-view-placeholder">
                    <FaMapMarkerAlt className="map-view-placeholder-icon" />
                    <p>No location coordinates available</p>
                  </div>
                )}
              </div>
              
              <div className="map-view-sidebar">
                <div className="map-view-details">
                  <div className="map-view-alert-info">
                    <div className="map-view-alert-header">
                      <span className="map-view-alert-id">Alert #{selectedAlert.id}</span>
                      <span className={`map-view-status ${selectedAlert.status.toLowerCase()}`}>
                        {selectedAlert.status}
                      </span>
                    </div>
                    
                    <div className="map-view-location">
                      <span className="map-view-location-label">Location</span>
                      <span className="map-view-location-value">{selectedAlert.location}</span>
                      
                      {selectedAlert.coordinates && (
                        <div className="map-view-coordinates">
                          <div className="map-view-coordinate">
                            <span className="map-view-coordinate-label">Latitude</span>
                            <span className="map-view-coordinate-value">
                              {selectedAlert.coordinates.lat}
                            </span>
                          </div>
                          <div className="map-view-coordinate">
                            <span className="map-view-coordinate-label">Longitude</span>
                            <span className="map-view-coordinate-value">
                              {selectedAlert.coordinates.lng}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedAlert.coordinates && (
                  <>
                    <div className="map-view-tools">
                      <a 
                        className="map-view-tool-btn"
                        href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;${selectedAlert.coordinates.lat},${selectedAlert.coordinates.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FaRoute />
                        Get Directions
                      </a>
                      <a 
                        className="map-view-tool-btn"
                        href={`https://www.openstreetmap.org/?mlat=${selectedAlert.coordinates.lat}&mlon=${selectedAlert.coordinates.lng}#map=15/${selectedAlert.coordinates.lat}/${selectedAlert.coordinates.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FaMapMarkedAlt />
                        View Full Map
                      </a>
                    </div>
                    
                    <div className="map-view-directions">
                      <h3 className="map-view-directions-header">Location Information</h3>
                      <div className="map-view-route-steps">
                        <p>Click &quot;Get Directions&quot; to plan your route to this location.</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup for Accident View */}
      {showAccidentPopup && selectedAlert && (
        <div className="popup-overlay">
          <div className="popup-content video-popup">
            <div className="popup-header">
              <h3>Accident Footage</h3>
              <button className="close-btn" onClick={closeAllPopups}>×</button>
            </div>
            <div className="popup-body">
              <div className="video-container">
                {(selectedAlert.accident_clip_url || selectedAlert.video_url || selectedAlert.accident_clip) ? (
                  <video 
                    controls 
                    width="100%" 
                    style={{ borderRadius: "8px" }}
                    autoPlay={false}
                    src={selectedAlert.accident_clip_url || selectedAlert.video_url || selectedAlert.accident_clip}
                    onError={(e) => {
                      console.error('Video playback error:', e);
                      e.target.parentElement.innerHTML = `
                        <div class="video-error">
                          <p>Error playing video. Please try again.</p>
                          <p>Alert #${selectedAlert.id}</p>
                        </div>
                      `;
                    }}
                  >
                    <source type="video/mp4" />
                    <source type="video/webm" />
                  Your browser does not support the video tag.
                </video>
                ) : (
                  <div className="no-video">
                    <FaVideo style={{ fontSize: '48px', color: '#999' }} />
                    <p>No accident footage available</p>
                    <p>Alert #{selectedAlert.id}</p>
                  </div>
                )}
              </div>
              <div className="accident-details">
                <p>Alert ID: {selectedAlert.id}</p>
                <p><FaClock style={{ color: '#757575', marginRight: '8px' }} /> {selectedAlert.time_reported || selectedAlert.created_at}</p>
                <p><FaMapMarkerAlt style={{ color: '#757575', marginRight: '8px' }} /> {selectedAlert.location}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Notification Popup */}
      {notification && (
        <div className={`notification-popup ${notification.type} ${notificationClosing ? 'closing' : ''}`}>
          <button className="close-notification" onClick={hideNotification}>×</button>
          <h4>
            {notification.type === 'success' && <FaCheckCircle color="#2ecc71" />}
            {notification.type === 'error' && <FaTimesCircle color="#e74c3c" />}
            {notification.type === 'warning' && <FaExclamationTriangle color="#f39c12" />}
            {notification.type === 'info' && <FaInfoCircle color="#3498db" />}
            {notification.title}
          </h4>
          <p>{notification.message}</p>
        </div>
      )}
    </div>
  );
};

const AmbulanceDashboard = () => {
  return (
    <DashboardLayout role="driver">
      <AmbulanceDashboardContent />
    </DashboardLayout>
  );
};

export default AmbulanceDashboard;
