// Mock accident data for testing
export const mockAccidentData = [
  {
    id: 1,
    alertNo: "54226",
    serviceProvider: "1122",
    responseTime: "10 mins 3 sec",
    timeOfAccident: "12:30 AM",
    location: "Township",
    status: "completed",
    lat: 31.4700,
    lng: 74.3100,
    date: "2023-03-15",
    ambulanceId: "AMB-001",
    driverId: "DRV-101"
  },
  {
    id: 2,
    alertNo: "43485",
    serviceProvider: "1122",
    responseTime: "15 min 30 sec",
    timeOfAccident: "9:30 PM",
    location: "Johar town",
    status: "completed",
    lat: 31.4650,
    lng: 74.2900,
    date: "2023-03-14",
    ambulanceId: "AMB-003",
    driverId: "DRV-105"
  },
  {
    id: 3,
    alertNo: "55653",
    serviceProvider: "1122",
    responseTime: "---------------",
    timeOfAccident: "1:30 AM",
    location: "Model Town",
    status: "not-completed",
    lat: 31.4850,
    lng: 74.3300,
    date: "2023-03-16",
    ambulanceId: "AMB-002",
    driverId: "DRV-103"
  },
  {
    id: 4,
    alertNo: "62145",
    serviceProvider: "1122",
    responseTime: "8 mins 45 sec",
    timeOfAccident: "3:15 PM",
    location: "Gulberg",
    status: "completed",
    lat: 31.5010,
    lng: 74.3440,
    date: "2023-03-13",
    ambulanceId: "AMB-005",
    driverId: "DRV-108"
  },
  {
    id: 5,
    alertNo: "73891",
    serviceProvider: "1122",
    responseTime: "12 mins 20 sec",
    timeOfAccident: "11:45 AM",
    location: "DHA Phase 5",
    status: "completed",
    lat: 31.4790,
    lng: 74.3750,
    date: "2023-03-12",
    ambulanceId: "AMB-004",
    driverId: "DRV-102"
  },
  {
    id: 6,
    alertNo: "48762",
    serviceProvider: "1122",
    responseTime: "---------------",
    timeOfAccident: "7:20 PM",
    location: "Faisal Town",
    status: "not-completed",
    lat: 31.4680,
    lng: 74.2980,
    date: "2023-03-16",
    ambulanceId: "AMB-006",
    driverId: "DRV-107"
  },
  {
    id: 7,
    alertNo: "59234",
    serviceProvider: "1122",
    responseTime: "9 mins 10 sec",
    timeOfAccident: "5:30 AM",
    location: "Iqbal Town",
    status: "completed",
    lat: 31.4920,
    lng: 74.3000,
    date: "2023-03-15",
    ambulanceId: "AMB-002",
    driverId: "DRV-104"
  },
  {
    id: 8,
    alertNo: "67432",
    serviceProvider: "1122",
    responseTime: "7 mins 15 sec",
    timeOfAccident: "2:45 PM",
    location: "Garden Town",
    status: "completed",
    lat: 31.4950,
    lng: 74.3150,
    date: "2023-03-16",
    ambulanceId: "AMB-007",
    driverId: "DRV-106"
  },
  {
    id: 9,
    alertNo: "78123",
    serviceProvider: "1122",
    responseTime: "---------------",
    timeOfAccident: "10:20 AM",
    location: "Cantt",
    status: "not-completed",
    lat: 31.5050,
    lng: 74.3650,
    date: "2023-03-16",
    ambulanceId: "AMB-001",
    driverId: "DRV-101"
  },
  {
    id: 10,
    alertNo: "53987",
    serviceProvider: "1122",
    responseTime: "11 mins 40 sec",
    timeOfAccident: "8:15 PM",
    location: "Bahria Town",
    status: "completed",
    lat: 31.3680,
    lng: 74.1780,
    date: "2023-03-14",
    ambulanceId: "AMB-003",
    driverId: "DRV-105"
  },
  {
    id: 11,
    alertNo: "64521",
    serviceProvider: "1122",
    responseTime: "13 mins 25 sec",
    timeOfAccident: "4:50 AM",
    location: "Valencia",
    status: "completed",
    lat: 31.4120,
    lng: 74.2480,
    date: "2023-03-15",
    ambulanceId: "AMB-004",
    driverId: "DRV-102"
  },
  {
    id: 12,
    alertNo: "71298",
    serviceProvider: "1122",
    responseTime: "---------------",
    timeOfAccident: "6:10 PM",
    location: "Wapda Town",
    status: "not-completed",
    lat: 31.4580,
    lng: 74.2680,
    date: "2023-03-16",
    ambulanceId: "AMB-005",
    driverId: "DRV-108"
  }
];

// Generate additional heatmap data points around Lahore
export const generateHeatmapData = () => {
  // Base coordinates for Lahore
  const baseCoords = { lat: 31.4800, lng: 74.3200 };
  
  // Generate 50 random points around Lahore for heatmap
  const heatmapPoints = [];
  
  // Include actual accident locations
  mockAccidentData.forEach(accident => {
    heatmapPoints.push({
      lat: accident.lat,
      lng: accident.lng,
      weight: accident.status === "completed" ? 1 : 2 // Higher weight for not-completed accidents
    });
  });
  
  // Add more random points with varying weights
  for (let i = 0; i < 50; i++) {
    // Random offset from base coordinates (within ~5km)
    const latOffset = (Math.random() - 0.5) * 0.05;
    const lngOffset = (Math.random() - 0.5) * 0.05;
    
    // Random weight between 0.3 and 1.5
    const weight = 0.3 + Math.random() * 1.2;
    
    heatmapPoints.push({
      lat: baseCoords.lat + latOffset,
      lng: baseCoords.lng + lngOffset,
      weight: weight
    });
  }
  
  return heatmapPoints;
};

// Generate statistics for dashboard
export const generateStatistics = () => {
  // Count completed and not-completed accidents
  const completedAccidents = mockAccidentData.filter(accident => accident.status === 'completed').length;
  const notCompletedAccidents = mockAccidentData.filter(accident => accident.status === 'not-completed').length;
  
  // Calculate average response time (only for completed accidents)
  const completedAccidentsWithTime = mockAccidentData.filter(
    accident => accident.status === 'completed' && accident.responseTime !== '---------------'
  );
  
  let totalMinutes = 0;
  let totalSeconds = 0;
  
  completedAccidentsWithTime.forEach(accident => {
    const timeParts = accident.responseTime.match(/(\d+)\s*mins\s*(\d+)\s*sec/);
    if (timeParts && timeParts.length === 3) {
      totalMinutes += parseInt(timeParts[1], 10);
      totalSeconds += parseInt(timeParts[2], 10);
    }
  });
  
  // Convert total seconds to minutes and seconds
  totalMinutes += Math.floor(totalSeconds / 60);
  totalSeconds = totalSeconds % 60;
  
  // Calculate average
  const avgMinutes = Math.floor(totalMinutes / completedAccidentsWithTime.length);
  const avgSeconds = Math.floor(totalSeconds / completedAccidentsWithTime.length);
  
  return {
    totalAccidents: mockAccidentData.length,
    completedAccidents,
    notCompletedAccidents,
    avgResponseTime: `${avgMinutes} mins ${avgSeconds} sec`,
    // Additional statistics
    accidentsToday: 3,
    accidentsThisWeek: 8,
    accidentsThisMonth: 12,
    mostCommonLocation: 'Township',
    peakHours: '8:00 AM - 10:00 AM'
  };
};

// Generate accident data by date range
export const getAccidentsByDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return mockAccidentData.filter(accident => {
    const accidentDate = new Date(accident.date);
    return accidentDate >= start && accidentDate <= end;
  });
};

// Generate accident data by location
export const getAccidentsByLocation = (location) => {
  return mockAccidentData.filter(accident => 
    accident.location.toLowerCase().includes(location.toLowerCase())
  );
};

// Generate accident hotspots (areas with high accident rates)
export const getAccidentHotspots = () => {
  // Group accidents by location
  const locationCounts = {};
  
  mockAccidentData.forEach(accident => {
    if (locationCounts[accident.location]) {
      locationCounts[accident.location].count += 1;
      locationCounts[accident.location].accidents.push(accident);
    } else {
      locationCounts[accident.location] = {
        count: 1,
        lat: accident.lat,
        lng: accident.lng,
        accidents: [accident]
      };
    }
  });
  
  // Convert to array and sort by count
  const hotspots = Object.keys(locationCounts).map(location => ({
    location,
    count: locationCounts[location].count,
    lat: locationCounts[location].lat,
    lng: locationCounts[location].lng,
    accidents: locationCounts[location].accidents
  })).sort((a, b) => b.count - a.count);
  
  return hotspots;
};

// Generate mock ambulance data
export const mockAmbulanceData = [
  { id: "AMB-001", status: "available", location: { lat: 31.4750, lng: 74.3150 }, driver: "DRV-101" },
  { id: "AMB-002", status: "on-duty", location: { lat: 31.4850, lng: 74.3250 }, driver: "DRV-103" },
  { id: "AMB-003", status: "on-duty", location: { lat: 31.4650, lng: 74.2950 }, driver: "DRV-105" },
  { id: "AMB-004", status: "available", location: { lat: 31.4950, lng: 74.3350 }, driver: "DRV-102" },
  { id: "AMB-005", status: "maintenance", location: { lat: 31.4550, lng: 74.3050 }, driver: null },
  { id: "AMB-006", status: "available", location: { lat: 31.5050, lng: 74.3450 }, driver: "DRV-107" },
  { id: "AMB-007", status: "on-duty", location: { lat: 31.4450, lng: 74.2850 }, driver: "DRV-106" }
];

// Generate mock driver data
export const mockDriverData = [
  { 
    id: "DRV-101", 
    name: "Muhammad Ali", 
    phone: "+92-300-1234567", 
    cnic: "35202-1234567-1",
    serviceProvider: "1122",
    status: "available", 
    ambulance: "AMB-001",
    location: "Gulberg, Lahore",
    serviceArea: "Lahore Metropolitan Area",
    preferredRoutes: "Main City Routes",
    vehicleType: "Basic Life Support",
    licenseType: "Commercial",
    createdAt: "2024-01-15T10:30:00Z"
  },
  { 
    id: "DRV-102", 
    name: "Hassan Ahmed", 
    phone: "+92-301-2345678", 
    cnic: "35202-2345678-2",
    serviceProvider: "1122",
    status: "available", 
    ambulance: "AMB-004",
    location: "DHA, Lahore",
    serviceArea: "Lahore Metropolitan Area",
    preferredRoutes: "Main City Routes",
    vehicleType: "Advanced Life Support",
    licenseType: "Commercial",
    createdAt: "2024-01-14T15:45:00Z"
  },
  { 
    id: "DRV-103", 
    name: "Bilal Khan", 
    phone: "+92-302-3456789", 
    cnic: "35202-3456789-3",
    serviceProvider: "1122",
    status: "on-duty", 
    ambulance: "AMB-002",
    location: "Faisal Town, Lahore",
    serviceArea: "Lahore Metropolitan Area",
    preferredRoutes: "Main City Routes",
    vehicleType: "Basic Life Support",
    licenseType: "Commercial",
    createdAt: "2024-01-13T09:15:00Z"
  },
  { 
    id: "DRV-104", 
    name: "Faisal Malik", 
    phone: "+92-303-4567890", 
    cnic: "35202-4567890-4",
    serviceProvider: "1122",
    status: "off-duty", 
    ambulance: null,
    location: "Model Town, Lahore",
    serviceArea: "Lahore Metropolitan Area",
    preferredRoutes: "Main City Routes",
    vehicleType: "Basic Life Support",
    licenseType: "Commercial",
    createdAt: "2024-01-12T14:20:00Z"
  },
  { 
    id: "DRV-105", 
    name: "Umar Farooq", 
    phone: "+92-304-5678901", 
    cnic: "35202-5678901-5",
    serviceProvider: "1122",
    status: "on-duty", 
    ambulance: "AMB-003",
    location: "Johar Town, Lahore",
    serviceArea: "Lahore Metropolitan Area",
    preferredRoutes: "Main City Routes",
    vehicleType: "Advanced Life Support",
    licenseType: "Commercial",
    createdAt: "2024-01-11T11:30:00Z"
  },
  { 
    id: "DRV-106", 
    name: "Saad Hussain", 
    phone: "+92-305-6789012", 
    cnic: "35202-6789012-6",
    serviceProvider: "1122",
    status: "on-duty", 
    ambulance: "AMB-007",
    location: "Gulberg, Lahore",
    serviceArea: "Lahore Metropolitan Area",
    preferredRoutes: "Main City Routes",
    vehicleType: "Basic Life Support",
    licenseType: "Commercial",
    createdAt: "2024-01-10T16:45:00Z"
  },
  { 
    id: "DRV-107", 
    name: "Kamran Akmal", 
    phone: "+92-306-7890123", 
    cnic: "35202-7890123-7",
    serviceProvider: "1122",
    status: "available", 
    ambulance: "AMB-006",
    location: "DHA, Lahore",
    serviceArea: "Lahore Metropolitan Area",
    preferredRoutes: "Main City Routes",
    vehicleType: "Advanced Life Support",
    licenseType: "Commercial",
    createdAt: "2024-01-09T13:15:00Z"
  },
  { 
    id: "DRV-108", 
    name: "Rizwan Ali", 
    phone: "+92-307-8901234", 
    cnic: "35202-8901234-8",
    serviceProvider: "1122",
    status: "off-duty", 
    ambulance: null,
    location: "Faisal Town, Lahore",
    serviceArea: "Lahore Metropolitan Area",
    preferredRoutes: "Main City Routes",
    vehicleType: "Basic Life Support",
    licenseType: "Commercial",
    createdAt: "2024-01-08T10:30:00Z"
  }
];

// Generate mock ambulance alert data
export const mockAmbulanceAlerts = [
  { 
    id: "#22344", 
    time: "12:30 PM",
    date: "Today", 
    location: "Johar Town Lahore", 
    status: "Waiting",
    driver: "Not Assigned",
    driverName: "Not Assigned",
    contactNo: null,
    responseTime: null,
    coordinates: { lat: 31.4697, lng: 74.2728 },
    accidentClip: "/accident1.mp4",
    timeRemaining: 30
  },
  { 
    id: "#22345", 
    time: "12:45 PM",
    date: "Today", 
    location: "Model Town Lahore", 
    status: "Waiting",
    driver: "Not Assigned",
    driverName: "Not Assigned",
    contactNo: null,
    responseTime: null,
    coordinates: { lat: 31.4818, lng: 74.3162 },
    accidentClip: "/accident2.mp4",
    timeRemaining: 30
  },
  { 
    id: "#22346", 
    time: "1:15 PM",
    date: "Today", 
    location: "DHA Phase 5 Lahore", 
    status: "Waiting",
    driver: "Not Assigned",
    driverName: "Not Assigned",
    contactNo: null,
    responseTime: null,
    coordinates: { lat: 31.4790, lng: 74.3750 },
    accidentClip: "/accident3.mp4",
    timeRemaining: 30
  },
  { 
    id: "#22347", 
    time: "1:30 PM",
    date: "Today", 
    location: "Gulberg III Lahore", 
    status: "Waiting",
    driver: "Not Assigned",
    driverName: "Not Assigned",
    contactNo: null,
    responseTime: null,
    coordinates: { lat: 31.5010, lng: 74.3440 },
    accidentClip: "/accident4.mp4",
    timeRemaining: 30
  },
  { 
    id: "#22348", 
    time: "2:05 PM",
    date: "Today", 
    location: "Bahria Town Lahore", 
    status: "Waiting",
    driver: "Not Assigned",
    driverName: "Not Assigned",
    contactNo: null,
    responseTime: null,
    coordinates: { lat: 31.3680, lng: 74.1780 },
    accidentClip: "/accident5.mp4",
    timeRemaining: 30
  }
]; 