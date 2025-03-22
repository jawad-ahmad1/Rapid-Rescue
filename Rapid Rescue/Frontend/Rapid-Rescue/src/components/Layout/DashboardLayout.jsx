import PropTypes from 'prop-types';
import Sidebar from './adminSidebar';
import "./DashboardLayout.css"; // Ensure styles are included

const DashboardLayout = ({ children }) => {
  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
};

DashboardLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DashboardLayout;
