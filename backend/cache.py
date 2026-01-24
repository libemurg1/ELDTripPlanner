from django.conf import settings
from django.core.cache import cache
from django.core.cache.backends.redis import RedisCache


class TripPlanCache:
    """
    Custom cache manager for trip planning data
    """

    def __init__(self):
        self.cache_timeout = getattr(
            settings, "TRIP_PLAN_CACHE_TIMEOUT", 86400
        )  # 24 hours

    def get_trip_plan(self, trip_id):
        """Get cached trip plan"""
        cache_key = f"trip_plan:{trip_id}"
        return cache.get(cache_key)

    def set_trip_plan(self, trip_id, trip_data):
        """Cache trip plan data"""
        cache_key = f"trip_plan:{trip_id}"
        return cache.set(cache_key, trip_data, self.cache_timeout)

    def invalidate_trip_plan(self, trip_id):
        """Invalidate specific trip plan cache"""
        cache_key = f"trip_plan:{trip_id}"
        cache.delete(cache_key)

    def get_geocoded_address(self, address_hash):
        """Get cached geocoded address"""
        cache_key = f"geocoded:{address_hash}"
        return cache.get(cache_key)

    def set_geocoded_address(self, address_hash, coordinates):
        """Cache geocoded coordinates"""
        cache_key = f"geocoded:{address_hash}"
        # Cache geocoded addresses for 7 days
        return cache.set(cache_key, coordinates, 604800)

    def get_route_calculation(self, route_hash):
        """Get cached route calculation"""
        cache_key = f"route_calc:{route_hash}"
        return cache.get(cache_key)

    def set_route_calculation(self, route_hash, route_data):
        """Cache route calculation results"""
        cache_key = f"route_calc:{route_hash}"
        return cache.set(cache_key, route_data, 86400)  # 24 hours

    def get_user_stats(self, user_id):
        """Get cached user statistics"""
        cache_key = f"user_stats:{user_id}"
        return cache.get(cache_key)

    def set_user_stats(self, user_id, stats_data):
        """Cache user statistics"""
        cache_key = f"user_stats:{user_id}"
        return cache.set(cache_key, stats_data, 3600)  # 1 hour

    def invalidate_user_cache(self, user_id):
        """Invalidate all user-related cache"""
        patterns = [
            f"user_stats:{user_id}",
            f"trip_plan:{user_id}:*",
            f"report:{user_id}:*",
        ]
        for pattern in patterns:
            cache.delete(pattern)

    def get_popular_routes(self):
        """Get cached popular routes"""
        return cache.get("popular_routes")

    def set_popular_routes(self, routes_data):
        """Cache popular routes data"""
        return cache.set("popular_routes", routes_data, 86400)  # 24 hours

    def get_api_response(self, endpoint, params_hash):
        """Get cached API response"""
        cache_key = f"api_response:{endpoint}:{params_hash}"
        return cache.get(cache_key)

    def set_api_response(self, endpoint, params_hash, response_data, timeout=300):
        """Cache API response"""
        cache_key = f"api_response:{endpoint}:{params_hash}"
        return cache.set(cache_key, response_data, timeout)


# Global cache manager instance
trip_cache = TripPlanCache()


class CacheMiddleware:
    """
    Django middleware to cache API responses
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.cache_timeout = getattr(settings, "API_CACHE_TIMEOUT", 300)  # 5 minutes

    def __call__(self, request):
        # Only cache GET requests to API endpoints
        if (
            request.method == "GET"
            and request.path.startswith("/api/v1/")
            and not request.user.is_authenticated
        ):
            # Generate cache key based on URL and query parameters
            cache_key = f"api_cache:{request.get_full_path()}"
            cached_response = cache.get(cache_key)

            if cached_response:
                return cached_response

        response = self.get_response(request)

        # Cache successful GET API responses
        if (
            request.method == "GET"
            and request.path.startswith("/api/v1/")
            and response.status_code == 200
            and not getattr(response, "streaming", False)
        ):
            cache_key = f"api_cache:{request.get_full_path()}"
            cache.set(cache_key, response, self.cache_timeout)

        return response


def invalidate_trip_cache(trip_id):
    """Convenience function to invalidate trip-related caches"""
    trip_cache.invalidate_trip_plan(trip_id)

    # Invalidate user stats if we can determine the user
    try:
        from trips.models import Trip

        trip = Trip.objects.get(id=trip_id)
        trip_cache.invalidate_user_cache(trip.user.id)
    except:
        pass


def warm_cache_on_startup():
    """
    Warm cache with frequently accessed data
    Called when application starts
    """
    from django.contrib.auth.models import User

    from trips.models import Trip
    from trips.tasks import warm_popular_cache

    # Warm popular routes cache
    warm_popular_cache.delay()

    # Warm cache for recent trips
    recent_trips = Trip.objects.filter(
        status__in=["planned", "in_progress"]
    ).select_related("user")[:20]

    for trip in recent_trips:
        # This will trigger caching logic
        from trips.tasks import calculate_trip_route

        calculate_trip_route.delay(
            trip.id,
            trip.current_location,
            trip.pickup_location,
            trip.dropoff_location,
            float(trip.current_cycle_hours),
        )
