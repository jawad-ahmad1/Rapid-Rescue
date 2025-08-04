import React, { useState, useRef } from "react";
import { FaUser, FaClock, FaMapMarkerAlt, FaCheckCircle, FaAmbulance, FaVideo, FaExclamationTriangle } from "react-icons/fa";
import "./AlertDetailView.css";

const AlertDetailView = ({ alert }) => {
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);

  if (!alert) return <div>No alert selected</div>;

  // Format driver display based on status
  const renderDriverInfo = () => {
    // Handle both driver_name and driverName
    const driverName = alert.driver_name || alert.driverName;
    
    if (alert.status === "complete" && !driverName) {
      return "Alert completed by Unknown Driver";
    } else if (alert.status === "complete") {
      return driverName;
    } else if (alert.status === "assigned" && driverName) {
      return driverName;
    } else if (alert.status === "pending") {
      return "No driver assigned yet";
    } else {
      return "Driver information not available";
    }
  };

  // Get response time handling both naming conventions
  const getResponseTime = () => {
    return alert.response_time || alert.responseTime;
  };

  // Get video URL handling both naming conventions
  const getVideoUrl = () => {
    return alert.video_url || alert.accident_clip_url;
  };

  const handleVideoError = (e) => {
    console.error("Video playback error:", e);
    setVideoError(true);
  };

  const handleVideoLoad = () => {
    setVideoError(false);
    if (videoRef.current) {
      // Try to play the video
      videoRef.current.play().catch(error => {
        console.error("Error playing video:", error);
        setVideoError(true);
      });
    }
  };

  return (
    <div className="alert-detail-view">
      <h2>Alert Details</h2>
      <div className="alert-detail-card">
        <div className="alert-header">
          <div className="alert-id">Alert #{alert.alert_id}</div>
          <div className={`alert-status ${alert.status}`}>
            <FaCheckCircle /> {alert.status_label || alert.status}
          </div>
        </div>

        <div className="alert-info">
          <div className="info-item">
            <FaClock className="info-icon" />
            <div>
              <span className="info-label">Time:</span>
              <span className="info-value">{alert.time}</span>
            </div>
          </div>

          <div className="info-item">
            <FaMapMarkerAlt className="info-icon" />
            <div>
              <span className="info-label">Location:</span>
              <span className="info-value">{alert.location}</span>
            </div>
          </div>

          <div className="info-item">
            <FaUser className="info-icon" />
            <div>
              <span className="info-label">Driver:</span>
              <span className="info-value">{renderDriverInfo()}</span>
            </div>
          </div>

          {alert.status === "complete" && getResponseTime() && (
            <div className="info-item">
              <FaClock className="info-icon response-time" />
              <div>
                <span className="info-label">Response Time:</span>
                <span className="info-value response-time">{getResponseTime()}</span>
              </div>
            </div>
          )}

          {alert.status === "assigned" && (
            <div className="info-item">
              <FaAmbulance className="info-icon assigned" />
              <div>
                <span className="info-label">Status:</span>
                <span className="info-value assigned">En Route to location</span>
              </div>
            </div>
          )}

          {getVideoUrl() && (
            <div className="video-container">
              <div className="info-item">
                <FaVideo className="info-icon" />
                <div>
                  <span className="info-label">Accident Video:</span>
                </div>
              </div>
              {videoError ? (
                <div className="video-error">
                  <FaExclamationTriangle />
                  <p>Unable to play video. Please try downloading it instead.</p>
                  <a 
                    href={getVideoUrl()} 
                    download 
                    className="download-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download Video
                  </a>
                </div>
              ) : (
                <video 
                  ref={videoRef}
                  controls 
                  className="accident-video"
                  src={getVideoUrl()}
                  type="video/mp4"
                  onError={handleVideoError}
                  onLoadedData={handleVideoLoad}
                  playsInline
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertDetailView; 