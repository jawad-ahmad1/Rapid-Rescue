import { useState } from "react";
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from "@react-google-maps/api";
import AmbulanceSidebar from "../AmbulanceDashboardLayout/AmbulanceSidebar";
import "./AmbulanceNavigation.css";

// Google Maps API Key (Use .env file instead of hardcoding)
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY"; // Replace with your API Key

const AmbulanceNavigation = () => {
  const [directions, setDirections] = useState(null);
  const [destination, ] = useState({ lat: 31.4697, lng: 74.2728 }); // Default Location: Johar Town, Lahore

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
  };

  // Dummy Starting Location (Ambulance Current Location)
  const currentLocation = { lat: 31.4818, lng: 74.3162 };

  // Function to get route from current location to accident site
  const calculateRoute = () => {
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: currentLocation,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
        } else {
          console.error("Error fetching directions:", status);
        }
      }
    );
  };

  return (
    <div className="ambulance-dashboard">
      <AmbulanceSidebar />
      <div className="navigation-container">
        <h2>🚑 Navigation</h2>

        {/* Google Maps Display */}
        <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
          <GoogleMap mapContainerClassName="navigation-map" center={currentLocation} zoom={13} options={mapOptions}>
            {/* Current Location Marker */}
            <Marker position={currentLocation} label="🚑" />

            {/* Destination Marker */}
            <Marker position={destination} label="🚨" />

            {/* Render Directions */}
            {directions && <DirectionsRenderer directions={directions} />}
          </GoogleMap>
        </LoadScript>

        {/* Controls */}
        <div className="navigation-controls">
          <button onClick={calculateRoute} className="route-btn">
            📍 Get Route
          </button>
        </div>
      </div>
    </div>
  );
};

export default AmbulanceNavigation;
