# Rapid Rescue - Google Maps Integration

This document explains how the Rapid Rescue application now integrates with Google Maps for navigation.

## How It Works

Instead of using the built-in navigation with Google Maps API (which was causing blank page issues), the application now redirects you to Google Maps in a new tab for turn-by-turn directions.

## Benefits

1. **Reliability**: Google Maps is a stable, well-tested platform that works across all devices
2. **Familiarity**: Most users are already familiar with Google Maps navigation
3. **Maintenance**: Less code to maintain in our application
4. **Features**: Access to all Google Maps features like traffic, alternate routes, etc.
5. **Performance**: No need to load heavy mapping libraries in our application

## Using Google Maps Navigation

When you accept an alert from the Ambulance Dashboard, you'll be redirected to the Navigation page which now provides:

1. A simple interface showing alert details
2. A "OPEN IN GOOGLE MAPS" button
3. Patient information (if available)
4. Alert management controls

### Steps to Use

1. Click "Accept" on an alert from the Ambulance Dashboard
2. On the Navigation page, click "OPEN IN GOOGLE MAPS"
3. Google Maps will open in a new tab with directions from your current location to the emergency site
4. Follow the Google Maps directions while the Rapid Rescue app remains open in the original tab
5. When you arrive at the destination, return to the Rapid Rescue tab and click "Complete" to mark the alert as completed

## Testing

To test the Google Maps integration:

1. Run the application using the provided `start-app.bat` file
2. Navigate to `/ambulance-dashboard` and accept an alert
3. On the Navigation page, click "OPEN IN GOOGLE MAPS"
4. Verify that Google Maps opens with the correct coordinates

## Troubleshooting

If Google Maps doesn't open:

1. Check that you have internet connectivity
2. Ensure your browser allows pop-ups from the application
3. Verify that the coordinates in the alert data are valid

## For Developers

The application creates Google Maps URLs in this format:

```
https://www.google.com/maps/dir/?api=1&origin=LAT,LNG&destination=LAT,LNG&travelmode=driving
```

Where:

- `origin` is the current location (hardcoded for demonstration)
- `destination` is taken from the alert coordinates
- `travelmode` is set to "driving" for ambulance navigation

---

For any issues with this integration, please contact the development team.
