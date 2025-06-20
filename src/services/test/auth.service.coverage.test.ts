/**
 * @jest-environment jsdom
 * 
 * Auth Service Coverage Tests - Edge Case Validation
 *
 * Supplementary tests to validate edge cases and ensure robust error handling.
 * These tests complement the existing comprehensive test suite.
 */

import type {
  SignUpCredentials,
  UserUpdateData,
} from '../auth.service';
import type { Tables } from '../../../types/database.types';
import { AuthError } from '@supabase/auth-js';

// Mock logger
jest.mock('../../lib/logger', () => ({
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock validation schema
jest.mock('../../lib/validation/schemas/users', () => ({
  userSchema: {
    safeParse: jest.fn(),
  },
}));

// Mock transform function
jest.mock('../../lib/stores/auth-store', () => ({
  transformDbUserToUserData: jest.fn(),
}));

// Mock Supabase for coverage tests
const mockSupabaseAuth = {
  getSession: jest.fn(),
  getUser: jest.fn(),
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  updateUser: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  onAuthStateChange: jest.fn(),
  signInWithOAuth: jest.fn(),
  exchangeCodeForSession: jest.fn(),
};

const mockSupabaseFrom = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  update: jest.fn().mockReturnThis(),
});

jest.mock('../../lib/supabase', () => ({
  createClient: jest.fn(() => ({
    auth: mockSupabaseAuth,
    from: mockSupabaseFrom,
  })),
}));

// Clear the global auth service mock for this test file
jest.unmock('../auth.service');

import { authService } from '../auth.service';
import { log } from '../../lib/logger';
import { userSchema } from '../../lib/validation/schemas/users';
import { transformDbUserToUserData } from '../../lib/stores/auth-store';

const mockLog = log as jest.Mocked<typeof log>;

describe('AuthService - Coverage Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock window.location for OAuth tests
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://production.app' },
      writable: true,
    });

    // Reset default mock responses
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockSupabaseAuth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
    mockSupabaseAuth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
    mockSupabaseAuth.signOut.mockResolvedValue({ error: null });
    mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    });
    mockSupabaseAuth.updateUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockSupabaseAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    mockSupabaseAuth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: null,
    });
    mockSupabaseAuth.exchangeCodeForSession.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });

    // Default validation behavior
    (userSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: {},
    });
    (transformDbUserToUserData as jest.Mock).mockImplementation(user => user);

    // Reset database query mocks
    const mockQueryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
    };
    mockSupabaseFrom.mockReturnValue(mockQueryChain);
  });

  describe('OAuth Provider Edge Cases', () => {
    it('should handle OAuth redirectTo URL construction with different origins', async () => {
      const mockOAuthUrl = 'https://oauth.provider.com/authorize?test=123';
      
      mockSupabaseAuth.signInWithOAuth.mockResolvedValue({
        data: { url: mockOAuthUrl },
        error: null,
      });

      const result = await authService.signInWithOAuth('google');

      expect(result.success).toBe(true);
      expect(result.data?.url).toBe(mockOAuthUrl);
      expect(result.data?.provider).toBe('google');
      expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'https://production.app/auth/callback/google',
        },
      });
    });

    it('should properly truncate long OAuth codes in error logs', async () => {
      const longCode = 'very_long_authorization_code_that_should_be_truncated_for_security';
      const error = new AuthError('Invalid code', 400, 'INVALID_CODE');
      
      mockSupabaseAuth.exchangeCodeForSession.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      const result = await authService.exchangeCodeForSession(longCode);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid code');
      expect(mockLog.error).toHaveBeenCalledWith(
        'OAuth code exchange failed',
        error,
        {
          metadata: {
            service: 'auth.service',
            method: 'exchangeCodeForSession',
            code: 'very_long_...', // First 10 chars + ...
          },
        }
      );
    });
  });

  describe('User Data Transformation Edge Cases', () => {
    it('should handle updateUserData with updated_at timestamp injection', async () => {
      const updates: UserUpdateData = {
        username: 'updated_user',
        bio: 'Updated bio',
      };

      const mockUserData: Tables<'users'> = {
        id: 'profile-123',
        auth_id: 'user-123',
        username: 'updated_user',
        full_name: null,
        avatar_url: null,
        bio: 'Updated bio',
        city: null,
        land: null,
        region: null,
        experience_points: 0,
        role: 'user',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-06-20T12:00:00Z',
        last_login_at: null,
        profile_visibility: 'public',
        achievements_visibility: 'public',
        submissions_visibility: 'public',
      };

      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUserData, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockFrom);
      (userSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockUserData,
      });
      (transformDbUserToUserData as jest.Mock).mockReturnValue(mockUserData);

      const result = await authService.updateUserData('user-123', updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUserData);
      
      // Verify updated_at timestamp is injected
      expect(mockFrom.update).toHaveBeenCalledWith({
        username: 'updated_user',
        bio: 'Updated bio',
        updated_at: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
      });
    });

    it('should handle getUserData with special characters in userId', async () => {
      const specialUserId = 'user-123@#$%^&*()_+-=[]{}|;:,.<>?';
      const mockUserData: Tables<'users'> = {
        id: 'profile-special',
        auth_id: specialUserId,
        username: 'special_user',
        full_name: 'Special User',
        avatar_url: null,
        bio: null,
        city: null,
        land: null,
        region: null,
        experience_points: 0,
        role: 'user',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login_at: null,
        profile_visibility: 'public',
        achievements_visibility: 'public',
        submissions_visibility: 'public',
      };

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUserData, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockFrom);
      (userSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockUserData,
      });
      (transformDbUserToUserData as jest.Mock).mockReturnValue(mockUserData);

      const result = await authService.getUserData(specialUserId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUserData);
      expect(mockFrom.eq).toHaveBeenCalledWith('auth_id', specialUserId);
    });
  });

  describe('Auth State Management Edge Cases', () => {
    it('should handle signUp without username and verify options structure', async () => {
      const credentials: SignUpCredentials = {
        email: 'nouser@example.com',
        password: 'password123',
        // username is undefined
      };

      const mockUser = {
        id: 'user-nouser',
        email: 'nouser@example.com',
        email_confirmed_at: '2024-01-01T00:00:00Z',
        user_metadata: {},
        app_metadata: { provider: 'email' },
      };

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      });

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(true);
      expect(result.data?.user).toEqual({
        id: 'user-nouser',
        email: 'nouser@example.com',
        phone: null,
        auth_username: null,
        username: null,
        avatar_url: null,
        provider: 'email',
        userRole: 'user',
      });
      
      // Verify the options structure passed to Supabase
      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: 'nouser@example.com',
        password: 'password123',
        options: {
          data: {
            username: undefined,
          },
        },
      });
    });

    it('should handle getCurrentUser with extensive user metadata', async () => {
      const mockUser = {
        id: 'user-extensive',
        email: 'extensive@example.com',
        phone: '+1-555-9999',
        user_metadata: {
          username: 'extensive_user',
          avatar_url: 'https://cdn.example.com/avatars/extensive.jpg',
          full_name: 'Extensive User Name',
          // Extra metadata that should be ignored
          preferences: { theme: 'dark' },
          settings: { notifications: true },
        },
        app_metadata: {
          provider: 'github',
          roles: ['user', 'beta'],
          custom_claims: { verified: true },
        },
      };

      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'user-extensive',
        email: 'extensive@example.com',
        phone: '+1-555-9999',
        auth_username: 'extensive_user',
        username: 'extensive_user',
        avatar_url: 'https://cdn.example.com/avatars/extensive.jpg',
        provider: 'github',
        userRole: 'user',
      });
    });
  });

  describe('Auth State Change Subscription Edge Cases', () => {
    it('should handle onAuthStateChange with proper session transformation', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      const mockSubscription = { unsubscribe: mockUnsubscribe };

      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockSubscription },
      });

      const { unsubscribe } = authService.onAuthStateChange(mockCallback);

      // Get the callback function that was passed to Supabase
      const authStateCallback = mockSupabaseAuth.onAuthStateChange.mock.calls[0][0];

      // Test with a complex session object
      const complexSession = {
        user: { 
          id: 'complex-user', 
          email: 'complex@example.com',
          // Additional properties that should be filtered out
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        access_token: 'token',
        refresh_token: 'refresh',
      };

      authStateCallback('SIGNED_IN', complexSession);

      expect(mockCallback).toHaveBeenCalledWith('SIGNED_IN', {
        user: { 
          id: 'complex-user', 
          email: 'complex@example.com' 
        },
      });

      // Test with null session
      authStateCallback('SIGNED_OUT', null);
      expect(mockCallback).toHaveBeenCalledWith('SIGNED_OUT', null);

      // Test unsubscribe functionality
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should handle onAuthStateChange with session containing null email', () => {
      const mockCallback = jest.fn();
      const mockSubscription = { unsubscribe: jest.fn() };

      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockSubscription },
      });

      authService.onAuthStateChange(mockCallback);

      const authStateCallback = mockSupabaseAuth.onAuthStateChange.mock.calls[0][0];
      
      // Test with session containing null email
      const sessionWithNullEmail = {
        user: { id: 'user-null-email', email: null },
      };
      authStateCallback('TOKEN_REFRESHED', sessionWithNullEmail);

      expect(mockCallback).toHaveBeenCalledWith('TOKEN_REFRESHED', {
        user: { id: 'user-null-email', email: null },
      });
    });
  });

  describe('Service Response Consistency', () => {
    it('should maintain consistent void response format across methods', async () => {
      // Test signOut
      mockSupabaseAuth.signOut.mockResolvedValue({ error: null });
      const signOutResult = await authService.signOut();
      expect(signOutResult.success).toBe(true);
      expect(signOutResult.data).toBeUndefined();

      // Test resetPassword
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });
      const resetResult = await authService.resetPassword('test@example.com');
      expect(resetResult.success).toBe(true);
      expect(resetResult.data).toBeUndefined();

      // Test updatePassword
      mockSupabaseAuth.updateUser.mockResolvedValue({
        data: { user: {} },
        error: null,
      });
      const updatePasswordResult = await authService.updatePassword('newpass');
      expect(updatePasswordResult.success).toBe(true);
      expect(updatePasswordResult.data).toBeUndefined();
    });
  });
});