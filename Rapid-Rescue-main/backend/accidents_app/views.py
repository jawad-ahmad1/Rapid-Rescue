from django.shortcuts import render
from rest_framework import viewsets, permissions
from .models import Accident
from .serializers import AccidentSerializer

# Create your views here.

class AccidentViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows accidents to be viewed or edited.
    """
    queryset = Accident.objects.all()
    serializer_class = AccidentSerializer
    permission_classes = [permissions.IsAuthenticated]
