import api from './api';

export const tripService = {
  // Get all trips for current user
  async getTrips() {
    try {
      const response = await api.get('/');
      return { success: true, trips: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch trips';
      return { success: false, error: errorMessage };
    }
  },

  // Get trip by ID
  async getTripById(tripId) {
    try {
      const response = await api.get(`/${tripId}/`);
      return { success: true, trip: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch trip';
      return { success: false, error: errorMessage };
    }
  },

  // Create new trip
  async createTrip(tripData) {
    try {
      const response = await api.post('/', tripData);
      return { success: true, trip: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to create trip';
      return { success: false, error: errorMessage };
    }
  },

  // Update trip
  async updateTrip(tripId, tripData) {
    try {
      const response = await api.put(`/${tripId}/`, tripData);
      return { success: true, trip: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update trip';
      return { success: false, error: errorMessage };
    }
  },

  // Delete trip
  async deleteTrip(tripId) {
    try {
      await api.delete(`/${tripId}/`);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete trip';
      return { success: false, error: errorMessage };
    }
  },

  // Plan complete trip with ELD logs
  async planTrip(tripPlanningData) {
    try {
      const response = await api.post('/plan/', tripPlanningData);
      return { success: true, trip: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to plan trip';
      return { success: false, error: errorMessage };
    }
  },

  // Get trip logs
  async getTripLogs(tripId) {
    try {
      const response = await api.get(`/${tripId}/logs/`);
      return { success: true, logs: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch trip logs';
      return { success: false, error: errorMessage };
    }
  },

  // Get trip stops
  async getTripStops(tripId) {
    try {
      const response = await api.get(`/${tripId}/stops/`);
      return { success: true, stops: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch trip stops';
      return { success: false, error: errorMessage };
    }
  },

  // Get trip statistics
  async getTripStats() {
    try {
      const response = await api.get('/stats/');
      return { success: true, stats: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch trip statistics';
      return { success: false, error: errorMessage };
    }
  },

  // Validate trip planning data
  validateTripData(data) {
    const errors = [];

    if (!data.current_location?.trim()) {
      errors.push('Current location is required');
    }

    if (!data.pickup_location?.trim()) {
      errors.push('Pickup location is required');
    }

    if (!data.dropoff_location?.trim()) {
      errors.push('Dropoff location is required');
    }

    if (data.current_cycle_hours === undefined || data.current_cycle_hours === null) {
      errors.push('Current cycle hours is required');
    } else if (data.current_cycle_hours < 0 || data.current_cycle_hours > 70) {
      errors.push('Current cycle hours must be between 0 and 70');
    }

    if (data.current_location?.trim() === data.pickup_location?.trim()) {
      errors.push('Current location and pickup location must be different');
    }

    if (data.pickup_location?.trim() === data.dropoff_location?.trim()) {
      errors.push('Pickup location and dropoff location must be different');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};