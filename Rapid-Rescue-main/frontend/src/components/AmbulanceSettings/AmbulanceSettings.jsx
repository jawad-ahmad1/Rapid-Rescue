/* eslint-disable */
import React, { useState, useEffect } from "react";
/* eslint-enable */
import DashboardLayout from "../layouts/DashboardLayout";
import ApiService from "../../services/api/apiService";
import "./AmbulanceSettings.css";
import { FaSpinner, FaCheck, FaExclamationTriangle } from "react-icons/fa";
import { toast } from "react-hot-toast";

const SettingsContent = () => {
  // Profile settings state
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    licenseNumber: "",
    experience: "",
    profilePhoto: "",
    address: "",
    status: "available"
  });
  
  // Store the actual file object for upload
  const [photoFile, setPhotoFile] = useState(null);
  
  // Store driverId in state to ensure it's available when needed
  const [driverId, setDriverId] = useState(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ message: "", type: "" });
  const [error, setError] = useState(null);
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState(() => {
    const savedNotifications = localStorage.getItem("ambulanceNotifications");
    return savedNotifications ? JSON.parse(savedNotifications) : {
      alertSound: true,
      vibration: true
    };
  });

  // Add new state for field errors
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    email: '',
    phone: '',
    licenseNumber: '',
    experience: '',
    address: '',
    photo: ''
  });

  // Add validation functions at the top level
  const validateProfileData = (data) => {
    const errors = {};
    
    // Name validation
    if (!data.name || data.name.trim().length < 3) {
      errors.name = 'Name must be at least 3 characters long';
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Phone validation (Pakistan format)
    const phoneRegex = /^03[0-9]{9}$/;
    if (!phoneRegex.test(data.phone)) {
      errors.phone = 'Please enter a valid Pakistani mobile number (03XXXXXXXXX)';
    }
    
    // License number validation
    if (!data.licenseNumber || data.licenseNumber.trim().length < 5) {
      errors.licenseNumber = 'License number must be at least 5 characters long';
    }
    
    // Experience validation
    const experience = parseInt(data.experience);
    if (isNaN(experience) || experience < 0) {
      errors.experience = 'Experience must be a positive number';
    }
    
    // Address validation
    if (!data.address || data.address.trim().length < 10) {
      errors.address = 'Please enter a complete address (at least 10 characters)';
    }
    
    return errors;
  };

  const validatePhotoFile = (file) => {
    const errors = {};
    
    // File size validation (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      errors.size = 'Photo size must be less than 5MB';
    }
    
    // File type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      errors.type = 'Please select a valid image file (JPG, JPEG, or PNG)';
    }
    
    // Image dimensions validation (if needed)
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = function() {
        if (this.width < 200 || this.height < 200) {
          errors.dimensions = 'Image must be at least 200x200 pixels';
        }
        if (this.width > 2000 || this.height > 2000) {
          errors.dimensions = 'Image must not exceed 2000x2000 pixels';
        }
        resolve(errors);
      };
      img.onerror = function() {
        errors.loading = 'Failed to load image for validation';
        resolve(errors);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  // Define fetchProfileData function to fetch driver data from API
  const fetchProfileData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get driver profile from API
      const driverData = await ApiService.getDriverProfile();
      console.log("Fetched driver data:", driverData);
      
      // Store driver ID for later use
      if (driverData.id) {
        setDriverId(driverData.id);
        localStorage.setItem('driverId', driverData.id);
      }

      // Check if we have email
      if (driverData.email) {
        console.log("Email found:", driverData.email);
      }
      
      // Map API data to component state
      setProfileData({
        name: driverData.name || "",
        email: driverData.email || "",
        phone: driverData.contact_no || driverData.phone || "",
        licenseNumber: driverData.license_no || "",
        experience: driverData.experience || 0,
        address: driverData.address || "",
        status: driverData.status || "available",
        // Handle profile photo URL
        profilePhoto: driverData.photo ? (
          driverData.photo.startsWith('http') ? 
            driverData.photo : 
            `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${driverData.photo}`
        ) : null
      });
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(err.message || "Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch profile data on component mount
  useEffect(() => {
    fetchProfileData();
  }, []);

  // Save notification settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("ambulanceNotifications", JSON.stringify(notificationSettings));
  }, [notificationSettings]);
  
  // Handle profile data change
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validate the changed field
    const errors = validateProfileData({ ...profileData, [name]: value });
    const fieldError = errors[name];
    
    // Update field errors state
    setFieldErrors(prev => ({
      ...prev,
      [name]: fieldError || ''
    }));
    
    // Show error toast if validation fails
    if (fieldError) {
      toast.error(fieldError);
    }
    
    // Add visual feedback
    e.target.classList.add('ambulance-input-changed');
    setTimeout(() => {
      e.target.classList.remove('ambulance-input-changed');
    }, 500);
  };
  
  // Handle notification toggle
  const handleNotificationToggle = (setting) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
    // Add visual feedback
    const feedbackElement = document.getElementById(`${setting}-feedback`);
    if (feedbackElement) {
      feedbackElement.style.display = 'inline';
      setTimeout(() => {
        feedbackElement.style.display = 'none';
      }, 1000);
    }
  };
  
  // Handle change photo
  const handleChangePhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/jpg';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validate file
        const errors = await validatePhotoFile(file);
        
        if (Object.keys(errors).length > 0) {
          // Show all validation errors
          Object.values(errors).forEach(error => {
            toast.error(error);
          });
          // Update photo error state
          setFieldErrors(prev => ({
            ...prev,
            photo: Object.values(errors).join(', ')
          }));
          return;
        }

        // Clear photo error if valid
        setFieldErrors(prev => ({
          ...prev,
          photo: ''
        }));

        // Store the actual file object for upload
        setPhotoFile(file);
        
        // Preview the image
        const reader = new FileReader();
        reader.onload = (e) => {
          setProfileData(prev => ({
            ...prev,
            profilePhoto: e.target.result
          }));
          toast.success('Photo selected! Click "Save Settings" to update your profile.');
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };
  
  // Handle save settings
  const handleSaveSettings = async () => {
    try {
      // Validate all profile data before saving
      const errors = validateProfileData(profileData);
      if (Object.keys(errors).length > 0) {
        // Show all validation errors
        Object.values(errors).forEach(error => {
          toast.error(error);
        });
        return;
      }

      setIsSaving(true);
      setSaveStatus({ message: "", type: "" });

      // Ensure we have a driver ID
      const currentDriverId = driverId || localStorage.getItem('driverId');
      if (!currentDriverId) {
        throw new Error('Driver ID not found. Please refresh the page.');
      }

      // Create FormData object
      const formData = new FormData();
      
      // Append all profile data fields
      formData.append('name', profileData.name || '');
      formData.append('email', profileData.email || '');
      formData.append('contact_no', profileData.phone || '');
      formData.append('license_no', profileData.licenseNumber || '');
      formData.append('experience', profileData.experience || 0);
      formData.append('address', profileData.address || '');
      formData.append('status', profileData.status || 'available');

      // Append photo if it exists
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      console.log('Submitting form data for driver:', currentDriverId);
      
      // Update driver profile with form data
      const result = await ApiService.updateDriverWithFormData(currentDriverId, formData);
      
      if (result.success) {
        // Update local state with new data
        setProfileData(prevData => ({
          ...prevData,
          ...result.data
        }));
        
        // Clear photo file after successful upload
        setPhotoFile(null);
        
        // Update profile photo if it was changed
        if (result.data.photo) {
          setProfileData(prev => ({
            ...prev,
            profilePhoto: result.data.photo
          }));
        }
        
        setSaveStatus({
          message: "Settings saved successfully!",
          type: "success"
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus({
        message: error.message || "Failed to save settings. Please try again.",
        type: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="ambulance-dashboard">
        <div className="ambulance-main-content">
          <div className="ambulance-loading">
            <FaSpinner className="ambulance-spinner-icon" />
            <p>Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ambulance-dashboard">
      <div className="ambulance-content-wrapper ambulance-settings-wrapper">
        <div className="ambulance-settings-header">
          <h1>Settings</h1>
          <p>Manage your account settings and preferences</p>
        </div>
        
        <div className="ambulance-settings-container">
          {/* Profile Settings */}
          <div className="ambulance-settings-section">
            <h2>Profile Settings</h2>
            <div className="ambulance-profile-settings">
              <div className="ambulance-profile-image-container">
                {profileData.profilePhoto ? (
                  <img 
                    src={profileData.profilePhoto} 
                    alt="Profile" 
                    className="ambulance-profile-image"
                    onError={(e) => {
                      console.log("Profile image failed to load, using default");
                      // Use a data URL for the default avatar to avoid additional HTTP requests
                      e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e0e0e0'/%3E%3Ctext x='50' y='65' font-size='40' text-anchor='middle' fill='%23666666'%3E" + (profileData.name ? profileData.name.charAt(0).toUpperCase() : "D") + "%3C/text%3E%3C/svg%3E";
                      // Don't clear the profilePhoto state here to allow retries on refresh
                    }}
                  />
                ) : (
                  <div className="ambulance-profile-placeholder">
                    {profileData.name ? profileData.name.charAt(0).toUpperCase() : "D"}
                  </div>
                )}
                <button className="ambulance-change-photo-btn" onClick={handleChangePhoto}>Change Photo</button>
              </div>
              
              <div className="ambulance-profile-form">
                <div className="ambulance-form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    value={profileData.name} 
                    onChange={handleProfileChange}
                    className={fieldErrors.name ? 'error' : ''}
                    required
                  />
                  {fieldErrors.name && (
                    <span className="error-message">{fieldErrors.name}</span>
                  )}
                </div>
                
                <div className="ambulance-form-group">
                  <label htmlFor="email">Email</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    value={profileData.email} 
                    onChange={handleProfileChange}
                    className={fieldErrors.email ? 'error' : ''}
                  />
                  {fieldErrors.email && (
                    <span className="error-message">{fieldErrors.email}</span>
                  )}
                </div>
                
                <div className="ambulance-form-group">
                  <label htmlFor="phone">Phone Number *</label>
                  <input 
                    type="tel" 
                    id="phone" 
                    name="phone" 
                    value={profileData.phone} 
                    onChange={handleProfileChange}
                    className={fieldErrors.phone ? 'error' : ''}
                    placeholder="03XXXXXXXXX"
                    required
                  />
                  {fieldErrors.phone && (
                    <span className="error-message">{fieldErrors.phone}</span>
                  )}
                </div>
                
                <div className="ambulance-form-group">
                  <label htmlFor="licenseNumber">Driver License Number *</label>
                  <input 
                    type="text" 
                    id="licenseNumber" 
                    name="licenseNumber" 
                    value={profileData.licenseNumber} 
                    onChange={handleProfileChange}
                    className={fieldErrors.licenseNumber ? 'error' : ''}
                    required
                  />
                  {fieldErrors.licenseNumber && (
                    <span className="error-message">{fieldErrors.licenseNumber}</span>
                  )}
                </div>

                <div className="ambulance-form-group">
                  <label htmlFor="experience">Experience (Years)</label>
                  <input 
                    type="number" 
                    id="experience" 
                    name="experience" 
                    value={profileData.experience} 
                    onChange={handleProfileChange}
                    className={fieldErrors.experience ? 'error' : ''}
                    min="0"
                  />
                  {fieldErrors.experience && (
                    <span className="error-message">{fieldErrors.experience}</span>
                  )}
                </div>

                <div className="ambulance-form-group">
                  <label htmlFor="address">Address *</label>
                  <input 
                    type="text" 
                    id="address" 
                    name="address" 
                    value={profileData.address} 
                    onChange={handleProfileChange}
                    className={fieldErrors.address ? 'error' : ''}
                    required
                  />
                  {fieldErrors.address && (
                    <span className="error-message">{fieldErrors.address}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Notification Settings */}
          <div className="ambulance-settings-section">
            <h2>Notification Settings</h2>
            <div className="ambulance-notification-settings">
              <div className="ambulance-setting-item">
                <div className="ambulance-setting-info">
                  <h3>Alert Sound</h3>
                  <p>Play sound when new alerts arrive</p>
                </div>
                <div className="ambulance-setting-control">
                  <label className="ambulance-switch">
                    <input 
                      type="checkbox" 
                      checked={notificationSettings.alertSound}
                      onChange={() => handleNotificationToggle("alertSound")}
                    />
                    <span className="ambulance-slider round"></span>
                  </label>
                  <span id="alertSound-feedback" className="ambulance-setting-feedback">Updated!</span>
                </div>
              </div>
              
              <div className="ambulance-setting-item">
                <div className="ambulance-setting-info">
                  <h3>Vibration</h3>
                  <p>Vibrate when new alerts arrive</p>
                </div>
                <div className="ambulance-setting-control">
                  <label className="ambulance-switch">
                    <input 
                      type="checkbox" 
                      checked={notificationSettings.vibration}
                      onChange={() => handleNotificationToggle("vibration")}
                    />
                    <span className="ambulance-slider round"></span>
                  </label>
                  <span id="vibration-feedback" className="ambulance-setting-feedback">Updated!</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Show photo error if exists */}
          {fieldErrors.photo && (
            <div className="ambulance-form-group">
              <span className="error-message photo-error">{fieldErrors.photo}</span>
            </div>
          )}
          
          {/* Save Button */}
          <div className="ambulance-settings-actions">
            <button 
              className="ambulance-save-settings-btn" 
              onClick={handleSaveSettings}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <FaSpinner className="ambulance-button-spinner" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </button>
            
            {saveStatus.message && (
              <div className={`ambulance-save-message ${saveStatus.type}`}>
                {saveStatus.type === "success" ? (
                  <FaCheck className="ambulance-status-icon" />
                ) : (
                  <FaExclamationTriangle className="ambulance-status-icon" />
                )}
                {saveStatus.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AmbulanceSettings = () => {
  return (
    <DashboardLayout role="driver">
      <SettingsContent />
    </DashboardLayout>
  );
};

export default AmbulanceSettings; 