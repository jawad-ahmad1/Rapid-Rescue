import { 
  mockAccidentData, 
  generateHeatmapData, 
  generateStatistics, 
  getAccidentsByDateRange,
  getAccidentsByLocation,
  getAccidentHotspots,
  mockAmbulanceData,
  mockDriverData,
  mockAmbulanceAlerts
} from './mockData';

// Simulate network delay
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// To store active alerts in memory for simulation
let activeAlerts = [...mockAmbulanceAlerts];
let alertCounter = 100;

// For simulation - new alerts appear very infrequently to allow for slow animations
let simulationEnabled = true;
let lastSimulationTime = Date.now();
const simulationInterval = 120000; // 120 seconds minimum between new alerts (doubled from 60s)
const simulationChance = 0.2; // 20% chance to get a new alert when the interval passes (reduced from 30%)

// Track if an alert was recently added to prevent multiple alerts appearing too close together
let recentlyAddedAlert = false;
const cooldownPeriod = 15000; // 15 second cooldown after adding an alert

// Generate a new random alert for simulation
const generateRandomAlert = () => {
  alertCounter++;
  
  // Randomize location from a predefined list
  const locations = [
    "DHA Phase 6 Lahore", 
    "Model Town Block C Lahore", 
    "Cavalry Ground Lahore", 
    "Gulberg III Lahore", 
    "Faisal Town Lahore"
  ];
  
  // Randomize coordinates - keeping them within Lahore area
  const baseLatitude = 31.5;
  const baseLongitude = 74.3;
  
  // Get current time in 12-hour format
  const now = new Date();
  const hours = now.getHours() % 12 || 12;
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
  const timeString = `${hours}:${minutes} ${ampm}`;
  
  // Create a new alert
  return {
    id: `#${22345 + alertCounter}`,
    time: timeString,
    date: "Today",
    location: locations[Math.floor(Math.random() * locations.length)],
    status: "Waiting",
    driver: "Not Assigned",
    driverName: "Not Assigned",
    contactNo: null,
    responseTime: null,
    coordinates: {
      lat: baseLatitude + (Math.random() * 0.1 - 0.05),
      lng: baseLongitude + (Math.random() * 0.1 - 0.05)
    },
    accidentClip: `/accident${Math.floor(Math.random() * 5) + 1}.mp4`,
    timeRemaining: 30
  };
};

// Keep track of previous response to prevent unnecessary updates
let previousAlertResponse = null;

// Mock API service
const MockApiService = {
  // Get all accidents
  getAccidents: async () => {
    // Simulate network delay (300-800ms)
    await delay(300 + Math.random() * 500);
    
    // Simulate success response
    return {
      success: true,
      data: mockAccidentData,
      message: 'Accidents fetched successfully'
    };
  },
  
  // Get accident by ID
  getAccidentById: async (id) => {
    await delay(200 + Math.random() * 300);
    
    const accident = mockAccidentData.find(a => a.id === parseInt(id));
    
    if (!accident) {
      // Simulate 404 error
      throw new Error('Accident not found');
    }
    
    return {
      success: true,
      data: accident,
      message: 'Accident fetched successfully'
    };
  },
  
  // Get accidents by status
  getAccidentsByStatus: async (status) => {
    await delay(300 + Math.random() * 500);
    
    const filteredAccidents = mockAccidentData.filter(a => a.status === status);
    
    return {
      success: true,
      data: filteredAccidents,
      message: `${filteredAccidents.length} accidents with status '${status}' found`
    };
  },
  
  // Get accidents by date range
  getAccidentsByDateRange: async (startDate, endDate) => {
    await delay(300 + Math.random() * 500);
    
    const filteredAccidents = getAccidentsByDateRange(startDate, endDate);
    
    return {
      success: true,
      data: filteredAccidents,
      message: `${filteredAccidents.length} accidents found in the specified date range`
    };
  },
  
  // Get accidents by location
  getAccidentsByLocation: async (location) => {
    await delay(300 + Math.random() * 500);
    
    const filteredAccidents = getAccidentsByLocation(location);
    
    return {
      success: true,
      data: filteredAccidents,
      message: `${filteredAccidents.length} accidents found in ${location}`
    };
  },
  
  // Get accident hotspots
  getAccidentHotspots: async () => {
    await delay(400 + Math.random() * 600);
    
    const hotspots = getAccidentHotspots();
    
    return {
      success: true,
      data: hotspots,
      message: `${hotspots.length} accident hotspots identified`
    };
  },
  
  // Get heatmap data
  getHeatmapData: async () => {
    await delay(400 + Math.random() * 600);
    
    const heatmapData = generateHeatmapData();
    
    return {
      success: true,
      data: heatmapData,
      message: 'Heatmap data generated successfully'
    };
  },
  
  // Get dashboard statistics
  getStatistics: async () => {
    await delay(200 + Math.random() * 300);
    
    const statistics = generateStatistics();
    
    return {
      success: true,
      data: statistics,
      message: 'Statistics generated successfully'
    };
  },
  
  // Get all ambulances
  getAmbulances: async () => {
    await delay(300 + Math.random() * 500);
    
    return {
      success: true,
      data: mockAmbulanceData,
      message: 'Ambulances fetched successfully'
    };
  },
  
  // Get ambulance by ID
  getAmbulanceById: async (id) => {
    await delay(200 + Math.random() * 300);
    
    const ambulance = mockAmbulanceData.find(a => a.id === id);
    
    if (!ambulance) {
      throw new Error('Ambulance not found');
    }
    
    return {
      success: true,
      data: ambulance,
      message: 'Ambulance fetched successfully'
    };
  },
  
  // Get all drivers
  getDrivers: async () => {
    await delay(300 + Math.random() * 500);
    
    return {
      success: true,
      data: mockDriverData,
      message: 'Drivers fetched successfully'
    };
  },
  
  // Get driver by ID
  getDriverById: async (id) => {
    await delay(200 + Math.random() * 300);
    
    const driver = mockDriverData.find(d => d.id === id);
    
    if (!driver) {
      throw new Error('Driver not found');
    }
    
    return {
      success: true,
      data: driver,
      message: 'Driver fetched successfully'
    };
  },
  
  // Simulate error (for testing error handling)
  simulateError: async () => {
    await delay(300);
    
    // Simulate server error
    throw new Error('Internal server error');
  },
  
  // Simulate slow response (for testing loading states)
  simulateSlowResponse: async () => {
    // Simulate very slow network (3-5 seconds)
    await delay(3000 + Math.random() * 2000);
    
    return {
      success: true,
      data: mockAccidentData,
      message: 'Slow response completed'
    };
  },
  
  // Simulate network timeout
  simulateTimeout: async () => {
    // Simulate network timeout (8 seconds)
    await delay(8000);
    
    // This should never be reached if timeout is properly handled
    return {
      success: true,
      data: [],
      message: 'Response after timeout'
    };
  },
  
  // Get driver performance data
  getDriverPerformance: async (driverId) => {
    await delay();
    
    // Generate random performance data
    return {
      success: true,
      data: {
        responseTime: (Math.random() * 5 + 5).toFixed(1), // 5-10 minutes
        successRate: Math.floor(Math.random() * 20 + 80), // 80-100%
        rating: (Math.random() * 2 + 3).toFixed(1), // 3-5
        totalMissions: Math.floor(Math.random() * 50 + 100), // 100-150
        successfulMissions: Math.floor(Math.random() * 40 + 100), // 100-140
        cancelledMissions: Math.floor(Math.random() * 10) // 0-10
      },
      message: 'Driver performance data fetched successfully'
    };
  },

  // Get driver history data
  getDriverHistory: async (driverId) => {
    await delay();
    
    // Generate random history data
    const missionTypes = [
      'Emergency Response - Cardiac',
      'Patient Transfer',
      'Emergency Response - Accident',
      'Non-Emergency Transfer',
      'Emergency Response - Trauma'
    ];
    
    const locations = [
      'Gulberg, Lahore',
      'DHA, Lahore',
      'Faisal Town, Lahore',
      'Model Town, Lahore',
      'Johar Town, Lahore'
    ];
    
    const times = [
      '2 hours ago',
      '5 hours ago',
      '1 day ago',
      '2 days ago',
      '3 days ago',
      '1 week ago'
    ];

    const history = [];
    const numMissions = Math.floor(Math.random() * 5 + 5); // 5-10 missions

    for (let i = 0; i < numMissions; i++) {
      const status = Math.random() > 0.2 ? 'completed' : 'cancelled';
      history.push({
        type: missionTypes[Math.floor(Math.random() * missionTypes.length)],
        location: locations[Math.floor(Math.random() * locations.length)],
        time: times[Math.floor(Math.random() * times.length)],
        status: status
      });
    }

    return {
      success: true,
      data: history,
      message: 'Driver history fetched successfully'
    };
  },

  // Delete driver
  deleteDriver: async (driverId) => {
    await delay();
    
    // In a real app, this would make an API call to delete the driver
    return {
      success: true,
      message: 'Driver deleted successfully'
    };
  },

  // Get ambulance alerts
  getAmbulanceAlerts: async (ambulanceId) => {
    await delay(300 + Math.random() * 500);
    
    // Check if it's time to generate a new alert for simulation
    if (simulationEnabled && 
        Date.now() - lastSimulationTime > simulationInterval &&
        !recentlyAddedAlert) {
        
      // Reduced probability to add a new alert when polling to prevent overwhelming UI
      if (Math.random() < simulationChance) {
        // Add a new random alert at the top of the list
        const newAlert = generateRandomAlert();
        activeAlerts = [newAlert, ...activeAlerts];
        
        // Update the simulation time
        lastSimulationTime = Date.now();
        
        // Set the cooldown flag
        recentlyAddedAlert = true;
        
        // Clear the cooldown flag after the cooldown period
        setTimeout(() => {
          recentlyAddedAlert = false;
        }, cooldownPeriod);
        
        // For simulation, limit to 3 alerts maximum to avoid cluttering the UI
        if (activeAlerts.length > 3) {
          activeAlerts = activeAlerts.slice(0, 3);
        }
      }
    }
    
    // Check if the response would be identical to previous
    const currentResponseData = JSON.stringify(activeAlerts);
    if (previousAlertResponse === currentResponseData) {
      // Return a special response indicating no change
      return {
        success: true,
        data: activeAlerts,
        message: `${activeAlerts.length} active alerts found`,
        noChange: true
      };
    }
    
    // Store the current response for future comparison
    previousAlertResponse = currentResponseData;
    
    return {
      success: true,
      data: activeAlerts,
      message: `${activeAlerts.length} active alerts found`
    };
  },

  // Set alert simulation status
  setAlertSimulation: (enabled) => {
    simulationEnabled = enabled;
    return {
      success: true,
      message: `Alert simulation ${enabled ? 'enabled' : 'disabled'}`
    };
  },

  // Update alert status
  updateAlertStatus: async (alertId, newStatus) => {
    await delay(200);
    
    // Update status in our in-memory alerts
    activeAlerts = activeAlerts.map(alert => 
      alert.id === alertId ? { ...alert, status: newStatus } : alert
    );
    
    // If marked as Accepted, Rejected, Completed or Cancelled, move it to the responded list
    if (["Accepted", "Rejected", "Completed", "Cancelled"].includes(newStatus)) {
      // For simulation, remove it from active alerts after a while
      setTimeout(() => {
        activeAlerts = activeAlerts.filter(alert => alert.id !== alertId);
        // Reset the previous response when alerts change
        previousAlertResponse = null;
      }, 60000); // Remove after 1 minute
    }
    
    // Reset the previous response when alerts change
    previousAlertResponse = null;
    
    return {
      success: true,
      message: `Alert ${alertId} status updated to ${newStatus}`
    };
  },

  // Get completed ambulance alerts
  getCompletedAmbulanceAlerts: async (ambulanceId) => {
    await delay(300 + Math.random() * 500);
    
    // Simulate completed alerts based on mockAccidentData
    // In a real app, you would query a database
    const completedAlerts = mockAccidentData
      .filter(accident => accident.status === "Completed" || accident.status === "completed")
      .slice(0, 5)
      .map(accident => ({
        id: accident.alertNo || `#${22000 + accident.id}`,
        time: accident.timeOfAccident || "3:45 PM",
        location: accident.location || "DHA Phase 5, Lahore",
        date: accident.date || new Date().toLocaleDateString(),
        status: "Completed"
      }));
    
    // If no completed alerts found, create some mock ones
    if (completedAlerts.length === 0) {
      const mockCompleted = [
        {
          id: "#22987",
          time: "2:30 PM",
          location: "DHA Phase 5, Lahore",
          date: new Date().toLocaleDateString(),
          status: "Completed"
        },
        {
          id: "#22765",
          time: "10:15 AM",
          location: "Gulberg III, Lahore",
          date: new Date().toLocaleDateString(),
          status: "Completed"
        },
        {
          id: "#22543",
          time: "8:45 AM",
          location: "Model Town, Lahore",
          date: new Date().toLocaleDateString(),
          status: "Completed"
        }
      ];
      
      return {
        success: true,
        data: mockCompleted,
        message: `${mockCompleted.length} completed alerts found`
      };
    }
    
    return {
      success: true,
      data: completedAlerts,
      message: `${completedAlerts.length} completed alerts found`
    };
  }
};

export default MockApiService; 