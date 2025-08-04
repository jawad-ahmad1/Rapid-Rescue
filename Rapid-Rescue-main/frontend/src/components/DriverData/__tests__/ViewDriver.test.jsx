import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ApiService from '../../../services/api/apiService';
import ViewDriver from '../ViewDriver';

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
  })
}));

describe('ViewDriver Component', () => {
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

  const mockPerformance = {
    success: true,
    data: {
      totalTrips: 45,
      completedTrips: 42,
      averageRating: 4.8,
      responseTime: "8.5 minutes",
      completionRate: "93.3%"
    }
  };

  const mockHistory = {
    success: true,
    data: [
      {
        id: "TRP-001",
        date: "2024-01-15T10:30:00Z",
        pickup: "Gulberg, Lahore",
        dropoff: "Shadman, Lahore",
        status: "completed",
        rating: 5
      }
    ]
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock the API responses
    ApiService.getDriver.mockResolvedValue({
      success: true,
      data: mockDriver
    });
    ApiService.getDriverPerformance.mockResolvedValue(mockPerformance);
    ApiService.getDriverHistory.mockResolvedValue(mockHistory);
  });

  const renderViewDriver = () => {
    return render(
      <BrowserRouter>
        <Routes>
          <Route path="/driver-data/view/:id" element={<ViewDriver />} />
        </Routes>
      </BrowserRouter>
    );
  };

  test('renders driver details correctly', async () => {
    renderViewDriver();

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('Muhammad Ali')).toBeInTheDocument();
      expect(screen.getByText('+92-300-1234567')).toBeInTheDocument();
      expect(screen.getByText('35202-1234567-1')).toBeInTheDocument();
      expect(screen.getByText('1122')).toBeInTheDocument();
      expect(screen.getByText('Gulberg, Lahore')).toBeInTheDocument();
    });
  });

  test('displays performance metrics correctly', async () => {
    renderViewDriver();

    // Wait for the performance data to load
    await waitFor(() => {
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('4.8')).toBeInTheDocument();
      expect(screen.getByText('8.5 minutes')).toBeInTheDocument();
      expect(screen.getByText('93.3%')).toBeInTheDocument();
    });
  });

  test('displays trip history correctly', async () => {
    renderViewDriver();

    // Wait for the history data to load
    await waitFor(() => {
      expect(screen.getByText('Gulberg, Lahore')).toBeInTheDocument();
      expect(screen.getByText('Shadman, Lahore')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  test('tab navigation works correctly', async () => {
    renderViewDriver();

    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByText('Muhammad Ali')).toBeInTheDocument();
    });

    // Click on Performance tab
    const performanceTab = screen.getByText('Performance');
    fireEvent.click(performanceTab);

    // Check if performance metrics are visible
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();

    // Click on History tab
    const historyTab = screen.getByText('History');
    fireEvent.click(historyTab);

    // Check if history data is visible
    expect(screen.getByText('Gulberg, Lahore')).toBeInTheDocument();
    expect(screen.getByText('Shadman, Lahore')).toBeInTheDocument();
  });

  test('back button navigation works correctly', async () => {
    renderViewDriver();

    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByText('Muhammad Ali')).toBeInTheDocument();
    });

    // Click the back button
    const backButton = screen.getByText('Back to Drivers');
    fireEvent.click(backButton);

    // Check if the URL changes
    expect(window.location.pathname).toBe('/driver-data');
  });

  test('handles API errors correctly', async () => {
    // Mock API error
    ApiService.getDriver.mockRejectedValue(new Error('Failed to fetch driver details'));

    renderViewDriver();

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch driver details')).toBeInTheDocument();
    });
  });

  test('edit button navigation works correctly', async () => {
    renderViewDriver();

    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByText('Muhammad Ali')).toBeInTheDocument();
    });

    // Click the edit button
    const editButton = screen.getByText('Edit Driver');
    fireEvent.click(editButton);

    // Check if the URL changes
    expect(window.location.pathname).toBe('/driver-data/edit/DRV-101');
  });
}); 