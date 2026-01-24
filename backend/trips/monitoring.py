from datetime import datetime

import redis
from django.conf import settings
from django.core.cache import cache
from django.db import connection
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([])
def health_check(request):
    """
    Health check endpoint for monitoring and load balancers
    """
    try:
        # Check database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    try:
        # Check Redis connection
        redis_client = redis.from_url(settings.REDIS_URL)
        redis_client.ping()
        redis_status = "healthy"
    except Exception:
        redis_status = "unhealthy"

    # Check cache
    try:
        cache.set("health_check", "ok", timeout=10)
        cache_status = "healthy" if cache.get("health_check") == "ok" else "unhealthy"
    except Exception:
        cache_status = "unhealthy"

    # Overall status
    overall_status = all(
        [db_status == "healthy", redis_status == "healthy", cache_status == "healthy"]
    )

    response_data = {
        "status": "healthy" if overall_status else "unhealthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "checks": {"database": db_status, "redis": redis_status, "cache": cache_status},
    }

    response_status = (
        status.HTTP_200_OK if overall_status else status.HTTP_503_SERVICE_UNAVAILABLE
    )

    return Response(response_data, status=response_status)


@api_view(["GET"])
@permission_classes([])
def metrics(request):
    """
    Basic metrics endpoint for monitoring
    """
    try:
        # Database metrics
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_trips,
                    COUNT(CASE WHEN status = 'planned' THEN 1 END) as planned_trips,
                    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_trips,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trips
                FROM trips_trip
            """)
            db_metrics = cursor.fetchone()

        # Redis metrics
        redis_client = redis.from_url(settings.REDIS_URL)
        redis_info = redis_client.info()

        metrics = {
            "timestamp": datetime.now().isoformat(),
            "database": {
                "total_trips": db_metrics[0] if db_metrics else 0,
                "planned_trips": db_metrics[1] if db_metrics else 0,
                "in_progress_trips": db_metrics[2] if db_metrics else 0,
                "completed_trips": db_metrics[3] if db_metrics else 0,
            },
            "redis": {
                "connected_clients": redis_info.get("connected_clients", 0),
                "used_memory": redis_info.get("used_memory", 0),
                "used_memory_human": redis_info.get("used_memory_human", "0B"),
                "maxmemory": redis_info.get("maxmemory", 0),
                "maxmemory_human": redis_info.get("maxmemory_human", "0B"),
                "keyspace_hits": redis_info.get("keyspace_hits", 0),
                "keyspace_misses": redis_info.get("keyspace_misses", 0),
            },
            "cache": {
                "default": {
                    "hits": getattr(cache._caches.get("default"), "_cache", {}).get(
                        "hits", 0
                    ),
                    "misses": getattr(cache._caches.get("default"), "_cache", {}).get(
                        "misses", 0
                    ),
                }
            },
        }

        return Response(metrics, status=status.HTTP_200_OK)

    except Exception as e:
        error_response = {
            "error": "Failed to retrieve metrics",
            "details": str(e),
            "timestamp": datetime.now().isoformat(),
        }
        return Response(error_response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([])
def cache_stats(request):
    """
    Detailed cache statistics
    """
    try:
        redis_client = redis.from_url(settings.REDIS_URL)

        # Get cache keys pattern
        cache_keys = {
            "trip_plans": redis_client.keys("eld_planner:trip_plan:*") or [],
            "geocoded_addresses": redis_client.keys("eld_planner:geocoded:*") or [],
            "user_stats": redis_client.keys("eld_planner:user_stats:*") or [],
            "api_responses": redis_client.keys("eld_planner:api_response:*") or [],
        }

        cache_stats = {}
        for cache_type, keys in cache_keys.items():
            if keys:
                total_memory = 0
                for key in keys[:10]:  # Limit to first 10 keys
                    try:
                        memory = redis_client.memory_usage(key)
                        total_memory += memory
                    except:
                        pass

                cache_stats[cache_type] = {
                    "key_count": len(keys),
                    "sample_keys": keys[:5],  # Show first 5 keys
                    "estimated_memory_bytes": total_memory,
                    "estimated_memory_mb": round(total_memory / 1024 / 1024, 2),
                }
            else:
                cache_stats[cache_type] = {
                    "key_count": 0,
                    "sample_keys": [],
                    "estimated_memory_bytes": 0,
                    "estimated_memory_mb": 0,
                }

        return Response(
            {
                "timestamp": datetime.now().isoformat(),
                "cache_statistics": cache_stats,
                "total_cache_keys": sum(
                    [data["key_count"] for data in cache_stats.values()]
                ),
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        error_response = {
            "error": "Failed to retrieve cache statistics",
            "details": str(e),
            "timestamp": datetime.now().isoformat(),
        }
        return Response(error_response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([])
def clear_cache(request):
    """
    Clear specific cache types (for admin use)
    """
    try:
        data = request.data
        cache_type = data.get("cache_type", "all")

        redis_client = redis.from_url(settings.REDIS_URL)
        cleared_keys = []

        if cache_type == "all":
            # Clear all application cache
            keys_to_clear = redis_client.keys("eld_planner:*")
        elif cache_type == "trip_plans":
            keys_to_clear = redis_client.keys("eld_planner:trip_plan:*")
        elif cache_type == "geocoded_addresses":
            keys_to_clear = redis_client.keys("eld_planner:geocoded:*")
        elif cache_type == "user_stats":
            keys_to_clear = redis_client.keys("eld_planner:user_stats:*")
        elif cache_type == "api_responses":
            keys_to_clear = redis_client.keys("eld_planner:api_response:*")
        else:
            keys_to_clear = []

        if keys_to_clear:
            cleared_keys = redis_client.delete(*keys_to_clear)

        return Response(
            {
                "message": f"Cache cleared successfully",
                "cache_type": cache_type,
                "keys_cleared": len(cleared_keys),
                "timestamp": datetime.now().isoformat(),
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        error_response = {
            "error": "Failed to clear cache",
            "details": str(e),
            "timestamp": datetime.now().isoformat(),
        }
        return Response(error_response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
