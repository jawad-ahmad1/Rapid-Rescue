import { lazy, Suspense, useState, useEffect } from "react";
import AdminLayout from "../layouts/admin/AdminLayout";
import ErrorBoundary from "../common/ErrorBoundary";
import ApiService from "../../services/api/apiService";
import { 
  FaChartBar, 
  FaTable,
  FaSync,
  FaSearch,
  FaBell,
  FaFilePdf
} from "react-icons/fa";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import "./Analytics.css";

// Initial empty chart data structure
const initialChartData = {
  locationData: {
    labels: [],
    datasets: [
      {
        label: "Number of Accidents",
        data: [],
        backgroundColor: "rgba(74, 108, 247, 0.8)",
        borderColor: "rgba(74, 108, 247, 1)",
        borderWidth: 1,
      },
    ],
  },
  statusData: {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          "rgba(245, 158, 11, 0.8)", // pending - yellow
          "rgba(74, 108, 247, 0.8)", // assigned - blue
          "rgba(16, 185, 129, 0.8)", // complete - green
          "rgba(239, 68, 68, 0.8)", // rejected - red
        ],
        borderColor: [
          "rgba(245, 158, 11, 1)", // pending
          "rgba(74, 108, 247, 1)", // assigned
          "rgba(16, 185, 129, 1)", // complete
          "rgba(239, 68, 68, 1)", // rejected
        ],
        borderWidth: 1,
      },
    ],
  },
  dateData: {
    labels: [],
    datasets: [
      {
        label: "Accidents Over Time",
        data: [],
        backgroundColor: "rgba(74, 108, 247, 0.8)",
        borderColor: "rgba(74, 108, 247, 1)",
        borderWidth: 1,
        fill: false,
        tension: 0.4,
      },
    ],
  },
};

// Import chart components with error boundary and retry logic
const ChartComponents = lazy(() => {
  const loadCharts = () =>
    import("./ChartComponents").catch((error) => {
      console.error("Error loading ChartComponents:", error);
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(loadCharts());
        }, 1000);
      });
    });
  
  return loadCharts();
});

const Analytics = () => {
  const [activeTab, setActiveTab] = useState("table");
  const [chartData, setChartData] = useState(initialChartData);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end: new Date().toISOString().split("T")[0],
    },
    location: "all",
    status: "all",
    searchQuery: "",
    sortBy: "newest",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [rawAlerts, setRawAlerts] = useState([]);

  // Fetch data on component mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await ApiService.getAllAlerts();
      const alerts = Array.isArray(response) ? response : response?.data;

      if (!Array.isArray(alerts)) {
        throw new Error('Invalid alerts data received');
      }

      // Store raw alerts data
      setRawAlerts(alerts);

      // Sort alerts by newest first before processing
      const sortedAlerts = sortData(alerts, 'newest');

      // Process table data with sorted alerts
      processTableData(sortedAlerts);
      processChartData(sortedAlerts);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const processTableData = (alerts) => {
    try {
      const processedData = alerts.map(alert => {
        const date = new Date(alert.created_at || alert.timestamp);
        let status = alert.status?.toLowerCase().trim() || 'pending';
        
        // Normalize status
        if (status === 'complete' || status === 'completed') {
          status = 'Completed';
        } else if (status === 'assigned') {
          status = 'Assigned';
        } else if (status === 'rejected') {
          status = 'Rejected';
        } else {
          status = 'Pending';
        }

        return {
          id: alert.id,
          alertNumber: alert.alert_id || `A${alert.id}`,
          date: formatDate(date),
          time: formatTime(date),
          location: alert.location || 'N/A',
          status: status,
          driverName: alert.driver?.name || alert.driver_name || 'Not Assigned',
          responseTime: alert.response_time || 'N/A',
          timestamp: date.getTime(),
          created_at: alert.created_at || alert.timestamp // Keep original date for sorting
        };
      });

      // Set the table data directly - sorting is already applied to filteredAlerts
      setTableData(processedData);
    } catch (error) {
      console.error('Error processing alert data:', error);
      setError('Error processing alert data');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const sortData = (data, sortOption) => {
    console.log('Sorting data with option:', sortOption); // Add logging
    return [...data].sort((a, b) => {
      const aDate = new Date(a.created_at || a.timestamp);
      const bDate = new Date(b.created_at || b.timestamp);
      
      switch (sortOption) {
        case 'newest':
          return bDate.getTime() - aDate.getTime();
        case 'oldest':
          return aDate.getTime() - bDate.getTime();
        case 'response-time-high':
          const bTime = parseFloat(b.response_time) || -1;
          const aTime = parseFloat(a.response_time) || -1;
          return bTime - aTime;
        case 'response-time-low':
          const aTimeL = parseFloat(a.response_time) || Number.MAX_VALUE;
          const bTimeL = parseFloat(b.response_time) || Number.MAX_VALUE;
          return aTimeL - bTimeL;
        default:
          return 0;
      }
    });
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [filterType]: value
      };
      
      // Apply filters to both table and chart data
      let filteredAlerts = rawAlerts.filter(alert => {
        // Date filtering
        const alertDate = new Date(alert.created_at || alert.timestamp);
        const startDate = new Date(newFilters.dateRange.start);
        const endDate = new Date(newFilters.dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        
        const dateMatch = alertDate >= startDate && alertDate <= endDate;

        // Location filtering
        const locationMatch = newFilters.location === 'all' || 
          (alert.location && alert.location.toLowerCase().includes(newFilters.location.toLowerCase()));

        // Status filtering
        const alertStatus = alert.status?.toLowerCase().trim() || 'pending';
        const filterStatus = newFilters.status.toLowerCase().trim();
        const statusMatch = newFilters.status === 'all' || alertStatus === filterStatus;

        // Search filtering
        const searchQuery = newFilters.searchQuery.toLowerCase();
        const searchMatch = !searchQuery || 
          (alert.location && alert.location.toLowerCase().includes(searchQuery)) ||
          (alert.alert_number && alert.alert_number.toLowerCase().includes(searchQuery)) ||
          (alert.driver?.name && alert.driver.name.toLowerCase().includes(searchQuery)) ||
          (alert.assigned_driver?.name && alert.assigned_driver.name.toLowerCase().includes(searchQuery));
        
        return dateMatch && locationMatch && statusMatch && searchMatch;
      });

      // Always apply sorting after filtering
      filteredAlerts = sortData(filteredAlerts, newFilters.sortBy);

      // Process both table and chart data with filtered and sorted alerts
      processTableData(filteredAlerts);
      processChartData(filteredAlerts);
      
      return newFilters;
    });
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchInitialData();
  };

  const processChartData = (alerts) => {
    try {
      // Process data for location chart
      const locationCounts = {};
      alerts.forEach((alert) => {
        if (alert.location) {
          locationCounts[alert.location] = (locationCounts[alert.location] || 0) + 1;
        }
      });

      // Sort locations by count in descending order
      const sortedLocations = Object.entries(locationCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10); // Show top 10 locations

      const locationData = {
        labels: sortedLocations.map(([location]) => location),
        datasets: [
          {
            label: "Number of Accidents",
            data: sortedLocations.map(([, count]) => count),
            backgroundColor: "rgba(74, 108, 247, 0.8)",
            borderColor: "rgba(74, 108, 247, 1)",
            borderWidth: 1,
          },
        ],
      };

      // Process data for status chart
      const statusCounts = {
        pending: 0,
        assigned: 0,
        complete: 0,
        rejected: 0
      };
      
      alerts.forEach((alert) => {
        const status = alert.status?.toLowerCase().trim() || 'pending';
        if (status === 'complete' || status === 'completed') {
          statusCounts.complete++;
        } else if (status === 'assigned') {
          statusCounts.assigned++;
        } else if (status === 'rejected') {
          statusCounts.rejected++;
        } else {
          statusCounts.pending++;
        }
      });

      const statusColors = {
        pending: ["rgba(245, 158, 11, 0.8)", "rgba(245, 158, 11, 1)"],
        assigned: ["rgba(74, 108, 247, 0.8)", "rgba(74, 108, 247, 1)"],
        complete: ["rgba(16, 185, 129, 0.8)", "rgba(16, 185, 129, 1)"],
        rejected: ["rgba(239, 68, 68, 0.8)", "rgba(239, 68, 68, 1)"]
      };

      const statusLabels = Object.keys(statusCounts).filter(status => statusCounts[status] > 0);
      const statusData = {
        labels: statusLabels.map(status => status.charAt(0).toUpperCase() + status.slice(1)),
        datasets: [
          {
            data: statusLabels.map(status => statusCounts[status]),
            backgroundColor: statusLabels.map(status => statusColors[status]?.[0] || "rgba(100, 116, 139, 0.8)"),
            borderColor: statusLabels.map(status => statusColors[status]?.[1] || "rgba(100, 116, 139, 1)"),
            borderWidth: 1,
          },
        ],
      };

      // Process data for date chart
      const dateData = {
        labels: [],
        datasets: [
          {
            label: "Accidents Over Time",
            data: [],
            backgroundColor: "rgba(74, 108, 247, 0.8)",
            borderColor: "rgba(74, 108, 247, 1)",
            borderWidth: 1,
            fill: false,
            tension: 0.4,
          },
        ],
      };

      // Group alerts by date
      const dateCounts = {};
      alerts.forEach((alert) => {
        const date = new Date(alert.created_at || alert.timestamp);
        const dateStr = date.toISOString().split('T')[0];
        dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
      });

      // Sort dates and create chart data
      const sortedDates = Object.entries(dateCounts)
        .sort(([a], [b]) => new Date(a) - new Date(b));

      dateData.labels = sortedDates.map(([date]) => new Date(date));
      dateData.datasets[0].data = sortedDates.map(([date, count]) => ({
        x: new Date(date),
        y: count,
      }));

      setChartData({
        locationData,
        statusData,
        dateData,
      });
    } catch (error) {
      console.error("Error processing chart data:", error);
      setError("Failed to process chart data");
    }
  };

  const generatePDFReport = () => {
    try {
      setIsGeneratingReport(true);
      
      // Create new PDF document (A4 format)
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.setTextColor(74, 108, 247);
      doc.text('Rapid Rescue Analytics Report', 20, 20);
      
      // Add generation date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
      
      // Add filters information
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Applied Filters:', 20, 40);
      doc.setFontSize(10);
      doc.text(`Date Range: ${filters.dateRange.start} to ${filters.dateRange.end}`, 25, 50);
      doc.text(`Status Filter: ${filters.status === 'all' ? 'All Statuses' : filters.status}`, 25, 56);
      
      // Calculate statistics
      const totalAlerts = tableData.length;
      const completedAlerts = tableData.filter(alert => 
        alert.status?.toLowerCase() === 'complete' || 
        alert.status?.toLowerCase() === 'completed'
      ).length;
      const pendingAlerts = tableData.filter(alert => 
        alert.status?.toLowerCase() === 'pending'
      ).length;
      
      // Add statistics
      doc.setFontSize(14);
      doc.text('Summary Statistics', 20, 70);
      doc.setFontSize(10);
      doc.text([
        `Total Alerts: ${totalAlerts}`,
        `Completed Alerts: ${completedAlerts}`,
        `Pending Alerts: ${pendingAlerts}`,
      ], 25, 80);
      
      // Prepare table data
      const tableHeaders = [['Alert ID', 'Date', 'Time', 'Location', 'Status', 'Driver', 'Response Time']];
      const tableRows = tableData.map(item => [
        item.alertNumber || '',
        item.date || '',
        item.time || '',
        item.location || '',
        item.status || '',
        item.driverName || '',
        item.responseTime || ''
      ]);

      // Generate table using autoTable
      autoTable(doc, {
        startY: 100,
        head: tableHeaders,
        body: tableRows,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [74, 108, 247],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 20 },
          2: { cellWidth: 20 },
          3: { cellWidth: 35 },
          4: { cellWidth: 25 },
          5: { cellWidth: 35 },
          6: { cellWidth: 25 },
        },
        margin: { top: 100 },
      });
      
      // Save the PDF
      doc.save(`rapid-rescue-report-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = tableData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(tableData.length / itemsPerPage);

  return (
  <AdminLayout title="Analytics">
      <div className="analytics-container">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="header-title">
            <h1><FaChartBar /> Analytics Dashboard</h1>
          </div>
          <div className="view-switcher">
            <button 
              className={`view-button ${activeTab === 'table' ? 'active' : ''}`}
              onClick={() => setActiveTab('table')}
            >
              <FaTable /> Table View
            </button>
            <button 
              className={`view-button ${activeTab === 'charts' ? 'active' : ''}`}
              onClick={() => setActiveTab('charts')}
            >
              <FaChartBar /> Charts View
            </button>
          </div>
        </div>

        {/* View Controls */}
        <div className="view-controls">
          <div className="filter-section">
            <div className="filter-row">
              <div className="search-box">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by location, alert ID, or driver"
                  value={filters.searchQuery}
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                />
                {filters.searchQuery && (
                  <button 
                    className="clear-search"
                    onClick={() => handleFilterChange('searchQuery', '')}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="report-controls">
                <button 
                  className="btn btn-primary" 
                  onClick={generatePDFReport}
                  disabled={isGeneratingReport}
                >
                  {isGeneratingReport ? (
                    <><FaSync className="fa-spin" /> Generating PDF...</>
                  ) : (
                    <><FaFilePdf /> Generate Report</>
                  )}
                </button>
              </div>
            </div>

            <div className="filter-row">
              <div className="date-filter">
                <span>Date Range:</span>
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => handleFilterChange('dateRange', {
                    ...filters.dateRange,
                    start: e.target.value
                  })}
                  max={filters.dateRange.end}
                />
                <span>to</span>
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleFilterChange('dateRange', {
                    ...filters.dateRange,
                    end: e.target.value
                  })}
                  min={filters.dateRange.start}
                />
              </div>

              <div className="filter-group">
                <select 
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="status-filter"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="complete">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select 
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="sort-filter"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="response-time-high">Response Time (High to Low)</option>
                  <option value="response-time-low">Response Time (Low to High)</option>
                </select>

                <button 
                  className="refresh-btn"
                  onClick={handleRefresh}
                  title="Refresh data"
                >
                  <FaSync className={loading ? 'fa-spin' : ''} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="loading-state">
            <FaSync className="fa-spin" />
            <p>Loading analytics data...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <FaBell />
            <p>{error}</p>
            <button onClick={handleRefresh}>Try Again</button>
        </div>
        ) : activeTab === "table" ? (
          <div className="table-view">
              {tableData.length === 0 ? (
                <div className="no-data-state">
                  <p>No data available for the selected filters</p>
                <button
                  onClick={() => {
                    setFilters({
                      dateRange: {
                        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                          .toISOString()
                          .split("T")[0],
                        end: new Date().toISOString().split("T")[0],
                      },
                      location: "all",
                      status: "all",
                      searchQuery: "",
                      sortBy: "newest",
                    });
                  }}
                >
                  Reset Filters
                </button>
                </div>
              ) : (
                <>
                  <div className="table-container">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Alert ID</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Driver</th>
                    <th>Response Time</th>
                  </tr>
                </thead>
                <tbody>
                        {currentItems.map((item) => (
                          <tr key={item.id}>
                            <td>{item.alertNumber}</td>
                            <td>{item.date}</td>
                            <td>{item.time}</td>
                            <td>{item.location}</td>
                            <td>
                            <span
                              className={`status-badge ${item.status?.toLowerCase()}`}
                            >
                              {item.status === 'complete' ? 'Completed' : item.status}
                          </span>
                        </td>
                            <td>{item.driverName}</td>
                          <td className={item.status?.toLowerCase() === 'complete' && item.responseTime !== 'N/A' ? 'response-time' : ''}>
                            {item.responseTime}
                          </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="pagination">
                      <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                      <span>
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
              </div>
                  )}
                </>
            )}
          </div>
        ) : (
            <ErrorBoundary>
            <Suspense
              fallback={<div className="loading-state">Loading charts...</div>}
            >
              <ChartComponents
                chartData={chartData}
                onChartsLoaded={() => console.log("Charts loaded")}
              />
              </Suspense>
            </ErrorBoundary>
        )}
      </div>
  </AdminLayout>
  );
};

export default Analytics;
