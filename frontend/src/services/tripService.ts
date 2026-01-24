import api from './api';
import { API_PATHS } from '../config/api';
import {
  TripPlanRequest,
  TripPlanResponse,
  ApiResponse
} from '@/types';

export const tripService = {
  // Get all trips for current user
  async getTrips(): Promise<ApiResponse<any[]>> {
    try {
      const response = await api.get(API_PATHS.TRIPS.LIST);
      return { success: true, trips: response.data };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch trips';
      return { success: false, error: errorMessage };
    }
  },

  // Get trip by ID
  async getTripById(tripId: string): Promise<ApiResponse<any>> {
    try {
      const response = await api.get(API_PATHS.TRIPS.DETAIL(tripId));
      return { success: true, trip: response.data };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch trip';
      return { success: false, error: errorMessage };
    }
  },

  // Create new trip
  async createTrip(tripData: TripPlanRequest): Promise<ApiResponse<any>> {
    try {
      const response = await api.post(API_PATHS.TRIPS.CREATE, tripData);
      return { success: true, trip: response.data };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create trip';
      return { success: false, error: errorMessage };
    }
  },

  // Update trip
  async updateTrip(tripId: string, tripData: Partial<TripPlanRequest>): Promise<ApiResponse<any>> {
    try {
      const response = await api.put(API_PATHS.TRIPS.UPDATE(tripId), tripData);
      return { success: true, trip: response.data };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update trip';
      return { success: false, error: errorMessage };
    }
  },

  // Delete trip
  async deleteTrip(tripId: string): Promise<ApiResponse<any>> {
    try {
      await api.delete(API_PATHS.TRIPS.DELETE(tripId));
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete trip';
      return { success: false, error: errorMessage };
    }
  },

  // Plan complete trip with ELD logs
  async planTrip(tripPlanningData: TripPlanRequest): Promise<ApiResponse<any>> {
    try {
      const response = await api.post(API_PATHS.TRIPS.PLAN, tripPlanningData);
      return { success: true, trip: response.data };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to plan trip';
      return { success: false, error: errorMessage };
    }
  },

  // Get trip logs
  async getTripLogs(tripId: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await api.get(API_PATHS.TRIPS.LOGS(tripId));
      return { success: true, logs: response.data };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch trip logs';
      return { success: false, error: errorMessage };
    }
  },

  // Get trip stops
  async getTripStops(tripId: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await api.get(API_PATHS.TRIPS.STOPS(tripId));
      return { success: true, stops: response.data };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch trip stops';
      return { success: false, error: errorMessage };
    }
  },

  // Get trip statistics
  async getTripStats(): Promise<ApiResponse<any>> {
    try {
      const response = await api.get(API_PATHS.TRIPS.STATS);
      return { success: true, stats: response.data };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch trip statistics';
      return { success: false, error: errorMessage };
    }
  },

  // Validate trip planning data
  validateTripData(data: TripPlanRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const requiredFields = ['current_location', 'pickup_location', 'dropoff_location', 'current_cycle_hours'];
    
    requiredFields.forEach(field => {
      if (!data[field]?.trim()) {
        errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
      }
    });

    if (data.current_cycle_hours !== undefined) {
      if (data.current_cycle_hours < 0) {
        errors.push('Current cycle hours must be positive');
      } else if (data.current_cycle_hours > 70) {
        errors.push('Current cycle hours cannot exceed 70');
      }
    }

    if (data.current_location?.trim() === data.pickup_location?.trim()) {
      errors.push('Current location and pickup location must be different');
    }

    if (data.current_location?.trim() === data.dropoff_location?.trim()) {
      errors.push('Current location and dropoff location must be different');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};