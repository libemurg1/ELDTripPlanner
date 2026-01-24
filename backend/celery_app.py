import os

from celery import Celery
from django.conf import settings

# Set default Django settings module for celery
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "eld_planner.settings")

app = Celery("eld_planner")
app.config_from_object("django.conf:settings", namespace="CELERY")

# Discover tasks in all Django apps
app.autodiscover_tasks()

# Configure Celery to use Redis
app.conf.update(
    broker_url=settings.CELERY_BROKER_URL,
    result_backend=settings.CELERY_RESULT_BACKEND,
    accept_content=["json"],
    result_serializer="json",
    task_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_send_task_events=True,
    task_send_sent_event=True,
    task_reject_on_worker_lost=True,
    task_ignore_result=False,
    result_expires=3600,  # 1 hour
    result_compression="gzip",
    worker_compression="gzip",
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_disable_rate_limits=False,
    task_default_queue="default",
    task_queues={
        "default": {
            "exchange": "default",
            "routing_key": "default",
        },
        "high_priority": {
            "exchange": "high_priority",
            "routing_key": "high_priority",
        },
    },
)

# Configure Celery Beat for scheduled tasks
app.conf.beat_schedule = {
    "cleanup-old-trips": {
        "task": "trips.tasks.cleanup_old_trips",
        "schedule": 86400.0,  # Run daily (24 hours)
        "options": {"queue": "high_priority"},
    },
    "warm-cache": {
        "task": "trips.tasks.warm_popular_cache",
        "schedule": 3600.0,  # Run hourly
        "options": {"queue": "default"},
    },
}
