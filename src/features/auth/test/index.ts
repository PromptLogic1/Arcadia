/**
 * Auth Feature Tests - Index
 * 
 * Exports all test utilities, mocks, and helpers for auth testing
 */

// Test utilities
export * from './validation.test';
export * from './auth-service.test';
export * from './useAuth.test';
export * from './rate-limiting.test';
export * from './session-token.test';
export * from './oauth.test';

// Mock utilities
export * from './__mocks__/supabase';

// Test data
export const AUTH_TEST_DATA = {
  validUser: {
    email: 'test@example.com',
    username: 'testuser',
    password: 'Test123!@#',
    confirmPassword: 'Test123!@#',
  },
  invalidUser: {
    email: 'invalid-email',
    username: 'ab',
    password: 'weak',
    confirmPassword: 'different',
  },
  rateLimit: {
    login: { attempts: 5, window: 15 * 60 * 1000 },
    passwordReset: { attempts: 3, window: 60 * 60 * 1000 },
    signup: { attempts: 3, window: 60 * 60 * 1000 },
  },
  sessions: {
    accessTokenExpiry: 15 * 60 * 1000, // 15 minutes
    refreshTokenExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
    rememberMeExpiry: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  oauth: {
    providers: ['google', 'github', 'discord'],
    scopes: {
      google: 'openid email profile',
      github: 'user:email',
      discord: 'identify email',
    },
  },
} as const;

// Test helpers
export const createTestUser = (overrides = {}) => ({
  id: 'test-user-123',
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User',
  avatar_url: null,
  provider: 'email',
  userRole: 'user' as const,
  ...overrides,
});

export const createTestSession = (overrides = {}) => ({
  access_token: 'test-access-token',
  token_type: 'bearer' as const,
  expires_in: 3600,
  refresh_token: 'test-refresh-token',
  user: createTestUser(),
  ...overrides,
});

export const createTestError = (message = 'Test error', code = 'test_error') => ({
  message,
  code,
  statusCode: 400,
});

// Test assertions
export const expectValidEmail = (email: string) => {
  expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
};

export const expectValidPassword = (password: string) => {
  expect(password).toMatch(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/);
};

export const expectValidUsername = (username: string) => {
  expect(username).toMatch(/^[a-zA-Z0-9_-]{3,30}$/);
};

export const expectValidToken = (token: string) => {
  expect(token).toBeDefined();
  expect(token.length).toBeGreaterThan(10);
  expect(typeof token).toBe('string');
};

export const expectRateLimitResponse = (response: Record<string, unknown>) => {
  expect(response).toHaveProperty('success');
  expect(response).toHaveProperty('limit');
  expect(response).toHaveProperty('remaining');
  expect(response).toHaveProperty('reset');
  expect(typeof response.success).toBe('boolean');
  expect(typeof response.limit).toBe('number');
  expect(typeof response.remaining).toBe('number');
  expect(typeof response.reset).toBe('number');
};