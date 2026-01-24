# Frontend API Configuration

This document explains how to use the centralized API configuration system in the ELD Trip Planner frontend.

## Overview

The frontend now uses a centralized API configuration system that makes it easy to change API versions and base URLs without modifying individual service files.

## Configuration

### Environment Variables

You can configure the API using these environment variables:

```bash
# Base API URL (without /api/version/)
VITE_API_BASE_URL=http://localhost:8000

# API Version
VITE_API_VERSION=v1
```

### Default Configuration

If no environment variables are set, the defaults are:
- Base URL: `http://localhost:8000`
- Version: `v1`
- Full URL: `http://localhost:8000/api/v1/`

## API Configuration File

The main configuration is in `src/config/api.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  VERSION: import.meta.env.VITE_API_VERSION || "v1",
  get fullUrl(): string {
    return `${this.BASE_URL}/api/${this.VERSION}/`;
  },
};
```

## API Paths Constants

All API endpoints are defined as constants in `API_PATHS`:

```typescript
export const API_PATHS = {
  AUTH: {
    LOGIN: 'auth/login/',
    REGISTER: 'auth/register/',
    LOGOUT: 'auth/logout/',
    PROFILE: 'auth/profile/',
    PROFILE_UPDATE: 'auth/profile/update/',
    TOKEN_REFRESH: 'auth/token/refresh/',
  },
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
  TRACKING: {
    START: 'tracking/start/',
    STOP: 'tracking/stop/',
    SESSION: (tripId: number) => `tracking/session/${tripId}/`,
    LOCATION: 'tracking/location/',
    PROGRESS: (tripId: number) => `tracking/progress/${tripId}/`,
    HISTORY: (tripId: number, limit?: number) =>
      `tracking/history/${tripId}/${limit ? `?limit=${limit}` : ''}`,
  },
};
```

## Usage in Services

### Before (Hardcoded URLs)
```typescript
// ❌ Old way - hardcoded URLs
const response = await api.post('/api/v1/auth/login/', data);
```

### After (Using Configuration)
```typescript
// ✅ New way - using constants
import { API_PATHS } from '../config/api';

const response = await api.post(API_PATHS.AUTH.LOGIN, data);
```

## Changing API Version

To change from `v1` to `v2`, simply update the environment variable:

```bash
# In .env file
VITE_API_VERSION=v2
```

Or update the default in `api.ts`:

```typescript
VERSION: import.meta.env.VITE_API_VERSION || "v2",
```

All services will automatically use the new version without any code changes.

## Adding New Endpoints

1. Add the endpoint to `API_PATHS` in `src/config/api.ts`
2. Use the constant in your service file

Example:
```typescript
// Add to API_PATHS
TRIPS: {
  // ... existing
  EXPORT: (id: string | number) => `trips/${id}/export/`,
},

// Use in service
const response = await api.get(API_PATHS.TRIPS.EXPORT(tripId));
```

## Benefits

1. **Centralized Configuration**: All API settings in one place
2. **Easy Version Changes**: Change version without touching service files
3. **Type Safety**: Constants prevent typos in endpoint URLs
4. **Environment Flexibility**: Different configs for dev/staging/prod
5. **Maintainability**: Clear structure for adding new endpoints

## Migration Checklist

- [x] Create `src/config/api.ts` configuration file
- [x] Update `src/services/api.ts` to use configuration
- [x] Update `src/services/auth.ts` to use `API_PATHS`
- [x] Update `src/services/tripService.ts` to use `API_PATHS`
- [x] Update `src/services/trackingService.ts` to use `API_PATHS`
- [x] Test build with new configuration
- [x] Verify all services work correctly

## Environment Examples

### Development
```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_API_VERSION=v1
```

### Staging
```bash
VITE_API_BASE_URL=https://api-staging.eldplanner.com
VITE_API_VERSION=v2
```

### Production
```bash
VITE_API_BASE_URL=https://api.eldplanner.com
VITE_API_VERSION=v2
```