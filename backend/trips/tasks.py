import time
import hashlib
from datetime import datetime, timedelta
from celery import shared_task
from django.core.cache import cache
from django.conf import settings
from .models import Trip, LogSheet, RouteStop
from .services import TripPlanningService, ELDLogService


@shared_task(bind=True, name="trips.calculate_trip_route")
def calculate_trip_route(
    self,
    trip_id,
    current_location,
    pickup_location,
    dropoff_location,
    current_cycle_hours,
):
    """
    Background task to calculate trip route and generate ELD logs
    """
    try:
        # Update task status
        self.update_state(
            state="PROGRESS",
            meta={
                "current": 0,
                "total": 100,
                "status": "Starting route calculation...",
            },
        )

        # Initialize trip planning service
        planning_service = TripPlanningService()

        # Calculate route (this is the expensive part)
        self.update_state(
            state="PROGRESS",
            meta={"current": 25, "total": 100, "status": "Calculating route..."},
        )
        route_result = planning_service.calculate_route(
            current_location, pickup_location, dropoff_location
        )

        # Generate ELD logs
        self.update_state(
            state="PROGRESS",
            meta={"current": 50, "total": 100, "status": "Generating ELD logs..."},
        )
        eld_service = ELDLogService()
        eld_logs = eld_service.generate_eld_logs(route_result, current_cycle_hours)

        # Save trip data
        self.update_state(
            state="PROGRESS",
            meta={"current": 75, "total": 100, "status": "Saving trip data..."},
        )

        # Create or update trip
        trip, created = Trip.objects.get_or_create(
            id=trip_id,
            defaults={
                "current_location": current_location,
                "pickup_location": pickup_location,
                "dropoff_location": dropoff_location,
                "current_cycle_hours": current_cycle_hours,
                "total_distance": route_result.get("total_distance"),
                "estimated_duration": route_result.get("total_duration"),
                "status": "planned",
            },
        )

        # Save route stops
        if route_result.get("stops"):
            for i, stop_data in enumerate(route_result["stops"]):
                RouteStop.objects.update_or_create(
                    trip=trip, sequence_order=i, defaults=stop_data
                )

        # Save ELD logs
        if eld_logs:
            for log_data in eld_logs:
                LogSheet.objects.update_or_create(
                    trip=trip, date=log_data["date"], defaults=log_data
                )

        # Cache the result
        cache_key = f"trip_plan:{trip_id}"
        cache.set(
            cache_key,
            {
                "route": route_result,
                "eld_logs": eld_logs,
                "stops": route_result.get("stops", []),
            },
            timeout=86400,
        )  # 24 hours

        return {
            "status": "success",
            "trip_id": trip_id,
            "route": route_result,
            "eld_logs": eld_logs,
            "message": "Trip planned successfully",
        }

    except Exception as exc:
        self.update_state(state="FAILURE", meta={"error": str(exc)})
        raise


@shared_task(name="trips.geocode_batch_addresses")
def geocode_batch_addresses(addresses):
    """
    Batch geocode multiple addresses to improve performance
    """
    geocoded_results = {}
    planning_service = TripPlanningService()

    for i, address in enumerate(addresses):
        try:
            coords = planning_service.geocode_address(address)
            address_hash = hashlib.md5(address.encode()).hexdigest()

            # Cache individual geocoded address
            cache_key = f"geocoded:{address_hash}"
            cache.set(cache_key, coords, timeout=604800)  # 7 days

            geocoded_results[address] = coords

        except Exception as e:
            geocoded_results[address] = None

    return geocoded_results


@shared_task(name="trips.generate_trip_report")
def generate_trip_report(trip_id, report_type="pdf"):
    """
    Generate trip reports in background (PDF, CSV, etc.)
    """
    try:
        trip = Trip.objects.get(id=trip_id)

        # This would integrate with a report generation library
        # For now, just prepare the data
        report_data = {
            "trip_id": trip_id,
            "trip_details": {
                "current_location": trip.current_location,
                "pickup_location": trip.pickup_location,
                "dropoff_location": trip.dropoff_location,
                "total_distance": float(trip.total_distance)
                if trip.total_distance
                else 0,
                "estimated_duration": float(trip.estimated_duration)
                if trip.estimated_duration
                else 0,
                "status": trip.status,
            },
            "stops": [
                {
                    "location": stop.location,
                    "stop_type": stop.stop_type,
                    "estimated_arrival": stop.estimated_arrival,
                }
                for stop in trip.route_stops.all().order_by("sequence_order")
            ],
            "eld_logs": [
                {
                    "date": log.date,
                    "driving_hours": float(log.driving_hours),
                    "on_duty_hours": float(log.on_duty_hours),
                }
                for log in trip.log_sheets.all()
            ],
        }

        # Cache the report
        cache_key = f"trip_report:{trip_id}:{report_type}"
        cache.set(cache_key, report_data, timeout=3600)  # 1 hour

        return {
            "status": "success",
            "report_data": report_data,
            "message": f"{report_type.upper()} report generated successfully",
        }

    except Trip.DoesNotExist:
        return {"status": "error", "message": "Trip not found"}
    except Exception as e:
        return {"status": "error", "message": f"Report generation failed: {str(e)}"}


@shared_task(name="trips.cleanup_old_trips")
def cleanup_old_trips(days_old=30):
    """
    Clean up old cancelled or completed trips to manage database size
    """
    cutoff_date = datetime.now() - timedelta(days=days_old)

    # Delete old cancelled trips
    cancelled_count = Trip.objects.filter(
        status="cancelled", created_at__lt=cutoff_date
    ).delete()[0]

    # Archive old completed trips (soft delete by changing status)
    archived_count = Trip.objects.filter(
        status="completed", created_at__lt=cutoff_date
    ).update(status="archived")

    return {
        "cancelled_deleted": cancelled_count,
        "completed_archived": archived_count,
        "cutoff_date": cutoff_date.isoformat(),
    }


@shared_task(name="trips.warm_popular_cache")
def warm_popular_cache():
    """
    Warm cache with frequently accessed data
    """
    try:
        # Cache popular route calculations
        popular_routes = [
            ("Chicago, IL", "Indianapolis, IN", "Atlanta, GA"),
            ("New York, NY", "Philadelphia, PA", "Washington, DC"),
            ("Los Angeles, CA", "Phoenix, AZ", "Denver, CO"),
        ]

        planning_service = TripPlanningService()

        for route in popular_routes:
            cache_key = (
                f"popular_route:{hashlib.md5('|'.join(route).encode()).hexdigest()}"
            )
            if not cache.get(cache_key):
                route_result = planning_service.calculate_route(*route)
                cache.set(cache_key, route_result, timeout=86400)  # 24 hours

        # Cache user statistics for active users
        from django.contrib.auth.models import User

        active_users = User.objects.filter(is_active=True)[
            :50
        ]  # Limit to prevent memory issues
        for user in active_users:
            user_stats_key = f"user_stats:{user.id}"
            if not cache.get(user_stats_key):
                trip_count = user.trips.filter(
                    status__in=["planned", "in_progress"]
                ).count()

                total_distance = (
                    user.trips.aggregate(total_distance=models.Sum("total_distance"))[
                        "total_distance"
                    ]
                    or 0
                )

                stats = {
                    "trip_count": trip_count,
                    "total_distance": float(total_distance) if total_distance else 0,
                    "cached_at": datetime.now().isoformat(),
                }
                cache.set(user_stats_key, stats, timeout=3600)  # 1 hour

        return {
            "status": "success",
            "warmed_routes": len(popular_routes),
            "warmed_users": active_users.count(),
            "message": "Popular cache warmed successfully",
        }

    except Exception as e:
        return {"status": "error", "message": f"Cache warming failed: {str(e)}"}


@shared_task(name="trips.send_trip_notification")
def send_trip_notification(user_id, trip_id, notification_type="created"):
    """
    Send notifications about trip status changes
    """
    try:
        from django.contrib.auth.models import User

        user = User.objects.get(id=user_id)
        trip = Trip.objects.get(id=trip_id)

        notification_data = {
            "user_email": user.email,
            "user_name": user.get_full_name() or user.username,
            "trip_details": {
                "id": trip_id,
                "current_location": trip.current_location,
                "pickup_location": trip.pickup_location,
                "dropoff_location": trip.dropoff_location,
                "status": trip.status,
            },
            "notification_type": notification_type,
            "timestamp": datetime.now().isoformat(),
        }

        # This would integrate with an email service like SendGrid
        # For now, just log the notification
        print(f"Notification would be sent: {notification_data}")

        return {
            "status": "success",
            "notification_data": notification_data,
            "message": "Notification processed successfully",
        }

    except (User.DoesNotExist, Trip.DoesNotExist) as e:
        return {"status": "error", "message": f"Notification failed: {str(e)}"}
    except Exception as e:
        return {
            "status": "error",
            "message": f"Notification processing failed: {str(e)}",
        }
