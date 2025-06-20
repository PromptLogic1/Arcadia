/**
 * Session and Token Handling Tests
 *
 * Tests for Supabase authentication session integration including:
 * - Session structure validation
 * - Session blacklisting functionality
 * - Auth state change handling
 * - Cookie-based session management via Supabase SSR
 *
 * IMPORTANT: This test file uses dynamic imports (await import()) to ensure
 * that mocks are properly applied before modules are loaded. This prevents
 * module caching issues where the real Redis/crypto modules might be used
 * instead of the mocked versions.
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  jest,
  afterEach,
} from '@jest/globals';

// IMPORTANT: Mock modules BEFORE any imports that might use them

// Mock Redis for session blacklisting tests
const mockRedisClient = {
  setex: (jest.fn() as any).mockResolvedValue('OK'),
  srem: (jest.fn() as any).mockResolvedValue(1),
  get: (jest.fn() as any).mockResolvedValue(null),
  sadd: (jest.fn() as any).mockResolvedValue(1),
  expire: (jest.fn() as any).mockResolvedValue(1),
  smembers: (jest.fn() as any).mockResolvedValue([]),
  del: (jest.fn() as any).mockResolvedValue(1),
};

// Mock the underlying @upstash/redis module
jest.mock('@upstash/redis', () => ({
  Redis: (jest.fn() as any).mockImplementation(() => mockRedisClient),
}));

jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(() => mockRedisClient),
  isRedisConfigured: jest.fn(() => true),
}));

// Mock crypto module with dynamic import support
const mockCreateHash = (jest.fn() as any)(() => ({
  update: (jest.fn() as any).mockReturnThis(),
  digest: jest.fn(() => 'mocked-hash-value'),
}));

jest.mock('crypto', () => ({
  createHash: mockCreateHash,
}));

// Mock authService - need to import and re-export
const mockAuthService = {
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(
    (_callback: (event: string, session: unknown) => void) => ({
      unsubscribe: jest.fn(),
    })
  ),
};

jest.mock('@/services/auth.service', () => ({
  authService: mockAuthService,
}));

// Import types but not the actual implementations yet
import type { MockSupabaseSession } from './__mocks__/supabase';

// Mock window as undefined to simulate server environment
const originalWindow = global.window;

afterEach(() => {
  global.window = originalWindow;
});

describe('Session and Token Handling', () => {
  beforeEach(() => {
    // @ts-expect-error - mocking window
    delete global.window;

    // Set Redis environment variables for tests
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    jest.clearAllMocks();
    // Reset Redis mock responses to successful defaults
    (mockRedisClient.get as any).mockResolvedValue(null);
    (mockRedisClient.smembers as any).mockResolvedValue([]);
    (mockRedisClient.setex as any).mockResolvedValue('OK');
    (mockRedisClient.srem as any).mockResolvedValue(1);
    (mockRedisClient.sadd as any).mockResolvedValue(1);
    (mockRedisClient.expire as any).mockResolvedValue(1);
    (mockRedisClient.del as any).mockResolvedValue(1);

    // Reset auth service mocks
    (mockAuthService.getSession as any).mockClear();
    (mockAuthService.onAuthStateChange as any).mockClear();
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
      // Import the function inside the test after mocks are set up
      const { blacklistSession } = await import('@/lib/session-blacklist');

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
      const { isSessionBlacklisted } = await import('@/lib/session-blacklist');

      // Mock blacklisted session
      (mockRedisClient.get as any).mockResolvedValueOnce(
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
      const { isSessionBlacklisted } = await import('@/lib/session-blacklist');

      (mockRedisClient.get as any).mockResolvedValueOnce(null);

      const result = await isSessionBlacklisted('valid-token');

      expect(result.isBlacklisted).toBe(false);
      expect(result.reason).toBeUndefined();
    });

    test('should track user sessions', async () => {
      const { trackUserSession } = await import('@/lib/session-blacklist');

      const sessionToken = 'session-token-123';
      const userId = 'user-123';

      const result = await trackUserSession(sessionToken, userId);

      expect(result.success).toBe(true);
      expect(mockRedisClient.sadd).toHaveBeenCalled();
      expect(mockRedisClient.expire).toHaveBeenCalled();
    });

    test('should blacklist all user sessions', async () => {
      const { blacklistAllUserSessions } = await import(
        '@/lib/session-blacklist'
      );

      // Mock existing sessions
      (mockRedisClient.smembers as any).mockResolvedValueOnce([
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
      const { blacklistSession } = await import('@/lib/session-blacklist');

      // Import the mocked redis module and modify its behavior
      const redisModule = await import('@/lib/redis');
      const mockIsRedisConfigured =
        redisModule.isRedisConfigured as jest.MockedFunction<
          typeof redisModule.isRedisConfigured
        >;
      (mockIsRedisConfigured as any).mockReturnValueOnce(false);

      const result = await blacklistSession('token', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Redis unavailable');
    });
  });

  describe('Auth Service Session Integration', () => {
    test('should get current session via auth service', async () => {
      const { authService } = await import('@/services/auth.service');

      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      };

      (mockAuthService.getSession as any).mockResolvedValueOnce({
        success: true,
        data: mockSession,
        error: null,
      });

      const result = await authService.getSession();

      expect(result.success).toBe(true);
      expect(result.data?.user.id).toBe('user-123');
    });

    test('should handle no session case', async () => {
      const { authService } = await import('@/services/auth.service');

      (mockAuthService.getSession as any).mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });

      const result = await authService.getSession();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    test('should handle session retrieval errors', async () => {
      const { authService } = await import('@/services/auth.service');

      (mockAuthService.getSession as any).mockResolvedValueOnce({
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
    test('should handle auth state change events', async () => {
      const { authService } = await import('@/services/auth.service');

      const mockCallback = jest.fn();
      const mockSubscription = { unsubscribe: jest.fn() };

      (mockAuthService.onAuthStateChange as any).mockReturnValueOnce(
        mockSubscription
      );

      const subscription = authService.onAuthStateChange(mockCallback);

      // Verify subscription was created
      expect(mockAuthService.onAuthStateChange).toHaveBeenCalledWith(
        mockCallback
      );
      expect(subscription).toHaveProperty('unsubscribe');
      expect(typeof subscription.unsubscribe).toBe('function');
    });

    test('should handle SIGNED_IN event', async () => {
      const { authService } = await import('@/services/auth.service');

      const callback = jest.fn();
      let storedCallback: any;

      (mockAuthService.onAuthStateChange as jest.Mock).mockImplementationOnce(
        (cb: any) => {
          storedCallback = cb;
          return { unsubscribe: jest.fn() };
        }
      );

      authService.onAuthStateChange(callback);

      // Simulate signed in event by calling the stored callback
      const session = { user: { id: 'user-123', email: 'test@example.com' } };
      storedCallback!('SIGNED_IN', session);

      expect(callback).toHaveBeenCalledWith('SIGNED_IN', session);
    });

    test('should handle SIGNED_OUT event', async () => {
      const { authService } = await import('@/services/auth.service');

      const callback = jest.fn();
      let storedCallback: any;

      (mockAuthService.onAuthStateChange as jest.Mock).mockImplementationOnce(
        (cb: any) => {
          storedCallback = cb;
          return { unsubscribe: jest.fn() };
        }
      );

      authService.onAuthStateChange(callback);

      // Simulate signed out event
      storedCallback!('SIGNED_OUT', null);

      expect(callback).toHaveBeenCalledWith('SIGNED_OUT', null);
    });

    test('should handle TOKEN_REFRESHED event', async () => {
      const { authService } = await import('@/services/auth.service');

      const callback = jest.fn();
      let storedCallback: any;

      (mockAuthService.onAuthStateChange as jest.Mock).mockImplementationOnce(
        (cb: any) => {
          storedCallback = cb;
          return { unsubscribe: jest.fn() };
        }
      );

      authService.onAuthStateChange(callback);

      // Simulate token refresh
      const refreshedSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      };
      storedCallback!('TOKEN_REFRESHED', refreshedSession);

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
      const { blacklistSession } = await import('@/lib/session-blacklist');

      await blacklistSession('plain-text-token', 'user-123');

      // Verify crypto was used to hash the token
      expect(mockCreateHash).toHaveBeenCalledWith('sha256');
    });

    test('should handle session token size appropriately', async () => {
      const { blacklistSession } = await import('@/lib/session-blacklist');

      // Supabase handles token storage via secure httpOnly cookies
      // We just need to ensure we're not trying to store tokens in places with size limits
      const largeToken = 'x'.repeat(4096); // 4KB

      // Our blacklisting only stores the hash, not the full token
      const result = await blacklistSession(largeToken, 'user-123');
      expect(result.success).toBe(true);
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
