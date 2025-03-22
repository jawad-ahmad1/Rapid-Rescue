import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AddDriver from '../AddDriver';

// Mock the fetch function
global.fetch = jest.fn();

describe('AddDriver Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock successful API response
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        message: 'Driver added successfully'
      })
    });
  });

  const renderAddDriver = () => {
    return render(
      <BrowserRouter>
        <AddDriver />
      </BrowserRouter>
    );
  };

  test('renders add driver form with all elements', () => {
    renderAddDriver();

    // Check if main elements are present
    expect(screen.getByText('Add New Driver')).toBeInTheDocument();
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Contact Number')).toBeInTheDocument();
    expect(screen.getByLabelText('CNIC Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Service Provider')).toBeInTheDocument();
    expect(screen.getByLabelText('Area of Service')).toBeInTheDocument();
  });

  test('form validation works correctly', async () => {
    renderAddDriver();

    // Try to submit empty form
    const submitButton = screen.getByText('Add Driver');
    fireEvent.click(submitButton);

    // Check for validation errors
    expect(screen.getByText('First Name is required')).toBeInTheDocument();
    expect(screen.getByText('Last Name is required')).toBeInTheDocument();
    expect(screen.getByText('Valid email is required')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid 11-digit contact number')).toBeInTheDocument();
    expect(screen.getByText('CNIC must be in format 12345-1234567-1')).toBeInTheDocument();
    expect(screen.getByText('Service provider is required')).toBeInTheDocument();
    expect(screen.getByText('Area of service is required')).toBeInTheDocument();
  });

  test('form submission works correctly with valid data', async () => {
    renderAddDriver();

    // Fill in the form with valid data
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john.doe@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Contact Number'), { target: { value: '03001234567' } });
    fireEvent.change(screen.getByLabelText('CNIC Number'), { target: { value: '12345-1234567-1' } });
    fireEvent.change(screen.getByLabelText('Service Provider'), { target: { value: '1122' } });
    fireEvent.change(screen.getByLabelText('Area of Service'), { target: { value: 'Lahore' } });

    // Submit the form
    const submitButton = screen.getByText('Add Driver');
    fireEvent.click(submitButton);

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText('Driver added successfully! Redirecting to driver list...')).toBeInTheDocument();
    });

    // Check if API was called with correct data
    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/drivers/',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"name":"John Doe"'),
      })
    );
  });

  test('handles API errors correctly', async () => {
    // Mock API error
    global.fetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        message: 'Failed to add driver'
      })
    });

    renderAddDriver();

    // Fill in the form with valid data
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john.doe@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Contact Number'), { target: { value: '03001234567' } });
    fireEvent.change(screen.getByLabelText('CNIC Number'), { target: { value: '12345-1234567-1' } });
    fireEvent.change(screen.getByLabelText('Service Provider'), { target: { value: '1122' } });
    fireEvent.change(screen.getByLabelText('Area of Service'), { target: { value: 'Lahore' } });

    // Submit the form
    const submitButton = screen.getByText('Add Driver');
    fireEvent.click(submitButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Failed to add driver')).toBeInTheDocument();
    });
  });

  test('back button navigation works correctly', () => {
    renderAddDriver();

    // Click the back button
    const backButton = screen.getByText('Back to Drivers');
    fireEvent.click(backButton);

    // Check if the URL changes
    expect(window.location.pathname).toBe('/driver-data');
  });

  test('cancel button navigation works correctly', () => {
    renderAddDriver();

    // Click the cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Check if the URL changes
    expect(window.location.pathname).toBe('/driver-data');
  });
}); 