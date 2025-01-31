import { useState } from "react";
import AmbulanceSidebar from "../AmbulanceDashboardLayout/AmbulanceSidebar";
import "./AmbulanceDashboard.css";

const AmbulanceDashboard = () => {
  const [status, setStatus] = useState("Available");

  const [alerts, setAlerts] = useState([
    { id: "#22344", time: "12:30 PM", location: "Johar Town Lahore", status: "Pending" },
    { id: "#22345", time: "12:30 PM", location: "Johar Town Lahore", status: "Pending" },
    { id: "#22346", time: "12:30 PM", location: "Johar Town Lahore", status: "Pending" },
  ]);

  const [activeAlerts,] = useState([
    { id: "#556482", time: "10:30 AM" },
    { id: "#556347", time: "10:00 AM" },
    { id: "#556885", time: "9:30 AM" },
  ]);

  // ✅ Handle Accept Alert
  const handleAccept = (id) => {
    setAlerts((prevAlerts) =>
      prevAlerts.map((alert) =>
        alert.id === id ? { ...alert, status: "Accepted" } : alert
      )
    );
  };

  // ✅ Handle Reject Alert
  const handleReject = (id) => {
    setAlerts((prevAlerts) =>
      prevAlerts.map((alert) =>
        alert.id === id ? { ...alert, status: "Rejected" } : alert
      )
    );
  };

  return (
    <div className="ambulance-dashboard">
      {/* 🚑 Sidebar on the Left */}
      <aside className="ambulance-sidebar">
        <AmbulanceSidebar />
      </aside>

      <div className="dashboard-content">
        {/* 🚨 Status Toggle & Navbar on Top Right */}
        <div className="header-section">
          <div className="status-toggle">
            <span className="status-label">Status :</span>
            <span className={`status-value ${status.toLowerCase()}`}>{status}</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={status === "Available"}
                onChange={() => setStatus(status === "Available" ? "Unavailable" : "Available")}
              />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="driver-info">
            <img src="/profile.png" alt="Driver" className="profile-img" />
            <span className="driver-name">Evano</span>
          </div>
        </div>

        {/* 🚨 Alerts in the Center */}
        <div className="alerts-section">
          <h2 className="section-title">Alerts</h2>
          <div className="alerts-container">
            {alerts.map((alert, index) => (
              <div key={index} className="alert-card">
                <div className="alert-header">
                  <span className="alert-id">🔔 {alert.id}</span>
                  <p>{alert.time}, {alert.location}</p>
                  <span className={`status-badge ${alert.status.toLowerCase()}`}>
                    {alert.status}
                  </span>
                </div>
                <div className="incident-info">
                  <p><strong>Incident Info:</strong></p>
                  <button className="map-view">🗺️ Map View</button>
                  <button className="view-accident">👁️ View Accident</button>
                </div>
                <div className="alert-actions">
                  <button className="accept-alert" onClick={() => handleAccept(alert.id)}>
                    ✔ Accept Alert
                  </button>
                  <button className="reject-alert" onClick={() => handleReject(alert.id)}>
                    ✖ Reject Alert
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 🚨 Responded Alerts (Active Alerts) on the Right */}
        <aside className="active-alerts-sidebar">
          <h3 className="sidebar-title">🚨 Responded Alerts</h3>
          <div className="active-alerts">
            <button className="respond-completed">✔ Respond Completed</button>
            <ul>
              {activeAlerts.map((alert, index) => (
                <li key={index} className="active-alert">#{alert.id} : {alert.time}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AmbulanceDashboard;
