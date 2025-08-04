import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaUserMd,
  FaFilter,
  FaSearch,
  FaSync,
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus
} from 'react-icons/fa';
import ApiService from '../../services/api/apiService';
import './DriverManagement.css';

const DriverManagement = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filteredDrivers, setFilteredDrivers] = useState([]);

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    filterDrivers();
  }, [drivers, searchTerm, statusFilter]);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getAllDrivers();
      setDrivers(response);
      setError(null);
    } catch (err) {
      setError('Failed to fetch drivers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterDrivers = () => {
    let filtered = [...drivers];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(driver => driver.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(driver =>
        driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.contact_no.includes(searchTerm) ||
        driver.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDrivers(filtered);
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return '#10b981'; // green
      case 'unavailable':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const handleRefresh = () => {
    fetchDrivers();
  };

  if (loading) {
    return <div className="loading-state">Loading drivers...</div>;
  }

  if (error) {
    return <div className="error-state">{error}</div>;
  }

  return (
    <div className="driver-management">
      <div className="driver-management__header">
        <div className="header-title">
          <h1><FaUserMd /> Driver Management</h1>
        </div>
        <button 
          className="btn btn-primary add-driver-btn"
          onClick={() => navigate('/admin-add-driver')}
        >
          <FaPlus /> Add New Driver
        </button>
      </div>

      <div className="driver-management__filters">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, or contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="status-filters">
          <div className="status-filter-label">
            <FaFilter /> Status Filter:
          </div>
          <div className="status-buttons">
            <button
              className={`status-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleStatusChange('all')}
            >
              All
              <span className="count">{drivers.length}</span>
            </button>
            <button
              className={`status-btn available ${statusFilter === 'available' ? 'active' : ''}`}
              onClick={() => handleStatusChange('available')}
            >
              Available
              <span className="count">
                {drivers.filter(d => d.status === 'available').length}
              </span>
            </button>
            <button
              className={`status-btn unavailable ${statusFilter === 'unavailable' ? 'active' : ''}`}
              onClick={() => handleStatusChange('unavailable')}
            >
              Unavailable
              <span className="count">
                {drivers.filter(d => d.status === 'unavailable').length}
              </span>
            </button>
          </div>
          <button className="refresh-btn" onClick={handleRefresh}>
            <FaSync />
          </button>
        </div>
      </div>

      <div className="driver-management__content">
        {filteredDrivers.length === 0 ? (
          <div className="no-results">
            No drivers found matching your filters
          </div>
        ) : (
          <div className="driver-table">
            <table>
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>License No.</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => (
                  <tr key={driver.id}>
                    <td className="driver-info">
                      <div className="driver-avatar">
                        {driver.photo ? (
                          <img src={driver.photo} alt={driver.name} />
                        ) : (
                          <div className="avatar-placeholder">
                            {driver.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="driver-details">
                        <div className="driver-name">{driver.name}</div>
                        <div className="driver-id">ID: {driver.id}</div>
                      </div>
                    </td>
                    <td>{driver.contact_no}</td>
                    <td>{driver.email}</td>
                    <td>{driver.license_no}</td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{
                          backgroundColor: `${getStatusColor(driver.status)}15`,
                          color: getStatusColor(driver.status)
                        }}
                      >
                        {driver.status}
                      </span>
                    </td>
                    <td className="actions">
                      <button
                        className="action-btn view"
                        onClick={() => navigate(`/admin-driver-management/view/${driver.id}`)}
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                      <button
                        className="action-btn edit"
                        onClick={() => navigate(`/admin-driver-management/edit/${driver.id}`)}
                        title="Edit Driver"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => {/* Handle delete */}}
                        title="Delete Driver"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverManagement; 