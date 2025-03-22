import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaFileAlt, 
  FaMapMarkedAlt, 
  FaVideo, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaClock,
  FaMapMarkerAlt
} from "react-icons/fa";
import AmbulanceSidebar from "../AmbulanceDashboardLayout/AmbulanceSidebar";
import MockApiService from "../../services/mockApi/mockApiService";
import "./AmbulanceDashboard.css";
import "./AlertAnimation.css";
import "./ColorFixes.css";
import "./AlertCardStyles.css";

const AmbulanceDashboard = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Available");
  const [changeStatus, setChangeStatus] = useState(true);
  const alertPollInterval = useRef(null);
  const alertsRef = useRef([]);
  const [hasActiveAlert, setHasActiveAlert] = useState(false);

  // Popup states
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const [showMapPopup, setShowMapPopup] = useState(false);
  const [showAccidentPopup, setShowAccidentPopup] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  
  // Alert popup states - only used for auto-reject timer
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [currentAlertPopup, setCurrentAlertPopup] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const timerActiveRef = useRef(false);

  // Responded alerts state
  const [respondedAlerts, setRespondedAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Alerts state - now fetched from API with a visible flag for animation
  const [alerts, setAlerts] = useState([]);
  const lastAlertIdRef = useRef(null);
  const [animatingAlertId, setAnimatingAlertId] = useState(null);
  
  // Keeping last processed alerts to prevent unnecessary re-renders
  const processedAlertsRef = useRef([]);

  // Add new state for staggered animations
  const [visibleAlerts, setVisibleAlerts] = useState([]);
  const animationTimeoutRef = useRef(null);

  // Function to check if two sets of alerts are the same
  const areAlertsEqual = (alerts1, alerts2) => {
    if (alerts1.length !== alerts2.length) return false;
    const ids1 = alerts1.map(a => a.id).sort();
    const ids2 = alerts2.map(a => a.id).sort();
    return JSON.stringify(ids1) === JSON.stringify(ids2);
  };

  // Function to check if alerts have significant differences that warrant re-rendering
  const areAlertsSignificantlyDifferent = (prev, current) => {
    if (!prev || !current) return true;
    if (prev.length !== current.length) return true;
    
    // Compare alert IDs and statuses
    const prevMap = new Map(prev.map(a => [a.id, a.status]));
    return current.some(alert => 
      !prevMap.has(alert.id) || prevMap.get(alert.id) !== alert.status
    );
  };

  // Process alerts data and add animation properties with staggered timing
  const processAlerts = (alertsData) => {
    const processedAlerts = alertsData.map(alert => {
      const isNewAlert = !processedAlertsRef.current.some(
        prevAlert => prevAlert.id === alert.id
      );

      return {
        ...alert,
        visible: true,
        isNew: isNewAlert,
        animating: isNewAlert
      };
    });
    
    setAlerts(processedAlerts);
    alertsRef.current = processedAlerts;

    // Handle staggered animations for new alerts
    const newAlerts = processedAlerts.filter(alert => alert.isNew);
    if (newAlerts.length > 0) {
      // Clear any existing animation timeout
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }

      // Show alerts one by one with 5-second gap
      newAlerts.forEach((alert, index) => {
        setTimeout(() => {
          setVisibleAlerts(prev => [...prev, alert.id]);
        }, index * 5000); // 5 seconds gap between each alert
      });
    }
  };

  // Function to check for active alerts
  const checkForActiveAlerts = useCallback(() => {
    const acceptedAlert = alertsRef.current.find(alert => alert.status === "Accepted");
    setHasActiveAlert(!!acceptedAlert);
  }, []);

  // Fetch alerts from database & process them - updated
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await MockApiService.getAmbulanceAlerts();
        if (response.success) {
          // Only update if this response has different alerts than before
          if (areAlertsSignificantlyDifferent(processedAlertsRef.current, response.data)) {
            processAlerts(response.data);
            processedAlertsRef.current = response.data;
          }
          
          // Check for active alerts whenever we get new data
          checkForActiveAlerts();
        } else {
          setError("Failed to fetch alerts");
        }
      } catch (error) {
        console.error("Error fetching alerts:", error);
        setError("Error fetching alerts: " + error.message);
      }
    };

    // Initial fetch
    fetchAlerts();

    // Set up polling for new alerts
    const pollForNewAlerts = () => {
      timerActiveRef.current = true;
      if (alertPollInterval.current) {
        clearInterval(alertPollInterval.current);
      }
      
      alertPollInterval.current = setInterval(async () => {
        if (timerActiveRef.current) {
          await fetchAlerts();
        }
      }, 5000); // Poll every 5 seconds - adjust as needed
    };

    pollForNewAlerts();

    // Cleanup interval on unmount
    return () => {
      timerActiveRef.current = false;
      if (alertPollInterval.current) {
        clearInterval(alertPollInterval.current);
      }
    };
  }, [areAlertsSignificantlyDifferent, processAlerts, checkForActiveAlerts]);

  // Fetch responded alerts from database
  useEffect(() => {
    const fetchRespondedAlerts = async () => {
      try {
        // Get completed alerts
        const response = await MockApiService.getCompletedAmbulanceAlerts();
        if (response.success) {
          console.log("Completed alerts:", response.data); // Debug log
          setRespondedAlerts(response.data);
          
          // Check if there are any active alerts in completed alerts
          const completedActiveAlert = response.data.find(
            alert => alert.status === "Completed" || alert.status === "Cancelled"
          );
          if (completedActiveAlert) {
            setHasActiveAlert(false);
          }
        } else {
          setError("Failed to fetch responded alerts");
        }
      } catch (error) {
        console.error("Error fetching responded alerts:", error);
        setError("Error fetching responded alerts: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRespondedAlerts();
  }, []);

  // Handle Accept Alert - updated with animation
  const handleAccept = (alert) => {
    // Update alert status and add driver details
    const completeAlertData = {
      ...alert,
      status: "Accepted",
      driver: "Driver123",
      driverName: "John Smith",
      contactNo: "+92 300 1234567",
      responseTime: "5 mins",
      acceptedAt: new Date().toISOString()
    };

    // Store the complete alert data
    localStorage.setItem('activeAlert', JSON.stringify(completeAlertData));
    
    // Update alerts list
    setAlerts(prevAlerts => 
      prevAlerts.map(a => 
        a.id === alert.id ? completeAlertData : a
      )
    );

    // Navigate to the navigation page
    navigate('/ambulance-navigation');
  };

  // Handle Reject Alert - updated with animation
  const handleReject = useCallback((id) => {
    setAlerts((prevAlerts) => {
      const updated = prevAlerts.map((alert) =>
        alert.id === id 
          ? { ...alert, status: "Rejected", timeRemaining: 0, animating: true }
          : alert
      );
      alertsRef.current = updated;
      return updated;
    });
    
    MockApiService.updateAlertStatus(id, "Rejected").catch(err => 
      console.error("Error updating alert status:", err)
    );
    
    if (currentAlertPopup && currentAlertPopup.id === id) {
      timerActiveRef.current = false;
      setShowAlertPopup(false);
    }
  }, [currentAlertPopup]);

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

  // ✅ Handle View Details
  const handleViewDetails = (alert) => {
    setSelectedAlert(alert);
    setShowDetailsPopup(true);
  };

  // ✅ Handle Map View
  const handleMapView = (alert) => {
    setSelectedAlert(alert);
    setShowMapPopup(true);
  };

  // ✅ Handle Accident View
  const handleAccidentView = (alert) => {
    setSelectedAlert(alert);
    setShowAccidentPopup(true);
  };

  // ✅ Close all popups
  const closeAllPopups = () => {
    setShowDetailsPopup(false);
    setShowMapPopup(false);
    setShowAccidentPopup(false);
  };

  // Calculate timer percentage for loading animation
  const calculateTimerPercentage = (timeRemaining) => {
    return (timeRemaining / 30) * 100;
  };

  // Initialize currentAlertPopup with the first waiting alert if available
  // Using useEffect with memoized function to prevent re-renders
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

  return (
    <div className="ambulance-dashboard">
      {/* Left Sidebar */}
      <aside className="amb-sidebar">
        <AmbulanceSidebar />
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <div className="content-wrapper">
          {/* Status Controls at Top */}
          <div className="status-controls">
            <div className="status-display">
              <span>Status:</span>
              <span className={`status-value ${status.toLowerCase()}`}>{status}</span>
            </div>
            
            <div className="change-status">
              <span>Change Status:</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={changeStatus}
                  onChange={() => {
                    setChangeStatus(!changeStatus);
                    const newStatus = changeStatus ? "Unavailable" : "Available";
                    setStatus(newStatus);
                    
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
                    }
                  }}
                />
                <span className="slider round"></span>
              </label>
            </div>
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
                              <div 
                                className={`timer-progress-circle ${alert.timeRemaining < 10 ? 'pulsing' : ''}`}
                              >
                                <svg viewBox="0 0 36 36">
                                  <circle
                                    className="background-circle"
                                    cx="18"
                                    cy="18"
                                    r="16"
                                  />
                                  <circle
                                    className="progress-circle"
                                    cx="18"
                                    cy="18"
                                    r="16"
                                    style={{ 
                                      strokeDashoffset: `${100 - calculateTimerPercentage(alert.timeRemaining)}` 
                                    }}
                                  />
                                </svg>
                              </div>
                            </div>
                          )}
                          <div className="alert-content">
                            <div className="alert-header">
                              <div className="alert-id-time">
                                <div className="alert-id">
                                  Alert No: {alert.id}
                                </div>
                                <div className="alert-time-location">
                                  <FaClock /> {alert.time}
                                </div>
                                <div className="alert-time-location">
                                  <FaMapMarkerAlt /> {alert.location}
                                </div>
                              </div>
                              
                              <div className="alert-status">
                                {alert.status !== "Waiting" && (
                                  <span className="status-badge accepted">
                                    <FaCheckCircle /> {alert.status}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="incident-info">
                              <span 
                                className="view-details-text"
                                onClick={() => handleViewDetails(alert)}
                              >
                                <FaFileAlt /> View Details
                              </span>
                              
                              <div className="map-view">
                                <button 
                                  className="view-btn map-btn"
                                  onClick={() => handleMapView(alert)}
                                >
                                  <FaMapMarkedAlt />
                                  <span>Map View</span>
                                </button>
                              </div>
                              
                              <div className="view-accident">
                                <button 
                                  className="view-btn accident-btn"
                                  onClick={() => handleAccidentView(alert)}
                                >
                                  <FaVideo />
                                  <span>View Accident</span>
                                </button>
                              </div>
                            </div>
                            
                            {alert.status === "Waiting" && (
                              <div className="alert-actions">
                                <button 
                                  className="accept-btn" 
                                  onClick={() => handleAccept(alert)}
                                  disabled={hasActiveAlert}
                                  title={hasActiveAlert ? "Complete or cancel the current alert before accepting a new one" : "Accept this alert"}
                                >
                                  <FaCheckCircle /> Accept
                                </button>
                                <button className="reject-btn" onClick={() => handleReject(alert.id)}>
                                  <FaTimesCircle /> Reject
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
        </div>
        
        {/* Right Sidebar - Responded Alerts */}
        <div className="responded-alerts-sidebar">
          <h3>Completed Alerts</h3>
          
          {error && (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={() => window.location.reload()}>Retry</button>
            </div>
          )}
          
          {isLoading ? (
            <div className="loading-spinner small">
              <div className="spinner"></div>
              <p>Loading alerts...</p>
            </div>
          ) : (
            <>
              {respondedAlerts && respondedAlerts.length > 0 ? (
                <div className="active-alerts-list">
                  {respondedAlerts.slice(0, 3).map((alert) => (
                    <div className="completed-alert-card" key={alert.id}>
                      <div className="alert-content">
                        <div className="alert-header">
                          <div className="alert-id-time">
                            <div className="alert-id">
                              {alert.id}
                            </div>
                            <div className="alert-time-location">
                              <FaClock /> {alert.time}
                            </div>
                            <div className="alert-time-location">
                              <FaMapMarkerAlt /> {alert.location}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-alerts">
                  <p>No completed alerts found</p>
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
                <span className="detail-value">{selectedAlert.time}</span>
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
        <div className="popup-overlay">
          <div className="popup-content map-popup">
            <div className="popup-header">
              <h3>Map View</h3>
              <button className="close-btn" onClick={closeAllPopups}>×</button>
            </div>
            <div className="popup-body">
              <div className="map-container">
                <iframe
                  title="Accident Location"
                  width="100%"
                  height="400"
                  frameBorder="0"
                  style={{ borderRadius: "8px" }}
                  src={`https://maps.google.com/maps?q=${selectedAlert.coordinates.lat},${selectedAlert.coordinates.lng}&z=15&output=embed`}
                  allowFullScreen
                ></iframe>
              </div>
              <div className="map-details">
                <p>{selectedAlert.location}</p>
                <p>{selectedAlert.coordinates.lat}, {selectedAlert.coordinates.lng}</p>
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
                <video controls width="100%" style={{ borderRadius: "8px" }}>
                  <source src={selectedAlert.accidentClip} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="accident-details">
                <p>Alert ID: {selectedAlert.id}</p>
                <p><FaClock style={{ color: '#757575', marginRight: '8px' }} /> {selectedAlert.time}</p>
                <p><FaMapMarkerAlt style={{ color: '#757575', marginRight: '8px' }} /> {selectedAlert.location}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AmbulanceDashboard;
