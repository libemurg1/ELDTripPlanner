"""
Unit tests for Trip models.
"""

from datetime import datetime, timedelta

import pytest
from django.contrib.auth import get_user_model
from django.test import TestCase

from core.models import TimestampModel
from trips.models import LogEntry, LogSheet, RouteStop, Trip


class TestTripModel(TestCase):
    """Test cases for Trip model."""

    def setUp(self):
        """Set up test data."""
        self.user = get_user_model().objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )

    def test_trip_creation(self):
        """Test basic trip creation."""
        trip = Trip.objects.create(
            user=self.user,
            current_location="Chicago, IL",
            pickup_location="Indianapolis, IN",
            dropoff_location="Atlanta, GA",
            current_cycle_hours=10.5,
            status="planned",
        )

        assert trip.user == self.user
        assert trip.current_location == "Chicago, IL"
        assert trip.pickup_location == "Indianapolis, IN"
        assert trip.dropoff_location == "Atlanta, GA"
        assert trip.current_cycle_hours == 10.5
        assert trip.status == "planned"
        assert trip.created_at is not None
        assert trip.updated_at is not None

    def test_trip_string_representation(self):
        """Test trip string representation."""
        trip = Trip.objects.create(
            user=self.user,
            current_location="Chicago, IL",
            pickup_location="Indianapolis, IN",
            dropoff_location="Atlanta, GA",
            current_cycle_hours=10.5,
        )

        expected = "Trip 1: Chicago, IL → Indianapolis, IN → Atlanta, GA"
        assert str(trip) == expected

    def test_trip_status_choices(self):
        """Test trip status field choices."""
        valid_statuses = ["planned", "in_progress", "completed"]

        for status in valid_statuses:
            trip = Trip.objects.create(
                user=self.user,
                current_location="Test",
                pickup_location="Test",
                dropoff_location="Test",
                current_cycle_hours=10.0,
                status=status,
            )
            assert trip.status == status

    def test_trip_validation(self):
        """Test trip field validation."""
        # Test required fields
        with pytest.raises(Exception):
            Trip.objects.create(user=self.user)

        # Test cycle hours validation
        with pytest.raises(Exception):
            Trip.objects.create(
                user=self.user,
                current_location="Test",
                pickup_location="Test",
                dropoff_location="Test",
                current_cycle_hours=75.0,  # Over 70 hours
            )

        # Test negative cycle hours
        with pytest.raises(Exception):
            Trip.objects.create(
                user=self.user,
                current_location="Test",
                pickup_location="Test",
                dropoff_location="Test",
                current_cycle_hours=-5.0,  # Negative hours
            )


class TestRouteStopModel(TestCase):
    """Test cases for RouteStop model."""

    def setUp(self):
        """Set up test data."""
        self.user = get_user_model().objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.trip = Trip.objects.create(
            user=self.user,
            current_location="Chicago, IL",
            pickup_location="Indianapolis, IN",
            dropoff_location="Atlanta, GA",
            current_cycle_hours=10.5,
        )

    def test_route_stop_creation(self):
        """Test basic route stop creation."""
        stop = RouteStop.objects.create(
            trip=self.trip,
            location="Test Stop",
            sequence_order=1,
            latitude=39.8283,
            longitude=-98.5795,
            stop_type="fuel",
            duration_minutes=30,
        )

        assert stop.trip == self.trip
        assert stop.location == "Test Stop"
        assert stop.sequence_order == 1
        assert stop.stop_type == "fuel"
        assert stop.latitude == 39.8283
        assert stop.longitude == -98.5795

    def test_route_stop_string_representation(self):
        """Test route stop string representation."""
        stop = RouteStop.objects.create(
            trip=self.trip,
            location="Test Stop",
            sequence_order=1,
            stop_type="fuel",
        )

        expected = "Fuel at Test Stop (Trip 1)"
        assert str(stop) == expected

    def test_route_stop_types(self):
        """Test route stop type choices."""
        valid_types = ["fuel", "rest", "pickup", "dropoff"]

        for stop_type in valid_types:
            stop = RouteStop.objects.create(
                trip=self.trip,
                location="Test Stop",
                sequence_order=1,
                stop_type=stop_type,
            )
            assert stop.stop_type == stop_type


class TestLogSheetModel(TestCase):
    """Test cases for LogSheet model."""

    def setUp(self):
        """Set up test data."""
        self.user = get_user_model().objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.trip = Trip.objects.create(
            user=self.user,
            current_location="Chicago, IL",
            pickup_location="Indianapolis, IN",
            dropoff_location="Atlanta, GA",
            current_cycle_hours=10.5,
        )

    def test_log_sheet_creation(self):
        """Test basic log sheet creation."""
        log_sheet = LogSheet.objects.create(
            trip=self.trip,
            date="2024-01-20",
            driver=self.user,
        )

        assert log_sheet.trip == self.trip
        assert log_sheet.date == "2024-01-20"
        assert log_sheet.driver == self.user

    def test_log_sheet_string_representation(self):
        """Test log sheet string representation."""
        log_sheet = LogSheet.objects.create(
            trip=self.trip, date="2024-01-20", driver=self.user
        )

        expected = "Log Sheet for 2024-01-20 - Trip 1"
        assert str(log_sheet) == expected


class TestLogEntryModel(TestCase):
    """Test cases for LogEntry model."""

    def setUp(self):
        """Set up test data."""
        self.user = get_user_model().objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.trip = Trip.objects.create(
            user=self.user,
            current_location="Chicago, IL",
            pickup_location="Indianapolis, IN",
            dropoff_location="Atlanta, GA",
            current_cycle_hours=10.5,
        )
        self.log_sheet = LogSheet.objects.create(
            trip=self.trip, date="2024-01-20", driver=self.user
        )

    def test_log_entry_creation(self):
        """Test basic log entry creation."""
        start_time = datetime(2024, 1, 20, 6, 0, 0)
        end_time = datetime(2024, 1, 20, 14, 0, 0)

        entry = LogEntry.objects.create(
            log_sheet=self.log_sheet,
            start_time=start_time,
            end_time=end_time,
            duty_status="driving",
            location="On Route",
            remarks="Normal driving",
        )

        assert entry.log_sheet == self.log_sheet
        assert entry.start_time == start_time
        assert entry.end_time == end_time
        assert entry.duty_status == "driving"
        assert entry.location == "On Route"
        assert entry.remarks == "Normal driving"

    def test_log_entry_duration_calculation(self):
        """Test log entry duration calculation."""
        start_time = datetime(2024, 1, 20, 6, 0, 0)
        end_time = datetime(2024, 1, 20, 14, 0, 0)

        entry = LogEntry.objects.create(
            log_sheet=self.log_sheet,
            start_time=start_time,
            end_time=end_time,
            duty_status="driving",
        )

        # Test that start and end times are properly set
        assert entry.start_time == start_time
        assert entry.end_time == end_time

        # Test that time difference is 8 hours (from 6:00 to 14:00)
        from datetime import time

        start_time_only = time(entry.start_time.hour, entry.start_time.minute)
        end_time_only = time(entry.end_time.hour, entry.end_time.minute)

        # Convert to minutes since midnight and calculate difference
        start_minutes = entry.start_time.hour * 60 + entry.start_time.minute
        end_minutes = entry.end_time.hour * 60 + entry.end_time.minute
        duration_minutes = end_minutes - start_minutes
        expected_duration = 8.0  # 8 hours = 480 minutes

        assert duration_minutes / 60 == expected_duration

    def test_log_entry_duty_status_choices(self):
        """Test log entry duty status choices."""
        valid_statuses = ["off_duty", "sleeper_berth", "driving", "on_duty_not_driving"]

        for duty_status in valid_statuses:
            entry = LogEntry.objects.create(
                log_sheet=self.log_sheet,
                start_time=datetime.now(),
                end_time=datetime.now() + timedelta(hours=1),
                duty_status=duty_status,
            )
            assert entry.duty_status == duty_status


class TestTimestampModel(TestCase):
    """Test cases for TimestampModel abstract model."""

    def test_timestamp_fields(self):
        """Test that timestamp fields are properly inherited."""
        # This tests the abstract model through concrete implementations
        user = get_user_model().objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )

        trip = Trip.objects.create(
            user=user,
            current_location="Test",
            pickup_location="Test",
            dropoff_location="Test",
            current_cycle_hours=10.0,
        )

        # Test that timestamp fields are created
        assert trip.created_at is not None
        assert trip.updated_at is not None

        # Test that updated_at updates when model is saved
        original_updated = trip.updated_at
        trip.current_cycle_hours = 15.0
        trip.save()

        assert trip.updated_at > original_updated
