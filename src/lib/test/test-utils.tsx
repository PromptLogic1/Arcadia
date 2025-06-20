/**
 * Test Utilities
 *
 * Common testing utilities and helpers for all test files.
 * These utilities ensure consistent testing patterns across the codebase.
 */

import {
  render,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react';
import type { ReactNode, ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/../../types/database.types';

// Create a custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  _supabaseClient?: SupabaseClient<Database>;
  initialRoute?: string;
}

// Default query client for tests
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Turn off retries for tests
        gcTime: 0, // No garbage collection time
        staleTime: 0, // Data is immediately stale
      },
      mutations: {
        retry: false,
      },
    },
  });

// Test wrapper component
export const createWrapper = ({
  queryClient = createTestQueryClient(),
  _supabaseClient,
}: {
  queryClient?: QueryClient;
  _supabaseClient?: SupabaseClient<Database>;
} = {}) => {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Custom render function
export const customRender = (
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    _supabaseClient,
    initialRoute,
    ...renderOptions
  }: CustomRenderOptions = {}
): RenderResult => {
  // Set initial route if provided
  if (initialRoute) {
    window.history.pushState({}, 'Test page', initialRoute);
  }

  const Wrapper = createWrapper({ queryClient, _supabaseClient });

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };

// Async utilities
export const waitForMs = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

// Mock window methods
export const mockWindowMethods = () => {
  const originalLocation = window.location;
  const originalLocalStorage = window.localStorage;
  const originalSessionStorage = window.sessionStorage;

  // Mock location
  delete (window as unknown as { location?: Location }).location;
  window.location = {
    ...originalLocation,
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    href: 'http://localhost:3000',
  } as unknown as Location;

  // Mock storage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      key: (index: number) => Object.keys(store)[index] || null,
      get length() {
        return Object.keys(store).length;
      },
    };
  })();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock,
    writable: true,
  });

  return {
    restore: () => {
      window.location = originalLocation;
      window.localStorage = originalLocalStorage;
      window.sessionStorage = originalSessionStorage;
    },
  };
};

// Mock fetch
export const mockFetch = (
  responses: Array<{ url: string | RegExp; response: unknown; status?: number }>
) => {
  const originalFetch = global.fetch;

  global.fetch = jest.fn(async (url: string | URL, _options?: RequestInit) => {
    const urlString = typeof url === 'string' ? url : url.toString();

    for (const mock of responses) {
      const matches =
        typeof mock.url === 'string'
          ? urlString === mock.url
          : mock.url.test(urlString);

      if (matches) {
        return {
          ok: (mock.status || 200) >= 200 && (mock.status || 200) < 300,
          status: mock.status || 200,
          json: async () => mock.response,
          text: async () => JSON.stringify(mock.response),
          headers: new Headers(),
        } as Response;
      }
    }

    // Default response for unmatched URLs
    return {
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
      text: async () => 'Not found',
      headers: new Headers(),
    } as Response;
  }) as jest.Mock;

  return {
    restore: () => {
      global.fetch = originalFetch;
    },
  };
};

// Test data cleanup
export const cleanupTestData = async (
  supabase: SupabaseClient<Database>,
  tables: string[] = [
    'session_players',
    'bingo_sessions',
    'board_cards',
    'bingo_cards',
    'bingo_boards',
    'users',
  ]
) => {
  for (const table of tables) {
    await supabase
      .from(table as keyof Database['public']['Tables'])
      .delete()
      .gte('created_at', '1900-01-01');
  }
};

// Assertion helpers
export const expectServiceSuccess = <T,>(response: {
  success: boolean;
  data: T | null;
  error: string | null;
}) => {
  expect(response.success).toBe(true);
  expect(response.data).not.toBeNull();
  expect(response.error).toBeNull();
  return response.data as T;
};

export const expectServiceError = (
  response: { success: boolean; data: unknown; error: string | null },
  errorMessage?: string
) => {
  expect(response.success).toBe(false);
  expect(response.data).toBeNull();
  expect(response.error).not.toBeNull();
  if (errorMessage) {
    expect(response.error).toContain(errorMessage);
  }
};

// Zustand testing helpers
export const createMockZustandStore = <T extends object>(initialState: T) => {
  let state = { ...initialState };
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => {
      const newState = typeof partial === 'function' ? partial(state) : partial;
      state = { ...state, ...newState };
      listeners.forEach(listener => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy: () => {
      listeners.clear();
    },
  };
};

// Mock timers utility
export const useFakeTimers = () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  return {
    advanceTime: (ms: number) => jest.advanceTimersByTime(ms),
    runAllTimers: () => jest.runAllTimers(),
    runOnlyPendingTimers: () => jest.runOnlyPendingTimers(),
  };
};

// Console mock utility
export const mockConsole = () => {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  beforeEach(() => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  });

  return {
    expectNoErrors: () => {
      expect(console.error).not.toHaveBeenCalled();
    },
    expectNoWarnings: () => {
      expect(console.warn).not.toHaveBeenCalled();
    },
  };
};

// Type assertion helper
export function assertType<T>(value: unknown): asserts value is T {
  // This is a type assertion function
  // In tests, you might want to add runtime checks
}

// Mock date utility
export const mockDate = (date: string | Date) => {
  const mockDateInstance = new Date(date);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDateInstance);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  return mockDateInstance;
};

// Performance testing utility
export const measurePerformance = async (
  fn: () => Promise<void> | void,
  iterations = 100
) => {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const average = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  return { average, min, max, times };
};

// Export common test patterns
export const testPatterns = {
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  isoDate: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
  sessionCode: /^[A-Z0-9]{6}$/,
};
