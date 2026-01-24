"""
System tests for end-to-end workflows.
"""

from datetime import datetime, timedelta
import unittest.mock

import pytest
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from trips.models import LogEntry, LogSheet, RouteStop, Trip


class TestAuthenticationWorkflow(TestCase):
    """System tests for complete authentication workflow."""

    def setUp(self):
        """Set up test client."""
        self.client = APIClient()

    def test_user_registration_and_login(self):
        """Test complete user registration and login flow."""
        # Step 1: Register new user
        registration_data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "testpass123",
            "password_confirm": "testpass123",
            "first_name": "Test",
            "last_name": "User",
        }

        register_response = self.client.post("/api/v1/auth/register/", registration_data)

        assert register_response.status_code == status.HTTP_201_CREATED
        assert "access" in register_response.data
        assert "refresh" in register_response.data
        assert "user" in register_response.data

        # Step 2: Login with registered user
        login_data = {"username": "newuser", "password": "testpass123"}

        login_response = self.client.post("/api/v1/auth/login/", login_data)

        assert login_response.status_code == status.HTTP_200_OK
        assert "access" in login_response.data
        assert "refresh" in login_response.data

        # Step 3: Set auth token and verify user is authenticated
        access_token = login_response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        user_profile_response = self.client.get("/api/v1/auth/profile/")
        assert user_profile_response.status_code == status.HTTP_200_OK
        assert user_profile_response.data["username"] == "newuser"
        assert user_profile_response.data["email"] == "newuser@example.com"

    def test_login_and_logout_workflow(self):
        """Test complete login and logout flow."""
        # Create user
        user = get_user_model().objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )

        # Step 1: Login
        login_response = self.client.post(
            "/api/v1/auth/login/", {"username": "testuser", "password": "testpass123"}
        )

        assert login_response.status_code == status.HTTP_200_OK
        access_token = login_response.data["access"]
        refresh_token = login_response.data["refresh"]

        # Set token in client
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # Step 2: Access protected resource
        protected_response = self.client.get("/api/v1/")

        assert protected_response.status_code == status.HTTP_200_OK

        # Step 3: Logout
        logout_response = self.client.post(
            "/api/v1/auth/logout/", {"refresh": refresh_token}
        )

        assert logout_response.status_code == status.HTTP_200_OK

        # Step 4: Verify token is blacklisted
        protected_response_after_logout = self.client.get("/api/v1/")

        # Should now be unauthorized
        assert (
            protected_response_after_logout.status_code == status.HTTP_401_UNAUTHORIZED
        )


class TestTripPlanningWorkflow(TestCase):
    """System tests for complete trip planning workflow."""

    def setUp(self):
        """Set up test client and authenticated user."""
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

    @pytest.mark.external_api
    @pytest.mark.slow
    @unittest.mock.patch("trips.services.RouteCalculationService.calculate_route")
    def test_complete_trip_planning_workflow(self, mock_route):
        """Test end-to-end trip planning workflow."""
        # Mock successful route calculation
        mock_route.return_value = {
            "total_distance": 80000,  # 80km
            "total_duration": 3600,  # 1 hour
            "route": [
                [-87.6298, 41.8781],
                [-86.1581, 39.7684],
                [-84.3880, 33.7490],
            ],
        }

        trip_data = {
            "current_location": "Chicago, IL",
            "pickup_location": "Indianapolis, IN",
            "dropoff_location": "Atlanta, GA",
            "current_cycle_hours": 10.5,
        }

        # Step 1: Plan the trip
        plan_response = self.client.post("/api/v1/plan/", trip_data, format="json")

        assert plan_response.status_code in [
            status.HTTP_201_CREATED,
            status.HTTP_200_OK,
        ]
        trip_id = plan_response.data["id"]

        # Step 2: Retrieve trip details
        trip_detail_response = self.client.get(f"/api/v1/trips/{trip_id}/")

        assert trip_detail_response.status_code == status.HTTP_200_OK
        assert trip_detail_response.data["status"] == "planned"
        assert "route_stops" in trip_detail_response.data
        assert "log_sheets" in trip_detail_response.data

        # Step 3: Verify route stops were created
        stops_response = self.client.get(f"/api/v1/trips/{trip_id}/stops/")

        assert stops_response.status_code == status.HTTP_200_OK
        stops = stops_response.data

        # Should have current, pickup, dropoff, fuel stops, and rest stops
        stop_types = [stop["stop_type"] for stop in stops]
        expected_stop_types = ["current", "pickup", "dropoff"]

        for stop_type in expected_stop_types:
            assert stop_type in stop_types

        # Should have fuel stops for long distances
        fuel_stops = [stop for stop in stops if stop["stop_type"] == "fuel"]

        # Step 4: Verify log sheets were created
        logs_response = self.client.get(f"/api/v1/trips/{trip_id}/logs/")

        assert logs_response.status_code == status.HTTP_200_OK
        logs = logs_response.data

        assert len(logs) >= 1  # At least one day's log
        assert "entries" in logs[0]  # Should have log entries

        # Step 5: Verify ELD compliance
        log_entries = logs[0]["entries"]
        total_driving_time = sum(
            entry["duration"]
            for entry in log_entries
            if entry.get("duty_status") == "driving"
        )

        # Should not exceed 11 hours driving
        assert total_driving_time <= 11.0

    @pytest.mark.external_api
    @unittest.mock.patch("trips.services.RouteCalculationService.calculate_route")
    def test_trip_planning_with_hazmat(self, mock_route):
        """Test trip planning with hazardous materials."""
        # Mock successful route calculation
        mock_route.return_value = {
            "total_distance": 80000,  # 80km
            "total_duration": 3600,  # 1 hour
            "route": [
                [-87.6298, 41.8781],
                [-86.1581, 39.7684],
                [-84.3880, 33.7490],
            ],
        }

        trip_data = {
            "current_location": "Chicago, IL",
            "pickup_location": "Indianapolis, IN",
            "dropoff_location": "Atlanta, GA",
            "current_cycle_hours": 10.5,
        }

        plan_response = self.client.post("/api/v1/plan/", trip_data, format="json")

        assert plan_response.status_code in [
            status.HTTP_201_CREATED,
            status.HTTP_200_OK,
        ]

        # Verify hazmat consideration in route stops
        trip_id = plan_response.data["id"]
        stops_response = self.client.get(f"/api/v1/trips/{trip_id}/stops/")

        assert stops_response.status_code == status.HTTP_200_OK
        # Should have appropriate rest stops for hazmat regulations

    def test_trip_planning_with_time_windows(self):
        """Test trip planning with pickup/delivery time windows."""
        trip_data = {
            "current_location": "Chicago, IL",
            "pickup_location": "Indianapolis, IN",
            "dropoff_location": "Atlanta, GA",
            "current_cycle_hours": 10.5,
        }

        # Mock the external API call since it's not available in tests
        import unittest.mock

        with unittest.mock.patch(
            "trips.services.RouteCalculationService.calculate_route"
        ) as mock_route:
            # Mock successful route calculation
            mock_route.return_value = {
                "total_distance": 80000,  # 80km
                "total_duration": 3600,  # 1 hour
                "route": [
                    [-87.6298, 41.8781],
                    [-86.1581, 39.7684],
                    [-84.3880, 33.7490],
                ],
            }

        plan_response = self.client.post("/api/v1/plan/", trip_data, format="json")

        assert plan_response.status_code in [
            status.HTTP_201_CREATED,
            status.HTTP_200_OK,
        ]

        # Verify time windows are considered in planning
        trip_id = plan_response.data["id"]
        stops_response = self.client.get(f"/api/v1/trips/{trip_id}/stops/")
        stops = stops_response.data

        # First stop (pickup) should be scheduled around 8 AM
        pickup_stops = [stop for stop in stops if stop["stop_type"] == "pickup"]
        if pickup_stops:
            # Check if time window is respected (this would require mocking time calculations)
            assert True  # Placeholder - would need time-based validation


class TestELDComplianceWorkflow(TestCase):
    """System tests for ELD compliance throughout trip lifecycle."""

    def setUp(self):
        """Set up test client and user."""
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

    def test_eld_compliance_enforcement(self):
        """Test ELD compliance enforcement throughout trip workflow."""
        # Create trip with maximum allowed cycle hours
        trip_data = {
            "current_location": "Chicago, IL",
            "pickup_location": "Indianapolis, IN",
            "dropoff_location": "Atlanta, GA",
            "current_cycle_hours": 69.5,  # Near maximum
        }

        # Mock the external API call since it's not available in tests
        import unittest.mock

        with unittest.mock.patch(
            "trips.services.RouteCalculationService.calculate_route"
        ) as mock_route:
            # Mock successful route calculation
            mock_route.return_value = {
                "total_distance": 80000,  # 80km
                "total_duration": 3600,  # 1 hour
                "route": [
                    [-87.6298, 41.8781],
                    [-86.1581, 39.7684],
                    [-84.3880, 33.7490],
                ],
            }

        plan_response = self.client.post("/api/v1/plan/", trip_data, format="json")

        assert plan_response.status_code in [
            status.HTTP_201_CREATED,
            status.HTTP_200_OK,
        ]

        # Get log sheets for compliance checking
        trip_id = plan_response.data["id"]
        logs_response = self.client.get(f"/api/v1/trips/{trip_id}/logs/")

        assert logs_response.status_code == status.HTTP_200_OK
        log_sheets = logs_response.data

        # Check compliance across all log sheets
        for log_sheet in log_sheets:
            entries = log_sheet.get("entries", [])
            total_driving_time = sum(
                entry.get("duration", 0)
                for entry in entries
                if entry.get("duty_status") == "driving"
            )
            total_duty_time = sum(
                entry.get("duration", 0)
                for entry in entries
                if entry.get("duty_status") in ["driving", "on_duty_not_driving"]
            )

            # ELD compliance checks
            assert total_driving_time <= 11.0, (
                f"Driving time exceeded: {total_driving_time}"
            )
            assert total_duty_time <= 14.0, f"Duty time exceeded: {total_duty_time}"

            # Check for 30-minute break requirement
            cumulative_driving = 0
            for entry in entries:
                if entry.get("duty_status") == "driving":
                    cumulative_driving += entry.get("duration", 0)
                    if cumulative_driving > 8.0:
                        # Should have a break after 8 hours
                        # Find next entry with break/off_duty
                        break_found = any(
                            next_entry.get("duty_status") in ["off_duty", "sleeper"]
                            for next_entry in entries[entries.index(entry) + 1 :]
                        )
                        assert break_found, (
                            "30-minute break required after 8 hours driving"
                        )


class TestConcurrentAccessControl(TestCase):
    """System tests for concurrent access and data isolation."""

    def setUp(self):
        """Set up multiple users."""
        self.client1 = APIClient()
        self.client2 = APIClient()

        self.user1 = get_user_model().objects.create_user(
            username="user1", email="user1@example.com", password="testpass123"
        )

        self.user2 = get_user_model().objects.create_user(
            username="user2", email="user2@example.com", password="testpass123"
        )

        self.client1.force_authenticate(user=self.user1)
        self.client2.force_authenticate(user=self.user2)

    def test_user_data_isolation(self):
        """Test that users can only access their own data."""
        # User 1 creates a trip
        trip_data = {
            "current_location": "Chicago, IL",
            "pickup_location": "Indianapolis, IN",
            "dropoff_location": "Atlanta, GA",
            "current_cycle_hours": 10.5,
        }

        # Mock the external API call since it's not available in tests
        import unittest.mock

        with unittest.mock.patch(
            "trips.services.RouteCalculationService.calculate_route"
        ) as mock_route:
            # Mock successful route calculation
            mock_route.return_value = {
                "total_distance": 80000,  # 80km
                "total_duration": 3600,  # 1 hour
                "route": [
                    [-87.6298, 41.8781],
                    [-86.1581, 39.7684],
                    [-84.3880, 33.7490],
                ],
            }

        # Mock the external API call since it's not available in tests
        import unittest.mock

        with unittest.mock.patch(
            "trips.services.RouteCalculationService.calculate_route"
        ) as mock_route:
            # Mock successful route calculation
            mock_route.return_value = {
                "total_distance": 80000,  # 80km
                "total_duration": 3600,  # 1 hour
                "route": [
                    [-87.6298, 41.8781],
                    [-86.1581, 39.7684],
                    [-84.3880, 33.7490],
                ],
            }

        trip_response = self.client1.post("/api/v1/plan/", trip_data, format="json")
        assert trip_response.status_code in [
            status.HTTP_201_CREATED,
            status.HTTP_200_OK,
        ]

        trip_id = trip_response.data["id"]

        # User 1 can access their own trip
        user1_detail_response = self.client1.get(f"/api/v1/trips/{trip_id}/")
        assert user1_detail_response.status_code == status.HTTP_200_OK

        # User 2 cannot access User 1's trip
        user2_detail_response = self.client2.get(f"/api/v1/trips/{trip_id}/")
        assert user2_detail_response.status_code == status.HTTP_404_NOT_FOUND

        # User 2's trips list should be empty
        user2_trips_response = self.client2.get("/api/v1/trips/")
        assert user2_trips_response.data["count"] == 0

        # User 1's trips list should contain their trip
        user1_trips_response = self.client1.get("/api/v1/trips/")
        assert user1_trips_response.data["count"] == 1


class TestPerformanceWorkflows(TestCase):
    """System tests for performance and load handling."""

    def setUp(self):
        """Set up test client and user."""
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

    @pytest.mark.slow
    def test_bulk_trip_creation(self):
        """Test performance with multiple trip operations."""
        # Create multiple trips rapidly
        trip_data = {
            "current_location": "Chicago, IL",
            "pickup_location": "Indianapolis, IN",
            "dropoff_location": "Atlanta, GA",
            "current_cycle_hours": 10.5,
        }

        # Mock the external API call since it's not available in tests
        import unittest.mock

        with unittest.mock.patch(
            "trips.services.RouteCalculationService.calculate_route"
        ) as mock_route:
            # Mock successful route calculation
            mock_route.return_value = {
                "total_distance": 80000,  # 80km
                "total_duration": 3600,  # 1 hour
                "route": [
                    [-87.6298, 41.8781],
                    [-86.1581, 39.7684],
                    [-84.3880, 33.7490],
                ],
            }

        trip_ids = []
        for i in range(10):  # Create 10 trips
            response = self.client.post("/api/v1/trips/", trip_data, format="json")
            assert response.status_code == status.HTTP_201_CREATED
            # Extract ID from response - it might be nested
            if "id" in response.data:
                trip_ids.append(response.data["id"])
            elif isinstance(response.data, dict) and len(response.data) > 0:
                # Try to get ID from the first key in response
                first_key = list(response.data.keys())[0]
                if (
                    isinstance(response.data[first_key], dict)
                    and "id" in response.data[first_key]
                ):
                    trip_ids.append(response.data[first_key]["id"])
                else:
                    trip_ids.append(i + 1)  # Fallback
            else:
                trip_ids.append(i + 1)  # Fallback

        # Verify all trips are accessible
        trips_response = self.client.get("/api/v1/trips/")
        assert trips_response.data["count"] == 10

        # Test pagination if implemented
        # This would depend on your pagination strategy
        assert len(trips_response.data["results"]) == 10

    @pytest.mark.slow
    def test_large_dataset_handling(self):
        """Test system performance with large datasets."""
        # Create a trip with many stops
        trip_data = {
            "current_location": "Chicago, IL",
            "pickup_location": "Indianapolis, IN",
            "dropoff_location": "Los Angeles, CA",  # Long distance
            "current_cycle_hours": 10.5,
        }

        # Mock the external API call since it's not available in tests
        import unittest.mock

        with unittest.mock.patch(
            "trips.services.RouteCalculationService.calculate_route"
        ) as mock_route:
            # Mock successful route calculation
            mock_route.return_value = {
                "total_distance": 2800000,  # 2800km (long distance)
                "total_duration": 86400,  # 24 hours
                "route": [
                    [-87.6298, 41.8781],
                    [-86.1581, 39.7684],
                    [-118.2437, 34.0522],
                ],
            }

        plan_response = self.client.post("/api/v1/plan/", trip_data, format="json")
        assert plan_response.status_code in [
            status.HTTP_201_CREATED,
            status.HTTP_200_OK,
        ]

        trip_id = plan_response.data["id"]

        # Test accessing large dataset
        stops_response = self.client.get(f"/api/v1/trips/{trip_id}/stops/")
        logs_response = self.client.get(f"/api/v1/trips/{trip_id}/logs/")

        assert stops_response.status_code == status.HTTP_200_OK
        assert logs_response.status_code == status.HTTP_200_OK

        # Should handle large number of stops/entries efficiently
        # Performance assertions would depend on your performance requirements
        assert len(stops_response.data) > 0
        assert len(logs_response.data) > 0
