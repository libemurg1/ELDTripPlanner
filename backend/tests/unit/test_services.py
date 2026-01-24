"""
Unit tests for Trip services.
"""

from datetime import datetime, timedelta
from unittest.mock import MagicMock, Mock, patch

import pytest
from django.contrib.auth import get_user_model
from django.test import TestCase

from trips.models import LogEntry, LogSheet, RouteStop, Trip
from trips.services import ELDLogService, RouteCalculationService, TripPlanningService


class TestRouteCalculationService(TestCase):
    """Test cases for RouteCalculationService."""

    def setUp(self):
        """Set up test data."""
        self.user = get_user_model().objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.service = RouteCalculationService()

    @patch("trips.services.requests.get")
    def test_get_coordinates_success(self, mock_get):
        """Test successful coordinate retrieval."""
        mock_response = Mock()
        mock_response.json.return_value = {
            "features": [{"geometry": {"coordinates": [-87.6298, 41.8781]}}]
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        result = self.service.get_coordinates("Chicago, IL")

        assert result["latitude"] == 41.8781
        assert result["longitude"] == -87.6298
        mock_get.assert_called_once()

    @patch("trips.services.requests.get")
    def test_get_coordinates_api_failure(self, mock_get):
        """Test API failure handling."""
        mock_response = Mock()
        mock_response.raise_for_status.side_effect = Exception("API Error")
        mock_get.return_value = mock_response

        with pytest.raises(Exception):
            self.service.get_coordinates("Invalid Address")

    @patch("trips.services.requests.get")
    def test_calculate_route_success(self, mock_get):
        """Test successful route calculation."""
        mock_response = Mock()
        mock_response.json.return_value = {
            "features": [
                {
                    "geometry": {
                        "coordinates": [[-87.6298, 41.8781], [-86.0000, 40.0000]]
                    },
                    "properties": {"distance": 500, "duration": 300},
                }
            ]
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        result = self.service.calculate_route("Chicago, IL", "Indianapolis, IN")

        assert "route" in result
        assert "distance" in result
        assert "duration" in result

    def test_calculate_fuel_stops(self):
        """Test fuel stop calculation."""
        distance = 2500  # miles
        stops = self.service.calculate_fuel_stops(distance)

        # Should have 2 fuel stops (every 1000 miles)
        assert len(stops) == 2
        assert stops[0]["sequence"] == 1
        assert stops[1]["sequence"] == 2

    def test_generate_rest_stops(self):
        """Test rest stop generation based on HOS rules."""
        total_driving_time = 12  # hours
        stops = self.service.generate_rest_stops(total_driving_time)

        # Should have rest stops after 8 hours of driving
        assert len(stops) == 1
        assert stops[0]["type"] == "rest"
        assert stops[0]["after_hours"] == 8


class TestELDLogService(TestCase):
    """Test cases for ELDLogService."""

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
        self.service = ELDLogService()

    def test_check_11_hour_driving_limit(self):
        """Test 11-hour driving limit enforcement."""
        driving_hours = 11.0
        assert self.service.check_driving_limit(driving_hours) == True

        driving_hours = 11.1
        assert self.service.check_driving_limit(driving_hours) == False

    def test_check_14_hour_duty_limit(self):
        """Test 14-hour duty limit enforcement."""
        duty_hours = 14.0
        assert self.service.check_duty_limit(duty_hours) == True

        duty_hours = 14.1
        assert self.service.check_duty_limit(duty_hours) == False

    def test_require_30_minute_break(self):
        """Test 30-minute break requirement."""
        # After 8 hours of driving, break is required
        driving_since_break = 8.1
        assert self.service.require_break(driving_since_break) == True

        driving_since_break = 7.9
        assert self.service.require_break(driving_since_break) == False

    def test_generate_log_entries(self):
        """Test log entry generation."""
        route_stops = [
            {"time": "06:00", "location": "Start", "type": "current"},
            {"time": "14:00", "location": "Pickup", "type": "pickup"},
            {"time": "22:00", "location": "End", "type": "dropoff"},
        ]

        entries = self.service.generate_log_entries(route_stops)

        assert len(entries) >= 2  # At least driving periods
        assert all(entry.get("start_time") for entry in entries)
        assert all(entry.get("end_time") for entry in entries)

    def test_create_log_sheet(self):
        """Test log sheet creation."""
        stops = [
            {"time": "06:00", "location": "Start", "type": "current"},
            {"time": "22:00", "location": "End", "type": "dropoff"},
        ]

        log_sheet = self.service.create_log_sheet(self.trip, stops)

        assert log_sheet.trip == self.trip
        assert log_sheet.date is not None
        assert log_sheet.driver_name is not None
        assert log_sheet.carrier_name is not None

        # Check that log entries were created
        assert log_sheet.log_entries.count() > 0


class TestTripPlanningService(TestCase):
    """Test cases for TripPlanningService."""

    def setUp(self):
        """Set up test data."""
        self.user = get_user_model().objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.service = TripPlanningService()

    @patch("trips.services.RouteCalculationService")
    @patch("trips.services.ELDLogService")
    def test_plan_trip_success(self, mock_eld, mock_route):
        """Test successful trip planning."""
        # Mock route service
        mock_route_instance = Mock()
        mock_route_instance.get_coordinates.return_value = {
            "latitude": 41.8781,
            "longitude": -87.6298,
        }
        mock_route_instance.calculate_route.return_value = {
            "route": [[-87.6298, 41.8781], [-86.0000, 40.0000]],
            "distance": 180,
            "duration": 1080,  # minutes
        }
        mock_route_instance.calculate_fuel_stops.return_value = [
            {"sequence": 1, "location": "Fuel Stop 1"}
        ]
        mock_route_instance.generate_rest_stops.return_value = [
            {"sequence": 2, "location": "Rest Stop 1"}
        ]
        mock_route.return_value = mock_route_instance

        # Mock ELD service
        mock_eld_instance = Mock()
        mock_eld_instance.check_driving_limit.return_value = True
        mock_eld_instance.check_duty_limit.return_value = True
        mock_eld_instance.create_log_sheet.return_value = Mock()
        mock_eld.return_value = mock_eld_instance

        # Test trip planning
        result = self.service.plan_trip(
            current_location="Chicago, IL",
            pickup_location="Indianapolis, IN",
            dropoff_location="Atlanta, GA",
            current_cycle_hours=10.5,
            user=self.user,
        )

        assert result.user == self.user
        assert result.current_location == "Chicago, IL"
        assert result.pickup_location == "Indianapolis, IN"
        assert result.dropoff_location == "Atlanta, GA"
        assert result.current_cycle_hours == 10.5
        assert result.status == "planned"

    def test_plan_trip_invalid_cycle_hours(self):
        """Test trip planning with invalid cycle hours."""
        with pytest.raises(Exception):
            self.service.plan_trip(
                current_location="Chicago, IL",
                pickup_location="Indianapolis, IN",
                dropoff_location="Atlanta, GA",
                current_cycle_hours=75.0,  # Over 70 hours
                user=self.user,
            )

    def test_plan_trip_missing_locations(self):
        """Test trip planning with missing location data."""
        with pytest.raises(Exception):
            self.service.plan_trip(
                current_location="",
                pickup_location="Indianapolis, IN",
                dropoff_location="Atlanta, GA",
                current_cycle_hours=10.5,
                user=self.user,
            )

    @patch("trips.services.RouteCalculationService")
    @patch("trips.services.ELDLogService")
    def test_plan_trip_route_failure(self, mock_eld, mock_route):
        """Test trip planning with route calculation failure."""
        # Mock route service to raise exception
        mock_route_instance = Mock()
        mock_route_instance.get_coordinates.side_effect = Exception("Geocoding failed")
        mock_route.return_value = mock_route_instance

        with pytest.raises(Exception):
            self.service.plan_trip(
                current_location="Chicago, IL",
                pickup_location="Indianapolis, IN",
                dropoff_location="Atlanta, GA",
                current_cycle_hours=10.5,
                user=self.user,
            )


class TestServiceIntegration(TestCase):
    """Test service integration and dependencies."""

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

    def test_route_service_dependency_injection(self):
        """Test that services properly use dependencies."""
        route_service = RouteCalculationService()
        assert hasattr(route_service, "get_coordinates")
        assert hasattr(route_service, "calculate_route")

    def test_eld_service_dependency_injection(self):
        """Test ELD service dependency handling."""
        eld_service = ELDLogService()
        assert hasattr(eld_service, "check_driving_limit")
        assert hasattr(eld_service, "check_duty_limit")
        assert hasattr(eld_service, "create_log_sheet")

    def test_service_error_handling(self):
        """Test proper error handling in services."""
        route_service = RouteCalculationService()

        # Test that exceptions are properly raised and logged
        with pytest.raises(Exception):
            route_service.get_coordinates("")  # Empty address should raise exception
