import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EditDriver from '../EditDriver';
import MockApiService from '../../../services/mockApi/mockApiService';

// Mock the MockApiService
jest.mock('../../../services/mockApi/mockApiService');

describe('EditDriver Component', () => {
  const mockDriver = {
    id: "DRV-101",
    name: "Muhammad Ali",
    phone: "+92-300-1234567",
    cnic: "35202-1234567-1",
    serviceProvider: "1122",
    status: "available",
    ambulance: "AMB-001",
    location: "Gulberg, Lahore",
    createdAt: "2024-01-15T10:30:00Z"
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock the API responses
    MockApiService.getDriver.mockResolvedValue({
      success: true,
      data: mockDriver
    });
    MockApiService.updateDriver.mockResolvedValue({
      success: true,
      message: 'Driver updated successfully'
    });
  });

  const renderEditDriver = () => {
    return render(
      <BrowserRouter>
        <Routes>
          <Route path="/driver-data/edit/:id" element={<EditDriver />} />
        </Routes>
      </BrowserRouter>
    );
  };

  test('renders edit driver form with pre-filled data', async () => {
    renderEditDriver();

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Muhammad')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Ali')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+92-300-1234567')).toBeInTheDocument();
      expect(screen.getByDisplayValue('35202-1234567-1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1122')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Gulberg, Lahore')).toBeInTheDocument();
    });
  });

  test('form validation works correctly', async () => {
    renderEditDriver();

    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Muhammad')).toBeInTheDocument();
    });

    // Clear required fields
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Contact Number'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('CNIC Number'), { target: { value: '' } });

    // Try to submit form
    const submitButton = screen.getByText('Update Driver');
    fireEvent.click(submitButton);

    // Check for validation errors
    expect(screen.getByText('First Name is required')).toBeInTheDocument();
    expect(screen.getByText('Last Name is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid 11-digit contact number')).toBeInTheDocument();
    expect(screen.getByText('CNIC must be in format 12345-1234567-1')).toBeInTheDocument();
  });

  test('form submission works correctly with valid data', async () => {
    renderEditDriver();

    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Muhammad')).toBeInTheDocument();
    });

    // Update some fields
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Contact Number'), { target: { value: '03001234567' } });
    fireEvent.change(screen.getByLabelText('CNIC Number'), { target: { value: '12345-1234567-1' } });
    fireEvent.change(screen.getByLabelText('Service Provider'), { target: { value: 'Edhi' } });
    fireEvent.change(screen.getByLabelText('Area of Service'), { target: { value: 'Karachi' } });

    // Submit the form
    const submitButton = screen.getByText('Update Driver');
    fireEvent.click(submitButton);

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText('Driver updated successfully')).toBeInTheDocument();
    });

    // Check if API was called with correct data
    expect(MockApiService.updateDriver).toHaveBeenCalledWith(
      'DRV-101',
      expect.objectContaining({
        name: 'John Doe',
        phone: '03001234567',
        cnic: '12345-1234567-1',
        serviceProvider: 'Edhi',
        location: 'Karachi'
      })
    );
  });

  test('handles API errors correctly', async () => {
    // Mock API error
    MockApiService.updateDriver.mockRejectedValue(new Error('Failed to update driver'));

    renderEditDriver();

    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Muhammad')).toBeInTheDocument();
    });

    // Update some fields
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });

    // Submit the form
    const submitButton = screen.getByText('Update Driver');
    fireEvent.click(submitButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Failed to update driver')).toBeInTheDocument();
    });
  });

  test('back button navigation works correctly', async () => {
    renderEditDriver();

    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Muhammad')).toBeInTheDocument();
    });

    // Click the back button
    const backButton = screen.getByText('Back to Drivers');
    fireEvent.click(backButton);

    // Check if the URL changes
    expect(window.location.pathname).toBe('/driver-data');
  });

  test('cancel button navigation works correctly', async () => {
    renderEditDriver();

    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Muhammad')).toBeInTheDocument();
    });

    // Click the cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Check if the URL changes
    expect(window.location.pathname).toBe('/driver-data');
  });

  test('handles loading state correctly', async () => {
    // Mock slow API response
    MockApiService.getDriver.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    renderEditDriver();

    // Check if loading state is shown
    expect(screen.getByText('Loading driver details...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Muhammad')).toBeInTheDocument();
    });
  });
}); 