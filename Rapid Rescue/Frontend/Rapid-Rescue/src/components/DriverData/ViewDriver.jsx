import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../Layout/adminSidebar";
import MockApiService from "../../services/mockApi/mockApiService";
import "./ViewDriver.css";

const ViewDriver = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [driver, setDriver] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [performanceData, setPerformanceData] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch driver data
        const driverResponse = await MockApiService.getDriverById(id);
        if (!driverResponse.success) {
          throw new Error(driverResponse.message);
        }
        setDriver(driverResponse.data);

        // Fetch performance data
        const performanceResponse = await MockApiService.getDriverPerformance(id);
        if (!performanceResponse.success) {
          throw new Error(performanceResponse.message);
        }
        setPerformanceData(performanceResponse.data);

        // Fetch history data
        const historyResponse = await MockApiService.getDriverHistory(id);
        if (!historyResponse.success) {
          throw new Error(historyResponse.message);
        }
        setHistoryData(historyResponse.data);
      } catch (err) {
        console.error("Error fetching driver data:", err);
        setError("Failed to load driver data. " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDriverData();
  }, [id]);

  const handleDeleteDriver = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the API to delete the driver
      const response = await fetch(`http://127.0.0.1:8000/api/drivers/${id}/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete driver");
      }
      
      setSuccess(true);
      setTimeout(() => {
        navigate("/driver-data");
      }, 2000);
    } catch (err) {
      setError("Failed to delete driver: " + err.message);
    } finally {
      setLoading(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="loading-container">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading driver data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          Driver not found
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="view-driver-container">
        <div className="view-header">
          <div className="header-left">
            <button className="back-button" onClick={() => navigate("/driver-data")}>
              <i className="fas fa-arrow-left"></i> Back to Drivers
            </button>
            <h1>Driver Details</h1>
          </div>
          <div className="header-actions">
            <button 
              className="edit-btn"
              onClick={() => navigate(`/driver-data/edit/${id}`)}
            >
              <i className="fas fa-edit"></i> Edit Driver
            </button>
            <button 
              className="delete-btn"
              onClick={() => setConfirmDelete(true)}
            >
              <i className="fas fa-trash-alt"></i> Delete Driver
            </button>
          </div>
        </div>

        {success && (
          <div className="success-message">
            <i className="fas fa-check-circle"></i>
            Driver deleted successfully! Redirecting to driver list...
          </div>
        )}

        <div className="driver-profile">
          <div className="profile-header">
            <div className="profile-avatar">
              {driver.name.charAt(0).toUpperCase()}
            </div>
            <div className="profile-info">
              <h2>{driver.name}</h2>
              <span className={`status-badge ${driver.status}`}>
                {driver.status.charAt(0).toUpperCase() + driver.status.slice(1)}
              </span>
            </div>
          </div>

          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <i className="fas fa-user"></i> Information
            </button>
            <button 
              className={`tab-button ${activeTab === 'performance' ? 'active' : ''}`}
              onClick={() => setActiveTab('performance')}
            >
              <i className="fas fa-chart-line"></i> Performance
            </button>
            <button 
              className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <i className="fas fa-history"></i> History
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'info' && (
              <div className="info-section">
                <div className="info-card">
                  <h3>Personal Information</h3>
                  <div className="info-item">
                    <label>Phone Number</label>
                    <span>{driver.phone}</span>
                  </div>
                  <div className="info-item">
                    <label>CNIC</label>
                    <span>{driver.cnic}</span>
                  </div>
                  <div className="info-item">
                    <label>Service Provider</label>
                    <span>{driver.serviceProvider}</span>
                  </div>
                </div>
                <div className="info-card">
                  <h3>Location Details</h3>
                  <div className="info-item">
                    <label>Current Location</label>
                    <span>{driver.location}</span>
                  </div>
                  <div className="info-item">
                    <label>Service Area</label>
                    <span>{driver.serviceArea || 'Lahore Metropolitan Area'}</span>
                  </div>
                  <div className="info-item">
                    <label>Preferred Routes</label>
                    <span>{driver.preferredRoutes || 'Main City Routes'}</span>
                  </div>
                </div>
                <div className="info-card">
                  <h3>Vehicle Information</h3>
                  <div className="info-item">
                    <label>Assigned Ambulance</label>
                    <span>{driver.ambulance || 'Not Assigned'}</span>
                  </div>
                  <div className="info-item">
                    <label>Vehicle Type</label>
                    <span>{driver.vehicleType || 'Basic Life Support'}</span>
                  </div>
                  <div className="info-item">
                    <label>License Type</label>
                    <span>{driver.licenseType || 'Commercial'}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'performance' && performanceData && (
              <div className="performance-section">
                <div className="performance-grid">
                  <div className="performance-card">
                    <h3>Response Time</h3>
                    <div className="performance-chart">
                      <div 
                        className="chart-bar" 
                        style={{ height: `${(performanceData.responseTime / 10) * 100}%` }}
                      >
                        <span>{performanceData.responseTime} mins</span>
                      </div>
                    </div>
                    <p>Average Response Time</p>
                  </div>
                  <div className="performance-card">
                    <h3>Success Rate</h3>
                    <div className="performance-chart">
                      <div 
                        className="chart-bar" 
                        style={{ height: `${performanceData.successRate}%` }}
                      >
                        <span>{performanceData.successRate}%</span>
                      </div>
                    </div>
                    <p>Completed Missions</p>
                  </div>
                  <div className="performance-card">
                    <h3>Customer Rating</h3>
                    <div className="performance-chart">
                      <div 
                        className="chart-bar" 
                        style={{ height: `${(performanceData.rating / 5) * 100}%` }}
                      >
                        <span>{performanceData.rating}/5</span>
                      </div>
                    </div>
                    <p>Average Rating</p>
                  </div>
                </div>
                <div className="performance-stats">
                  <div className="stat-item">
                    <span className="stat-value">{performanceData.totalMissions}</span>
                    <span className="stat-label">Total Missions</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{performanceData.successfulMissions}</span>
                    <span className="stat-label">Successful Missions</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{performanceData.cancelledMissions}</span>
                    <span className="stat-label">Cancelled Missions</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="history-section">
                <div className="history-filters">
                  <select className="history-filter">
                    <option value="all">All Missions</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <input 
                    type="date" 
                    className="history-date-filter"
                    placeholder="Select Date"
                  />
                </div>
                <div className="history-list">
                  {historyData.map((mission, index) => (
                    <div key={index} className="history-item">
                      <div className={`history-icon ${mission.status}`}>
                        <i className={`fas fa-${mission.status === 'completed' ? 'check' : 'times'}-circle`}></i>
                      </div>
                      <div className="history-details">
                        <h4>{mission.type}</h4>
                        <p>Location: {mission.location}</p>
                        <span className="history-time">{mission.time}</span>
                      </div>
                      <div className={`history-status ${mission.status}`}>
                        {mission.status.charAt(0).toUpperCase() + mission.status.slice(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {confirmDelete && (
          <div className="modal-overlay">
            <div className="delete-modal">
              <div className="modal-header">
                <h3>Delete Driver</h3>
                <button className="close-button" onClick={() => setConfirmDelete(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this driver? This action cannot be undone.</p>
                <div className="driver-info-summary">
                  <p><strong>Name:</strong> {driver.name}</p>
                  <p><strong>ID:</strong> {driver.id}</p>
                  <p><strong>Status:</strong> {driver.status}</p>
                </div>
              </div>
              <div className="modal-actions">
                <button className="cancel-button" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </button>
                <button className="confirm-delete-button" onClick={handleDeleteDriver}>
                  Delete Driver
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewDriver; 