/**
 * Infrastructure Unit Tests
 * 
 * Tests error boundaries, retry logic, cache strategies, and rate limiting
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { ErrorInfo } from 'react';

// Mock Sentry for testing
const mockSentry = {
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn((callback) => {
    const scope = {
      setTag: jest.fn(),
      setContext: jest.fn(),
      setUser: jest.fn(),
    };
    callback(scope);
  }),
};

describe('Infrastructure Reliability Patterns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('Error Boundary Logic', () => {
    // Error ID generator
    const generateErrorId = (): string => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 11);
      return `${timestamp}-${random}`;
    };

    // Error type classifier
    const classifyError = (error: Error): 'component' | 'network' | 'api' | 'unknown' => {
      if (error.message.includes('Network') || error.message.includes('fetch') || error.message.includes('ERR_NETWORK')) {
        return 'network';
      }
      if (error.message.includes('API') || error.message.includes('401') || error.message.includes('500')) {
        return 'api';
      }
      if (error.stack?.includes('at Component') || error.stack?.includes('React')) {
        return 'component';
      }
      return 'unknown';
    };

    describe('Error ID Generation', () => {
      it('should generate unique error IDs', () => {
        const ids = new Set<string>();
        for (let i = 0; i < 100; i++) {
          const id = generateErrorId();
          expect(id).toMatch(/^\d{13}-[a-z0-9]{9}$/);
          expect(ids.has(id)).toBe(false);
          ids.add(id);
        }
      });
    });

    describe('Error Classification', () => {
      it('should classify different error types', () => {
        expect(classifyError(new Error('Network request failed'))).toBe('network');
        expect(classifyError(new Error('API request failed'))).toBe('api');
        
        const componentError = new Error('Cannot read property');
        componentError.stack = 'Error\n    at Component (app.js:123)\n    at React.render';
        expect(classifyError(componentError)).toBe('component');
      });
    });

    describe('Circuit Breaker Integration', () => {
      class CircuitBreakerErrorBoundary {
        private errorCount = 0;
        private readonly threshold = 3;
        private circuitOpen = false;

        handleError(error: Error): 'handled' | 'circuit_open' {
          if (this.circuitOpen) {
            return 'circuit_open';
          }

          this.errorCount++;
          if (this.errorCount >= this.threshold) {
            this.circuitOpen = true;
            return 'circuit_open';
          }

          return 'handled';
        }

        getState(): 'CLOSED' | 'OPEN' {
          return this.circuitOpen ? 'OPEN' : 'CLOSED';
        }

        reset(): void {
          this.circuitOpen = false;
          this.errorCount = 0;
        }
      }

      it('should open circuit after threshold', () => {
        const boundary = new CircuitBreakerErrorBoundary();

        expect(boundary.getState()).toBe('CLOSED');

        // Trigger errors up to threshold
        for (let i = 0; i < 3; i++) {
          const result = boundary.handleError(new Error(`Error ${i}`));
          expect(result).toBe(i < 2 ? 'handled' : 'circuit_open');
        }

        expect(boundary.getState()).toBe('OPEN');
      });
    });
  });

  describe('Retry Logic', () => {
    interface RetryOptions {
      maxRetries: number;
      initialDelay: number;
      backoffMultiplier: number;
      jitter: boolean;
    }

    const calculateDelay = (attempt: number, options: RetryOptions): number => {
      const exponentialDelay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1);
      
      if (options.jitter) {
        const jitterFactor = 0.75 + Math.random() * 0.5;
        return Math.round(exponentialDelay * jitterFactor);
      }
      
      return exponentialDelay;
    };

    describe('Exponential Backoff', () => {
      it('should calculate delays with exponential growth', () => {
        const options: RetryOptions = {
          maxRetries: 5,
          initialDelay: 1000,
          backoffMultiplier: 2,
          jitter: false,
        };
        
        expect(calculateDelay(1, options)).toBe(1000);  // 1s
        expect(calculateDelay(2, options)).toBe(2000);  // 2s
        expect(calculateDelay(3, options)).toBe(4000);  // 4s
      });

      it('should add jitter when enabled', () => {
        const options: RetryOptions = {
          maxRetries: 3,
          initialDelay: 1000,
          backoffMultiplier: 2,
          jitter: true,
        };
        
        const delays = new Set<number>();
        for (let i = 0; i < 10; i++) {
          delays.add(calculateDelay(2, options));
        }
        
        // With jitter, we should get different values
        expect(delays.size).toBeGreaterThan(1);
        
        // All values should be within jitter range
        delays.forEach(delay => {
          expect(delay).toBeGreaterThanOrEqual(1500);
          expect(delay).toBeLessThanOrEqual(2500);
        });
      });
    });

    describe('Circuit Breaker Pattern', () => {
      class CircuitBreaker {
        private failures = 0;
        private state: 'CLOSED' | 'OPEN' = 'CLOSED';
        
        constructor(private readonly threshold: number = 5) {}
        
        execute<T>(operation: () => T): T {
          if (this.state === 'OPEN') {
            throw new Error('Circuit breaker is OPEN');
          }
          
          try {
            const result = operation();
            this.failures = 0; // Reset on success
            return result;
          } catch (error) {
            this.failures++;
            if (this.failures >= this.threshold) {
              this.state = 'OPEN';
            }
            throw error;
          }
        }
        
        getState() { return this.state; }
        reset() { this.failures = 0; this.state = 'CLOSED'; }
      }

      it('should open after threshold failures', () => {
        const breaker = new CircuitBreaker(3);
        
        // Fail 3 times to open circuit
        for (let i = 0; i < 3; i++) {
          try {
            breaker.execute(() => { throw new Error('Fail'); });
          } catch {
            // Expected
          }
        }
        
        expect(breaker.getState()).toBe('OPEN');
        
        // Further calls should be rejected immediately
        expect(() => breaker.execute(() => 'success')).toThrow('Circuit breaker is OPEN');
      });
    });
  });

  describe('Cache Strategies', () => {
    class MemoryCache<T = any> {
      private cache = new Map<string, { value: T; expires: number }>();
      private stats = { hits: 0, misses: 0 };

      async get(key: string): Promise<T | null> {
        const entry = this.cache.get(key);
        
        if (!entry) {
          this.stats.misses++;
          return null;
        }
        
        if (entry.expires < Date.now()) {
          this.cache.delete(key);
          this.stats.misses++;
          return null;
        }
        
        this.stats.hits++;
        return entry.value;
      }

      async set(key: string, value: T, ttlSeconds: number): Promise<void> {
        this.cache.set(key, {
          value,
          expires: Date.now() + ttlSeconds * 1000,
        });
      }

      getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
        return { ...this.stats, hitRate };
      }
    }

    describe('Basic Cache Operations', () => {
      let cache: MemoryCache<string>;
      
      beforeEach(() => {
        cache = new MemoryCache();
      });
      
      it('should store and retrieve values', async () => {
        await cache.set('key1', 'value1', 60);
        const value = await cache.get('key1');
        expect(value).toBe('value1');
      });
      
      it('should track cache statistics', async () => {
        await cache.set('key1', 'value1', 60);
        
        await cache.get('key1'); // hit
        await cache.get('key2'); // miss
        await cache.get('key1'); // hit
        
        const stats = cache.getStats();
        expect(stats.hits).toBe(2);
        expect(stats.misses).toBe(1);
        expect(stats.hitRate).toBeCloseTo(66.67, 1);
      });
    });

    describe('Cache Invalidation', () => {
      class CacheInvalidator {
        private dependencies = new Map<string, Set<string>>();
        
        addDependency(key: string, dependsOn: string): void {
          if (!this.dependencies.has(dependsOn)) {
            this.dependencies.set(dependsOn, new Set());
          }
          this.dependencies.get(dependsOn)!.add(key);
        }
        
        async invalidate(cache: MemoryCache, key: string): Promise<string[]> {
          const invalidated: string[] = [key];
          
          // Delete the key
          await cache.set(key, null as any, 0); // Expire immediately
          
          // Invalidate dependent keys
          const dependents = this.dependencies.get(key);
          if (dependents) {
            for (const dependent of dependents) {
              await cache.set(dependent, null as any, 0);
              invalidated.push(dependent);
            }
          }
          
          return invalidated;
        }
      }

      it('should invalidate dependent keys', async () => {
        const cache = new MemoryCache<string>();
        const invalidator = new CacheInvalidator();
        
        // Set up dependencies
        invalidator.addDependency('user:1:profile', 'user:1');
        invalidator.addDependency('user:1:posts', 'user:1');
        
        // Populate cache
        await cache.set('user:1', 'John Doe', 60);
        await cache.set('user:1:profile', 'Profile data', 60);
        await cache.set('user:1:posts', 'Posts data', 60);
        
        // Invalidate user:1
        const invalidated = await invalidator.invalidate(cache, 'user:1');
        
        expect(invalidated).toContain('user:1');
        expect(invalidated).toContain('user:1:profile');
        expect(invalidated).toContain('user:1:posts');
        expect(invalidated).toHaveLength(3);
      });
    });
  });

  describe('Rate Limiting', () => {
    interface RateLimitResult {
      allowed: boolean;
      limit: number;
      remaining: number;
      resetAt: number;
    }

    class FixedWindowRateLimiter {
      private counters = new Map<string, { count: number; resetAt: number }>();
      
      constructor(private maxRequests: number, private windowMs: number) {}
      
      checkLimit(key: string): RateLimitResult {
        const now = Date.now();
        let counter = this.counters.get(key);
        
        // Initialize or reset counter
        if (!counter || counter.resetAt <= now) {
          counter = {
            count: 0,
            resetAt: now + this.windowMs,
          };
          this.counters.set(key, counter);
        }
        
        counter.count++;
        const allowed = counter.count <= this.maxRequests;
        
        return {
          allowed,
          limit: this.maxRequests,
          remaining: Math.max(0, this.maxRequests - counter.count),
          resetAt: counter.resetAt,
        };
      }
    }

    class TokenBucketRateLimiter {
      private buckets = new Map<string, { tokens: number; lastRefill: number }>();
      
      constructor(
        private capacity: number,
        private refillRate: number // tokens per second
      ) {}
      
      checkLimit(key: string): RateLimitResult {
        const now = Date.now();
        let bucket = this.buckets.get(key);
        
        if (!bucket) {
          bucket = { tokens: this.capacity, lastRefill: now };
        } else {
          // Refill tokens based on time elapsed
          const elapsedSeconds = (now - bucket.lastRefill) / 1000;
          const tokensToAdd = elapsedSeconds * this.refillRate;
          bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
          bucket.lastRefill = now;
        }
        
        // Try to consume a token
        const allowed = bucket.tokens >= 1;
        if (allowed) {
          bucket.tokens--;
        }
        
        this.buckets.set(key, bucket);
        
        return {
          allowed,
          limit: this.capacity,
          remaining: Math.floor(bucket.tokens),
          resetAt: now + (1 / this.refillRate) * 1000,
        };
      }
    }

    describe('Fixed Window Rate Limiter', () => {
      it('should allow requests within limit', () => {
        const limiter = new FixedWindowRateLimiter(10, 60000);
        
        // First 10 requests should be allowed
        for (let i = 0; i < 10; i++) {
          const result = limiter.checkLimit('user:123');
          expect(result.allowed).toBe(true);
          expect(result.remaining).toBe(9 - i);
        }
        
        // 11th request should be blocked
        const result = limiter.checkLimit('user:123');
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
      });

      it('should track different keys separately', () => {
        const limiter = new FixedWindowRateLimiter(2, 60000);
        
        // Use up limit for user:123
        limiter.checkLimit('user:123');
        limiter.checkLimit('user:123');
        
        // user:456 should still have full limit
        const result = limiter.checkLimit('user:456');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(1);
      });
    });

    describe('Token Bucket Rate Limiter', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });
      
      afterEach(() => {
        jest.useRealTimers();
      });

      it('should consume tokens on requests', () => {
        const limiter = new TokenBucketRateLimiter(10, 1);
        
        // Should start with full bucket
        let result = limiter.checkLimit('user:123');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9);
        
        // Consume more tokens
        for (let i = 0; i < 9; i++) {
          limiter.checkLimit('user:123');
        }
        
        // Bucket empty
        result = limiter.checkLimit('user:123');
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
      });

      it('should refill tokens over time', () => {
        const limiter = new TokenBucketRateLimiter(5, 2); // 2 tokens per second
        
        // Empty the bucket
        for (let i = 0; i < 5; i++) {
          limiter.checkLimit('user:123');
        }
        
        // Wait 1 second (should refill 2 tokens)
        jest.advanceTimersByTime(1000);
        
        let result = limiter.checkLimit('user:123');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(1); // 2 refilled - 1 consumed
        
        // Wait 2 more seconds (should refill 4 tokens, capped at 5)
        jest.advanceTimersByTime(2000);
        
        result = limiter.checkLimit('user:123');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4); // Capped at capacity
      });
    });
  });
});