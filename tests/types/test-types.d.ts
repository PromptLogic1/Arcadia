// Global test type definitions
import type { Request } from '@playwright/test';

// Supabase mock types
export interface SupabaseRealtimeChannel {
  on: (event: string, callback: (payload: unknown) => void) => SupabaseRealtimeChannel;
  subscribe: (callback?: (status: string, err?: Error) => void) => SupabaseRealtimeChannel;
  unsubscribe: () => SupabaseRealtimeChannel;
  send: (message: unknown) => void;
}

export interface SupabaseRealtimeClient {
  channel: (name: string) => SupabaseRealtimeChannel;
}

export interface MockSupabaseClient {
  realtime?: SupabaseRealtimeClient;
  auth?: {
    getSession: () => Promise<{ data: { session: unknown } }>;
    onAuthStateChange: (callback: (event: string, session: unknown) => void) => { unsubscribe: () => void };
  };
  from: (table: string) => unknown;
}

// Window extensions for tests
export interface TestWindowExtensions {
  // Realtime test extensions
  __realtimeTestConfig?: unknown;
  __realtimeEvents?: unknown[];
  __realtimeConnections?: Map<string, {
    handlers: Map<string, Array<(event: unknown) => void>>;
    subscribed: boolean;
  }>;
  __mockRealtime?: SupabaseRealtimeClient;
  __realtimeCallback?: (...args: unknown[]) => void;
  __mockChannel?: SupabaseRealtimeChannel;
  
  // Supabase extensions
  supabase?: MockSupabaseClient;
  
  // WebSocket extensions
  __mockWebSocket?: typeof WebSocket;
  __wsMessages?: unknown[];
  WebSocket?: typeof WebSocket;
  
  // Performance extensions
  __performanceMetrics?: {
    marks: PerformanceEntry[];
    measures: PerformanceEntry[];
  } | Array<{ timestamp: number; latency: number; eventType: string }>;
  __performanceMonitor?: unknown;
  
  // Error tracking
  __errors?: Error[];
  __consoleErrors?: string[];
  
  // Test data
  __testData?: unknown;
  __memoryPressure?: unknown[];
  
  // XSS test properties
  xssTest?: boolean;
  
  // Clipboard test properties
  __clipboardWriteCalled?: boolean;
  
  // Window.open test properties
  __originalOpen?: typeof window.open;
  __openCalled?: boolean;
  
  // Download test properties
  __originalCreateObjectURL?: typeof URL.createObjectURL;
  __downloadClicked?: boolean;
  
  // Analytics
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
  __analyticsEvents?: Array<{
    provider: string;
    data: unknown;
    args?: unknown[];
    timestamp: number;
  }>;
  ga?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  _linkedin_data_partner_ids?: unknown[];
  twq?: (...args: unknown[]) => void;
  hj?: (...args: unknown[]) => void;
  analytics?: {
    track?: (...args: unknown[]) => void;
    page?: (...args: unknown[]) => void;
    identify?: (...args: unknown[]) => void;
  };
  
  // Sentry
  Sentry?: {
    captureException: (error: Error, context?: unknown) => void;
    captureMessage: (message: string) => void;
    withScope?: (callback: (scope: unknown) => void) => void;
  };
  captureSentryEvent?: (event: unknown) => void;
  
  // Performance tracking
  updateCount?: number;
  trackUpdate?: () => void;
  
  // Debug utilities
  getEventListeners?: (target: EventTarget) => Record<string, EventListener[]>;
  
  // Rejection tracking
  __rejectionTracker?: {
    rejections: Array<{ promise: Promise<unknown>; reason: unknown; handled: boolean }>;
    getUnhandledCount: () => number;
    getTotalCount: () => number;
  };
  
  // Promise chain tracking
  __promiseChainTracker?: {
    chains: Map<string, { promises: Array<Promise<unknown>>; errors: Error[] }>;
    activeChains: Set<string>;
    errors?: Error[];
    createRecoveryMechanism?: (chainId: string) => { 
      recover: () => Promise<unknown>; 
      errorHandler: (step: string) => (error: Error | unknown) => Promise<unknown>;
    };
  };
  
  // Component lifecycle tracking
  __componentLifecycle?: {
    components: Map<string, { mounted: boolean; errors: Error[]; cleanupFns: Array<() => void> }>;
    state?: {
      mounted: boolean;
      cleanupErrors: Array<{
        componentId: string;
        error: string;
        phase: 'mount' | 'update' | 'unmount';
        timestamp: number;
      }>;
    };
    createComponent?: (componentId: string) => { 
      id: string;
      mounted: boolean;
      cleanupFunctions: Array<() => void>;
      mount: () => void; 
      unmount: () => void;
    };
  };
  
  // Async component tracking
  __asyncComponentTracker?: {
    components: Map<string, {
      id: string;
      mounted: boolean;
      pendingUpdates: number;
      stateUpdateErrors: string[];
    }>;
    globalErrors: string[];
    tracker: {
      components: Map<string, {
        id: string;
        mounted: boolean;
        pendingUpdates: number;
        stateUpdateErrors: string[];
      }>;
      globalErrors: string[];
    };
    createAsyncComponent: (componentId: string) => {
      id: string;
      fetchData: () => Promise<unknown>;
      startMultipleOperations: () => Promise<unknown>;
      unmount: () => void;
    };
  };
  
  // Exponential backoff tracking
  __exponentialBackoff?: {
    attempts: Map<string, Array<{
      attempt: number;
      delay: number;
      success: boolean;
      error?: string;
      timestamp: number;
    }>>;
    maxAttempts: number;
    createExponentialBackoff: (config: {
      initialDelay: number;
      maxDelay: number;
      multiplier: number;
      maxAttempts: number;
      jitter: boolean;
    }) => {
      execute: <T>(operation: () => Promise<T>, operationName?: string) => Promise<T | null>;
      getAttempts: () => Array<{
        attempt: number;
        delay: number;
        success: boolean;
        error?: string;
        timestamp: number;
      }>;
    };
  };
  
  // Circuit breaker tracking
  __circuitBreaker?: {
    createCircuitBreaker: (config: {
      failureThreshold: number;
      resetTimeout: number;
      monitoringPeriod: number;
    }) => {
      execute: <T>(operation: () => Promise<T>) => Promise<T>;
      getState: () => {
        state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
        failures: number;
        lastFailureTime: number;
        lastSuccessTime: number;
        operationHistory: Array<{
          timestamp: number;
          success: boolean;
          duration: number;
          blocked: boolean;
        }>;
      };
    };
  };
  testCircuitBreaker?: () => Promise<unknown>;
  
  // Retry functionality
  retryRequest?: () => Promise<unknown>;
  
  // App state tracking
  __appState?: unknown;
  
  // Recovery tracking
  recoveryResult?: unknown;
  
  // Storage event tracking
  receivedStorageEvent?: boolean;
  
  // Listener tracking
  __listenerTracker?: {
    listenerCount: number;
    leakDetection: boolean;
    clear: () => void;
    getListenerCount: () => number;
    cleanup: () => void;
  };
  
  // Listener count
  listenerCount?: number;
  cleanup?: () => void;
  
  // Atomic operations
  testAtomicWrite?: (updates: unknown) => Promise<unknown>;
  updateWithRollback?: (update: unknown) => Promise<unknown>;
  
  // Date constructor for mocking
  Date?: DateConstructor;
  
  // Redis resilience testing
  redisCircuitBreaker?: unknown;
  makeApiCall?: () => Promise<unknown>;
  distributedLock?: unknown;
  redisPool?: unknown;
  connectionLease?: unknown;
  resilientRedis?: unknown;
  perfMonitor?: unknown;
  simulateRedisOp?: unknown;
  cacheWithFallback?: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
    isUsingFallback(): boolean;
  };
  
  // Error boundary
  errorBoundary?: {
    handleError: (error: Error) => void;
    getState?: () => unknown;
  };
}

// Extended window type for tests
export type TestWindow = Window & TestWindowExtensions;

// Export TestWindow for global access
declare global {
  type TestWindow = Window & TestWindowExtensions;
}

// Error types
export interface TestError extends Error {
  code?: string;
  statusCode?: number;
  isOperational?: boolean;
  metadata?: Record<string, unknown>;
  errorBoundaryData?: {
    componentStack?: string;
    errorBoundary?: string;
    eventId?: string;
    errorInfo?: Record<string, unknown>;
  };
}

// Mock types for Supabase (removing duplicate interface)

// Export MockRealtimeChannel for test usage
export { SupabaseRealtimeChannel as MockRealtimeChannel };

// Mock WebSocket types
export interface MockWebSocket extends WebSocket {
  mockClose?: () => void;
  mockError?: (error: Error) => void;
  mockMessage?: (data: unknown) => void;
}

// Sentry types
export interface SentryScope {
  setTag: (key: string, value: string) => void;
  setContext: (key: string, context: Record<string, unknown>) => void;
  setUser: (user: Record<string, unknown> | null) => void;
}

// Event callback types
export type EventCallback = (event: unknown) => void;

// Route handler types
export interface RouteHandler {
  (route: Route, request: Request): Promise<void> | void;
}

// Event types
export interface RealtimeEvent {
  type: string;
  channel?: string;
  message?: unknown;
  timestamp: number;
  eventType?: string;
  table?: string;
  schema?: string;
  new?: unknown;
  old?: unknown;
  commit_timestamp?: string;
}

// Callback types
export type StatusCallback = (status: string, error?: Error) => void;
export type RouteCallback = (route: Route) => Promise<void> | void;

// Helper types
export type AnyFunction = (...args: unknown[]) => unknown;
export type AsyncFunction = (...args: unknown[]) => Promise<unknown>;

// Page evaluation types
export interface PageEvaluateOptions<T = unknown> {
  (arg?: T): unknown;
}

// Mock class types
export interface MockWebSocketClass extends WebSocket {
  new (url: string, protocols?: string | string[]): WebSocket;
}

// Performance observer types
export interface PerformanceObserverCallback {
  (list: PerformanceObserverEntryList, observer: PerformanceObserver): void;
}

// Global declarations
declare global {
  interface Window extends TestWindowExtensions {
    gc?: () => void;
  }
  
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}