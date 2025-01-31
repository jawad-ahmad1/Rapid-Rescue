import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Layout/Sidebar";
import "./DriverData.css";

const DriverData = () => {
  const [drivers, setDrivers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch Drivers
  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/drivers/");
      if (!response.ok) throw new Error("Failed to fetch drivers.");
      const data = await response.json();
      setDrivers(data.drivers || []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter drivers based on search input
  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // **Sorting Logic**
  const sortedDrivers = [...filteredDrivers].sort((a, b) => {
    const dateA = new Date(a.createdAt || "2024-01-01"); // Use default date if missing
    const dateB = new Date(b.createdAt || "2024-01-01");

    return sortBy === "newest" ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="driver-container">
        {/* Header Section */}
        <div className="driver-header">
          <h1>Driver Data</h1>
          <div className="search-sort">
            <input
              type="text"
              placeholder="Search drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Sort by: Newest</option>
              <option value="oldest">Sort by: Oldest</option>
            </select>
          </div>
        </div>

        {/* Table Section */}
        <div className="table-wrapper">
          {loading ? (
            <p className="loading-text">Loading drivers...</p>
          ) : sortedDrivers.length > 0 ? (
            <table className="driver-table">
              <thead>
                <tr>
                  <th>Driver Name</th>
                  <th>Service Provider</th>
                  <th>Phone Number</th>
                  <th>CNIC No</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedDrivers.map((driver, index) => (
                  <tr key={index}>
                    <td>{driver.name}</td>
                    <td>{driver.serviceProvider}</td>
                    <td>{driver.phone}</td>
                    <td>{driver.cnic}</td>
                    <td>{driver.location}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          driver.status === "active" ? "active" : "inactive"
                        }`}
                      >
                        {driver.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="no-data">🚨 No drivers found</p>
          )}
        </div>

        {/* Add Driver Button - Now Navigates to Form */}
        <div className="add-driver-container">
          <button className="add-driver-btn" onClick={() => navigate("/add-driver")}>
            + Add Driver
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverData;
