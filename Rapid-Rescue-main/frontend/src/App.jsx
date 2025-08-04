import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './services/auth/authContext';
import { SidebarProvider } from './contexts/SidebarContext';
import Login from './components/Login/Login';
import AdminDashboard from './components/AdminDashboard/AdminDashboard';
import NewAddDriver from './components/AddDriver/NewAddDriver';
import AdminSettings from './components/AdminSettings/AdminSettings';
import AmbulanceDashboard from './components/AmbulanceDashboard/AmbulanceDashboard';
import AmbulanceNavigation from './components/AmbulanceNavigation/AmbulanceNavigation';
import AmbulanceSettings from './components/AmbulanceSettings/AmbulanceSettings';
import AmbulanceHistory from './components/AmbulanceHistory/AmbulanceHistory';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import NotFound from './pages/NotFound';
import Analytics from './components/Analytics/Analytics';
import DriverData from './components/DriverData/DriverData';
import ViewDriver from './components/DriverData/ViewDriver';
import EditDriver from './components/DriverData/EditDriver';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SidebarProvider>
          <div className="app-container">
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              
              {/* Admin Routes */}
              <Route element={<ProtectedRoute requiredRole="admin" />}>
                <Route path="/admin-dashboard" element={<AdminDashboard />} />
                <Route path="/admin-analytics" element={<Analytics />} />
                <Route path="/admin-driver-management" element={<DriverData />} />
                <Route path="/admin-driver-management/view/:id" element={<ViewDriver />} />
                <Route path="/admin-driver-management/edit/:id" element={<EditDriver />} />
                <Route path="/admin-add-driver" element={<NewAddDriver />} />
                <Route path="/admin-settings" element={<AdminSettings />} />
              </Route>
              
              {/* Driver Routes */}
              <Route element={<ProtectedRoute requiredRole="driver" />}>
                <Route path="/ambulance-dashboard" element={<AmbulanceDashboard />} />
                <Route path="/ambulance-navigation" element={<AmbulanceNavigation />} />
                <Route path="/ambulance-history" element={<AmbulanceHistory />} />
                <Route path="/ambulance-settings" element={<AmbulanceSettings />} />
              </Route>
              
              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </SidebarProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;