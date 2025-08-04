import { useState, useEffect, useRef } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Bar, Pie, Line } from 'react-chartjs-2';
import './ChartComponents.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

// Chart configurations
const chartConfigs = {
  location: {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
        position: 'bottom',
        labels: { boxWidth: 20, padding: 20 }
      },
      title: {
        display: true,
        text: 'Accidents by Location',
        font: { size: 16, weight: 'bold' }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#333',
        bodyColor: '#666',
        borderColor: '#ddd',
        borderWidth: 1,
        padding: 10,
        boxPadding: 5,
        usePointStyle: true,
        callbacks: {
          label: (context) => `Count: ${context.parsed.y}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
        grid: { drawBorder: false }
      },
      x: {
        grid: { display: false },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  },
  status: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 20, padding: 20 }
      },
      title: {
        display: true,
        text: 'Accidents by Status',
        font: { size: 16, weight: 'bold' }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#333',
        bodyColor: '#666',
        borderColor: '#ddd',
        borderWidth: 1,
        padding: 10,
        boxPadding: 5,
        usePointStyle: true
      }
    }
  },
  date: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 20, padding: 20 }
      },
      title: {
        display: true,
        text: 'Accidents Over Time',
        font: { size: 16, weight: 'bold' }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#333',
        bodyColor: '#666',
        borderColor: '#ddd',
        borderWidth: 1,
        padding: 10,
        boxPadding: 5,
        usePointStyle: true
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM d, yyyy'
          }
        },
        title: {
          display: true,
          text: 'Date'
        },
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Accidents'
        },
        ticks: { stepSize: 1 }
      }
    }
  }
};

const ChartComponents = ({ chartData, onChartsLoaded }) => {
  const [error, setError] = useState(null);
  const chartRefs = {
    location: useRef(null),
    status: useRef(null),
    date: useRef(null)
  };

  useEffect(() => {
    try {
      // Validate chart data
      if (!chartData) {
        throw new Error('No chart data available');
      }

      // Notify parent component that charts are loaded
      onChartsLoaded();
    } catch (err) {
      console.error('Error loading charts:', err);
      setError(err.message);
    }

    // Cleanup function
    return () => {
      Object.values(chartRefs).forEach(ref => {
        if (ref.current?.chartInstance) {
          ref.current.chartInstance.destroy();
        }
      });
    };
  }, [chartData, onChartsLoaded]);

  if (error) {
    return (
      <div className="error-message" role="alert">
        <i className="fas fa-exclamation-circle"></i>
        <p>Failed to load charts: {error}</p>
        <button onClick={() => window.location.reload()} className="retry-button">
          <i className="fas fa-redo"></i> Retry
        </button>
      </div>
    );
  }
  
  if (!chartData) {
    return (
      <div className="no-data-message">
        <i className="fas fa-chart-bar"></i>
        <p>No chart data available.</p>
      </div>
    );
  }

  return (
    <div className="charts-grid">
      {/* Location Chart */}
      <div className="chart-section" ref={chartRefs.location}>
        <div className="chart-header">
          <h3>
            Top Accident Locations
            <span className="help-icon" title="Shows the distribution of accidents across different locations">
              <i className="fas fa-question-circle"></i>
            </span>
          </h3>
        </div>
        <div className="chart-container">
          <Bar data={chartData.locationData} options={chartConfigs.location} />
          </div>
        </div>
        
      {/* Status Chart */}
      <div className="chart-section" ref={chartRefs.status}>
        <div className="chart-header">
          <h3>
            Alert Status Distribution
            <span className="help-icon" title="Shows the distribution of accident alerts by their current status">
              <i className="fas fa-question-circle"></i>
            </span>
          </h3>
          </div>
        <div className="chart-container">
          <Pie data={chartData.statusData} options={chartConfigs.status} />
        </div>
      </div>
      
      {/* Date Chart */}
      <div className="chart-section" ref={chartRefs.date}>
        <div className="chart-header">
          <h3>
            Accident Trends
            <span className="help-icon" title="Shows the trend of accidents over time">
              <i className="fas fa-question-circle"></i>
            </span>
          </h3>
        </div>
        <div className="chart-container">
          <Line data={chartData.dateData} options={chartConfigs.date} />
        </div>
      </div>
    </div>
  );
};

export default ChartComponents; 