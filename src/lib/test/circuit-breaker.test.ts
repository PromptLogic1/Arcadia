/**
 * @jest-environment node
 */

// Mock the logger before importing the module
jest.mock('@/lib/logger', () => ({
  log: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  CircuitBreaker,
  CircuitState,
  createRedisCircuitBreaker,
  redisCircuitBreaker,
} from '@/lib/circuit-breaker';
import { log } from '@/lib/logger';

describe('Circuit Breaker', () => {
  const mockLog = log as jest.Mocked<typeof log>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('CircuitBreaker', () => {
    const defaultOptions = {
      failureThreshold: 3,
      failureWindow: 60000,
      recoveryTime: 30000,
    };

    it('should start in CLOSED state', () => {
      const cb = new CircuitBreaker('test', defaultOptions);
      expect(cb.getState()).toBe(CircuitState.CLOSED);
    });

    it('should execute function successfully when circuit is closed', async () => {
      const cb = new CircuitBreaker('test', defaultOptions);
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await cb.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(cb.getState()).toBe(CircuitState.CLOSED);
    });

    it('should open circuit after reaching failure threshold', async () => {
      const cb = new CircuitBreaker('test', defaultOptions);
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

      // Trigger failures to reach threshold
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(mockFn);
        } catch {
          // Expected to fail
        }
      }

      expect(cb.getState()).toBe(CircuitState.OPEN);
      expect(mockLog.warn).toHaveBeenCalledWith('Circuit breaker test opened');
    });

    it('should reject requests when circuit is open', async () => {
      const cb = new CircuitBreaker('test', defaultOptions);
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(mockFn);
        } catch {
          // Expected to fail
        }
      }

      expect(cb.getState()).toBe(CircuitState.OPEN);

      // Now try to execute - should be rejected immediately
      const mockSuccessFn = jest.fn().mockResolvedValue('success');
      
      await expect(cb.execute(mockSuccessFn)).rejects.toThrow('Circuit breaker test is OPEN');
      expect(mockSuccessFn).not.toHaveBeenCalled();
    });

    it('should use fallback when circuit is open', async () => {
      const cb = new CircuitBreaker('test', defaultOptions);
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      const fallback = jest.fn().mockReturnValue('fallback result');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(mockFn);
        } catch {
          // Expected to fail
        }
      }

      const result = await cb.execute(mockFn, fallback);

      expect(result).toBe('fallback result');
      expect(fallback).toHaveBeenCalledTimes(1);
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Circuit breaker test using fallback',
        { metadata: { state: CircuitState.OPEN, error: expect.any(Error) } }
      );
    });

    it('should transition to HALF_OPEN after recovery time', async () => {
      const cb = new CircuitBreaker('test', defaultOptions);
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(mockFn);
        } catch {
          // Expected to fail
        }
      }

      expect(cb.getState()).toBe(CircuitState.OPEN);

      // Advance time past recovery period
      jest.advanceTimersByTime(30001);

      expect(cb.getState()).toBe(CircuitState.HALF_OPEN);
      expect(mockLog.info).toHaveBeenCalledWith('Circuit breaker test half-open');
    });

    it('should close circuit on successful execution in HALF_OPEN state', async () => {
      const cb = new CircuitBreaker('test', defaultOptions);
      const mockFailFn = jest.fn().mockRejectedValue(new Error('test error'));
      const mockSuccessFn = jest.fn().mockResolvedValue('success');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(mockFailFn);
        } catch {
          // Expected to fail
        }
      }

      // Advance time to HALF_OPEN
      jest.advanceTimersByTime(30001);
      expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

      // Execute successful function
      const result = await cb.execute(mockSuccessFn);

      expect(result).toBe('success');
      expect(cb.getState()).toBe(CircuitState.CLOSED);
      expect(mockLog.info).toHaveBeenCalledWith('Circuit breaker test closed');
    });

    it('should reopen circuit on failure in HALF_OPEN state', async () => {
      const cb = new CircuitBreaker('test', defaultOptions);
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(mockFn);
        } catch {
          // Expected to fail
        }
      }

      // Advance time to HALF_OPEN
      jest.advanceTimersByTime(30001);
      expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

      // Execute failing function - should reopen circuit
      try {
        await cb.execute(mockFn);
      } catch {
        // Expected to fail
      }

      expect(cb.getState()).toBe(CircuitState.OPEN);
    });

    it('should reset failure count on success in CLOSED state', async () => {
      const cb = new CircuitBreaker('test', defaultOptions);
      const mockFailFn = jest.fn().mockRejectedValue(new Error('test error'));
      const mockSuccessFn = jest.fn().mockResolvedValue('success');

      // Add some failures (but not enough to open)
      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(mockFailFn);
        } catch {
          // Expected to fail
        }
      }

      expect(cb.getState()).toBe(CircuitState.CLOSED);

      // Execute successful function - should reset failure count
      await cb.execute(mockSuccessFn);

      // Now we should be able to add 2 more failures without opening
      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(mockFailFn);
        } catch {
          // Expected to fail
        }
      }

      expect(cb.getState()).toBe(CircuitState.CLOSED);
    });

    it('should clean up old failures outside the window', async () => {
      const cb = new CircuitBreaker('test', defaultOptions);
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

      // Add 2 failures
      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(mockFn);
        } catch {
          // Expected to fail
        }
      }

      // Advance time past failure window
      jest.advanceTimersByTime(60001);

      // Add one more failure - should not open circuit because old failures are cleaned up
      try {
        await cb.execute(mockFn);
      } catch {
        // Expected to fail
      }

      expect(cb.getState()).toBe(CircuitState.CLOSED);
    });

    it('should provide circuit metrics', async () => {
      const cb = new CircuitBreaker('test', defaultOptions);
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

      const initialMetrics = cb.getMetrics();
      expect(initialMetrics.state).toBe(CircuitState.CLOSED);
      expect(initialMetrics.failures).toBe(0);
      expect(initialMetrics.isHealthy).toBe(true);

      // Add a failure
      try {
        await cb.execute(mockFn);
      } catch {
        // Expected to fail
      }

      const metricsAfterFailure = cb.getMetrics();
      expect(metricsAfterFailure.failures).toBe(1);
      expect(metricsAfterFailure.lastFailureTime).toBeGreaterThan(0);
      expect(metricsAfterFailure.isHealthy).toBe(true);

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(mockFn);
        } catch {
          // Expected to fail
        }
      }

      const metricsAfterOpen = cb.getMetrics();
      expect(metricsAfterOpen.state).toBe(CircuitState.OPEN);
      expect(metricsAfterOpen.isHealthy).toBe(false);
    });

    it('should allow manual reset', async () => {
      const cb = new CircuitBreaker('test', defaultOptions);
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(mockFn);
        } catch {
          // Expected to fail
        }
      }

      expect(cb.getState()).toBe(CircuitState.OPEN);

      // Reset manually
      cb.reset();

      expect(cb.getState()).toBe(CircuitState.CLOSED);
      expect(cb.getMetrics().failures).toBe(0);
      expect(cb.getMetrics().lastFailureTime).toBe(0);
      expect(mockLog.info).toHaveBeenCalledWith('Circuit breaker test closed');
    });

    it('should use fallback on failure when provided', async () => {
      const cb = new CircuitBreaker('test', defaultOptions);
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      const fallback = jest.fn().mockReturnValue('fallback result');

      const result = await cb.execute(mockFn, fallback);

      expect(result).toBe('fallback result');
      expect(fallback).toHaveBeenCalledTimes(1);
      expect(mockLog.debug).toHaveBeenCalledWith(
        'Circuit breaker test using fallback',
        { metadata: { state: CircuitState.CLOSED, error: expect.any(Error) } }
      );
    });

    it('should handle async fallback functions', async () => {
      const cb = new CircuitBreaker('test', defaultOptions);
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      const asyncFallback = jest.fn().mockResolvedValue('async fallback result');

      const result = await cb.execute(mockFn, asyncFallback);

      expect(result).toBe('async fallback result');
      expect(asyncFallback).toHaveBeenCalledTimes(1);
    });

    it('should call custom callbacks on state changes', async () => {
      const onOpen = jest.fn();
      const onClose = jest.fn();
      const onHalfOpen = jest.fn();

      const cb = new CircuitBreaker('test', {
        ...defaultOptions,
        onOpen,
        onClose,
        onHalfOpen,
      });

      const mockFailFn = jest.fn().mockRejectedValue(new Error('test error'));
      const mockSuccessFn = jest.fn().mockResolvedValue('success');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(mockFailFn);
        } catch {
          // Expected to fail
        }
      }

      expect(onOpen).toHaveBeenCalledTimes(1);

      // Advance time to HALF_OPEN
      jest.advanceTimersByTime(30001);
      cb.getState(); // Trigger state update

      expect(onHalfOpen).toHaveBeenCalledTimes(1);

      // Close the circuit
      await cb.execute(mockSuccessFn);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('createRedisCircuitBreaker', () => {
    it('should create a circuit breaker with Redis-specific configuration', () => {
      const cb = createRedisCircuitBreaker();

      expect(cb).toBeInstanceOf(CircuitBreaker);
      
      const metrics = cb.getMetrics();
      expect(metrics.state).toBe(CircuitState.CLOSED);
    });

    it('should use Redis-specific callbacks', async () => {
      const cb = createRedisCircuitBreaker();
      const mockFn = jest.fn().mockRejectedValue(new Error('Redis error'));

      // Open the circuit (Redis config uses 5 failures)
      for (let i = 0; i < 5; i++) {
        try {
          await cb.execute(mockFn);
        } catch {
          // Expected to fail
        }
      }

      expect(mockLog.error).toHaveBeenCalledWith(
        'Redis circuit breaker opened - Redis operations will fail fast'
      );
    });

    it('should log when Redis circuit breaker closes', async () => {
      const cb = createRedisCircuitBreaker();
      const mockFailFn = jest.fn().mockRejectedValue(new Error('Redis error'));
      const mockSuccessFn = jest.fn().mockResolvedValue('success');

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await cb.execute(mockFailFn);
        } catch {
          // Expected to fail
        }
      }

      // Advance time to HALF_OPEN and close
      jest.advanceTimersByTime(30001);
      await cb.execute(mockSuccessFn);

      expect(mockLog.info).toHaveBeenCalledWith(
        'Redis circuit breaker closed - Redis operations restored'
      );
    });
  });

  describe('redisCircuitBreaker global instance', () => {
    it('should provide a global Redis circuit breaker instance', () => {
      expect(redisCircuitBreaker).toBeInstanceOf(CircuitBreaker);
      expect(redisCircuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should maintain state across multiple uses', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Redis error'));

      // Use the global instance
      for (let i = 0; i < 5; i++) {
        try {
          await redisCircuitBreaker.execute(mockFn);
        } catch {
          // Expected to fail
        }
      }

      expect(redisCircuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('edge cases', () => {
    it('should handle zero failure threshold', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 0,
        failureWindow: 60000,
        recoveryTime: 30000,
      });

      expect(cb.getState()).toBe(CircuitState.CLOSED);
      
      // Should immediately open on any failure
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      try {
        await cb.execute(mockFn);
      } catch {
        // Expected to fail
      }

      expect(cb.getState()).toBe(CircuitState.OPEN);
    });

    it('should handle very short failure window', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 2,
        failureWindow: 1, // 1ms window
        recoveryTime: 30000,
      });

      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

      // Add one failure
      try {
        await cb.execute(mockFn);
      } catch {
        // Expected to fail
      }

      // Advance time past window
      jest.advanceTimersByTime(2);

      // Add another failure - should not open because first failure is outside window
      try {
        await cb.execute(mockFn);
      } catch {
        // Expected to fail
      }

      expect(cb.getState()).toBe(CircuitState.CLOSED);
    });

    it('should handle very short recovery time', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 1,
        failureWindow: 60000,
        recoveryTime: 1, // 1ms recovery
      });

      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

      // Open the circuit
      try {
        await cb.execute(mockFn);
      } catch {
        // Expected to fail
      }

      expect(cb.getState()).toBe(CircuitState.OPEN);

      // Advance time past recovery
      jest.advanceTimersByTime(2);

      expect(cb.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should not change state unnecessarily', () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 3,
        failureWindow: 60000,
        recoveryTime: 30000,
      });
      
      // Multiple calls to getState should not trigger unnecessary state changes
      const state1 = cb.getState();
      const state2 = cb.getState();
      const state3 = cb.getState();

      expect(state1).toBe(state2);
      expect(state2).toBe(state3);
      expect(state1).toBe(CircuitState.CLOSED);
    });
  });
});