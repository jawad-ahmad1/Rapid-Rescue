from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import dashboard_statistics, heatmap_data

# The API URLs are determined automatically by the router
urlpatterns = [
    # Add custom dashboard endpoints
    path('statistics/', dashboard_statistics, name='dashboard-statistics'),
    path('heatmap/', heatmap_data, name='heatmap-data'),
] 