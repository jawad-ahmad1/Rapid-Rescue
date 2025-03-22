import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login/Login';
import AdminDashboard from './components/AdminDashboard/AdminDashboard';
import Analytics from './components/Analytics/Analytics';
import DriverData from './components/DriverData/DriverData';
import ViewDriver from './components/DriverData/ViewDriver';
import EditDriver from './components/DriverData/EditDriver';
import AddDriver from './components/AddDriver/AddDriver';
import AmbulanceDashboard from './components/AmbulanceDashboard/AmbulanceDashboard';
import AmbulanceNavigation from './components/AmbulanceNavigation/AmbulanceNavigation';
import AmbulanceSettings from './components/AmbulanceSettings/AmbulanceSettings';

// Test component that passes predefined data to the navigation page
const NavigationTest = () => {
  const testData = {
    id: "TEST123",
    location: "Test Emergency Location, Lahore",
    coordinates: { lat: 31.4697, lng: 74.2728 },
    emergencyType: "Medical Emergency",
    severity: "High",
    contact: "123-456-7890",
    notes: "This is test data for direct navigation access."
  };
  
  return <AmbulanceNavigation testData={testData} />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/driver-data" element={<DriverData />} />
        <Route path="/driver-data/view/:id" element={<ViewDriver />} />
        <Route path="/driver-data/edit/:id" element={<EditDriver />} />
        <Route path="/add-driver" element={<AddDriver />} />
        <Route path="/ambulance-dashboard" element={<AmbulanceDashboard />} />
        <Route path="/ambulance-navigation" element={<AmbulanceNavigation />} />
        <Route path="/ambulance-navigation-test" element={<NavigationTest />} />
        <Route path="/ambulance-settings" element={<AmbulanceSettings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;