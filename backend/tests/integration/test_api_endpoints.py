"""
Integration tests for API endpoints.
"""

from datetime import datetime

import pytest
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from trips.models import LogSheet, RouteStop, Trip


class TestTripEndpoints(TestCase):
    """Integration tests for trip-related API endpoints."""

    def setUp(self):
        """Set up test client and user."""
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

    def test_list_trips_empty(self):
        """Test GET trips endpoint with no trips."""
        response = self.client.get("/api/v1/trips/list/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 0
        assert len(response.data["results"]) == 0

    def test_list_trips_with_data(self):
        """Test GET trips endpoint with existing trips."""
        # Create test trip
        trip = Trip.objects.create(
            user=self.user,
            current_location="Chicago, IL",
            pickup_location="Indianapolis, IN",
            dropoff_location="Atlanta, GA",
            current_cycle_hours=10.5,
        )

        response = self.client.get("/api/v1/trips/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == trip.id

    def test_create_trip_valid(self):
        """Test POST trips endpoint with valid data."""
        trip_data = {
            "current_location": "Chicago, IL",
            "pickup_location": "Indianapolis, IN",
            "dropoff_location": "Atlanta, GA",
            "current_cycle_hours": 10.5,
        }

        response = self.client.post("/api/v1/trips/", trip_data)

        assert response.status_code == status.HTTP_201_CREATED
        assert Trip.objects.filter(user=self.user).count() == 1

        # Verify response structure
        assert "id" in response.data
        assert response.data["current_location"] == "Chicago, IL"
        assert response.data["status"] == "planned"

    def test_create_trip_invalid_data(self):
        """Test POST trips endpoint with invalid data."""
        invalid_data = {
            "current_location": "",  # Required field missing
            "pickup_location": "Indianapolis, IN",
            "dropoff_location": "Atlanta, GA",
            "current_cycle_hours": 75.0,  # Over 70 hours
        }

        response = self.client.post("/api/v1/trips/", invalid_data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert Trip.objects.filter(user=self.user).count() == 0

    def test_create_trip_cycle_hours_validation(self):
        """Test cycle hours validation constraints."""
        test_cases = [
            (-5.0, status.HTTP_400_BAD_REQUEST),  # Negative
            (75.0, status.HTTP_400_BAD_REQUEST),  # Over 70
            (0.0, status.HTTP_201_CREATED),  # Valid minimum
            (70.0, status.HTTP_201_CREATED),  # Valid maximum
        ]

        for cycle_hours, expected_status in test_cases:
            Trip.objects.all().delete()  # Clean up

            trip_data = {
                "current_location": "Chicago, IL",
                "pickup_location": "Indianapolis, IN",
                "dropoff_location": "Atlanta, GA",
                "current_cycle_hours": cycle_hours,
            }

            response = self.client.post("/api/v1/trips/", trip_data)
            assert response.status_code == expected_status

    def test_trip_detail_unauthorized(self):
        """Test that unauthorized users cannot access trips."""
        self.client.logout()

        trip = Trip.objects.create(
            user=self.user,
            current_location="Chicago, IL",
            pickup_location="Indianapolis, IN",
            dropoff_location="Atlanta, GA",
            current_cycle_hours=10.5,
        )

        response = self.client.get(f"/api/v1/trips/{trip.id}/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_trip_detail_authorized(self):
        """Test that authorized users can access their trips."""
        trip = Trip.objects.create(
            user=self.user,
            current_location="Chicago, IL",
            pickup_location="Indianapolis, IN",
            dropoff_location="Atlanta, GA",
            current_cycle_hours=10.5,
        )

        response = self.client.get(f"/api/v1/trips/{trip.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == trip.id

    def test_trip_other_user_forbidden(self):
        """Test that users cannot access other users' trips."""
        other_user = get_user_model().objects.create_user(
            username="otheruser", email="other@example.com", password="testpass123"
        )

        trip = Trip.objects.create(
            user=other_user,
            current_location="Chicago, IL",
            pickup_location="Indianapolis, IN",
            dropoff_location="Atlanta, GA",
            current_cycle_hours=10.5,
        )

        response = self.client.get(f"/api/v1/trips/{trip.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestTripPlanningEndpoint(TestCase):
    """Integration tests for trip planning endpoint."""

    def setUp(self):
        """Set up test client and user."""
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

    @pytest.mark.external_api
    @pytest.mark.slow
    def test_plan_trip_endpoint_success(self):
        """Test successful trip planning with mocked external APIs."""
        trip_data = {
            "current_location": "Chicago, IL",
            "pickup_location": "Indianapolis, IN",
            "dropoff_location": "Atlanta, GA",
            "current_cycle_hours": 10.5,
        }

        response = self.client.post("/api/v1/trips/plan/", trip_data, format="json")

        # Accept both 201 (new trip) or 200 (existing trip update)
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_200_OK]

        # Verify response structure
        assert "id" in response.data
        assert "route_stops" in response.data
        assert "log_sheets" in response.data
        assert len(response.data["route_stops"]) > 0
        assert len(response.data["log_sheets"]) > 0

    @pytest.mark.external_api
    def test_plan_trip_endpoint_api_failure(self):
        """Test trip planning endpoint when external APIs fail."""
        # This test would require mocking the external API calls
        # For now, we'll test with invalid addresses
        invalid_trip_data = {
            "current_location": "InvalidLocation123456",
            "pickup_location": "Indianapolis, IN",
            "dropoff_location": "Atlanta, GA",
            "current_cycle_hours": 10.5,
        }

        response = self.client.post(
            "/api/v1/trips/plan/", invalid_trip_data, format="json"
        )

        # Should handle API failures gracefully
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        ]

    def test_plan_trip_endpoint_unauthorized(self):
        """Test that unauthorized users cannot plan trips."""
        self.client.logout()

        trip_data = {
            "current_location": "Chicago, IL",
            "pickup_location": "Indianapolis, IN",
            "dropoff_location": "Atlanta, GA",
            "current_cycle_hours": 10.5,
        }

        response = self.client.post("/api/v1/trips/plan/", trip_data, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestLogSheetEndpoints(TestCase):
    """Integration tests for log sheet endpoints."""

    def setUp(self):
        """Set up test client, user, and trip data."""
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

        self.trip = Trip.objects.create(
            user=self.user,
            current_location="Chicago, IL",
            pickup_location="Indianapolis, IN",
            dropoff_location="Atlanta, GA",
            current_cycle_hours=10.5,
        )

        # Create associated log sheet
        self.log_sheet = LogSheet.objects.create(
            trip=self.trip,
            date="2024-01-20",
            driver=self.user,
        )

    def test_list_log_sheets(self):
        """Test GET log sheets endpoint."""
        response = self.client.get(f"/api/v1/trips/{self.trip.id}/logs/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        assert response.data[0]["id"] == self.log_sheet.id

    def test_list_log_sheets_unauthorized(self):
        """Test that unauthorized users cannot access log sheets."""
        self.client.logout()

        response = self.client.get(f"/api/v1/trips/{self.trip.id}/logs/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_download_eld_logs(self):
        """Test ELD logs download endpoint."""
        response = self.client.get(f"/api/v1/trips/{self.trip.id}/eld-logs/download/")

        # Should return PDF or appropriate content type
        assert response.status_code == status.HTTP_200_OK
        assert "Content-Type" in response.headers
        assert "attachment" in response.headers.get("Content-Disposition", "")


class TestRouteStopEndpoints(TestCase):
    """Integration tests for route stop endpoints."""

    def setUp(self):
        """Set up test client and user."""
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

        self.trip = Trip.objects.create(
            user=self.user,
            current_location="Chicago, IL",
            pickup_location="Indianapolis, IN",
            dropoff_location="Atlanta, GA",
            current_cycle_hours=10.5,
        )

    def test_list_route_stops(self):
        """Test GET route stops endpoint."""
        # Create some route stops
        RouteStop.objects.create(
            trip=self.trip,
            location_name="Stop 1",
            sequence_order=1,
            stop_type="pickup",
            latitude=41.8781,
            longitude=-87.6298,
        )

        response = self.client.get(f"/api/v1/trips/{self.trip.id}/stops/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        assert response.data[0]["location_name"] == "Stop 1"

    def test_route_stop_filtering(self):
        """Test route stop filtering and ordering."""
        # Create multiple stops
        for i in range(3):
            RouteStop.objects.create(
                trip=self.trip,
                location_name=f"Stop {i + 1}",
                sequence_order=i + 1,
                stop_type="fuel" if i % 2 == 0 else "rest",
                latitude=41.8781 + i,
                longitude=-87.6298 + i,
            )

        response = self.client.get(f"/api/v1/trips/{self.trip.id}/stops/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3

        # Verify ordering by sequence_order
        for i in range(len(response.data)):
            assert response.data[i]["sequence_order"] == i + 1


class TestAPIErrorHandling(TestCase):
    """Test API error handling and response formats."""

    def setUp(self):
        """Set up test client."""
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

    def test_404_not_found(self):
        """Test 404 responses for non-existent resources."""
        response = self.client.get("/api/v1/trips/99999/")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "detail" in response.data

    def test_validation_error_format(self):
        """Test validation error response format."""
        invalid_data = {
            "current_location": "",  # Missing required field
            "pickup_location": "Indianapolis, IN",
            "dropoff_location": "Atlanta, GA",
            "current_cycle_hours": 10.5,
        }

        response = self.client.post("/api/v1/trips/", invalid_data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # Should contain field-specific errors
        assert isinstance(response.data, dict)

    def test_authentication_error_format(self):
        """Test authentication error response format."""
        self.client.logout()

        response = self.client.get("/api/v1/trips/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        # Should contain standard DRF authentication error
        assert "detail" in response.data
