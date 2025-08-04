import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../services/auth/authContext";
import AdminLayout from "../layouts/admin/AdminLayout";
import { alertService } from "../../services/api/alertService";
import "./AdminDashboard.css";
import "./AlertCardStyles.css";
import "./ColorFixes.css";
import { 
  FaTimes, 
  FaMapMarkedAlt, 
  FaInfoCircle, 
  FaUserAlt, 
  FaAmbulance, 
  FaBell, 
  FaMapMarkerAlt,
  FaSpinner,
  FaSyncAlt,
  FaFilter,
  FaExclamationCircle,
  FaSearch as FaSearchIcon,
  FaRoute,
  FaVideo,
  FaExclamationTriangle,
  FaDownload
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';

// Create a cache object outside the component to persist across renders
const alertsCache = {
  data: [],
  timestamp: null,
  expiryTime: 30000 // 30 seconds cache validity
};

const AdminDashboardContent = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [isFiltering, setIsFiltering] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [alertToDelete, setAlertToDelete] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Popup states
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const [showMapPopup, setShowMapPopup] = useState(false);
  const [showAccidentPopup, setShowAccidentPopup] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Status counts for summary cards
  const [statusCounts, setStatusCounts] = useState({
    total: 0,
    pending: 0,
    assigned: 0,
    complete: 0,
    rejected: 0
  });

  // Track recently updated alerts for visual feedback
  const [recentlyUpdated, setRecentlyUpdated] = useState([]);
  const [previousAlerts, setPreviousAlerts] = useState([]);

  const navigate = useNavigate();

  const notificationSound = useRef(new Audio('/notification.mp3'));
  const previousAlertsRef = useRef([]);

  // Load notification settings
  const [notificationSettings, setNotificationSettings] = useState(() => {
    const savedNotifications = localStorage.getItem("adminNotifications");
    return savedNotifications ? JSON.parse(savedNotifications) : {
      alertSound: true,
      vibration: true
    };
  });

  // Function to play notification sound and vibrate
  const playNotifications = useCallback(() => {
    try {
      // Check notification settings
      const settings = JSON.parse(localStorage.getItem("adminNotifications")) || {
        alertSound: true,
        vibration: true
      };

      // Play sound if enabled and user has interacted with the page
      if (settings.alertSound && document.hasFocus()) {
        const audio = notificationSound.current;
        // Reset the audio to the beginning
        audio.currentTime = 0;
        // Try to play with user interaction check
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
          console.error("Error playing notification sound:", err);
            // If autoplay is blocked, show a toast notification
            if (err.name === 'NotAllowedError') {
              toast.error('Please interact with the page to enable sound notifications');
            }
        });
        }
      }

      // Vibrate if enabled and supported
      if (settings.vibration && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (error) {
      console.error("Error playing notifications:", error);
    }
  }, []);

  // Add effect to handle new alerts
  useEffect(() => {
    // Check for new alerts
    const newAlerts = alerts.filter(alert => 
      !previousAlertsRef.current.find(prevAlert => prevAlert.id === alert.id)
    );

    // Play notification if there are new alerts
    if (newAlerts.length > 0) {
      playNotifications();
    }

    // Update reference
    previousAlertsRef.current = alerts;
  }, [alerts, playNotifications]);

  // Memoized fetch alerts function to prevent unnecessary re-creations
  const fetchAlerts = useCallback(async (forceRefresh = false) => {
    try {
      // Check if we have valid cached data and not forcing refresh
      const now = Date.now();
      if (!forceRefresh && 
          alertsCache.data.length > 0 && 
          alertsCache.timestamp && 
          (now - alertsCache.timestamp < alertsCache.expiryTime)) {
        console.log("Using cached alerts data");
        setAlerts(alertsCache.data);
        setLoading(false);
        return;
      }

      setLoading(true);
      const data = await alertService.getAllAlerts();
      
      // Update cache
      alertsCache.data = data;
      alertsCache.timestamp = now;
        
      // Check for status changes compared to previous data
      if (previousAlerts.length > 0) {
        const updatedAlertIds = data.filter(alert => {
          const prevAlert = previousAlerts.find(prev => prev.id === alert.id);
          return prevAlert && prevAlert.status !== alert.status;
        }).map(alert => alert.id);
          
        if (updatedAlertIds.length > 0) {
          // Add newly changed alerts to the recently updated list
          setRecentlyUpdated(updatedAlertIds);
          // Clear the highlight after 5 seconds
          setTimeout(() => {
            setRecentlyUpdated([]);
          }, 5000);
        }
      }
        
      setPreviousAlerts(data);
      setAlerts(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch alerts. Please try again later.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [previousAlerts]);

  // Fetch alerts from backend
  useEffect(() => {
    // Only fetch data if the user is authenticated
    if (isAuthenticated) {
      // Initial fetch with potential cache usage
    fetchAlerts();

      // Set up polling to refresh alerts every 10 seconds (reduced from 5s)
      // This reduces server load while still keeping data reasonably fresh
      const pollInterval = setInterval(() => fetchAlerts(), 10000);
    
    // Listen for alert status changes from AmbulanceDashboard
    const handleAlertStatusChange = () => {
      console.log("Alert status change detected, refreshing alerts");
        fetchAlerts(true); // Force refresh on status change event
    };
    
    window.addEventListener('alertStatusChanged', handleAlertStatusChange);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('alertStatusChanged', handleAlertStatusChange);
    };
    }
  }, [fetchAlerts, refreshKey, isAuthenticated]);

  // Filter and sort alerts - optimized with debounced filtering
  useEffect(() => {
    // Skip filtering if there are no alerts
    if (alerts.length === 0) {
      setFilteredAlerts([]);
      setIsFiltering(false);
      return;
    }

    // Debounce the filtering operation to avoid excessive calculations
    const filterTimer = setTimeout(() => {
    let result = [...alerts];
    let filtering = false;

      // Apply search filter
    if (searchQuery) {
      filtering = true;
        const query = searchQuery.toLowerCase();
      result = result.filter(
        (alert) =>
            (alert.id && alert.id.toString().toLowerCase().includes(query)) ||
            (alert.location && alert.location.toLowerCase().includes(query)) ||
            (alert.driver_name && alert.driver_name.toLowerCase().includes(query))
      );
    }

      // Apply status filter
    if (statusFilter !== "all") {
      filtering = true;
      result = result.filter(
          (alert) => {
            const alertStatus = (alert.status || 'pending').toLowerCase();
            return alertStatus === statusFilter.toLowerCase() ||
              (statusFilter === "complete" && alertStatus === "completed") ||
              (statusFilter === "completed" && alertStatus === "complete") ||
              (statusFilter === "rejected" && (alertStatus === "rejected" || alertStatus === "REJECTED"));
          }
        );
      }

      // Apply sorting
    result.sort((a, b) => {
        const dateA = new Date(a.time_reported || a.created_at);
        const dateB = new Date(b.time_reported || b.created_at);
        
        if (sortBy === "newest") {
          return dateB - dateA;
        } else if (sortBy === "oldest") {
          return dateA - dateB;
        } else if (sortBy === "location") {
          return (a.location || "").localeCompare(b.location || "");
        }
        return 0;
    });

    setIsFiltering(filtering);
    setFilteredAlerts(result);
    }, 300); // 300ms debounce

    return () => clearTimeout(filterTimer);
  }, [searchQuery, statusFilter, sortBy, alerts]);

  // Calculate status counts - optimized to run only when alerts change
  useEffect(() => {
    if (alerts.length > 0) {
      const counts = {
        total: alerts.length,
        pending: alerts.filter(alert => alert.status?.toLowerCase() === "pending").length,
        assigned: alerts.filter(alert => alert.status?.toLowerCase() === "assigned").length,
        complete: alerts.filter(alert => alert.status?.toLowerCase() === "complete" || alert.status?.toLowerCase() === "completed").length,
        rejected: alerts.filter(alert => alert.status?.toLowerCase() === "rejected").length
      };
      setStatusCounts(counts);
    }
  }, [alerts]);

  const getStatusLabel = (status) => {
    const statusMap = {
      'pending': 'Pending',
      'assigned': 'Assigned',
      'complete': 'Completed',
      'completed': 'Completed',
      'rejected': 'Rejected',
      'REJECTED': 'Rejected'
    };
    return statusMap[status?.toLowerCase()] || status;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSortBy("newest");
  };

  const handleViewDetails = (alert) => {
    setSelectedAlert(alert);
    setShowDetailsPopup(true);
    setShowMapPopup(false);
    setShowAccidentPopup(false);
  };

  // Function to fetch previous alerts at the same location
  const fetchPreviousAlerts = async (location) => {
    try {
      if (!selectedAlert) {
        console.log('No alert selected');
        return;
      }
      const allAlerts = await alertService.getAllAlerts();
      const previousAlertsAtLocation = allAlerts.filter(alert => 
        alert.location === location && alert.id !== selectedAlert.id
      );
      setPreviousAlerts(previousAlertsAtLocation);
    } catch (error) {
      console.error('Error fetching previous alerts:', error);
    }
  };

  const handleMapView = (alert) => {
    setSelectedAlert(alert);
    setShowMapPopup(true);
    setShowDetailsPopup(false);
    setShowAccidentPopup(false);
    fetchPreviousAlerts(alert.location);
  };
  
  const handleAccidentView = (alert) => {
    setSelectedAlert(alert);
    setShowAccidentPopup(true);
    setShowDetailsPopup(false);
    setShowMapPopup(false);
  };

  const closeAllPopups = () => {
    setShowDetailsPopup(false);
    setShowMapPopup(false);
    setShowAccidentPopup(false);
    setSelectedAlert(null);
  };

  const filterAlertsByStatus = (status) => {
    setStatusFilter(status);
  };

  const handleManualRefresh = async () => {
    // Force a refresh of alerts
    setRefreshing(true);
    try {
      await fetchAlerts(true);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error refreshing alerts:', error);
      setError('Failed to refresh alerts. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate pagination
  const indexOfLastAlert = currentPage * itemsPerPage;
  const indexOfFirstAlert = indexOfLastAlert - itemsPerPage;
  
  // First sort the alerts
  const sortedAlerts = [...alerts].sort((a, b) => {
    // Get dates, using time_reported or falling back to created_at
    const dateA = new Date(a.time_reported || a.created_at || 0).getTime();
    const dateB = new Date(b.time_reported || b.created_at || 0).getTime();
    
    if (sortBy === "newest") {
      return dateB - dateA;
    } else if (sortBy === "oldest") {
      return dateA - dateB;
    }
    return 0;
  });

  // Then filter the sorted alerts
  const paginatedAlerts = sortedAlerts.filter(alert => {
    const matchesSearch = !searchQuery || 
      (alert.location?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (alert.id?.toString() || '').includes(searchQuery) ||
      (alert.alert_id?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    const alertStatus = (alert.status || 'pending').toLowerCase();
    const matchesStatus = statusFilter === "all" || 
      alertStatus === statusFilter.toLowerCase() ||
      (statusFilter === "complete" && (alertStatus === "completed" || alertStatus === "complete")) ||
      (statusFilter === "rejected" && (alertStatus === "rejected" || alertStatus === "REJECTED"));
    
    return matchesSearch && matchesStatus;
  });

  const currentAlerts = paginatedAlerts.slice(indexOfFirstAlert, indexOfLastAlert);
  const totalPages = Math.ceil(paginatedAlerts.length / itemsPerPage);

  // Calculate pagination range
  const maxPagesToShow = 5;
  const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

  return (
      <div className="admin-pagination">
        <button
          className="admin-pagination-btn"
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          <i className="fas fa-chevron-left"></i>
          Previous
        </button>

        <div className="admin-pagination-numbers">
          {startPage > 1 && (
            <>
              <button
                className="admin-pagination-number"
                onClick={() => setCurrentPage(1)}
              >
                1
              </button>
              {startPage > 2 && <span className="admin-pagination-ellipsis">...</span>}
            </>
          )}

          {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(number => (
            <button
              key={number}
              className={`admin-pagination-number ${currentPage === number ? 'active' : ''}`}
              onClick={() => setCurrentPage(number)}
            >
              {number}
                  </button>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="admin-pagination-ellipsis">...</span>}
              <button
                className="admin-pagination-number"
                onClick={() => setCurrentPage(totalPages)}
              >
                {totalPages}
              </button>
            </>
          )}
                </div>
                
                  <button 
          className="admin-pagination-btn"
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          Next
          <i className="fas fa-chevron-right"></i>
                  </button>
            </div>
    );
  };

  // Main alert list rendering
  const renderAlerts = () => {
    if (loading) {
      return (
        <div className="admin-loading" role="status">
                    <FaSpinner className="admin-spinner" />
                    <p>Loading alerts...</p>
                  </div>
      );
    }

    if (error) {
      return (
        <div className="admin-error" role="alert">
          <FaExclamationCircle />
                    <p>{error}</p>
                    <button onClick={handleManualRefresh}>
            <FaSyncAlt /> Retry
                    </button>
                  </div>
      );
    }

    if (currentAlerts.length === 0) {
      return (
        <div className="admin-no-alerts" role="status">
          <FaBell />
          <p>No alerts found</p>
          {(searchQuery || statusFilter !== 'all') && (
            <button onClick={clearFilters}>
              <FaFilter />
              Clear Filters
            </button>
          )}
        </div>
      );
    }

    return currentAlerts.map(alert => {
      // Create a date object and adjust for timezone
      const date = new Date(alert.time_reported || alert.created_at || new Date());
      // Add 5 hours to match Pakistan timezone (UTC+5)
      date.setHours(date.getHours() + 5);
      
      const formattedDate = date.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).toLowerCase();

      const alertStatus = (alert.status || 'pending').toLowerCase();

      return (
                        <div 
                          key={alert.id} 
          className={`admin-alert-card ${alertStatus}`}
          tabIndex="0"
          role="article"
          aria-label={`Alert ${alert.id} - ${getStatusLabel(alertStatus)}`}
                        >
          <div className="admin-alert-left">
                            <div className="admin-alert-header">
                                <div className="admin-alert-id">
                <FaBell />
                <span className="admin-alert-id-formatted">{alert.alert_id}</span>
                <span className="admin-alert-id-numeric">#{alert.id}</span>
                                </div>
              <div className={`admin-status-badge ${alertStatus}`}>
                {getStatusLabel(alertStatus)}
                                </div>
                              </div>
            <div className="admin-driver-info">
              <FaUserAlt />
              <span>{alert.driver_name || "No driver responded yet"}</span>
              {alertStatus === 'complete' && alert.response_time_formatted && (
                <div className="admin-response-time">
                  Response Time: {alert.response_time_formatted}
                </div>
              )}
            </div>
                            </div>
                            
          <div className="admin-alert-right">
            <div className="admin-location-info">
              <div className="admin-location">
                <FaMapMarkerAlt />
                <span>{alert.location}</span>
                                </div>
              <div className="admin-timestamp">
                Reported: {formattedDate}
                              </div>
                            </div>
                            
            <div className="admin-action-buttons">
              <button 
                className="admin-action-btn details"
                onClick={() => handleViewDetails(alert)}
                aria-label="View alert details"
                data-tooltip="View Details"
              >
                <FaInfoCircle />
              </button>
              <button 
                className="admin-action-btn map"
                onClick={() => handleMapView(alert)}
                aria-label="View location on map"
                data-tooltip="View Map"
              >
                <FaMapMarkerAlt />
              </button>
              <button 
                className="admin-action-btn accident"
                onClick={() => handleAccidentView(alert)}
                aria-label="View accident details"
                data-tooltip="View Accident"
              >
                <FaAmbulance />
              </button>
            </div>
          </div>
        </div>
      );
    });
  };

  // Popup for alert details
  const renderAlertDetailsPopup = () => (
    showDetailsPopup && selectedAlert && (
      <div className="admin-popup-overlay" onClick={closeAllPopups}>
        <div className="admin-popup-content" onClick={e => e.stopPropagation()}>
          <div className="admin-popup-header">
            <h3>Alert Details</h3>
            <button className="admin-close-btn" onClick={closeAllPopups}>
              <FaTimes />
            </button>
            </div>

          <div className="admin-popup-body">
            <div className="admin-alert-detail-item">
              <span className="admin-detail-label">Alert ID</span>
              <span className="admin-detail-value">{selectedAlert.alert_id || `#${selectedAlert.id}`}</span>
              </div>
              
            <div className="admin-alert-detail-item">
              <span className="admin-detail-label">Status</span>
              <span className={`admin-status-value ${(selectedAlert.status || 'pending').toLowerCase()}`}>
                {getStatusLabel(selectedAlert.status || 'pending')}
              </span>
                  </div>
            
            <div className="admin-alert-detail-item">
              <span className="admin-detail-label">Time Reported</span>
              <span className="admin-detail-value">
                {(() => {
                  const date = new Date(selectedAlert.time_reported || selectedAlert.created_at || new Date());
                  date.setHours(date.getHours() + 5);
                  return date.toLocaleString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  }).toLowerCase();
                })()}
              </span>
                  </div>
            
            <div className="admin-alert-detail-item">
              <span className="admin-detail-label">Location</span>
              <span className="admin-detail-value">{selectedAlert.location}</span>
                </div>
                
              <div className="admin-alert-detail-item">
                <span className="admin-detail-label">Driver</span>
              <span className="admin-detail-value">{selectedAlert.driver_name || "No driver assigned"}</span>
                  </div>
            
            {selectedAlert.driver_contact && (
              <div className="admin-alert-detail-item">
                <span className="admin-detail-label">Driver Contact</span>
                <span className="admin-detail-value">{selectedAlert.driver_contact}</span>
                  </div>
            )}
            
            {selectedAlert.status === 'complete' && selectedAlert.response_time_formatted && (
              <div className="admin-alert-detail-item">
                <span className="admin-detail-label">Response Time</span>
                <span className="admin-detail-value">{selectedAlert.response_time_formatted}</span>
                </div>
            )}

            {selectedAlert.status === 'complete' && selectedAlert.completion_time && (
              <div className="admin-alert-detail-item">
                <span className="admin-detail-label">Completed At</span>
                <span className="admin-detail-value">
                  {(() => {
                    const date = new Date(selectedAlert.completion_time);
                    date.setHours(date.getHours() + 5);
                    return date.toLocaleString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    }).toLowerCase();
                  })()}
                </span>
              </div>
            )}
                  </div>
                  </div>
                </div>
    )
  );

  // Popup for map view
  const renderMapPopup = () => {
    return showMapPopup && selectedAlert && (
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
                    <span className="map-view-alert-id">{selectedAlert.alert_id || `#${selectedAlert.id}`}</span>
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
                      <p>Click "Get Directions" to plan your route to this location.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Popup for accident view
  const renderAccidentPopup = () => {
    const [videoError, setVideoError] = useState(false);
    const [isVideoLoading, setIsVideoLoading] = useState(true);
    const [errorDetails, setErrorDetails] = useState('');
    
    // Get the video URL and ensure it's properly formatted
    const getVideoUrl = () => {
      const url = selectedAlert?.accident_clip_url || selectedAlert?.video_url || selectedAlert?.accident_clip;
      if (!url) return null;
      
      try {
        // If it's already a full URL, return as is
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }
        
        // If it's a relative path, construct the full URL
        const baseUrl = window.location.hostname === 'localhost' 
          ? `${window.location.protocol}//${window.location.host}`
          : `https://${window.location.host}`;
        
        const relativePath = url.startsWith('/') ? url.substring(1) : url;
        return `${baseUrl}/${relativePath}`;
      } catch (error) {
        console.error('Error formatting video URL:', error);
        return url;
      }
    };

    const videoUrl = getVideoUrl();

    const handleVideoError = (error) => {
      console.error('Video playback error:', error);
      setVideoError(true);
      setErrorDetails(error?.message || 'Unknown error occurred');
      setIsVideoLoading(false);
    };

    const handleVideoReady = () => {
      setIsVideoLoading(false);
      setVideoError(false);
    };

    const handleRetryPlayback = () => {
      setVideoError(false);
      setIsVideoLoading(true);
      setErrorDetails('');
    };

    return showAccidentPopup && selectedAlert && (
      <div className="admin-popup-overlay admin-video-popup" onClick={closeAllPopups}>
        <div className="admin-popup-content" onClick={e => e.stopPropagation()}>
          <div className="admin-popup-header">
            <h3>Accident Report</h3>
            <button className="admin-close-btn" onClick={closeAllPopups}>
              <FaTimes />
            </button>
          </div>
          
          <div className="admin-video-container">
            {videoUrl ? (
              <div className="admin-video-wrapper">
                {!videoError ? (
                  <>
                    {isVideoLoading && (
                      <div className="admin-video-loading">
                        <FaSpinner className="admin-spinner" />
                        <p>Loading video...</p>
                      </div>
                    )}
                    <div className="admin-video-player">
              <video 
                        src={videoUrl}
                controls
                        playsInline
                        style={{ width: '100%', height: 'auto', backgroundColor: '#000' }}
                        onError={handleVideoError}
                        onLoadedData={handleVideoReady}
              >
                        <source src={videoUrl} type="video/mp4" />
                        <source src={videoUrl} type="video/webm" />
                Your browser does not support the video tag.
              </video>
                    </div>
                  </>
                ) : (
                  <div className="admin-video-error">
                    <div className="admin-video-error-icon">
                      <FaExclamationTriangle style={{ fontSize: '48px', color: '#ef4444' }} />
                    </div>
                    <p>Unable to play video. Please try one of these options:</p>
                    {errorDetails && (
                      <p className="admin-video-error-details">Error: {errorDetails}</p>
                    )}
                    <div className="admin-video-actions">
                      <a 
                        href={videoUrl}
                        className="admin-video-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FaVideo /> Open in New Tab
                      </a>
                      <a 
                        href={videoUrl}
                        download
                        className="admin-download-link"
                      >
                        <FaDownload /> Download Video
                      </a>
                      <button 
                        className="admin-retry-link"
                        onClick={handleRetryPlayback}
                      >
                        <FaSyncAlt /> Retry Playback
                      </button>
                    </div>
                  </div>
                )}
                <div className="admin-video-info">
                  <p>Having trouble viewing the video?</p>
                  <div className="admin-video-alternatives">
                    <a 
                      href={videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-video-alt-link"
                    >
                      Open in New Tab
                    </a>
                    <span className="admin-video-alt-separator">|</span>
                    <a 
                      href={videoUrl}
                      download
                      className="admin-video-alt-link"
                    >
                      Download Video
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="admin-video-placeholder">
                <FaVideo className="admin-video-placeholder-icon" />
                <p>No video available for this alert</p>
                <p>Alert #{selectedAlert.id}</p>
              </div>
            )}
          </div>
        </div>
      </div>
  );
  };

  // Add delete confirmation modal
  const renderDeleteConfirmation = () => (
    showDeleteConfirmation && alertToDelete && (
      <div className="admin-popup-overlay" onClick={() => setShowDeleteConfirmation(false)}>
        <div className="admin-popup-content" onClick={e => e.stopPropagation()}>
          <div className="admin-popup-header">
            <h3>Confirm Delete</h3>
            <button 
              className="admin-close-btn"
              onClick={() => setShowDeleteConfirmation(false)}
              aria-label="Close delete confirmation"
            >
              <FaTimes />
            </button>
          </div>
          <div className="admin-popup-body">
            <p>Are you sure you want to delete Alert #{alertToDelete.id}?</p>
            <p className="admin-delete-warning">This action cannot be undone.</p>
          </div>
          <div className="admin-popup-footer">
            <button 
              className="admin-btn admin-btn-secondary"
              onClick={() => setShowDeleteConfirmation(false)}
            >
              Cancel
            </button>
            <button 
              className="admin-btn admin-btn-danger"
              onClick={confirmDelete}
              disabled={loading}
            >
              {loading ? (
                <>
                  <FaSpinner className="fa-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <FaTrashAlt />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  );

  return (
    <div className="admin-dashboard">
      <div className="admin-content-wrapper">
        <div className="admin-header">
          <h1>
            <FaExclamationCircle />
            Alert Manager
          </h1>
        </div>

        <div className="admin-controls-container">
          <div className="admin-search-bar">
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by location or alert ID (e.g. 92 or A250419...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search alerts"
            />
            {searchQuery && (
              <button 
                className="admin-clear-search-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className="admin-filter-controls">
            <div className="admin-filter-group">
              <select 
                className="admin-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="complete">Completed</option>
                <option value="rejected">Rejected</option>
              </select>

              <select 
                className="admin-sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort alerts"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            <button 
              className={`admin-refresh-btn ${refreshing ? 'loading' : ''}`}
              onClick={handleManualRefresh}
              disabled={refreshing}
              aria-label="Refresh alerts"
            >
              <FaSyncAlt className={refreshing ? 'spinning' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="admin-alerts-grid">
          {renderAlerts()}
        </div>

        {renderPagination()}
      </div>

      {renderAlertDetailsPopup()}
      {renderMapPopup()}
      {renderAccidentPopup()}
      {renderDeleteConfirmation()}
    </div>
  );
};

const AdminDashboard = () => {
  return (
    <AdminLayout title="Alert Manager">
      <div className="admin-dashboard">
      <AdminDashboardContent />
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;