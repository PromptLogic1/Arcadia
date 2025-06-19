import { beforeEach, afterEach } from '@jest/globals';
import type { BoardCell } from '../types';

// Mock globals with proper types
const MockWebSocket = jest.fn();
MockWebSocket.prototype = {
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  readyState: 0,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};
Object.setPrototypeOf(MockWebSocket, WebSocket);
global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

// Create a properly typed performance mock
const performanceMock = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
  toJSON: jest.fn(() => ({
    timeOrigin: 0,
    timing: {
      navigationStart: 0,
      unloadEventStart: 0,
      unloadEventEnd: 0,
      redirectStart: 0,
      redirectEnd: 0,
      fetchStart: 0,
      domainLookupStart: 0,
      domainLookupEnd: 0,
      connectStart: 0,
      connectEnd: 0,
      secureConnectionStart: 0,
      requestStart: 0,
      responseStart: 0,
      responseEnd: 0,
      domLoading: 0,
      domInteractive: 0,
      domContentLoadedEventStart: 0,
      domContentLoadedEventEnd: 0,
      domComplete: 0,
      loadEventStart: 0,
      loadEventEnd: 0,
      toJSON: jest.fn(),
    },
    navigation: {
      type: 0,
      redirectCount: 0,
      toJSON: jest.fn(),
    },
  })),
  timeOrigin: 0,
  eventCounts: new Map(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(() => true),
} satisfies Partial<Performance>;

// Assign only the properties that exist
Object.assign(global.performance, performanceMock);

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
  QueryClient: jest.fn(),
  QueryClientProvider: jest.fn(),
}));

// Mock Next.js
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => '/'),
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockResolvedValue({ error: null }),
      unsubscribe: jest.fn().mockResolvedValue({ error: null }),
    })),
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
    },
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Test utilities
export const testHelpers = {
  // Advance timers and flush promises
  flushPromises: () => new Promise(resolve => setTimeout(resolve, 0)),

  // Wait for a condition to be true
  waitFor: async (condition: () => boolean, timeout = 1000) => {
    const start = Date.now();
    while (!condition() && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    if (!condition()) {
      throw new Error('Condition not met within timeout');
    }
  },

  // Create a mock implementation that tracks calls
  createMockTracker: <Args extends readonly unknown[], Return>(
    implementation?: (...args: Args) => Return
  ) => {
    const calls: Args[] = [];
    const mock = jest.fn((...args: Args): Return => {
      calls.push(args);
      return implementation ? implementation(...args) : (undefined as Return);
    });

    return {
      mock,
      calls,
      getCalls: () => [...calls],
      getCallCount: () => calls.length,
      getLastCall: () => calls[calls.length - 1] || undefined,
      reset: () => {
        calls.length = 0;
        mock.mockClear();
      },
    };
  },

  // Mock timer helpers
  mockTimers: {
    enable: () => jest.useFakeTimers(),
    disable: () => jest.useRealTimers(),
    advance: (ms: number) => jest.advanceTimersByTime(ms),
    advanceToNext: () => jest.advanceTimersToNextTimer(),
    clear: () => jest.clearAllTimers(),
  },
};

// Performance test configuration
export const performanceConfig = {
  // Maximum allowed time for operations (in ms)
  maxOperationTime: {
    winDetection: 10,
    cellMarking: 5,
    boardGeneration: 50,
    stateUpdate: 20,
  },

  // Memory usage thresholds
  memoryLimits: {
    maxHeapUsed: 50 * 1024 * 1024, // 50MB
    maxEventListeners: 100,
  },

  // Concurrency limits
  concurrency: {
    maxConcurrentOperations: 10,
    maxPlayersPerSession: 20,
  },
};

// Test data generators using type-safe factories
export const testDataGenerators = {
  randomString: (length = 10): string =>
    Math.random()
      .toString(36)
      .substring(2, 2 + length),

  randomId: (): string =>
    `test-${Date.now()}-${Math.random().toString(36).substring(2)}`,

  randomColor: (): string =>
    `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, '0')}`,

  // Use factory function for consistent board creation
  randomBoardState: (size = 5): BoardCell[] => {
    const cellCount = size * size;
    return Array.from({ length: cellCount }, (_, i) => ({
      text: `Cell ${i}`,
      colors: null,
      completed_by: Math.random() > 0.7 ? ['test-player'] : null,
      blocked: false,
      is_marked: Math.random() > 0.7,
      cell_id: `cell-${i}`,
      version: 1,
      last_updated: Date.now(),
      last_modified_by: null,
    }));
  },
};

// Clean up after each test
beforeEach(() => {
  jest.clearAllMocks();
  testHelpers.mockTimers.disable();
});

afterEach(() => {
  jest.clearAllTimers();
  testHelpers.mockTimers.disable();
});

// Global error handler for unhandled promise rejections in tests
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection in test:', event.reason);
  });
}

// Export commonly used mocks and types
export const vi = jest;
