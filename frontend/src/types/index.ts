// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Authentication Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface User {
  id: string | number;
  firstName?: string;
  lastName?: string;
  email: string;
  username?: string;
  isActive?: boolean;
  dateJoined?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse extends ApiResponse<User> {
  access?: string;
  refresh?: string;
  user?: User;
}

// Trip Types
export interface Trip {
  id: string;
  user: string;
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_hours: number;
  total_distance?: number;
  estimated_duration?: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  route_stops?: RouteStop[];
  log_sheets?: LogSheet[];
}

export interface TripFormData {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_hours: number;
}

export interface TripPlanRequest extends TripFormData {
  // Optional advanced fields
  vehicle_type?: 'straight_truck' | 'tractor_trailer';
  time_windows?: {
    pickup_start?: string;
    pickup_end?: string;
    dropoff_start?: string;
    dropoff_end?: string;
  };
  hazardous_materials?: boolean;
  preferred_fuel_stops?: string[];
}

export interface TripPlanResponse {
  trip: Trip;
  route_stops: RouteStop[];
  log_sheets: LogSheet[];
  route_geometry?: {
    coordinates: [number, number][];
    type: 'LineString';
  };
}

// RouteStop Types
export interface RouteStop {
  id: string;
  trip: string;
  location: string;
  latitude?: number;
  longitude?: number;
  stop_type: 'fuel' | 'rest' | 'pickup' | 'dropoff' | 'current';
  estimated_arrival?: string;
  estimated_departure?: string;
  duration_minutes?: number;
  sequence_order: number;
  created_at: string;
  updated_at: string;
}

// LogSheet Types
export interface LogSheet {
  id: string;
  trip: string;
  date: string;
  driver: string;
  driver_name?: string;
  carrier_name?: string;
  driving_hours: number;
  on_duty_hours: number;
  off_duty_hours: number;
  sleeper_berth_hours: number;
  cycle_hours_used: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
  log_entries?: LogEntry[];
}

// LogEntry Types
export interface LogEntry {
  id: string;
  log_sheet: string;
  start_time: string;
  end_time: string;
  duty_status: 'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty_not_driving';
  location?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  is_driver?: boolean;
  carrier_info?: {
    carrier_name?: string;
    dot_number?: string;
    mc_number?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  date_joined: string;
  is_staff: boolean;
}

// Auth Types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  password_confirm: string;
  is_driver?: boolean;
  carrier_info?: {
    carrier_name?: string;
    dot_number?: string;
    mc_number?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

// Location Types
export interface Location {
  address: string;
  coordinates?: [number, number];
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface GeocodedLocation extends Location {
  coordinates: [number, number];
  confidence?: number;
}

export interface LocationSuggestion {
  name: string;
  full_address: string;
  coordinates: [number, number];
}

// API Service Types
export interface ApiService {
  // Trip Planning
  planTrip: (tripData: TripPlanRequest) => Promise<TripPlanResponse>;
  getTrips: () => Promise<PaginatedResponse<Trip>>;
  getTrip: (id: string) => Promise<Trip>;
  updateTrip: (id: string, data: Partial<Trip>) => Promise<Trip>;
  deleteTrip: (id: string) => Promise<void>;
  
  // Route Management
  getRouteStops: (tripId: string) => Promise<RouteStop[]>;
  getLogSheets: (tripId: string) => Promise<LogSheet[]>;
  
  // Authentication
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (userData: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
  getCurrentUser: () => Promise<User>;
  
  // Location Services
  geocodeAddress: (address: string) => Promise<GeocodedLocation>;
  reverseGeocode: (coordinates: [number, number]) => Promise<Location>;
}

// Component Props Types
export interface TripFormProps {
  onSubmit?: (tripData: TripPlanRequest) => void;
  initialData?: Partial<TripPlanRequest>;
  loading?: boolean;
}

export interface TripDetailsProps {
  tripId: string;
  onClose?: () => void;
}

export interface ELDLogSheetProps {
  logSheetId: string;
  downloadable?: boolean;
  showCertification?: boolean;
}

// Map Types
export interface RouteMapProps {
  tripId?: string;
  routeStops?: RouteStop[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  interactive?: boolean;
}

// UI Types
export interface Theme {
  mode: 'light' | 'dark';
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    border: string;
  };
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
}

// Utility Types
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapViewport {
  center: Coordinates;
  zoom: number;
  bounds?: Bounds;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'tel';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string | number }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: any) => string | null;
  };
}

// Error Types
export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';