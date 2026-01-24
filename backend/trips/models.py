from django.contrib.auth.models import User
from django.db import models

from core.models import TimestampModel


class Trip(TimestampModel):
    STATUS_CHOICES = [
        ("planned", "Planned"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="trips")
    current_location = models.CharField(max_length=255)
    pickup_location = models.CharField(max_length=255)
    dropoff_location = models.CharField(max_length=255)
    current_cycle_hours = models.DecimalField(max_digits=5, decimal_places=2)
    total_distance = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    estimated_duration = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="planned")

    def __str__(self):
        return f"Trip {self.id}: {self.current_location} → {self.pickup_location} → {self.dropoff_location}"


class RouteStop(TimestampModel):
    STOP_TYPES = [
        ("fuel", "Fuel Stop"),
        ("rest", "Rest Break"),
        ("pickup", "Pickup"),
        ("dropoff", "Dropoff"),
    ]

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="route_stops")
    location = models.CharField(max_length=255)
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    stop_type = models.CharField(max_length=20, choices=STOP_TYPES)
    estimated_arrival = models.DateTimeField(null=True, blank=True)
    estimated_departure = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(default=30)
    sequence_order = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.stop_type.title()} at {self.location} (Trip {self.trip.id})"


class LogSheet(TimestampModel):
    DUTY_STATUSES = [
        ("off_duty", "Off Duty"),
        ("sleeper_berth", "Sleeper Berth"),
        ("driving", "Driving"),
        ("on_duty_not_driving", "On Duty (Not Driving)"),
    ]

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="log_sheets")
    date = models.DateField()
    driver = models.ForeignKey(User, on_delete=models.CASCADE)

    # Daily hours tracking
    driving_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    on_duty_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    off_duty_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    sleeper_berth_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0)

    # Cycle tracking
    cycle_hours_used = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Remarks
    remarks = models.TextField(blank=True)

    def __str__(self):
        return f"Log Sheet for {self.date} - Trip {self.trip.id}"

    class Meta:
        unique_together = ["trip", "date"]


class LogEntry(TimestampModel):
    DUTY_STATUSES = [
        ("off_duty", "Off Duty"),
        ("sleeper_berth", "Sleeper Berth"),
        ("driving", "Driving"),
        ("on_duty_not_driving", "On Duty (Not Driving)"),
    ]

    log_sheet = models.ForeignKey(
        LogSheet, on_delete=models.CASCADE, related_name="log_entries"
    )
    start_time = models.TimeField()
    end_time = models.TimeField()
    duty_status = models.CharField(max_length=25, choices=DUTY_STATUSES)
    location = models.CharField(max_length=255, blank=True)
    remarks = models.CharField(max_length=500, blank=True)

    def __str__(self):
        return f"{self.start_time} - {self.end_time}: {self.get_duty_status_display()}"
