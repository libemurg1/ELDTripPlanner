import api from './api';
import { API_PATHS } from '../config/api';
import {
  ApiResponse,
  AuthTokens,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User
} from '@/types';

export const authService = {
  // Login user
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>(API_PATHS.AUTH.LOGIN, { username: email, password });
      const { access, refresh, user } = response.data;
      
      // Store tokens in localStorage
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(user));
      
      return { success: true, user, access, refresh };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      return { success: false, error: errorMessage };
    }
  },

  // Register user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>(API_PATHS.AUTH.REGISTER, userData);
      const { access, refresh, user } = response.data;
      
      // Store tokens in localStorage
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(user));
      
      return { success: true, user };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      return { success: false, error: errorMessage };
    }
  },

  // Logout user
  logout(): void {
    // Remove tokens from localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  // Get current user
  getCurrentUser(): User | null {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    return !!token;
  },

  // Get user profile from API
  async getProfile(): Promise<AuthResponse> {
    try {
      const response = await api.get<User>(API_PATHS.AUTH.PROFILE);
      return { success: true, user: response.data };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to get profile';
      return { success: false, error: errorMessage };
    }
  },

  // Update user profile
  async updateProfile(userData: Partial<User>): Promise<AuthResponse> {
    try {
      const response = await api.put<User>(API_PATHS.AUTH.PROFILE_UPDATE, userData);
      const updatedUser = response.data;
      
      // Update stored user data
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return { success: true, user: updatedUser };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update profile';
      return { success: false, error: errorMessage };
    }
  },

  // Refresh token
  async refreshToken(): Promise<string> {
    try {
      const response = await api.post<AuthTokens>(API_PATHS.AUTH.TOKEN_REFRESH, {});
      const { access } = response.data;
      
      // Update access token in localStorage
      localStorage.setItem('access_token', access);
      
      return access;
    } catch (error: any) {
      throw new Error('Token refresh failed');
    }
  },
};