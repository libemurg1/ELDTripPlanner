/**
 * API Configuration
 * Central place to manage API base URL and version
 */

export const API_CONFIG = {
  // Base API configuration
  BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  VERSION: import.meta.env.VITE_API_VERSION || "v1",

  // Computed full API URL
  get fullUrl(): string {
    return `${this.BASE_URL}/api/${this.VERSION}/`;
  },

  // Environment detection
  get isDevelopment(): boolean {
    return import.meta.env.DEV;
  },

  get isProduction(): boolean {
    return import.meta.env.PROD;
  },
};

// Export commonly used API paths
export const API_PATHS = {
  // Auth endpoints
  AUTH: {
    LOGIN: 'auth/login/',
    REGISTER: 'auth/register/',
    LOGOUT: 'auth/logout/',
    PROFILE: 'auth/profile/',
    PROFILE_UPDATE: 'auth/profile/update/',
    TOKEN_REFRESH: 'auth/token/refresh/',
  },

  // Trip endpoints
  TRIPS: {
    LIST: 'trips/',
    DETAIL: (id: string | number) => `trips/${id}/`,
    CREATE: 'trips/',
    UPDATE: (id: string | number) => `trips/${id}/`,
    DELETE: (id: string | number) => `trips/${id}/`,
    PLAN: 'trips/plan/',
    LOGS: (id: string | number) => `trips/${id}/logs/`,
    STOPS: (id: string | number) => `trips/${id}/stops/`,
    STATS: 'trips/stats/',
  },

  // Tracking endpoints
  TRACKING: {
    START: 'tracking/start/',
    STOP: 'tracking/stop/',
    SESSION: (tripId: number) => `tracking/session/${tripId}/`,
    LOCATION: 'tracking/location/',
    PROGRESS: (tripId: number) => `tracking/progress/${tripId}/`,
    HISTORY: (tripId: number, limit?: number) => `tracking/history/${tripId}/${limit ? `?limit=${limit}` : ''}`,
  },
} as const;

export default API_CONFIG;