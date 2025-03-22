import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../Layout/adminSidebar";
import MockApiService from "../../services/mockApi/mockApiService";
import "./DriverDetails.css";

const DriverDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignedAmbulance, setAssignedAmbulance] = useState(null);

  useEffect(() => {
    const fetchDriverDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch driver data
        const driverResponse = await MockApiService.getDriverById(id);
        setDriver(driverResponse.data);
        
        // If driver has an ambulance assigned, fetch that too
        if (driverResponse.data.ambulance) {
          const ambulanceResponse = await MockApiService.getAmbulanceById(driverResponse.data.ambulance);
          setAssignedAmbulance(ambulanceResponse.data);
        }
      } catch (error) {
        console.error("Error fetching driver details:", error);
        setError("Failed to load driver details. " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDriverDetails();
  }, [id]);

  // Generate random stats for the driver
  const generateRandomStats = () => {
    return {
      completedTrips: Math.floor(Math.random() * 100) + 50,
      averageResponseTime: (Math.random() * 10 + 5).toFixed(2) + " mins",
      rating: (Math.random() * 2 + 3).toFixed(1) + "/5.0",
      successRate: Math.floor(Math.random() * 20 + 80) + "%"
    };
  };

  const driverStats = generateRandomStats();

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="driver-details-container">
        <div className="details-header">
          <button className="back-button" onClick={() => navigate("/driver-data")}>
            &larr; Back to Drivers
          </button>
          <h1>Driver Details</h1>
        </div>

        {loading ? (
          <div className="loading-container">
            <p className="loading-text">Loading driver details...</p>
          </div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : driver ? (
          <div className="details-content">
            <div className="driver-profile">
              <div className="profile-header">
                <div className="avatar">
                  {driver.name.charAt(0)}
                </div>
                <div className="profile-info">
                  <h2>{driver.name}</h2>
                  <p className="driver-id">ID: {driver.id}</p>
                  <span className={`status-badge ${
                    driver.status === "available" || driver.status === "active" 
                      ? "active" 
                      : "inactive"
                  }`}>
                    {driver.status}
                  </span>
                </div>
              </div>

              <div className="info-section">
                <h3>Contact Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Phone</span>
                    <span className="info-value">{driver.phone}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">CNIC</span>
                    <span className="info-value">{"35201-" + Math.floor(Math.random() * 10000000) + "-" + Math.floor(Math.random() * 10)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Service Provider</span>
                    <span className="info-value">1122</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Location</span>
                    <span className="info-value">Lahore</span>
                  </div>
                </div>
              </div>

              {assignedAmbulance && (
                <div className="info-section">
                  <h3>Assigned Ambulance</h3>
                  <div className="ambulance-card">
                    <div className="ambulance-id">{assignedAmbulance.id}</div>
                    <div className="ambulance-status">
                      <span className={`status-badge ${
                        assignedAmbulance.status === "available" ? "active" : 
                        assignedAmbulance.status === "on-duty" ? "on-duty" : "inactive"
                      }`}>
                        {assignedAmbulance.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="info-section">
                <h3>Performance Statistics</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-value">{driverStats.completedTrips}</span>
                    <span className="stat-label">Completed Trips</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{driverStats.averageResponseTime}</span>
                    <span className="stat-label">Avg. Response Time</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{driverStats.rating}</span>
                    <span className="stat-label">Rating</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{driverStats.successRate}</span>
                    <span className="stat-label">Success Rate</span>
                  </div>
                </div>
              </div>

              <div className="action-buttons">
                <button className="action-btn edit">Edit Driver</button>
                <button className="action-btn deactivate">
                  {driver.status === "available" || driver.status === "active" 
                    ? "Deactivate Driver" 
                    : "Activate Driver"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="not-found">
            <p>Driver not found</p>
            <button onClick={() => navigate("/driver-data")}>
              Return to Driver List
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDetails; 