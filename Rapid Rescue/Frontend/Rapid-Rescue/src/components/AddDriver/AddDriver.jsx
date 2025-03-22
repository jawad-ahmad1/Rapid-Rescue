import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Layout/adminSidebar";
import "./AddDriver.css";

const AddDriver = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    email: "",
    contactNo: "",
    areaOfService: "",
    serviceProvider: "",
    cnic: "",
  });

  const [errors, setErrors] = useState({});

  // Handle Input Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Validate Inputs Before Submission
  const validateForm = () => {
    let newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First Name is required";
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last Name is required";
    }
    
    if (!formData.email.includes("@")) {
      newErrors.email = "Valid email is required";
    }
    
    if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    if (!formData.contactNo.match(/^\d{11}$/)) {
      newErrors.contactNo = "Enter a valid 11-digit contact number";
    }
    
    if (!formData.cnic.match(/^\d{5}-\d{7}-\d$/)) {
      newErrors.cnic = "CNIC must be in format 12345-1234567-1";
    }
    
    if (!formData.serviceProvider) {
      newErrors.serviceProvider = "Service provider is required";
    }
    
    if (!formData.areaOfService) {
      newErrors.areaOfService = "Area of service is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);
      
      const driverData = {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        password: formData.password,
        phone: formData.contactNo,
        serviceProvider: formData.serviceProvider,
        cnic: formData.cnic,
        areaOfService: formData.areaOfService,
        status: "active",
      };

      const response = await fetch("http://127.0.0.1:8000/api/drivers/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(driverData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors from the backend
        if (response.status === 400 && data.errors) {
          const backendErrors = {};
          Object.keys(data.errors).forEach(key => {
            backendErrors[key] = data.errors[key][0];
          });
          setErrors(backendErrors);
          throw new Error("Please fix the validation errors");
        }
        throw new Error(data.message || "Failed to register driver");
      }

      setSuccess(true);
      setTimeout(() => {
        navigate("/driver-data");
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to add driver. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="add-driver-container" style={{ marginLeft: '250px', padding: '2rem' }}>
        <div className="add-driver-header">
          <button className="back-button" onClick={() => navigate("/driver-data")}>
            <i className="fas fa-arrow-left"></i> Back to Drivers
          </button>
          <h1>Add New Driver</h1>
        </div>

        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            <i className="fas fa-check-circle"></i>
            Driver added successfully! Redirecting to driver list...
          </div>
        )}

        {!success && (
          <div className="driver-form-container">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    className={errors.firstName ? 'error' : ''}
                  />
                  {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    className={errors.lastName ? 'error' : ''}
                  />
                  {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email"
                    className={errors.email ? 'error' : ''}
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    className={errors.password ? 'error' : ''}
                  />
                  {errors.password && <span className="error-text">{errors.password}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    className={errors.confirmPassword ? 'error' : ''}
                  />
                  {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="contactNo">Contact Number</label>
                  <input
                    type="text"
                    id="contactNo"
                    name="contactNo"
                    value={formData.contactNo}
                    onChange={handleChange}
                    placeholder="Enter 11-digit contact number"
                    className={errors.contactNo ? 'error' : ''}
                  />
                  {errors.contactNo && <span className="error-text">{errors.contactNo}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="cnic">CNIC Number</label>
                  <input
                    type="text"
                    id="cnic"
                    name="cnic"
                    value={formData.cnic}
                    onChange={handleChange}
                    placeholder="12345-1234567-1"
                    className={errors.cnic ? 'error' : ''}
                  />
                  {errors.cnic && <span className="error-text">{errors.cnic}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="serviceProvider">Service Provider</label>
                  <select
                    id="serviceProvider"
                    name="serviceProvider"
                    value={formData.serviceProvider}
                    onChange={handleChange}
                    className={errors.serviceProvider ? 'error' : ''}
                  >
                    <option value="">Select Service Provider</option>
                    <option value="1122">1122</option>
                    <option value="Edhi">Edhi</option>
                    <option value="Chhipa">Chhipa</option>
                  </select>
                  {errors.serviceProvider && <span className="error-text">{errors.serviceProvider}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="areaOfService">Area of Service</label>
                  <input
                    type="text"
                    id="areaOfService"
                    name="areaOfService"
                    value={formData.areaOfService}
                    onChange={handleChange}
                    placeholder="Enter area of service"
                    className={errors.areaOfService ? 'error' : ''}
                  />
                  {errors.areaOfService && <span className="error-text">{errors.areaOfService}</span>}
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => navigate("/driver-data")}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-button"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Adding Driver...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-plus"></i>
                      Add Driver
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddDriver;
