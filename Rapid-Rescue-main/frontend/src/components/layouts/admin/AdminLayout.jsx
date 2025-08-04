import PropTypes from 'prop-types';
import DashboardLayout from '../DashboardLayout';

/**
 * AdminLayout component - Wrapper for admin pages
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to render
 * @param {string} props.title - Page title
 */
const AdminLayout = ({ children, title = 'Dashboard' }) => {
  return (
    <DashboardLayout role="admin">
      {children}
    </DashboardLayout>
  );
};

AdminLayout.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string
};

export default AdminLayout; 