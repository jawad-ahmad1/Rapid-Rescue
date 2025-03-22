import { useState, useEffect, useMemo } from "react";
import PropTypes from 'prop-types';
import Sidebar from "../Layout/adminSidebar";
import MockApiService from "../../services/mockApi/mockApiService";
import "./Analytics.css";
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Accident Location Map Component
const AccidentLocationMap = ({ data }) => {
  // Generate points for the map
  const points = data.map((point, index) => {
    // Convert geo coordinates to percentage positions
    const minLat = 31.45;
    const maxLat = 31.52;
    const minLng = 74.25;
    const maxLng = 74.40;
    
    const latRange = maxLat - minLat;
    const lngRange = maxLng - minLng;
    
    const left = ((point.lng - minLng) / lngRange) * 100;
    const top = 100 - ((point.lat - minLat) / latRange) * 100;
    
    // Determine marker type based on status
    const markerClass = point.status === "completed" ? "marker-completed" : "marker-not-completed";
    
    return (
      <div 
        key={index}
        className={`location-marker ${markerClass}`}
        style={{ 
          left: `${left}%`, 
          top: `${top}%`,
        }}
        title={`${point.location} - ${point.timeOfAccident}`}
      >
        <div className="marker-tooltip">
          <p><strong>Location:</strong> {point.location}</p>
          <p><strong>Time:</strong> {point.timeOfAccident}</p>
          <p><strong>Status:</strong> {point.status}</p>
        </div>
      </div>
    );
  });
  
  return (
    <div className="accident-location-map">
      <div className="map-background">
        <div className="map-grid-horizontal"></div>
        <div className="map-grid-vertical"></div>
      </div>
      <div className="map-points-container">
        {points}
      </div>
    </div>
  );
};

// Add prop validation for AccidentLocationMap
AccidentLocationMap.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      lat: PropTypes.number.isRequired,
      lng: PropTypes.number.isRequired,
      status: PropTypes.string,
      location: PropTypes.string,
      timeOfAccident: PropTypes.string
    })
  ).isRequired
};

// Default props
AccidentLocationMap.defaultProps = {
  data: []
};

const Analytics = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [accidentData, setAccidentData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("table");
  const [reportType, setReportType] = useState("detailed");
  const [generatingReport, setGeneratingReport] = useState(false);

  // Fetch accident data from mock API
  useEffect(() => {
    const fetchAccidentData = async () => {
      try {
        setLoading(true);
        const response = await MockApiService.getAccidents();
        setAccidentData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching accident data:', err);
        setError('Failed to load accident data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAccidentData();
  }, []);

  // Fetch statistics data
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await MockApiService.getStatistics();
        setStatistics(response.data);
      } catch (err) {
        console.error('Error fetching statistics:', err);
      }
    };

    fetchStatistics();
  }, []);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!accidentData.length) return null;

    // Count accidents by location
    const locationCounts = accidentData.reduce((acc, accident) => {
      acc[accident.location] = (acc[accident.location] || 0) + 1;
      return acc;
    }, {});

    // Count accidents by status
    const statusCounts = accidentData.reduce((acc, accident) => {
      acc[accident.status] = (acc[accident.status] || 0) + 1;
      return acc;
    }, {});

    // Count accidents by date
    const dateCounts = accidentData.reduce((acc, accident) => {
      acc[accident.date] = (acc[accident.date] || 0) + 1;
      return acc;
    }, {});

    // Sort dates chronologically
    const sortedDates = Object.keys(dateCounts).sort();

    return {
      locationData: {
        labels: Object.keys(locationCounts),
        datasets: [
          {
            label: 'Accidents by Location',
            data: Object.values(locationCounts),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      },
      statusData: {
        labels: Object.keys(statusCounts).map(status => 
          status === "completed" ? "Completed" : "Not Completed"
        ),
        datasets: [
          {
            label: 'Accidents by Status',
            data: Object.values(statusCounts),
            backgroundColor: [
              'rgba(75, 192, 192, 0.6)',
              'rgba(255, 99, 132, 0.6)',
            ],
            borderColor: [
              'rgba(75, 192, 192, 1)',
              'rgba(255, 99, 132, 1)',
            ],
            borderWidth: 1,
          },
        ],
      },
      timelineData: {
        labels: sortedDates,
        datasets: [
          {
            label: 'Accidents Over Time',
            data: sortedDates.map(date => dateCounts[date]),
            fill: false,
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
            borderColor: 'rgba(153, 102, 255, 1)',
            tension: 0.1,
          },
        ],
      },
    };
  }, [accidentData]);

  // Filtering and sorting logic
  const filteredData = useMemo(() => {
    return accidentData
      .filter(accident => {
        // Text search filter
        const textMatch = 
          accident.alertNo.includes(searchQuery) ||
          accident.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          accident.serviceProvider.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Status filter
        const statusMatch = filterStatus === "all" || accident.status === filterStatus;
        
        // Date range filter
        let dateMatch = true;
        if (dateRange.start && dateRange.end) {
          const accidentDate = new Date(accident.date);
          const startDate = new Date(dateRange.start);
          const endDate = new Date(dateRange.end);
          dateMatch = accidentDate >= startDate && accidentDate <= endDate;
        }
        
        return textMatch && statusMatch && dateMatch;
      })
      .sort((a, b) => {
        // Convert time strings to comparable values
        const getTimeValue = (timeStr) => {
          // Handle different time formats
          if (timeStr.includes('AM') || timeStr.includes('PM')) {
            const isPM = timeStr.includes('PM');
            const timeParts = timeStr.replace(/(AM|PM)/i, '').trim().split(':');
            let hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);
            
            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
            
            return hours * 60 + minutes;
          }
          return 0;
        };
        
        const timeA = getTimeValue(a.timeOfAccident);
        const timeB = getTimeValue(b.timeOfAccident);
        
        return sortBy === "newest" ? timeB - timeA : timeA - timeB;
      });
  }, [accidentData, searchQuery, sortBy, filterStatus, dateRange]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  // Generate report
  const generateReport = async () => {
    setGeneratingReport(true);
    
    try {
      // Prepare report data
      const reportData = {
        title: "Accident Analytics Report",
        dateGenerated: new Date().toLocaleString(),
        dateRange: dateRange.start && dateRange.end 
          ? `${dateRange.start} to ${dateRange.end}`
          : "All Time",
        statistics: {
          total: statistics.totalAccidents,
          completed: statistics.completedAccidents,
          notCompleted: statistics.notCompletedAccidents,
          avgResponseTime: statistics.avgResponseTime
        },
        filteredAccidents: filteredData.map(accident => ({
          alertNo: accident.alertNo,
          date: accident.date,
          time: accident.timeOfAccident,
          location: accident.location,
          status: accident.status,
          responseTime: accident.responseTime,
          ambulanceId: accident.ambulanceId,
          driverId: accident.driverId
        }))
      };

      // Create report content based on type
      let reportContent = "";
      
      if (reportType === "detailed") {
        reportContent = `
ACCIDENT ANALYTICS REPORT
Generated on: ${reportData.dateGenerated}
Period: ${reportData.dateRange}

SUMMARY STATISTICS
----------------
Total Accidents: ${reportData.statistics.total}
Completed Cases: ${reportData.statistics.completed}
Pending Cases: ${reportData.statistics.notCompleted}
Average Response Time: ${reportData.statistics.avgResponseTime}

DETAILED ACCIDENT RECORDS
------------------------
${reportData.filteredAccidents.map(accident => `
Alert No: ${accident.alertNo}
Time: ${accident.time}
Location: ${accident.location}
Status: ${accident.status}
Response Time: ${accident.responseTime}
Ambulance: ${accident.ambulanceId}
Driver: ${accident.driverId}
-------------------`).join('\n')}
`;
      } else {
        reportContent = `
ACCIDENT ANALYTICS SUMMARY REPORT
Generated on: ${reportData.dateGenerated}
Period: ${reportData.dateRange}

STATISTICS
----------
Total Accidents: ${reportData.statistics.total}
Completed Cases: ${reportData.statistics.completed}
Pending Cases: ${reportData.statistics.notCompleted}
Average Response Time: ${reportData.statistics.avgResponseTime}

ACCIDENT SUMMARY
---------------
${reportData.filteredAccidents.map(accident => 
  `${accident.date} | ${accident.time} | ${accident.location} | ${accident.status}`
).join('\n')}
`;
      }

      // Create and download the report file
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accident-report-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error generating report:', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="analytics-container">
        {/* Header Section */}
        <div className="analytics-header">
          <h1>Accident Analytics</h1>
          <div className="analytics-tabs">
            <button 
              className={`tab-button ${activeTab === 'table' ? 'active' : ''}`}
              onClick={() => setActiveTab('table')}
            >
              Table View
            </button>
            <button 
              className={`tab-button ${activeTab === 'charts' ? 'active' : ''}`}
              onClick={() => setActiveTab('charts')}
            >
              Charts
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="statistics-cards">
            <div className="stat-card">
              <div className="stat-icon total-icon">
                <i className="fas fa-ambulance"></i>
              </div>
              <div className="stat-content">
                <h3>Total Accidents</h3>
                <p className="stat-value">{statistics.totalAccidents}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon completed-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="stat-content">
                <h3>Completed</h3>
                <p className="stat-value">{statistics.completedAccidents}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon pending-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="stat-content">
                <h3>Not Completed</h3>
                <p className="stat-value">{statistics.notCompletedAccidents}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon response-icon">
                <i className="fas fa-tachometer-alt"></i>
              </div>
              <div className="stat-content">
                <h3>Avg. Response Time</h3>
                <p className="stat-value">{statistics.avgResponseTime}</p>
              </div>
            </div>
          </div>
        )}

        {/* Report Generation Section */}
        <div className="report-section">
          <div className="report-options">
            <select 
              value={reportType} 
              onChange={(e) => setReportType(e.target.value)}
              className="report-select"
            >
              <option value="summary">Summary Report</option>
              <option value="detailed">Detailed Report</option>
            </select>
            <button 
              className="generate-report-btn"
              onClick={generateReport}
              disabled={generatingReport}
            >
              {generatingReport ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Generating...
                </>
              ) : (
                <>
                  <i className="fas fa-file-download"></i>
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by alert no, location, or provider"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="not-completed">Not Completed</option>
            </select>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
          <div className="date-range">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="date-input"
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="date-input"
            />
          </div>
        </div>

        {/* Table View */}
        {activeTab === 'table' && (
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-message">Loading accident data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : (
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Alert No</th>
                    <th>Service provider</th>
                    <th>Response time</th>
                    <th>Time of Accident</th>
                    <th>Location</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length > 0 ? (
                    filteredData.map((accident, index) => (
                      <tr key={index}>
                        <td>{accident.alertNo}</td>
                        <td>{accident.serviceProvider}</td>
                        <td>{accident.responseTime}</td>
                        <td>{accident.timeOfAccident}</td>
                        <td>{accident.location}</td>
                        <td>{accident.date}</td>
                        <td>
                          <span className={`status-badge ${accident.status}`}>
                            {accident.status === "completed" ? "Completed" : "Not Completed"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="no-data">🚨 No results found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Charts View */}
        {activeTab === 'charts' && chartData && (
          <div className="charts-container">
            <div className="chart-row">
              <div className="chart-card">
                <h2>Accidents by Location</h2>
                <div className="chart-wrapper">
                  <Bar data={chartData.locationData} options={chartOptions} />
                </div>
              </div>
              <div className="chart-card">
                <h2>Accidents by Status</h2>
                <div className="chart-wrapper pie-chart">
                  <Pie data={chartData.statusData} options={chartOptions} />
                </div>
              </div>
            </div>
            <div className="chart-card full-width">
              <h2>Accidents Over Time</h2>
              <div className="chart-wrapper">
                <Line data={chartData.timelineData} options={chartOptions} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
