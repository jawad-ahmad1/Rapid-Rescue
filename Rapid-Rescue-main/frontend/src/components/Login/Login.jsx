import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../services/auth/authContext';
import ApiService from '../../services/api/apiService';
import './Login.css';

// Maximum login attempts before temporary lockout
const MAX_LOGIN_ATTEMPTS = 5;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error: authError, isLoading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'admin',
    keepLoggedIn: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(null);
  const [serverStatus, setServerStatus] = useState({ running: true, checked: false });
  const [showPassword, setShowPassword] = useState(false);

  // Get the return URL from location state or default to dashboard
  const from = location.state?.from || 
               (formData.role === 'admin' ? '/admin-dashboard' : '/ambulance-dashboard');

  // Check server status on component mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        const status = await ApiService.checkServerStatus();
        setServerStatus({ ...status, checked: true });
        
        if (!status.running) {
          setError(`Server connection error: ${status.message}`);
        }
      } catch (err) {
        console.error('Server check error:', err);
        setServerStatus({ running: false, checked: true, message: err.message });
        setError('Cannot connect to server. Please ensure the backend is running.');
      }
    };
    
    checkServer();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Check if server is running
    if (!serverStatus.running) {
      setError('Cannot connect to server. Please ensure the backend is running.');
      return;
    }
    
    // Check if account is locked out
    if (lockoutTime && new Date() < lockoutTime) {
      const remainingMinutes = Math.ceil((lockoutTime - new Date()) / (1000 * 60));
      setError(`Account temporarily locked. Please try again in ${remainingMinutes} minute(s).`);
      return;
    }
    
    setIsLoading(true);

    try {
      // Use the centralized auth context login method
      const isAdmin = formData.role === 'admin';
      const result = await login(formData.username, formData.password, isAdmin);
      
      if (result.success) {
        // Reset login attempts on successful login
        setLoginAttempts(0);
        
        // Navigate to the appropriate dashboard
        const targetPath = isAdmin ? '/admin-dashboard' : '/ambulance-dashboard';
        navigate(targetPath, { replace: true });
      } else {
        // Increment failed login attempts
        const attempts = loginAttempts + 1;
        setLoginAttempts(attempts);
        
        // Implement temporary lockout after MAX_LOGIN_ATTEMPTS
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
          const lockout = new Date();
          lockout.setMinutes(lockout.getMinutes() + 15); // 15 minute lockout
          setLockoutTime(lockout);
          setError(`Too many failed attempts. Account locked for 15 minutes.`);
        } else {
          setError(`${result.error || 'Invalid credentials'}. Attempts: ${attempts}/${MAX_LOGIN_ATTEMPTS}`);
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(`Login failed: ${err.message || 'Please try again.'}`);
      
      // Increment failed login attempts
      const attempts = loginAttempts + 1;
      setLoginAttempts(attempts);
      
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        const lockout = new Date();
        lockout.setMinutes(lockout.getMinutes() + 15);
        setLockoutTime(lockout);
        setError(`Too many failed attempts. Account locked for 15 minutes.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Display either component error or auth context error
  const displayError = error || authError;

  return (
    <div className="login-page">
      <div className="background-video-container">
        <video autoPlay muted loop playsInline className="background-video">
          <source src="/ambulance1.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="background-overlay"></div>
      </div>

      <div className="brand-logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <path d="M22 4L12 14.01l-3-3"></path>
        </svg>
        <span>Rapid Rescue</span>
      </div>

      <main className="login-container">
        <div className="info-container">
          <h2 className="info-title">Welcome to Rapid Rescue</h2>
          <div className="info-text">
            <div className="light-overlay">
              <p className="info-desc">
                Advanced emergency response system designed for faster response times and better patient outcomes.

                Our platform automates emergency response coordination, ensuring rapid deployment of ambulances and minimizing response times in critical situations.
              </p>
            </div>
            <div className="blue-overlay">
              <p className="trust-text">
                Trusted partner for emergency response.
              </p>
            </div>
          </div>
        </div>

        <div className="login-form-container">
          <div className="login-content">
            <h2 className="login-title">Log in to your account</h2>
            <p className="login-subtitle">Enter your credentials to access the dashboard</p>
            {serverStatus.checked && !serverStatus.running && (
              <div className="server-status-warning">
                Warning: Backend server is not running
                <div className="server-url">
                  Trying to connect to: {ApiService.API_BASE_URL}
                </div>
                <button 
                  className="retry-button"
                  onClick={async () => {
                    try {
                      setError('');
                      const status = await ApiService.checkServerStatus();
                      setServerStatus({ ...status, checked: true });
                      
                      if (!status.running) {
                        setError(`Server connection error: ${status.message}`);
                      }
                    } catch (err) {
                      console.error('Server check error:', err);
                      setServerStatus({ running: false, checked: true, message: err.message });
                      setError('Cannot connect to server. Please ensure the backend is running.');
                    }
                  }}
                >
                  Retry Connection
                </button>
              </div>
            )}

            {displayError && (
              <div className="login-error">
                <svg viewBox="0 0 24 24" className="error-icon">
                  <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {displayError}
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="role-selector">
                <button
                  type="button"
                  className={`role-button ${formData.role === 'admin' ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, role: 'admin' })}
                >
                  <svg viewBox="0 0 24 24" className="role-icon">
                    <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  Admin
                </button>
                <button
                  type="button"
                  className={`role-button ${formData.role === 'ambulance' ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, role: 'ambulance' })}
                >
                  <svg viewBox="0 0 24 24" className="role-icon">
                    <path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6zm0 4h8v2H6zm10 0h2v2h-2zm-6-4h8v2h-8z"/>
                  </svg>
                  Ambulance
                </button>
              </div>

              <div className="input-group">
                <label htmlFor="username">Username</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="username"
                    name="username"
                    required
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    required
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="login-options">
                <label className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={formData.keepLoggedIn}
                    onChange={(e) => setFormData({ ...formData, keepLoggedIn: e.target.checked })}
                  />
                  <span className="checkbox-label">Keep me logged in</span>
                </label>
                <a href="/forgot-password" className="forgot-link">Forgot password?</a>
              </div>

              <button 
                type="submit" 
                className="login-button" 
                disabled={isLoading || authLoading}
              >
                <span>
                  {(isLoading || authLoading) ? (
                    <>
                      <div className="spinner"></div>
                      <span>Logging in...</span>
                    </>
                  ) : (
                    <>
                      <svg className="login-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/>
                      </svg>
                      <span>Log in</span>
                    </>
                  )}
                </span>
              </button>
            </form>
          </div>
        </div>
      </main>
      <footer className="copyright-footer">
        © Rapid-Rescue 2025. All rights reserved.
      </footer>
    </div>
  );
};

export default Login;
