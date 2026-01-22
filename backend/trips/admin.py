from django.contrib import admin
from .models import Trip, RouteStop, LogSheet, LogEntry


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "current_location",
        "pickup_location",
        "dropoff_location",
        "status",
        "created_at",
    ]
    list_filter = ["status", "created_at"]
    search_fields = [
        "current_location",
        "pickup_location",
        "dropoff_location",
        "user__username",
    ]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(RouteStop)
class RouteStopAdmin(admin.ModelAdmin):
    list_display = [
        "trip",
        "location",
        "stop_type",
        "sequence_order",
        "estimated_arrival",
    ]
    list_filter = ["stop_type"]
    search_fields = ["location", "trip__id"]
    ordering = ["trip", "sequence_order"]


@admin.register(LogSheet)
class LogSheetAdmin(admin.ModelAdmin):
    list_display = [
        "trip",
        "date",
        "driver",
        "driving_hours",
        "on_duty_hours",
        "cycle_hours_used",
    ]
    list_filter = ["date", "driver"]
    search_fields = ["trip__id", "driver__username"]
    readonly_fields = ["created_at"]


@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    list_display = ["log_sheet", "start_time", "end_time", "duty_status", "location"]
    list_filter = ["duty_status"]
    search_fields = ["log_sheet__trip__id", "location", "remarks"]
    ordering = ["log_sheet", "start_time"]
