from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlertViewSet, health_check

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'alerts', AlertViewSet)

# The API URLs are now determined automatically by the router
urlpatterns = [
    path('', include(router.urls)),
    path('health-check/', health_check, name='health-check'),
] 