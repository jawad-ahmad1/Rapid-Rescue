import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import DashboardLayout from '../DashboardLayout';
import ApiService from '../../../services/api/apiService';

/**
 * DriverLayout component - Wrapper for driver/ambulance pages
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to render
 * @param {string} props.title - Page title
 * @param {Array} props.actions - Custom action buttons for the header
 * @param {Array} props.additionalNavItems - Additional navigation items for the sidebar
 * @param {boolean} props.emergencyMode - Whether to show emergency styling
 */
const DriverLayout = ({ 
  children, 
  title = 'Ambulance Dashboard', 
  actions = [],
  additionalNavItems = [],
  emergencyMode = false
}) => {
  const [hasActiveAlert, setHasActiveAlert] = useState(false);
  const [alertData, setAlertData] = useState(null);

  // Check for active alerts
  useEffect(() => {
    const checkActiveAlert = async () => {
      try {
        // Sync with server to get latest alert state
        const result = await ApiService.syncActiveAlertState();
        setHasActiveAlert(result.hasActiveAlert);
        setAlertData(result.alertData);
      } catch (error) {
        console.error("Error checking active alert:", error);
        
        // Fallback to localStorage if API fails
        const activeAlert = localStorage.getItem("activeAlert");
        setHasActiveAlert(!!activeAlert);
        
        if (activeAlert) {
          try {
            setAlertData(JSON.parse(activeAlert));
          } catch (e) {
            console.error("Error parsing stored alert data:", e);
          }
        }
      }
    };

    // Initial check
    checkActiveAlert();

    // Set up interval to check periodically
    const interval = setInterval(checkActiveAlert, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardLayout role="driver" className={emergencyMode || hasActiveAlert ? 'emergency-mode' : ''}>
      {children}
    </DashboardLayout>
  );
};

DriverLayout.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  actions: PropTypes.array,
  additionalNavItems: PropTypes.array,
  emergencyMode: PropTypes.bool
};

export default DriverLayout; 