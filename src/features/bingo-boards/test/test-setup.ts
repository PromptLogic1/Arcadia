import { vi, beforeEach, afterEach } from '@jest/globals';

// Mock globals
global.WebSocket = jest.fn();
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  getEntriesByName: jest.fn(),
  getEntriesByType: jest.fn(),
  toJSON: jest.fn(),
} as any;

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
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
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
  createMockTracker: <T extends (...args: any[]) => any>(implementation?: T) => {
    const calls: Parameters<T>[] = [];
    const mock = jest.fn((...args: Parameters<T>) => {
      calls.push(args);
      return implementation?.(...args);
    });
    
    return {
      mock,
      calls,
      getCalls: () => [...calls],
      getCallCount: () => calls.length,
      getLastCall: () => calls[calls.length - 1],
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

// Test data generators
export const testDataGenerators = {
  randomString: (length = 10) => 
    Math.random().toString(36).substring(2, 2 + length),
    
  randomId: () => 
    `test-${Date.now()}-${Math.random().toString(36).substring(2)}`,
    
  randomColor: () => 
    `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
    
  randomBoardState: (size = 5) => {
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
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection in test:', event.reason);
  });
}

// Export commonly used mocks
export { vi };