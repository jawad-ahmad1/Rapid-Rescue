import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import "./adminSidebar.css"; // Fixed the import to match the actual filename
import { FaAmbulance, FaChartBar, FaUserMd, FaSignOutAlt, FaCircle, FaChevronDown, FaChevronUp } from "react-icons/fa";

const Sidebar = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userToken"); // Clear authentication
    navigate("/login"); // Redirect to login
  };

  // Format time as HH:MM AM/PM
  const formattedTime = currentTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const navItems = [
    { path: "/admin-dashboard", icon: <FaAmbulance />, label: "Alert Manager" },
    { path: "/analytics", icon: <FaChartBar />, label: "Analytics" },
    { path: "/driver-data", icon: <FaUserMd />, label: "Driver & Ambulance" },
  ];

  return (
    <div className="admin-sidebar">
      {/* Sidebar Header */}
      <div className="admin-sidebar-header">
        <h2>Rapid Rescue</h2>
        <div className="admin-time-display">{formattedTime}</div>
      </div>

      {/* Status Indicator */}
      <div className="admin-status-indicator">
        <div className="admin-status-dot online">
          <FaCircle size={10} />
        </div>
        <span>Online</span>
      </div>

      {/* Navigation Menu */}
      <nav className="admin-sidebar-nav">
        <ul>
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink to={item.path} className={({ isActive }) => (isActive ? "active" : "")}>
                <span className="admin-nav-icon">{item.icon}</span> {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile Section (Pinned to Bottom) */}
      <div className="admin-profile-container">
        <div className="admin-user-profile" onClick={() => setShowDropdown(!showDropdown)} role="button">
          <img
            src="/profile.png"
            alt="Profile"
            className="admin-profile-img"
            onError={(e) => (e.target.src = "/default-profile.png")}
          />
          <div className="admin-profile-info">
            <span className="admin-profile-name">Evano</span>
            <span className="admin-profile-role">Admin</span>
          </div>
          <span className="admin-dropdown-arrow">
            {showDropdown ? <FaChevronUp /> : <FaChevronDown />}
          </span>
        </div>

        {/* Logout Dropdown */}
        {showDropdown && (
          <div className="admin-dropdown-menu">
            <button onClick={handleLogout} className="admin-logout-btn">
              <FaSignOutAlt className="admin-logout-icon" /> Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
