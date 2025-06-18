/**
 * Infrastructure Test Types
 * 
 * Type definitions for infrastructure resilience and Redis testing.
 */

// Redis metrics tracking type
export type RedisMetrics = {
  attempts: number;
  failures: number;
  circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
};

// Circuit breaker implementation type
export type TestCircuitBreaker = {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  readonly threshold: number;
  readonly timeout: number;
  readonly halfOpenSuccesses: number;
  openTime: number;
  execute<T>(operation: () => Promise<T>): Promise<T>;
};

// Distributed lock implementation type
export type DistributedLock = {
  acquire(key: string, ttlMs?: number): Promise<boolean>;
  release(key: string): Promise<void>;
  waitForLock(key: string, maxWaitMs?: number): Promise<boolean>;
};

// Cache metrics tracking type
export type CacheMetrics = {
  hits: number;
  misses: number;
  errors: number;
  latencies: number[];
  recordHit(latency: number): void;
  recordMiss(latency: number): void;
  recordError(): void;
  getStats(): {
    hits: number;
    misses: number;
    errors: number;
    hitRate: number;
    avgLatency: number;
    p95Latency: number;
  };
};

// Cache with fallback implementation type
export type CacheWithFallback = {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  isUsingFallback(): boolean;
};

// Mock fetch function type
export type MockFetch = (url: string) => Promise<Response>;

// Generic cache data type
export type CacheData = {
  data: string;
  timestamp?: number;
};

// Expensive computation result type
export type ComputationResult = {
  data: string;
  timestamp: number;
};

// Window extension for Redis resilience tests
export interface TestWindow extends Window {
  // Allow additional properties
  [key: string]: unknown;
  // Redis metrics
  redisMetrics?: RedisMetrics;
  
  // Circuit breaker
  circuitBreaker?: TestCircuitBreaker;
  
  // Distributed lock
  distributedLock?: DistributedLock;
  
  // Cache metrics
  cacheMetrics?: CacheMetrics;
  
  // Cache operations
  cache?: Map<string, unknown>;
  cacheGet?: (key: string) => Promise<unknown>;
  cacheGetWithMetrics?: (key: string) => Promise<unknown>;
  cacheSetWithMetrics?: (key: string, value: unknown) => Promise<void>;
  
  // Cache with fallback
  cacheWithFallback?: CacheWithFallback;
  
  // Lock operations
  acquireLock?: (key: string) => Promise<boolean>;
  
  // Computation operations
  computeExpensiveData?: () => Promise<ComputationResult>;
  getOrCompute?: (key: string) => Promise<ComputationResult>;
  
  // Mock fetch override
  mockFetch?: MockFetch;
  
  // Event listener tracking for performance tests
  __listenerTracker?: {
    listenerCount: number;
    leakDetection: boolean;
    clear: () => void;
    getListenerCount: () => number;
    cleanup: () => void;
  };
  
  // Performance monitoring
  __performanceMonitor?: {
    errors: Array<{
      type: string;
      threshold: number;
      actual: number;
      timestamp: number;
    }>;
    recovery: Array<{
      type: string;
      recoveryTime: number;
      successful: boolean;
    }>;
  };
  
  // Garbage collection function (if available)
  gc?: () => void;
}

// Infrastructure failure configuration
export type InfrastructureFailure = {
  fatal: boolean;
  recoverable: boolean;
};

// Performance metrics type
export type PerformanceMetrics = {
  duration: number;
  startTime: number;
  endTime: number;
};