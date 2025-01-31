import PropTypes from 'prop-types';
import Sidebar from './Sidebar';
import "./DashboardLayout.css"; // Ensure styles are included

const DashboardLayout = ({ children }) => {
  return (
    <div className="dashboard-layout">
      <div className="layout-container">
        {/* Sidebar */}
        <aside className="sidebar-container">
          <Sidebar />
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

DashboardLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DashboardLayout;
