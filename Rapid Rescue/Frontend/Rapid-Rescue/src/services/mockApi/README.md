# Mock API Service for Rapid Rescue

This directory contains a mock API service for testing and development purposes. It simulates backend API calls with realistic data and network delays.

## Files

- `mockData.js` - Contains mock accident data and functions to generate heatmap data and statistics
- `mockApiService.js` - Provides API methods that simulate backend endpoints

## Usage

Import the service in your component:

```javascript
import MockApiService from "../../services/mockApi/mockApiService";
```

Then use it to fetch data:

```javascript
// Example: Fetching accident data
useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await MockApiService.getAccidents();
      setAccidentData(response.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);
```

## Available Methods

### Accident Data

- `getAccidents()` - Returns all accident data
- `getAccidentById(id)` - Returns a specific accident by ID
- `getAccidentsByStatus(status)` - Returns accidents filtered by status
- `getAccidentsByDateRange(startDate, endDate)` - Returns accidents within a date range
- `getAccidentsByLocation(location)` - Returns accidents filtered by location
- `getAccidentHotspots()` - Returns areas with high accident rates

### Visualization Data

- `getHeatmapData()` - Returns data for heatmap visualization
- `getStatistics()` - Returns dashboard statistics

### Ambulance Data

- `getAmbulances()` - Returns all ambulance data
- `getAmbulanceById(id)` - Returns a specific ambulance by ID

### Driver Data

- `getDrivers()` - Returns all driver data
- `getDriverById(id)` - Returns a specific driver by ID

### Testing Utilities

- `simulateError()` - Simulates a server error (for testing error handling)
- `simulateSlowResponse()` - Simulates a slow network response (for testing loading states)
- `simulateTimeout()` - Simulates a network timeout (for testing timeout handling)

## Mock Data

The service includes the following mock data:

- **Accident Data**: 12 accident records with details like location, time, status, and patient information
- **Ambulance Data**: 7 ambulance records with status and location information
- **Driver Data**: 8 driver records with contact information and status
- **Heatmap Data**: Generated dynamically based on accident locations plus random points
- **Statistics**: Calculated from the accident data (completion rates, response times, etc.)
- **Hotspots**: Areas with multiple accidents, calculated from the accident data

## Response Format

All successful responses follow this format:

```javascript
{
  success: true,
  data: [...], // The requested data
  message: 'Success message'
}
```

## Error Handling

Errors are thrown as regular JavaScript Error objects, which you should catch in try/catch blocks.

## Network Simulation

The service includes random delays to simulate network latency, making it more realistic for testing loading states and user experience. You can also test error handling and timeout scenarios using the provided utility methods.
