from django.conf import settings
from django.core.management.base import BaseCommand

from trips.cache import warm_cache_on_startup


class Command(BaseCommand):
    help = "Warm cache with frequently accessed data"

    def handle(self, *args, **options):
        self.stdout.write("Starting cache warming...")

        try:
            result = warm_cache_on_startup()

            if result["status"] == "success":
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✅ Cache warming completed:\n"
                        f"   - Warmed {result['warmed_routes']} popular routes\n"
                        f"   - Warmed cache for {result['warmed_users']} active users\n"
                    )
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f"❌ Cache warming failed: {result['message']}")
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Cache warming failed with exception: {str(e)}")
            )
