import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { FaBell, FaCompass, FaCog, FaSignOutAlt, FaCircle, FaChevronDown, FaChevronUp } from "react-icons/fa";
import "./AmbulanceSidebar.css";

const AmbulanceSidebar = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasActiveAlert, setHasActiveAlert] = useState(false);
  const [profileInfo, setProfileInfo] = useState({
    name: "Evano",
    role: "Driver"
  });
  const [profilePhoto, setProfilePhoto] = useState("/profile.png");
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Check for active alerts
  useEffect(() => {
    const checkActiveAlert = () => {
      const activeAlert = localStorage.getItem("activeAlert");
      setHasActiveAlert(!!activeAlert);
    };

    // Initial check
    checkActiveAlert();

    // Set up an interval to check for active alerts
    const interval = setInterval(checkActiveAlert, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  // Load profile data from localStorage
  useEffect(() => {
    const loadProfileData = () => {
      // Get profile data
      const savedProfile = localStorage.getItem("ambulanceProfile");
      if (savedProfile) {
        const profileData = JSON.parse(savedProfile);
        setProfileInfo({
          name: profileData.name || "Evano",
          role: "Driver"
        });
      }

      // Get profile photo
      const savedPhoto = localStorage.getItem("ambulanceProfilePhoto");
      if (savedPhoto) {
        setProfilePhoto(savedPhoto);
      }
    };

    // Initial load
    loadProfileData();

    // Set up a listener for storage changes
    const handleStorageChange = (e) => {
      if (e.key === "ambulanceProfile" || e.key === "ambulanceProfilePhoto") {
        loadProfileData();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Check for changes every 3 seconds as a fallback
    const profileCheckInterval = setInterval(loadProfileData, 3000);

    // Cleanup
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(profileCheckInterval);
    };
  }, []);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userToken"); // Clear authentication
    localStorage.removeItem("activeAlert"); // Clear active alert
    navigate("/login"); // Redirect to login
  };

  // Format time as HH:MM AM/PM
  const formattedTime = currentTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className="amb-sidebar">
      {/* Sidebar Header */}
      <div className="amb-sidebar-header">
        <h2>Rapid Rescue</h2>
        <div className="amb-time-display">{formattedTime}</div>
      </div>

      {/* Status Indicator */}
      <div className="amb-status-indicator">
        <div className="amb-status-dot online">
          <FaCircle size={10} />
        </div>
        <span>Online</span>
      </div>

      {/* Navigation Links */}
      <nav className="amb-sidebar-nav">
        <ul>
          <li>
            <NavLink to="/ambulance-dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
              <FaBell className="amb-nav-icon" /> Alert Manager
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/ambulance-navigation" 
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={(e) => {
                if (hasActiveAlert) {
                  e.preventDefault();
                  navigate("/ambulance-navigation");
                }
              }}
            >
              <FaCompass className="amb-nav-icon" /> Navigation
            </NavLink>
          </li>
          <li>
            <NavLink to="/ambulance-settings" className={({ isActive }) => (isActive ? "active" : "")}>
              <FaCog className="amb-nav-icon" /> Settings
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Driver Profile */}
      <div className="amb-profile-container">
        <div className="amb-driver-profile" onClick={() => setShowDropdown(!showDropdown)} role="button">
          <img
            src={profilePhoto}
            alt="Driver Profile"
            className="amb-profile-img"
            onError={(e) => (e.target.src = "/default-profile.png")}
          />
          <div className="amb-profile-info">
            <span className="amb-profile-name">{profileInfo.name}</span>
            <span className="amb-profile-role">{profileInfo.role}</span>
          </div>
          <span className="amb-dropdown-arrow">
            {showDropdown ? <FaChevronUp /> : <FaChevronDown />}
          </span>
        </div>

        {/* Logout Dropdown */}
        {showDropdown && (
          <div className="amb-dropdown-menu">
            <button onClick={handleLogout} className="amb-logout-btn">
              <FaSignOutAlt className="amb-logout-icon" /> Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AmbulanceSidebar;
