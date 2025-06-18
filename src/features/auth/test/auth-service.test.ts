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

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { authService } from '@/services/auth.service';
import { createClient } from '@/lib/supabase';
import type { ServiceResponse } from '@/lib/service-types';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  log: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Auth Service', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabaseClient = {
      auth: {
        getSession: jest.fn(),
        getUser: jest.fn(),
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        resetPasswordForEmail: jest.fn(),
        updateUser: jest.fn(),
        onAuthStateChange: jest.fn(),
      },
      from: jest.fn(),
    };

    // Mock createClient to return our mock client
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getSession', () => {
    test('should return session when available', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'token-123',
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await authService.getSession();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSession);
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalledTimes(1);
    });

    test('should return null when no session', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await authService.getSession();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    test('should handle errors gracefully', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      });

      const result = await authService.getSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getCurrentUser', () => {
    test('should return authenticated user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        phone: null,
        user_metadata: { username: 'testuser', avatar_url: 'https://example.com/avatar.jpg' },
        app_metadata: { provider: 'email' },
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
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
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('signIn', () => {
    test('should sign in user with valid credentials', async () => {
      const credentials = { email: 'test@example.com', password: 'Test123!' };
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { username: 'testuser' },
        app_metadata: { provider: 'email' },
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token-123' } },
        error: null,
      });

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(true);
      expect(result.data?.user).toMatchObject({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      });
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith(credentials);
    });

    test('should handle invalid credentials', async () => {
      const credentials = { email: 'test@example.com', password: 'wrong' };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      });

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid login credentials');
    });

    test('should handle rate limiting', async () => {
      const credentials = { email: 'test@example.com', password: 'Test123!' };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Too many login attempts. Please try again later.' },
      });

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Too many login attempts. Please try again later.');
    });
  });

  describe('signUp', () => {
    test('should sign up new user', async () => {
      const credentials = {
        email: 'new@example.com',
        password: 'Test123!',
        username: 'newuser',
      };

      const mockUser = {
        id: 'user-123',
        email: 'new@example.com',
        email_confirmed_at: null,
        user_metadata: { username: 'newuser' },
        app_metadata: { provider: 'email' },
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(true);
      expect(result.data?.needsVerification).toBe(true);
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: { username: credentials.username },
        },
      });
    });

    test('should handle already registered email', async () => {
      const credentials = {
        email: 'existing@example.com',
        password: 'Test123!',
        username: 'existinguser',
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'User already registered' },
      });

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User already registered');
    });

    test('should return user if email already confirmed', async () => {
      const credentials = {
        email: 'confirmed@example.com',
        password: 'Test123!',
      };

      const mockUser = {
        id: 'user-123',
        email: 'confirmed@example.com',
        email_confirmed_at: '2024-01-01T00:00:00Z',
        user_metadata: {},
        app_metadata: { provider: 'email' },
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(true);
      expect(result.data?.user).toBeDefined();
      expect(result.data?.needsVerification).toBeUndefined();
    });
  });

  describe('signOut', () => {
    test('should sign out user successfully', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      const result = await authService.signOut();

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledTimes(1);
    });

    test('should handle sign out errors', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: 'Failed to sign out' },
      });

      const result = await authService.signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to sign out');
    });
  });

  describe('getUserData', () => {
    test('should fetch user profile data', async () => {
      const mockUserData = {
        id: 'profile-123',
        auth_id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
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
        single: jest.fn<any[], any>().mockResolvedValue({
          data: mockUserData,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromChain);

      const result = await authService.getUserData('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockFromChain.eq).toHaveBeenCalledWith('auth_id', 'user-123');
    });

    test('should handle user not found', async () => {
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn<any[], any>().mockResolvedValue({
          data: null,
          error: { message: 'User not found' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromChain);

      const result = await authService.getUserData('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('resetPassword', () => {
    test('should send password reset email', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        error: null,
      });

      const result = await authService.resetPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
    });

    test('should handle rate limiting for password reset', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        error: { message: 'Too many password reset attempts' },
      });

      const result = await authService.resetPassword('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Too many password reset attempts');
    });
  });

  describe('updatePassword', () => {
    test('should update password successfully', async () => {
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        error: null,
      });

      const result = await authService.updatePassword('NewPassword123!');

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: 'NewPassword123!',
      });
    });

    test('should handle weak password', async () => {
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        error: { message: 'Password is too weak' },
      });

      const result = await authService.updatePassword('weak');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password is too weak');
    });
  });

  describe('onAuthStateChange', () => {
    test('should subscribe to auth state changes', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      
      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      const result = authService.onAuthStateChange(mockCallback);

      expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalledWith(
        expect.any(Function)
      );
      expect(result.unsubscribe).toBeDefined();

      // Test unsubscribe
      result.unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockSupabaseClient.auth.getSession.mockRejectedValue(new Error('Network error'));

      const result = await authService.getSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    test('should handle unexpected errors', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue('Unexpected error');

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });
  });
});