import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../layouts/admin/AdminLayout";
import ApiService from "../../services/api/apiService";
import "./ViewDriver.css";
import { 
  FaUser, 
  FaChartLine, 
  FaHistory, 
  FaArrowLeft, 
  FaEdit, 
  FaTrash,
  FaCheck,
  FaTimes,
  FaClock,
  FaExclamationTriangle,
  FaIdCard
} from "react-icons/fa";

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
        
        try {
          // Fetch driver data first
          const driverData = await ApiService.getDriverById(id);
          setDriver(driverData);
          
          // Fetch performance and history data in parallel
          const [performance, history] = await Promise.allSettled([
            ApiService.getDriverPerformance(id),
            ApiService.getDriverHistory(id)
          ]);
          
          // Handle performance data
          if (performance.status === 'fulfilled') {
            setPerformanceData(performance.value);
          } else {
            console.warn('Failed to load performance data:', performance.reason);
          }
          
          // Handle history data
          if (history.status === 'fulfilled') {
            setHistoryData(history.value);
          } else {
            console.warn('Failed to load history data:', history.reason);
          }
          
        } catch (err) {
          console.error("Error fetching driver data:", err);
          throw new Error(err.message || "Failed to fetch driver data");
        }
      } catch (err) {
        console.error("Error processing driver data:", err);
        setError(err.message || "Failed to load driver data");
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
      const result = await ApiService.deleteDriver(id);
      
      if (result.success) {
        setSuccess(true);
        // Clear the drivers cache to force a refresh on the list page
        localStorage.removeItem('driversCache');
        setTimeout(() => {
          navigate("/admin-driver-management", { state: { refresh: true } });
        }, 2000);
      } else {
        throw new Error(result.message || "Failed to delete driver");
      }
    } catch (err) {
      setError("Failed to delete driver: " + err.message);
    } finally {
      setLoading(false);
      setConfirmDelete(false);
    }
  };

  const handleEditClick = () => {
    navigate(`/admin-driver-management/edit/${id}`);
  };

  if (loading) {
    return (
      <AdminLayout title="Driver Details">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading driver data...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Driver Details">
        <div className="error-message">
          <FaTimes />
          {error}
        </div>
      </AdminLayout>
    );
  }

  if (!driver) {
    return (
      <AdminLayout title="Driver Details">
        <div className="error-message">
          <FaTimes />
          Driver not found
        </div>
      </AdminLayout>
    );
  }

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    return phone.toString().replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2-$3');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderInfoSection = () => {
    return (
      <div className="info-grid">
        <div className="info-card">
          <h3><FaUser /> Personal Information</h3>
          <div className="info-item">
            <label>Full Name</label>
            <span>{driver.name}</span>
          </div>
          <div className="info-item">
            <label>Contact Number</label>
            <span>{formatPhoneNumber(driver.contact_no)}</span>
          </div>
          <div className="info-item">
            <label>Email Address</label>
            <span>{driver.email || 'N/A'}</span>
          </div>
          <div className="info-item">
            <label>Address</label>
            <span>{driver.address || 'N/A'}</span>
          </div>
        </div>

        <div className="info-card">
          <h3><FaIdCard /> Professional Details</h3>
          <div className="info-item">
            <label>Driver ID</label>
            <span>#{driver.id}</span>
          </div>
          <div className="info-item">
            <label>License Number</label>
            <span>{driver.license_no}</span>
          </div>
          <div className="info-item">
            <label>Experience</label>
            <span>{driver.experience} years</span>
          </div>
          <div className="info-item">
            <label>Status</label>
            <span className={`status-badge ${driver.status}`}>
              {driver.status.charAt(0).toUpperCase() + driver.status.slice(1)}
            </span>
          </div>
        </div>

        {performanceData && (
          <div className="info-card">
            <h3><FaChartLine /> Performance Metrics</h3>
            <div className="info-item">
              <label>Total Trips</label>
              <span>{performanceData.totalTrips}</span>
            </div>
            <div className="info-item">
              <label>Completed Trips</label>
              <span>{performanceData.completedTrips}</span>
            </div>
            <div className="info-item">
              <label>Success Rate</label>
              <span>{performanceData.successRate}%</span>
            </div>
            <div className="info-item">
              <label>Average Response Time</label>
              <span>{performanceData.averageResponseTime} mins</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHistorySection = () => {
    if (!historyData || historyData.length === 0) {
      return (
        <div className="no-data-message">
          <FaHistory />
          <p>No trip history available</p>
        </div>
      );
    }

    return (
      <div className="history-section">
        <div className="history-list">
          {historyData.map((item, index) => (
            <div key={index} className="history-item">
              <div className={`history-icon ${item.status}`}>
                {item.status === 'completed' && <FaCheck />}
                {item.status === 'pending' && <FaClock />}
                {item.status === 'cancelled' && <FaTimes />}
                {item.status === 'assigned' && <FaExclamationTriangle />}
              </div>
              <div className="history-details">
                <h4>Alert #{item.alert_id}</h4>
                <p>{item.location}</p>
                <div className="history-meta">
                  <span>{formatDate(item.created_at)}</span>
                  <span className={`status-badge ${item.status}`}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout title="Driver Details">
      <div className="view-driver-container">
        <div className="view-header">
          <div className="header-left">
            <button 
              className="back-button" 
              onClick={() => navigate("/admin-driver-management")}
            >
              <FaArrowLeft /> Back to Drivers
            </button>
            <h1>Driver Details</h1>
          </div>
          <div className="header-actions">
            <button 
              className="edit-btn"
              onClick={handleEditClick}
            >
              <FaEdit /> Edit Driver
            </button>
            <button 
              className="delete-btn"
              onClick={() => setConfirmDelete(true)}
            >
              <FaTrash /> Delete Driver
            </button>
          </div>
        </div>

        {success && (
          <div className="success-message">
            <FaCheck />
            Driver deleted successfully! Redirecting to driver list...
          </div>
        )}

        <div className="driver-profile">
          <div className="profile-header">
            <div className="profile-avatar">
              {driver.photo ? (
                <img src={driver.photo} alt={driver.name} />
              ) : (
                driver.name.charAt(0).toUpperCase()
              )}
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
              <FaUser /> Driver Information
            </button>
            <button 
              className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <FaHistory /> Trip History
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'info' ? renderInfoSection() : renderHistorySection()}
          </div>
        </div>

        {confirmDelete && (
          <div className="modal-overlay">
            <div className="delete-modal">
              <div className="modal-header">
                <h3>Confirm Delete</h3>
                <button 
                  className="close-button"
                  onClick={() => setConfirmDelete(false)}
                >
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body">
                <div className="driver-info-summary">
                  <p>Are you sure you want to delete this driver?</p>
                  <p><strong>Name:</strong> {driver.name}</p>
                  <p><strong>ID:</strong> #{driver.id}</p>
                </div>
                <p className="warning-text">
                  <FaExclamationTriangle /> This action cannot be undone.
                </p>
              </div>
              <div className="modal-actions">
                <button 
                  className="cancel-button"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
                <button 
                  className="confirm-delete-button"
                  onClick={handleDeleteDriver}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete Driver'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ViewDriver; 