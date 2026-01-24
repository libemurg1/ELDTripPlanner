"""
Test configuration and fixtures for ELD Planner backend.
"""

import os
import sys
from pathlib import Path

# Add the project root to the Python path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "eld_planner.settings")

import django
import pytest
import factory
from factory import fuzzy
from faker import Faker
from django.core.management import execute_from_command_line
from django.db import connections
from django.test import TestCase
from django.test.utils import setup_test_environment, teardown_test_environment

fake = Faker()


class UserFactory(factory.django.DjangoModelFactory):
    """Factory for creating test users."""

    class Meta:
        model = "auth.User"

    username = factory.LazyAttribute(lambda _: fake.user_name())
    email = factory.LazyAttribute(lambda _: fake.email())
    first_name = factory.LazyAttribute(lambda _: fake.first_name())
    last_name = factory.LazyAttribute(lambda _: fake.last_name())
    password = factory.PostGenerationMethodCall("set_password", "testpass123")


class TripFactory(factory.django.DjangoModelFactory):
    """Factory for creating test trips."""

    class Meta:
        model = "trips.Trip"

    user = factory.SubFactory(UserFactory)
    current_location = factory.LazyAttribute(lambda _: fake.city())
    pickup_location = factory.LazyAttribute(lambda _: fake.city())
    dropoff_location = factory.LazyAttribute(lambda _: fake.city())
    current_cycle_hours = fuzzy.FuzzyFloat(0.0, 70.0, 2)
    total_distance = fuzzy.FuzzyFloat(100.0, 5000.0, 2)
    estimated_duration = fuzzy.FuzzyFloat(1.0, 100.0, 2)
    status = fuzzy.FuzzyChoice(["planned", "in_progress", "completed", "cancelled"])


class RouteStopFactory(factory.django.DjangoModelFactory):
    """Factory for creating test route stops."""

    class Meta:
        model = "trips.RouteStop"

    trip = factory.SubFactory(TripFactory)
    location = factory.LazyAttribute(lambda _: fake.city())
    latitude = fuzzy.FuzzyFloat(-90.0, 90.0, 6)
    longitude = fuzzy.FuzzyFloat(-180.0, 180.0, 6)
    stop_type = fuzzy.FuzzyChoice(["fuel", "rest", "pickup", "dropoff"])
    estimated_arrival = factory.LazyFunction(
        lambda: fake.future_datetime(end_date="+30d")
    )
    estimated_departure = factory.LazyFunction(
        lambda: fake.future_datetime(end_date="+30d")
    )
    duration_minutes = fuzzy.FuzzyInteger(15, 240)
    sequence_order = fuzzy.FuzzyInteger(1, 20)


class LogSheetFactory(factory.django.DjangoModelFactory):
    """Factory for creating test log sheets."""

    class Meta:
        model = "trips.LogSheet"

    trip = factory.SubFactory(TripFactory)
    driver = factory.SubFactory(UserFactory)
    date = factory.LazyFunction(
        lambda: fake.date_between(start_date="-30d", end_date="+30d")
    )
    driving_hours = fuzzy.FuzzyFloat(0.0, 11.0, 2)
    on_duty_hours = fuzzy.FuzzyFloat(0.0, 14.0, 2)
    off_duty_hours = fuzzy.FuzzyFloat(0.0, 24.0, 2)
    sleeper_berth_hours = fuzzy.FuzzyFloat(0.0, 10.0, 2)
    cycle_hours_used = fuzzy.FuzzyFloat(0.0, 70.0, 2)
    remarks = factory.LazyAttribute(lambda _: fake.sentence())


class LogEntryFactory(factory.django.DjangoModelFactory):
    """Factory for creating test log entries."""

    class Meta:
        model = "trips.LogEntry"

    log_sheet = factory.SubFactory(LogSheetFactory)
    start_time = factory.LazyFunction(lambda: fake.time_object())
    end_time = factory.LazyFunction(lambda: fake.time_object())
    duty_status = fuzzy.FuzzyChoice(
        ["off_duty", "sleeper_berth", "driving", "on_duty_not_driving"]
    )
    location = factory.LazyAttribute(lambda _: fake.city())
    remarks = factory.LazyAttribute(lambda _: fake.sentence())


@pytest.fixture
def user_factory():
    """Factory fixture for creating test users."""
    return UserFactory


@pytest.fixture
def trip_factory():
    """Factory fixture for creating test trips."""
    return TripFactory


@pytest.fixture
def route_stop_factory():
    """Factory fixture for creating test route stops."""
    return RouteStopFactory


@pytest.fixture
def log_sheet_factory():
    """Factory fixture for creating test log sheets."""
    return LogSheetFactory


@pytest.fixture
def log_entry_factory():
    """Factory fixture for creating test log entries."""
    return LogEntryFactory


@pytest.fixture
def auth_client(client, user_factory):
    """Create an authenticated client."""
    from rest_framework_simplejwt.tokens import RefreshToken

    user = user_factory()
    refresh = RefreshToken.for_user(user)

    client.cookies.load(
        {
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
        }
    )

    return client, user


@pytest.fixture
def trip_with_stops(trip_factory, route_stop_factory):
    """Create a trip with multiple route stops."""
    trip = trip_factory()

    # Create stops
    route_stop_factory(trip=trip, stop_type="pickup", sequence_order=1)
    route_stop_factory(trip=trip, stop_type="fuel", sequence_order=2)
    route_stop_factory(trip=trip, stop_type="rest", sequence_order=3)
    route_stop_factory(trip=trip, stop_type="dropoff", sequence_order=4)

    return trip


@pytest.fixture
def trip_with_logs(trip_factory, log_sheet_factory, log_entry_factory):
    """Create a trip with log sheets and entries."""
    trip = trip_factory()

    # Create log sheet for today
    log_sheet = log_sheet_factory(trip=trip)

    # Create log entries
    log_entry_factory(
        log_sheet=log_sheet,
        duty_status="off_duty",
        start_time="06:00:00",
        end_time="08:00:00",
    )
    log_entry_factory(
        log_sheet=log_sheet,
        duty_status="driving",
        start_time="08:00:00",
        end_time="12:00:00",
    )
    log_entry_factory(
        log_sheet=log_sheet,
        duty_status="driving",
        start_time="13:00:00",
        end_time="17:00:00",
    )

    return trip, log_sheet


@pytest.fixture
def mock_external_apis(mocker):
    """Mock external API responses."""
    # Mock OpenRouteService geocoding
    mock_geocode = mocker.patch(
        "services.trip_service.RouteCalculationService.get_coordinates"
    )
    mock_geocode.return_value = {"lat": 41.8781, "lon": -87.6298}

    # Mock OpenRouteService routing
    mock_route = mocker.patch(
        "services.trip_service.RouteCalculationService.calculate_route"
    )
    mock_route.return_value = {
        "distance": 1000.5,
        "duration": 18.5,
        "geometry": {"coordinates": [[-87.6298, 41.8781], [-86.1581, 39.7684]]},
        "segments": [
            {
                "from": "Chicago, IL",
                "to": "Indianapolis, IN",
                "distance": 500.25,
                "duration": 9.25,
            },
            {
                "from": "Indianapolis, IN",
                "to": "Atlanta, GA",
                "distance": 500.25,
                "duration": 9.25,
            },
        ],
    }

    # Mock fuel stops calculation
    mock_fuel = mocker.patch(
        "services.trip_service.RouteCalculationService.calculate_fuel_stops"
    )
    mock_fuel.return_value = [
        {"location": "Fuel Stop 1", "lat": 40.8233, "lon": -86.8938, "distance": 500.0}
    ]

    # Mock rest stops calculation
    mock_rest = mocker.patch(
        "services.trip_service.RouteCalculationService.generate_rest_stops"
    )
    mock_rest.return_value = [
        {"location": "Rest Stop 1", "duration": 30, "after_hours": 8.0}
    ]

    return {
        "geocode": mock_geocode,
        "route": mock_route,
        "fuel": mock_fuel,
        "rest": mock_rest,
    }


@pytest.fixture
def sample_trip_data():
    """Sample trip data for API testing."""
    return {
        "current_location": "Chicago, IL",
        "pickup_location": "Indianapolis, IN",
        "dropoff_location": "Atlanta, GA",
        "current_cycle_hours": 10.5,
    }


@pytest.fixture
def sample_user_data():
    """Sample user data for registration testing."""
    return {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123",
        "password_confirm": "testpass123",
        "first_name": "Test",
        "last_name": "User",
    }


@pytest.fixture
def invalid_trip_data():
    """Invalid trip data for validation testing."""
    return {
        "current_location": "",  # Required field missing
        "pickup_location": "Indianapolis, IN",
        "dropoff_location": "Atlanta, GA",
        "current_cycle_hours": 75.0,  # Over 70 hours
    }


@pytest.fixture
def coverage_report():
    """Generate test coverage report."""
    import coverage

    cov = coverage.Coverage()
    cov.start()
    yield cov
    cov.stop()
    cov.save()
    cov.html_report(directory="htmlcov")
