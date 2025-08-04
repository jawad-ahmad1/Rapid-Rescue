/**
 * Authentication helper functions for Rapid Rescue
 */

/**
 * Checks if the user session is valid
 * @returns {Object|null} Session data if valid, null if invalid or expired
 */
export const getValidSession = () => {
  try {
    const sessionData = localStorage.getItem('userSession');
    if (!sessionData) return null;
    
    const session = JSON.parse(sessionData);
    const now = new Date().getTime();
    
    // Check if session has expired
    if (session.expiry && now > session.expiry) {
      // Clear expired session
      localStorage.removeItem('userSession');
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error validating session:', error);
    // Clear corrupted session data
    localStorage.removeItem('userSession');
    return null;
  }
};

/**
 * Logs out the user by clearing all session data
 */
export const logoutUser = () => {
  // Clear all auth-related data
  localStorage.removeItem('userSession');
  localStorage.removeItem('userRole');
  localStorage.removeItem('driver');
  localStorage.removeItem('user');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  
  // Redirect to login page
  window.location.href = '/login';
};

/**
 * Refreshes the session expiry time
 * @param {boolean} extendedSession - Whether to use extended session time (24h vs 1h)
 */
export const refreshSession = (extendedSession = false) => {
  try {
    const session = getValidSession();
    if (!session) return;
    
    // Set new expiry time
    const expiryTime = extendedSession ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
    session.expiry = new Date().getTime() + expiryTime;
    
    // Update session in storage
    localStorage.setItem('userSession', JSON.stringify(session));
  } catch (error) {
    console.error('Error refreshing session:', error);
  }
};

/**
 * Check if the user is authenticated based on JWT access token
 * @returns {boolean} True if user has a valid access token
 */
export const hasValidToken = () => {
  const accessToken = localStorage.getItem('access_token');
  return !!accessToken;
};

/**
 * Get the current authenticated user's data from local storage
 * @returns {Object|null} User object or null if not authenticated
 */
export const getCurrentUser = () => {
  try {
    // Check for admin user first
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    
    // Check for driver data
    const driverStr = localStorage.getItem('driver');
    if (driverStr) {
      const driver = JSON.parse(driverStr);
      return { ...driver, role: 'driver' };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Checks if user has admin access
 * @returns {boolean} True if user has admin access
 */
export const hasAdminAccess = () => {
  const userRole = localStorage.getItem('userRole');
  return userRole === 'admin';
};

/**
 * Checks if user has driver access
 * @returns {boolean} True if user has driver access
 */
export const hasDriverAccess = () => {
  const userRole = localStorage.getItem('userRole');
  return userRole === 'driver';
};

/**
 * Get the JWT access token
 * @returns {string|null} JWT access token or null
 */
export const getAuthToken = () => {
  return localStorage.getItem('access_token');
};

/**
 * Get the JWT refresh token
 * @returns {string|null} JWT refresh token or null
 */
export const getRefreshToken = () => {
  return localStorage.getItem('refresh_token');
};

/**
 * Store JWT tokens in local storage
 * @param {string} accessToken - JWT access token
 * @param {string} refreshToken - JWT refresh token
 */
export const storeTokens = (accessToken, refreshToken) => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
}; 