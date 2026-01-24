from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any, Dict, Generic, List, Optional, Type, TypeVar

from django.core.exceptions import ObjectDoesNotExist
from django.db import models

from trips.models import LogEntry, LogSheet, RouteStop, Trip

T = TypeVar("T", bound=models.Model)


class Repository(ABC, Generic[T]):
    """
    Abstract repository pattern for data access layer.
    Provides a clean interface for CRUD operations.
    """

    def __init__(self):
        self.model_class = self.get_model_class()

    @abstractmethod
    def get_model_class(self) -> Type[T]:
        """Return the Django model class this repository manages."""
        pass

    def get(self, pk: Any) -> Optional[T]:
        """
        Get a single instance by primary key.
        """
        try:
            return self.model_class.objects.get(pk=pk)
        except ObjectDoesNotExist:
            return None

    def get_all(self, **filters) -> List[T]:
        """
        Get all instances with optional filtering.
        """
        queryset = self.model_class.objects.all()

        if filters:
            queryset = self.apply_filters(queryset, filters)

        return list(queryset)

    def create(self, **data) -> T:
        """
        Create a new instance.
        """
        return self.model_class.objects.create(**data)

    def update(self, instance: T, **data) -> T:
        """
        Update an existing instance.
        """
        for key, value in data.items():
            if hasattr(instance, key):
                setattr(instance, key, value)
        instance.save()
        return instance

    def delete(self, instance: T) -> bool:
        """
        Delete an instance.
        """
        instance.delete()
        return True

    def apply_filters(self, queryset, filters: Dict[str, Any]) -> Any:
        """
        Apply filters to queryset. Override in subclasses.
        """
        return queryset.filter(**filters)

    def exists(self, **filters) -> bool:
        """
        Check if instance exists with given filters.
        """
        return self.model_class.objects.filter(**filters).exists()


class TripRepository(Repository[Trip]):
    """
    Repository for Trip model operations.
    """

    def get_model_class(self) -> Type[Trip]:
        from trips.models import Trip

        return Trip

    def get_by_user(self, user_id: int) -> List[Trip]:
        """
        Get all trips for a specific user.
        """
        return self.get_all(user=user_id)

    def get_active_trips(self, user_id: int) -> List[Trip]:
        """
        Get active trips for a user.
        """
        return self.get_all(user=user_id, status="planned")

    def get_with_stops(self, trip_id: int) -> Optional[Trip]:
        """
        Get trip with related stops preloaded.
        """
        trip = self.get(trip_id)
        if trip:
            # Prefetch related stops
            trip.stops = trip.route_stops.all()
            trip.log_sheets = trip.log_sheets.all()
        return trip
        return None

    def apply_filters(self, queryset, filters: Dict[str, Any]) -> Any:
        """
        Apply trip-specific filters.
        """
        if "status" in filters:
            queryset = queryset.filter(status=filters["status"])
        if "user" in filters:
            queryset = queryset.filter(user_id=filters["user"])
        if "date_from" in filters:
            queryset = queryset.filter(created_at__gte=filters["date_from"])
        if "date_to" in filters:
            queryset = queryset.filter(created_at__lte=filters["date_to"])
        return queryset


class LogSheetRepository(Repository[LogSheet]):
    """
    Repository for LogSheet model operations.
    """

    def get_model_class(self) -> Type[LogSheet]:
        from trips.models import LogSheet

        return LogSheet

    def get_by_trip(self, trip_id: int) -> List[LogSheet]:
        """
        Get all log sheets for a trip.
        """
        return self.get_all(trip=trip_id)

    def get_by_date_range(self, start_date: str, end_date: str) -> List[LogSheet]:
        """
        Get log sheets within a date range.
        """
        return self.get_all(date__gte=start_date, date__lte=end_date)

    def get_compliance_status(self, log_sheet_id: int) -> Dict[str, Any]:
        """
        Get compliance status for a log sheet.
        """
        log_sheet = self.get(log_sheet_id)
        if not log_sheet:
            return {"status": "not_found"}

        # Check HOS compliance
        driving_hours = log_sheet.driving_hours
        on_duty_hours = log_sheet.on_duty_hours
        total_hours = driving_hours + on_duty_hours

        if total_hours > 11:
            return {"status": "violation", "type": "driving_hours"}
        if total_hours > 14:
            return {"status": "violation", "type": "on_duty_hours"}

        return {"status": "compliant", "type": "ok"}


class RouteStopRepository(Repository[RouteStop]):
    """
    Repository for RouteStop model operations.
    """

    def get_model_class(self) -> Type[RouteStop]:
        from trips.models import RouteStop

        return RouteStop

    def get_by_trip(self, trip_id: int) -> List[RouteStop]:
        """
        Get all stops for a trip, ordered by sequence.
        """
        return self.get_all(trip=trip_id).order_by("sequence_order")

    def get_by_type(self, trip_id: int, stop_type: str) -> List[RouteStop]:
        """
        Get stops of a specific type for a trip.
        """
        return self.get_all(trip=trip_id, stop_type=stop_type).order_by(
            "sequence_order"
        )

    def get_fuel_stops(self, trip_id: int) -> List[RouteStop]:
        """
        Get all fuel stops for a trip.
        """
        return self.get_by_type(trip_id, "fuel")

    def get_rest_stops(self, trip_id: int) -> List[RouteStop]:
        """
        Get all rest stops for a trip.
        """
        return self.get_by_type(trip_id, "rest")

    def get_pickup_stops(self, trip_id: int) -> List[RouteStop]:
        """
        Get pickup stops for a trip.
        """
        return self.get_by_type(trip_id, "pickup")

    def get_dropoff_stops(self, trip_id: int) -> List[RouteStop]:
        """
        Get dropoff stops for a trip.
        """
        return self.get_by_type(trip_id, "dropoff")


class LogEntryRepository(Repository[LogEntry]):
    """
    Repository for LogEntry model operations.
    """

    def get_model_class(self) -> Type[LogEntry]:
        from trips.models import LogEntry

        return LogEntry

    def get_by_log_sheet(self, log_sheet_id: int) -> List[LogEntry]:
        """
        Get all log entries for a log sheet.
        """
        return self.get_all(log_sheet=log_sheet_id).order_by("start_time")

    def get_by_time_range(
        self, log_sheet_id: int, start_time: str, end_time: str
    ) -> List[LogEntry]:
        """
        Get log entries within a time range.
        """
        return self.get_all(
            log_sheet=log_sheet_id, start_time__gte=start_time, end_time__lte=end_time
        ).order_by("start_time")

    def get_by_duty_status(self, log_sheet_id: int, duty_status: str) -> List[LogEntry]:
        """
        Get log entries with specific duty status.
        """
        return self.get_all(log_sheet=log_sheet_id, duty_status=duty_status).order_by(
            "start_time"
        )

    def get_driving_entries(self, log_sheet_id: int) -> List[LogEntry]:
        """
        Get all driving entries for a log sheet.
        """
        return self.get_by_duty_status(log_sheet_id, "driving")

    def get_off_duty_entries(self, log_sheet_id: int) -> List[LogEntry]:
        """
        Get all off-duty entries for a log sheet.
        """
        return self.get_by_duty_status(log_sheet_id, "off_duty")

    def get_sleeper_berth_entries(self, log_sheet_id: int) -> List[LogEntry]:
        """
        Get all sleeper berth entries for a log sheet.
        """
        return self.get_by_duty_status(log_sheet_id, "sleeper_berth")
