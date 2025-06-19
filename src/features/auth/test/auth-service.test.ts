/**
 * Auth Service Tests
 *
 * Tests for authentication service layer including:
 * - Sign in/up operations
 * - Session management
 * - User data fetching
 * - Password reset
 * - Error handling
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import type { Tables } from '../../../../types/database.types';
import type { AuthError, Session, User } from '@supabase/supabase-js';

// Mock environment variables first
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Define proper mock types
interface MockAuthClient {
  getSession: jest.Mock;
  getUser: jest.Mock;
  signInWithPassword: jest.Mock;
  signUp: jest.Mock;
  signOut: jest.Mock;
  resetPasswordForEmail: jest.Mock;
  updateUser: jest.Mock;
  onAuthStateChange: jest.Mock;
}

interface MockSupabaseClient {
  auth: MockAuthClient;
  from: jest.Mock;
}

describe('Auth Service', () => {
  let authService: any;

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset modules to ensure fresh imports
    jest.resetModules();

    // Unmock the auth service so we can test the real implementation
    jest.unmock('@/services/auth.service');

    // Mock the validation schema
    jest.doMock('@/lib/validation/schemas/users', () => ({
      userSchema: {
        safeParse: jest.fn(data => ({ success: true, data })),
      },
    }));

    // Mock the auth store transformation
    jest.doMock('@/lib/stores/auth-store', () => ({
      transformDbUserToUserData: jest.fn(user => user),
    }));

    // Import service - it will use the global mocks from jest.setup.ts for dependencies
    const authServiceModule = await import('@/services/auth.service');
    authService = authServiceModule.authService;
  });

  describe('getSession', () => {
    test('should return session when available', async () => {
      const mockSession: Session = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2024-01-01T00:00:00Z',
        },
        access_token: 'token-123',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'refresh-123',
      };

      // Use the global mockSupabaseClient
      global.mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await authService.getSession();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      });
      expect(global.mockSupabaseClient.auth.getSession).toHaveBeenCalledTimes(
        1
      );
    });

    test('should return null when no session', async () => {
      global.mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await authService.getSession();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    test('should handle errors gracefully', async () => {
      const mockError: AuthError = {
        message: 'Network error',
        status: 500,
        name: 'AuthError',
      } as AuthError;

      global.mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: mockError,
      });

      const result = await authService.getSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getCurrentUser', () => {
    test('should return authenticated user', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        phone: null as string | null,
        user_metadata: {
          username: 'testuser',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        app_metadata: { provider: 'email' },
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
      };

      global.mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        phone: null,
        auth_username: 'testuser',
        username: 'testuser',
        avatar_url: 'https://example.com/avatar.jpg',
        provider: 'email',
        userRole: 'user',
      });
    });

    test('should return null when not authenticated', async () => {
      global.mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    test('should handle authentication errors', async () => {
      const mockError: AuthError = {
        message: 'Authentication failed',
        status: 401,
        name: 'AuthError',
      } as AuthError;

      global.mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });

    test('should handle user with missing metadata', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: null,
        phone: null,
        user_metadata: {},
        app_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
      };

      global.mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'user-123',
        email: null,
        phone: null,
        auth_username: null,
        username: null,
        avatar_url: null,
        provider: null,
        userRole: 'user',
      });
    });
  });

  describe('signIn', () => {
    test('should sign in user with valid credentials', async () => {
      const credentials = { email: 'test@example.com', password: 'Test123!' };
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { username: 'testuser' },
        app_metadata: { provider: 'email' },
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockSession: Session = {
        access_token: 'token-123',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'refresh-123',
        user: mockUser,
      };

      global.mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(true);
      expect(result.data?.user).toMatchObject({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      });
      expect(
        global.mockSupabaseClient.auth.signInWithPassword
      ).toHaveBeenCalledWith(credentials);
    });

    test('should handle invalid credentials', async () => {
      const credentials = { email: 'test@example.com', password: 'wrong' };
      const mockError: AuthError = {
        message: 'Invalid login credentials',
        status: 400,
        name: 'AuthError',
      } as AuthError;

      global.mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid login credentials');
    });

    test('should handle missing user in response', async () => {
      const credentials = { email: 'test@example.com', password: 'Test123!' };
      
      global.mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No user returned from sign in');
    });

    test('should handle unexpected errors during sign in', async () => {
      const credentials = { email: 'test@example.com', password: 'Test123!' };
      
      global.mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      );

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('signUp', () => {
    test('should sign up user successfully', async () => {
      const credentials = { 
        email: 'newuser@example.com', 
        password: 'Test123!',
        username: 'newuser'
      };
      const mockUser: User = {
        id: 'user-456',
        email: 'newuser@example.com',
        email_confirmed_at: '2024-01-01T00:00:00Z',
        user_metadata: { username: 'newuser' },
        app_metadata: { provider: 'email' },
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
      };

      global.mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: {} as Session },
        error: null,
      });

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(true);
      expect(result.data?.user).toMatchObject({
        id: 'user-456',
        email: 'newuser@example.com',
        username: 'newuser',
      });
    });

    test('should handle email verification requirement', async () => {
      const credentials = { 
        email: 'unverified@example.com', 
        password: 'Test123!',
        username: 'unverified'
      };
      const mockUser: User = {
        id: 'user-789',
        email: 'unverified@example.com',
        email_confirmed_at: null, // Email not confirmed
        user_metadata: { username: 'unverified' },
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
      };

      global.mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(true);
      expect(result.data?.needsVerification).toBe(true);
      expect(result.data?.user).toBeUndefined();
    });

    test('should handle missing user in sign up response', async () => {
      const credentials = { 
        email: 'test@example.com', 
        password: 'Test123!'
      };
      
      global.mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No user returned from sign up');
    });

    test('should handle sign up errors', async () => {
      const credentials = { 
        email: 'existing@example.com', 
        password: 'Test123!'
      };
      const mockError: AuthError = {
        message: 'User already registered',
        status: 400,
        name: 'AuthError',
      } as AuthError;

      global.mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User already registered');
    });

    test('should handle unexpected errors during sign up', async () => {
      const credentials = { 
        email: 'test@example.com', 
        password: 'Test123!'
      };
      
      global.mockSupabaseClient.auth.signUp.mockRejectedValue(
        new Error('Network timeout')
      );

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });
  });

  describe('signOut', () => {
    test('should sign out user successfully', async () => {
      global.mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      const result = await authService.signOut();

      expect(result.success).toBe(true);
      expect(global.mockSupabaseClient.auth.signOut).toHaveBeenCalledTimes(1);
    });

    test('should handle sign out errors', async () => {
      const mockError = {
        message: 'Failed to sign out',
        status: 500,
        name: 'AuthError',
        code: 'signout_error',
        __isAuthError: true,
      } as AuthError;

      global.mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: mockError,
      });

      const result = await authService.signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to sign out');
    });

    test('should handle unexpected errors during sign out', async () => {
      global.mockSupabaseClient.auth.signOut.mockRejectedValue(
        new Error('Connection lost')
      );

      const result = await authService.signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection lost');
    });
  });

  describe('getUserData', () => {
    beforeEach(() => {
      // Re-mock the validation schema for these tests
      jest.doMock('@/lib/validation/schemas/users', () => ({
        userSchema: {
          safeParse: jest.fn(data => ({ success: true, data })),
        },
      }));
    });

    test('should fetch user profile data', async () => {
      const mockUserData: Tables<'users'> = {
        id: 'profile-123',
        auth_id: 'user-123',
        username: 'testuser',
        full_name: 'Test User',
        avatar_url: null,
        bio: 'Test bio',
        city: 'Test City',
        land: 'Test Land',
        region: 'Test Region',
        experience_points: 100,
        role: 'user',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login_at: '2024-01-01T00:00:00Z',
        profile_visibility: 'public',
        achievements_visibility: 'public',
        submissions_visibility: 'public',
      };

      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUserData,
          error: null,
        }),
      };

      global.mockSupabaseClient.from.mockReturnValue(mockFromChain);

      const result = await authService.getUserData('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(global.mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockFromChain.eq).toHaveBeenCalledWith('auth_id', 'user-123');
    });

    test('should handle user not found', async () => {
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('User not found'),
        }),
      };

      global.mockSupabaseClient.from.mockReturnValue(mockFromChain);

      const result = await authService.getUserData('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    test('should handle validation errors', async () => {
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { invalid: 'data' },
          error: null,
        }),
      };

      global.mockSupabaseClient.from.mockReturnValue(mockFromChain);

      // Re-import modules to get new mock
      jest.resetModules();
      jest.doMock('@/lib/validation/schemas/users', () => ({
        userSchema: {
          safeParse: jest.fn(() => ({ 
            success: false, 
            error: new Error('Validation failed') 
          })),
        },
      }));

      const authServiceModule = await import('@/services/auth.service');
      const { authService: testAuthService } = authServiceModule;

      const result = await testAuthService.getUserData('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid user data format');
    });

    test('should handle unexpected errors', async () => {
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      global.mockSupabaseClient.from.mockReturnValue(mockFromChain);

      const result = await authService.getUserData('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('updateUserData', () => {
    beforeEach(() => {
      // Re-mock the validation schema for these tests
      jest.doMock('@/lib/validation/schemas/users', () => ({
        userSchema: {
          safeParse: jest.fn(data => ({ success: true, data })),
        },
      }));
    });

    test('should update user data successfully', async () => {
      const updates = {
        username: 'updateduser',
        full_name: 'Updated User',
        bio: 'New bio',
      };
      const mockUpdatedData: Tables<'users'> = {
        id: 'profile-123',
        auth_id: 'user-123',
        username: 'updateduser',
        full_name: 'Updated User',
        bio: 'New bio',
        avatar_url: null,
        city: null,
        land: null,
        region: null,
        experience_points: 100,
        role: 'user',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        last_login_at: '2024-01-01T00:00:00Z',
        profile_visibility: 'public',
        achievements_visibility: 'public',
        submissions_visibility: 'public',
      };

      const mockFromChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUpdatedData,
          error: null,
        }),
      };

      global.mockSupabaseClient.from.mockReturnValue(mockFromChain);

      const result = await authService.updateUserData('user-123', updates);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockFromChain.update).toHaveBeenCalledWith({
        ...updates,
        updated_at: expect.any(String),
      });
    });

    test('should handle update errors', async () => {
      const updates = { username: 'taken' };
      const mockFromChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Username already taken'),
        }),
      };

      global.mockSupabaseClient.from.mockReturnValue(mockFromChain);

      const result = await authService.updateUserData('user-123', updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Username already taken');
    });

    test('should handle validation errors after update', async () => {
      const updates = { username: 'newusername' };
      const mockFromChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { invalid: 'data' },
          error: null,
        }),
      };

      global.mockSupabaseClient.from.mockReturnValue(mockFromChain);

      // Re-import modules to get new mock
      jest.resetModules();
      jest.doMock('@/lib/validation/schemas/users', () => ({
        userSchema: {
          safeParse: jest.fn(() => ({ 
            success: false, 
            error: new Error('Validation failed') 
          })),
        },
      }));

      const authServiceModule = await import('@/services/auth.service');
      const { authService: testAuthService } = authServiceModule;

      const result = await testAuthService.updateUserData('user-123', updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid user data format');
    });

    test('should handle unexpected errors during update', async () => {
      const updates = { username: 'newusername' };
      const mockFromChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      global.mockSupabaseClient.from.mockReturnValue(mockFromChain);

      const result = await authService.updateUserData('user-123', updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('resetPassword', () => {
    test('should send password reset email', async () => {
      global.mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        error: null,
      });

      const result = await authService.resetPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(
        global.mockSupabaseClient.auth.resetPasswordForEmail
      ).toHaveBeenCalledWith('test@example.com');
    });

    test('should handle password reset errors', async () => {
      const mockError: AuthError = {
        message: 'User not found',
        status: 404,
        name: 'AuthError',
      } as AuthError;

      global.mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        error: mockError,
      });

      const result = await authService.resetPassword('nonexistent@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    test('should handle unexpected errors during password reset', async () => {
      global.mockSupabaseClient.auth.resetPasswordForEmail.mockRejectedValue(
        new Error('Service unavailable')
      );

      const result = await authService.resetPassword('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service unavailable');
    });
  });

  describe('updatePassword', () => {
    test('should update password successfully', async () => {
      global.mockSupabaseClient.auth.updateUser.mockResolvedValue({
        error: null,
      });

      const result = await authService.updatePassword('NewPassword123!');

      expect(result.success).toBe(true);
      expect(global.mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: 'NewPassword123!',
      });
    });

    test('should handle password update errors', async () => {
      const mockError: AuthError = {
        message: 'Password requirements not met',
        status: 400,
        name: 'AuthError',
      } as AuthError;

      global.mockSupabaseClient.auth.updateUser.mockResolvedValue({
        error: mockError,
      });

      const result = await authService.updatePassword('weak');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password requirements not met');
    });

    test('should handle unexpected errors during password update', async () => {
      global.mockSupabaseClient.auth.updateUser.mockRejectedValue(
        new Error('Session expired')
      );

      const result = await authService.updatePassword('NewPassword123!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session expired');
    });
  });

  describe('onAuthStateChange', () => {
    test('should subscribe to auth state changes', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();

      global.mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
        error: null,
      });

      const result = authService.onAuthStateChange(mockCallback);

      expect(
        global.mockSupabaseClient.auth.onAuthStateChange
      ).toHaveBeenCalledWith(expect.any(Function));
      expect(result.unsubscribe).toBeDefined();

      // Test unsubscribe
      result.unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    test('should handle auth state changes with session', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();

      global.mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
        error: null,
      });

      authService.onAuthStateChange(mockCallback);

      // Get the callback that was passed to onAuthStateChange
      const authStateCallback = global.mockSupabaseClient.auth.onAuthStateChange.mock.calls[0][0];

      // Test with session
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
        access_token: 'token-123',
      };

      authStateCallback('SIGNED_IN', mockSession);

      expect(mockCallback).toHaveBeenCalledWith('SIGNED_IN', {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      });
    });

    test('should handle auth state changes with null session', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();

      global.mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
        error: null,
      });

      authService.onAuthStateChange(mockCallback);

      // Get the callback that was passed to onAuthStateChange
      const authStateCallback = global.mockSupabaseClient.auth.onAuthStateChange.mock.calls[0][0];

      // Test with null session (covers lines 452-453)
      authStateCallback('SIGNED_OUT', null);

      expect(mockCallback).toHaveBeenCalledWith('SIGNED_OUT', null);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      global.mockSupabaseClient.auth.getSession.mockRejectedValue(
        new Error('Network error')
      );

      const result = await authService.getSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    test('should handle unexpected errors', async () => {
      global.mockSupabaseClient.auth.getUser.mockRejectedValue(
        'Unexpected error'
      );

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });
  });
});
