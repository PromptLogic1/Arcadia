/**
 * Supabase Mock for Auth Tests
 *
 * Provides comprehensive mocks for Supabase auth functionality
 */

import { jest } from '@jest/globals';

export interface MockSupabaseUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  email_confirmed_at?: string | null;
  phone_confirmed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

export interface MockSupabaseSession {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: MockSupabaseUser;
}

export interface MockAuthResponse {
  user: MockSupabaseUser | null;
  session: MockSupabaseSession | null;
}

export interface MockAuthError {
  message: string;
  status?: number;
  code?: string;
}

export class MockSupabaseAuthClient {
  private currentUser: MockSupabaseUser | null = null;
  private currentSession: MockSupabaseSession | null = null;
  private subscribers: Array<
    (event: string, session: MockSupabaseSession | null) => void
  > = [];

  async getSession(): Promise<{
    data: { session: MockSupabaseSession | null };
    error: MockAuthError | null;
  }> {
    return { data: { session: this.currentSession }, error: null };
  }

  async getUser(): Promise<{
    data: { user: MockSupabaseUser | null };
    error: MockAuthError | null;
  }> {
    return { data: { user: this.currentUser }, error: null };
  }

  async signInWithPassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<{ data: MockAuthResponse | null; error: MockAuthError | null }> {
    // Simulate various scenarios
    if (email === 'blocked@example.com') {
      return {
        data: null,
        error: {
          message: 'Too many login attempts. Please try again later.',
          code: 'rate_limit_exceeded',
        },
      };
    }

    if (password === 'wrong') {
      return {
        data: null,
        error: {
          message: 'Invalid login credentials',
          code: 'invalid_credentials',
        },
      };
    }

    const user: MockSupabaseUser = {
      id: `user-${Date.now()}`,
      email,
      email_confirmed_at: new Date().toISOString(),
      user_metadata: { username: email.split('@')[0] },
      app_metadata: { provider: 'email' },
    };

    const session: MockSupabaseSession = {
      access_token: `token-${Date.now()}`,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: `refresh-${Date.now()}`,
      user,
    };

    this.currentUser = user;
    this.currentSession = session;
    this.notifySubscribers('SIGNED_IN', session);

    return { data: { user, session }, error: null };
  }

  async signUp({
    email,
    password: _password,
    options: _options,
  }: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown> };
  }): Promise<{ data: MockAuthResponse | null; error: MockAuthError | null }> {
    // Simulate already registered
    if (email === 'existing@example.com') {
      return {
        data: null,
        error: {
          message: 'User already registered',
          code: 'user_already_exists',
        },
      };
    }

    const user: MockSupabaseUser = {
      id: `user-${Date.now()}`,
      email,
      email_confirmed_at: email.includes('confirmed')
        ? new Date().toISOString()
        : null,
      user_metadata: _options?.data || {},
      app_metadata: { provider: 'email' },
    };

    if (user.email_confirmed_at) {
      const session: MockSupabaseSession = {
        access_token: `token-${Date.now()}`,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: `refresh-${Date.now()}`,
        user,
      };

      this.currentUser = user;
      this.currentSession = session;
      return { data: { user, session }, error: null };
    }

    return { data: { user, session: null }, error: null };
  }

  async signOut(): Promise<{ error: MockAuthError | null }> {
    this.currentUser = null;
    this.currentSession = null;
    this.notifySubscribers('SIGNED_OUT', null);
    return { error: null };
  }

  async resetPasswordForEmail(
    email: string
  ): Promise<{ error: MockAuthError | null }> {
    if (email === 'ratelimited@example.com') {
      return {
        error: {
          message: 'Too many password reset attempts',
          code: 'rate_limit_exceeded',
        },
      };
    }
    return { error: null };
  }

  async updateUser({
    password,
  }: {
    password?: string;
  }): Promise<{ error: MockAuthError | null }> {
    if (password && password.length < 8) {
      return {
        error: { message: 'Password is too weak', code: 'weak_password' },
      };
    }
    return { error: null };
  }

  onAuthStateChange(
    callback: (event: string, session: MockSupabaseSession | null) => void
  ) {
    this.subscribers.push(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
          },
        },
      },
    };
  }

  private notifySubscribers(
    event: string,
    session: MockSupabaseSession | null
  ) {
    this.subscribers.forEach(callback => callback(event, session));
  }
}

export class MockSupabaseClient {
  auth = new MockSupabaseAuthClient();

  from(table: string) {
    return new MockSupabaseQueryBuilder(table);
  }
}

export class MockSupabaseQueryBuilder {
  private table: string;
  private filters: Record<string, unknown> = {};
  private selectFields = '*';

  constructor(table: string) {
    this.table = table;
  }

  select(fields = '*') {
    this.selectFields = fields;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters[column] = value;
    return this;
  }

  single() {
    return this.executeSingle();
  }

  update(data: Record<string, unknown>) {
    return {
      eq: (column: string, value: unknown) => {
        this.filters[column] = value;
        return {
          select: () => ({
            single: () => this.executeUpdate(data),
          }),
        };
      },
    };
  }

  private async executeSingle() {
    // Mock user data
    if (this.table === 'users' && this.filters.auth_id) {
      const mockUserData = {
        id: `profile-${Date.now()}`,
        auth_id: this.filters.auth_id,
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        profile_visibility: 'public',
        achievements_visibility: 'public',
        submissions_visibility: 'public',
      };

      return { data: mockUserData, error: null };
    }

    return { data: null, error: { message: 'Not found' } };
  }

  private async executeUpdate(updates: Record<string, unknown>) {
    const updatedData = {
      id: `profile-${Date.now()}`,
      auth_id: this.filters.auth_id,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    return { data: updatedData, error: null };
  }
}

export const createMockSupabaseClient = () => new MockSupabaseClient();

// Mock functions for rate limiting
export const mockRateLimitCheck = jest.fn(() =>
  Promise.resolve({
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 3600000,
  })
);

export const mockRateLimitExceeded = jest.fn(() =>
  Promise.resolve({
    success: false,
    limit: 10,
    remaining: 0,
    reset: Date.now() + 3600000,
  })
);

// Mock OAuth providers
export const mockOAuthProviders = {
  google: {
    authorize: jest.fn(),
    callback: jest.fn(),
  },
  github: {
    authorize: jest.fn(),
    callback: jest.fn(),
  },
  discord: {
    authorize: jest.fn(),
    callback: jest.fn(),
  },
};

// Mock session utilities
export const mockSessionUtils = {
  isSessionValid: (session: MockSupabaseSession | null): boolean => {
    if (!session) return false;
    // Check if token is expired (simple mock)
    return true;
  },

  getSessionExpiryTime: (session: MockSupabaseSession): number => {
    return Date.now() + session.expires_in * 1000;
  },

  refreshSession: jest.fn(() =>
    Promise.resolve({
      session: {
        access_token: `refreshed-token-${Date.now()}`,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: `refreshed-refresh-${Date.now()}`,
      },
      error: null,
    })
  ),
};

// Export default mock
export default createMockSupabaseClient;
