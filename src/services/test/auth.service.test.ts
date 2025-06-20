/**
 * @jest-environment jsdom
 */

import type {
  SignInCredentials,
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

// Mock Supabase for this test file specifically
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

describe('AuthService - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock window.location for OAuth tests  
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true,
    });

    // Reset all auth mocks to default null state
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
    mockSupabaseAuth.signOut.mockResolvedValue({
      error: null,
    });
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

    // Reset database query mocks
    const mockQueryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
    };
    mockSupabaseFrom.mockReturnValue(mockQueryChain);

    // Default validation behavior
    (userSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: {},
    });
    (transformDbUserToUserData as jest.Mock).mockImplementation(user => user);
  });

  describe('getSession', () => {
    it('should return session when available', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'token',
      };

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await authService.getSession();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        user: { id: 'user-123', email: 'test@example.com' },
      });
    });

    it('should return null when no session exists', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await authService.getSession();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle session with null email', async () => {
      const mockSession = {
        user: { id: 'user-123', email: null },
        access_token: 'token',
      };

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await authService.getSession();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        user: { id: 'user-123', email: null },
      });
    });

    it('should handle session retrieval errors', async () => {
      const error = new AuthError('Session error', 400, 'SESSION_ERROR');
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error,
      });

      const result = await authService.getSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to get session',
        error,
        { metadata: { service: 'auth.service', method: 'getSession' } }
      );
    });

    it('should handle unexpected errors when getting session', async () => {
      mockSupabaseAuth.getSession.mockRejectedValue(new Error('Network error'));

      const result = await authService.getSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error getting session',
        expect.any(Error),
        { metadata: { service: 'auth.service', method: 'getSession' } }
      );
    });

    it('should handle non-Error objects when getting session', async () => {
      mockSupabaseAuth.getSession.mockRejectedValue('String error');

      const result = await authService.getSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error getting session',
        expect.any(Error), // isError converts non-Error to Error
        { metadata: { service: 'auth.service', method: 'getSession' } }
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return authenticated user with all metadata', async () => {
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

      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
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

    it('should handle user with missing metadata', async () => {
      const mockUser = {
        id: 'user-123',
        email: null,
        phone: null,
        user_metadata: {},
        app_metadata: {},
      };

      mockSupabaseAuth.getUser.mockResolvedValue({
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

    it('should return null when no user is authenticated', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle authentication errors', async () => {
      const error = new AuthError('Auth error', 401, 'AUTH_ERROR');
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error,
      });

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Auth error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to get current user',
        error,
        { metadata: { service: 'auth.service', method: 'getCurrentUser' } }
      );
    });

    it('should handle unexpected errors', async () => {
      mockSupabaseAuth.getUser.mockRejectedValue(new Error('Unexpected'));

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error getting current user',
        expect.any(Error),
        { metadata: { service: 'auth.service', method: 'getCurrentUser' } }
      );
    });

    it('should handle non-Error objects when getting current user', async () => {
      mockSupabaseAuth.getUser.mockRejectedValue({ message: 'Object error' });

      const result = await authService.getCurrentUser();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Object error'); // getErrorMessage extracts message property
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error getting current user',
        expect.any(Error), // isError converts non-Error to Error
        { metadata: { service: 'auth.service', method: 'getCurrentUser' } }
      );
    });
  });

  describe('getUserData', () => {
    const mockUserData: Tables<'users'> = {
      id: 'profile-123',
      auth_id: 'user-123',
      username: 'testuser',
      full_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
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

    it('should fetch and transform user data successfully', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: mockUserData, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockFrom);
      (userSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockUserData,
      });
      (transformDbUserToUserData as jest.Mock).mockReturnValue(
        mockUserData as any
      );

      const result = await authService.getUserData('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUserData);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('users');
      expect(mockFrom.eq).toHaveBeenCalledWith('auth_id', 'user-123');
    });

    it('should handle database errors', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new AuthError('Database error', 500, 'DB_ERROR'),
        }),
      };

      mockSupabaseFrom.mockReturnValue(mockFrom);

      const result = await authService.getUserData('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to get user data',
        new AuthError('Database error', 500, 'DB_ERROR'),
        {
          metadata: {
            service: 'auth.service',
            method: 'getUserData',
            userId: 'user-123',
          },
        }
      );
    });

    it('should handle validation failures', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: { invalid: 'data' }, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockFrom);
      (userSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await authService.getUserData('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid user data format');
      expect(mockLog.error).toHaveBeenCalledWith(
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

    it('should handle unexpected errors', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Unexpected')),
      };

      mockSupabaseFrom.mockReturnValue(mockFrom);

      const result = await authService.getUserData('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected');
      expect(mockLog.error).toHaveBeenCalledWith(
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

    it('should handle non-Error objects', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue('String error'),
      };

      mockSupabaseFrom.mockReturnValue(mockFrom);

      const result = await authService.getUserData('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });
  });

  describe('signIn', () => {
    const credentials: SignInCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should sign in user successfully', async () => {
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

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: {} },
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

    it('should handle missing user in response', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No user returned from sign in');
    });

    it('should handle user with undefined optional properties', async () => {
      const mockUser = {
        id: 'user-123',
        email: undefined,
        phone: undefined,
        user_metadata: {},
        app_metadata: {},
      };

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      });

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(true);
      expect(result.data?.user).toEqual({
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

    it('should handle authentication errors', async () => {
      const error = new AuthError('Invalid credentials', 401, 'INVALID_CREDS');
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(mockLog.error).toHaveBeenCalledWith('Sign in failed', error, {
        metadata: {
          service: 'auth.service',
          method: 'signIn',
          email: 'test@example.com',
        },
      });
    });

    it('should handle unexpected errors', async () => {
      mockSupabaseAuth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      );

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(mockLog.error).toHaveBeenCalledWith(
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

    it('should handle non-Error objects during sign in', async () => {
      mockSupabaseAuth.signInWithPassword.mockRejectedValue('String error');

      const result = await authService.signIn(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });
  });

  describe('signUp', () => {
    const credentials: SignUpCredentials = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser',
    };

    it('should sign up user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: '2024-01-01T00:00:00Z',
        user_metadata: {
          username: 'testuser',
        },
        app_metadata: {
          provider: 'email',
        },
      };

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      });

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(true);
      expect(result.data?.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        phone: null,
        auth_username: 'testuser',
        username: 'testuser',
        avatar_url: null,
        provider: 'email',
        userRole: 'user',
      });
    });

    it('should handle email verification requirement', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: null,
        user_metadata: { username: 'testuser' },
      };

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(true);
      expect(result.data?.needsVerification).toBe(true);
      expect(result.data?.user).toBeUndefined();
    });

    it('should handle confirmed user with undefined optional properties', async () => {
      const mockUser = {
        id: 'user-123',
        email: undefined,
        phone: undefined,
        email_confirmed_at: '2024-01-01T00:00:00Z',
        user_metadata: {},
        app_metadata: {},
      };

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      });

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(true);
      expect(result.data?.user).toEqual({
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

    it('should handle missing user in response', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No user returned from sign up');
    });

    it('should handle sign up errors', async () => {
      const error = new AuthError('Email already exists', 409, 'EMAIL_EXISTS');
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already exists');
      expect(mockLog.error).toHaveBeenCalledWith('Sign up failed', error, {
        metadata: {
          service: 'auth.service',
          method: 'signUp',
          email: 'test@example.com',
        },
      });
    });

    it('should handle unexpected errors during sign up', async () => {
      mockSupabaseAuth.signUp.mockRejectedValue(new Error('Network error'));

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(mockLog.error).toHaveBeenCalledWith(
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

    it('should handle non-Error objects during sign up', async () => {
      mockSupabaseAuth.signUp.mockRejectedValue('String error');

      const result = await authService.signUp(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error during sign up',
        expect.any(Error), // isError converts non-Error to Error
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

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockSupabaseAuth.signOut.mockResolvedValue({ error: null });

      const result = await authService.signOut();

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });

    it('should handle sign out errors', async () => {
      const error = new AuthError('Sign out failed', 500, 'SIGNOUT_ERROR');
      mockSupabaseAuth.signOut.mockResolvedValue({ error });

      const result = await authService.signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sign out failed');
      expect(mockLog.error).toHaveBeenCalledWith('Sign out failed', error, {
        metadata: { service: 'auth.service', method: 'signOut' },
      });
    });

    it('should handle unexpected errors during sign out', async () => {
      mockSupabaseAuth.signOut.mockRejectedValue(new Error('Unexpected'));

      const result = await authService.signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error during sign out',
        expect.any(Error),
        { metadata: { service: 'auth.service', method: 'signOut' } }
      );
    });

    it('should handle non-Error objects during sign out', async () => {
      mockSupabaseAuth.signOut.mockRejectedValue(123);

      const result = await authService.signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred'); // getErrorMessage returns this for numbers
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error during sign out',
        expect.any(Error), // isError converts non-Error to Error
        { metadata: { service: 'auth.service', method: 'signOut' } }
      );
    });
  });

  describe('updateUserData', () => {
    const updates: UserUpdateData = {
      username: 'newusername',
      full_name: 'New Name',
      bio: 'New bio',
    };

    const mockUserData: Tables<'users'> = {
      id: 'profile-123',
      auth_id: 'user-123',
      username: 'newusername',
      full_name: 'New Name',
      avatar_url: null,
      bio: 'New bio',
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

    it('should update user data successfully', async () => {
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: mockUserData, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockFrom);
      (userSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: mockUserData,
      });
      (transformDbUserToUserData as jest.Mock).mockReturnValue(
        mockUserData as any
      );

      const result = await authService.updateUserData('user-123', updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUserData);
      expect(mockFrom.update).toHaveBeenCalledWith({
        ...updates,
        updated_at: expect.any(String),
      });
    });

    it('should handle database errors during update', async () => {
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new AuthError('Update failed', 500, 'UPDATE_ERROR'),
        }),
      };

      mockSupabaseFrom.mockReturnValue(mockFrom);

      const result = await authService.updateUserData('user-123', updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to update user data',
        new AuthError('Update failed', 500, 'UPDATE_ERROR'),
        {
          metadata: {
            service: 'auth.service',
            method: 'updateUserData',
            userId: 'user-123',
          },
        }
      );
    });

    it('should handle validation errors after update', async () => {
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: { invalid: 'data' }, error: null }),
      };

      mockSupabaseFrom.mockReturnValue(mockFrom);
      (userSchema.safeParse as jest.Mock).mockReturnValue({
        success: false,
        error: new Error('Validation failed'),
      });

      const result = await authService.updateUserData('user-123', updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid user data format');
      expect(mockLog.error).toHaveBeenCalledWith(
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

    it('should handle unexpected errors during update', async () => {
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Network error')),
      };

      mockSupabaseFrom.mockReturnValue(mockFrom);

      const result = await authService.updateUserData('user-123', updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(mockLog.error).toHaveBeenCalledWith(
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

    it('should handle non-Error objects during update', async () => {
      const mockFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(null),
      };

      mockSupabaseFrom.mockReturnValue(mockFrom);

      const result = await authService.updateUserData('user-123', updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred'); // getErrorMessage returns this for null
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error updating user data',
        expect.any(Error), // isError converts non-Error to Error
        {
          metadata: {
            service: 'auth.service',
            method: 'updateUserData',
            userId: 'user-123',
          },
        }
      );
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email successfully', async () => {
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await authService.resetPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com'
      );
    });

    it('should handle password reset errors', async () => {
      const error = new AuthError('Invalid email', 400, 'INVALID_EMAIL');
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error,
      });

      const result = await authService.resetPassword('invalid@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Password reset failed',
        error,
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
      mockSupabaseAuth.resetPasswordForEmail.mockRejectedValue(
        new Error('Network error')
      );

      const result = await authService.resetPassword('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(mockLog.error).toHaveBeenCalledWith(
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

    it('should handle non-Error objects during password reset', async () => {
      mockSupabaseAuth.resetPasswordForEmail.mockRejectedValue(undefined);

      const result = await authService.resetPassword('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred'); // getErrorMessage returns this for undefined
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error during password reset',
        expect.any(Error), // isError converts non-Error to Error
        {
          metadata: {
            service: 'auth.service',
            method: 'resetPassword',
            email: 'test@example.com',
          },
        }
      );
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      mockSupabaseAuth.updateUser.mockResolvedValue({
        data: { user: {} },
        error: null,
      });

      const result = await authService.updatePassword('newpassword123');

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(mockSupabaseAuth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123',
      });
    });

    it('should handle password update errors', async () => {
      const error = new AuthError('Password too weak', 400, 'WEAK_PASSWORD');
      mockSupabaseAuth.updateUser.mockResolvedValue({
        data: { user: null },
        error,
      });

      const result = await authService.updatePassword('weak');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password too weak');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Password update failed',
        error,
        { metadata: { service: 'auth.service', method: 'updatePassword' } }
      );
    });

    it('should handle unexpected errors during password update', async () => {
      mockSupabaseAuth.updateUser.mockRejectedValue(
        new Error('Session expired')
      );

      const result = await authService.updatePassword('newpassword123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session expired');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error updating password',
        expect.any(Error),
        { metadata: { service: 'auth.service', method: 'updatePassword' } }
      );
    });

    it('should handle non-Error objects during password update', async () => {
      mockSupabaseAuth.updateUser.mockRejectedValue([]);

      const result = await authService.updatePassword('newpassword123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred'); // getErrorMessage returns this for arrays
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error updating password',
        expect.any(Error), // isError converts non-Error to Error
        { metadata: { service: 'auth.service', method: 'updatePassword' } }
      );
    });
  });

  describe('signInWithOAuth', () => {
    it('should initiate OAuth sign in successfully', async () => {
      const mockOAuthUrl = 'https://accounts.google.com/oauth/authorize?client_id=test';

      mockSupabaseAuth.signInWithOAuth = jest.fn().mockResolvedValue({
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
          redirectTo: 'http://localhost:3000/auth/callback/google',
        },
      });
    });

    it('should handle OAuth errors', async () => {
      mockSupabaseAuth.signInWithOAuth = jest.fn().mockResolvedValue({
        data: { url: null },
        error: new AuthError('OAuth provider error', 400, 'OAUTH_ERROR'),
      });

      const result = await authService.signInWithOAuth('github');

      expect(result.success).toBe(false);
      expect(result.error).toBe('OAuth provider error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'OAuth sign in failed',
        expect.any(AuthError),
        {
          metadata: {
            service: 'auth.service',
            method: 'signInWithOAuth',
            provider: 'github',
          },
        }
      );
    });

    it('should handle missing OAuth URL', async () => {
      mockSupabaseAuth.signInWithOAuth = jest.fn().mockResolvedValue({
        data: { url: null },
        error: null,
      });

      const result = await authService.signInWithOAuth('discord');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No OAuth URL returned');
    });

    it('should handle unexpected errors during OAuth', async () => {
      mockSupabaseAuth.signInWithOAuth = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await authService.signInWithOAuth('google');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error during OAuth sign in',
        expect.any(Error),
        {
          metadata: {
            service: 'auth.service',
            method: 'signInWithOAuth',
            provider: 'google',
          },
        }
      );
    });

    it('should handle non-Error objects during OAuth', async () => {
      mockSupabaseAuth.signInWithOAuth = jest.fn().mockRejectedValue('String error');

      const result = await authService.signInWithOAuth('github');

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });
  });

  describe('exchangeCodeForSession', () => {
    it('should exchange OAuth code for session successfully', async () => {
      const mockUser = {
        id: 'oauth-user-123',
        email: 'oauth@example.com',
        phone: '+1234567890',
        user_metadata: {
          username: 'oauthuser',
          avatar_url: 'https://provider.com/avatar.jpg',
        },
        app_metadata: {
          provider: 'google',
        },
      };

      mockSupabaseAuth.exchangeCodeForSession = jest.fn().mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      });

      const result = await authService.exchangeCodeForSession('oauth-code-123');

      expect(result.success).toBe(true);
      expect(result.data?.user).toEqual({
        id: 'oauth-user-123',
        email: 'oauth@example.com',
        phone: '+1234567890',
        auth_username: 'oauthuser',
        username: 'oauthuser',
        avatar_url: 'https://provider.com/avatar.jpg',
        provider: 'google',
        userRole: 'user',
      });
    });

    it('should handle code exchange errors', async () => {
      mockSupabaseAuth.exchangeCodeForSession = jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: new AuthError('Invalid authorization code', 400, 'INVALID_CODE'),
      });

      const result = await authService.exchangeCodeForSession('invalid-code');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid authorization code');
      expect(mockLog.error).toHaveBeenCalledWith(
        'OAuth code exchange failed',
        expect.any(AuthError),
        {
          metadata: {
            service: 'auth.service',
            method: 'exchangeCodeForSession',
            code: 'invalid-co...',
          },
        }
      );
    });

    it('should handle missing user in code exchange', async () => {
      mockSupabaseAuth.exchangeCodeForSession = jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const result = await authService.exchangeCodeForSession('valid-code');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No user returned from OAuth code exchange');
    });

    it('should handle unexpected errors during code exchange', async () => {
      mockSupabaseAuth.exchangeCodeForSession = jest.fn().mockRejectedValue(
        new Error('Session error')
      );

      const result = await authService.exchangeCodeForSession('valid-code');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error during OAuth code exchange',
        expect.any(Error),
        {
          metadata: {
            service: 'auth.service',
            method: 'exchangeCodeForSession',
          },
        }
      );
    });

    it('should handle OAuth user with missing metadata', async () => {
      const mockUser = {
        id: 'oauth-user-123',
        email: null,
        phone: null,
        user_metadata: {},
        app_metadata: {},
      };

      mockSupabaseAuth.exchangeCodeForSession = jest.fn().mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      });

      const result = await authService.exchangeCodeForSession('oauth-code-minimal');

      expect(result.success).toBe(true);
      expect(result.data?.user).toEqual({
        id: 'oauth-user-123',
        email: null,
        phone: null,
        auth_username: null,
        username: null,
        avatar_url: null,
        provider: null,
        userRole: 'user',
      });
    });

    it('should handle non-Error objects during code exchange', async () => {
      mockSupabaseAuth.exchangeCodeForSession = jest.fn().mockRejectedValue({ message: 'Object error' });

      const result = await authService.exchangeCodeForSession('valid-code');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Object error');
    });
  });

  describe('onAuthStateChange', () => {
    it('should subscribe to auth state changes with session', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      const mockSubscription = { unsubscribe: mockUnsubscribe };

      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockSubscription },
      });

      const result = authService.onAuthStateChange(mockCallback);

      // Get the actual callback passed to onAuthStateChange
      const authCallback = mockSupabaseAuth.onAuthStateChange.mock.calls[0][0];

      // Test with session
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      };
      authCallback('SIGNED_IN', mockSession);

      expect(mockCallback).toHaveBeenCalledWith('SIGNED_IN', {
        user: { id: 'user-123', email: 'test@example.com' },
      });

      // Test without session
      authCallback('SIGNED_OUT', null);
      expect(mockCallback).toHaveBeenCalledWith('SIGNED_OUT', null);

      // Test unsubscribe
      result.unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should handle session with missing email', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      const mockSubscription = { unsubscribe: mockUnsubscribe };

      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockSubscription },
      });

      authService.onAuthStateChange(mockCallback);

      const authCallback = mockSupabaseAuth.onAuthStateChange.mock.calls[0][0];
      const mockSession = {
        user: { id: 'user-123', email: null },
      };
      authCallback('TOKEN_REFRESHED', mockSession);

      expect(mockCallback).toHaveBeenCalledWith('TOKEN_REFRESHED', {
        user: { id: 'user-123', email: null },
      });
    });
  });
});
