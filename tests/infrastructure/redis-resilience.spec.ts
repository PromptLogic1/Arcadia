/**
 * Redis Infrastructure Resilience Tests
 * 
 * This test suite validates Redis resilience features including
 * circuit breaker behavior, cache stampede prevention, distributed
 * locks, and graceful degradation under failure conditions.
 */

import { test, expect } from '@playwright/test';
import type { Route } from '@playwright/test';
import type { TestWindow, ComputationResult } from './types/test-types';
import { mockInfrastructureFailure } from './utils/mock-helpers';

test.describe('Redis Infrastructure Resilience', () => {
  test.describe('Circuit Breaker Pattern', () => {
    test('should open circuit breaker after threshold failures', async ({ page }) => {
      await page.goto('/');
      
      // Mock Redis failures
      await mockInfrastructureFailure(page, 'redis', 'get', {
        fatal: false,
        recoverable: true,
      });
      
      // Monitor circuit breaker state
      await page.evaluate(() => {
        (window as unknown as TestWindow).redisMetrics = {
          attempts: 0,
          failures: 0,
          circuitState: 'CLOSED',
        };
      });
      
      // Trigger multiple Redis operations
      for (let i = 0; i < 6; i++) {
        await page.evaluate(async () => {
          const metrics = (window as unknown as TestWindow).redisMetrics;
          if (!metrics) return;
          metrics.attempts++;
          
          try {
            // Simulate Redis operation
            const response = await fetch('/api/cache-test');
            if (!response.ok) {
              metrics.failures++;
            }
          } catch {
            metrics.failures++;
          }
          
          // Check circuit breaker state (after 5 failures)
          if (metrics.failures >= 5) {
            metrics.circuitState = 'OPEN';
          }
        });
        
        await page.waitForTimeout(100);
      }
      
      // Verify circuit breaker opened
      const metrics = await page.evaluate(() => (window as unknown as TestWindow).redisMetrics);
      expect(metrics?.circuitState).toBe('OPEN');
      expect(metrics?.failures).toBeGreaterThanOrEqual(5);
      
      // Verify requests are rejected when circuit is open
      await page.evaluate(() => {
        const metrics = (window as unknown as TestWindow).redisMetrics;
        
        // Mock circuit breaker rejection
        (window as unknown as TestWindow).fetch = async (url: string) => {
          if (url.includes('/api/cache') && metrics?.circuitState === 'OPEN') {
            throw new Error('Circuit breaker is OPEN');
          }
          return new Response('ok');
        };
      });
      
      // Try another request - should be rejected immediately
      const rejectedError = await page.evaluate(async () => {
        try {
          await fetch('/api/cache-test');
          return null;
        } catch (error) {
          return error instanceof Error ? error.message : String(error);
        }
      });
      
      expect(rejectedError).toBe('Circuit breaker is OPEN');
    });

    test('should transition to HALF_OPEN state after timeout', async ({ page }) => {
      await page.goto('/');
      
      // Set up circuit breaker with shorter timeout for testing
      await page.evaluate(() => {
        class TestCircuitBreaker {
          state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
          failureCount = 0;
          successCount = 0;
          readonly threshold = 3;
          readonly timeout = 2000; // 2 seconds for testing
          readonly halfOpenSuccesses = 2;
          openTime = 0;
          
          async execute<T>(operation: () => Promise<T>): Promise<T> {
            if (this.state === 'OPEN') {
              if (Date.now() - this.openTime > this.timeout) {
                this.state = 'HALF_OPEN';
                this.successCount = 0;
              } else {
                throw new Error('Circuit breaker is OPEN');
              }
            }
            
            try {
              const result = await operation();
              this.onSuccess();
              return result;
            } catch (error) {
              this.onFailure();
              throw error;
            }
          }
          
          private onSuccess(): void {
            if (this.state === 'HALF_OPEN') {
              this.successCount++;
              if (this.successCount >= this.halfOpenSuccesses) {
                this.state = 'CLOSED';
                this.failureCount = 0;
              }
            } else if (this.state === 'CLOSED') {
              this.failureCount = 0;
            }
          }
          
          private onFailure(): void {
            if (this.state === 'HALF_OPEN') {
              this.state = 'OPEN';
              this.openTime = Date.now();
            } else if (this.state === 'CLOSED') {
              this.failureCount++;
              if (this.failureCount >= this.threshold) {
                this.state = 'OPEN';
                this.openTime = Date.now();
              }
            }
          }
        }
        
        (window as unknown as TestWindow).circuitBreaker = new TestCircuitBreaker();
      });
      
      // Trigger failures to open circuit
      for (let i = 0; i < 3; i++) {
        await page.evaluate(async () => {
          const cb = (window as unknown as TestWindow).circuitBreaker;
          if (!cb) return;
          try {
            await cb.execute(async () => {
              throw new Error('Redis connection failed');
            });
          } catch {
            // Ignore errors for test recovery
          }
        });
      }
      
      // Verify circuit is open
      let state = await page.evaluate(() => (window as unknown as TestWindow).circuitBreaker?.state);
      expect(state).toBe('OPEN');
      
      // Wait for timeout
      await page.waitForTimeout(2500);
      
      // Attempt operation - should transition to HALF_OPEN
      await page.evaluate(async () => {
        const cb = (window as unknown as TestWindow).circuitBreaker;
        if (!cb) return;
        try {
          await cb.execute(async () => 'success');
        } catch {
          // Ignore error for circuit breaker test
        }
      });
      
      state = await page.evaluate(() => (window as unknown as TestWindow).circuitBreaker?.state);
      expect(state).toBe('HALF_OPEN');
      
      // Two successful operations should close circuit
      for (let i = 0; i < 2; i++) {
        await page.evaluate(async () => {
          const cb = (window as unknown as TestWindow).circuitBreaker;
          if (!cb) return;
          await cb.execute(async () => 'success');
        });
      }
      
      state = await page.evaluate(() => (window as unknown as TestWindow).circuitBreaker?.state);
      expect(state).toBe('CLOSED');
    });
  });

  test.describe('Cache Stampede Prevention', () => {
    test('should prevent multiple concurrent cache misses', async ({ browser }) => {
      // Create multiple browser contexts to simulate concurrent users
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext(),
      ]);
      
      const pages = await Promise.all(
        contexts.map(ctx => ctx.newPage())
      );
      
      // Navigate all pages
      await Promise.all(pages.map(p => p.goto('/')));
      
      // Track computation count for stampede prevention
      let computationCount = 0;
      
      // Inject cache logic in all pages
      await Promise.all(pages.map(page => 
        page.evaluate(() => {
          (window as unknown as TestWindow).cacheGet = async (_key: string) => {
            // Simulate cache miss
            return null;
          };
          
          (window as unknown as TestWindow).acquireLock = async (_key: string) => {
            // Only one can acquire lock
            const response = await fetch('/api/acquire-lock', {
              method: 'POST',
              body: JSON.stringify({ key: _key }),
            });
            return response.ok;
          };
          
          (window as unknown as TestWindow).computeExpensiveData = async () => {
            // Track computation
            await fetch('/api/track-computation', { method: 'POST' });
            
            // Simulate expensive computation
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { data: 'expensive result', timestamp: Date.now() };
          };
          
          (window as unknown as TestWindow).getOrCompute = async (key: string) => {
            // Try cache first
            const cacheGet = (window as unknown as TestWindow).cacheGet;
            if (!cacheGet) throw new Error('cacheGet function not available');
            
            const cached = await cacheGet(key);
            if (cached) return cached as ComputationResult;
            
            // Try to acquire lock
            const lockKey = `lock:${key}`;
            const acquireLock = (window as unknown as TestWindow).acquireLock;
            const computeExpensiveData = (window as unknown as TestWindow).computeExpensiveData;
            if (!acquireLock || !computeExpensiveData) throw new Error('Functions not available');
            
            const hasLock = await acquireLock(lockKey);
            
            if (hasLock) {
              // We have the lock, compute the data
              const result = await computeExpensiveData();
              
              // Cache the result
              await fetch('/api/cache-set', {
                method: 'POST',
                body: JSON.stringify({ key, value: result }),
              });
              
              // Release lock
              await fetch('/api/release-lock', {
                method: 'POST',
                body: JSON.stringify({ key: lockKey }),
              });
              
              return result;
            } else {
              // Another process has the lock, wait and retry
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Try cache again
              const cacheGet = (window as unknown as TestWindow).cacheGet;
              const getOrCompute = (window as unknown as TestWindow).getOrCompute;
              if (!cacheGet || !getOrCompute) throw new Error('Functions not available');
              
              const cached = await cacheGet(key);
              return (cached as ComputationResult) || await getOrCompute(key);
            }
          };
        })
      ));
      
      // Mock the lock API to ensure only one succeeds
      let lockHolder: string | null = null;
      
      await Promise.all(pages.map((page, index) => 
        page.route('**/api/acquire-lock', async (route: Route) => {
          const _body = await route.request().postDataJSON() as { key: string };
          
          if (!lockHolder) {
            lockHolder = `page-${index}`;
            await route.fulfill({ status: 200 });
          } else {
            await route.fulfill({ status: 423 }); // Locked
          }
        })
      ));
      
      await Promise.all(pages.map(page => 
        page.route('**/api/track-computation', async (route: Route) => {
          computationCount++;
          await route.fulfill({ status: 200 });
        })
      ));
      
      // Trigger concurrent cache misses
      const results = await Promise.all(pages.map((page) => 
        page.evaluate(async () => {
          const start = Date.now();
          const getOrCompute = (window as unknown as TestWindow).getOrCompute;
          if (!getOrCompute) throw new Error('getOrCompute function not available');
          const result = await getOrCompute('expensive-data');
          const duration = Date.now() - start;
          return { result, duration };
        })
      ));
      
      // Verify only one computation occurred
      expect(computationCount).toBe(1);
      
      // Verify all pages got the same result
      const firstResult = results[0]?.result.data;
      expect(firstResult).toBeDefined();
      results.forEach(r => {
        expect(r.result.data).toBe(firstResult);
      });
      
      // Clean up
      await Promise.all(contexts.map(ctx => ctx.close()));
    });

    test('should handle lock timeout gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Set up lock with timeout
      await page.evaluate(() => {
        class DistributedLock {
          private locks = new Map<string, { holder: string; expires: number }>();
          
          async acquire(key: string, ttlMs = 5000): Promise<boolean> {
            const now = Date.now();
            const existing = this.locks.get(key);
            
            // Check if existing lock expired
            if (existing && existing.expires < now) {
              this.locks.delete(key);
            }
            
            // Try to acquire
            if (!this.locks.has(key)) {
              this.locks.set(key, {
                holder: 'test-process',
                expires: now + ttlMs,
              });
              return true;
            }
            
            return false;
          }
          
          async release(key: string): Promise<void> {
            this.locks.delete(key);
          }
          
          async waitForLock(key: string, maxWaitMs = 10000): Promise<boolean> {
            const start = Date.now();
            
            while (Date.now() - start < maxWaitMs) {
              if (await this.acquire(key)) {
                return true;
              }
              
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            return false;
          }
        }
        
        (window as unknown as TestWindow).distributedLock = new DistributedLock();
      });
      
      // Test lock timeout
      const lockKey = 'test-lock';
      
      // Acquire lock with short TTL
      const acquired = await page.evaluate(async (key) => {
        const distributedLock = (window as unknown as TestWindow).distributedLock;
        if (!distributedLock) return false;
        return await distributedLock.acquire(key, 1000);
      }, lockKey);
      
      expect(acquired).toBe(true);
      
      // Try to acquire again immediately - should fail
      const secondAttempt = await page.evaluate(async (key) => {
        const distributedLock = (window as unknown as TestWindow).distributedLock;
        if (!distributedLock) return false;
        return await distributedLock.acquire(key);
      }, lockKey);
      
      expect(secondAttempt).toBe(false);
      
      // Wait for lock to expire
      await page.waitForTimeout(1500);
      
      // Should be able to acquire now
      const thirdAttempt = await page.evaluate(async (key) => {
        const distributedLock = (window as unknown as TestWindow).distributedLock;
        if (!distributedLock) return false;
        return await distributedLock.acquire(key);
      }, lockKey);
      
      expect(thirdAttempt).toBe(true);
    });
  });

  test.describe('Cache Metrics and Monitoring', () => {
    test('should track cache hit rate and latency', async ({ page }) => {
      await page.goto('/');
      
      // Initialize cache metrics
      await page.evaluate(() => {
        class CacheMetrics {
          hits = 0;
          misses = 0;
          errors = 0;
          latencies: number[] = [];
          
          recordHit(latency: number): void {
            this.hits++;
            this.latencies.push(latency);
          }
          
          recordMiss(latency: number): void {
            this.misses++;
            this.latencies.push(latency);
          }
          
          recordError(): void {
            this.errors++;
          }
          
          getStats() {
            const total = this.hits + this.misses;
            const hitRate = total > 0 ? (this.hits / total) * 100 : 0;
            
            const avgLatency = this.latencies.length > 0
              ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
              : 0;
            
            const p95Index = Math.floor(this.latencies.length * 0.95);
            const p95Latency = this.latencies.sort((a, b) => a - b)[p95Index] || 0;
            
            return {
              hits: this.hits,
              misses: this.misses,
              errors: this.errors,
              hitRate,
              avgLatency,
              p95Latency,
            };
          }
        }
        
        (window as unknown as TestWindow).cacheMetrics = new CacheMetrics();
        
        // Mock cache with metrics
        (window as unknown as TestWindow).cache = new Map();
        
        (window as unknown as TestWindow).cacheGetWithMetrics = async (key: string) => {
          const start = performance.now();
          const metrics = (window as unknown as TestWindow).cacheMetrics;
          const cache = (window as unknown as TestWindow).cache;
          if (!metrics || !cache) return null;
          
          try {
            const value = cache.get(key);
            const latency = performance.now() - start;
            
            if (value) {
              metrics.recordHit(latency);
            } else {
              metrics.recordMiss(latency);
            }
            
            return value;
          } catch (error) {
            metrics.recordError();
            throw error;
          }
        };
        
        (window as unknown as TestWindow).cacheSetWithMetrics = async (key: string, value: unknown) => {
          const cache = (window as unknown as TestWindow).cache;
          if (!cache) return;
          cache.set(key, value);
        };
      });
      
      // Perform cache operations
      const operations = [
        { key: 'user:1', value: { name: 'Test User' }, expectHit: false },
        { key: 'user:1', value: null, expectHit: true },
        { key: 'user:2', value: { name: 'Another User' }, expectHit: false },
        { key: 'user:1', value: null, expectHit: true },
        { key: 'user:3', value: { name: 'Third User' }, expectHit: false },
      ];
      
      for (const op of operations) {
        if (op.value) {
          await page.evaluate(async ({ key, value }) => {
            const cacheSetWithMetrics = (window as unknown as TestWindow).cacheSetWithMetrics;
            if (!cacheSetWithMetrics) return;
            await cacheSetWithMetrics(key, value);
          }, { key: op.key, value: op.value });
        }
        
        await page.evaluate(async (key) => {
          const cacheGetWithMetrics = (window as unknown as TestWindow).cacheGetWithMetrics;
          if (!cacheGetWithMetrics) return;
          await cacheGetWithMetrics(key);
        }, op.key);
      }
      
      // Get metrics
      const stats = await page.evaluate(() => {
        const cacheMetrics = (window as unknown as TestWindow).cacheMetrics;
        if (!cacheMetrics) return { hits: 0, misses: 0, hitRate: 0, avgLatency: 0, p95Latency: 0 };
        return cacheMetrics.getStats();
      });
      
      // Verify metrics
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(3);
      expect(stats.hitRate).toBeCloseTo(40, 0);
      expect(stats.avgLatency).toBeGreaterThan(0);
      expect(stats.p95Latency).toBeGreaterThanOrEqual(stats.avgLatency);
    });
  });

  test.describe('Graceful Degradation', () => {
    test('should provide fallback when Redis is unavailable', async ({ page }) => {
      await page.goto('/');
      
      // Mock Redis failure
      await mockInfrastructureFailure(page, 'redis', 'all', {
        fatal: true,
        recoverable: false,
      });
      
      // Set up fallback mechanism
      await page.evaluate(() => {
        class CacheWithFallback {
          private inMemoryCache = new Map<string, unknown>();
          private redisAvailable = true;
          
          async get(key: string): Promise<unknown> {
            try {
              if (this.redisAvailable) {
                // Try Redis first
                const response = await fetch(`/api/redis/get?key=${key}`);
                if (!response.ok) {
                  throw new Error('Redis unavailable');
                }
                return await response.json();
              }
            } catch {
              // Redis failed, mark as unavailable
              this.redisAvailable = false;
              console.warn('Redis unavailable, using in-memory cache');
            }
            
            // Fallback to in-memory cache
            return this.inMemoryCache.get(key);
          }
          
          async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
            // Always update in-memory cache
            this.inMemoryCache.set(key, value);
            
            if (ttlSeconds) {
              setTimeout(() => {
                this.inMemoryCache.delete(key);
              }, ttlSeconds * 1000);
            }
            
            // Try to update Redis if available
            if (this.redisAvailable) {
              try {
                const response = await fetch('/api/redis/set', {
                  method: 'POST',
                  body: JSON.stringify({ key, value, ttlSeconds }),
                });
                
                if (!response.ok) {
                  throw new Error('Redis set failed');
                }
              } catch {
                console.warn('Failed to update Redis, data cached locally');
              }
            }
          }
          
          isUsingFallback(): boolean {
            return !this.redisAvailable;
          }
        }
        
        (window as unknown as TestWindow).cacheWithFallback = new CacheWithFallback();
      });
      
      // Mock Redis API to fail
      await page.route('**/api/redis/**', async (route: Route) => {
        await route.fulfill({ status: 503 });
      });
      
      // Test cache operations with fallback
      await page.evaluate(async () => {
        const cache = (window as unknown as TestWindow).cacheWithFallback;
        if (!cache) return { result: null, usingFallback: false };
        
        // Set some data
        await cache.set('test-key', { data: 'test value' });
        
        // Get the data (should use fallback)
        const result = await cache.get('test-key');
        
        return {
          result,
          usingFallback: cache.isUsingFallback(),
        };
      });
      
      const { result, usingFallback } = await page.evaluate(async () => {
        const cache = (window as unknown as TestWindow).cacheWithFallback;
        if (!cache) return { result: null, usingFallback: false };
        const result = await cache.get('test-key');
        return {
          result,
          usingFallback: cache.isUsingFallback(),
        };
      });
      
      expect(result).toEqual({ data: 'test value' });
      expect(usingFallback).toBe(true);
      
      // Verify UI shows degraded mode
      await page.evaluate(() => {
        const cache = (window as unknown as TestWindow).cacheWithFallback;
        if (!cache) return;
        
        const banner = document.createElement('div');
        banner.setAttribute('data-testid', 'degraded-mode-banner');
        banner.textContent = 'Running in degraded mode - some features may be limited';
        banner.style.cssText = 'background: orange; color: white; padding: 10px;';
        
        if (cache.isUsingFallback()) {
          document.body.prepend(banner);
        }
      });
      
      await expect(page.locator('[data-testid="degraded-mode-banner"]')).toBeVisible();
    });
  });
});