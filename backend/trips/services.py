import requests
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Tuple
from django.conf import settings
from .models import Trip, RouteStop, LogSheet, LogEntry


class RouteCalculationService:
    """
    Service for calculating routes using OpenRouteService API
    """

    def __init__(self):
        self.api_key = getattr(settings, "OPENROUTESERVICE_API_KEY", None)
        self.base_url = "https://api.openrouteservice.org"

    def geocode_address(self, address: str) -> Tuple[float, float]:
        """
        Convert address to coordinates using OpenRouteService Geocoding API
        """
        if not self.api_key:
            # Fallback to basic coordinates for demo
            return (40.7128, -74.0060)  # NYC as default

        url = f"{self.base_url}/geocode/search"
        params = {"api_key": self.api_key, "text": address, "limit": 1}

        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if data["features"]:
                coords = data["features"][0]["geometry"]["coordinates"]
                return (coords[1], coords[0])  # lat, lon
            else:
                raise ValueError(f"Address not found: {address}")

        except requests.RequestException as e:
            raise Exception(f"Geocoding failed: {str(e)}")

    def calculate_route(self, start: str, pickup: str, dropoff: str) -> Dict:
        """
        Calculate route from start → pickup → dropoff
        """
        # Get coordinates for all locations
        start_coords = self.geocode_address(start)
        pickup_coords = self.geocode_address(pickup)
        dropoff_coords = self.geocode_address(dropoff)

        if not self.api_key:
            # Fallback calculation for demo
            return self._calculate_fallback_route(
                start_coords, pickup_coords, dropoff_coords
            )

        # Calculate route segments
        route1 = self._get_directions(start_coords, pickup_coords)
        route2 = self._get_directions(pickup_coords, dropoff_coords)

        return {
            "total_distance": route1["distance"] + route2["distance"],
            "total_duration": route1["duration"] + route2["duration"],
            "segments": [
                {
                    "from": start,
                    "to": pickup,
                    "distance": route1["distance"],
                    "duration": route1["duration"],
                },
                {
                    "from": pickup,
                    "to": dropoff,
                    "distance": route2["distance"],
                    "duration": route2["duration"],
                },
            ],
        }

    def _get_directions(
        self, start: Tuple[float, float], end: Tuple[float, float]
    ) -> Dict:
        """
        Get directions between two points
        """
        url = f"{self.base_url}/v2/directions/driving-car"
        params = {
            "api_key": self.api_key,
            "start": f"{start[1]},{start[0]}",  # lon, lat format
            "end": f"{end[1]},{end[0]}",
        }

        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        route = data["features"][0]
        return {
            "distance": route["properties"]["segments"][0]["distance"],  # meters
            "duration": route["properties"]["segments"][0]["duration"],  # seconds
            "geometry": route["geometry"],
        }

    def _calculate_fallback_route(self, start, pickup, dropoff):
        """
        Fallback calculation when API is not available
        """
        import math

        def haversine_distance(coord1, coord2):
            R = 6371  # Earth's radius in kilometers

            lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
            lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])

            dlat = lat2 - lat1
            dlon = lon2 - lon1

            a = (
                math.sin(dlat / 2) ** 2
                + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
            )
            c = 2 * math.asin(math.sqrt(a))

            return R * c  # distance in kilometers

        # Calculate distances
        dist1 = haversine_distance(start, pickup)
        dist2 = haversine_distance(pickup, dropoff)
        total_distance = dist1 + dist2

        # Convert to miles and estimate duration (60 mph average)
        total_distance_miles = total_distance * 0.621371
        total_duration_hours = total_distance_miles / 60

        return {
            "total_distance": total_distance_miles * 1609.34,  # convert to meters
            "total_duration": total_duration_hours * 3600,  # convert to seconds
            "segments": [
                {
                    "distance": dist1 * 1609.34,
                    "duration": (dist1 * 0.621371 / 60) * 3600,
                },
                {
                    "distance": dist2 * 1609.34,
                    "duration": (dist2 * 0.621371 / 60) * 3600,
                },
            ],
        }


class ELDLogService:
    """
    Service for generating ELD logs following Hours of Service rules
    """

    # HOS Constants
    MAX_DRIVING_HOURS = 11.0  # Maximum driving hours per day
    MAX_ON_DUTY_HOURS = 14.0  # Maximum on-duty hours per day
    MIN_BREAK_DURATION = 0.5  # 30-minute break after 8 hours of driving
    MIN_BREAK_AFTER = 8.0  # Need break after 8 hours driving
    MAX_CYCLE_HOURS = 70.0  # 70-hour/8-day cycle
    MIN_REST_PERIOD = 10.0  # Minimum 10 hours off-duty/sleeper berth

    def __init__(self, trip: Trip):
        self.trip = trip
        self.route_service = RouteCalculationService()

    def generate_log_sheets(self) -> List[LogSheet]:
        """
        Generate ELD log sheets for the entire trip
        """
        log_sheets = []
        current_date = datetime.now().date()
        remaining_cycle_hours = float(self.trip.current_cycle_hours)

        # Get route information
        route_info = self.route_service.calculate_route(
            self.trip.current_location,
            self.trip.pickup_location,
            self.trip.dropoff_location,
        )

        # Calculate trip duration in hours
        total_trip_hours = route_info["total_duration"] / 3600
        driving_hours_needed = total_trip_hours

        # Add pickup and dropoff time (1 hour each)
        pickup_time = 1.0
        dropoff_time = 1.0
        total_on_duty_hours = driving_hours_needed + pickup_time + dropoff_time

        # Plan daily activities
        current_driving_hours = 0
        current_on_duty_hours = 0
        current_day = 0

        while total_on_duty_hours > 0:
            # Create new log sheet for the day
            log_date = current_date + timedelta(days=current_day)
            log_sheet = LogSheet.objects.create(
                trip=self.trip,
                date=log_date,
                driver=self.trip.user,
                cycle_hours_used=Decimal(str(remaining_cycle_hours)),
            )

            # Plan daily activities
            daily_driving = min(self.MAX_DRIVING_HOURS, driving_hours_needed)
            daily_on_duty = min(self.MAX_ON_DUTY_HOURS, total_on_duty_hours)

            # Check if we need breaks
            if current_driving_hours >= self.MIN_BREAK_AFTER:
                # Add 30-minute break
                break_time = self.MIN_BREAK_DURATION
                daily_on_duty += break_time

            # Update log sheet hours
            log_sheet.driving_hours = Decimal(str(float(daily_driving)))
            log_sheet.on_duty_hours = Decimal(str(float(daily_on_duty)))
            log_sheet.off_duty_hours = Decimal(str(float(24 - daily_on_duty)))
            log_sheet.cycle_hours_used = Decimal(
                str(float(remaining_cycle_hours + daily_driving))
            )

            # Create log entries
            self._create_daily_log_entries(log_sheet, daily_driving, daily_on_duty)

            log_sheet.save()
            log_sheets.append(log_sheet)

            # Update remaining hours
            driving_hours_needed -= daily_driving
            total_on_duty_hours -= daily_on_duty
            remaining_cycle_hours += daily_driving

            # Check cycle limits
            if remaining_cycle_hours >= self.MAX_CYCLE_HOURS:
                # Need 34-hour restart
                restart_days = 2
                for i in range(restart_days):
                    restart_date = current_date + timedelta(days=current_day + 1 + i)
                    restart_log = LogSheet.objects.create(
                        trip=self.trip,
                        date=restart_date,
                        driver=self.trip.user,
                        cycle_hours_used=Decimal("0"),
                        off_duty_hours=Decimal("24"),
                        remarks="34-hour restart period",
                    )
                    self._create_restart_log_entries(restart_log)
                    log_sheets.append(restart_log)

                remaining_cycle_hours = 0
                current_day += restart_days

            current_day += 1

            # Check if trip is complete
            if driving_hours_needed <= 0 and total_on_duty_hours <= 0:
                break

        return log_sheets

    def _create_daily_log_entries(
        self, log_sheet: LogSheet, driving_hours: float, on_duty_hours: float
    ):
        """
        Create detailed log entries for a day
        """
        entries = []

        # Start of day - Off duty
        entries.append(
            LogEntry(
                log_sheet=log_sheet,
                start_time=datetime.strptime("00:00", "%H:%M").time(),
                end_time=datetime.strptime("06:00", "%H:%M").time(),
                duty_status="off_duty",
                location="Home",
                remarks="Off duty",
            )
        )

        # Pre-trip inspection
        entries.append(
            LogEntry(
                log_sheet=log_sheet,
                start_time=datetime.strptime("06:00", "%H:%M").time(),
                end_time=datetime.strptime("06:30", "%H:%M").time(),
                duty_status="on_duty_not_driving",
                location="Terminal",
                remarks="Pre-trip inspection",
            )
        )

        # Driving period
        driving_end_time = min(6.5 + driving_hours, 14)  # Start at 6:30, end by 14:00
        driving_start = "06:30"
        driving_end = (
            f"{int(driving_end_time):02d}:{int((driving_end_time % 1) * 60):02d}"
        )

        entries.append(
            LogEntry(
                log_sheet=log_sheet,
                start_time=datetime.strptime(driving_start, "%H:%M").time(),
                end_time=datetime.strptime(driving_end, "%H:%M").time(),
                duty_status="driving",
                location="En route",
                remarks="Driving to destination",
            )
        )

        # Break if needed
        if driving_hours >= self.MIN_BREAK_AFTER:
            break_start = driving_end
            break_end_time = driving_end_time + 0.5
            break_end = (
                f"{int(break_end_time):02d}:{int((break_end_time % 1) * 60):02d}"
            )

            entries.append(
                LogEntry(
                    log_sheet=log_sheet,
                    start_time=datetime.strptime(break_start, "%H:%M").time(),
                    end_time=datetime.strptime(break_end, "%H:%M").time(),
                    duty_status="off_duty",
                    location="Rest stop",
                    remarks="30-minute break",
                )
            )

        # End of day - Off duty
        entries.append(
            LogEntry(
                log_sheet=log_sheet,
                start_time=datetime.strptime("20:00", "%H:%M").time(),
                end_time=datetime.strptime("24:00", "%H:%M").time(),
                duty_status="off_duty",
                location="Terminal",
                remarks="End of day",
            )
        )

        LogEntry.objects.bulk_create(entries)

    def _create_restart_log_entries(self, log_sheet: LogSheet):
        """
        Create log entries for 34-hour restart period
        """
        LogEntry.objects.create(
            log_sheet=log_sheet,
            start_time=datetime.strptime("00:00", "%H:%M").time(),
            end_time=datetime.strptime("24:00", "%H:%M").time(),
            duty_status="off_duty",
            location="Home/Terminal",
            remarks="34-hour restart period",
        )


class TripPlanningService:
    """
    Main service for trip planning and route optimization
    """

    def __init__(self):
        self.route_service = RouteCalculationService()
        self.eld_service = ELDLogService

    def plan_trip(
        self,
        current_location: str,
        pickup_location: str,
        dropoff_location: str,
        current_cycle_hours: float,
        user,
    ) -> Trip:
        """
        Plan a complete trip with route and ELD logs
        """
        # Create trip
        trip = Trip.objects.create(
            user=user,
            current_location=current_location,
            pickup_location=pickup_location,
            dropoff_location=dropoff_location,
            current_cycle_hours=Decimal(str(float(current_cycle_hours))),
        )

        # Calculate route
        route_info = self.route_service.calculate_route(
            current_location, pickup_location, dropoff_location
        )

        # Update trip with route information
        trip.total_distance = Decimal(
            str(float(route_info["total_distance"]) / 1609.34)
        )  # Convert to miles
        trip.estimated_duration = Decimal(
            str(float(route_info["total_duration"]) / 3600)
        )  # Convert to hours
        trip.save()

        # Generate route stops (fuel every 1000 miles)
        self._create_fuel_stops(trip, route_info)

        # Create pickup and dropoff stops
        self._create_required_stops(trip)

        # Generate ELD logs
        eld_service = self.eld_service(trip)
        log_sheets = eld_service.generate_log_sheets()

        return trip

    def _create_fuel_stops(self, trip: Trip, route_info: Dict):
        """
        Create fuel stops every 1000 miles
        """
        total_miles = float(trip.total_distance)
        fuel_stops_needed = int(total_miles // 1000)

        for i in range(1, fuel_stops_needed + 1):
            # Simple fuel stop creation (could be enhanced with actual route coordinates)
            RouteStop.objects.create(
                trip=trip,
                location=f"Fuel Stop {i}",
                stop_type="fuel",
                duration_minutes=30,
                sequence_order=i * 2,  # Interleave with other stops
            )

    def _create_required_stops(self, trip: Trip):
        """
        Create pickup and dropoff stops
        """
        # Pickup stop
        RouteStop.objects.create(
            trip=trip,
            location=trip.pickup_location,
            stop_type="pickup",
            duration_minutes=60,
            sequence_order=1,
        )

        # Dropoff stop
        RouteStop.objects.create(
            trip=trip,
            location=trip.dropoff_location,
            stop_type="dropoff",
            duration_minutes=60,
            sequence_order=999,  # Last stop
        )
