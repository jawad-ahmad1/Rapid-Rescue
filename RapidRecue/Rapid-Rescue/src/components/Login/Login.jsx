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

  const handleSubmit = (e) => {
    e.preventDefault();

    // Simulate authentication (replace with real validation)
    if (formData.role === 'admin') {
      navigate('/admin-dashboard');
    } else {
      navigate('/ambulance-dashboard');
    }
  };

  return (
    <div className="login-container">
      <div className="login-image-container">
        {/* Background image is set in CSS */}
      </div>
      <div className="login-form-container">
        <h1>Rapid Rescue</h1>
        <h2>Login</h2>
        <p>Login your account</p>

        <form onSubmit={handleSubmit}>
          <div className="role-buttons">
            <button
              type="button"
              className={`role-button ${formData.role === 'admin' ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, role: 'admin' })}
            >
              Admin
            </button>
            <button
              type="button"
              className={`role-button ${formData.role === 'ambulance' ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, role: 'ambulance' })}
            >
              Ambulance
            </button>
          </div>

          <input
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />

          <div className="login-options">
            <label>
              <input
                type="checkbox"
                checked={formData.keepLoggedIn}
                onChange={(e) => setFormData({ ...formData, keepLoggedIn: e.target.checked })}
              />
              Keep me logged in
            </label>
            <a href="/forgot-password">Forgot password?</a>
          </div>

          <button type="submit" className="login-button">Log in</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
