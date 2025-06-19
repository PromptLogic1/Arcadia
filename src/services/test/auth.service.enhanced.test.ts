/**
 * Enhanced Auth Service Tests - Coverage Improvement
 *
 * Targeting specific uncovered lines to improve coverage from 57.98% to 75%+
 * Lines targeted: 91-94, 148-151, 158-165, 192, 208-285, 306-379, 392-395,
 * 400-407, 422-425, 430-437, 452-455
 */

import { authService } from '../auth.service';
import {
  createMockSupabaseClient,
  setupSupabaseMock,
  createSupabaseSuccessResponse,
  createSupabaseErrorResponse,
} from '@/lib/test/mocks/supabase.mock';
import { factories } from '@/lib/test/factories';
import { log } from '@/lib/logger';
import { userSchema } from '@/lib/validation/schemas/users';
import { transformDbUserToUserData } from '@/lib/stores/auth-store';

// Mock all dependencies
jest.mock('@/lib/logger', () => ({
  log: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/validation/schemas/users', () => ({
  userSchema: {
    safeParse: jest.fn(),
  },
}));

jest.mock('@/lib/stores/auth-store', () => ({
  transformDbUserToUserData: jest.fn(),
}));

import { createClient } from '@/lib/supabase';
import type {
  SignInCredentials,
  SignUpCredentials,
  UserUpdateData,
} from '../auth.service';

describe('AuthService - Enhanced Coverage Tests', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    setupSupabaseMock(mockSupabase);

    // Default mock behaviors
    (userSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: factories.user(),
    });
    (transformDbUserToUserData as jest.Mock).mockImplementation(user => user);
  });

  describe('getCurrentUser Error Handling - Lines 91-94', () => {
    it('should handle authentication errors when getting current user', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const authError = new Error('Authentication failed');

      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: authError,
      });

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get current user',
        authError,
        {
          metadata: { service: 'auth.service', method: 'getCurrentUser' },
        }
      );
    });

    it('should return null when no user is authenticated', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle user with missing metadata gracefully', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            phone: null,
            user_metadata: {}, // Empty metadata
            app_metadata: {}, // Empty metadata
          } as any,
        },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        phone: null,
        auth_username: null,
        username: null,
        avatar_url: null,
        provider: null,
        userRole: 'user',
      });
    });
  });

  describe('getUserData Validation Errors - Lines 148-151', () => {
    it('should handle user data validation failures', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const userData = { id: 'user-123', invalid_field: 'value' };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(userData)),
      });

      (userSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await authService.getUserData('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid user data format');
      expect(log.error).toHaveBeenCalledWith(
        'User data validation failed',
        expect.any(Error),
        {
          metadata: {
            service: 'auth.service',
            method: 'getUserData',
            userId: 'user-123',
          },
        }
      );
    });

    it('should successfully transform valid user data', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const userData = factories.user({ auth_id: 'user-123' });
      const transformedData = { ...userData, transformed: true };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(userData)),
      });

      (userSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: userData,
      });

      (transformDbUserToUserData as jest.Mock).mockReturnValue(transformedData);

      const result = await authService.getUserData('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(transformedData);
      expect(transformDbUserToUserData).toHaveBeenCalledWith(userData);
    });
  });

  describe('getUserData Error Handling - Lines 158-165', () => {
    it('should handle database errors when fetching user data', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const dbError = new Error('Database connection failed');

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      });

      const result = await authService.getUserData('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get user data',
        dbError,
        {
          metadata: {
            service: 'auth.service',
            method: 'getUserData',
            userId: 'user-123',
          },
        }
      );
    });

    it('should handle unexpected errors in getUserData', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        }),
      });

      const result = await authService.getUserData('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error getting user data',
        expect.any(Error),
        {
          metadata: {
            service: 'auth.service',
            method: 'getUserData',
            userId: 'user-123',
          },
        }
      );
    });
  });

  describe('signIn No User Edge Case - Line 192', () => {
    it('should handle missing user in sign in response', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const credentials: SignInCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No user returned from sign in');
    });

    it('should successfully sign in user with full metadata', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const credentials: SignInCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        phone: '+1234567890',
        user_metadata: {
          username: 'testuser',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        app_metadata: {
          provider: 'email',
        },
      };

      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: {} as any },
        error: null,
      });

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(true);
      expect(result.data?.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        phone: '+1234567890',
        auth_username: 'testuser',
        username: 'testuser',
        avatar_url: 'https://example.com/avatar.jpg',
        provider: 'email',
        userRole: 'user',
      });
    });
  });

  describe('signIn Error Handling - Lines 208-285', () => {
    it('should handle authentication errors during sign in', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const credentials: SignInCredentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const authError = new Error('Invalid credentials');
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: authError,
      });

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(log.error).toHaveBeenCalledWith('Sign in failed', authError, {
        metadata: {
          service: 'auth.service',
          method: 'signIn',
          email: 'test@example.com',
        },
      });
    });

    it('should handle unexpected errors during sign in', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const credentials: SignInCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuth.signInWithPassword.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error during sign in',
        expect.any(Error),
        {
          metadata: {
            service: 'auth.service',
            method: 'signIn',
            email: 'test@example.com',
          },
        }
      );
    });

    it('should handle non-Error objects in sign in', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const credentials: SignInCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuth.signInWithPassword.mockImplementation(() => {
        throw 'String error';
      });

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });
  });

  describe('signUp Error Handling - Lines 273-285', () => {
    it('should handle authentication errors during sign up', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const credentials: SignUpCredentials = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      };

      const authError = new Error('Email already exists');
      mockAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: authError,
      });

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already exists');
      expect(log.error).toHaveBeenCalledWith('Sign up failed', authError, {
        metadata: {
          service: 'auth.service',
          method: 'signUp',
          email: 'test@example.com',
        },
      });
    });

    it('should handle missing user in sign up response', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const credentials: SignUpCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No user returned from sign up');
    });

    it('should handle email verification requirement', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const credentials: SignUpCredentials = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      };

      const unconfirmedUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: null, // Email not confirmed
        user_metadata: { username: 'testuser' },
        app_metadata: { provider: 'email' },
      };

      mockAuth.signUp.mockResolvedValue({
        data: { user: unconfirmedUser, session: null },
        error: null,
      });

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(true);
      expect(result.data?.needsVerification).toBe(true);
      expect(result.data?.user).toBeUndefined();
    });

    it('should handle unexpected errors during sign up', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const credentials: SignUpCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuth.signUp.mockImplementation(() => {
        throw new Error('Network timeout');
      });

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error during sign up',
        expect.any(Error),
        {
          metadata: {
            service: 'auth.service',
            method: 'signUp',
            email: 'test@example.com',
          },
        }
      );
    });
  });

  describe('signOut Error Handling - Lines 306-315', () => {
    it('should handle sign out errors', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const signOutError = new Error('Sign out failed');

      mockAuth.signOut.mockResolvedValue({
        error: signOutError,
      });

      const result = await authService.signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sign out failed');
      expect(log.error).toHaveBeenCalledWith('Sign out failed', signOutError, {
        metadata: { service: 'auth.service', method: 'signOut' },
      });
    });

    it('should handle unexpected errors during sign out', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.signOut.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await authService.signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error during sign out',
        expect.any(Error),
        {
          metadata: { service: 'auth.service', method: 'signOut' },
        }
      );
    });

    it('should successfully sign out user', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.signOut.mockResolvedValue({
        error: null,
      });

      const result = await authService.signOut();

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });
  });

  describe('updateUserData Error Handling - Lines 367-379', () => {
    it('should handle database errors during user data update', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const updateData: UserUpdateData = {
        username: 'newusername',
        full_name: 'New Name',
      };

      const dbError = new Error('Update constraint violation');
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      });

      const result = await authService.updateUserData('user-123', updateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update constraint violation');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to update user data',
        dbError,
        {
          metadata: {
            service: 'auth.service',
            method: 'updateUserData',
            userId: 'user-123',
          },
        }
      );
    });

    it('should handle validation errors after user data update', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const updateData: UserUpdateData = {
        username: 'newusername',
      };

      const updatedData = { id: 'user-123', invalid_field: 'value' };
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(updatedData)),
      });

      (userSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await authService.updateUserData('user-123', updateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid user data format');
      expect(log.error).toHaveBeenCalledWith(
        'Updated user data validation failed',
        expect.any(Error),
        {
          metadata: {
            service: 'auth.service',
            method: 'updateUserData',
            userId: 'user-123',
          },
        }
      );
    });

    it('should handle unexpected errors during user data update', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const updateData: UserUpdateData = {
        username: 'newusername',
      };

      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          throw new Error('Network error');
        }),
      });

      const result = await authService.updateUserData('user-123', updateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error updating user data',
        expect.any(Error),
        {
          metadata: {
            service: 'auth.service',
            method: 'updateUserData',
            userId: 'user-123',
          },
        }
      );
    });

    it('should successfully update user data', async () => {
      const mockFrom = mockSupabase.from as jest.Mock;
      const updateData: UserUpdateData = {
        username: 'newusername',
        full_name: 'New Name',
        bio: 'Updated bio',
      };

      const updatedUser = factories.user({
        auth_id: 'user-123',
        username: 'newusername',
        full_name: 'New Name',
        bio: 'Updated bio',
      });

      const transformedData = { ...updatedUser, transformed: true };

      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(updatedUser)),
      });

      (userSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: updatedUser,
      });

      (transformDbUserToUserData as jest.Mock).mockReturnValue(transformedData);

      const result = await authService.updateUserData('user-123', updateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(transformedData);
    });
  });

  describe('resetPassword Error Handling - Lines 392-407', () => {
    it('should handle password reset errors', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const resetError = new Error('Invalid email address');

      mockAuth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: resetError,
      });

      const result = await authService.resetPassword('invalid@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address');
      expect(log.error).toHaveBeenCalledWith(
        'Password reset failed',
        resetError,
        {
          metadata: {
            service: 'auth.service',
            method: 'resetPassword',
            email: 'invalid@example.com',
          },
        }
      );
    });

    it('should handle unexpected errors during password reset', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.resetPasswordForEmail.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await authService.resetPassword('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error during password reset',
        expect.any(Error),
        {
          metadata: {
            service: 'auth.service',
            method: 'resetPassword',
            email: 'test@example.com',
          },
        }
      );
    });

    it('should successfully initiate password reset', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await authService.resetPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });
  });

  describe('updatePassword Error Handling - Lines 422-437', () => {
    it('should handle password update errors', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const updateError = new Error('Password too weak');

      mockAuth.updateUser.mockResolvedValue({
        data: { user: null },
        error: updateError,
      });

      const result = await authService.updatePassword('weak');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password too weak');
      expect(log.error).toHaveBeenCalledWith(
        'Password update failed',
        updateError,
        {
          metadata: { service: 'auth.service', method: 'updatePassword' },
        }
      );
    });

    it('should handle unexpected errors during password update', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.updateUser.mockImplementation(() => {
        throw new Error('Session expired');
      });

      const result = await authService.updatePassword('newpassword123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session expired');
      expect(log.error).toHaveBeenCalledWith(
        'Unexpected error updating password',
        expect.any(Error),
        {
          metadata: { service: 'auth.service', method: 'updatePassword' },
        }
      );
    });

    it('should successfully update password', async () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;

      mockAuth.updateUser.mockResolvedValue({
        data: { user: {} as any },
        error: null,
      });

      const result = await authService.updatePassword('strongpassword123');

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });
  });

  describe('onAuthStateChange - Lines 452-455', () => {
    it('should handle auth state changes with session', () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const mockCallback = jest.fn();

      const mockSubscription = {
        unsubscribe: jest.fn(),
      };

      mockAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockSubscription },
      });

      const { unsubscribe } = authService.onAuthStateChange(mockCallback);

      // Simulate auth state change with session
      const authStateCallback = mockAuth.onAuthStateChange.mock.calls[0][0];
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      };

      authStateCallback('SIGNED_IN', mockSession as any);

      expect(mockCallback).toHaveBeenCalledWith('SIGNED_IN', {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      });

      // Test unsubscribe
      unsubscribe();
      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });

    it('should handle auth state changes without session', () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const mockCallback = jest.fn();

      const mockSubscription = {
        unsubscribe: jest.fn(),
      };

      mockAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockSubscription },
      });

      authService.onAuthStateChange(mockCallback);

      // Simulate auth state change without session
      const authStateCallback = mockAuth.onAuthStateChange.mock.calls[0][0];
      authStateCallback('SIGNED_OUT', null);

      expect(mockCallback).toHaveBeenCalledWith('SIGNED_OUT', null);
    });

    it('should handle auth state changes with session missing email', () => {
      const mockAuth = mockSupabase.auth as jest.Mocked<
        typeof mockSupabase.auth
      >;
      const mockCallback = jest.fn();

      const mockSubscription = {
        unsubscribe: jest.fn(),
      };

      mockAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockSubscription },
      });

      authService.onAuthStateChange(mockCallback);

      // Simulate auth state change with session but no email
      const authStateCallback = mockAuth.onAuthStateChange.mock.calls[0][0];
      const mockSession = {
        user: {
          id: 'user-123',
          email: null,
        },
      };

      authStateCallback('TOKEN_REFRESHED', mockSession as any);

      expect(mockCallback).toHaveBeenCalledWith('TOKEN_REFRESHED', {
        user: {
          id: 'user-123',
          email: null,
        },
      });
    });
  });
});
