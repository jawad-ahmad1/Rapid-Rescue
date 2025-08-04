import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaHistory, FaMapMarkerAlt, FaClock, FaInfoCircle, FaCheck, FaTimes, FaExclamationTriangle, FaSpinner, FaSort } from "react-icons/fa";
import ApiService from "../../services/api/apiService";
import DashboardLayout from "../layouts/DashboardLayout";
import "./AmbulanceHistory.css";

const HistoryContent = () => {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const navigate = useNavigate();

  // Sort function
  const sortAlerts = (alertsToSort) => {
    return [...alertsToSort].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle date fields
      if (sortConfig.key === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  useEffect(() => {
    const fetchAlertHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get the current driver's ID from localStorage
        const driverData = JSON.parse(localStorage.getItem('driver') || '{}');
        if (!driverData.id) {
          throw new Error('No driver ID found. Please log in again.');
        }

        // Use ApiService to fetch history
        const data = await ApiService.getDriverHistory(driverData.id);
        console.log('Fetched history data:', data); // Debug log
        setAlerts(data);
      } catch (err) {
        console.error("Error fetching alert history:", err);
        
        // Handle authentication errors
        if (err.message?.includes('401') || err.message?.includes('auth')) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        
        setError(err.message || "Failed to load alert history. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlertHistory();
  }, [navigate]);

  // Sort alerts whenever sortConfig changes
  const sortedAlerts = sortAlerts(alerts);

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "complete":
      case "completed":
        return "status-complete";
      case "assigned":
      case "active":
        return "status-assigned";
      case "pending":
        return "status-pending";
      case "rejected":
        return "status-rejected";
      default:
        return "status-default";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewDetails = (alert) => {
    setSelectedAlert(alert);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedAlert(null);
  };

  const renderEmptyState = () => (
    <div className="empty-history">
      <FaHistory className="empty-icon" />
      <h3>No Alert History</h3>
      <p>You haven't responded to any alerts yet.</p>
    </div>
  );

  return (
    <div className="ambulance-dashboard">
      <div className="content-wrapper history-content">
        <div className="history-header">
          <h1>
            <FaHistory className="header-icon" /> My Alert History
          </h1>
          <p>View your previous alerts and responses</p>
        </div>

        {isLoading ? (
          <div className="loading-container">
            <FaSpinner className="spinner" />
            <p>Loading alert history...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <FaExclamationTriangle className="error-icon" />
            <p>{error}</p>
            <button className="retry-button" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        ) : alerts.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="history-list">
            <div className="history-controls">
              <button 
                className={`sort-button ${sortConfig.key === 'created_at' ? 'active' : ''}`}
                onClick={() => handleSort('created_at')}
              >
                <FaSort /> Sort by Date {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                className={`sort-button ${sortConfig.key === 'response_time' ? 'active' : ''}`}
                onClick={() => handleSort('response_time')}
              >
                <FaSort /> Sort by Response Time {sortConfig.key === 'response_time' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </button>
            </div>

            {sortedAlerts.map((alert) => (
              <div key={alert.id} className="history-card">
                <div className="history-card-header">
                  <div className="alert-id">Alert #{alert.id}</div>
                  <div className={`status-badge ${getStatusBadgeClass(alert.status)}`}>
                    {alert.status === "complete" || alert.status === "completed" ? (
                      <>
                        <FaCheck /> Completed
                      </>
                    ) : alert.status === "assigned" || alert.status === "active" ? (
                      <>
                        <FaExclamationTriangle /> Active
                      </>
                    ) : (
                      alert.status
                    )}
                  </div>
                </div>
                <div className="history-card-body">
                  <div className="alert-details">
                    <div className="detail-item">
                      <FaMapMarkerAlt className="detail-icon" />
                      <span className="detail-text">{alert.location}</span>
                    </div>
                    <div className="detail-item">
                      <FaClock className="detail-icon" />
                      <span className="detail-text">
                        {formatDate(alert.created_at)}
                      </span>
                    </div>
                    {alert.response_time && (
                      <div className="detail-item">
                        <span className="response-time">
                          Response time: {alert.response_time}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    className="view-details-button"
                    onClick={() => handleViewDetails(alert)}
                  >
                    <FaInfoCircle /> View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showDetailModal && selectedAlert && (
          <div className="modal-overlay">
            <div className="detail-modal">
              <div className="modal-header">
                <h2>Alert Details</h2>
                <button className="close-button" onClick={closeDetailModal}>
                  <FaTimes />
                </button>
              </div>
              <div className="modal-content">
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Alert ID:</label>
                    <span>#{selectedAlert.id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Location:</label>
                    <span>{selectedAlert.location}</span>
                  </div>
                  <div className="detail-item">
                    <label>Created At:</label>
                    <span>{formatDate(selectedAlert.created_at)}</span>
                  </div>
                  {selectedAlert.completed_at && (
                    <div className="detail-item">
                      <label>Completed At:</label>
                      <span>{formatDate(selectedAlert.completed_at)}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <label>Status:</label>
                    <span className={`status-badge ${getStatusBadgeClass(selectedAlert.status)}`}>
                      {selectedAlert.status}
                    </span>
                  </div>
                  {selectedAlert.response_time && (
                    <div className="detail-item">
                      <label>Response Time:</label>
                      <span>{selectedAlert.response_time}</span>
                    </div>
                  )}
                  {selectedAlert.notes && (
                    <div className="detail-item">
                      <label>Notes:</label>
                      <span>{selectedAlert.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AmbulanceHistory = () => {
  return (
    <DashboardLayout role="driver">
      <HistoryContent />
    </DashboardLayout>
  );
};

export default AmbulanceHistory; 