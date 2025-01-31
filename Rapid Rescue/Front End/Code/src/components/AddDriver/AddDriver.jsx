import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Layout/Sidebar";
import "./AddDriver.css"; // Scoped CSS file

const AddDriver = () => {
  const navigate = useNavigate();
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Validate Inputs Before Submission
  const validateForm = () => {
    let newErrors = {};
    if (!formData.firstName) newErrors.firstName = "First Name is required.";
    if (!formData.lastName) newErrors.lastName = "Last Name is required.";
    if (!formData.email.includes("@")) newErrors.email = "Invalid email format.";
    if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters.";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match.";
    if (!formData.contactNo.match(/^\d{11}$/)) newErrors.contactNo = "Enter a valid 11-digit contact number.";
    if (!formData.cnic.match(/^\d{5}-\d{7}-\d$/)) newErrors.cnic = "Enter CNIC in format 12345-1234567-1.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

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

    try {
      const response = await fetch("http://127.0.0.1:8000/api/drivers/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(driverData),
      });

      if (response.ok) {
        console.log("Driver Registered Successfully");
        navigate("/drivers"); // Redirect back to Driver Data screen
      } else {
        console.error("Failed to register driver");
      }
    } catch (error) {
      console.error("Error registering driver:", error);
    }
  };

  return (
    <div className="add-driver-page">
      <Sidebar />
      <div className="main-content">
        <div className="driver-form-container">
          <h1 className="form-title">Add Driver</h1>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div>
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
                {errors.firstName && <span className="error">{errors.firstName}</span>}
              </div>
              <div>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
                {errors.lastName && <span className="error">{errors.lastName}</span>}
              </div>
              <div>
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                {errors.password && <span className="error">{errors.password}</span>}
              </div>
              <div>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
              </div>
              <div>
                <input
                  type="email"
                  name="email"
                  placeholder="E-mail"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                {errors.email && <span className="error">{errors.email}</span>}
              </div>
              <div>
                <input
                  type="text"
                  name="contactNo"
                  placeholder="Contact No"
                  value={formData.contactNo}
                  onChange={handleChange}
                  required
                />
                {errors.contactNo && <span className="error">{errors.contactNo}</span>}
              </div>
              <input
                type="text"
                name="areaOfService"
                placeholder="Area of Service"
                value={formData.areaOfService}
                onChange={handleChange}
                required
              />
              <input
                type="text"
                name="serviceProvider"
                placeholder="Service Provider"
                value={formData.serviceProvider}
                onChange={handleChange}
                required
              />
              <div>
                <input
                  type="text"
                  name="cnic"
                  placeholder="CNIC (e.g. 12345-1234567-1)"
                  value={formData.cnic}
                  onChange={handleChange}
                  required
                />
                {errors.cnic && <span className="error">{errors.cnic}</span>}
              </div>
            </div>
            <button type="submit" className="register-btn">Register</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddDriver;
