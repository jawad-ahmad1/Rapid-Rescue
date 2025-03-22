// Mock database for alerts
let mockAlerts = [
  {
    id: "#2234",
    time: "12:30 PM",
    date: "Today",
    location: "Johar Town Lahore",
    status: "pending",
    driver: "Not Assigned",
    driverName: "Not Assigned",
    contactNo: null,
    responseTime: null,
    coordinates: { lat: 31.4697, lng: 74.2728 },
    accidentClip: "/accident1.mp4",
    timeRemaining: 30
  },
  {
    id: "#2235",
    time: "12:45 PM",
    date: "Today",
    location: "Model Town, Lahore",
    status: "assigned",
    driver: "Ali Razaq",
    driverName: "Ali Razaq",
    contactNo: "0313 66583695",
    responseTime: null,
    coordinates: { lat: 31.4818, lng: 74.3162 },
    accidentClip: "/accident2.mp4",
    timeRemaining: 30
  },
  {
    id: "#2236",
    time: "11:30 AM",
    date: "Yesterday",
    location: "DHA Phase 5, Lahore",
    status: "complete",
    driver: "Ali Razaq",
    driverName: "Ali Razaq",
    contactNo: "0313 66583695",
    responseTime: "10 mins",
    coordinates: { lat: 31.4750, lng: 74.2900 },
    accidentClip: null,
    timeRemaining: 0
  },
  {
    id: "#2237",
    time: "10:15 AM",
    date: "Today",
    location: "Gulberg III, Lahore",
    status: "pending",
    driver: "Not Assigned",
    driverName: "Not Assigned",
    contactNo: null,
    responseTime: null,
    coordinates: { lat: 31.5010, lng: 74.3440 },
    accidentClip: "/accident3.mp4",
    timeRemaining: 30
  },
  {
    id: "#2238",
    time: "09:45 AM",
    date: "Today",
    location: "Garden Town, Lahore",
    status: "assigned",
    driver: "Usman Khan",
    driverName: "Usman Khan",
    contactNo: "0321 1234567",
    responseTime: null,
    coordinates: { lat: 31.4920, lng: 74.3000 },
    accidentClip: "/accident4.mp4",
    timeRemaining: 25
  }
];

// Generate a new alert ID
const generateAlertId = () => {
  const lastId = parseInt(mockAlerts[mockAlerts.length - 1].id.slice(1));
  return `#${lastId + 1}`;
};

// Get current time in 12-hour format
const getCurrentTime = () => {
  const now = new Date();
  const hours = now.getHours() % 12 || 12;
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
  return `${hours}:${minutes} ${ampm}`;
};

// Mock database operations
export const mockDatabase = {
  // Get all alerts
  getAllAlerts: () => {
    return Promise.resolve(mockAlerts);
  },

  // Get alert by ID
  getAlertById: (id) => {
    const alert = mockAlerts.find(a => a.id === id);
    return Promise.resolve(alert || null);
  },

  // Update alert status
  updateAlertStatus: (id, status) => {
    mockAlerts = mockAlerts.map(alert => {
      if (alert.id === id) {
        return { ...alert, status };
      }
      return alert;
    });
    return Promise.resolve(mockAlerts.find(a => a.id === id));
  },

  // Add new alert
  addAlert: (location, coordinates) => {
    const newAlert = {
      id: generateAlertId(),
      time: getCurrentTime(),
      date: "Today",
      location,
      status: "pending",
      driver: "Not Assigned",
      driverName: "Not Assigned",
      contactNo: null,
      responseTime: null,
      coordinates,
      accidentClip: null,
      timeRemaining: 30
    };
    mockAlerts.push(newAlert);
    return Promise.resolve(newAlert);
  },

  // Update alert
  updateAlert: (id, updateData) => {
    mockAlerts = mockAlerts.map(alert => {
      if (alert.id === id) {
        return { ...alert, ...updateData };
      }
      return alert;
    });
    return Promise.resolve(mockAlerts.find(a => a.id === id));
  }
}; 