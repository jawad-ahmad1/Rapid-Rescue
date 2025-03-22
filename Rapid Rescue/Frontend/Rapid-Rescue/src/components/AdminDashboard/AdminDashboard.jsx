import { useState, useEffect } from "react";
import DashboardLayout from "../Layout/DashboardLayout";
import { alertService } from "../../services/api/alertService";
import "./AdminDashboard.css";
import "./AlertCardStyles.css";
import "./ColorFixes.css";
import { 
  FaSearch, 
  FaTimes, 
  FaMapMarkedAlt, 
  FaInfoCircle, 
  FaUserAlt, 
  FaAmbulance, 
  FaBell, 
  FaHourglass, 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaClock,
  FaCalendarAlt,
  FaVideo,
  FaSpinner
} from 'react-icons/fa';

const AdminDashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [isFiltering, setIsFiltering] = useState(false);
  
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
    complete: 0
  });

  // Fetch alerts from backend
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const data = await alertService.getAllAlerts();
        setAlerts(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch alerts. Please try again later.');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    // Set up polling to refresh alerts every 30 seconds
    const pollInterval = setInterval(fetchAlerts, 30000);

    return () => clearInterval(pollInterval);
  }, []);

  // Filter and sort alerts
  useEffect(() => {
    let result = [...alerts];
    let filtering = false;

    if (searchQuery) {
      filtering = true;
      result = result.filter(
        (alert) =>
          alert.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          alert.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (alert.driver && alert.driver.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (alert.driverName && alert.driverName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (statusFilter !== "all") {
      filtering = true;
      result = result.filter(
        (alert) => alert.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    result.sort((a, b) => {
      return sortBy === "newest"
        ? new Date(b.time) - new Date(a.time)
        : new Date(a.time) - new Date(b.time);
    });

    setIsFiltering(filtering);
    setFilteredAlerts(result);
  }, [searchQuery, statusFilter, sortBy, alerts]);

  // Calculate status counts
  useEffect(() => {
    if (alerts.length > 0) {
      const counts = {
        total: alerts.length,
        pending: alerts.filter(alert => alert.status === "pending").length,
        assigned: alerts.filter(alert => alert.status === "assigned").length,
        complete: alerts.filter(alert => alert.status === "complete").length
      };
      setStatusCounts(counts);
    }
  }, [alerts]);

  // Get status label text
  const getStatusLabel = (status) => {
    switch(status) {
      case 'pending': return 'Waiting';
      case 'assigned': return 'Assigned';
      case 'complete': return 'Completed';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setIsFiltering(false);
  };

  const handleViewDetails = (alert) => {
    setSelectedAlert(alert);
    setShowDetailsPopup(true);
  };

  const handleMapView = (alert) => {
    setSelectedAlert(alert);
    setShowMapPopup(true);
  };
  
  const handleAccidentView = (alert) => {
    setSelectedAlert(alert);
    setShowAccidentPopup(true);
  };

  const closeAllPopups = () => {
    setShowDetailsPopup(false);
    setShowMapPopup(false);
    setShowAccidentPopup(false);
  };

  // Display alerts based on filtering state
  const displayAlerts = isFiltering ? filteredAlerts : alerts;

  return (
    <div className="admin-dashboard">
      <DashboardLayout>
        <div className="admin-content-wrapper">
          {/* Header with Dashboard Title */}
          <div className="admin-dashboard-header">
            <h1>Admin Dashboard</h1>
          </div>
          
          {/* Search and Filter Controls */}
          <div className="admin-controls-container">
            <div className="admin-search-controls">
              <div className="admin-search-bar">
                <input
                  type="text"
                  placeholder="Search by alert ID, location, or driver name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-search-input"
                  title="Enter alert ID, location, or driver name to search"
                />
                {searchQuery && (
                  <button 
                    className="admin-clear-search-btn" 
                    onClick={() => setSearchQuery("")}
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
              
              <div className="admin-filter-controls">
                <div className="admin-filter-group">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="admin-status-filter"
                    title="Filter alerts by status"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Waiting</option>
                    <option value="assigned">Assigned</option>
                    <option value="complete">Completed</option>
                  </select>
                
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="admin-sort-by"
                    title="Sort alerts by time"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
                
                {isFiltering && (
                  <button 
                    className="admin-clear-filter-btn"
                    onClick={clearFilters}
                    title="Clear all filters and search"
                  >
                    <FaTimes /> Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="admin-dashboard-content">
            {/* Main Content Area */}
            <div className="admin-main-container">
              {/* Alerts Section */}
              <div className="admin-alerts-section">
                <div className="admin-alerts-header">
                  <h2><FaBell /> Emergency Alerts</h2>
                </div>
                
                {/* Loading and Error States */}
                {loading ? (
                  <div className="admin-loading">
                    <FaSpinner className="admin-spinner" />
                    <p>Loading alerts...</p>
                  </div>
                ) : error ? (
                  <div className="admin-error">
                    <FaExclamationTriangle />
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>
                      Retry
                    </button>
                  </div>
                ) : (
                  /* Alert Cards */
                  <div className="admin-alerts-container">
                    {displayAlerts.length > 0 ? (
                      displayAlerts.map((alert) => (
                        <div key={alert.id} className={`admin-alert-card ${alert.status}`}>
                          <div className="admin-alert-left-border"></div>
                          <div className="admin-alert-content">
                            <div className="admin-alert-header">
                              <div className="admin-alert-id-time">
                                <div className="admin-alert-id">
                                  <FaBell /> Alert {alert.id}
                                </div>
                                <div className="admin-alert-time-location">
                                  <FaClock /> {alert.time} | <FaCalendarAlt /> {alert.date}
                                </div>
                                <div className="admin-alert-time-location">
                                  <FaMapMarkerAlt /> {alert.location}
                                </div>
                              </div>
                              <span className={`admin-status-badge ${alert.status}`}>
                                {getStatusLabel(alert.status)}
                              </span>
                            </div>
                            
                            <div className="admin-incident-info">
                              <div className="admin-view-buttons">
                                <div className="admin-map-view">
                                  <button className="admin-view-btn admin-map-btn" onClick={() => handleMapView(alert)}>
                                    <FaMapMarkedAlt className="admin-view-icon" /> View on Map
                                  </button>
                                </div>
                                {alert.accidentClip && (
                                  <div className="admin-view-accident">
                                    <button className="admin-view-btn admin-accident-btn" onClick={() => handleAccidentView(alert)}>
                                      <FaVideo className="admin-view-icon" /> View Accident
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="admin-alert-details">
                              <p className="admin-driver-info">
                                <FaUserAlt style={{ marginRight: '5px', color: '#3498db' }} />
                                <strong>Driver:</strong> {alert.driverName || "Not assigned"}
                              </p>
                            </div>
                            
                            <div className="admin-view-details-container">
                              <div className="admin-view-details-text" onClick={() => handleViewDetails(alert)}>
                                <FaInfoCircle className="admin-view-icon" /> View Complete Details
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="admin-no-alerts">
                        <FaExclamationTriangle size={40} color="#f39c12" />
                        <p>No alerts match your search criteria</p>
                        <button 
                          className="admin-clear-filter-btn"
                          onClick={clearFilters}
                        >
                          <FaTimes /> Clear Filters
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Stats Sidebar */}
            <div className="admin-stats-sidebar">
              <div className="admin-sidebar-header">
                <h2>Alert Statistics</h2>
              </div>
              
              <div className="admin-stats-cards">
                <div className="admin-stat-card">
                  <div className="admin-stat-icon">
                    <FaBell size={24} color="#3498db" />
                  </div>
                  <div className="admin-stat-info">
                    <h3>Total Alerts</h3>
                    <p className="admin-stat-number">{statusCounts.total}</p>
                  </div>
                </div>
                
                <div className="admin-stat-card">
                  <div className="admin-stat-icon">
                    <FaHourglass size={24} color="#FFC107" />
                  </div>
                  <div className="admin-stat-info">
                    <h3>Pending</h3>
                    <p className="admin-stat-number">{statusCounts.pending}</p>
                  </div>
                </div>
                
                <div className="admin-stat-card">
                  <div className="admin-stat-icon">
                    <FaAmbulance size={24} color="#2ecc71" />
                  </div>
                  <div className="admin-stat-info">
                    <h3>Assigned</h3>
                    <p className="admin-stat-number">{statusCounts.assigned}</p>
                  </div>
                </div>
                
                <div className="admin-stat-card">
                  <div className="admin-stat-icon">
                    <FaCheckCircle size={24} color="#4CAF50" />
                  </div>
                  <div className="admin-stat-info">
                    <h3>Completed</h3>
                    <p className="admin-stat-number">{statusCounts.complete}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>

      {/* Details Popup */}
      {showDetailsPopup && selectedAlert && (
        <div className="admin-popup-overlay" onClick={closeAllPopups}>
          <div className="admin-popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-popup-header">
              <h3>Alert Details</h3>
              <button className="admin-close-btn" onClick={closeAllPopups}>
                <FaTimes />
              </button>
            </div>
            <div className="admin-popup-body">
              <div className="admin-alert-detail-item">
                <span className="admin-detail-label">Alert ID:</span>
                <span className="admin-detail-value">{selectedAlert.id}</span>
              </div>
              <div className="admin-alert-detail-item">
                <span className="admin-detail-label">Time:</span>
                <span className="admin-detail-value">{selectedAlert.time}</span>
              </div>
              <div className="admin-alert-detail-item">
                <span className="admin-detail-label">Date:</span>
                <span className="admin-detail-value">{selectedAlert.date}</span>
              </div>
              <div className="admin-alert-detail-item">
                <span className="admin-detail-label">Location:</span>
                <span className="admin-detail-value">{selectedAlert.location}</span>
              </div>
              <div className="admin-alert-detail-item">
                <span className="admin-detail-label">Status:</span>
                <span className={`admin-status-value ${selectedAlert.status}`}>
                  {getStatusLabel(selectedAlert.status)}
                </span>
              </div>
              <div className="admin-alert-detail-item">
                <span className="admin-detail-label">Driver:</span>
                <span className="admin-detail-value">{selectedAlert.driverName || "Not assigned"}</span>
              </div>
              {selectedAlert.contactNo && (
                <div className="admin-alert-detail-item">
                  <span className="admin-detail-label">Contact:</span>
                  <span className="admin-detail-value">{selectedAlert.contactNo}</span>
                </div>
              )}
              {selectedAlert.responseTime && (
                <div className="admin-alert-detail-item">
                  <span className="admin-detail-label">Response Time:</span>
                  <span className="admin-detail-value">{selectedAlert.responseTime}</span>
                </div>
              )}
            </div>
            <div className="admin-popup-footer">
              <div className="admin-popup-actions">
                <button className="admin-action-btn admin-map-btn" onClick={() => { closeAllPopups(); handleMapView(selectedAlert); }}>
                  <FaMapMarkedAlt /> View on Map
                </button>
                {selectedAlert.accidentClip && (
                  <button className="admin-action-btn admin-accident-btn" onClick={() => { closeAllPopups(); handleAccidentView(selectedAlert); }}>
                    <FaVideo /> View Accident
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Popup */}
      {showMapPopup && selectedAlert && (
        <div className="admin-popup-overlay" onClick={closeAllPopups}>
          <div className="admin-popup-content admin-map-popup" onClick={(e) => e.stopPropagation()}>
            <div className="admin-popup-header">
              <h3>Location Map</h3>
              <button className="admin-close-btn" onClick={closeAllPopups}>
                <FaTimes />
              </button>
            </div>
            <div className="admin-popup-body">
              <div className="admin-map-container">
                <div className="admin-map-placeholder">
                  <FaMapMarkedAlt size={60} color="#3498db" />
                  <p>Map would be displayed here with coordinates:</p>
                  <p>Lat: {selectedAlert.coordinates?.lat}, Lng: {selectedAlert.coordinates?.lng}</p>
                </div>
              </div>
              <div className="admin-location-details">
                <p><strong>Address:</strong> {selectedAlert.location}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accident Video Popup */}
      {showAccidentPopup && selectedAlert && selectedAlert.accidentClip && (
        <div className="admin-popup-overlay" onClick={closeAllPopups}>
          <div className="admin-popup-content admin-video-popup" onClick={(e) => e.stopPropagation()}>
            <div className="admin-popup-header">
              <h3>Accident Video</h3>
              <button className="admin-close-btn" onClick={closeAllPopups}>
                <FaTimes />
              </button>
            </div>
            <div className="admin-popup-body">
              <div className="admin-video-container">
                <div className="admin-video-placeholder">
                  <FaVideo size={60} color="#e74c3c" />
                  <p>Video would be displayed here</p>
                  <p>Source: {selectedAlert.accidentClip}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;