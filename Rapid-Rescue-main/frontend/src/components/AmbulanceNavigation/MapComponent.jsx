import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import PropTypes from 'prop-types';
import { MAPBOX_ACCESS_TOKEN } from '../../config/mapbox';

// Set Mapbox access token
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

// Helper function to validate coordinates
const isValidCoordinate = (coord) => {
  return coord && 
         typeof coord.lat === 'number' && 
         typeof coord.lng === 'number' && 
         !isNaN(coord.lat) && 
         !isNaN(coord.lng) &&
         coord.lat >= -90 && 
         coord.lat <= 90 && 
         coord.lng >= -180 && 
         coord.lng <= 180;
};

// Helper function to get route between two points
const getRoute = async (map, origin, destination, onRouteUpdate) => {
  try {
    // Ensure map is loaded before proceeding
    if (!map || !map.loaded()) {
      console.warn('Map not ready for route drawing');
      return;
    }

    // Get the route from the Mapbox Directions API
    const query = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?steps=true&geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`,
      { method: 'GET' }
    );
    const json = await query.json();
    
    if (!json.routes || json.routes.length === 0) {
      throw new Error('No route found');
    }
    
    const data = json.routes[0];
    const route = data.geometry.coordinates;
    
    // Remove existing route layer and source if they exist
    try {
      if (map.getLayer('route')) {
        map.removeLayer('route');
      }
      if (map.getSource('route')) {
        map.removeSource('route');
      }
    } catch (e) {
      console.warn('Error cleaning up previous route:', e);
    }
    
    // Add the route to the map
    try {
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: route
          }
        }
      });
      
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3887be',
          'line-width': 5,
          'line-opacity': 0.75
        }
      });
    } catch (e) {
      console.warn('Error adding route to map:', e);
      throw e;
    }
    
    // Calculate the distance in kilometers
    const distance = (data.distance / 1000).toFixed(2);
    if (onRouteUpdate) {
      onRouteUpdate({ distance });
    }
    return distance;
  } catch (error) {
    console.error('Error getting route:', error);
    throw error;
  }
};

const MapComponent = ({ origin, destination, showDirections, onRouteUpdate, onError, reportedLocation }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const mapLoaded = useRef(false);
  const [routeDrawn, setRouteDrawn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Function to draw route
  const drawRoute = async (mapInstance) => {
    try {
      if (!mapInstance || !mapInstance.loaded()) {
        console.warn('Map not ready for route drawing');
        return;
      }

      console.log("Drawing route between:", origin, destination);

      // Get the route from the Mapbox Directions API
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?steps=true&geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`,
        { method: 'GET' }
      );
      const json = await query.json();
      
      if (!json.routes || json.routes.length === 0) {
        throw new Error('No route found');
      }
      
      const data = json.routes[0];
      const route = data.geometry.coordinates;
      
      // Remove existing route layer and source if they exist
      if (mapInstance.getLayer('route')) {
        mapInstance.removeLayer('route');
      }
      if (mapInstance.getSource('route')) {
        mapInstance.removeSource('route');
      }

      // Wait for map style to be fully loaded
      if (!mapInstance.isStyleLoaded()) {
        await new Promise(resolve => {
          mapInstance.once('styledata', resolve);
        });
      }

      // Add the route to the map
      mapInstance.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: route
          }
        }
      });
      
      mapInstance.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          'visibility': 'visible'
        },
        paint: {
          'line-color': '#3887be',
          'line-width': 6,
          'line-opacity': 0.8
        }
      }, 'road-label'); // Add the layer before road labels to ensure visibility

      // Calculate and update distance
      const distance = (data.distance / 1000).toFixed(2);
      if (onRouteUpdate) {
        onRouteUpdate({ distance });
      }

      setRouteDrawn(true);
    } catch (error) {
      console.error('Error drawing route:', error);
      if (onError) {
        onError('Failed to load route directions');
      }
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    // If we don't have required coordinates, show loading state
    if (!origin || !destination) {
      console.log("Missing origin or destination coordinates, showing loading state");
      if (onError) onError("Waiting for location data...");
      return;
    }

    // Validate coordinates before proceeding
    if (!isValidCoordinate(origin)) {
      console.error("Invalid origin coordinates:", origin);
      if (onError) onError("Invalid current location coordinates");
      return;
    }

    if (!isValidCoordinate(destination)) {
      console.error("Invalid destination coordinates:", destination);
      if (onError) onError("Invalid destination coordinates");
      return;
    }

    console.log("Initializing map with coordinates:", { origin, destination, reportedLocation });

    // Initialize the map if it doesn't exist
    if (!map.current) {
      try {
        const mapInstance = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [origin.lng, origin.lat],
          zoom: 12,
          accessToken: MAPBOX_ACCESS_TOKEN,
          preserveDrawingBuffer: true // This helps with map repaints
        });

        map.current = mapInstance;

        // Wait for map to load
        mapInstance.on('load', async () => {
          console.log("Map loaded, setting up features");
          mapLoaded.current = true;
          setIsLoading(false);

          // Add markers
          new mapboxgl.Marker({ color: '#0066ff' })
            .setLngLat([origin.lng, origin.lat])
            .addTo(mapInstance);

          new mapboxgl.Marker({ color: '#ff0000' })
            .setLngLat([destination.lng, destination.lat])
            .addTo(mapInstance);

          // Fit bounds to include both markers
          const bounds = new mapboxgl.LngLatBounds()
            .extend([origin.lng, origin.lat])
            .extend([destination.lng, destination.lat]);

          mapInstance.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15
          });

          // Draw route if directions are enabled
          if (showDirections) {
            await drawRoute(mapInstance);
          }
        });

        // Handle map errors
        mapInstance.on('error', (e) => {
          console.error('Map error:', e);
          if (onError) onError('Error loading map');
        });
      } catch (error) {
        console.error('Error initializing map:', error);
        if (onError) onError('Failed to initialize map');
      }
    }

    // Cleanup function
    return () => {
      if (map.current && mapLoaded.current) {
        // Store the current map state
        const currentState = {
          center: map.current.getCenter(),
          zoom: map.current.getZoom(),
          bearing: map.current.getBearing(),
          pitch: map.current.getPitch()
        };

        // Only remove the map if we're unmounting completely
        if (!mapContainer.current) {
          map.current.remove();
          map.current = null;
          mapLoaded.current = false;
        }

        // Store the state for potential reuse
        localStorage.setItem('mapState', JSON.stringify(currentState));
      }
    };
  }, [origin, destination, showDirections, onError]);

  // Handle route updates
  useEffect(() => {
    if (map.current && mapLoaded.current && showDirections) {
      drawRoute(map.current);
    }
  }, [origin, destination, showDirections]);

  return (
    <div ref={mapContainer} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {isLoading && (
        <div className="map-loading-overlay">
          <div className="map-loading-spinner" />
          <div className="map-loading-text">Loading map...</div>
        </div>
      )}
    </div>
  );
};

MapComponent.propTypes = {
  origin: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired
  }),
  destination: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired
  }),
  reportedLocation: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired
  }),
  showDirections: PropTypes.bool,
  onRouteUpdate: PropTypes.func,
  onError: PropTypes.func
};

export default MapComponent; 