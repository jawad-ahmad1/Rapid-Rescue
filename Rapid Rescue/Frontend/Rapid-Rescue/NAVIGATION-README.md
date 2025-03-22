# Rapid Rescue - Navigation Component Guide

This document provides detailed information on using and troubleshooting the AmbulanceNavigation component within the Rapid Rescue application.

## Overview

The AmbulanceNavigation component is responsible for providing turn-by-turn directions, displaying maps, and managing emergency response navigation for ambulance drivers. It includes features like:

- Real-time mapping with Google Maps
- Turn-by-turn navigation
- Patient information display
- Emergency mode toggles
- Alert status management

## How to Access the Navigation Page

There are multiple ways to access the navigation page:

1. **Normal Flow** - Accept an alert from the Ambulance Dashboard, which will redirect you to the navigation page with the alert data
2. **Direct Access** - Navigate directly to `/ambulance-navigation` (will use fallback data)
3. **Test Mode** - Navigate to `/ambulance-navigation-test` to load with sample test data

## Troubleshooting Blank Page Issues

If you encounter a blank page when trying to access the navigation page, try these steps:

### Check the Browser Console

1. Open your browser's developer tools (F12 or right-click → Inspect)
2. Go to the Console tab
3. Look for any error messages related to:
   - React rendering
   - Google Maps API issues
   - JavaScript errors
   - Network failures

### Common Issues and Solutions

#### Google Maps API Key

The navigation component relies on Google Maps API. If the API key is invalid or restricted, the map won't load.

**Solution:** Check the Google Maps API key in `AmbulanceNavigation.jsx` and ensure it's valid and has the necessary permissions.

#### React Rendering Issues

Sometimes React may fail to render the component due to errors in the code.

**Solution:** Try accessing the test route (`/ambulance-navigation-test`) which uses simplified test data.

#### Navigation Flow Issues

The navigation page is designed to receive alert data when redirected from the dashboard. Accessing it directly may cause issues.

**Solution:** Use the test HTML page provided (`test-navigation.html`) to test various access methods.

## Using the Test Page

A special test page has been created to help diagnose issues with the navigation component. To use it:

1. Make sure the development server is running (`npm run dev`)
2. Open `test-navigation.html` in your browser
3. Follow the instructions to test different ways of accessing the navigation page

## Component Features

When working correctly, the navigation page includes:

### 1. Map Display

- Google Maps with current location (blue marker)
- Destination location (red marker)
- Route display with turn-by-turn directions

### 2. Alert Information

- Alert ID and status
- Location details
- Distance and estimated time information

### 3. Navigation Controls

- Start Navigation button
- Route refresh button
- Patient information toggle
- Emergency mode toggle
- Complete/Cancel buttons

### 4. Turn-by-Turn Directions

- Step-by-step instructions
- Previous/Next controls
- Current step indicator

## Emergency Workflow

The typical workflow for the navigation page is:

1. Ambulance Dashboard shows an alert
2. Driver accepts the alert
3. Navigation page loads with alert data
4. Driver reviews the route and starts navigation
5. Driver uses the turn-by-turn directions to reach the location
6. Once arrived, driver completes or cancels the alert
7. System returns to the dashboard

## Development Notes

If you're modifying the navigation component, be aware that it depends on:

- Google Maps API
- React Router location state
- The AmbulanceSidebar component
- MockApiService for alert data

The component includes fallback and error handling for cases where:

- Google Maps fails to load
- No alert data is provided
- Direction calculation fails

## Contact

If you continue to have issues, please contact the development team for assistance.
