import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Layout/adminSidebar";
import "./DriverData.css";
import MockApiService from "../../services/mockApi/mockApiService";

const DriverData = () => {
  const [drivers, setDrivers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();

  // Fetch Drivers
  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await MockApiService.getDrivers();
      
      if (!response.success) {
        throw new Error(response.message);
      }
      
      setDrivers(response.data);
    } catch (err) {
      console.error("Error fetching drivers:", err);
      setError("Failed to load driver data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Filter drivers based on search input and status
  const filteredDrivers = drivers.filter(
    (driver) => {
      const matchesSearch = 
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.phone.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || driver.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    }
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
          <h1>Driver Management</h1>
          <button className="add-driver-btn" onClick={() => navigate("/add-driver")}>
            <i className="fas fa-plus"></i> Add New Driver
          </button>
        </div>

        {/* Error/Success Message */}
        {error && (
          <div className={`message ${error.type === 'success' ? 'success-message' : 'error-message'}`}>
            {error.type === 'success' ? (
              <i className="fas fa-check-circle"></i>
            ) : (
              <i className="fas fa-exclamation-circle"></i>
            )}
            <span>{error.message || error}</span>
          </div>
        )}

        {/* Filter and Search Section */}
        <div className="filter-search-container">
          <div className="search-box">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              placeholder="Search drivers by name, location or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-options">
            <div className="filter-group">
              <label>Status:</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-filter"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available</option>
                <option value="on-duty">On Duty</option>
                <option value="off-duty">Off Duty</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Sort by:</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-container">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading drivers...</p>
            </div>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedDrivers.map((driver, index) => (
                  <tr key={index}>
                    <td className="driver-name-cell">
                      <div className="driver-avatar">
                        {driver.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{driver.name}</span>
                    </td>
                    <td>{driver.serviceProvider}</td>
                    <td>{driver.phone}</td>
                    <td>{driver.cnic}</td>
                    <td>
                      <div className="location-badge">
                        <i className="fas fa-map-marker-alt"></i>
                        {driver.location}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${driver.status}`}>
                        {driver.status.charAt(0).toUpperCase() + driver.status.slice(1)}
                      </span>
                    </td>
                    <td className="action-buttons-cell">
                      <button 
                        className="action-icon view"
                        onClick={() => navigate(`/driver-data/view/${driver.id}`)}
                        title="View driver details"
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      <button 
                        className="action-icon edit"
                        onClick={() => navigate(`/driver-data/edit/${driver.id}`)}
                        title="Edit driver information"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-data">
              <i className="fas fa-user-slash"></i>
              <p>No drivers found</p>
              <button className="add-driver-btn" onClick={() => navigate("/add-driver")}>
                <i className="fas fa-plus"></i> Add New Driver
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverData;
