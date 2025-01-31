import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Sidebar.css"; // Ensure styles are correct

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);

  const navItems = [
    { path: "/admin-dashboard", icon: "🚨", label: "Alert Manager" },
    { path: "/analytics", icon: "📊", label: "Analytics" },
    { path: "/drivers", icon: "🚑", label: "Driver & Ambulance" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("userToken"); // Clear authentication
    navigate("/login"); // Redirect to login
  };

  return (
    <div className="sidebar">
      {/* Logo Section */}
      <div className="logo" onClick={() => navigate("/admin-dashboard")}>
        <img src="/public/Dashboard-logo.jpg" alt="Dashboard Logo" />
        <span className="logo-text">Dashboard</span>
      </div>

      {/* Navigation Menu */}
      <nav className="nav-container">
        {navItems.map((item) => (
          <div
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
            onClick={() => navigate(item.path)}
            role="button"
            tabIndex={0}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>

      {/* User Profile Section (Pinned to Bottom) */}
      <div className="profile-container">
        <div className="user-profile" onClick={() => setShowDropdown(!showDropdown)} role="button">
          <img
            src="/profile.png"
            alt="Profile"
            className="profile-img"
            onError={(e) => (e.target.src = "/default-profile.png")}
          />
          <div className="user-info">
            <span className="user-name">Evano</span>
            <span className="user-role">Admin</span>
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

export default Sidebar;
