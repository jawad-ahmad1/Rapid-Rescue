import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../api/apiService';

// Create the auth context
export const AuthContext = createContext(null);

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Function to refresh session based on activity
  const refreshUserSession = () => {
    const session = JSON.parse(localStorage.getItem('userSession') || '{}');
    if (session && session.expiry) {
      // Extend session by 8 hours from current time
      const expiryTime = new Date().getTime() + (8 * 60 * 60 * 1000);
      session.expiry = expiryTime;
      localStorage.setItem('userSession', JSON.stringify(session));
    }
  };

  // Function to check if session is valid
  const isSessionValid = () => {
    try {
      const session = JSON.parse(localStorage.getItem('userSession') || '{}');
      if (!session || !session.expiry) return false;
      
      const now = new Date().getTime();
      return now < session.expiry;
    } catch (error) {
      console.error('Error checking session validity:', error);
      return false;
    }
  };

  // Setup activity listeners to refresh session
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      if (isAuthenticated) {
        refreshUserSession();
      }
    };
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated]);

  // Token refresh interval
  useEffect(() => {
    let refreshInterval;
    
    const setupRefreshInterval = () => {
      if (isAuthenticated) {
        // Try to refresh token every 4 minutes
        refreshInterval = setInterval(async () => {
          try {
            await ApiService.refreshToken();
          } catch (error) {
            console.error('Background token refresh failed:', error);
            // Only logout if session is invalid
            if (!isSessionValid()) {
              logout();
            }
          }
        }, 4 * 60 * 1000); // 4 minutes
      }
    };

    setupRefreshInterval();
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isAuthenticated]);

  // Check if user is authenticated on mount and token changes
  useEffect(() => {
    const validateSession = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // First check if we have tokens
        const accessToken = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        const userRole = localStorage.getItem('userRole');
        const userData = localStorage.getItem('user');
        const driverData = localStorage.getItem('driver');

        if (!accessToken && !refreshToken) {
          setIsAuthenticated(false);
          setCurrentUser(null);
          setIsLoading(false);
          return;
        }

        // If we have a refresh token but no access token, try to refresh
        if (!accessToken && refreshToken) {
          try {
            await ApiService.refreshToken();
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            setIsAuthenticated(false);
            setCurrentUser(null);
            setIsLoading(false);
            return;
          }
        }

        // Try to restore user data from localStorage first
        if (userData || driverData) {
          const user = JSON.parse(userData || driverData);
          setCurrentUser(user);
          setIsAuthenticated(true);
          refreshUserSession();
        }

        // Validate token by fetching current user
        try {
          const currentUserData = await ApiService.getCurrentUser();
          if (currentUserData) {
            setCurrentUser(currentUserData);
            setIsAuthenticated(true);
            refreshUserSession();

            // Update stored user data
            if (userRole === 'admin') {
              localStorage.setItem('user', JSON.stringify(currentUserData));
            } else {
              localStorage.setItem('driver', JSON.stringify(currentUserData));
            }
          }
        } catch (error) {
          console.error('Error fetching current user:', error);
          // Don't logout immediately if we have valid stored data
          if (!userData && !driverData) {
            setCurrentUser(null);
            setIsAuthenticated(false);
          }
        }
      } catch (err) {
        console.error("Auth validation error:", err);
        setError("Authentication failed. Please login again.");
        setIsAuthenticated(false);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, []);

  // Login function
  const login = async (username, password, isAdmin = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Clear any existing auth data first to prevent conflicts
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('driver');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userSession');
      localStorage.removeItem('loginSuccess');
      localStorage.removeItem('loginRedirectPath');
      localStorage.removeItem('activeAlert');
      localStorage.removeItem('navigationAlertData');
      
      // Call the appropriate login endpoint
      let response;
      try {
        response = isAdmin 
          ? await ApiService.adminLogin(username, password)
          : await ApiService.driverLogin(username, password);
          
        if (!response || !response.access) {
          throw new Error('Invalid response format from server');
        }
      } catch (apiError) {
        console.error("API error during login:", apiError);
        throw new Error(apiError.message || "Login failed. Please try again.");
      }
      
      // Store tokens
      if (response.access) {
        localStorage.setItem('access_token', response.access);
      }
      if (response.refresh) {
        localStorage.setItem('refresh_token', response.refresh);
      }
      
      // Set user data
      const userData = isAdmin ? response.user : response.driver;
      if (!userData) {
        throw new Error("Invalid response format. User data missing.");
      }
      
      // Store the user data in localStorage for quick access
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Store role information
      if (isAdmin) {
        localStorage.setItem('userRole', 'admin');
      } else if (response.driver) {
        localStorage.setItem('driver', JSON.stringify(response.driver));
        localStorage.setItem('userRole', 'driver');
      }
      
      // Set current user and authentication state
      setCurrentUser(userData);
      setIsAuthenticated(true);
      
      // Set login success flag and redirect path
      localStorage.setItem('loginSuccess', 'true');
      localStorage.setItem('loginRedirectPath', isAdmin ? '/admin-dashboard' : '/ambulance-dashboard');
      
      // Create a more detailed session object with expiry
      const expiryTime = 8 * 60 * 60 * 1000; // 8 hours
      const session = {
        role: isAdmin ? 'admin' : 'driver',
        expiry: new Date().getTime() + expiryTime,
        userId: userData.id || 'unknown'
      };
      localStorage.setItem('userSession', JSON.stringify(session));
      
      return { 
        success: true, 
        user: userData, 
        isAdmin,
        redirectPath: isAdmin ? '/admin-dashboard' : '/ambulance-dashboard'
      };
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed. Please check your credentials.");
      setIsAuthenticated(false);
      setCurrentUser(null);
      return { success: false, error: err.message || "Login failed" };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      await ApiService.logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Clear auth state regardless of API success
      setCurrentUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('driver');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userSession');
      localStorage.removeItem('loginSuccess');
      localStorage.removeItem('loginRedirectPath');
      localStorage.removeItem('activeAlert');
      localStorage.removeItem('navigationAlertData');
      setIsLoading(false);
      navigate('/login');
    }
  };

  // Check if user has specific role
  const hasRole = (role) => {
    // Check localStorage first for more reliable role information
    const storedRole = localStorage.getItem('userRole');
    console.log(`hasRole check: requested=${role}, stored=${storedRole}`);
    
    if (role === 'admin') {
      // Check localStorage first
      if (storedRole === 'admin') return true;
      
      // Fallback to user object properties
      return currentUser?.is_staff || currentUser?.is_superuser || currentUser?.is_admin;
    }
    
    if (role === 'driver') {
      // Check localStorage first - both 'driver' and 'ambulance' are valid driver roles
      if (storedRole === 'driver' || storedRole === 'ambulance') return true;
      
      // If we have a driver property in localStorage, it's a driver
      if (localStorage.getItem('driver')) return true;
      
      // Fallback to user object properties - driver is not admin
      return currentUser && !currentUser.is_staff && !currentUser.is_superuser && !currentUser.is_admin;
    }
    
    return false;
  };

  const value = {
    currentUser,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    hasRole,
    refreshUserSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 