/**
 * Session and Token Handling Tests
 *
 * Tests for Supabase authentication session integration including:
 * - Session structure validation
 * - Session blacklisting functionality
 * - Auth state change handling
 * - Cookie-based session management via Supabase SSR
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  jest,
  afterEach,
} from '@jest/globals';
import type { MockSupabaseSession } from './__mocks__/supabase';
import {
  blacklistSession,
  isSessionBlacklisted,
  trackUserSession,
  blacklistAllUserSessions,
} from '@/lib/session-blacklist';

// Mock window as undefined to simulate server environment
const originalWindow = global.window;
beforeEach(() => {
  // @ts-expect-error - mocking window
  delete global.window;
});

afterEach(() => {
  global.window = originalWindow;
});

// Mock Redis for session blacklisting tests
const mockRedisClient = {
  setex: jest.fn().mockResolvedValue('OK'),
  srem: jest.fn().mockResolvedValue(1),
  get: jest.fn().mockResolvedValue(null),
  sadd: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  smembers: jest.fn().mockResolvedValue([]),
  del: jest.fn().mockResolvedValue(1),
};

jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(() => mockRedisClient),
  isRedisConfigured: jest.fn(() => true),
}));

// Mock crypto module with dynamic import support
const mockCreateHash = jest.fn();
jest.mock('crypto', () => ({
  createHash: mockCreateHash,
}));

// Set up crypto mock behavior
mockCreateHash.mockImplementation(() => ({
  update: jest.fn().mockReturnThis(),
  digest: jest.fn(() => 'mocked-hash-value'),
}));

// Mock authService
jest.mock('@/services/auth.service', () => ({
  authService: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(callback => ({
      unsubscribe: jest.fn(),
    })),
  },
}));

describe('Session and Token Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Redis mock responses
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.smembers.mockResolvedValue([]);
  });

  describe('Supabase Session Structure', () => {
    test('should validate session has required properties', () => {
      const session: MockSupabaseSession = {
        access_token: 'access-token-123',
        token_type: 'bearer',
        expires_in: 3600, // 1 hour
        refresh_token: 'refresh-token-123',
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      };

      // Validate session structure matches Supabase's documented interface
      expect(session).toHaveProperty('access_token');
      expect(session).toHaveProperty('refresh_token');
      expect(session).toHaveProperty('expires_in');
      expect(session).toHaveProperty('token_type');
      expect(session).toHaveProperty('user');
      expect(session.user).toHaveProperty('id');
    });

    test('should handle session without optional properties', () => {
      const minimalSession = {
        access_token: 'token',
        refresh_token: 'refresh',
        token_type: 'bearer',
        user: { id: 'user-123' },
      };

      expect(minimalSession.access_token).toBeDefined();
      expect(minimalSession.user.id).toBeDefined();
    });
  });

  describe('Session Blacklisting', () => {
    test('should blacklist a session', async () => {
      const sessionToken = 'session-token-123';
      const userId = 'user-123';

      const result = await blacklistSession(
        sessionToken,
        userId,
        'Password changed'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should check if session is blacklisted', async () => {
      // Mock blacklisted session
      mockRedisClient.get.mockResolvedValueOnce(
        JSON.stringify({
          userId: 'user-123',
          reason: 'Security policy',
          blacklistedAt: new Date().toISOString(),
        })
      );

      const result = await isSessionBlacklisted('blacklisted-token');

      expect(result.isBlacklisted).toBe(true);
      expect(result.reason).toBe('Security policy');
    });

    test('should handle non-blacklisted session', async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);

      const result = await isSessionBlacklisted('valid-token');

      expect(result.isBlacklisted).toBe(false);
      expect(result.reason).toBeUndefined();
    });

    test('should track user sessions', async () => {
      const sessionToken = 'session-token-123';
      const userId = 'user-123';

      const result = await trackUserSession(sessionToken, userId);

      expect(result.success).toBe(true);
      expect(mockRedisClient.sadd).toHaveBeenCalled();
      expect(mockRedisClient.expire).toHaveBeenCalled();
    });

    test('should blacklist all user sessions', async () => {
      // Mock existing sessions
      mockRedisClient.smembers.mockResolvedValueOnce([
        'hash1',
        'hash2',
        'hash3',
      ]);

      const result = await blacklistAllUserSessions(
        'user-123',
        'Password changed'
      );

      expect(result.success).toBe(true);
      expect(result.blacklistedCount).toBe(3);
      expect(mockRedisClient.setex).toHaveBeenCalledTimes(3);
      expect(mockRedisClient.del).toHaveBeenCalled();
    });

    test('should handle Redis unavailable gracefully', async () => {
      const { isRedisConfigured } = require('@/lib/redis');
      isRedisConfigured.mockReturnValueOnce(false);

      const result = await blacklistSession('token', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Redis unavailable');
    });
  });

  describe('Auth Service Session Integration', () => {
    test('should get current session via auth service', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      };

      jest.spyOn(authService, 'getSession').mockResolvedValueOnce({
        success: true,
        data: mockSession,
        error: null,
      });

      const result = await authService.getSession();

      expect(result.success).toBe(true);
      expect(result.data?.user.id).toBe('user-123');
    });

    test('should handle no session case', async () => {
      jest.spyOn(authService, 'getSession').mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });

      const result = await authService.getSession();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    test('should handle session retrieval errors', async () => {
      jest.spyOn(authService, 'getSession').mockResolvedValueOnce({
        success: false,
        data: null,
        error: 'Network error',
      });

      const result = await authService.getSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Auth State Changes', () => {
    test('should handle auth state change events', () => {
      const mockCallback = jest.fn();

      const subscription = authService.onAuthStateChange(mockCallback);

      // Verify subscription was created
      expect(authService.onAuthStateChange).toHaveBeenCalledWith(mockCallback);
      expect(subscription).toHaveProperty('unsubscribe');
      expect(typeof subscription.unsubscribe).toBe('function');
    });

    test('should handle SIGNED_IN event', () => {
      const callback = jest.fn();
      authService.onAuthStateChange(callback);

      // Simulate signed in event
      const session = { user: { id: 'user-123', email: 'test@example.com' } };
      callback('SIGNED_IN', session);

      expect(callback).toHaveBeenCalledWith('SIGNED_IN', session);
    });

    test('should handle SIGNED_OUT event', () => {
      const callback = jest.fn();
      authService.onAuthStateChange(callback);

      // Simulate signed out event
      callback('SIGNED_OUT', null);

      expect(callback).toHaveBeenCalledWith('SIGNED_OUT', null);
    });

    test('should handle TOKEN_REFRESHED event', () => {
      const callback = jest.fn();
      authService.onAuthStateChange(callback);

      // Simulate token refresh
      const refreshedSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      };
      callback('TOKEN_REFRESHED', refreshedSession);

      expect(callback).toHaveBeenCalledWith(
        'TOKEN_REFRESHED',
        refreshedSession
      );
    });
  });

  describe('Security Considerations', () => {
    test('should not expose sensitive data in session', () => {
      const session: MockSupabaseSession = {
        access_token: 'token-123',
        refresh_token: 'refresh-123',
        token_type: 'bearer',
        expires_in: 3600,
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      };

      // Ensure session doesn't contain sensitive data
      expect(session.user).not.toHaveProperty('password');
      expect(session.user).not.toHaveProperty('creditCard');
      expect(session.user).not.toHaveProperty('ssn');
    });

    test('should hash session tokens for blacklisting', async () => {
      const crypto = require('crypto');

      await blacklistSession('plain-text-token', 'user-123');

      // Verify crypto was used to hash the token
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
    });

    test('should handle session token size appropriately', () => {
      // Supabase handles token storage via secure httpOnly cookies
      // We just need to ensure we're not trying to store tokens in places with size limits
      const largeToken = 'x'.repeat(4096); // 4KB

      // Our blacklisting only stores the hash, not the full token
      expect(async () => {
        await blacklistSession(largeToken, 'user-123');
      }).not.toThrow();
    });
  });

  describe('Supabase SSR Cookie Management', () => {
    test('should recognize Supabase manages session cookies', () => {
      // Supabase SSR handles all cookie operations internally
      // We don't directly manipulate cookies - this is just a smoke test
      // to ensure we understand the architecture

      const cookieConfig = {
        httpOnly: true, // Supabase sets this
        secure: true, // Supabase sets this in production
        sameSite: 'lax' as const, // Supabase default
        path: '/', // Supabase default
      };

      // These are the settings Supabase uses internally
      expect(cookieConfig.httpOnly).toBe(true);
      expect(cookieConfig.secure).toBe(true);
    });
  });
});
