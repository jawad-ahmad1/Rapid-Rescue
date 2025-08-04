import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaUserPlus, 
  FaSave, 
  FaTimes, 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaIdCard, 
  FaMapMarkerAlt, 
  FaCity, 
  FaGlobe,
  FaBuilding,
  FaRoad,
  FaLock
} from 'react-icons/fa';
import DashboardLayout from '../layouts/DashboardLayout';
import ApiService from '../../services/api/apiService';
import './NewAddDriver.css';

const NewAddDriver = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    name: '',
    contact_no: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    license_no: '',
    experience: 0,
    street_address: '',
    city: '',
    province: '',
    postal_code: '',
    country: 'Pakistan',
    status: 'available',
    photo: null
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          photo: 'Please select an image file (jpg, png, etc.)'
        }));
        e.target.value = '';
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          photo: 'Image size should be less than 5MB'
        }));
        e.target.value = '';
        return;
      }
      
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.photo;
        return newErrors;
      });

      setFormData(prev => ({
        ...prev,
        photo: file
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Name validation
    if (!formData.name || formData.name.length === 0) {
      newErrors.name = 'Name is required';
    }

    // Contact number validation
    const contactRegex = /^\d{11}$/;
    if (!contactRegex.test(formData.contact_no)) {
      newErrors.contact_no = 'Contact number must be 11 digits';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // License number validation
    if (!formData.license_no || formData.license_no.length === 0) {
      newErrors.license_no = 'License number is required';
    }

    // Experience validation
    if (formData.experience < 0) {
      newErrors.experience = 'Experience cannot be negative';
    }

    // Address validation
    if (!formData.street_address) {
      newErrors.street_address = 'Street address is required';
    }
    if (!formData.city) {
      newErrors.city = 'City is required';
    }
    if (!formData.province) {
      newErrors.province = 'Province is required';
    }
    if (!formData.postal_code) {
      newErrors.postal_code = 'Postal code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const data = new FormData();
      
      // Combine address fields
      const fullAddress = `${formData.street_address}, ${formData.city}, ${formData.province} ${formData.postal_code}, ${formData.country}`;
      
      // Append form data
      data.append('name', formData.name);
      data.append('contact_no', formData.contact_no);
      data.append('email', formData.email);
      data.append('username', formData.username);
      data.append('password', formData.password);
      data.append('license_no', formData.license_no);
      data.append('experience', formData.experience.toString());
      data.append('address', fullAddress);
      data.append('status', formData.status);
      
      if (formData.photo && formData.photo instanceof File && formData.photo.type.startsWith('image/')) {
        data.append('photo', formData.photo);
      }

      const response = await ApiService.createDriverWithCredentials(data);

      if (response && response.id) {
        setMessage({
          type: 'success',
          text: 'Driver added successfully!'
        });
        navigate('/admin-driver-management');
      } else {
        throw new Error('Failed to add driver');
      }

    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to add driver. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="new-add-driver">
        <div className="new-add-driver__header">
          <div className="new-add-driver__title">
            <FaUserPlus className="new-add-driver__icon" />
            <h1>Add New Driver</h1>
          </div>
        </div>

        <div className="new-add-driver__content">
          {message.text && (
            <div className={`new-add-driver__message ${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="new-add-driver__form" encType="multipart/form-data">
            <div className="new-add-driver__form-container">
              {/* Left Column - Personal Information */}
              <div className="new-add-driver__column">
                <div className="new-add-driver__section">
                  <h2 className="new-add-driver__section-title">
                    <FaUser /> Personal Information
                  </h2>
                  <div className="form-group">
                    <label htmlFor="name">
                      <FaUser /> Full Legal Name *
                    </label>
                    <small className="field-helper">Enter your complete name as it appears on CNIC</small>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g., Muhammad Ahmed Khan"
                      required
                    />
                    {errors.name && <span className="error-message">{errors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">
                      <FaEnvelope /> Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g., ahmed.khan@email.com"
                      required
                    />
                    {errors.email && <span className="error-message">{errors.email}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="contact_no">
                      <FaPhone /> Contact Number *
                    </label>
                    <small className="field-helper">Enter Pakistani mobile number (11 digits)</small>
                    <input
                      type="tel"
                      id="contact_no"
                      name="contact_no"
                      value={formData.contact_no}
                      onChange={handleChange}
                      pattern="[0-9]{11}"
                      placeholder="e.g., 03XX XXXXXXX"
                      required
                    />
                    {errors.contact_no && <span className="error-message">{errors.contact_no}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="photo">
                      <FaUser /> Profile Photo
                    </label>
                    <input
                      type="file"
                      id="photo"
                      name="photo"
                      onChange={handleFileChange}
                      accept="image/*"
                      className="form-control"
                    />
                    {errors.photo && <span className="error-message">{errors.photo}</span>}
                    <small className="field-helper">Upload a profile photo (jpg, png formats accepted, max 5MB)</small>
                  </div>
                </div>

                {/* Account Information */}
                <div className="new-add-driver__section">
                  <h2 className="new-add-driver__section-title">
                    <FaLock /> Account Information
                  </h2>
                  <div className="form-group">
                    <label htmlFor="username">
                      <FaUser /> Username (for login) *
                    </label>
                    <small className="field-helper">Choose a unique username for logging into the system</small>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="e.g., john_smith or john123"
                      required
                      autoComplete="off"
                    />
                    {errors.username && <span className="error-message">{errors.username}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">
                      <FaLock /> Password *
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength="6"
                      autoComplete="new-password"
                    />
                    {errors.password && <span className="error-message">{errors.password}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">
                      <FaLock /> Confirm Password *
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      autoComplete="new-password"
                    />
                    {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                  </div>
                </div>
              </div>

              {/* Right Column - Professional Details & Address */}
              <div className="new-add-driver__column">
                <div className="new-add-driver__section">
                  <h2 className="new-add-driver__section-title">
                    <FaIdCard /> Professional Details
                  </h2>
                  <div className="form-group">
                    <label htmlFor="license_no">
                      <FaIdCard /> License Number *
                    </label>
                    <input
                      type="text"
                      id="license_no"
                      name="license_no"
                      value={formData.license_no}
                      onChange={handleChange}
                      placeholder="Enter driver's license number"
                      required
                    />
                    {errors.license_no && <span className="error-message">{errors.license_no}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="experience">
                      <FaUser /> Experience (Years) *
                    </label>
                    <input
                      type="number"
                      id="experience"
                      name="experience"
                      value={formData.experience}
                      onChange={handleChange}
                      min="0"
                      required
                    />
                    {errors.experience && <span className="error-message">{errors.experience}</span>}
                  </div>
                </div>

                <div className="new-add-driver__section">
                  <h2 className="new-add-driver__section-title">
                    <FaMapMarkerAlt /> Address Information
                  </h2>
                  <div className="form-group">
                    <label htmlFor="street_address">
                      <FaRoad /> Street Address *
                    </label>
                    <input
                      type="text"
                      id="street_address"
                      name="street_address"
                      value={formData.street_address}
                      onChange={handleChange}
                      placeholder="e.g., House 123, Street 4, Phase 2"
                      required
                    />
                    {errors.street_address && <span className="error-message">{errors.street_address}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="city">
                      <FaCity /> City *
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="e.g., Lahore, Karachi, Islamabad"
                      required
                    />
                    {errors.city && <span className="error-message">{errors.city}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="province">
                      <FaBuilding /> Province/Territory *
                    </label>
                    <select
                      id="province"
                      name="province"
                      value={formData.province}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Province/Territory</option>
                      <option value="Punjab">Punjab</option>
                      <option value="Sindh">Sindh</option>
                      <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                      <option value="Balochistan">Balochistan</option>
                      <option value="Islamabad">Islamabad Capital Territory</option>
                      <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
                      <option value="Azad Kashmir">Azad Kashmir</option>
                    </select>
                    {errors.province && <span className="error-message">{errors.province}</span>}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="postal_code">
                        <FaMapMarkerAlt /> Postal Code *
                      </label>
                      <input
                        type="text"
                        id="postal_code"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleChange}
                        placeholder="e.g., 54000"
                        pattern="[0-9]{5}"
                        maxLength="5"
                        required
                      />
                      <small className="field-helper">5-digit postal code</small>
                      {errors.postal_code && <span className="error-message">{errors.postal_code}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="country">
                        <FaGlobe /> Country
                      </label>
                      <input
                        type="text"
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        readOnly
                        className="readonly-field"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="new-add-driver__actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => navigate('/admin-driver-management')}
                disabled={loading}
              >
                <FaTimes /> Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                <FaSave /> {loading ? 'Saving...' : 'Save Driver'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {loading && (
        <div className="new-add-driver__loading">
          <div className="spinner"></div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default NewAddDriver; 