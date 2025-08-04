from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from api import views
from api.views import get_statistics, get_heatmap_data, clean_database, clean_alerts
from django.conf import settings
from django.conf.urls.static import static
from alerts_app.views import health_check

# Configure API router
router = routers.DefaultRouter()
router.register(r'drivers', views.DriverViewSet)
router.register(r'ambulances', views.AmbulanceViewSet)
router.register(r'alerts', views.AlertViewSet)
router.register(r'accidents', views.AccidentViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('rest_framework.urls')),
    path('api/statistics/', get_statistics, name='statistics'),
    path('api/heatmap/', get_heatmap_data, name='heatmap'),
    path('api/cleanup/', clean_database, name='cleanup_database'),
    path('api/cleanup/alerts/', clean_alerts, name='cleanup_alerts'),
    path('api/', include(router.urls)),
    path('health/', health_check, name='health_check'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 