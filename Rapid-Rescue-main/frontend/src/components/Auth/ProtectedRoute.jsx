import React, { useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth/authContext';
import LoadingScreen from '../UI/LoadingScreen';

/**
 * ProtectedRoute component that ensures users are authenticated
 * before accessing protected routes
 * 
 * @param {Object} props Component props
 * @param {React.ReactNode} props.children The protected route component
 * @param {string} props.requiredRole The role required for this route ('admin' or 'driver')
 * @param {string} props.redirectPath The path to redirect to if the user is not authenticated
 */
const ProtectedRoute = ({ 
  requiredRole = null, 
  redirectPath = '/login',
  children 
}) => {
  const auth = useAuth();
  const navigate = useNavigate();
  
  // If auth context is not available, show loading
  if (!auth) {
    return <LoadingScreen message="Initializing authentication..." />;
  }

  const { isAuthenticated, isLoading, hasRole } = auth;
  
  // Check for login redirect in localStorage
  useEffect(() => {
    const loginSuccess = localStorage.getItem('loginSuccess');
    const redirectTarget = localStorage.getItem('loginRedirectPath');
    
    if (loginSuccess === 'true' && redirectTarget) {
      // Clear the flags
      localStorage.removeItem('loginSuccess');
      localStorage.removeItem('loginRedirectPath');
      
      // Force navigation to the target path
      console.log(`ProtectedRoute: Login redirect to ${redirectTarget}`);
      navigate(redirectTarget, { replace: true });
    }
  }, [navigate]);
  
  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen message="Verifying your access..." />;
  }
  
  // Check if user is authenticated
  if (!isAuthenticated) {
    // Get the stored role to help with debugging
    const storedRole = localStorage.getItem('userRole');
    console.log(`Not authenticated. Stored role: ${storedRole || 'none'}`);
    
    // Redirect to login with return URL
    return <Navigate to={redirectPath} replace state={{ from: window.location.pathname }} />;
  }
  
  // If role is specified, check if user has the required role
  if (requiredRole && !hasRole(requiredRole)) {
    // Get the stored role to help with debugging
    const storedRole = localStorage.getItem('userRole');
    console.log(`Role mismatch. Required: ${requiredRole}, Stored: ${storedRole || 'none'}`);
    
    // Redirect to appropriate dashboard based on user role
    let redirectTo;
    
    if (hasRole('admin')) {
      redirectTo = '/admin-dashboard';
    } else if (hasRole('driver')) {
      redirectTo = '/ambulance-dashboard';
    } else {
      // Default fallback
      redirectTo = '/login';
    }
    
    console.log(`Redirecting to ${redirectTo} based on role`);
    return <Navigate to={redirectTo} replace />;
  }
  
  // Render children or outlet (for nested routes)
  return children ? children : <Outlet />;
};

export default ProtectedRoute; 