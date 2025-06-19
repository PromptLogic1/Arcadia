/**
 * Supabase Mock Infrastructure
 *
 * Provides reusable mocks for Supabase client and common operations.
 * These mocks ensure type safety and consistent behavior across all tests.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/../../types/database.types';

// Mock response builders
export const createSupabaseSuccessResponse = <T>(data: T) => ({
  data,
  error: null,
  count: null,
  status: 200,
  statusText: 'OK',
});

export const createSupabaseErrorResponse = (
  message: string,
  code?: string
) => ({
  data: null,
  error: {
    message,
    details: null,
    hint: null,
    code: code || 'UNKNOWN',
  },
  count: null,
  status: 400,
  statusText: 'Bad Request',
});

// Mock query builder with chainable methods
export class MockSupabaseQueryBuilder<T> {
  private _data: T | T[] | null = null;
  private _error: { message: string; code?: string } | null = null;
  private _filters: Record<string, unknown> = {};
  private _orderBy: { column: string; ascending: boolean }[] = [];
  private _limit: number | null = null;
  private _range: { from: number; to: number } | null = null;

  constructor(data?: T | T[], error?: { message: string; code?: string }) {
    this._data = data || null;
    this._error = error || null;
  }

  select(columns?: string) {
    // Store the columns for potential filtering
    return this;
  }

  eq(column: string, value: unknown) {
    this._filters[column] = value;
    return this;
  }

  neq(column: string, value: unknown) {
    this._filters[`not_${column}`] = value;
    return this;
  }

  gt(column: string, value: unknown) {
    this._filters[`${column}_gt`] = value;
    return this;
  }

  gte(column: string, value: unknown) {
    this._filters[`${column}_gte`] = value;
    return this;
  }

  lt(column: string, value: unknown) {
    this._filters[`${column}_lt`] = value;
    return this;
  }

  lte(column: string, value: unknown) {
    this._filters[`${column}_lte`] = value;
    return this;
  }

  like(column: string, pattern: string) {
    this._filters[`${column}_like`] = pattern;
    return this;
  }

  ilike(column: string, pattern: string) {
    this._filters[`${column}_ilike`] = pattern;
    return this;
  }

  is(column: string, value: unknown) {
    this._filters[`${column}_is`] = value;
    return this;
  }

  in(column: string, values: unknown[]) {
    this._filters[`${column}_in`] = values;
    return this;
  }

  contains(column: string, value: unknown) {
    this._filters[`${column}_contains`] = value;
    return this;
  }

  containedBy(column: string, value: unknown) {
    this._filters[`${column}_contained_by`] = value;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this._orderBy.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  limit(count: number) {
    this._limit = count;
    return this;
  }

  range(from: number, to: number) {
    this._range = { from, to };
    return this;
  }

  single() {
    if (this._error) {
      return Promise.resolve(
        createSupabaseErrorResponse(this._error.message, this._error.code)
      );
    }

    const data = Array.isArray(this._data) ? this._data[0] || null : this._data;
    return Promise.resolve(createSupabaseSuccessResponse(data));
  }

  maybeSingle() {
    return this.single();
  }

  async then(
    onfulfilled?: (value: any) => any,
    onrejected?: (reason: any) => any
  ) {
    const result = this._error
      ? createSupabaseErrorResponse(this._error.message, this._error.code)
      : createSupabaseSuccessResponse(this._data);

    if (onfulfilled) {
      return onfulfilled(result);
    }
    return result;
  }

  // Make it thenable
  catch(onrejected: (reason: any) => any) {
    return this.then(undefined, onrejected);
  }
}

// Mock mutation builder
export class MockSupabaseMutationBuilder<T> {
  private _data: T | T[] | null = null;
  private _error: { message: string; code?: string } | null = null;

  constructor(data?: T | T[], error?: { message: string; code?: string }) {
    this._data = data || null;
    this._error = error || null;
  }

  select(columns?: string) {
    return this;
  }

  eq(column: string, value: unknown) {
    return this;
  }

  match(query: Record<string, unknown>) {
    return this;
  }

  single() {
    if (this._error) {
      return Promise.resolve(
        createSupabaseErrorResponse(this._error.message, this._error.code)
      );
    }

    const data = Array.isArray(this._data) ? this._data[0] || null : this._data;
    return Promise.resolve(createSupabaseSuccessResponse(data));
  }

  async then(
    onfulfilled?: (value: any) => any,
    onrejected?: (reason: any) => any
  ) {
    const result = this._error
      ? createSupabaseErrorResponse(this._error.message, this._error.code)
      : createSupabaseSuccessResponse(this._data);

    if (onfulfilled) {
      return onfulfilled(result);
    }
    return result;
  }

  catch(onrejected: (reason: any) => any) {
    return this.then(undefined, onrejected);
  }
}

// Create mock Supabase client
export const createMockSupabaseClient = (
  overrides?: Partial<SupabaseClient<Database>>
): SupabaseClient<Database> => {
  const mockClient = {
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: jest
        .fn()
        .mockResolvedValue({
          data: { user: null, session: null },
          error: null,
        }),
      signUp: jest
        .fn()
        .mockResolvedValue({
          data: { user: null, session: null },
          error: null,
        }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest
        .fn()
        .mockReturnValue({
          data: { subscription: { unsubscribe: jest.fn() } },
        }),
      refreshSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      setSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      updateUser: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
      resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn((table: string) => {
      // Return a query builder for the table
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        like: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        containedBy: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(null)),
        maybeSingle: jest
          .fn()
          .mockResolvedValue(createSupabaseSuccessResponse(null)),
        then: jest.fn().mockResolvedValue(createSupabaseSuccessResponse([])),
        catch: jest.fn().mockReturnThis(),
      };
    }),
    storage: {
      from: jest.fn((bucket: string) => ({
        upload: jest
          .fn()
          .mockResolvedValue({ data: { path: '' }, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
        remove: jest.fn().mockResolvedValue({ data: [], error: null }),
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: '' } }),
      })),
    },
    realtime: {
      channel: jest.fn((name: string) => ({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
        unsubscribe: jest.fn().mockResolvedValue(undefined),
        track: jest.fn().mockResolvedValue(undefined),
        send: jest.fn().mockResolvedValue(undefined),
      })),
    },
    rpc: jest.fn().mockResolvedValue(createSupabaseSuccessResponse(null)),
    ...overrides,
  } as unknown as SupabaseClient<Database>;

  return mockClient;
};

// Common mock data factories
type MockUser = {
  id: string;
  email: string;
  email_confirmed_at: string;
  created_at: string;
  updated_at: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  aud: string;
  role: string;
};

export const mockSupabaseUser = (overrides?: Partial<MockUser>): MockUser => ({
  id: 'mock-user-id',
  email: 'test@example.com',
  email_confirmed_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  role: 'authenticated',
  ...overrides,
});

type MockSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: MockUser;
};

export const mockSupabaseSession = (
  overrides?: Partial<MockSession>
): MockSession => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: mockSupabaseUser(),
  ...overrides,
});

// Test helpers
export const setupSupabaseMock = (
  client: ReturnType<typeof createMockSupabaseClient>
) => {
  // Reset all mocks
  Object.values(client.auth).forEach(fn => {
    if (typeof fn === 'function' && 'mockReset' in fn) {
      (fn as jest.Mock).mockReset();
    }
  });

  if (typeof client.from === 'function' && 'mockReset' in client.from) {
    (client.from as jest.Mock).mockReset();
  }

  if (typeof client.rpc === 'function' && 'mockReset' in client.rpc) {
    (client.rpc as jest.Mock).mockReset();
  }
};

// Export types for use in tests
export type MockQueryBuilder<T> = MockSupabaseQueryBuilder<T>;
export type MockMutationBuilder<T> = MockSupabaseMutationBuilder<T>;
export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
