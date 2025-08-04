# Driver Data Components

This directory contains components for displaying and managing driver data in the Rapid Rescue application.

## Components

### DriverData

The `DriverData` component displays a list of all drivers in a table format. It includes features such as:

- Searching drivers by name, location, or phone number
- Sorting drivers by creation date (newest/oldest)
- Viewing detailed information about a specific driver
- Editing driver information
- Deleting drivers with confirmation
- Adding new drivers

### DriverDetails

The `DriverDetails` component displays detailed information about a specific driver, including:

- Personal information (name, ID, status)
- Contact information (phone, CNIC)
- Assigned ambulance (if any)
- Performance statistics
- Action buttons for editing and activating/deactivating the driver

### EditDriver

The `EditDriver` component provides a form for editing driver information, including:

- Driver name
- Phone number
- CNIC number
- Service provider
- Location
- Status

## Mock API Integration

All components are integrated with the mock API service, which provides realistic data for testing and development.

## How to Use

1. Navigate to `/driver-data` in the application
2. Use the search and sort features to filter the driver list
3. Click the "View" button on any driver to see their details
4. Click the "Edit" button to modify driver information
5. Click the "Delete" button to remove a driver (with confirmation)

## Data Structure

The driver data follows this structure:

```javascript
{
  id: "DRV-101",
  name: "Muhammad Ali",
  phone: "+92-300-1234567",
  serviceProvider: "1122",
  cnic: "35201-1234567-1",
  location: "Lahore",
  status: "available", // or "on-duty", "off-duty", "inactive"
  ambulance: "AMB-001", // ID of assigned ambulance, or null
  createdAt: "2023-05-15T10:30:00Z" // ISO date string
}
```

## Customization

You can customize the appearance of these components by modifying the corresponding CSS files:

- `DriverData.css` - Styles for the driver list
- `DriverDetails.css` - Styles for the driver details view
- `EditDriver.css` - Styles for the driver edit form
