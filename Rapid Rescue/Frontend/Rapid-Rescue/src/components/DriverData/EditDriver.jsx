import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../Layout/adminSidebar";
import MockApiService from "../../services/mockApi/mockApiService";
import "./EditDriver.css";

const EditDriver = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    serviceProvider: "1122",
    cnic: "",
    location: "Lahore",
    status: "available"
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Fetch driver data on component mount
  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await MockApiService.getDriverById(id);
        const driver = response.data;
        
        // Populate form with driver data
        setFormData({
          name: driver.name || "",
          phone: driver.phone || "",
          serviceProvider: "1122", // Default value
          cnic: driver.cnic || "35201-" + Math.floor(Math.random() * 10000000) + "-" + Math.floor(Math.random() * 10),
          location: driver.location || "Lahore",
          status: driver.status || "available"
        });
      } catch (err) {
        console.error("Error fetching driver:", err);
        setError("Failed to load driver data. " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDriverData();
  }, [id]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle password form input changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Prepare the data for the API
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        serviceProvider: formData.serviceProvider,
        cnic: formData.cnic,
        location: formData.location,
        status: formData.status
      };

      // If password change is requested, add password data
      if (showPasswordChange && passwordData.newPassword) {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          throw new Error("New passwords do not match");
        }
        updateData.password = passwordData.newPassword;
      }

      // Call the API to update the driver
      const response = await fetch(`http://127.0.0.1:8000/api/drivers/${id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors from the backend
        if (response.status === 400 && data.errors) {
          const backendErrors = {};
          Object.keys(data.errors).forEach(key => {
            backendErrors[key] = data.errors[key][0];
          });
          setError("Please fix the validation errors");
          return;
        }
        throw new Error(data.message || "Failed to update driver");
      }

      setSuccess(true);
      setTimeout(() => {
        navigate("/driver-data");
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to update driver. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle password form submission
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // In a real app, you would call an API to update the password
      // For our mock API, we'll just simulate a successful update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(true);
      setShowPasswordChange(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      
      // Show success message
      setError({ type: 'success', message: 'Password updated successfully!' });
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      setError("Failed to update password: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="edit-driver-container">
        <div className="edit-header">
          <button className="back-button" onClick={() => navigate("/driver-data")}>
            <i className="fas fa-arrow-left"></i> Back to Drivers
          </button>
          <h1>Edit Driver</h1>
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

        {loading && !success ? (
          <div className="loading-container">
            <i className="fas fa-spinner fa-spin"></i>
            <p className="loading-text">Loading driver data...</p>
          </div>
        ) : success ? (
          <div className="success-message">
            <i className="fas fa-check-circle"></i>
            Driver updated successfully! Redirecting to driver list...
          </div>
        ) : (
          <div className="edit-form-container">
            <div className="form-tabs">
              <button 
                className={`form-tab ${!showPasswordChange ? 'active' : ''}`}
                onClick={() => setShowPasswordChange(false)}
              >
                <i className="fas fa-user"></i> Driver Information
              </button>
              <button 
                className={`form-tab ${showPasswordChange ? 'active' : ''}`}
                onClick={() => setShowPasswordChange(true)}
              >
                <i className="fas fa-key"></i> Change Password
              </button>
            </div>

            {!showPasswordChange ? (
              <form onSubmit={handleSubmit} className="edit-form">
                <div className="form-group">
                  <label htmlFor="name">Driver Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    type="text"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cnic">CNIC Number</label>
                  <input
                    type="text"
                    id="cnic"
                    name="cnic"
                    value={formData.cnic}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="serviceProvider">Service Provider</label>
                  <select
                    id="serviceProvider"
                    name="serviceProvider"
                    value={formData.serviceProvider}
                    onChange={handleChange}
                  >
                    <option value="1122">1122</option>
                    <option value="Edhi">Edhi</option>
                    <option value="Chhipa">Chhipa</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="location">Location</label>
                  <select
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                  >
                    <option value="Lahore">Lahore</option>
                    <option value="Karachi">Karachi</option>
                    <option value="Islamabad">Islamabad</option>
                    <option value="Peshawar">Peshawar</option>
                    <option value="Quetta">Quetta</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="available">Available</option>
                    <option value="on-duty">On Duty</option>
                    <option value="off-duty">Off Duty</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => navigate("/driver-data")}
                  >
                    <i className="fas fa-times"></i> Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="save-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save"></i> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="password-form">
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>

                <div className="password-requirements">
                  <h4><i className="fas fa-shield-alt"></i> Password Requirements</h4>
                  <ul>
                    <li className={passwordData.newPassword.length >= 6 ? 'met' : ''}>
                      <i className={`fas ${passwordData.newPassword.length >= 6 ? 'fa-check' : 'fa-times'}`}></i>
                      At least 6 characters long
                    </li>
                    <li className={/[A-Z]/.test(passwordData.newPassword) ? 'met' : ''}>
                      <i className={`fas ${/[A-Z]/.test(passwordData.newPassword) ? 'fa-check' : 'fa-times'}`}></i>
                      Contains at least one uppercase letter
                    </li>
                    <li className={/[0-9]/.test(passwordData.newPassword) ? 'met' : ''}>
                      <i className={`fas ${/[0-9]/.test(passwordData.newPassword) ? 'fa-check' : 'fa-times'}`}></i>
                      Contains at least one number
                    </li>
                  </ul>
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => setShowPasswordChange(false)}
                  >
                    <i className="fas fa-times"></i> Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="save-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Updating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-key"></i> Update Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditDriver; 