import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  FaAmbulance, 
  FaMapMarkerAlt, 
  FaCheckCircle, 
  FaTimesCircle,
  FaRoute,
  FaClock,
  FaUserInjured,
  FaPhoneAlt,
  FaMedkit,
  FaExclamationTriangle,
  FaArrowRight,
  FaExternalLinkAlt,
  FaBell
} from "react-icons/fa";
import AmbulanceSidebar from "../AmbulanceDashboardLayout/AmbulanceSidebar";
import MockApiService from "../../services/mockApi/mockApiService";
import "./AmbulanceNavigation.css";

const AmbulanceNavigation = ({ testData }) => {
  console.log("AmbulanceNavigation component rendering");
  console.log("Test data prop:", testData);
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Log location state for debugging
  console.log("Location state:", location.state);
  
  const [alertData, setAlertData] = useState(null);
  const [destination, setDestination] = useState({ lat: 31.4697, lng: 74.2728 });
  const [isLoading, setIsLoading] = useState(true);
  const [estimatedTime, setEstimatedTime] = useState("15-20 min");
  const [estimatedDistance, setEstimatedDistance] = useState("5.2 km");
  const [navigationStarted, setNavigationStarted] = useState(false);
  const [navigationStatus, setNavigationStatus] = useState("Preparing");
  const [showPatientInfo, setShowPatientInfo] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [currentLocation, setCurrentLocation] = useState({ lat: 31.4818, lng: 74.3162 });

  // Get alert data from navigation state or props
  useEffect(() => {
    console.log("useEffect for alert data triggered");
    
    // First priority: Use testData prop if available
    if (testData) {
      console.log("Using provided test data prop:", testData);
      setAlertData(testData);
      
      if (testData.coordinates) {
        console.log("Setting coordinates from test data:", testData.coordinates);
        setDestination(testData.coordinates);
      }
      
      setIsLoading(false);
    }
    // Second priority: Use location state if available 
    else if (location.state && location.state.alertData) {
      console.log("Using provided alert data from location:", location.state.alertData);
      setAlertData(location.state.alertData);
      
      // Set destination from alert data
      if (location.state.alertData.coordinates) {
        console.log("Setting coordinates from alert data:", location.state.alertData.coordinates);
        setDestination(location.state.alertData.coordinates);
      }
      
      setIsLoading(false);
    } 
    // Check localStorage for active alert
    else {
      const activeAlert = localStorage.getItem("activeAlert");
      if (activeAlert) {
        const parsedAlert = JSON.parse(activeAlert);
        console.log("Using active alert from localStorage:", parsedAlert);
        setAlertData(parsedAlert);
        if (parsedAlert.coordinates) {
          setDestination(parsedAlert.coordinates);
        }
        setIsLoading(false);
      } else {
        // No active alert found
        console.log("No active alert found");
        setIsLoading(false);
      }
    }

    // Simulate speed changes for demonstration
    const speedInterval = setInterval(() => {
      setCurrentSpeed(Math.floor(Math.random() * 30) + 40);
    }, 3000);

    console.log("Setup complete, current state: ", {
      isLoading,
      alertData: alertData ? "Set" : "Not set",
      destination
    });

    return () => {
      console.log("Navigation component unmounting, cleaning up intervals");
      clearInterval(speedInterval);
    };
  }, [location, navigate, testData]);

  // Get current location using Geolocation API
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting current location:", error);
        }
      );
    }
  }, []);

  // Create Google Maps URL for directions
  const createGoogleMapsUrl = () => {
    const origin = `${currentLocation.lat},${currentLocation.lng}`;
    const dest = `${destination.lat},${destination.lng}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`;
  };

  // Handle open in Google Maps
  const openInGoogleMaps = () => {
    const url = createGoogleMapsUrl();
    window.open(url, '_blank');
    setNavigationStarted(true);
    setNavigationStatus("En Route");
  };

  // Handle complete alert
  const handleCompleteAlert = async () => {
    if (alertData && alertData.id) {
      try {
        setNavigationStatus("Completed");
        await MockApiService.updateAlertStatus(alertData.id, "Completed");
        localStorage.removeItem("activeAlert"); // Clear active alert
        navigate("/ambulance-dashboard");
      } catch (error) {
        console.error("Error completing alert:", error);
      }
    }
  };

  // Handle cancel alert
  const handleCancelAlert = async () => {
    if (alertData && alertData.id) {
      try {
        setNavigationStatus("Cancelled");
        await MockApiService.updateAlertStatus(alertData.id, "Cancelled");
        localStorage.removeItem("activeAlert"); // Clear active alert
        navigate("/ambulance-dashboard");
      } catch (error) {
        console.error("Error cancelling alert:", error);
      }
    }
  };

  // Toggle patient information
  const togglePatientInfo = () => {
    setShowPatientInfo(!showPatientInfo);
  };

  // Toggle emergency mode
  const toggleEmergencyMode = () => {
    setEmergencyMode(!emergencyMode);
  };

  // Start navigation
  const startNavigation = () => {
    // Open Google Maps with both locations
    const url = createGoogleMapsUrl();
    window.open(url, '_blank');
    
    // Update state
    setNavigationStarted(true);
    setNavigationStatus("En Route");
  };

  return (
    <div className="ambulance-dashboard">
      <AmbulanceSidebar />
      <div className="navigation-container">
        <div className="navigation-header">
          <h2 className="page-title">
            <FaAmbulance className="header-icon" /> 
            Emergency Response
          </h2>
          <div className="navigation-status">
            <span className={`status-badge ${navigationStatus.toLowerCase()}`}>
              {navigationStatus}
            </span>
            {navigationStarted && (
              <div className="speedometer">
                <span className={currentSpeed > 60 ? "speed-high" : "speed-normal"}>
                  Directions in Google Maps
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="navigation-content">
          {isLoading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading navigation...</p>
            </div>
          ) : !alertData ? (
            <div className="no-alert-container">
              <div className="no-alert-icon">
                <FaBell size={60} />
              </div>
              <h3>No Active Alerts</h3>
              <p>There are currently no active alerts to navigate to.</p>
              <button 
                className="back-to-dashboard-btn"
                onClick={() => navigate("/ambulance-dashboard")}
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            <>
              {/* Alert Info Card */}
              <div className="nav-alert-card">
                <div className="nav-alert-card-header">
                  <div className="nav-alert-number">
                    <span className="nav-alert-badge">Alert {alertData.id}</span>
                  </div>
                  <div className="nav-alert-distance">
                    <FaClock className="icon-small" /> ETA: {estimatedTime || "Calculating..."}
                  </div>
                </div>
                
                <div className="nav-alert-card-body">
                  <div className="location-details">
                    <div className="from-location">
                      <div className="location-dot start-dot"></div>
                      <div>
                        <p>Current Location</p>
                        <small>{`${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`}</small>
                      </div>
                    </div>
                    <div className="location-connector"></div>
                    <div className="to-location">
                      <div className="location-dot end-dot"></div>
                      <div>
                        <p>Accident Location</p>
                        <small>{alertData.location}</small>
                        <small>{`${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`}</small>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="nav-alert-card-footer">
                  {!navigationStarted ? (
                    <button 
                      className="start-navigation-btn full-width"
                      onClick={startNavigation}
                    >
                      <FaRoute className="icon-left" /> START NAVIGATION
                    </button>
                  ) : (
                    <div className="completion-buttons">
                      <button 
                        className="complete-btn"
                        onClick={handleCompleteAlert}
                      >
                        <FaCheckCircle className="icon-left" /> Complete
                      </button>
                      <button 
                        className="cancel-btn"
                        onClick={handleCancelAlert}
                      >
                        <FaTimesCircle className="icon-left" /> Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AmbulanceNavigation; 