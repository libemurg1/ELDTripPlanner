from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Trip, RouteStop, LogSheet, LogEntry


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name"]


class RouteStopSerializer(serializers.ModelSerializer):
    class Meta:
        model = RouteStop
        fields = "__all__"


class LogEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LogEntry
        fields = "__all__"


class LogSheetSerializer(serializers.ModelSerializer):
    log_entries = LogEntrySerializer(many=True, read_only=True)
    driver_name = serializers.CharField(source="driver.get_full_name", read_only=True)

    class Meta:
        model = LogSheet
        fields = "__all__"


class TripSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    route_stops = RouteStopSerializer(many=True, read_only=True)
    log_sheets = LogSheetSerializer(many=True, read_only=True)

    class Meta:
        model = Trip
        fields = "__all__"


class TripCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = [
            "current_location",
            "pickup_location",
            "dropoff_location",
            "current_cycle_hours",
        ]

    def validate_current_cycle_hours(self, value):
        if value < 0 or value > 70:
            raise serializers.ValidationError(
                "Current cycle hours must be between 0 and 70"
            )
        return value


class TripPlanRequestSerializer(serializers.Serializer):
    current_location = serializers.CharField(max_length=255)
    pickup_location = serializers.CharField(max_length=255)
    dropoff_location = serializers.CharField(max_length=255)
    current_cycle_hours = serializers.DecimalField(max_digits=5, decimal_places=2)


class TripPlanResponseSerializer(serializers.ModelSerializer):
    route_stops = RouteStopSerializer(many=True)
    log_sheets = LogSheetSerializer(many=True)

    class Meta:
        model = Trip
        fields = "__all__"
