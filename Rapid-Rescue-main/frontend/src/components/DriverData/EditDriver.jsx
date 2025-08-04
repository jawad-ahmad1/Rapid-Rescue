import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../layouts/admin/AdminLayout";
import ApiService from "../../services/api/apiService";
import "./EditDriver.css";
import { 
  FaUser, 
  FaIdCard, 
  FaPhone, 
  FaEnvelope, 
  FaMapMarkerAlt, 
  FaLock,
  FaArrowLeft,
  FaSave,
  FaTimes,
  FaSpinner,
  FaExclamationCircle,
  FaCheckCircle,
  FaKey,
  FaRandom
} from "react-icons/fa";

const EditDriver = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    name: "",
    contact_no: "",
    license_no: "",
    experience: 0,
    address: "",
    status: "available",
    username: "",
    email: "",
    user_id: null
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [formErrors, setFormErrors] = useState({});

  // Fetch driver data on component mount
  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const driver = await ApiService.getDriverById(id);
        
        if (driver && (driver.username || driver.email)) {
          localStorage.setItem('currentDriver_' + id, JSON.stringify({
            username: driver.username,
            email: driver.email,
            user_id: driver.user_id
          }));
        }
        
        const updatedFormData = {
          name: driver.name || "",
          contact_no: driver.phone || driver.contact_no || "",
          license_no: driver.license_no || "",
          experience: driver.experience || 0,
          address: driver.address || "",
          status: driver.status || "available",
          username: driver.username || "",
          email: driver.email || "",
          user_id: driver.user_id || null
        };
        
        setFormData(updatedFormData);
      } catch (err) {
        setError("Failed to load driver data. " + (err.message || "Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    fetchDriverData();
  }, [id]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }
    
    if (!formData.contact_no.trim()) {
      errors.contact_no = "Contact number is required";
    } else if (!/^\d{11}$/.test(formData.contact_no)) {
      errors.contact_no = "Contact number must be 11 digits";
    }
    
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }
    
    if (!formData.license_no.trim()) {
      errors.license_no = "License number is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleResetPasswordChange = (e) => {
    setResetPassword(e.target.value);
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetPassword(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await ApiService.updateDriver(id, formData);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/admin-driver-management');
        }, 2000);
      }
    } catch (err) {
      setError(err.message || 'Failed to update driver');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      setPasswordLoading(false);
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      setPasswordLoading(false);
      return;
    }
    
    try {
      await ApiService.ensureAuthenticated();
      
      const result = await ApiService.changePassword(
        id, 
        passwordData.currentPassword, 
        passwordData.newPassword
      );
      
      if (result.success) {
        setPasswordSuccess('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setPasswordError(result.message || 'Failed to change password');
      }
    } catch (error) {
      setPasswordError(error.message || 'An error occurred while changing the password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin-driver-management');
  };

  return (
    <AdminLayout title="Edit Driver">
      <div className="edit-driver-container">
        <div className="edit-header">
          <div className="header-left">
            <button 
              className="back-button" 
              onClick={handleCancel}
              aria-label="Back to driver list"
            >
              <FaArrowLeft /> Back to Driver List
            </button>
            <h1>Edit Driver</h1>
          </div>
        </div>

        {error && (
          <div className="error-message" role="alert">
            <FaExclamationCircle />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="success-message" role="status">
            <FaCheckCircle />
            <span>Driver updated successfully! Redirecting...</span>
          </div>
        )}

        {loading ? (
          <div className="loading-container" role="status">
            <FaSpinner className="icon-spin" />
            <p>Loading driver data...</p>
          </div>
        ) : (
          <div className="edit-form-container">
            <div className="form-tabs">
              <button
                className={`form-tab ${activeTab === 'basic' ? 'active' : ''}`}
                onClick={() => setActiveTab('basic')}
              >
                <FaUser /> Basic Information
              </button>
              <button
                className={`form-tab ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                <FaLock /> Security Settings
              </button>
            </div>

            {activeTab === 'basic' && (
              <form onSubmit={handleSubmit} className="form-section">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="name" className="required-field">
                      <FaUser /> Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={formErrors.name ? 'has-error' : ''}
                      aria-invalid={formErrors.name ? 'true' : 'false'}
                      required
                    />
                    {formErrors.name && (
                      <span className="error-text" role="alert">{formErrors.name}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="contact_no" className="required-field">
                      <FaPhone /> Contact Number
                    </label>
                    <input
                      type="tel"
                      id="contact_no"
                      name="contact_no"
                      value={formData.contact_no}
                      onChange={handleChange}
                      className={formErrors.contact_no ? 'has-error' : ''}
                      aria-invalid={formErrors.contact_no ? 'true' : 'false'}
                      required
                    />
                    {formErrors.contact_no && (
                      <span className="error-text" role="alert">{formErrors.contact_no}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="email" className="required-field">
                      <FaEnvelope /> Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={formErrors.email ? 'has-error' : ''}
                      aria-invalid={formErrors.email ? 'true' : 'false'}
                      required
                    />
                    {formErrors.email && (
                      <span className="error-text" role="alert">{formErrors.email}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="license_no" className="required-field">
                      <FaIdCard /> License Number
                    </label>
                    <input
                      type="text"
                      id="license_no"
                      name="license_no"
                      value={formData.license_no}
                      onChange={handleChange}
                      className={formErrors.license_no ? 'has-error' : ''}
                      aria-invalid={formErrors.license_no ? 'true' : 'false'}
                      required
                    />
                    {formErrors.license_no && (
                      <span className="error-text" role="alert">{formErrors.license_no}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="experience">
                      <FaUser /> Experience (years)
                    </label>
                    <input
                      type="number"
                      id="experience"
                      name="experience"
                      value={formData.experience}
                      onChange={handleChange}
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="status">
                      <FaUser /> Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                    >
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="address">
                      <FaMapMarkerAlt /> Address
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      rows="3"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancel}
                  >
                    <FaTimes /> Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="icon-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <FaSave /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'security' && (
              <div className="form-section">
                <div className="security-options">
                  <div className="security-card">
                    <h3><FaKey /> Change Password</h3>
                    <form onSubmit={handlePasswordSubmit}>
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
                      {passwordError && (
                        <div className="error-message" role="alert">
                          <FaExclamationCircle />
                          <span>{passwordError}</span>
                        </div>
                      )}
                      {passwordSuccess && (
                        <div className="success-message" role="status">
                          <FaCheckCircle />
                          <span>{passwordSuccess}</span>
                        </div>
                      )}
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={passwordLoading}
                      >
                        {passwordLoading ? (
                          <>
                            <FaSpinner className="icon-spin" /> Updating...
                          </>
                        ) : (
                          <>
                            <FaKey /> Update Password
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  <div className="security-card">
                    <h3><FaRandom /> Reset Password</h3>
                    <div className="form-group">
                      <label htmlFor="resetPassword">New Password</label>
                      <div className="password-input-group">
                        <input
                          type="text"
                          id="resetPassword"
                          value={resetPassword}
                          onChange={handleResetPasswordChange}
                          readOnly
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={generateRandomPassword}
                        >
                          <FaRandom /> Generate
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {/* Implement reset password logic */}}
                    >
                      <FaKey /> Reset Password
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default EditDriver; 