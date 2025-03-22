import PropTypes from "prop-types";
import AmbulanceSidebar from "./AmbulanceSidebar"; // Import Ambulance Sidebar
import "./AmbulanceDashboardLayout.css"; // Ensure styles are included

const AmbulanceDashboardLayout = ({ children }) => {
  return (
    <div className="ambulance-dashboard-layout">
      {/* Sidebar */}
      <aside className="ambulance-sidebar">
        <AmbulanceSidebar />
      </aside>

      {/* Main Content */}
      <main className="ambulance-main-content">
        {children}
      </main>
    </div>
  );
};

AmbulanceDashboardLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AmbulanceDashboardLayout;
