import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ApiService from '../../../services/api/apiService';
import EditDriver from '../EditDriver';

// Mock the real API service
jest.mock('../../../services/api/apiService', () => ({
  getDriverById: jest.fn().mockResolvedValue({
    id: 1,
    name: 'Test Driver',
    contact_no: '12345678901',
    license_no: 'DL12345',
    experience: 5,
    address: 'Test Address',
    status: 'available',
    username: 'testdriver',
    email: 'test@example.com',
    user_id: 101
  }),
  updateDriver: jest.fn().mockResolvedValue({
    success: true,
    message: 'Driver updated successfully',
    data: {
      id: 1,
      name: 'Updated Driver',
      contact_no: '12345678901',
      license_no: 'DL12345',
      experience: 5,
      address: 'Test Address',
      status: 'available'
    }
  })
}));

describe('EditDriver Component', () => {
  const mockNavigate = jest.fn();
  
  // Mock useNavigate
  jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate
  }));

  // Setup render function
  const renderEditDriver = () => {
    return render(
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<EditDriver />} />
        </Routes>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders edit driver form with driver data', async () => {
    renderEditDriver();
    
    // Wait for the driver data to load
    await waitFor(() => {
      expect(ApiService.getDriverById).toHaveBeenCalled();
    });
    
    // Check if form fields are filled with driver data
    expect(screen.getByDisplayValue('Test Driver')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12345678901')).toBeInTheDocument();
    expect(screen.getByDisplayValue('DL12345')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Address')).toBeInTheDocument();
  });

  test('handles form submission', async () => {
    renderEditDriver();
    
    // Wait for the driver data to load
    await waitFor(() => {
      expect(ApiService.getDriverById).toHaveBeenCalled();
    });
    
    // Update a field
    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: 'Updated Driver Name' } });
    
    // Submit the form
    const submitButton = screen.getByText(/save changes/i);
    fireEvent.click(submitButton);
    
    // Check if updateDriver was called
    await waitFor(() => {
      expect(ApiService.updateDriver).toHaveBeenCalled();
    });
    
    // Check for success message
    expect(screen.getByText(/driver updated successfully/i)).toBeInTheDocument();
  });

  test('handles API errors', async () => {
    // Mock API error
    ApiService.getDriverById.mockRejectedValueOnce(new Error('Failed to fetch driver data'));
    
    renderEditDriver();
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/failed to fetch driver data/i)).toBeInTheDocument();
    });
  });
}); 