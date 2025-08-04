import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaExclamationTriangle, FaMapMarkerAlt, FaCheckCircle, FaTimes, FaDirections } from "react-icons/fa";
import ApiService from "../../services/api/apiService";
import MapComponent from "./MapComponent";
import "./AmbulanceNavigation.css";
import DriverLayout from "../layouts/driver/DriverLayout";

const NavigationContent = () => {
  const navigate = useNavigate();
  
  const [alertData, setAlertData] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [routeDistance, setRouteDistance] = useState(null);
  const [isSidebarOpen] = useState(true);
  const [navigationStartTime, setNavigationStartTime] = useState(null);

  // Function to get browser location
  const getBrowserLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log("Browser provided actual coordinates:", coords);
          resolve(coords);
        },
        (error) => {
          let errorMessage;
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Please allow location access to use navigation features";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable in your browser";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out - please try again";
              break;
            default:
              errorMessage = "An unknown error occurred getting your location";
          }
          console.error("Geolocation error:", error.code, errorMessage);
          reject(new Error(errorMessage));
        },
        options
      );
    });
  };

  // Add this function after getBrowserLocation
  const getAreaFromCoordinates = async (lat, lng) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'RapidRescue/1.0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // First try to get the full formatted address
        if (data.display_name) {
          // Clean up the address to make it more readable
          const fullAddress = data.display_name
            .split(',')
            .slice(0, 3) // Take first 3 parts of address for readability
            .join(',')
            .trim();
          
          if (fullAddress) {
            return {
              fullAddress,
              type: 'full'
            };
          }
        }
        
        // If no full address, try to get the sub-area
        const subArea = data.address?.suburb || 
                       data.address?.neighbourhood || 
                       data.address?.residential || 
                       data.address?.quarter || 
                       data.address?.city_district;
        
        if (subArea) {
          return {
            fullAddress: subArea,
            type: 'area'
          };
        }
        
        return {
          fullAddress: "Lahore Area",
          type: 'fallback'
        };
      }
      return {
        fullAddress: "Lahore Area",
        type: 'fallback'
      };
    } catch (error) {
      console.error("Error fetching address:", error);
      return {
        fullAddress: "Lahore Area",
        type: 'fallback'
      };
    }
  };

  // Handle route update from MapComponent
  const handleRouteUpdate = ({ distance }) => {
    setRouteDistance(distance);
  };

  // Handle map errors
  const handleMapError = (error) => {
    console.error("Map error:", error);
  };

  // Handle retry location
  const handleRetryLocation = async () => {
    try {
      setLocationError(null);
      setIsLoadingLocation(true);
      const location = await getBrowserLocation();
      setCurrentLocation(location);
    } catch (error) {
      setLocationError(error.message);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Function to handle starting navigation
  const handleStartNavigation = (googleMapsUrl) => {
    // Only set start time if not already set
    if (!navigationStartTime) {
    const startTime = new Date();
    setNavigationStartTime(startTime);
    
      // Store the start time in localStorage with alert ID to ensure uniqueness
      if (alertData && alertData.id) {
        localStorage.setItem(`navigationStartTime_${alertData.id}`, startTime.toISOString());
        
        // Also update the alert data in localStorage to include start time
        const updatedAlertData = {
          ...alertData,
          navigationStartTime: startTime.toISOString()
        };
        localStorage.setItem('navigationAlertData', JSON.stringify(updatedAlertData));
      }
    }
    
    // Open Google Maps in a new tab
    window.open(googleMapsUrl, '_blank');
  };

  // Update the useEffect that handles location
  useEffect(() => {
    const initializeNavigation = async () => {
      try {
        // First check if there's an active alert from the API
        const activeAlertResponse = await ApiService.getMyActiveAlert();
        let alert = activeAlertResponse;
        
        // If no active alert from API, check localStorage as fallback
        if (!alert) {
        const storedAlert = localStorage.getItem('navigationAlertData') || localStorage.getItem('activeAlert');
        if (storedAlert) {
          try {
            alert = JSON.parse(storedAlert);
          } catch (parseError) {
            console.error("Error parsing stored alert:", parseError);
            }
          }
        }
        
        if (!alert) {
          // No active alert - redirect to dashboard
          navigate("/ambulance-dashboard", { replace: true });
          return;
        }
        
        // Store the full alert data including the address
        setAlertData(alert);
        
        // Get destination coordinates and address
        let coords = null;
        let address = alert.address || alert.location_address || alert.emergency_address;
        
        if (alert.coordinates && alert.coordinates.lat && alert.coordinates.lng) {
          coords = {
            lat: parseFloat(alert.coordinates.lat),
            lng: parseFloat(alert.coordinates.lng),
            address: address
          };
        } 
        else if (alert.coordinates_lat !== undefined && alert.coordinates_lng !== undefined) {
          coords = {
            lat: parseFloat(alert.coordinates_lat),
            lng: parseFloat(alert.coordinates_lng),
            address: address
          };
        }
        
        if (!coords || isNaN(coords.lat) || isNaN(coords.lng)) {
          throw new Error("Invalid coordinates in alert data");
        }
        
        console.log("Emergency destination coordinates:", coords);
        setDestination(coords);

        // Try to get browser location
        try {
          setIsLoadingLocation(true);
          const browserLocation = await getBrowserLocation();
          console.log("Successfully got browser location:", browserLocation);

          // Get location information
          const locationInfo = await getAreaFromCoordinates(browserLocation.lat, browserLocation.lng);
          browserLocation.address = locationInfo.fullAddress;
          browserLocation.addressType = locationInfo.type;
          
          setCurrentLocation(browserLocation);
          setLocationError(null);
        } catch (locationError) {
          console.error("Location error:", locationError);
          setLocationError(locationError.message);
        } finally {
          setIsLoadingLocation(false);
        }
      } catch (error) {
        console.error("Error initializing navigation:", error);
        setLocationError(error.message || "Failed to load alert data");
      }
    };

    initializeNavigation();
  }, [navigate]);

  useEffect(() => {
    const fetchAddress = async (lat, lng) => {
      try {
        setIsFetchingAddress(true);
        const locationInfo = await getAreaFromCoordinates(lat, lng);
        
        if (locationInfo.fullAddress) {
          // Update the alertData and localStorage with the new address
          const updatedAlertData = {
            ...alertData,
            address: locationInfo.fullAddress,
            location_address: locationInfo.fullAddress,
            emergency_address: locationInfo.fullAddress,
            location: locationInfo.fullAddress,
            addressType: locationInfo.type
          };
          setAlertData(updatedAlertData);
          localStorage.setItem("navigationAlertData", JSON.stringify(updatedAlertData));
        }
      } catch (error) {
        console.error("Error fetching address:", error);
      } finally {
        setIsFetchingAddress(false);
      }
    };

    // If we have coordinates but no address, try to fetch it
    if (destination?.coordinates?.lat && destination?.coordinates?.lng && 
        (!destination.address || destination.address === "Address not available")) {
      fetchAddress(destination.coordinates.lat, destination.coordinates.lng);
    }
  }, [destination, alertData]);

  // Handle complete alert
  const handleCompleteAlert = async () => {
    try {
      if (!alertData) {
        console.error('No active alert to complete');
        return;
      }

      // Get the start time specific to this alert
      const startTimeStr = localStorage.getItem(`navigationStartTime_${alertData.id}`) || 
                          (alertData.navigationStartTime ? alertData.navigationStartTime : null);
      
      const startTime = startTimeStr ? new Date(startTimeStr) : null;
      const completedTime = new Date();
      
      // Calculate response time in minutes, ensure it's at least 1 minute
      let responseTimeInMinutes = startTime ? 
        Math.max(1, Math.round((completedTime - startTime) / (1000 * 60))) : 
        1; // Default to 1 minute if no start time found
      
      console.log(`Completing alert ${alertData.id} with response time: ${responseTimeInMinutes} minutes`);
      
      // Call the API to complete the alert
      const response = await ApiService.completeAlert(alertData.id, responseTimeInMinutes);

      if (response) {
        // Clear all navigation related data
        setAlertData(null);
        setNavigationStartTime(null);
        
        // Clear localStorage items specific to this alert
        localStorage.removeItem(`navigationStartTime_${alertData.id}`);
        localStorage.removeItem('navigationAlertData');
        localStorage.removeItem('activeAlert');
        
        // Broadcast alert completion event
        window.dispatchEvent(new CustomEvent('alertCompleted', {
          detail: {
            alertId: alertData.id,
            responseTime: responseTimeInMinutes,
            completedAt: completedTime.toISOString()
          }
        }));
        
        // Navigate back to dashboard
        navigate('/ambulance-dashboard');
      }
    } catch (error) {
      console.error('Error completing alert:', error);
      alert('Failed to complete alert. Please try again.');
    }
  };

  // Handle cancel alert
  const handleCancelAlert = async () => {
    try {
      const driver = JSON.parse(localStorage.getItem('driver') || '{}');
      
      if (driver && driver.id) {
        await ApiService.resetDriverStatus(driver.id);
      }
      
      localStorage.removeItem("navigationAlertData");
      localStorage.removeItem("activeAlert");
      navigate("/ambulance-dashboard", { replace: true });
    } catch (error) {
      console.error("Error cancelling alert:", error);
      alert("Failed to cancel alert. Please try again.");
    }
  };

  // Render alert card
  const renderAlertCard = () => {
    if (!alertData) return null;
    
    // Create Google Maps URL with coordinates
    const googleMapsUrl = currentLocation && destination ? 
      `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving` : 
      null;
    
    return (
      <div className="compact-alert-card">
        <div className="card-header">
          <h3>Emergency Navigation</h3>
        </div>

        {/* Map Section */}
        <div className="map-section">
          <div className="map-preview-container">
            {currentLocation && destination ? (
              <>
                <MapComponent
                  origin={currentLocation}
            destination={destination}
                  showDirections={true}
                  onRouteUpdate={handleRouteUpdate}
                  onError={handleMapError}
                />
                <div className="map-preview-controls">
                  <div className="map-preview-info">
                    <FaMapMarkerAlt />
                    {routeDistance ? (
                      <span>Distance: {routeDistance} km</span>
                    ) : (
                      <span>Calculating route...</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="map-loading-overlay">
                <div className="map-loading-spinner" />
                <div className="map-loading-text">Loading map preview...</div>
              </div>
            )}
          </div>
        </div>

        <div className="location-details">
          {/* Current Location Section */}
          <div className="location-section">
            <h4 className="section-title">
              <FaMapMarkerAlt /> Your Location
            </h4>
            <div className="location-item">
              <div className="location-label">Status:</div>
              <div className="location-value">
                {isLoadingLocation ? (
                  <span className="fetching-address">Updating location...</span>
                ) : locationError ? (
                  <span className="location-error">{locationError}</span>
                ) : (
                  <span className="location-success">Active</span>
                )}
              </div>
            </div>
            <div className="location-item">
              <div className="location-label">Current Position:</div>
              <div className="location-value">
                {currentLocation ? (
                  `${currentLocation.lat.toFixed(6)}°N, ${currentLocation.lng.toFixed(6)}°E`
                ) : (
                  'Acquiring location...'
                )}
              </div>
            </div>
            <div className="location-item">
              <div className="location-label">Address:</div>
              <div className="location-value">
                {isLoadingLocation ? (
                  <span className="fetching-address">Fetching address...</span>
                ) : locationError ? (
                  <div className="location-error-container">
                    <span className="location-error">{locationError}</span>
                    <button 
                      className="retry-location-btn"
                      onClick={handleRetryLocation}
                    >
                      <FaMapMarkerAlt /> Retry
                    </button>
                  </div>
                ) : (
                  currentLocation?.address || 'Address not available'
                )}
              </div>
            </div>
          </div>
          
          {/* Emergency Location Section */}
          <div className="location-section">
            <h4 className="section-title">
              <FaExclamationTriangle /> Emergency Location
            </h4>
              <div className="location-item">
              <div className="location-label">Coordinates:</div>
              <div className="location-value">
                {destination ? (
                  `${destination.lat.toFixed(6)}°N, ${destination.lng.toFixed(6)}°E`
                ) : (
                  'Loading...'
                )}
              </div>
                </div>
            <div className="location-item">
              <div className="location-label">Emergency Address:</div>
                <div className="location-value">
                {isFetchingAddress ? (
                  <span className="fetching-address">Fetching address...</span>
                ) : (
                  destination?.address || alertData.location || 'Address not available'
                )}
              </div>
              </div>
            </div>
          </div>
          
        {/* Action Buttons */}
        <div className="card-actions">
          <div className="action-buttons-container">
            {googleMapsUrl && (
              <button 
                className="start-navigation-btn"
                onClick={() => handleStartNavigation(googleMapsUrl)}
                disabled={navigationStartTime !== null}
              >
                <FaDirections /> {navigationStartTime ? 'Navigation Started' : 'Start Navigation'}
              </button>
            )}
            <button 
              className="cancel-btn" 
              onClick={handleCancelAlert}
            >
              <FaTimes /> Cancel Response
            </button>
            <button 
              className="complete-btn" 
              onClick={handleCompleteAlert}
              disabled={!navigationStartTime}
            >
              <FaCheckCircle /> Complete Response
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`navigation-container ${isSidebarOpen ? '' : 'sidebar-closed'}`}>
      {renderAlertCard()}
    </div>
  );
};

NavigationContent.propTypes = {
  testData: PropTypes.shape({
    id: PropTypes.string,
    coordinates: PropTypes.shape({
      lat: PropTypes.number,
      lng: PropTypes.number
    })
  })
};

const AmbulanceNavigation = ({ testData }) => {
  return (
    <DriverLayout>
      <NavigationContent testData={testData} />
    </DriverLayout>
  );
};

AmbulanceNavigation.propTypes = {
  testData: PropTypes.shape({
    id: PropTypes.string,
    coordinates: PropTypes.shape({
      lat: PropTypes.number,
      lng: PropTypes.number
    })
  })
};

export default AmbulanceNavigation; 