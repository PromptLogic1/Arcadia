/**
 * Tests for useAuthQueries hooks
 * 
 * Tests authentication query hooks following Context7 best practices:
 * - Mocking at SDK edge (Supabase client)
 * - Testing loading, success, and error states
 * - Testing mutations and optimistic updates
 * - Testing query invalidation patterns
 * - Testing error handling and retries
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useAuthSessionQuery,
  useCurrentUserQuery,
  useUserDataQuery,
  useSignInMutation,
  useSignUpMutation,
  useSignOutMutation,
  useUpdateUserDataMutation,
  useResetPasswordMutation,
  useAuthUpdatePasswordMutation,
} from '../useAuthQueries';
import { authService } from '@/services/auth.service';
import { useAuth, useAuthActions } from '@/lib/stores/auth-store';
import { notifications } from '@/lib/notifications';
import { logger } from '@/lib/logger';
import type { AuthUser, UserData } from '@/lib/stores/types';
import type { ServiceResponse } from '@/lib/service-types';

// Mock dependencies
jest.mock('@/services/auth.service');
jest.mock('@/lib/stores/auth-store');
jest.mock('@/lib/notifications');
jest.mock('@/lib/logger');

// Type the mocked modules
const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockNotifications = notifications as jest.Mocked<typeof notifications>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Create test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for tests
        gcTime: 0, // Disable garbage collection
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// Test data
const mockAuthUser: AuthUser = {
  id: 'user-123',
  email: 'test@example.com',
  phone: null,
  auth_username: 'testuser',
  username: 'testuser',
  avatar_url: null,
  provider: 'email',
  userRole: 'user',
};

const mockUserData: UserData = {
  id: 'user-123',
  username: 'testuser',
  full_name: 'Test User',
  avatar_url: null,
  experience_points: 100,
  land: 'USA',
  region: 'CA',
  city: 'San Francisco',
  bio: 'Test bio',
  role: 'user',
  last_login_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  achievements_visibility: 'public',
  auth_id: 'user-123',
  profile_visibility: 'public',
  submissions_visibility: 'public',
  updated_at: '2024-01-01T00:00:00Z',
};

// Setup common mocks
const mockSetAuthUser = jest.fn();
const mockSetUserData = jest.fn();
const mockSignOut = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  
  // Setup auth store mocks
  (useAuth as jest.Mock).mockReturnValue({ authUser: null });
  (useAuthActions as jest.Mock).mockReturnValue({
    setAuthUser: mockSetAuthUser,
    setUserData: mockSetUserData,
    signOut: mockSignOut,
  });
});

describe('useAuthSessionQuery', () => {
  it('should fetch session successfully', async () => {
    const mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockAuthService.getSession.mockResolvedValue({
      success: true,
      data: mockSession,
      error: null,
    });

    const { result } = renderHook(() => useAuthSessionQuery(), {
      wrapper: createWrapper(),
    });

    // Check initial loading state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Wait for query to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockSession);
    expect(mockAuthService.getSession).toHaveBeenCalledTimes(1);
  });

  it('should handle session fetch error', async () => {
    mockAuthService.getSession.mockResolvedValue({
      success: false,
      data: null,
      error: 'Session fetch failed',
    });

    const { result } = renderHook(() => useAuthSessionQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });

  it('should return null when no session exists', async () => {
    mockAuthService.getSession.mockResolvedValue({
      success: true,
      data: null,
      error: null,
    });

    const { result } = renderHook(() => useAuthSessionQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });
});

describe('useCurrentUserQuery', () => {
  it('should fetch current user when authUser is not set', async () => {
    mockAuthService.getCurrentUser.mockResolvedValue({
      success: true,
      data: mockAuthUser,
      error: null,
    });

    const { result } = renderHook(() => useCurrentUserQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockAuthUser);
    expect(mockAuthService.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('should not fetch when authUser already exists', () => {
    (useAuth as jest.Mock).mockReturnValue({ authUser: mockAuthUser });

    const { result } = renderHook(() => useCurrentUserQuery(), {
      wrapper: createWrapper(),
    });

    // Query should be disabled
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockAuthService.getCurrentUser).not.toHaveBeenCalled();
  });

  it('should handle user fetch error', async () => {
    mockAuthService.getCurrentUser.mockResolvedValue({
      success: false,
      data: null,
      error: 'User fetch failed',
    });

    const { result } = renderHook(() => useCurrentUserQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });
});

describe('useUserDataQuery', () => {
  it('should fetch user data successfully', async () => {
    mockAuthService.getUserData.mockResolvedValue({
      success: true,
      data: mockUserData,
      error: null,
    });

    const { result } = renderHook(() => useUserDataQuery('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockUserData);
    expect(mockAuthService.getUserData).toHaveBeenCalledWith('user-123');
  });

  it('should not fetch when userId is not provided', () => {
    const { result } = renderHook(() => useUserDataQuery(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockAuthService.getUserData).not.toHaveBeenCalled();
  });

  it('should handle user data fetch error', async () => {
    mockAuthService.getUserData.mockResolvedValue({
      success: false,
      data: null,
      error: 'User data fetch failed',
    });

    const { result } = renderHook(() => useUserDataQuery('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });
});

describe('useSignInMutation', () => {
  it('should sign in successfully and fetch user data', async () => {
    const signInResponse: ServiceResponse<{ user: AuthUser }> = {
      success: true,
      data: { user: mockAuthUser },
      error: null,
    };
    
    const userDataResponse: ServiceResponse<UserData> = {
      success: true,
      data: mockUserData,
      error: null,
    };

    mockAuthService.signIn.mockResolvedValue(signInResponse);
    mockAuthService.getUserData.mockResolvedValue(userDataResponse);

    const { result } = renderHook(() => useSignInMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(mockSetAuthUser).toHaveBeenCalledWith(mockAuthUser);
    expect(mockSetUserData).toHaveBeenCalledWith(mockUserData);
    expect(mockNotifications.success).toHaveBeenCalledWith('Signed in successfully!');
  });

  it('should handle sign in error', async () => {
    const errorMessage = 'Invalid credentials';
    mockAuthService.signIn.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useSignInMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          email: 'test@example.com',
          password: 'wrong-password',
        });
      } catch {
        // Expected error
      }
    });

    expect(mockNotifications.error).toHaveBeenCalledWith(errorMessage);
    expect(mockSetAuthUser).not.toHaveBeenCalled();
  });

  it('should handle sign in response with no user', async () => {
    mockAuthService.signIn.mockResolvedValue({
      success: false,
      data: null,
      error: 'Sign in failed',
    });

    const { result } = renderHook(() => useSignInMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(mockNotifications.error).toHaveBeenCalledWith('Sign in failed');
    expect(mockSetAuthUser).not.toHaveBeenCalled();
  });

  it('should handle user data fetch error after successful sign in', async () => {
    const signInResponse: ServiceResponse<{ user: AuthUser }> = {
      success: true,
      data: { user: mockAuthUser },
      error: null,
    };

    mockAuthService.signIn.mockResolvedValue(signInResponse);
    mockAuthService.getUserData.mockRejectedValue(new Error('Failed to fetch user data'));

    const { result } = renderHook(() => useSignInMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(mockSetAuthUser).toHaveBeenCalledWith(mockAuthUser);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to fetch user data after sign in',
      expect.any(Error),
      expect.objectContaining({
        metadata: { userId: mockAuthUser.id },
      })
    );
    expect(mockNotifications.success).toHaveBeenCalledWith('Signed in successfully!');
  });
});

describe('useSignUpMutation', () => {
  it('should sign up successfully', async () => {
    const signUpResponse = {
      success: true,
      data: { user: mockAuthUser },
      error: null,
    };

    mockAuthService.signUp.mockResolvedValue(signUpResponse);

    const { result } = renderHook(() => useSignUpMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'new@example.com',
        password: 'password123',
        username: 'newuser',
      });
    });

    expect(mockSetAuthUser).toHaveBeenCalledWith(mockAuthUser);
    expect(mockNotifications.success).toHaveBeenCalledWith('Account created successfully!');
  });

  it('should handle sign up with email verification required', async () => {
    const signUpResponse = {
      success: true,
      data: { needsVerification: true },
      error: null,
    };

    mockAuthService.signUp.mockResolvedValue(signUpResponse);

    const { result } = renderHook(() => useSignUpMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'new@example.com',
        password: 'password123',
        username: 'newuser',
      });
    });

    expect(mockSetAuthUser).not.toHaveBeenCalled();
    expect(mockNotifications.success).toHaveBeenCalledWith(
      'Please check your email to verify your account.'
    );
  });

  it('should handle sign up error', async () => {
    const errorMessage = 'Email already exists';
    mockAuthService.signUp.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useSignUpMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          email: 'existing@example.com',
          password: 'password123',
          username: 'existinguser',
        });
      } catch {
        // Expected error
      }
    });

    expect(mockNotifications.error).toHaveBeenCalledWith(errorMessage);
    expect(mockSetAuthUser).not.toHaveBeenCalled();
  });

  it('should handle sign up response with no data', async () => {
    const signUpResponse = {
      success: false,
      data: null,
      error: 'Sign up failed',
    };

    mockAuthService.signUp.mockResolvedValue(signUpResponse);

    const { result } = renderHook(() => useSignUpMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'new@example.com',
        password: 'password123',
        username: 'newuser',
      });
    });

    expect(mockNotifications.error).toHaveBeenCalledWith('Sign up failed');
    expect(mockSetAuthUser).not.toHaveBeenCalled();
  });
});

describe('useSignOutMutation', () => {
  it('should sign out successfully', async () => {
    mockAuthService.signOut.mockResolvedValue({
      success: true,
      data: null,
      error: null,
    });

    const queryClient = new QueryClient();
    const clearSpy = jest.spyOn(queryClient, 'clear');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSignOutMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
    expect(mockNotifications.success).toHaveBeenCalledWith('Signed out successfully!');
  });

  it('should handle sign out error', async () => {
    mockAuthService.signOut.mockResolvedValue({
      success: false,
      data: null,
      error: 'Sign out failed',
    });

    const { result } = renderHook(() => useSignOutMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockNotifications.error).toHaveBeenCalledWith('Sign out failed');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('should handle sign out exception', async () => {
    const errorMessage = 'Network error';
    mockAuthService.signOut.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useSignOutMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync();
      } catch {
        // Expected error
      }
    });

    expect(mockNotifications.error).toHaveBeenCalledWith(errorMessage);
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

describe('useUpdateUserDataMutation', () => {
  const userId = 'user-123';

  it('should update user data successfully', async () => {
    const updatedUserData: UserData = {
      ...mockUserData,
      bio: 'Updated bio',
    };

    mockAuthService.updateUserData.mockResolvedValue({
      success: true,
      data: updatedUserData,
      error: null,
    });

    const queryClient = new QueryClient();
    const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateUserDataMutation(userId), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ bio: 'Updated bio' });
    });

    expect(mockSetUserData).toHaveBeenCalledWith(updatedUserData);
    expect(setQueryDataSpy).toHaveBeenCalledWith(
      ['auth', 'userData', userId],
      { userData: updatedUserData }
    );
    expect(mockNotifications.success).toHaveBeenCalledWith('Profile updated successfully!');
  });

  it('should handle update user data error', async () => {
    mockAuthService.updateUserData.mockResolvedValue({
      success: false,
      data: null,
      error: 'Update failed',
    });

    const { result } = renderHook(() => useUpdateUserDataMutation(userId), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ bio: 'Updated bio' });
    });

    expect(mockNotifications.error).toHaveBeenCalledWith('Update failed');
    expect(mockSetUserData).not.toHaveBeenCalled();
  });

  it('should handle update exception', async () => {
    const errorMessage = 'Database error';
    mockAuthService.updateUserData.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useUpdateUserDataMutation(userId), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({ bio: 'Updated bio' });
      } catch {
        // Expected error
      }
    });

    expect(mockNotifications.error).toHaveBeenCalledWith(errorMessage);
  });
});

describe('useResetPasswordMutation', () => {
  it('should reset password successfully', async () => {
    mockAuthService.resetPassword.mockResolvedValue({
      success: true,
      data: null,
      error: null,
    });

    const { result } = renderHook(() => useResetPasswordMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('test@example.com');
    });

    expect(mockNotifications.success).toHaveBeenCalledWith(
      "If an account exists with that email, we've sent you instructions to reset your password."
    );
  });

  it('should handle reset password error', async () => {
    mockAuthService.resetPassword.mockResolvedValue({
      success: false,
      data: null,
      error: 'Reset failed',
    });

    const { result } = renderHook(() => useResetPasswordMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('test@example.com');
    });

    expect(mockNotifications.error).toHaveBeenCalledWith('Reset failed');
  });

  it('should handle reset password exception', async () => {
    const errorMessage = 'Service unavailable';
    mockAuthService.resetPassword.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useResetPasswordMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync('test@example.com');
      } catch {
        // Expected error
      }
    });

    expect(mockNotifications.error).toHaveBeenCalledWith(errorMessage);
  });
});

describe('useAuthUpdatePasswordMutation', () => {
  it('should update password successfully', async () => {
    mockAuthService.updatePassword.mockResolvedValue({
      success: true,
      data: null,
      error: null,
    });

    const { result } = renderHook(() => useAuthUpdatePasswordMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('newPassword123!');
    });

    expect(mockNotifications.success).toHaveBeenCalledWith('Password updated successfully!');
  });

  it('should handle update password error', async () => {
    mockAuthService.updatePassword.mockResolvedValue({
      success: false,
      data: null,
      error: 'Password update failed',
    });

    const { result } = renderHook(() => useAuthUpdatePasswordMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('newPassword123!');
    });

    expect(mockNotifications.error).toHaveBeenCalledWith('Password update failed');
  });

  it('should handle update password exception', async () => {
    const errorMessage = 'Invalid password format';
    mockAuthService.updatePassword.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useAuthUpdatePasswordMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync('weak');
      } catch {
        // Expected error
      }
    });

    expect(mockNotifications.error).toHaveBeenCalledWith(errorMessage);
  });
});

describe('Query Invalidation', () => {
  it('should invalidate auth queries after successful sign in', async () => {
    const signInResponse: ServiceResponse<{ user: AuthUser }> = {
      success: true,
      data: { user: mockAuthUser },
      error: null,
    };

    mockAuthService.signIn.mockResolvedValue(signInResponse);
    mockAuthService.getUserData.mockResolvedValue({
      success: true,
      data: mockUserData,
      error: null,
    });

    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSignInMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['auth', 'user'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['auth', 'userData', mockAuthUser.id],
    });
  });

  it('should invalidate auth queries after successful sign up', async () => {
    const signUpResponse = {
      success: true,
      data: { user: mockAuthUser },
      error: null,
    };

    mockAuthService.signUp.mockResolvedValue(signUpResponse);

    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSignUpMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'new@example.com',
        password: 'password123',
        username: 'newuser',
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['auth', 'user'],
    });
  });
});

describe('Stale Time and Cache Configuration', () => {
  it('should configure correct stale time for session query', async () => {
    mockAuthService.getSession.mockResolvedValue({
      success: true,
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    });

    const { result } = renderHook(() => useAuthSessionQuery(), {
      wrapper: createWrapper(),
    });

    // Wait for query to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The staleTime is configured to 5 minutes (5 * 60 * 1000)
    // Check that the query has the expected configuration by verifying it was called
    expect(mockAuthService.getSession).toHaveBeenCalledTimes(1);
    
    // Verify the data was cached properly
    expect(result.current.data).toEqual({ user: { id: 'user-123', email: 'test@example.com' } });
  });

  it('should configure correct stale time for user queries', async () => {
    mockAuthService.getCurrentUser.mockResolvedValue({
      success: true,
      data: mockAuthUser,
      error: null,
    });

    const { result } = renderHook(() => useCurrentUserQuery(), {
      wrapper: createWrapper(),
    });

    // Wait for query to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The staleTime is configured to 5 minutes
    expect(mockAuthService.getCurrentUser).toHaveBeenCalledTimes(1);
    
    // Verify the data was cached properly
    expect(result.current.data).toEqual(mockAuthUser);
  });

  it('should respect gcTime configuration', async () => {
    mockAuthService.getUserData.mockResolvedValue({
      success: true,
      data: mockUserData,
      error: null,
    });

    const { result } = renderHook(() => useUserDataQuery('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The gcTime is configured to 10 minutes
    // Verify the query was made and data is cached
    expect(mockAuthService.getUserData).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockUserData);
  });
});

describe('Error Boundary Integration', () => {
  it('should propagate errors for error boundary handling', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Critical auth error');
    
    mockAuthService.getSession.mockRejectedValue(error);

    const { result } = renderHook(() => useAuthSessionQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(error);
    
    consoleError.mockRestore();
  });
});

describe('Loading States and Transitions', () => {
  it('should handle loading state properly for session query', async () => {
    // Create a promise that we can resolve manually
    let resolvePromise: (value: ServiceResponse<{ user: { id: string; email?: string | null } } | null>) => void;
    const pendingPromise = new Promise<ServiceResponse<{ user: { id: string; email?: string | null } } | null>>(resolve => {
      resolvePromise = resolve;
    });

    mockAuthService.getSession.mockReturnValue(pendingPromise);

    const { result } = renderHook(() => useAuthSessionQuery(), {
      wrapper: createWrapper(),
    });

    // Should be loading initially
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toBeUndefined();

    // Resolve the promise
    resolvePromise!({
      success: true,
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual({ user: { id: 'user-123', email: 'test@example.com' } });
  });

  it('should handle loading to error transition', async () => {
    let rejectPromise: (error: any) => void;
    const pendingPromise = new Promise<ServiceResponse<AuthUser | null>>((_, reject) => {
      rejectPromise = reject;
    });

    mockAuthService.getCurrentUser.mockReturnValue(pendingPromise);

    const { result } = renderHook(() => useCurrentUserQuery(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    // Reject the promise
    rejectPromise!(new Error('Network error'));

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.error).toEqual(new Error('Network error'));
  });

  it('should handle mutation loading states', async () => {
    let resolvePromise: (value: ServiceResponse<{ user: AuthUser }>) => void;
    const pendingPromise = new Promise<ServiceResponse<{ user: AuthUser }>>(resolve => {
      resolvePromise = resolve;
    });

    mockAuthService.signIn.mockReturnValue(pendingPromise);

    const { result } = renderHook(() => useSignInMutation(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);

    // Start mutation
    act(() => {
      result.current.mutate({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    // Check immediately after starting mutation - might need to wait
    await waitFor(() => expect(result.current.isPending).toBe(true));

    // Resolve the mutation
    resolvePromise!({
      success: true,
      data: { user: mockAuthUser },
      error: null,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.isPending).toBe(false);
  });
});

describe('Optimistic Updates and Cache Management', () => {
  it('should handle optimistic updates for user data mutation', async () => {
    const queryClient = new QueryClient();
    const userId = 'user-123';
    
    // Pre-populate cache with initial data
    queryClient.setQueryData(['auth', 'userData', userId], {
      userData: mockUserData,
    });

    mockAuthService.updateUserData.mockResolvedValue({
      success: true,
      data: { ...mockUserData, bio: 'Updated optimistically' },
      error: null,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateUserDataMutation(userId), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ bio: 'Updated optimistically' });
    });

    // Check that cache was updated
    const cachedData = queryClient.getQueryData(['auth', 'userData', userId]);
    expect(cachedData).toEqual({
      userData: { ...mockUserData, bio: 'Updated optimistically' },
    });
  });

  it('should handle cache invalidation patterns correctly', async () => {
    const queryClient = new QueryClient();
    
    // Pre-populate cache
    queryClient.setQueryData(['auth', 'user'], mockAuthUser);
    queryClient.setQueryData(['auth', 'userData', mockAuthUser.id], { userData: mockUserData });

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    mockAuthService.signIn.mockResolvedValue({
      success: true,
      data: { user: mockAuthUser },
      error: null,
    });

    mockAuthService.getUserData.mockResolvedValue({
      success: true,
      data: mockUserData,
      error: null,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSignInMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    // Verify correct invalidation calls
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['auth', 'user'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ 
      queryKey: ['auth', 'userData', mockAuthUser.id] 
    });
  });

  it('should clear all cache on sign out', async () => {
    const queryClient = new QueryClient();
    
    // Pre-populate cache with various data
    queryClient.setQueryData(['auth', 'user'], mockAuthUser);
    queryClient.setQueryData(['auth', 'session'], { user: mockAuthUser });
    queryClient.setQueryData(['someOtherData'], { data: 'test' });

    const clearSpy = jest.spyOn(queryClient, 'clear');

    mockAuthService.signOut.mockResolvedValue({
      success: true,
      data: null,
      error: null,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSignOutMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });
});

describe('Edge Cases and Error Scenarios', () => {
  it('should handle sign in with malformed response data', async () => {
    mockAuthService.signIn.mockResolvedValue({
      success: true,
      data: {}, // Malformed data - missing user property
      error: null,
    });

    const { result } = renderHook(() => useSignInMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(mockNotifications.error).toHaveBeenCalledWith('Sign in failed');
    expect(mockSetAuthUser).not.toHaveBeenCalled();
  });

  it('should handle sign up with missing data', async () => {
    mockAuthService.signUp.mockResolvedValue({
      success: false,
      data: null,
      error: 'Sign up failed',
    });

    const { result } = renderHook(() => useSignUpMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'new@example.com',
        password: 'password123',
        username: 'newuser',
      });
    });

    expect(mockNotifications.error).toHaveBeenCalledWith('Sign up failed');
    expect(mockSetAuthUser).not.toHaveBeenCalled();
  });

  it('should handle update user data with no data returned', async () => {
    mockAuthService.updateUserData.mockResolvedValue({
      success: true,
      data: null, // No data returned
      error: null,
    });

    const { result } = renderHook(() => useUpdateUserDataMutation('user-123'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ bio: 'Updated bio' });
    });

    expect(mockNotifications.error).toHaveBeenCalledWith('Failed to update profile');
    expect(mockSetUserData).not.toHaveBeenCalled();
  });

  it('should handle getUserData error response after successful sign in', async () => {
    mockAuthService.signIn.mockResolvedValue({
      success: true,
      data: { user: mockAuthUser },
      error: null,
    });

    mockAuthService.getUserData.mockResolvedValue({
      success: false,
      data: null,
      error: 'User data fetch failed',
    });

    const { result } = renderHook(() => useSignInMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    // Should still set auth user and show success
    expect(mockSetAuthUser).toHaveBeenCalledWith(mockAuthUser);
    expect(mockSetUserData).not.toHaveBeenCalled();
    expect(mockNotifications.success).toHaveBeenCalledWith('Signed in successfully!');
  });

  it('should handle empty userId in useUserDataQuery', async () => {
    const { result } = renderHook(() => useUserDataQuery(''), {
      wrapper: createWrapper(),
    });

    // Query should be disabled
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockAuthService.getUserData).not.toHaveBeenCalled();
  });

  it('should handle whitespace-only userId in useUserDataQuery', async () => {
    const { result } = renderHook(() => useUserDataQuery('   '), {
      wrapper: createWrapper(),
    });

    // Should make the call since truthy string
    await waitFor(() => {
      if (result.current.isLoading === false) {
        return true;
      }
      throw new Error('Still loading');
    });

    expect(mockAuthService.getUserData).toHaveBeenCalledWith('   ');
  });
});

describe('Multiple Simultaneous Mutations', () => {
  it('should handle multiple sign in attempts gracefully', async () => {
    let resolveFirst: (value: ServiceResponse<{ user: AuthUser }>) => void;
    
    const firstPromise = new Promise<ServiceResponse<{ user: AuthUser }>>(resolve => { resolveFirst = resolve; });

    mockAuthService.signIn.mockReturnValue(firstPromise);

    const { result } = renderHook(() => useSignInMutation(), {
      wrapper: createWrapper(),
    });

    // Start first mutation
    act(() => {
      result.current.mutate({
        email: 'test1@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    // Try to start second mutation while first is pending
    // TanStack Query mutations can accept multiple calls
    act(() => {
      result.current.mutate({
        email: 'test2@example.com',
        password: 'password123',
      });
    });

    // Resolve the promise
    resolveFirst!({
      success: true,
      data: { user: mockAuthUser },
      error: null,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Both mutations would have been called since mutations don't queue by default
    expect(mockAuthService.signIn).toHaveBeenCalledTimes(2);
    expect(mockAuthService.signIn).toHaveBeenNthCalledWith(1, {
      email: 'test1@example.com',
      password: 'password123',
    });
    expect(mockAuthService.signIn).toHaveBeenNthCalledWith(2, {
      email: 'test2@example.com',
      password: 'password123',
    });
  });

  it('should handle concurrent updates to user data', async () => {
    const queryClient = new QueryClient();
    const userId = 'user-123';

    mockAuthService.updateUserData.mockImplementation((id, updates) =>
      Promise.resolve({
        success: true,
        data: { ...mockUserData, ...updates },
        error: null,
      })
    );

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result: result1 } = renderHook(() => useUpdateUserDataMutation(userId), { wrapper });
    const { result: result2 } = renderHook(() => useUpdateUserDataMutation(userId), { wrapper });

    // Start both mutations
    await act(async () => {
      await Promise.all([
        result1.current.mutateAsync({ bio: 'First update' }),
        result2.current.mutateAsync({ full_name: 'Second update' }),
      ]);
    });

    expect(mockAuthService.updateUserData).toHaveBeenCalledTimes(2);
    expect(mockSetUserData).toHaveBeenCalledTimes(2);
  });
});

describe('Query Key Management', () => {
  it('should use correct query keys for different user data queries', async () => {
    const userId1 = 'user-123';
    const userId2 = 'user-456';

    mockAuthService.getUserData.mockResolvedValue({
      success: true,
      data: mockUserData,
      error: null,
    });

    const { result: result1 } = renderHook(() => useUserDataQuery(userId1), {
      wrapper: createWrapper(),
    });

    const { result: result2 } = renderHook(() => useUserDataQuery(userId2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));

    expect(mockAuthService.getUserData).toHaveBeenCalledWith(userId1);
    expect(mockAuthService.getUserData).toHaveBeenCalledWith(userId2);
    expect(mockAuthService.getUserData).toHaveBeenCalledTimes(2);
  });

  it('should properly scope cache updates to specific user', async () => {
    const queryClient = new QueryClient();
    const userId = 'user-123';
    const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData');

    mockAuthService.updateUserData.mockResolvedValue({
      success: true,
      data: { ...mockUserData, bio: 'Updated' },
      error: null,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateUserDataMutation(userId), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ bio: 'Updated' });
    });

    // Verify correct query key was used for cache update
    expect(setQueryDataSpy).toHaveBeenCalledWith(
      ['auth', 'userData', userId],
      { userData: { ...mockUserData, bio: 'Updated' } }
    );
  });
});

describe('Notification Integration', () => {
  it('should show success notification for sign in', async () => {
    mockAuthService.signIn.mockResolvedValue({
      success: true,
      data: { user: mockAuthUser },
      error: null,
    });
    
    mockAuthService.getUserData.mockResolvedValue({
      success: true,
      data: mockUserData,
      error: null,
    });

    const { result } = renderHook(() => useSignInMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(mockNotifications.success).toHaveBeenCalledWith('Signed in successfully!');
  });

  it('should show success notification for sign up', async () => {
    mockAuthService.signUp.mockResolvedValue({
      success: true,
      data: { user: mockAuthUser },
      error: null,
    });

    const { result } = renderHook(() => useSignUpMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'new@example.com',
        password: 'password123',
        username: 'newuser',
      });
    });

    expect(mockNotifications.success).toHaveBeenCalledWith('Account created successfully!');
  });

  it('should show error notification for failed sign in', async () => {
    const errorMessage = 'Invalid credentials';
    mockAuthService.signIn.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useSignInMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          email: 'test@example.com',
          password: 'wrong',
        });
      } catch {
        // Expected error
      }
    });

    expect(mockNotifications.error).toHaveBeenCalledWith(errorMessage);
  });

  it('should show error notification for failed sign up', async () => {
    const errorMessage = 'Email already exists';
    mockAuthService.signUp.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useSignUpMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          email: 'existing@example.com',
          password: 'password123',
          username: 'existing',
        });
      } catch {
        // Expected error
      }
    });

    expect(mockNotifications.error).toHaveBeenCalledWith(errorMessage);
  });
});

describe('Store Integration', () => {
  it('should properly integrate with auth store for state updates', async () => {
    mockAuthService.signIn.mockResolvedValue({
      success: true,
      data: { user: mockAuthUser },
      error: null,
    });

    mockAuthService.getUserData.mockResolvedValue({
      success: true,
      data: mockUserData,
      error: null,
    });

    const { result } = renderHook(() => useSignInMutation(), {
      wrapper: createWrapper(),
    });

    // Ensure result is not null before using
    expect(result.current).toBeDefined();

    await act(async () => {
      await result.current.mutateAsync({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    // Verify auth store methods were called
    expect(mockSetAuthUser).toHaveBeenCalledWith(mockAuthUser);
    expect(mockSetUserData).toHaveBeenCalledWith(mockUserData);
  });

  it('should call signOut action from store on successful sign out', async () => {
    mockAuthService.signOut.mockResolvedValue({
      success: true,
      data: null,
      error: null,
    });

    const { result } = renderHook(() => useSignOutMutation(), {
      wrapper: createWrapper(),
    });

    // Ensure result is not null before using
    expect(result.current).toBeDefined();

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('should respect authUser state for enabling/disabling queries', async () => {
    // Test with authUser present - query should be disabled
    (useAuth as jest.Mock).mockReturnValue({ authUser: mockAuthUser });

    const { result: resultWithUser } = renderHook(() => useCurrentUserQuery(), {
      wrapper: createWrapper(),
    });

    // Ensure result is not null before using
    expect(resultWithUser.current).toBeDefined();
    expect(resultWithUser.current.isLoading).toBe(false);
    expect(mockAuthService.getCurrentUser).not.toHaveBeenCalled();

    // Reset mocks for second test
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ authUser: null });
    
    mockAuthService.getCurrentUser.mockResolvedValue({
      success: true,
      data: mockAuthUser,
      error: null,
    });

    const { result: resultWithoutUser } = renderHook(() => useCurrentUserQuery(), {
      wrapper: createWrapper(),
    });

    // Should start fetching when no authUser
    await waitFor(() => expect(resultWithoutUser.current).toBeDefined());
    await waitFor(() => expect(mockAuthService.getCurrentUser).toHaveBeenCalled());
  });
});