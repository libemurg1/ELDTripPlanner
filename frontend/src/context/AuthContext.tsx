import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth';

// Type definitions
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  full_name?: string;
  date_joined?: string;
  is_staff?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Action types
type AuthAction =
  | { type: 'LOGIN_START' | 'REGISTER_START' | 'LOAD_USER_START' }
  | { type: 'LOGIN_SUCCESS' | 'REGISTER_SUCCESS' | 'LOAD_USER_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE' | 'REGISTER_FAILURE' | 'LOAD_USER_FAILURE'; payload: string | null }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

// API response types
export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
    case 'REGISTER_START':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
    case 'LOAD_USER_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
        error: null,
      };

    case 'LOGIN_FAILURE':
    case 'REGISTER_FAILURE':
    case 'LOAD_USER_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload,
      };

    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

// Create context
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (userData: RegisterData) => Promise<AuthResponse>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('access_token');
      const storedUser = authService.getCurrentUser();

      if (token && storedUser) {
        try {
          // Verify token is still valid by getting profile
          const result = await authService.getProfile();
          if (result.success && result.user) {
            dispatch({
              type: 'LOAD_USER_SUCCESS',
              payload: result.user,
            });
          } else {
            // Token invalid, clear storage
            authService.logout();
            dispatch({
              type: 'LOAD_USER_FAILURE',
              payload: 'Session expired',
            });
          }
        } catch (error) {
          authService.logout();
          dispatch({
            type: 'LOAD_USER_FAILURE',
            payload: 'Session expired',
          });
        }
      } else {
        dispatch({
          type: 'LOAD_USER_FAILURE',
          payload: null,
        });
      }
    };

    loadUser();
  }, []);

  // Login
  const login = async (email: string, password: string): Promise<AuthResponse> => {
    dispatch({ type: 'LOGIN_START' });
    
    const result = await authService.login(email, password);
    
    if (result.success && result.user) {
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: result.user,
      });
      return { success: true };
    } else {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: result.error || 'Login failed',
      });
      return { success: false, error: result.error };
    }
  };

  // Register
  const register = async (userData: RegisterData): Promise<AuthResponse> => {
    dispatch({ type: 'REGISTER_START' });
    
    const result = await authService.register(userData);
    
    if (result.success && result.user) {
      dispatch({
        type: 'REGISTER_SUCCESS',
        payload: result.user,
      });
      return { success: true };
    } else {
      dispatch({
        type: 'REGISTER_FAILURE',
        payload: result.error || 'Registration failed',
      });
      return { success: false, error: result.error };
    }
  };

  // Logout
  const logout = () => {
    authService.logout();
    dispatch({ type: 'LOGOUT' });
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;