from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

# Create your views here.

@api_view(['GET'])
@permission_classes([permissions.AllowAny])  # Allow any for testing
def dashboard_statistics(request):
    """
    API endpoint that returns basic dashboard statistics.
    """
    print("Dashboard statistics view called")
    
    from drivers_app.models import Driver
    from ambulances_app.models import Ambulance
    from alerts_app.models import Alert
    from accidents_app.models import Accident
    
    statistics = {
        'total_drivers': Driver.objects.count(),
        'total_ambulances': Ambulance.objects.count(),
        'total_alerts': Alert.objects.count(),
        'total_accidents': Accident.objects.count(),
        'available_drivers': Driver.objects.filter(status='available').count(),
        'available_ambulances': Ambulance.objects.filter(status='available').count(),
        'pending_alerts': Alert.objects.filter(status='pending').count(),
    }
    
    return Response(statistics)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])  # Allow any for testing
def heatmap_data(request):
    """
    API endpoint that returns data for accident heatmap.
    """
    print("Heatmap data view called")
    
    from accidents_app.models import Accident
    
    accidents = Accident.objects.all()
    heatmap_data = [
        {
            'id': accident.id,
            'lat': accident.coordinates_lat,
            'lng': accident.coordinates_lng,
            'severity': accident.severity,
            'date': accident.date,
        }
        for accident in accidents
    ]
    
    return Response(heatmap_data)
