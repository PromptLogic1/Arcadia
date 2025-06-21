/**
 * @jest-environment jsdom
 */

/**
 * Enhanced Auth Service Tests
 * 
 * Additional test coverage for edge cases and scenarios not covered
 * in the main auth.service.test.ts file.
 */

import { authService } from '../auth.service';
import { log } from '@/lib/logger';
import { AuthError } from '@supabase/auth-js';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/validation/schemas/users', () => ({
  userSchema: {
    safeParse: jest.fn(),
  },
}));

jest.mock('@/lib/stores/auth-store', () => ({
  transformDbUserToUserData: jest.fn(),
}));

// Mock Supabase
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
  refreshSession: jest.fn(),
};

const mockSupabaseFrom = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  update: jest.fn().mockReturnThis(),
});

jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    auth: mockSupabaseAuth,
    from: mockSupabaseFrom,
  })),
}));

// Clear the global auth service mock for this test file
jest.unmock('../auth.service');

const mockLog = log as jest.Mocked<typeof log>;

describe('AuthService - Enhanced Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock window.location for OAuth tests
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true,
    });
  });

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'new-token',
        refresh_token: 'new-refresh-token',
      };

      mockSupabaseAuth.refreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await authService.refreshSession();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        user: { id: 'user-123', email: 'test@example.com' },
      });
      expect(mockSupabaseAuth.refreshSession).toHaveBeenCalled();
    });

    it('should handle refresh session errors', async () => {
      const error = new AuthError('Token expired', 401, 'TOKEN_EXPIRED');
      mockSupabaseAuth.refreshSession.mockResolvedValue({
        data: { session: null },
        error,
      });

      const result = await authService.refreshSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token expired');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to refresh session',
        error,
        { metadata: { service: 'auth.service', method: 'refreshSession' } }
      );
    });

    it('should handle missing session on refresh', async () => {
      mockSupabaseAuth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await authService.refreshSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No session to refresh');
    });

    it('should handle unexpected errors during refresh', async () => {
      mockSupabaseAuth.refreshSession.mockRejectedValue(
        new Error('Network error')
      );

      const result = await authService.refreshSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(mockLog.error).toHaveBeenCalledWith(
        'Unexpected error refreshing session',
        expect.any(Error),
        { metadata: { service: 'auth.service', method: 'refreshSession' } }
      );
    });
  });

  describe('signInWithEmail', () => {
    it('should be an alias for signIn method', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { username: 'testuser' },
        app_metadata: { provider: 'email' },
      };

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      });

      const result = await authService.signInWithEmail(credentials);

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
      expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith(
        credentials
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle OAuth with custom redirect URL', async () => {
      // Change window location
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://app.example.com' },
        writable: true,
      });

      mockSupabaseAuth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth' },
        error: null,
      });

      const result = await authService.signInWithOAuth('google');

      expect(result.success).toBe(true);
      expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'https://app.example.com/auth/callback/google',
        },
      });
    });

    it('should handle session with undefined user properties', async () => {
      const mockSession = {
        user: { id: 'user-123', email: undefined },
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

    it('should handle OAuth code exchange with state parameter', async () => {
      const mockUser = {
        id: 'oauth-user-123',
        email: 'oauth@example.com',
        user_metadata: {},
        app_metadata: { provider: 'github' },
      };

      mockSupabaseAuth.exchangeCodeForSession.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      });

      const result = await authService.exchangeCodeForSession(
        'oauth-code-123',
        'state-param'
      );

      expect(result.success).toBe(true);
      expect(result.data?.user?.provider).toBe('github');
      expect(mockSupabaseAuth.exchangeCodeForSession).toHaveBeenCalledWith(
        'oauth-code-123'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle null error objects', async () => {
      mockSupabaseAuth.signOut.mockRejectedValue(null);

      const result = await authService.signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
    });

    it('should handle error objects with no message', async () => {
      mockSupabaseAuth.updateUser.mockRejectedValue({});

      const result = await authService.updatePassword('newpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
    });

    it('should handle number error values', async () => {
      mockSupabaseAuth.resetPasswordForEmail.mockRejectedValue(404);

      const result = await authService.resetPassword('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
    });
  });
});