import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AmbulanceSidebar from "../AmbulanceDashboardLayout/AmbulanceSidebar";
import "./AmbulanceSettings.css";

// Mock data service
const mockAmbulanceService = {
  getProfile: () => {
    // Simulate API call
    return Promise.resolve({
      name: "Evano",
      email: "evano@rapidrescue.com",
      phone: "+92 300 1234567",
      licenseNumber: "DL-12345678",
      experience: "5 years",
      profilePhoto: "/profile.png"
    });
  },
  
  updateProfile: (data) => {
    // Simulate API call
    return Promise.resolve({ success: true, data });
  }
};

const AmbulanceSettings = () => {
  const navigate = useNavigate();
  
  // Profile settings state
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    licenseNumber: "",
    experience: "",
    profilePhoto: "/profile.png"
  });
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState(() => {
    const savedNotifications = localStorage.getItem("ambulanceNotifications");
    return savedNotifications ? JSON.parse(savedNotifications) : {
      alertSound: true,
      vibration: true
    };
  });
  
  // App settings state
  const [appSettings, setAppSettings] = useState(() => {
    const savedAppSettings = localStorage.getItem("ambulanceAppSettings");
    return savedAppSettings ? JSON.parse(savedAppSettings) : {
      darkMode: false
    };
  });

  // Fetch profile data on component mount
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setIsLoading(true);
        const data = await mockAmbulanceService.getProfile();
        setProfileData(data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("ambulanceNotifications", JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  useEffect(() => {
    localStorage.setItem("ambulanceAppSettings", JSON.stringify(appSettings));
    // Apply dark mode if enabled
    if (appSettings.darkMode) {
      document.body.classList.add("ambulance-dark-mode");
    } else {
      document.body.classList.remove("ambulance-dark-mode");
    }
  }, [appSettings]);
  
  // Handle profile data change
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
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
  
  // Handle app settings toggle
  const handleAppSettingToggle = (setting) => {
    setAppSettings(prev => ({
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
  
  // Handle save settings
  const handleSaveSettings = async () => {
    try {
      await mockAmbulanceService.updateProfile(profileData);
      // Show success message
      const saveMessage = document.getElementById('ambulance-save-message');
      if (saveMessage) {
        saveMessage.style.display = 'block';
        setTimeout(() => {
          saveMessage.style.display = 'none';
        }, 3000);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  // Handle change photo
  const handleChangePhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = document.querySelector('.ambulance-profile-image');
          if (img) {
            img.src = e.target.result;
            setProfileData(prev => ({
              ...prev,
              profilePhoto: e.target.result
            }));
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  if (isLoading) {
    return (
      <div className="ambulance-dashboard">
        <aside className="ambulance-sidebar">
          <AmbulanceSidebar />
        </aside>
        <div className="ambulance-main-content">
          <div className="ambulance-loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ambulance-dashboard">
      {/* Left Sidebar */}
      <aside className="ambulance-sidebar">
        <AmbulanceSidebar />
      </aside>

      {/* Main Content */}
      <div className="ambulance-main-content">
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
                  <img 
                    src={profileData.profilePhoto} 
                    alt="Profile" 
                    className="ambulance-profile-image"
                    onError={(e) => (e.target.src = "/default-profile.png")}
                  />
                  <button className="ambulance-change-photo-btn" onClick={handleChangePhoto}>Change Photo</button>
                </div>
                
                <div className="ambulance-profile-form">
                  <div className="ambulance-form-group">
                    <label htmlFor="name">Full Name</label>
                    <input 
                      type="text" 
                      id="name" 
                      name="name" 
                      value={profileData.name} 
                      onChange={handleProfileChange}
                    />
                  </div>
                  
                  <div className="ambulance-form-group">
                    <label htmlFor="email">Email</label>
                    <input 
                      type="email" 
                      id="email" 
                      name="email" 
                      value={profileData.email} 
                      onChange={handleProfileChange}
                    />
                  </div>
                  
                  <div className="ambulance-form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input 
                      type="tel" 
                      id="phone" 
                      name="phone" 
                      value={profileData.phone} 
                      onChange={handleProfileChange}
                    />
                  </div>
                  
                  <div className="ambulance-form-group">
                    <label htmlFor="licenseNumber">Driver License Number</label>
                    <input 
                      type="text" 
                      id="licenseNumber" 
                      name="licenseNumber" 
                      value={profileData.licenseNumber} 
                      onChange={handleProfileChange}
                    />
                  </div>
                  
                  <div className="ambulance-form-group">
                    <label htmlFor="experience">Experience</label>
                    <input 
                      type="text" 
                      id="experience" 
                      name="experience" 
                      value={profileData.experience} 
                      onChange={handleProfileChange}
                    />
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
            
            {/* App Settings */}
            <div className="ambulance-settings-section">
              <h2>App Settings</h2>
              <div className="ambulance-app-settings">
                <div className="ambulance-setting-item">
                  <div className="ambulance-setting-info">
                    <h3>Dark Mode</h3>
                    <p>Enable dark theme for the application</p>
                  </div>
                  <div className="ambulance-setting-control">
                    <label className="ambulance-switch">
                      <input 
                        type="checkbox" 
                        checked={appSettings.darkMode}
                        onChange={() => handleAppSettingToggle("darkMode")}
                      />
                      <span className="ambulance-slider round"></span>
                    </label>
                    <span id="darkMode-feedback" className="ambulance-setting-feedback">Updated!</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Save Button */}
            <div className="ambulance-settings-actions">
              <button className="ambulance-save-settings-btn" onClick={handleSaveSettings}>Save Settings</button>
              <span id="ambulance-save-message" className="ambulance-save-message">Settings saved successfully!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmbulanceSettings; 