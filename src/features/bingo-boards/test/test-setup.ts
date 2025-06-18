import { vi, beforeEach, afterEach } from 'vitest';

// Mock globals
global.WebSocket = vi.fn();
global.performance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  getEntriesByName: vi.fn(),
  getEntriesByType: vi.fn(),
  toJSON: vi.fn(),
} as any;

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  QueryClient: vi.fn(),
  QueryClientProvider: vi.fn(),
}));

// Mock Next.js
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue({ error: null }),
      unsubscribe: vi.fn().mockResolvedValue({ error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
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
    const mock = vi.fn((...args: Parameters<T>) => {
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
    enable: () => vi.useFakeTimers(),
    disable: () => vi.useRealTimers(),
    advance: (ms: number) => vi.advanceTimersByTime(ms),
    advanceToNext: () => vi.advanceTimersToNextTimer(),
    clear: () => vi.clearAllTimers(),
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
  vi.clearAllMocks();
  testHelpers.mockTimers.disable();
});

afterEach(() => {
  vi.clearAllTimers();
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