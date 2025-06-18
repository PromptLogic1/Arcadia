/**
 * useAuth Hook Tests
 * 
 * Tests for authentication hook including:
 * - Sign in/up functionality
 * - Session management
 * - Loading states
 * - Error handling
 * - Rate limiting
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { User } from '@/types';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(),
  })),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock notifications
jest.mock('@/lib/notifications', () => ({
  notifications: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock session blacklist
jest.mock('@/lib/session-blacklist', () => ({
  trackUserSession: jest.fn(),
  blacklistAllUserSessions: jest.fn(),
}));

describe('Auth Store', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create fresh query client for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset auth store to initial state
    useAuthStore.setState({
      authUser: null,
      userData: null,
      isAuthenticated: false,
      loading: false,
      error: null,
    });
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() => useAuthStore(), { wrapper });

      expect(result.current.authUser).toBeNull();
      expect(result.current.userData).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('should check for existing session on mount', async () => {
      const mockUser: User = {
        id: 'user-123',
        username: 'testuser',
        auth_id: 'auth-123',
        avatar_url: null,
        bio: null,
        city: null,
        created_at: new Date().toISOString(),
        experience_points: 0,
        full_name: 'Test User',
        land: null,
        last_login_at: null,
        profile_visibility: 'public',
        achievements_visibility: 'public',
        submissions_visibility: 'public',
        region: null,
        role: 'user',
        updated_at: new Date().toISOString(),
      };

      (authService.getCurrentUser as jest.Mock).mockResolvedValue({
        success: true,
        data: mockUser,
      } as ServiceResponse<User>);

      (authService.getUserData as jest.Mock).mockResolvedValue({
        success: true,
        data: mockUser,
      } as ServiceResponse<User>);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.user).toMatchObject(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Sign In', () => {
    test('should sign in user successfully', async () => {
      const credentials = { email: 'test@example.com', password: 'Test123!' };
      const mockUser: User = {
        id: 'user-123',
        username: 'testuser',
        auth_id: 'auth-123',
        avatar_url: null,
        bio: null,
        city: null,
        created_at: new Date().toISOString(),
        experience_points: 0,
        full_name: 'Test User',
        land: null,
        last_login_at: null,
        profile_visibility: 'public',
        achievements_visibility: 'public',
        submissions_visibility: 'public',
        region: null,
        role: 'user',
        updated_at: new Date().toISOString(),
      };

      (authService.signIn as jest.Mock).mockResolvedValue({
        success: true,
        data: { user: mockUser },
      } as ServiceResponse<{ user: User }>);

      (authService.getUserData as jest.Mock).mockResolvedValue({
        success: true,
        data: mockUser,
      } as ServiceResponse<User>);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signIn(credentials);
      });

      expect(result.current.user).toMatchObject(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
    });

    test('should handle sign in errors', async () => {
      const credentials = { email: 'test@example.com', password: 'wrong' };

      (authService.signIn as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Invalid login credentials',
      } as ServiceResponse<{ user: User }>);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signIn(credentials);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Invalid login credentials');
    });

    test('should handle rate limiting', async () => {
      const credentials = { email: 'test@example.com', password: 'Test123!' };

      (authService.signIn as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Too many login attempts. Please try again later.',
      } as ServiceResponse<any>);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signIn(credentials);
      });

      expect(result.current.error).toBe('Too many login attempts. Please try again later.');
    });
  });

  describe('Sign Up', () => {
    test('should sign up user and require verification', async () => {
      const credentials = {
        email: 'new@example.com',
        password: 'Test123!',
        username: 'newuser',
      };

      (authService.signUp as jest.Mock).mockResolvedValue({
        success: true,
        data: { needsVerification: true },
      } as ServiceResponse<any>);

      const { result } = renderHook(() => useAuth(), { wrapper });

      const response = await act(async () => {
        return await result.current.signUp(credentials);
      });

      expect(response.needsVerification).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    test('should sign up and authenticate if email already confirmed', async () => {
      const credentials = {
        email: 'confirmed@example.com',
        password: 'Test123!',
        username: 'confirmeduser',
      };

      const mockUser = {
        id: 'user-123',
        email: 'confirmed@example.com',
        username: 'confirmeduser',
      };

      (authService.signUp as jest.Mock).mockResolvedValue({
        success: true,
        data: { user: mockUser },
      } as ServiceResponse<any>);

      (authService.getUserData as jest.Mock).mockResolvedValue({
        success: true,
        data: { ...mockUser, role: 'user' },
      } as ServiceResponse<any>);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signUp(credentials);
      });

      expect(result.current.user).toMatchObject(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    test('should handle duplicate email', async () => {
      const credentials = {
        email: 'existing@example.com',
        password: 'Test123!',
        username: 'existinguser',
      };

      (authService.signUp as jest.Mock).mockResolvedValue({
        success: false,
        error: 'User already registered',
      } as ServiceResponse<any>);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signUp(credentials);
      });

      expect(result.current.error).toBe('User already registered');
    });
  });

  describe('Sign Out', () => {
    test('should sign out user successfully', async () => {
      // Set up authenticated state
      useAuth.setState({
        user: { id: 'user-123', email: 'test@example.com' },
        isAuthenticated: true,
        isInitialized: true,
      });

      (authService.signOut as jest.Mock).mockResolvedValue({
        success: true,
      } as ServiceResponse<void>);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(authService.signOut).toHaveBeenCalled();
    });

    test('should handle sign out errors', async () => {
      useAuth.setState({
        user: { id: 'user-123', email: 'test@example.com' },
        isAuthenticated: true,
        isInitialized: true,
      });

      (authService.signOut as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Failed to sign out',
      } as ServiceResponse<void>);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signOut();
      });

      // User should still be signed out locally even if server fails
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Password Reset', () => {
    test('should send password reset email', async () => {
      (authService.resetPassword as jest.Mock).mockResolvedValue({
        success: true,
      } as ServiceResponse<void>);

      const { result } = renderHook(() => useAuth(), { wrapper });

      const response = await act(async () => {
        return await result.current.resetPassword('test@example.com');
      });

      expect(response.success).toBe(true);
      expect(authService.resetPassword).toHaveBeenCalledWith('test@example.com');
    });

    test('should handle rate limiting for password reset', async () => {
      (authService.resetPassword as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Too many password reset attempts',
      } as ServiceResponse<void>);

      const { result } = renderHook(() => useAuth(), { wrapper });

      const response = await act(async () => {
        return await result.current.resetPassword('test@example.com');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Too many password reset attempts');
    });
  });

  describe('Update Password', () => {
    test('should update password successfully', async () => {
      (authService.updatePassword as jest.Mock).mockResolvedValue({
        success: true,
      } as ServiceResponse<void>);

      const { result } = renderHook(() => useAuth(), { wrapper });

      const response = await act(async () => {
        return await result.current.updatePassword('NewPassword123!');
      });

      expect(response.success).toBe(true);
      expect(authService.updatePassword).toHaveBeenCalledWith('NewPassword123!');
    });

    test('should handle weak password error', async () => {
      (authService.updatePassword as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Password is too weak',
      } as ServiceResponse<void>);

      const { result } = renderHook(() => useAuth(), { wrapper });

      const response = await act(async () => {
        return await result.current.updatePassword('weak');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Password is too weak');
    });
  });

  describe('Loading States', () => {
    test('should handle loading state during sign in', async () => {
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });

      (authService.signIn as jest.Mock).mockReturnValue(signInPromise as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.signIn({ email: 'test@example.com', password: 'Test123!' });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn!({
          success: true,
          data: { user: { id: 'user-123' } },
        });
        await signInPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error Clearing', () => {
    test('should clear errors', async () => {
      useAuth.setState({ error: 'Previous error' });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.error).toBe('Previous error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    test('should clear error on successful operation', async () => {
      useAuth.setState({ error: 'Previous error' });

      (authService.signIn as jest.Mock).mockResolvedValue({
        success: true,
        data: { user: { id: 'user-123' } },
      } as ServiceResponse<any>);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signIn({ email: 'test@example.com', password: 'Test123!' });
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Session Management', () => {
    test('should handle session expiration', async () => {
      useAuth.setState({
        user: { id: 'user-123', email: 'test@example.com' },
        isAuthenticated: true,
        isInitialized: true,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      act(() => {
        result.current.handleSessionExpired();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Your session has expired. Please sign in again.');
    });
  });
});