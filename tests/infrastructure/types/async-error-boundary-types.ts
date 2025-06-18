/**
 * Type definitions for async error boundary tests
 */

// Promise chain error that properly extends Error
export class PromiseChainError extends Error {
  step: string;
  error: string;
  timestamp: number;
  recovered: boolean;
  
  constructor(step: string, error: string) {
    super(error);
    this.name = 'PromiseChainError';
    this.step = step;
    this.error = error;
    this.timestamp = Date.now();
    this.recovered = false;
  }
}

// Recovery mechanism interface
export interface RecoveryMechanism {
  recover: () => Promise<string>;
  errorHandler: (step: string) => (error: Error | unknown) => Promise<string>;
}

// Promise chain tracker interface
export interface PromiseChainTracker {
  chains: Map<string, { promises: Array<Promise<unknown>>; errors: PromiseChainError[] }>;
  activeChains: Set<string>;
  errors: PromiseChainError[];
  createRecoveryMechanism: (chainId: string) => RecoveryMechanism;
}

// Component lifecycle interfaces
export interface ComponentCleanupError {
  componentId: string;
  error: string;
  phase: 'mount' | 'update' | 'unmount';
  timestamp: number;
}

export interface ComponentState {
  mounted: boolean;
  cleanupErrors: ComponentCleanupError[];
}

export interface LifecycleComponent {
  id: string;
  mounted: boolean;
  cleanupFunctions: Array<() => void>;
  mount: () => void;
  unmount: () => void;
}

export interface ComponentLifecycleTracker {
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
}

// Async component interfaces
export interface AsyncComponentData {
  id: string;
  mounted: boolean;
  pendingUpdates: number;
  stateUpdateErrors: string[];
}

export interface AsyncComponent {
  id: string;
  fetchData: () => Promise<{ data: string } | null>;
  startMultipleOperations: () => Promise<PromiseSettledResult<{ data: string } | null>[]>;
  unmount: () => void;
}

export interface AsyncComponentTracker {
  components: Map<string, AsyncComponentData>;
  globalErrors: string[];
  tracker: {
    components: Map<string, AsyncComponentData>;
    globalErrors: string[];
  };
  createAsyncComponent: (id: string) => AsyncComponent;
}

// Exponential backoff interfaces
export interface BackoffConfig {
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
  maxAttempts: number;
  jitter: boolean;
}

export interface AttemptResult {
  attempt: number;
  delay: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface ExponentialBackoff {
  execute: <T>(operation: () => Promise<T>, operationName?: string) => Promise<T | null>;
  getAttempts: () => AttemptResult[];
}

export interface ExponentialBackoffTracker {
  attempts: Map<string, AttemptResult[]>;
  maxAttempts: number;
  createExponentialBackoff: (config: BackoffConfig) => ExponentialBackoff;
}

// Circuit breaker interfaces
export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

export interface CircuitBreakerOperation {
  timestamp: number;
  success: boolean;
  duration: number;
  blocked: boolean;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  operationHistory: CircuitBreakerOperation[];
}

export interface CircuitBreaker {
  execute: <T>(operation: () => Promise<T>) => Promise<T>;
  getState: () => CircuitBreakerState;
}

export interface CircuitBreakerTracker {
  createCircuitBreaker: (config: CircuitBreakerConfig) => CircuitBreaker;
}

// Extended window interface for async error boundary tests
export interface AsyncErrorBoundaryWindow extends Window {
  __rejectionTracker?: {
    rejections: Array<{
      reason: unknown;
      promise: Promise<unknown>;
      timestamp: number;
      handled: boolean;
    }>;
    getUnhandledCount: () => number;
    getTotalCount: () => number;
  };
  __promiseChainTracker?: PromiseChainTracker;
  __componentLifecycle?: ComponentLifecycleTracker;
  __asyncComponentTracker?: AsyncComponentTracker;
  __exponentialBackoff?: ExponentialBackoffTracker;
  __circuitBreaker?: CircuitBreakerTracker;
}