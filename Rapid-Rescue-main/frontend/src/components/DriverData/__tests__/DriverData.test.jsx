import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApiService from '../../../services/api/apiService';
import DriverData from '../DriverData';
import { BrowserRouter } from 'react-router-dom';

// Mock the real API service
jest.mock('../../../services/api/apiService', () => ({
  getAllDrivers: jest.fn().mockResolvedValue([
    {
      id: 1,
      name: 'Test Driver 1',
      contact_no: '12345678901',
      license_no: 'DL12345',
      experience: 5,
      address: 'Test Address 1',
      status: 'available'
    },
    {
      id: 2,
      name: 'Test Driver 2',
      contact_no: '98765432109',
      license_no: 'DL54321',
      experience: 3,
      address: 'Test Address 2',
      status: 'on_duty'
    }
  ]),
  deleteDriver: jest.fn().mockResolvedValue({ success: true, message: 'Driver deleted successfully' })
}));

describe('DriverData Component', () => {
  const mockDrivers = [
    {
      id: "DRV-101",
      name: "Muhammad Ali",
      phone: "+92-300-1234567",
      cnic: "35202-1234567-1",
      serviceProvider: "1122",
      status: "available",
      ambulance: "AMB-001",
      location: "Gulberg, Lahore",
      createdAt: "2024-01-15T10:30:00Z"
    },
    {
      id: "DRV-102",
      name: "Hassan Ahmed",
      phone: "+92-301-2345678",
      cnic: "35202-2345678-2",
      serviceProvider: "1122",
      status: "on-duty",
      ambulance: "AMB-004",
      location: "DHA, Lahore",
      createdAt: "2024-01-14T15:45:00Z"
    }
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock the getDrivers function
    ApiService.getAllDrivers.mockResolvedValue({
      success: true,
      data: mockDrivers
    });
  });

  const renderDriverData = () => {
    return render(
      <BrowserRouter>
        <DriverData />
      </BrowserRouter>
    );
  };

  test('renders driver data page with all elements', async () => {
    renderDriverData();

    // Check if main elements are present
    expect(screen.getByText('Driver Management')).toBeInTheDocument();
    expect(screen.getByText('Add New Driver')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search drivers...')).toBeInTheDocument();
    
    // Wait for the table to load
    await waitFor(() => {
      expect(screen.getByText('Muhammad Ali')).toBeInTheDocument();
      expect(screen.getByText('Hassan Ahmed')).toBeInTheDocument();
    });
  });

  test('search functionality works correctly', async () => {
    renderDriverData();
    
    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByText('Muhammad Ali')).toBeInTheDocument();
    });

    // Get the search input
    const searchInput = screen.getByPlaceholderText('Search drivers...');
    
    // Type in the search box
    fireEvent.change(searchInput, { target: { value: 'Muhammad' } });

    // Check if only matching results are shown
    expect(screen.getByText('Muhammad Ali')).toBeInTheDocument();
    expect(screen.queryByText('Hassan Ahmed')).not.toBeInTheDocument();
  });

  test('sort functionality works correctly', async () => {
    renderDriverData();
    
    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByText('Muhammad Ali')).toBeInTheDocument();
    });

    // Get the sort button
    const sortButton = screen.getByText('Newest First');
    
    // Click the sort button
    fireEvent.click(sortButton);

    // Check if the sort text changes
    expect(screen.getByText('Oldest First')).toBeInTheDocument();
  });

  test('status filter works correctly', async () => {
    renderDriverData();
    
    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByText('Muhammad Ali')).toBeInTheDocument();
    });

    // Get the status filter
    const statusFilter = screen.getByLabelText('Status:');
    
    // Change the status filter
    fireEvent.change(statusFilter, { target: { value: 'on-duty' } });

    // Check if only on-duty drivers are shown
    expect(screen.queryByText('Muhammad Ali')).not.toBeInTheDocument();
    expect(screen.getByText('Hassan Ahmed')).toBeInTheDocument();
  });

  test('delete driver functionality works correctly', async () => {
    // Mock the delete function
    ApiService.deleteDriver.mockResolvedValue({
      success: true,
      message: 'Driver deleted successfully'
    });

    renderDriverData();
    
    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByText('Muhammad Ali')).toBeInTheDocument();
    });

    // Get the delete button for the first driver
    const deleteButton = screen.getAllByTitle('Delete driver')[0];
    
    // Click the delete button
    fireEvent.click(deleteButton);

    // Check if confirmation dialog appears
    expect(screen.getByText('Are you sure you want to delete this driver?')).toBeInTheDocument();

    // Click confirm delete
    const confirmButton = screen.getByText('Delete');
    fireEvent.click(confirmButton);

    // Wait for the success message
    await waitFor(() => {
      expect(screen.getByText('Driver deleted successfully')).toBeInTheDocument();
    });
  });

  test('navigation to add driver works correctly', async () => {
    const { container } = renderDriverData();
    
    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByText('Muhammad Ali')).toBeInTheDocument();
    });

    // Get the add driver button
    const addButton = screen.getByText('Add New Driver');
    
    // Click the add button
    fireEvent.click(addButton);

    // Check if the URL changes
    expect(window.location.pathname).toBe('/add-driver');
  });

  test('navigation to view driver works correctly', async () => {
    renderDriverData();
    
    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByText('Muhammad Ali')).toBeInTheDocument();
    });

    // Get the view button for the first driver
    const viewButton = screen.getAllByTitle('View driver details')[0];
    
    // Click the view button
    fireEvent.click(viewButton);

    // Check if the URL changes
    expect(window.location.pathname).toBe('/driver-data/view/DRV-101');
  });

  test('navigation to edit driver works correctly', async () => {
    renderDriverData();
    
    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByText('Muhammad Ali')).toBeInTheDocument();
    });

    // Get the edit button for the first driver
    const editButton = screen.getAllByTitle('Edit driver information')[0];
    
    // Click the edit button
    fireEvent.click(editButton);

    // Check if the URL changes
    expect(window.location.pathname).toBe('/driver-data/edit/DRV-101');
  });

  test('handles API errors correctly', async () => {
    // Mock API error
    ApiService.getAllDrivers.mockRejectedValue(new Error('Failed to fetch drivers'));

    renderDriverData();

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch drivers')).toBeInTheDocument();
    });
  });
}); 