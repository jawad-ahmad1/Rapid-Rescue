import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login/Login';
import AdminDashboard from './components/AdminDashboard/AdminDashboard';
import Analytics from './components/Analytics/Analytics';
import DriverData from './components/DriverData/DriverData';
import AddDriver from './components/AddDriver/AddDriver';
import AmbulanceDashboard from './components/Ambulance dashoard/AmbulanceDashboard';
import AmbulanceNavigation from './components/AmbulanceNavigation/AmbulanceNavigation';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/drivers" element={<DriverData />} />
        <Route path="/add-driver" element={<AddDriver />} />
        <Route path="/ambulance-dashboard" element={<AmbulanceDashboard />} />
        <Route path="/ambulance-navigation" element={<AmbulanceNavigation />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;