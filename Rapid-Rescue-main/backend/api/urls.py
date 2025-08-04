from django.urls import path, include
from rest_framework.routers import DefaultRouter
# Restore JWT imports
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView
from . import views

router = DefaultRouter()
router.register(r'drivers', views.DriverViewSet)
router.register(r'ambulances', views.AmbulanceViewSet)
router.register(r'alerts', views.AlertViewSet)
router.register(r'accidents', views.AccidentViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    # Status endpoint
    path('status/', views.status_check, name='status-check'),
    
    # Authentication endpoints
    path('auth/login/', views.driver_login, name='driver-login'),
    path('auth/admin-login/', views.admin_login, name='admin-login'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/user/', views.get_user_data, name='user-data'),
    path('auth/current-user/', views.current_user, name='current-user'),
    
    # Statistics endpoints
    path('statistics/', views.get_statistics, name='statistics'),
    path('heatmap/', views.get_heatmap_data, name='heatmap'),
    
    # Admin endpoints
    path('admin/profile/', views.admin_profile, name='admin-profile'),
    path('admin/change-password/', views.admin_change_password, name='admin-change-password'),
    
    # Utility endpoints
    path('clean-database/', views.clean_database, name='clean-database'),
    path('clean-alerts/', views.clean_alerts, name='clean-alerts'),
    
    # Restore JWT token endpoints
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # Health check endpoint
    path('health-check/', views.health_check, name='health-check'),
] 