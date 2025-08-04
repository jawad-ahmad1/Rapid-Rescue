import { useState, useEffect } from "react";
import { useAuth } from "../../services/auth/authContext";
import ApiService from "../../services/api/apiService";
import AdminLayout from "../layouts/admin/AdminLayout";
import "./AdminSettings.css";
import { FaSpinner, FaCheck, FaExclamationTriangle, FaUser, FaLock, FaEnvelope, FaSave, FaBell, FaVolumeUp, FaMobile } from "react-icons/fa";
import { toast } from "react-hot-toast";

const AdminSettingsContent = () => {
  // Profile settings state
  const [profileData, setProfileData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
  });
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ message: "", type: "" });
  const [passwordStatus, setPasswordStatus] = useState({ message: "", type: "" });
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState(() => {
    const savedNotifications = localStorage.getItem("adminNotifications");
    return savedNotifications ? JSON.parse(savedNotifications) : {
      alertSound: true,
      vibration: true
    };
  });
  
  // Get current user from auth context
  const { currentUser } = useAuth();

  // Fetch profile data on component mount
  useEffect(() => {
    fetchProfileData();
  }, []);

  // Save notification settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("adminNotifications", JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  // Define fetchProfileData function to fetch admin data
  const fetchProfileData = async () => {
    try {
      setIsLoading(true);
      
      if (currentUser) {
        setProfileData({
          username: currentUser.username || "",
          firstName: currentUser.first_name || "",
          lastName: currentUser.last_name || "",
          email: currentUser.email || "",
        });
      } else {
        // Try to get current user data from API
        const userData = await ApiService.getCurrentUser();
        
        if (userData) {
          setProfileData({
            username: userData.username || "",
            firstName: userData.first_name || "",
            lastName: userData.last_name || "",
            email: userData.email || "",
          });
        } else {
          toast.error("Could not load profile data");
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle profile data change
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle password data change
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle save profile settings
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      setSaveStatus({ message: "", type: "" });
      
      // Validate form
      if (!profileData.username || !profileData.email) {
        setSaveStatus({ 
          message: "Username and email are required", 
          type: "error" 
        });
        return;
      }
      
      // Call API to update profile
      await ApiService.updateAdminProfile({
        username: profileData.username,
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        email: profileData.email
      });
      
      setSaveStatus({ 
        message: "Profile updated successfully", 
        type: "success" 
      });
      
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaveStatus({ 
        message: error.message || "Failed to update profile", 
        type: "error" 
      });
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    try {
      setIsChangingPassword(true);
      setPasswordStatus({ message: "", type: "" });
      
      // Validate form
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        setPasswordStatus({ 
          message: "All password fields are required", 
          type: "error" 
        });
        return;
      }
      
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordStatus({ 
          message: "New passwords do not match", 
          type: "error" 
        });
        return;
      }
      
      if (passwordData.newPassword.length < 8) {
        setPasswordStatus({ 
          message: "New password must be at least 8 characters", 
          type: "error" 
        });
        return;
      }
      
      // Call API to change password
      await ApiService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      
      setPasswordStatus({ 
        message: "Password changed successfully", 
        type: "success" 
      });
      
      // Clear password fields
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      
      toast.success("Password changed successfully");
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordStatus({ 
        message: error.message || "Failed to change password", 
        type: "error" 
      });
      toast.error("Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
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

  return (
    <div className="admin-settings-container">
      <h1 className="admin-settings-title">Admin Settings</h1>
      
      {isLoading ? (
        <div className="admin-settings-loading">
          <FaSpinner className="admin-spinner" />
          <p>Loading settings...</p>
        </div>
      ) : (
        <div className="admin-settings-content">
          {/* Profile Settings Section */}
          <div className="admin-settings-section">
            <h2 className="admin-section-title">
              <FaUser className="admin-section-icon" />
              Profile Settings
            </h2>
            
            <form onSubmit={handleSaveProfile} className="admin-settings-form">
              <div className="admin-form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={profileData.username}
                  onChange={handleProfileChange}
                  className="admin-input"
                  placeholder="Username"
                />
              </div>
              
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                    className="admin-input"
                    placeholder="First Name"
                  />
                </div>
                
                <div className="admin-form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={profileData.lastName}
                    onChange={handleProfileChange}
                    className="admin-input"
                    placeholder="Last Name"
                  />
                </div>
              </div>
              
              <div className="admin-form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  className="admin-input"
                  placeholder="Email"
                />
              </div>
              
              {saveStatus.message && (
                <div className={`admin-status-message ${saveStatus.type}`}>
                  {saveStatus.type === "success" ? (
                    <FaCheck className="admin-status-icon" />
                  ) : (
                    <FaExclamationTriangle className="admin-status-icon" />
                  )}
                  <span>{saveStatus.message}</span>
                </div>
              )}
              
              <button 
                type="submit" 
                className="admin-save-button"
                disabled={isSaving}
              >
                {isSaving ? (
                  <FaSpinner className="admin-spinner" />
                ) : (
                  <FaSave className="admin-button-icon" />
                )}
                Save Profile
              </button>
            </form>
          </div>
          
          {/* Password Change Section */}
          <div className="admin-settings-section">
            <h2 className="admin-section-title">
              <FaLock className="admin-section-icon" />
              Change Password
            </h2>
            
            <form onSubmit={handleChangePassword} className="admin-settings-form">
              <div className="admin-form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="admin-input"
                  placeholder="Current Password"
                />
              </div>
              
              <div className="admin-form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="admin-input"
                  placeholder="New Password"
                />
              </div>
              
              <div className="admin-form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="admin-input"
                  placeholder="Confirm New Password"
                />
              </div>
              
              {passwordStatus.message && (
                <div className={`admin-status-message ${passwordStatus.type}`}>
                  {passwordStatus.type === "success" ? (
                    <FaCheck className="admin-status-icon" />
                  ) : (
                    <FaExclamationTriangle className="admin-status-icon" />
                  )}
                  <span>{passwordStatus.message}</span>
                </div>
              )}
              
              <button 
                type="submit" 
                className="admin-save-button"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <FaSpinner className="admin-spinner" />
                ) : (
                  <FaLock className="admin-button-icon" />
                )}
                Change Password
              </button>
            </form>
          </div>
          
          {/* Notification Settings */}
          <div className="admin-settings-section">
            <div className="admin-section-title">
              <FaBell className="admin-section-icon" />
              <h2>Notification Settings</h2>
            </div>
            
            <div className="admin-notification-settings">
              <div className="admin-setting-item">
                <div className="admin-setting-info">
                  <FaVolumeUp className="setting-icon" />
                  <h3>Alert Sound</h3>
                  <p>Play sound when new alerts arrive</p>
                </div>
                <div className="admin-setting-control">
                  <label className="admin-switch">
                    <input 
                      type="checkbox" 
                      checked={notificationSettings.alertSound}
                      onChange={() => handleNotificationToggle("alertSound")}
                    />
                    <span className="admin-slider round"></span>
                  </label>
                  <span id="alertSound-feedback" className="admin-setting-feedback">Updated!</span>
                </div>
              </div>
              
              <div className="admin-setting-item">
                <div className="admin-setting-info">
                  <FaMobile className="setting-icon" />
                  <h3>Vibration</h3>
                  <p>Vibrate when new alerts arrive</p>
                </div>
                <div className="admin-setting-control">
                  <label className="admin-switch">
                    <input 
                      type="checkbox" 
                      checked={notificationSettings.vibration}
                      onChange={() => handleNotificationToggle("vibration")}
                    />
                    <span className="admin-slider round"></span>
                  </label>
                  <span id="vibration-feedback" className="admin-setting-feedback">Updated!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminSettings = () => {
  return (
    <AdminLayout title="Settings">
      <AdminSettingsContent />
    </AdminLayout>
  );
};

export default AdminSettings; 