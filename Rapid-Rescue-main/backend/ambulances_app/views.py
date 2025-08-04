from django.shortcuts import render
from rest_framework import viewsets, permissions
from .models import Ambulance
from .serializers import AmbulanceSerializer

# Create your views here.

class AmbulanceViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows ambulances to be viewed or edited.
    """
    queryset = Ambulance.objects.all()
    serializer_class = AmbulanceSerializer
    permission_classes = [permissions.IsAuthenticated]
