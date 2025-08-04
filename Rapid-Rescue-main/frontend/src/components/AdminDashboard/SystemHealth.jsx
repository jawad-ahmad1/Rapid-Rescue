import React, { useState, useEffect } from 'react';
import { FaSync, FaCheck, FaTimes, FaCar, FaAmbulance, FaUserMd, FaBell, FaExclamationTriangle } from 'react-icons/fa';
import ApiService from '../../services/api/apiService';
import './SystemHealth.css';

const SystemHealth = () => {
  const [stats, setStats] = useState({
    drivers: { total: 0, available: 0, unavailable: 0, invalid: 0 },
    ambulances: { total: 0, available: 0, unavailable: 0, invalid: 0 },
    alerts: { total: 0, pending: 0, assigned: 0, completed: 0 }
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isCleaningAlerts, setIsCleaningAlerts] = useState(false);
  const [alertCleanupResult, setAlertCleanupResult] = useState(null);
  
  // Fetch stats on component mount
  useEffect(() => {
    fetchStats();
  }, []);
  
  // Function to fetch statistics
  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get driver statistics
      const drivers = await ApiService.getAllDrivers();
      const driverStats = {
        total: drivers.length,
        available: drivers.filter(d => d.status === 'available').length,
        unavailable: drivers.filter(d => d.status === 'unavailable').length,
        invalid: drivers.filter(d => d.status !== 'available' && d.status !== 'unavailable').length
      };
      
      // Get ambulance statistics
      const ambulances = await ApiService.getAllAmbulances();
      const ambulanceStats = {
        total: ambulances.length,
        available: ambulances.filter(a => a.status === 'available').length,
        unavailable: ambulances.filter(a => a.status === 'unavailable').length,
        invalid: ambulances.filter(a => a.status !== 'available' && a.status !== 'unavailable').length
      };
      
      // Get alert statistics
      const alerts = await ApiService.getAllAlerts();
      const alertStats = {
        total: alerts.length,
        pending: alerts.filter(a => a.status === 'pending').length,
        assigned: alerts.filter(a => a.status === 'assigned').length,
        completed: alerts.filter(a => a.status === 'complete').length
      };
      
      setStats({
        drivers: driverStats,
        ambulances: ambulanceStats,
        alerts: alertStats
      });
    } catch (err) {
      console.error("Error fetching statistics:", err);
      setError("Failed to load system statistics. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to run database cleanup
  const handleCleanup = async () => {
    setIsCleaningUp(true);
    setCleanupResult(null);
    
    try {
      const result = await ApiService.cleanDatabaseInconsistencies();
      
      if (result.success) {
        setCleanupResult({
          success: true,
          message: result.message,
          updates: result.updates
        });
        
        // Refresh stats after cleanup
        await fetchStats();
      } else {
        setCleanupResult({
          success: false,
          message: result.message || "Cleanup failed with unknown error"
        });
      }
    } catch (err) {
      console.error("Error during cleanup:", err);
      setCleanupResult({
        success: false,
        message: err.message || "An unexpected error occurred during cleanup"
      });
    } finally {
      setIsCleaningUp(false);
    }
  };
  
  // Function to handle alert cleanup
  const handleAlertCleanup = async (force = false) => {
    setIsCleaningAlerts(true);
    setAlertCleanupResult(null);
    
    try {
      const result = await ApiService.cleanAlerts(force);
      
      if (result.success) {
        setAlertCleanupResult({
          success: true,
          message: result.message,
          updates: result.updates,
          details: result.details
        });
        
        // Refresh stats after cleanup
        await fetchStats();
      } else {
        setAlertCleanupResult({
          success: false,
          message: result.message || "Alert cleanup failed with unknown error"
        });
      }
    } catch (err) {
      console.error("Error during alert cleanup:", err);
      setAlertCleanupResult({
        success: false,
        message: err.message || "An unexpected error occurred during alert cleanup"
      });
    } finally {
      setIsCleaningAlerts(false);
    }
  };
  
  return (
    <div className="system-health-container">
      <div className="system-health-header">
        <h2>System Health Monitor</h2>
        <button 
          className="refresh-button" 
          onClick={fetchStats} 
          disabled={isLoading}
        >
          <FaSync className={isLoading ? "spinning" : ""} /> Refresh
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          <FaTimes /> {error}
        </div>
      )}
      
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-header">
            <FaUserMd className="stat-icon driver" />
            <h3>Drivers</h3>
          </div>
          <div className="stat-body">
            <div className="stat-item">
              <span>Total:</span>
              <span>{stats.drivers.total}</span>
            </div>
            <div className="stat-item">
              <span>Available:</span>
              <span className="available">{stats.drivers.available}</span>
            </div>
            <div className="stat-item">
              <span>Unavailable:</span>
              <span className="unavailable">{stats.drivers.unavailable}</span>
            </div>
            {stats.drivers.invalid > 0 && (
              <div className="stat-item error">
                <span>Invalid Status:</span>
                <span>{stats.drivers.invalid}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <FaAmbulance className="stat-icon ambulance" />
            <h3>Ambulances</h3>
          </div>
          <div className="stat-body">
            <div className="stat-item">
              <span>Total:</span>
              <span>{stats.ambulances.total}</span>
            </div>
            <div className="stat-item">
              <span>Available:</span>
              <span className="available">{stats.ambulances.available}</span>
            </div>
            <div className="stat-item">
              <span>Unavailable:</span>
              <span className="unavailable">{stats.ambulances.unavailable}</span>
            </div>
            {stats.ambulances.invalid > 0 && (
              <div className="stat-item error">
                <span>Invalid Status:</span>
                <span>{stats.ambulances.invalid}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <FaCar className="stat-icon alert" />
            <h3>Alerts</h3>
          </div>
          <div className="stat-body">
            <div className="stat-item">
              <span>Total:</span>
              <span>{stats.alerts.total}</span>
            </div>
            <div className="stat-item">
              <span>Pending:</span>
              <span className="pending">{stats.alerts.pending}</span>
            </div>
            <div className="stat-item">
              <span>Assigned:</span>
              <span className="assigned">{stats.alerts.assigned}</span>
            </div>
            <div className="stat-item">
              <span>Completed:</span>
              <span className="completed">{stats.alerts.completed}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="system-actions">
        <div className="action-card">
          <h3>System Maintenance</h3>
          <p>Fix data inconsistencies and ensure proper driver/ambulance status synchronization.</p>
          
          <button 
            className="cleanup-button" 
            onClick={handleCleanup} 
            disabled={isCleaningUp || isLoading}
          >
            {isCleaningUp ? "Cleaning..." : "Run Database Cleanup"}
          </button>
          
          {cleanupResult && (
            <div className={`cleanup-result ${cleanupResult.success ? 'success' : 'error'}`}>
              <p>{cleanupResult.message}</p>
              {cleanupResult.success && cleanupResult.updates && (
                <div className="cleanup-details">
                  <p>Updated {cleanupResult.updates.driver_updates || 0} drivers</p>
                  <p>Fixed {cleanupResult.updates.alert_updates || 0} alerts</p>
                  <p>Updated {cleanupResult.updates.ambulance_updates || 0} ambulances</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="action-card alert-cleanup">
          <div className="action-header">
            <FaBell className="action-icon alert" />
            <h3>Alert Management</h3>
          </div>
          <p>
            Clean up inconsistent alert cards and synchronize driver statuses.
            This ensures only actively accepted alerts are assigned to drivers.
          </p>
          
          <div className="button-group">
            <button 
              className="cleanup-button" 
              onClick={() => handleAlertCleanup(false)} 
              disabled={isCleaningAlerts || isLoading}
            >
              {isCleaningAlerts ? "Cleaning..." : "Clean Alert Cards"}
            </button>
            
            <button 
              className="cleanup-button force" 
              onClick={() => handleAlertCleanup(true)} 
              disabled={isCleaningAlerts || isLoading}
              title="Reset ALL assigned alerts to pending status"
            >
              <FaExclamationTriangle /> Force Reset All
            </button>
          </div>
          
          {alertCleanupResult && (
            <div className={`cleanup-result ${alertCleanupResult.success ? 'success' : 'error'}`}>
              <p>{alertCleanupResult.message}</p>
              {alertCleanupResult.success && alertCleanupResult.details && (
                <div className="cleanup-details">
                  <p>Fixed {alertCleanupResult.details.alerts_fixed || 0} alert cards</p>
                  <p>Updated {alertCleanupResult.details.drivers_updated || 0} driver statuses</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemHealth; 