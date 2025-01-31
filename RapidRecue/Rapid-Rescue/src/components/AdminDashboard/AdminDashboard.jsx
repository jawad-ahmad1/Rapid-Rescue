import { useState, useEffect } from "react";
import DashboardLayout from "../Layout/DashboardLayout";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [alerts] = useState([
    {
      id: "#2234",
      time: "12:30 PM",
      location: "Johar Town Lahore",
      status: "pending",
      driver: "No Driver Assigned",
      contactNo: null,
      responseTime: null,
    },
    {
      id: "#2235",
      time: "12:30 PM",
      location: "Johar Town Lahore",
      status: "assigned",
      driver: "Ali Razaq",
      contactNo: "0313 66583695",
      responseTime: null,
    },
    {
      id: "#2236",
      time: "12:30 PM",
      location: "Johar Town Lahore",
      status: "complete",
      driver: "Ali Razaq",
      contactNo: "0313 66583695",
      responseTime: "10 mins",
    },
  ]);

  const [filteredAlerts, setFilteredAlerts] = useState(alerts);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    let result = [...alerts];

    if (searchQuery) {
      result = result.filter(
        (alert) =>
          alert.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          alert.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          alert.driver.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(
        (alert) => alert.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    result.sort((a, b) => {
      return sortBy === "newest"
        ? new Date(b.time) - new Date(a.time)
        : new Date(a.time) - new Date(b.time);
    });

    setFilteredAlerts(result);
  }, [searchQuery, statusFilter, sortBy, alerts]);

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <div className="main-container">
          {/* Header with Search and Filters */}
          <div className="header">
            <h1>Emergency Alert Manager</h1>
            <div className="header-controls">
              <input
                type="search"
                className="search-bar"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="filter-sort">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">Filter by</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="complete">Complete</option>
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="newest">Sort by</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
            </div>
          </div>

          {/* Alert Cards */}
          <div className="alerts-container">
            {filteredAlerts.map((alert, index) => (
              <div key={index} className="alert-card">
                <div className="alert-header">
                  <span className="alert-badge">{alert.id}</span>
                  <p>{alert.time}, {alert.location}</p>
                  <span className={`status-label ${alert.status.toLowerCase()}`}>
                    {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                  </span>
                </div>
                <div className="incident-info">
                  <p><strong>Incident Info:</strong></p>
                  <button className="map-view">🗺️</button>
                  <button className="view-accident">👁️</button>
                </div>
                <div className="driver-info">
                  <p><strong>Driver:</strong> {alert.driver}</p>
                  {alert.contactNo && <p><strong>Contact No:</strong> {alert.contactNo}</p>}
                  {alert.responseTime && <p><strong>Response Time:</strong> {alert.responseTime}</p>}
                </div>
                <button className="view-details">View Details</button>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar for Active & Resolved Alerts */}
        <div className="alerts-sidebar">
          <div className="active-alerts">
            <h3>Active Alerts</h3>
            <ul>
              <li className="active-alert">#556482 : 10:30 AM</li>
              <li className="active-alert">#556347 : 10:30 AM</li>
              <li className="active-alert">#556885 : 9:30 AM</li>
            </ul>
          </div>
          <div className="resolved-alerts">
            <h3>Resolved Alerts</h3>
            <ul>
              <li className="resolved-alert">#5746788 : 12:00 AM</li>
              <li className="resolved-alert">#5740897 : 12:10 AM</li>
              <li className="resolved-alert">#5738684 : 10:50 AM</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
