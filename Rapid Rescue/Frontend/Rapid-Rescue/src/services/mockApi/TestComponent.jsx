import { useState, useEffect } from 'react';
import MockApiService from './mockApiService';
import './TestComponent.css';

/**
 * This is a test component to demonstrate how to use the mock API service.
 * It's not meant to be used in production, but rather as a reference for
 * how to integrate the mock API service into your components.
 */
const TestComponent = () => {
  const [accidentData, setAccidentData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [drivers, setDrivers] = useState([]);
  
  const [loading, setLoading] = useState({
    accidents: true,
    heatmap: true,
    statistics: true,
    hotspots: true,
    ambulances: true,
    drivers: true
  });
  
  const [error, setError] = useState({
    accidents: null,
    heatmap: null,
    statistics: null,
    hotspots: null,
    ambulances: null,
    drivers: null
  });

  // Fetch accident data
  useEffect(() => {
    const fetchAccidentData = async () => {
      try {
        setLoading(prev => ({ ...prev, accidents: true }));
        const response = await MockApiService.getAccidents();
        setAccidentData(response.data);
        setError(prev => ({ ...prev, accidents: null }));
      } catch (err) {
        console.error('Error fetching accident data:', err);
        setError(prev => ({ ...prev, accidents: err.message }));
      } finally {
        setLoading(prev => ({ ...prev, accidents: false }));
      }
    };

    fetchAccidentData();
  }, []);

  // Fetch heatmap data
  useEffect(() => {
    const fetchHeatmapData = async () => {
      try {
        setLoading(prev => ({ ...prev, heatmap: true }));
        const response = await MockApiService.getHeatmapData();
        setHeatmapData(response.data);
        setError(prev => ({ ...prev, heatmap: null }));
      } catch (err) {
        console.error('Error fetching heatmap data:', err);
        setError(prev => ({ ...prev, heatmap: err.message }));
      } finally {
        setLoading(prev => ({ ...prev, heatmap: false }));
      }
    };

    fetchHeatmapData();
  }, []);

  // Fetch statistics
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(prev => ({ ...prev, statistics: true }));
        const response = await MockApiService.getStatistics();
        setStatistics(response.data);
        setError(prev => ({ ...prev, statistics: null }));
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setError(prev => ({ ...prev, statistics: err.message }));
      } finally {
        setLoading(prev => ({ ...prev, statistics: false }));
      }
    };

    fetchStatistics();
  }, []);

  // Fetch hotspots
  useEffect(() => {
    const fetchHotspots = async () => {
      try {
        setLoading(prev => ({ ...prev, hotspots: true }));
        const response = await MockApiService.getAccidentHotspots();
        setHotspots(response.data);
        setError(prev => ({ ...prev, hotspots: null }));
      } catch (err) {
        console.error('Error fetching hotspots:', err);
        setError(prev => ({ ...prev, hotspots: err.message }));
      } finally {
        setLoading(prev => ({ ...prev, hotspots: false }));
      }
    };

    fetchHotspots();
  }, []);

  // Fetch ambulances
  useEffect(() => {
    const fetchAmbulances = async () => {
      try {
        setLoading(prev => ({ ...prev, ambulances: true }));
        const response = await MockApiService.getAmbulances();
        setAmbulances(response.data);
        setError(prev => ({ ...prev, ambulances: null }));
      } catch (err) {
        console.error('Error fetching ambulances:', err);
        setError(prev => ({ ...prev, ambulances: err.message }));
      } finally {
        setLoading(prev => ({ ...prev, ambulances: false }));
      }
    };

    fetchAmbulances();
  }, []);

  // Fetch drivers
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setLoading(prev => ({ ...prev, drivers: true }));
        const response = await MockApiService.getDrivers();
        setDrivers(response.data);
        setError(prev => ({ ...prev, drivers: null }));
      } catch (err) {
        console.error('Error fetching drivers:', err);
        setError(prev => ({ ...prev, drivers: err.message }));
      } finally {
        setLoading(prev => ({ ...prev, drivers: false }));
      }
    };

    fetchDrivers();
  }, []);

  // Example of filtering accidents by status
  const getCompletedAccidents = async () => {
    try {
      const response = await MockApiService.getAccidentsByStatus('completed');
      console.log('Completed accidents:', response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching completed accidents:', err);
      return [];
    }
  };

  // Example of filtering accidents by date range
  const getAccidentsInDateRange = async (startDate, endDate) => {
    try {
      const response = await MockApiService.getAccidentsByDateRange(startDate, endDate);
      console.log('Accidents in date range:', response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching accidents in date range:', err);
      return [];
    }
  };

  // Example of filtering accidents by location
  const getAccidentsByLocation = async (location) => {
    try {
      const response = await MockApiService.getAccidentsByLocation(location);
      console.log('Accidents in location:', response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching accidents by location:', err);
      return [];
    }
  };

  // Example of simulating an error
  const testErrorHandling = async () => {
    try {
      await MockApiService.simulateError();
    } catch (err) {
      console.error('Simulated error:', err);
      alert(`Error handled: ${err.message}`);
    }
  };

  // Example of simulating a slow response
  const testSlowResponse = async () => {
    try {
      console.log('Starting slow request...');
      const response = await MockApiService.simulateSlowResponse();
      console.log('Slow response received:', response);
    } catch (err) {
      console.error('Error in slow response:', err);
    }
  };

  return (
    <div className="test-component">
      <h1>Mock API Test Component</h1>
      
      <div className="test-section">
        <h2>Accident Data</h2>
        {loading.accidents ? (
          <p>Loading accident data...</p>
        ) : error.accidents ? (
          <p className="error">Error: {error.accidents}</p>
        ) : (
          <div>
            <p>Total accidents: {accidentData.length}</p>
            <button onClick={getCompletedAccidents}>
              Get Completed Accidents
            </button>
            <button onClick={() => getAccidentsInDateRange('2023-03-14', '2023-03-15')}>
              Get Accidents (Mar 14-15)
            </button>
            <button onClick={() => getAccidentsByLocation('Town')}>
              Get Accidents with 'Town'
            </button>
          </div>
        )}
      </div>
      
      <div className="test-section">
        <h2>Heatmap Data</h2>
        {loading.heatmap ? (
          <p>Loading heatmap data...</p>
        ) : error.heatmap ? (
          <p className="error">Error: {error.heatmap}</p>
        ) : (
          <p>Heatmap points: {heatmapData.length}</p>
        )}
      </div>
      
      <div className="test-section">
        <h2>Statistics</h2>
        {loading.statistics ? (
          <p>Loading statistics...</p>
        ) : error.statistics ? (
          <p className="error">Error: {error.statistics}</p>
        ) : statistics && (
          <div>
            <p>Total accidents: {statistics.totalAccidents}</p>
            <p>Completed: {statistics.completedAccidents}</p>
            <p>Pending: {statistics.pendingAccidents}</p>
            <p>Avg response time: {statistics.avgResponseTime}</p>
            <p>Completion rate: {statistics.completionRate}%</p>
          </div>
        )}
      </div>
      
      <div className="test-section">
        <h2>Hotspots</h2>
        {loading.hotspots ? (
          <p>Loading hotspots...</p>
        ) : error.hotspots ? (
          <p className="error">Error: {error.hotspots}</p>
        ) : (
          <div>
            <p>Total hotspots: {hotspots.length}</p>
            {hotspots.slice(0, 3).map((hotspot, index) => (
              <div key={index}>
                <p>
                  {hotspot.location}: {hotspot.count} accidents
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="test-section">
        <h2>Ambulances</h2>
        {loading.ambulances ? (
          <p>Loading ambulances...</p>
        ) : error.ambulances ? (
          <p className="error">Error: {error.ambulances}</p>
        ) : (
          <p>Total ambulances: {ambulances.length}</p>
        )}
      </div>
      
      <div className="test-section">
        <h2>Drivers</h2>
        {loading.drivers ? (
          <p>Loading drivers...</p>
        ) : error.drivers ? (
          <p className="error">Error: {error.drivers}</p>
        ) : (
          <p>Total drivers: {drivers.length}</p>
        )}
      </div>
      
      <div className="test-section">
        <h2>Test Error Handling</h2>
        <button onClick={testErrorHandling}>
          Simulate Error
        </button>
        <button onClick={testSlowResponse}>
          Simulate Slow Response
        </button>
      </div>
    </div>
  );
};

export default TestComponent; 