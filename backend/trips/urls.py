from django.urls import path

from . import monitoring, views

app_name = "trips"

urlpatterns = [
    # Trip endpoints
    path("", views.TripListCreateView.as_view(), name="trip-list-create"),
    path("list/", views.TripListCreateView.as_view(), name="trip-list"),
    path("<int:pk>/", views.TripDetailView.as_view(), name="trip-detail"),
    path("<int:trip_id>/logs/", views.LogSheetListView.as_view(), name="trip-logs"),
    path("<int:trip_id>/stops/", views.RouteStopListView.as_view(), name="trip-stops"),
    # Trip planning endpoint
    path("plan/", views.plan_trip, name="plan-trip"),
    # Download endpoints
    path("download-eld/", views.download_eld_logs, name="download-eld-logs"),
    path("generate-hos-report/", views.generate_hos_report, name="generate-hos-report"),
    # Monitoring endpoints
    path("monitoring/health/", monitoring.health_check, name="health-check"),
    path("monitoring/metrics/", monitoring.metrics, name="metrics"),
    path("monitoring/cache/", monitoring.cache_stats, name="cache-stats"),
    path("monitoring/cache/clear/", monitoring.clear_cache, name="clear-cache"),
]
