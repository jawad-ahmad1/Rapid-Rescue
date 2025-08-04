import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import "./DriverData.css";
import ApiService from "../../services/api/apiService";
import { debounce } from 'lodash';
import { 
  FaEye, 
  FaEdit, 
  FaTrash, 
  FaSearch, 
  FaTimes, 
  FaPlus,
  FaSync,
  FaQuestionCircle,
  FaFilter
} from 'react-icons/fa';

// Column definitions for the table
const COLUMNS = [
  { 
    key: 'id', 
    label: 'Driver ID', 
    sortable: true, 
    help: 'Unique identifier for each driver',
    width: '100px'
  },
  { 
    key: 'name', 
    label: 'Name', 
    sortable: true, 
    help: 'Full name of the driver',
    width: '150px'
  },
  { 
    key: 'contact_no', 
    label: 'Contact', 
    sortable: false, 
    help: 'Primary contact number',
    width: '130px'
  },
  { 
    key: 'license_no', 
    label: 'License No', 
    sortable: true, 
    help: 'Driver\'s license number',
    width: '120px'
  },
  { 
    key: 'experience', 
    label: 'Experience', 
    sortable: true, 
    help: 'Years of driving experience',
    width: '100px'
  },
  { 
    key: 'address', 
    label: 'Address', 
    sortable: false, 
    help: 'Current residential address',
    width: 'auto'
  },
  { 
    key: 'status', 
    label: 'Status', 
    sortable: true, 
    help: 'Current availability status',
    width: '120px'
  }
];

// Create a cache for driver data
const driversCache = {
  data: [],
  timestamp: null,
  expiryTime: 60000 // 1 minute cache validity
};

const DriverData = () => {
  const [drivers, setDrivers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [successMessage, setSuccessMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const navigate = useNavigate();
  const location = useLocation();

  // Utility functions for formatting data
  const formatPhoneNumber = useCallback((phone) => {
    // If phone is falsy but 0, keep 0, otherwise return N/A
    if (!phone && phone !== 0) return "N/A";
    
    // Convert to string and clean up
    const phoneStr = phone.toString();
    
    // If it's already clean (just numbers), return as is
    if (/^\d+$/.test(phoneStr)) {
      return phoneStr;
    }
    
    // Remove all non-digit characters
    const cleaned = phoneStr.replace(/\D/g, '');
    
    // If we have digits after cleaning, return them
    if (cleaned.length > 0) {
      return cleaned;
    }
    
    // If we get here, we couldn't format it properly
    return phone.toString() || "N/A";
  }, []);

  const formatExperience = useCallback((years) => {
    if (years === 0) return "0 years";
    if (!years) return "N/A";
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }, []);

  const formatAddress = useCallback((address) => {
    if (!address) return address || "N/A";  // Return original value if exists
    const trimmed = address.trim();
    if (trimmed.length === 0) return "N/A";
    // Only mark as N/A if it's just numbers or a single word and looks invalid
    if (/^\\d+$/.test(trimmed) || /^[a-zA-Z0-9]+$/.test(trimmed)) {
      return address; // Return original address even if it looks invalid
    }
    return trimmed;
  }, []);

  // Transform data if needed to ensure consistent field names
  const transformDriverData = useCallback((drivers) => {
    return drivers.map(driver => {
      // Preserve both contact_no and phone fields
      const contactNumber = driver.contact_no || driver.phone;
      
      return {
        ...driver,
        id: driver.id,
        name: driver.name || driver.full_name || 'Unknown',
        // Keep both fields and ensure contact_no is set
        contact_no: driver.contact_no || driver.phone || '',
        phone: driver.phone || driver.contact_no || '',
        license_no: driver.license_no || driver.license || '',
        experience: typeof driver.experience === 'number' ? driver.experience : 0,
        address: driver.address || '',
        status: driver.status || 'available'
      };
    });
  }, []);

  // Fetch drivers with proper data transformation
  const fetchDriversWithTransformation = useCallback(async (query = "") => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await ApiService.getAllDrivers(query);
      console.log('Data received from getAllDrivers:', data); // Debug log
      
      const transformedData = transformDriverData(data);
      console.log('Transformed data:', transformedData); // Debug log
      
      setDrivers(transformedData);
    } catch (err) {
      console.error("Error fetching drivers:", err);
      setError("Failed to load driver data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [transformDriverData]);

  // Debounced search with the transformed fetch
  const debouncedSearch = useCallback(
    debounce((query) => {
      setCurrentPage(1);
      fetchDriversWithTransformation(query);
    }, 300),
    [fetchDriversWithTransformation]
  );

  // Update useEffect to handle refresh state
  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        if (!ApiService.isAuthenticated()) {
          navigate("/login");
          return;
        }
        // Force refresh if coming from delete operation
        if (location.state?.refresh) {
          driversCache.timestamp = null;
        }
        await fetchDriversWithTransformation();
      } catch (err) {
        console.error("Authentication check failed:", err);
        navigate("/login");
      }
    };
    
    checkAuthAndFetch();
  }, [fetchDriversWithTransformation, navigate, location.state]);

  // Update search effect
  useEffect(() => {
    if (searchQuery) {
      debouncedSearch(searchQuery);
    } else {
      fetchDriversWithTransformation();
    }
  }, [searchQuery, debouncedSearch, fetchDriversWithTransformation]);

  // Add event listener for alert status changes
  useEffect(() => {
    const handleAlertStatusChange = () => {
      console.log('Alert status changed, refreshing driver list...');
      fetchDriversWithTransformation();
    };

    window.addEventListener('alertStatusChanged', handleAlertStatusChange);
    return () => {
      window.removeEventListener('alertStatusChanged', handleAlertStatusChange);
    };
  }, [fetchDriversWithTransformation]);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDeleteClick = (driver) => {
    setSelectedDriver(driver);
    setShowDeleteModal(true);
  };

  const handleViewDetails = (driver) => {
    navigate(`/admin-driver-management/view/${driver.id}`);
  };

  const handleEditClick = (driver) => {
    navigate(`/admin-driver-management/edit/${driver.id}`);
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      const result = await ApiService.deleteDriver(selectedDriver.id);
      
      if (result.success) {
        const updatedDrivers = drivers.filter(d => d.id !== selectedDriver.id);
        setDrivers(updatedDrivers);
        driversCache.data = updatedDrivers;
        driversCache.timestamp = Date.now();
        
        setSuccessMessage(`Driver "${selectedDriver.name}" was successfully deleted.`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error("Error deleting driver:", err);
      if (err.message?.includes("401")) {
        navigate("/login");
        return;
      }
      setError(`Failed to delete driver: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setSelectedDriver(null);
    }
  };

  const filteredAndSortedDrivers = useMemo(() => {
    return drivers
      .filter(driver => {
        const matchesSearch = !searchQuery.trim() || 
          driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          driver.phone?.includes(searchQuery) ||
          driver.license_no?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = statusFilter === "all" || 
          driver.status.toLowerCase() === statusFilter.toLowerCase();
        
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const direction = sortConfig.direction === 'asc' ? 1 : -1;
        if (a[sortConfig.key] < b[sortConfig.key]) return -1 * direction;
        if (a[sortConfig.key] > b[sortConfig.key]) return 1 * direction;
        return 0;
      });
  }, [drivers, searchQuery, statusFilter, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedDrivers.length / itemsPerPage);
  const paginatedDrivers = filteredAndSortedDrivers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusColor = (status) => {
    const statusMap = {
      'available': 'success',
      'unavailable': 'danger',
      'on_duty': 'warning',
      'off_duty': 'info'
    };
    return statusMap[status.toLowerCase()] || 'default';
  };

  // Add this function for status counts
  const getStatusCounts = useMemo(() => {
    return {
      all: drivers.length,
      available: drivers.filter(d => d.status === 'available').length,
      unavailable: drivers.filter(d => d.status === 'unavailable').length
    };
  }, [drivers]);

  // Add this function for status button class
  const getStatusButtonClass = useCallback((status) => {
    return `status-btn ${status} ${statusFilter === status ? 'active' : ''}`;
  }, [statusFilter]);

  // Update the table row rendering
  const renderDriverRow = (driver) => {
    return (
      <tr key={driver.id}>
        <td data-label="Driver ID">{driver.id}</td>
        <td data-label="Name">
          <div className="driver-name">
            <span className="name">{driver.name}</span>
            {driver.driver_id && <span className="driver-id">#{driver.driver_id}</span>}
          </div>
        </td>
        <td data-label="Contact">{driver.contact_no || driver.phone || "N/A"}</td>
        <td data-label="License">{driver.license_no || "N/A"}</td>
        <td data-label="Experience">{driver.experience} years</td>
        <td data-label="Address" className="address-cell">
          <span className="address-text" title={driver.address}>
            {driver.address || "N/A"}
          </span>
        </td>
        <td data-label="Status">
          <span className={`status-badge ${getStatusColor(driver.status || 'available')}`}>
            {driver.status ? driver.status.charAt(0).toUpperCase() + driver.status.slice(1) : 'Available'}
          </span>
        </td>
        <td data-label="Actions">
          <div className="action-buttons">
            <button
              type="button"
              className="action-btn view"
              onClick={() => handleViewDetails(driver)}
              title="View driver details"
              aria-label={`View details for ${driver.name}`}
            >
              <FaEye />
              <span className="screen-reader-only">View</span>
            </button>
            <button
              type="button"
              className="action-btn edit"
              onClick={() => handleEditClick(driver)}
              title="Edit driver"
              aria-label={`Edit ${driver.name}'s information`}
            >
              <FaEdit />
              <span className="screen-reader-only">Edit</span>
            </button>
            <button
              type="button"
              className="action-btn delete"
              onClick={() => handleDeleteClick(driver)}
              title="Delete driver"
              aria-label={`Delete ${driver.name}`}
            >
              <FaTrash />
              <span className="screen-reader-only">Delete</span>
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <DashboardLayout>
      <div className="driver-container">
        <div className="driver-header">
          <div className="header-title">
            <h1>Driver Management</h1>
            <span className="driver-count">
              {filteredAndSortedDrivers.length} Drivers
            </span>
          </div>
        </div>

        {(error || successMessage) && (
          <div 
            className={`alert ${error ? 'alert-error' : 'alert-success'}`}
            role="alert"
            aria-live="polite"
          >
            <i className={error ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'} />
            <span>{error || successMessage}</span>
          </div>
        )}

        <div className="filter-search-container">
          <div className="search-box">
            <FaSearch className="search-icon" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by name, contact, or license..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search drivers"
            />
            {searchQuery && (
              <button 
                className="clear-search"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>
          
          <div className="status-filters">
            <div className="status-dropdown">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter drivers by status"
              >
                <option value="all">
                  All ({getStatusCounts.all})
                </option>
                <option value="available">
                  Available ({getStatusCounts.available})
                </option>
                <option value="unavailable">
                  Unavailable ({getStatusCounts.unavailable})
                </option>
              </select>
            </div>
            <button
              className="refresh-btn"
              onClick={() => fetchDriversWithTransformation()}
              aria-label="Refresh driver list"
            >
              <FaSync />
            </button>
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-container" role="status">
              <div className="spinner" />
              <p>Loading drivers...</p>
            </div>
          ) : paginatedDrivers.length > 0 ? (
            <table className="driver-table" role="grid">
              <thead>
                <tr>
                  {COLUMNS.map(({ key, label, sortable, help, width }) => (
                    <th 
                      key={key}
                      onClick={() => sortable && handleSort(key)}
                      className={sortConfig.key === key ? 'sorted' : ''}
                      role={sortable ? 'columnheader button' : 'columnheader'}
                      aria-sort={sortConfig.key === key ? sortConfig.direction : 'none'}
                      style={{ width }}
                    >
                      <div className="th-content">
                        <span>{label}</span>
                        {sortable && (
                          <span className="sort-icon">
                            {sortConfig.key === key ? 
                              (sortConfig.direction === 'asc' ? '↑' : '↓') : 
                              '↕️'}
                          </span>
                        )}
                        {help && (
                          <FaQuestionCircle 
                            className="help-icon" 
                            title={help}
                          />
                        )}
                      </div>
                    </th>
                  ))}
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDrivers.map(renderDriverRow)}
              </tbody>
            </table>
          ) : (
            <div className="no-data-message" role="status">
              <i className="fas fa-user-slash" />
              <p>No drivers found matching your search criteria.</p>
              {(searchQuery || statusFilter !== "all") && (
                <button 
                  className="clear-filters-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination" role="navigation" aria-label="Pagination">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        )}

        {showDeleteModal && selectedDriver && (
          <div className="modal-overlay" role="dialog" aria-labelledby="delete-modal-title">
            <div className="modal">
              <h2 id="delete-modal-title">
                <i className="fas fa-exclamation-triangle" />
                Confirm Delete
              </h2>
              <div className="modal-content">
                <p>Are you sure you want to delete driver &quot;{selectedDriver.name}&quot;?</p>
                <p className="warning">This action cannot be undone.</p>
              </div>
              <div className="modal-actions">
                <button 
                  className="modal-btn cancel"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedDriver(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="modal-btn confirm"
                  onClick={handleDeleteConfirm}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {showViewModal && selectedDriver && (
          <div className="modal-overlay" role="dialog" aria-labelledby="view-modal-title">
            <div className="modal">
              <h2 id="view-modal-title">
                <i className="fas fa-user" /> Driver Details
              </h2>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">Driver ID:</span>
                  <span className="value">{selectedDriver.id}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Name:</span>
                  <span className="value">{selectedDriver.name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Contact:</span>
                  <span className="value">{formatPhoneNumber(selectedDriver.contact_no)}</span>
                </div>
                <div className="detail-item">
                  <span className="label">License No:</span>
                  <span className="value">{selectedDriver.license_no}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Experience:</span>
                  <span className="value">{formatExperience(selectedDriver.experience)}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Address:</span>
                  <span className="value">{formatAddress(selectedDriver.address)}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Status:</span>
                  <span className={`status-badge ${getStatusColor(selectedDriver.status || 'available')}`}>
                    {selectedDriver.status ? selectedDriver.status.charAt(0).toUpperCase() + selectedDriver.status.slice(1) : 'Available'}
                  </span>
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  className="modal-btn cancel"
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </button>
                <button 
                  className="modal-btn primary"
                  onClick={() => handleEditClick(selectedDriver)}
                >
                  <i className="fas fa-edit" /> Edit Driver
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DriverData;
