import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'admin',
    keepLoggedIn: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate authentication (replace with real validation)
      if (formData.username && formData.password) {
        // Save login state if keep logged in is checked
        if (formData.keepLoggedIn) {
          localStorage.setItem('userToken', 'sample-token');
          localStorage.setItem('userRole', formData.role);
        }

        // Navigate based on role
        if (formData.role === 'admin') {
          navigate('/admin-dashboard');
        } else {
          navigate('/ambulance-dashboard');
        }
      } else {
        setError('Please enter both username and password');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-header">
        <h2>Rapid Rescue</h2>
        <p>Emergency Response System</p>
      </div>
      
      <main className="login-container">
        {/* Left side - Image */}
        <div className="login-image-container">
          <div className="overlay"></div>
        </div>
        
        {/* Right side - Login Form */}
        <div className="login-form-container">
          <div className="login-content">
            <div className="login-title">
              <p className="subtitle">Log in to your account</p>
            </div>

            {error && (
              <div className="login-error">
                <svg viewBox="0 0 24 24" className="error-icon">
                  <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
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
                  <svg viewBox="0 0 24 24" className="input-icon">
                    <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  <input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <svg viewBox="0 0 24 24" className="input-icon">
                    <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
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
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="login-icon">
                      <path fill="currentColor" d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/>
                    </svg>
                    <span>Log in</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
      
      <div className="login-info">
        <div className="login-info-content">
          <div className="about-section">
            <h3>About Rapid Rescue</h3>
            <p>An advanced emergency response system designed to minimize response times and save lives.</p>
          </div>
          
          <div className="features-section">
            <h3>Key Features</h3>
            <div className="features-grid">
              <div className="feature">
                <span className="feature-icon">⏱️</span>
                <div className="feature-text">
                  <span className="feature-title">Real-time tracking</span>
                  <span className="feature-desc">Monitor ambulance locations in real-time</span>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">📍</span>
                <div className="feature-text">
                  <span className="feature-title">Precise location</span>
                  <span className="feature-desc">Pinpoint accuracy for emergency sites</span>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">🚑</span>
                <div className="feature-text">
                  <span className="feature-title">Smart routing</span>
                  <span className="feature-desc">Optimal path calculation for faster response</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="login-footer">
        <div className="footer-content">
          <p>&copy; 2024 Rapid Rescue. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Login;
