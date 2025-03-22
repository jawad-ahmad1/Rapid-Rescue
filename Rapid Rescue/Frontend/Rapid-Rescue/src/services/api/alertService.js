import { mockDatabase } from '../mockApi/mockDatabase';

export const alertService = {
  // Get all alerts
  getAllAlerts: async () => {
    try {
      const data = await mockDatabase.getAllAlerts();
      return data;
    } catch (error) {
      console.error('Error fetching alerts:', error);
      throw error;
    }
  },

  // Get alert by ID
  getAlertById: async (id) => {
    try {
      const data = await mockDatabase.getAlertById(id);
      return data;
    } catch (error) {
      console.error('Error fetching alert:', error);
      throw error;
    }
  },

  // Update alert status
  updateAlertStatus: async (id, status) => {
    try {
      const data = await mockDatabase.updateAlertStatus(id, status);
      return data;
    } catch (error) {
      console.error('Error updating alert status:', error);
      throw error;
    }
  },

  // Add new alert
  addAlert: async (location, coordinates) => {
    try {
      const data = await mockDatabase.addAlert(location, coordinates);
      return data;
    } catch (error) {
      console.error('Error adding new alert:', error);
      throw error;
    }
  },

  // Update alert
  updateAlert: async (id, updateData) => {
    try {
      const data = await mockDatabase.updateAlert(id, updateData);
      return data;
    } catch (error) {
      console.error('Error updating alert:', error);
      throw error;
    }
  }
}; 