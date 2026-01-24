#!/usr/bin/env python
"""
Debug script to test URL routing issues
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "eld_planner.settings_test")
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from rest_framework import status
from django.urls import reverse


def test_url_routing():
    print("=== URL Routing Debug ===")

    # Create client and user
    client = Client()
    user = get_user_model().objects.create_user(
        username="testuser", email="test@example.com", password="testpass123"
    )
    client.force_authenticate(user=user)

    print(f"User created: {user.username}")

    # Test different URL patterns
    test_urls = [
        "/api/v1/trips/",
        "/api/v1/",
        "/api/v1/auth/",
    ]

    for url in test_urls:
        print(f"\n--- Testing {url} ---")
        response = client.get(url)
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.get('Content-Type', 'N/A')}")

        if response.status_code == 200:
            try:
                data = response.json()
                print(
                    f"JSON Response keys: {list(data.keys()) if isinstance(data, dict) else 'Not JSON'}"
                )
                if "results" in data:
                    print(f"Results count: {len(data['results'])}")
            except:
                print("Response is not valid JSON")
        else:
            print(
                f"Content (first 200 chars): {response.content.decode()[:200] if response.content else 'No content'}"
            )

    # Test reverse lookup
    print(f"\n--- Testing reverse lookup ---")
    try:
        trips_url = reverse("trips:trip-list-create")
        print(f"Reverse 'trips:trip-list-create': {trips_url}")
    except Exception as e:
        print(f"Reverse failed: {e}")

    # Check what URL patterns are registered
    from django.urls import get_resolver

    resolver = get_resolver()
    print(f"\n--- URL Resolver Info ---")
    print(f"URL patterns found: {len(resolver.url_patterns)}")

    # Try to match manually
    try:
        match = resolver.resolve("/api/trips/")
        print(f"Manual resolve result: {match}")
    except Exception as e:
        print(f"Manual resolve failed: {e}")


if __name__ == "__main__":
    test_url_routing()
