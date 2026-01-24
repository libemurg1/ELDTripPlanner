"""
Test database setup script to fix integration testing issues
"""

import os
import sys
import django
from django.core.management import execute_from_command_line
from django.test.utils import get_runner


def setup_test_database():
    """Set up test database properly"""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "eld_planner.settings_test")
    django.setup()

    print("Setting up test database...")
    # Run migrate to create tables
    try:
        execute_from_command_line(["migrate"])
        print("✅ Test database setup successful")
        return True
    except Exception as e:
        print(f"❌ Test database setup failed: {e}")
        return False


if __name__ == "__main__":
    success = setup_test_database()
    sys.exit(0 if success else 1)
