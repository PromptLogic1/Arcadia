/**
 * Circuit Breaker Pattern Implementation
 *
 * Provides fault tolerance for Redis operations by implementing
 * the circuit breaker pattern. Prevents cascading failures when
 * Redis is unavailable or experiencing issues.
 */

import { log } from '@/lib/logger';

export interface CircuitBreakerOptions {
  /**
   * Number of failures before opening the circuit
   */
  failureThreshold: number;

  /**
   * Time window in ms to track failures
   */
  failureWindow: number;

  /**
   * Time in ms before attempting to close the circuit
   */
  recoveryTime: number;

  /**
   * Optional callback when circuit opens
   */
  onOpen?: () => void;

  /**
   * Optional callback when circuit closes
   */
  onClose?: () => void;

  /**
   * Optional callback when circuit enters half-open state
   */
  onHalfOpen?: () => void;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class CircuitBreaker<_T = unknown> {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number[] = [];
  private lastFailureTime = 0;
  private successCount = 0;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(
    private readonly name: string,
    options: CircuitBreakerOptions
  ) {
    this.options = {
      onOpen: () => log.warn(`Circuit breaker ${name} opened`),
      onClose: () => log.info(`Circuit breaker ${name} closed`),
      onHalfOpen: () => log.info(`Circuit breaker ${name} half-open`),
      ...options,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<R>(
    fn: () => Promise<R>,
    fallback?: () => R | Promise<R>
  ): Promise<R> {
    // Check if we should attempt the operation
    if (!this.canAttempt()) {
      if (fallback) {
        return await fallback();
      }
      throw new Error(`Circuit breaker ${this.name} is OPEN`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();

      if (fallback) {
        log.debug(`Circuit breaker ${this.name} using fallback`, {
          metadata: { state: this.state, error },
        });
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Check if an operation can be attempted
   */
  private canAttempt(): boolean {
    this.updateState();

    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        return false;

      case CircuitState.HALF_OPEN:
        // Allow one request through to test recovery
        return true;

      default:
        return false;
    }
  }

  /**
   * Update circuit state based on current conditions
   */
  private updateState(): void {
    const now = Date.now();

    // Clean up old failures outside the window
    this.failures = this.failures.filter(
      time => now - time < this.options.failureWindow
    );

    switch (this.state) {
      case CircuitState.CLOSED:
        // Check if we should open the circuit
        if (this.failures.length >= this.options.failureThreshold) {
          this.setState(CircuitState.OPEN);
          this.lastFailureTime = now;
        }
        break;

      case CircuitState.OPEN:
        // Check if we should try half-open
        if (now - this.lastFailureTime >= this.options.recoveryTime) {
          this.setState(CircuitState.HALF_OPEN);
          this.successCount = 0;
        }
        break;

      case CircuitState.HALF_OPEN:
        // State will be updated based on success/failure
        break;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    switch (this.state) {
      case CircuitState.HALF_OPEN:
        this.successCount++;
        // Close circuit after successful test
        if (this.successCount >= 1) {
          this.setState(CircuitState.CLOSED);
          this.failures = [];
          this.successCount = 0;
        }
        break;

      case CircuitState.CLOSED:
        // Reset failure tracking on success
        if (this.failures.length > 0) {
          this.failures = [];
        }
        break;
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    const now = Date.now();
    this.failures.push(now);
    this.lastFailureTime = now;

    switch (this.state) {
      case CircuitState.HALF_OPEN:
        // Immediately reopen on failure during test
        this.setState(CircuitState.OPEN);
        break;

      case CircuitState.CLOSED:
        // Will check threshold in updateState
        break;
    }
  }

  /**
   * Set circuit state and trigger callbacks
   */
  private setState(newState: CircuitState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;

    log.info(`Circuit breaker ${this.name} state change`, {
      metadata: { from: oldState, to: newState },
    });

    switch (newState) {
      case CircuitState.OPEN:
        this.options.onOpen();
        break;
      case CircuitState.CLOSED:
        this.options.onClose();
        break;
      case CircuitState.HALF_OPEN:
        this.options.onHalfOpen();
        break;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    this.updateState();
    return this.state;
  }

  /**
   * Get circuit metrics
   */
  getMetrics() {
    return {
      state: this.state,
      failures: this.failures.length,
      lastFailureTime: this.lastFailureTime,
      isHealthy: this.state === CircuitState.CLOSED,
    };
  }

  /**
   * Force reset the circuit breaker
   */
  reset(): void {
    this.failures = [];
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.setState(CircuitState.CLOSED);
  }
}

/**
 * Create a circuit breaker for Redis operations
 */
export function createRedisCircuitBreaker(): CircuitBreaker<unknown> {
  return new CircuitBreaker('redis', {
    failureThreshold: 5, // Open after 5 failures
    failureWindow: 60000, // Within 1 minute
    recoveryTime: 30000, // Try recovery after 30 seconds
    onOpen: () => {
      log.error(
        'Redis circuit breaker opened - Redis operations will fail fast'
      );
      // Could send alert to monitoring service here
    },
    onClose: () => {
      log.info('Redis circuit breaker closed - Redis operations restored');
    },
  });
}

/**
 * Global Redis circuit breaker instance
 */
export const redisCircuitBreaker = createRedisCircuitBreaker();
