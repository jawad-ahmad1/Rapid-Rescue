import { useState, useMemo } from "react";
import { GoogleMap, LoadScript, HeatmapLayer } from "@react-google-maps/api";
import Sidebar from "../Layout/Sidebar";
import "./Analytics.css";

// ✅ API Key Configuration
const GOOGLE_MAPS_API_KEY = "AIzaSyA4-aPpykd0etewdLBZij5GT1jRpxXyv0I"; 
const Analytics = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // ✅ UseMemo to optimize accident data
  const accidentData = useMemo(() => [
    { alertNo: "54326", serviceProvider: "1122", responseTime: "10 mins 3 sec", timeOfAccident: "12:30 AM", location: "Township", status: "completed", lat: 31.4818, lng: 74.3162 },
    { alertNo: "43485", serviceProvider: "1122", responseTime: "15 min 30 sec", timeOfAccident: "9:10 PM", location: "Johar Town", status: "completed", lat: 31.4697, lng: 74.2728 },
    { alertNo: "55583", serviceProvider: "1122", responseTime: "---", timeOfAccident: "1:20 AM", location: "Model Town", status: "not completed", lat: 31.4925, lng: 74.3587 },
  ], []);

  // ✅ Filtering and sorting logic
  const filteredData = useMemo(() => {
    return accidentData
      .filter(
        (accident) =>
          accident.alertNo.includes(searchQuery) ||
          accident.location.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) =>
        sortBy === "newest"
          ? new Date(b.timeOfAccident) - new Date(a.timeOfAccident)
          : new Date(a.timeOfAccident) - new Date(b.timeOfAccident)
      );
  }, [accidentData, searchQuery, sortBy]);

  // ✅ Ensure Google Maps API has loaded before creating heatmap data
  const heatmapData = useMemo(() => {
    if (typeof window !== "undefined" && window.google && window.google.maps) {
      return accidentData.map((accident) => new window.google.maps.LatLng(accident.lat, accident.lng));
    }
    return [];
  }, [accidentData]);

  // ✅ Debugging Console Logs
  console.log("Heatmap Data:", heatmapData);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="analytics-container">
        {/* Header Section */}
        <div className="analytics-header">
          <h1>Recent Accidents</h1>
          <div className="search-sort">
            <input
              type="text"
              placeholder="🔍 Search accidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Sort by: Newest</option>
              <option value="oldest">Sort by: Oldest</option>
            </select>
          </div>
        </div>

        {/* Table Section */}
        <div className="table-wrapper">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Alert No</th>
                <th>Service Provider</th>
                <th>Response Time</th>
                <th>Time of Accident</th>
                <th>Location</th>
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
                    <td>
                      <span className={`status-badge ${accident.status === "completed" ? "completed" : "not-completed"}`}>
                        {accident.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="no-data">🚨 No results found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Heatmap Section */}
        <div className="heatmap-container">
          <h2>Accident Heatmap</h2>
          <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={["visualization"]}>
            <GoogleMap mapContainerClassName="heatmap" center={{ lat: 31.4800, lng: 74.3200 }} zoom={12}>
              {heatmapData.length > 0 && <HeatmapLayer data={heatmapData} />}
            </GoogleMap>
          </LoadScript>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
