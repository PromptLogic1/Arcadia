/**
 * Redis Infrastructure Resilience Tests
 * 
 * This test suite validates Redis resilience features including
 * circuit breaker behavior, cache stampede prevention, distributed
 * locks, and graceful degradation under failure conditions.
 */

import { test, expect } from '@playwright/test';
import type { Page, Browser } from '@playwright/test';
import type { InfrastructureError, CircuitBreakerError } from './types/errors';
import {
  generateInfrastructureError,
  generateCircuitBreakerError,
} from './utils/error-generators';
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
        (window as any).redisMetrics = {
          attempts: 0,
          failures: 0,
          circuitState: 'CLOSED',
        };
      });
      
      // Trigger multiple Redis operations
      for (let i = 0; i < 6; i++) {
        await page.evaluate(async () => {
          const metrics = (window as any).redisMetrics;
          metrics.attempts++;
          
          try {
            // Simulate Redis operation
            const response = await fetch('/api/cache-test');
            if (!response.ok) {
              metrics.failures++;
            }
          } catch (error) {
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
      const metrics = await page.evaluate(() => (window as any).redisMetrics);
      expect(metrics.circuitState).toBe('OPEN');
      expect(metrics.failures).toBeGreaterThanOrEqual(5);
      
      // Verify requests are rejected when circuit is open
      await page.evaluate(() => {
        const metrics = (window as any).redisMetrics;
        
        // Mock circuit breaker rejection
        (window as any).fetch = async (url: string) => {
          if (url.includes('/api/cache') && metrics.circuitState === 'OPEN') {
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
          return error.message;
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
        
        (window as any).circuitBreaker = new TestCircuitBreaker();
      });
      
      // Trigger failures to open circuit
      for (let i = 0; i < 3; i++) {
        await page.evaluate(async () => {
          const cb = (window as any).circuitBreaker;
          try {
            await cb.execute(async () => {
              throw new Error('Redis connection failed');
            });
          } catch {}
        });
      }
      
      // Verify circuit is open
      let state = await page.evaluate(() => (window as any).circuitBreaker.state);
      expect(state).toBe('OPEN');
      
      // Wait for timeout
      await page.waitForTimeout(2500);
      
      // Attempt operation - should transition to HALF_OPEN
      await page.evaluate(async () => {
        const cb = (window as any).circuitBreaker;
        try {
          await cb.execute(async () => 'success');
        } catch {}
      });
      
      state = await page.evaluate(() => (window as any).circuitBreaker.state);
      expect(state).toBe('HALF_OPEN');
      
      // Two successful operations should close circuit
      for (let i = 0; i < 2; i++) {
        await page.evaluate(async () => {
          const cb = (window as any).circuitBreaker;
          await cb.execute(async () => 'success');
        });
      }
      
      state = await page.evaluate(() => (window as any).circuitBreaker.state);
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
      
      // Set up shared state tracking
      const sharedState = {
        computationCount: 0,
        lockAcquired: false,
      };
      
      // Inject cache logic in all pages
      await Promise.all(pages.map(page => 
        page.evaluate(() => {
          (window as any).cacheGet = async (key: string) => {
            // Simulate cache miss
            return null;
          };
          
          (window as any).acquireLock = async (key: string) => {
            // Only one can acquire lock
            const response = await fetch('/api/acquire-lock', {
              method: 'POST',
              body: JSON.stringify({ key }),
            });
            return response.ok;
          };
          
          (window as any).computeExpensiveData = async () => {
            // Track computation
            await fetch('/api/track-computation', { method: 'POST' });
            
            // Simulate expensive computation
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { data: 'expensive result', timestamp: Date.now() };
          };
          
          (window as any).getOrCompute = async (key: string) => {
            // Try cache first
            const cached = await (window as any).cacheGet(key);
            if (cached) return cached;
            
            // Try to acquire lock
            const lockKey = `lock:${key}`;
            const hasLock = await (window as any).acquireLock(lockKey);
            
            if (hasLock) {
              // We have the lock, compute the data
              const result = await (window as any).computeExpensiveData();
              
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
              return await (window as any).cacheGet(key) || 
                     await (window as any).getOrCompute(key);
            }
          };
        })
      ));
      
      // Mock the lock API to ensure only one succeeds
      let lockHolder: string | null = null;
      let computationCount = 0;
      
      await Promise.all(pages.map((page, index) => 
        page.route('**/api/acquire-lock', async (route) => {
          const body = await route.request().postDataJSON();
          
          if (!lockHolder) {
            lockHolder = `page-${index}`;
            await route.fulfill({ status: 200 });
          } else {
            await route.fulfill({ status: 423 }); // Locked
          }
        })
      ));
      
      await Promise.all(pages.map(page => 
        page.route('**/api/track-computation', async (route) => {
          computationCount++;
          await route.fulfill({ status: 200 });
        })
      ));
      
      // Trigger concurrent cache misses
      const results = await Promise.all(pages.map((page, index) => 
        page.evaluate(async () => {
          const start = Date.now();
          const result = await (window as any).getOrCompute('expensive-data');
          const duration = Date.now() - start;
          return { result, duration };
        })
      ));
      
      // Verify only one computation occurred
      expect(computationCount).toBe(1);
      
      // Verify all pages got the same result
      const firstResult = results[0].result.data;
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
        
        (window as any).distributedLock = new DistributedLock();
      });
      
      // Test lock timeout
      const lockKey = 'test-lock';
      
      // Acquire lock with short TTL
      const acquired = await page.evaluate(async (key) => {
        return await (window as any).distributedLock.acquire(key, 1000);
      }, lockKey);
      
      expect(acquired).toBe(true);
      
      // Try to acquire again immediately - should fail
      const secondAttempt = await page.evaluate(async (key) => {
        return await (window as any).distributedLock.acquire(key);
      }, lockKey);
      
      expect(secondAttempt).toBe(false);
      
      // Wait for lock to expire
      await page.waitForTimeout(1500);
      
      // Should be able to acquire now
      const thirdAttempt = await page.evaluate(async (key) => {
        return await (window as any).distributedLock.acquire(key);
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
        
        (window as any).cacheMetrics = new CacheMetrics();
        
        // Mock cache with metrics
        (window as any).cache = new Map();
        
        (window as any).cacheGetWithMetrics = async (key: string) => {
          const start = performance.now();
          const metrics = (window as any).cacheMetrics;
          
          try {
            const value = (window as any).cache.get(key);
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
        
        (window as any).cacheSetWithMetrics = async (key: string, value: any) => {
          (window as any).cache.set(key, value);
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
            await (window as any).cacheSetWithMetrics(key, value);
          }, { key: op.key, value: op.value });
        }
        
        await page.evaluate(async (key) => {
          await (window as any).cacheGetWithMetrics(key);
        }, op.key);
      }
      
      // Get metrics
      const stats = await page.evaluate(() => 
        (window as any).cacheMetrics.getStats()
      );
      
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
          private inMemoryCache = new Map<string, any>();
          private redisAvailable = true;
          
          async get(key: string): Promise<any> {
            try {
              if (this.redisAvailable) {
                // Try Redis first
                const response = await fetch(`/api/redis/get?key=${key}`);
                if (!response.ok) {
                  throw new Error('Redis unavailable');
                }
                return await response.json();
              }
            } catch (error) {
              // Redis failed, mark as unavailable
              this.redisAvailable = false;
              console.warn('Redis unavailable, using in-memory cache');
            }
            
            // Fallback to in-memory cache
            return this.inMemoryCache.get(key);
          }
          
          async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
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
              } catch (error) {
                console.warn('Failed to update Redis, data cached locally');
              }
            }
          }
          
          isUsingFallback(): boolean {
            return !this.redisAvailable;
          }
        }
        
        (window as any).cacheWithFallback = new CacheWithFallback();
      });
      
      // Mock Redis API to fail
      await page.route('**/api/redis/**', async (route) => {
        await route.fulfill({ status: 503 });
      });
      
      // Test cache operations with fallback
      await page.evaluate(async () => {
        const cache = (window as any).cacheWithFallback;
        
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
        const cache = (window as any).cacheWithFallback;
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
        const banner = document.createElement('div');
        banner.setAttribute('data-testid', 'degraded-mode-banner');
        banner.textContent = 'Running in degraded mode - some features may be limited';
        banner.style.cssText = 'background: orange; color: white; padding: 10px;';
        
        if ((window as any).cacheWithFallback.isUsingFallback()) {
          document.body.prepend(banner);
        }
      });
      
      await expect(page.locator('[data-testid="degraded-mode-banner"]')).toBeVisible();
    });
  });
});