// Mapbox configuration
export const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoidGFsaGExMjMzMzMzIiwiYSI6ImNtYjg3ZGxqODBqcjUya3M2a2N5aHN2a2wifQ.-P5-ajAXPdRfgVBI2l-wVg'; // Required public scopes: styles:read, styles:tiles

// Map configuration
export const MAP_CONFIG = {
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [74.3587, 31.5204], // Lahore center coordinates
    zoom: 12,
    bounds: {
        LAT_MIN: 31.4000,
        LAT_MAX: 31.6000,
        LNG_MIN: 74.2000,
        LNG_MAX: 74.4000
    }
};

// Navigation configuration
export const NAVIGATION_CONFIG = {
    ARRIVAL_THRESHOLD: 0.1, // 100 meters in kilometers
    CONSECUTIVE_READINGS: 3, // Number of readings needed to confirm arrival
    UPDATE_INTERVAL: 5000 // Update interval in milliseconds
};

localStorage.removeItem('debug'); 