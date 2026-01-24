import api from "./api";
import { API_PATHS } from "../config/api";
import type { ApiResponse, RouteStop } from "../types";

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export interface TrackingSession {
  id: string;
  trip_id: number;
  driver_id: number;
  is_active: boolean;
  created_at: string;
  last_update: string;
}

export interface RouteProgress {
  completed_stops: number;
  total_stops: number;
  distance_completed: number;
  total_distance: number;
  estimated_arrival: string;
  current_location: LocationUpdate;
}

export const trackingService = {
  // Start tracking session for a trip
  async startTracking(tripId: number): Promise<ApiResponse<TrackingSession>> {
    try {
      const response = await api.post(API_PATHS.TRACKING.START, {
        trip_id: tripId,
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "Failed to start tracking";
      return { success: false, error: errorMessage };
    }
  },

  // Stop tracking session
  async stopTracking(sessionId: string): Promise<ApiResponse> {
    try {
      const response = await api.post(API_PATHS.TRACKING.STOP, {
        session_id: sessionId,
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "Failed to stop tracking";
      return { success: false, error: errorMessage };
    }
  },

  // Get current tracking session
  async getCurrentTracking(
    tripId: number,
  ): Promise<ApiResponse<TrackingSession>> {
    try {
      const response = await api.get(API_PATHS.TRACKING.SESSION(tripId));
      return { success: true, data: response.data };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "Failed to get tracking session";
      return { success: false, error: errorMessage };
    }
  },

  // Update current location
  async updateLocation(location: LocationUpdate): Promise<ApiResponse> {
    try {
      const response = await api.post(API_PATHS.TRACKING.LOCATION, location);
      return { success: true, data: response.data };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "Failed to update location";
      return { success: false, error: errorMessage };
    }
  },

  // Get route progress
  async getRouteProgress(tripId: number): Promise<ApiResponse<RouteProgress>> {
    try {
      const response = await api.get(API_PATHS.TRACKING.PROGRESS(tripId));
      return { success: true, data: response.data };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "Failed to get route progress";
      return { success: false, error: errorMessage };
    }
  },

  // Get location history
  async getLocationHistory(
    tripId: number,
    limit: number = 100,
  ): Promise<ApiResponse<LocationUpdate[]>> {
    try {
      const response = await api.get(
        API_PATHS.TRACKING.HISTORY(tripId, limit),
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "Failed to get location history";
      return { success: false, error: errorMessage };
    }
  },

  // Simulate real-time location updates (for development only)
  simulateLocationUpdates(
    tripId: number,
    stops: RouteStop[],
    callback: (location: LocationUpdate) => void,
  ): () => void {
    console.warn(
      "Using development location simulation. In production, use real tracking data.",
    );

    if (!stops || stops.length === 0) {
      return () => {};
    }

    let currentIndex = 0;
    let progressToNextStop = 0;

    const interval = setInterval(() => {
      if (currentIndex >= stops.length - 1) {
        currentIndex = 0; // Loop back to start
      }

      const currentStop = stops[currentIndex];
      const nextStop = stops[currentIndex + 1];

      if (
        currentStop.latitude &&
        currentStop.longitude &&
        nextStop?.latitude &&
        nextStop?.longitude
      ) {
        // Interpolate between stops for realistic movement
        progressToNextStop += 0.1; // Move 10% towards next stop each update

        if (progressToNextStop >= 1) {
          progressToNextStop = 0;
          currentIndex++;
        }

        const lat =
          currentStop.latitude +
          (nextStop.latitude - currentStop.latitude) * progressToNextStop;
        const lng =
          currentStop.longitude +
          (nextStop.longitude - currentStop.longitude) * progressToNextStop;

        // Calculate heading based on direction of travel
        const heading =
          Math.atan2(
            nextStop.longitude - currentStop.longitude,
            nextStop.latitude - currentStop.latitude,
          ) *
          (180 / Math.PI);

        const location: LocationUpdate = {
          latitude: lat,
          longitude: lng,
          timestamp: new Date().toISOString(),
          speed: 55 + Math.random() * 10, // 55-65 mph realistic truck speed
          heading: heading < 0 ? heading + 360 : heading, // Normalize to 0-360
        };

        callback(location);
      }
    }, 5000); // Update every 5 seconds for more realistic tracking

    return () => clearInterval(interval);
  },

  // Calculate distance between two points (Haversine formula)
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // Calculate estimated arrival time
  calculateETA(
    currentLocation: LocationUpdate,
    destination: RouteStop,
    averageSpeed: number = 60,
  ): string {
    if (!currentLocation || !destination.latitude || !destination.longitude) {
      return new Date(Date.now() + 3600000).toISOString(); // Default to 1 hour from now
    }

    const distance = this.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      destination.latitude,
      destination.longitude,
    );

    const timeInHours = distance / averageSpeed;
    const eta = new Date(Date.now() + timeInHours * 3600000);

    return eta.toISOString();
  },

  // Get traffic information (real implementation)
  async getTrafficInfo(lat: number, lng: number): Promise<ApiResponse> {
    try {
      const apiKey = import.meta.env.VITE_ORS_API_KEY || "demo";

      // Try to get traffic from OpenRouteService
      const response = await fetch(
        `https://api.openrouteservice.org/traffic/${lng},${lat}?api_key=${apiKey}`,
      );

      if (response.ok) {
        const data = await response.json();
        return { success: true, data: data };
      } else {
        // Fallback to basic traffic estimation
        return {
          success: true,
          data: {
            level: "moderate",
            incidents: 0,
            average_speed: 55,
            delay: 0,
            fallback: true,
          },
        };
      }
    } catch (error: any) {
      console.warn("Traffic API unavailable, using fallback");
      // Return estimated traffic data
      return {
        success: true,
        data: {
          level: "moderate",
          incidents: 0,
          average_speed: 55,
          delay: 0,
          fallback: true,
        },
      };
    }
  },

  // Get weather information (real implementation)
  async getWeatherInfo(lat: number, lng: number): Promise<ApiResponse> {
    try {
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

      if (!apiKey) {
        throw new Error("OpenWeather API key not configured");
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=imperial`,
      );

      if (response.ok) {
        const weatherData = await response.json();

        const processedWeather = {
          condition: weatherData.weather[0].main.toLowerCase(),
          description: weatherData.weather[0].description,
          temperature: weatherData.main.temp,
          humidity: weatherData.main.humidity,
          wind_speed: weatherData.wind?.speed || 0,
          visibility: weatherData.visibility
            ? weatherData.visibility / 1609.34
            : 10, // Convert meters to miles
          icon: weatherData.weather[0].icon,
        };

        return { success: true, data: processedWeather };
      } else {
        throw new Error(`Weather API error: ${response.status}`);
      }
    } catch (error: any) {
      console.warn("Weather API unavailable, using fallback");
      // Return estimated weather data
      return {
        success: true,
        data: {
          condition: "clear",
          description: "Clear skies",
          temperature: 70,
          humidity: 50,
          wind_speed: 10,
          visibility: 10,
          fallback: true,
        },
      };
    }
  },

  // Geocode address to coordinates (real implementation)
  async geocodeAddress(
    address: string,
  ): Promise<ApiResponse<{ latitude: number; longitude: number }>> {
    try {
      const apiKey = import.meta.env.VITE_ORS_API_KEY || "demo";

      const response = await fetch(
        `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(
          address,
        )}&size=1`,
      );

      if (response.ok) {
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const coordinates = data.features[0].geometry.coordinates;

          return {
            success: true,
            data: {
              latitude: coordinates[1],
              longitude: coordinates[0],
            },
          };
        } else {
          throw new Error("No results found for this address");
        }
      } else {
        throw new Error(`Geocoding API error: ${response.status}`);
      }
    } catch (error: any) {
      console.error("Geocoding error:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to geocode address";
      return { success: false, error: errorMessage };
    }
  },

  // Reverse geocode coordinates to address (real implementation)
  async reverseGeocode(
    lat: number,
    lng: number,
  ): Promise<ApiResponse<{ address: string }>> {
    try {
      const apiKey = import.meta.env.VITE_ORS_API_KEY || "demo";

      const response = await fetch(
        `https://api.openrouteservice.org/geocode/reverse?api_key=${apiKey}&point.lon=${lng}&point.lat=${lat}&size=1`,
      );

      if (response.ok) {
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const address =
            data.features[0].properties.label ||
            data.features[0].properties.name ||
            "Unknown Location";

          return { success: true, data: { address } };
        } else {
          return {
            success: true,
            data: { address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` },
          };
        }
      } else {
        throw new Error(`Reverse geocoding API error: ${response.status}`);
      }
    } catch (error: any) {
      console.error("Reverse geocoding error:", error);
      return {
        success: true,
        data: {
          address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        },
      };
    }
  },
};
