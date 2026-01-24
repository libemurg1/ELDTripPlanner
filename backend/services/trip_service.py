import math
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from .interfaces import (
    HOSComplianceResult,
    IELDService,
    ILogSheetRepository,
    IRouteStopRepository,
    ITripRepository,
    ITripService,
    RouteCalculationResult,
    TripCreationData,
)


class TripService(ITripService):
    """
    Service layer for trip operations.
    Implements business logic for trip management.
    """

    def __init__(
        self,
        trip_repository: ITripRepository,
        log_sheet_repository: ILogSheetRepository,
        route_stop_repository: IRouteStopRepository,
        eld_service: IELDService,
    ):
        self.trip_repo = trip_repository
        self.log_repo = log_sheet_repository
        self.stop_repo = route_stop_repository
        self.eld_service = eld_service

    def create_trip(self, user_id: int, trip_data: Dict[str, Any]) -> Any:
        """
        Create a new trip with basic validation.
        """
        # Validate required fields
        required_fields = [
            "current_location",
            "pickup_location",
            "dropoff_location",
            "current_cycle_hours",
        ]
        for field in required_fields:
            if field not in trip_data:
                raise ValueError(f"Missing required field: {field}")

        # Validate cycle hours
        cycle_hours = trip_data["current_cycle_hours"]
        if not isinstance(cycle_hours, (int, float)) or not (0 <= cycle_hours <= 70):
            raise ValueError("Cycle hours must be between 0 and 70")

        # Create trip
        trip_data["user"] = user_id
        trip = self.trip_repo.create(**trip_data)

        return trip

    def get_trip(self, trip_id: int) -> Optional[Any]:
        """
        Get trip with related data.
        """
        return self.trip_repo.get_with_stops(trip_id)

    def get_user_trips(self, user_id: int) -> List[Any]:
        """
        Get all trips for a user.
        """
        return self.trip_repo.get_by_user(user_id)

    def plan_trip(self, user_id: int, trip_data: Dict[str, Any]) -> Any:
        """
        Plan a complete trip with route calculation and ELD logs.
        """
        # Create the trip
        trip = self.create_trip(user_id, trip_data)

        # Calculate route and create stops
        route_result = self._calculate_route(trip)

        # Create route stops
        self._create_route_stops(trip, route_result)

        # Generate ELD log sheets
        log_sheets = self.eld_service.generate_log_sheets(trip.id)

        # Update trip with calculated data
        self.trip_repo.update(
            trip,
            total_distance=route_result.total_distance,
            estimated_duration=route_result.estimated_duration,
        )

        return trip

    def _calculate_route(self, trip: Any) -> RouteCalculationResult:
        """
        Calculate route with stops and distance.
        This is a simplified implementation - in production, use OpenRouteService API.
        """
        # Calculate approximate distance between points
        distance = self._calculate_distance(
            trip.current_location, trip.pickup_location
        ) + self._calculate_distance(trip.pickup_location, trip.dropoff_location)

        # Estimate duration (simplified)
        estimated_duration = distance / 60  # 60 mph average

        # Determine fuel stops (every 1000 miles)
        fuel_stops = max(0, int(distance / 1000) - 1)

        # Determine rest stops based on HOS rules
        rest_stops = max(0, int(estimated_duration / 8) - 1)

        return RouteCalculationResult(
            total_distance=distance,
            estimated_duration=estimated_duration,
            fuel_stops=fuel_stops,
            rest_stops=rest_stops,
            route_points=[],
            stops=[],
        )

    def _calculate_distance(self, from_location: str, to_location: str) -> float:
        """
        Calculate approximate distance between two locations.
        In production, use geocoding and routing APIs.
        """
        # Simplified Haversine distance calculation
        # In production, use actual geocoding and routing services

        # Mock coordinates for major cities (simplified)
        coordinates = {
            "New York": (40.7128, -74.0060),
            "Los Angeles": (34.0522, -118.2437),
            "Chicago": (41.8781, -87.6298),
            "Houston": (29.7604, -95.3698),
            "Phoenix": (33.4484, -112.0740),
            "Philadelphia": (39.9526, -75.1652),
            "San Antonio": (29.4241, -98.4936),
            "San Diego": (32.7157, -117.1611),
            "Dallas": (32.7767, -96.7970),
            "San Jose": (37.3382, -121.8863),
        }

        from_coords = coordinates.get(from_location, (0, 0))
        to_coords = coordinates.get(to_location, (0, 0))

        # Haversine formula
        lat1, lon1 = math.radians(from_coords[0]), math.radians(from_coords[1])
        lat2, lon2 = math.radians(to_coords[0]), math.radians(to_coords[1])

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.asin(math.sqrt(a))

        # Radius of Earth in miles
        r = 3959

        return c * r

    def _create_route_stops(
        self, trip: Any, route_result: RouteCalculationResult
    ) -> None:
        """
        Create route stops based on calculation results.
        """
        stops = []

        # Current location (start)
        stops.append(
            {
                "location": trip.current_location,
                "stop_type": "current",
                "sequence_order": 1,
                "duration_minutes": 0,
            }
        )

        # Pickup location
        stops.append(
            {
                "location": trip.pickup_location,
                "stop_type": "pickup",
                "sequence_order": 2,
                "duration_minutes": 60,  # 1 hour for pickup
            }
        )

        # Fuel stops
        for i in range(route_result.fuel_stops):
            stops.append(
                {
                    "location": f"Fuel Stop {i + 1}",
                    "stop_type": "fuel",
                    "sequence_order": len(stops) + 1,
                    "duration_minutes": 30,  # 30 minutes for fueling
                }
            )

        # Rest stops
        for i in range(route_result.rest_stops):
            stops.append(
                {
                    "location": f"Rest Stop {i + 1}",
                    "stop_type": "rest",
                    "sequence_order": len(stops) + 1,
                    "duration_minutes": 30,  # 30-minute break
                }
            )

        # Dropoff location
        stops.append(
            {
                "location": trip.dropoff_location,
                "stop_type": "dropoff",
                "sequence_order": len(stops) + 1,
                "duration_minutes": 60,  # 1 hour for dropoff
            }
        )

        # Create stops in database
        for stop_data in stops:
            stop_data["trip"] = trip
            self.stop_repo.create(**stop_data)


class ELDService(IELDService):
    """
    Service layer for ELD operations.
    Implements HOS compliance and log sheet generation.
    """

    def __init__(
        self,
        trip_repository: ITripRepository,
        log_sheet_repository: ILogSheetRepository,
        route_stop_repository: IRouteStopRepository,
    ):
        self.trip_repo = trip_repository
        self.log_repo = log_sheet_repository
        self.stop_repo = route_stop_repository

    def generate_log_sheets(self, trip_id: int) -> List[Any]:
        """
        Generate ELD log sheets for a trip.
        """
        trip = self.trip_repo.get_with_stops(trip_id)
        if not trip:
            raise ValueError(f"Trip {trip_id} not found")

        # Get route stops
        stops = self.stop_repo.get_by_trip(trip_id)
        if not stops:
            # Create basic log sheet if no stops
            return self._create_basic_log_sheet(trip)

        # Calculate log sheets based on stops and HOS rules
        log_sheets = []
        current_date = datetime.now().date()

        # Create log sheets for the trip duration
        days_needed = max(1, int(trip.estimated_duration / 24) + 1)

        for day_offset in range(days_needed):
            date = current_date + timedelta(days=day_offset)

            # Calculate hours for this day
            hours_data = self._calculate_daily_hours(trip, stops, day_offset)

            log_sheet = self.log_repo.create(
                trip=trip,
                date=date,
                driving_hours=hours_data["driving"],
                on_duty_hours=hours_data["on_duty"],
                off_duty_hours=hours_data["off_duty"],
                sleeper_berth_hours=hours_data["sleeper"],
                cycle_hours_used=hours_data["cycle_used"],
            )

            log_sheets.append(log_sheet)

        return log_sheets

    def check_compliance(self, log_sheet_id: int) -> Dict[str, Any]:
        """
        Check HOS compliance for a log sheet.
        """
        compliance_result = self.log_repo.get_compliance_status(log_sheet_id)

        # Get the log sheet
        log_sheet = self.log_repo.get(log_sheet_id)
        if not log_sheet:
            return {
                "is_compliant": False,
                "status": "not_found",
                "violations": ["Log sheet not found"],
            }

        violations = []
        warnings = []

        # Check driving hours (11 hours max per day)
        if log_sheet.driving_hours > 11:
            violations.append(
                f"Driving hours exceed 11-hour limit: {log_sheet.driving_hours} hours"
            )

        # Check on-duty hours (14 hours max per day)
        if log_sheet.on_duty_hours > 14:
            violations.append(
                f"On-duty hours exceed 14-hour limit: {log_sheet.on_duty_hours} hours"
            )

        # Check cycle hours (70 hours max in 8 days)
        if log_sheet.cycle_hours_used > 70:
            violations.append(
                f"Cycle hours exceed 70-hour limit: {log_sheet.cycle_hours_used} hours"
            )

        # Check off-duty hours (minimum 10 hours rest)
        if log_sheet.off_duty_hours < 10:
            warnings.append(
                f"Less than 10 hours off-duty: {log_sheet.off_duty_hours} hours"
            )

        return {
            "is_compliant": len(violations) == 0,
            "status": "compliant" if len(violations) == 0 else "violation",
            "violations": violations,
            "warnings": warnings,
            "total_driving_hours": log_sheet.driving_hours,
            "total_on_duty_hours": log_sheet.on_duty_hours,
            "total_off_duty_hours": log_sheet.off_duty_hours,
            "cycle_remaining_hours": max(0, 70 - log_sheet.cycle_hours_used),
        }

    def generate_hos_report(self, trip_id: int) -> Dict[str, Any]:
        """
        Generate comprehensive HOS report for a trip.
        """
        trip = self.trip_repo.get_with_stops(trip_id)
        if not trip:
            raise ValueError(f"Trip {trip_id} not found")

        log_sheets = self.log_repo.get_by_trip(trip_id)

        # Aggregate data
        total_driving = sum(ls.driving_hours for ls in log_sheets)
        total_on_duty = sum(ls.on_duty_hours for ls in log_sheets)
        total_off_duty = sum(ls.off_duty_hours for ls in log_sheets)
        total_sleeper = sum(ls.sleeper_berth_hours for ls in log_sheets)
        total_cycle = sum(ls.cycle_hours_used for ls in log_sheets)

        # Check compliance
        violations = []
        warnings = []

        if total_driving > 70:
            violations.append(
                f"Total driving hours exceed 70-hour cycle limit: {total_driving} hours"
            )

        if any(ls.driving_hours > 11 for ls in log_sheets):
            violations.append("Daily driving hours exceed 11-hour limit")

        if any(ls.on_duty_hours > 14 for ls in log_sheets):
            violations.append("Daily on-duty hours exceed 14-hour limit")

        return {
            "trip_id": trip_id,
            "trip_name": f"{trip.current_location} → {trip.pickup_location} → {trip.dropoff_location}",
            "total_distance": trip.total_distance,
            "estimated_duration": trip.estimated_duration,
            "summary": {
                "total_driving_hours": total_driving,
                "total_on_duty_hours": total_on_duty,
                "total_off_duty_hours": total_off_duty,
                "total_sleeper_hours": total_sleeper,
                "total_cycle_hours": total_cycle,
                "cycle_remaining": max(0, 70 - total_cycle),
            },
            "daily_logs": [
                {
                    "date": ls.date.isoformat(),
                    "driving_hours": ls.driving_hours,
                    "on_duty_hours": ls.on_duty_hours,
                    "off_duty_hours": ls.off_duty_hours,
                    "sleeper_hours": ls.sleeper_berth_hours,
                    "cycle_used": ls.cycle_hours_used,
                }
                for ls in log_sheets
            ],
            "compliance": {
                "is_compliant": len(violations) == 0,
                "violations": violations,
                "warnings": warnings,
            },
            "generated_at": datetime.now().isoformat(),
        }

    def _create_basic_log_sheet(self, trip: Any) -> List[Any]:
        """
        Create a basic log sheet when no detailed stops are available.
        """
        # Create a single log sheet with estimated hours
        estimated_driving = min(11, trip.estimated_duration)
        estimated_on_duty = min(
            14, trip.estimated_duration + 1
        )  # Include pickup/dropoff time

        log_sheet = self.log_repo.create(
            trip=trip,
            date=datetime.now().date(),
            driving_hours=estimated_driving,
            on_duty_hours=estimated_on_duty,
            off_duty_hours=max(0, 24 - estimated_on_duty),
            sleeper_berth_hours=0,
            cycle_hours_used=estimated_on_duty,
        )

        return [log_sheet]

    def _calculate_daily_hours(
        self, trip: Any, stops: List[Any], day_offset: int
    ) -> Dict[str, float]:
        """
        Calculate hours for a specific day based on stops and HOS rules.
        """
        # Simplified calculation - in production, use more sophisticated logic
        base_driving = min(
            8, trip.estimated_duration / (day_offset + 1)
        )  # Distribute driving across days
        base_on_duty = min(10, base_driving + 2)  # Add time for stops

        return {
            "driving": base_driving,
            "on_duty": base_on_duty,
            "off_duty": max(0, 24 - base_on_duty),
            "sleeper": max(0, 10 - (24 - base_on_duty)),  # Minimum 10 hours rest
            "cycle_used": base_on_duty,
        }
