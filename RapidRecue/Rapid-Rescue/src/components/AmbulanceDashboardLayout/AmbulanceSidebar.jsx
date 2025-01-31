import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./AmbulanceSidebar.css";

const AmbulanceSidebar = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("userToken"); // Clear authentication
    navigate("/login"); // Redirect to login
  };

  return (
    <div className="ambulance-sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <h2>🚑 Ambulance Panel</h2>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink to="/ambulance-dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
              🔔 Alert Manager
            </NavLink>
          </li>
          <li>
            <NavLink to="/ambulance-navigation" className={({ isActive }) => (isActive ? "active" : "")}>
              🛠️ Navigation
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Driver Profile */}
      <div className="profile-container">
        <div className="driver-profile" onClick={() => setShowDropdown(!showDropdown)} role="button">
          <img
            src="/profile.png"
            alt="Driver Profile"
            className="profile-img"
            onError={(e) => (e.target.src = "/default-profile.png")}
          />
          <div className="profile-info">
            <span className="profile-name">Evano</span>
            <span className="profile-role">Driver</span>
          </div>
          <span className="dropdown-arrow">▼</span>
        </div>

        {/* Logout Dropdown */}
        {showDropdown && (
          <div className="dropdown-menu">
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AmbulanceSidebar;
