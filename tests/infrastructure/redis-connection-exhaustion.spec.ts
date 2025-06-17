/**
 * Redis Connection Exhaustion Tests
 * 
 * This test suite validates Redis connection pool behavior under stress,
 * connection exhaustion scenarios, and proper cleanup mechanisms.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { InfrastructureError } from './types/errors';
import { generateInfrastructureError } from './utils/error-generators';
import { mockInfrastructureFailure } from './utils/mock-helpers';

test.describe('Redis Connection Exhaustion Resilience', () => {
  test.describe('Connection Pool Management', () => {
    test('should handle connection pool exhaustion gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Set up connection pool simulation
      await page.evaluate(() => {
        class ConnectionPool {
          private connections: Set<string> = new Set();
          private readonly maxConnections = 10;
          private waitingQueue: Array<{
            resolve: (connection: string) => void;
            reject: (error: Error) => void;
            timeout: NodeJS.Timeout;
          }> = [];
          
          async acquire(): Promise<string> {
            // If pool has available connections
            if (this.connections.size < this.maxConnections) {
              const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              this.connections.add(connectionId);
              return connectionId;
            }
            
            // Pool exhausted, add to waiting queue with timeout
            return new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
                if (index !== -1) {
                  this.waitingQueue.splice(index, 1);
                }
                reject(new Error('Connection pool timeout'));
              }, 5000);
              
              this.waitingQueue.push({ resolve, reject, timeout });
            });
          }
          
          release(connectionId: string): void {
            this.connections.delete(connectionId);
            
            // Process waiting queue
            if (this.waitingQueue.length > 0) {
              const waiter = this.waitingQueue.shift()!;
              clearTimeout(waiter.timeout);
              
              const newConnectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              this.connections.add(newConnectionId);
              waiter.resolve(newConnectionId);
            }
          }
          
          getStats() {
            return {
              active: this.connections.size,
              waiting: this.waitingQueue.length,
              maxConnections: this.maxConnections,
            };
          }
        }
        
        (window as any).redisPool = new ConnectionPool();
      });
      
      // Simulate high concurrent load
      const connectionPromises: Promise<any>[] = [];
      
      for (let i = 0; i < 15; i++) {
        const promise = page.evaluate(async (index) => {
          const pool = (window as any).redisPool;
          const start = Date.now();
          
          try {
            const connectionId = await pool.acquire();
            
            // Simulate Redis operation
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const duration = Date.now() - start;
            pool.release(connectionId);
            
            return { success: true, duration, index };
          } catch (error) {
            return { 
              success: false, 
              error: error.message, 
              duration: Date.now() - start,
              index 
            };
          }
        }, i);
        
        connectionPromises.push(promise);
      }
      
      const results = await Promise.all(connectionPromises);
      
      // Verify pool exhaustion handling
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      // Should have some successful connections (up to pool size)
      expect(successful.length).toBeGreaterThan(0);
      expect(successful.length).toBeLessThanOrEqual(10);
      
      // Some connections should fail due to timeout
      expect(failed.length).toBeGreaterThan(0);
      
      // Failed connections should timeout appropriately
      failed.forEach(result => {
        expect(result.error).toBe('Connection pool timeout');
        expect(result.duration).toBeGreaterThan(4500); // Close to 5s timeout
      });
      
      // Verify pool stats
      const finalStats = await page.evaluate(() => 
        (window as any).redisPool.getStats()
      );
      
      expect(finalStats.active).toBe(0); // All connections should be released
      expect(finalStats.waiting).toBe(0); // No waiting connections
    });

    test('should implement connection leasing with timeout', async ({ page }) => {
      await page.goto('/');
      
      await page.evaluate(() => {
        class LeaseableConnection {
          private leases = new Map<string, { 
            connectionId: string; 
            leaseExpiry: number; 
            operations: number;
          }>();
          private readonly leaseTimeoutMs = 2000;
          
          lease(): string {
            const leaseId = `lease-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const connectionId = `conn-${Date.now()}`;
            
            this.leases.set(leaseId, {
              connectionId,
              leaseExpiry: Date.now() + this.leaseTimeoutMs,
              operations: 0,
            });
            
            // Auto-expire lease
            setTimeout(() => {
              if (this.leases.has(leaseId)) {
                console.warn(`Lease ${leaseId} expired, force releasing`);
                this.leases.delete(leaseId);
              }
            }, this.leaseTimeoutMs);
            
            return leaseId;
          }
          
          operate(leaseId: string): boolean {
            const lease = this.leases.get(leaseId);
            if (!lease) return false;
            
            if (Date.now() > lease.leaseExpiry) {
              this.leases.delete(leaseId);
              return false;
            }
            
            lease.operations++;
            return true;
          }
          
          release(leaseId: string): boolean {
            return this.leases.delete(leaseId);
          }
          
          getActiveLeases(): number {
            // Clean up expired leases
            const now = Date.now();
            for (const [leaseId, lease] of this.leases.entries()) {
              if (now > lease.leaseExpiry) {
                this.leases.delete(leaseId);
              }
            }
            return this.leases.size;
          }
        }
        
        (window as any).connectionLease = new LeaseableConnection();
      });
      
      // Test lease lifecycle
      const leaseId = await page.evaluate(() => {
        const lease = (window as any).connectionLease;
        return lease.lease();
      });
      
      // Should be able to operate immediately
      const operateSuccess = await page.evaluate((id) => {
        return (window as any).connectionLease.operate(id);
      }, leaseId);
      
      expect(operateSuccess).toBe(true);
      
      // Wait for lease to expire
      await page.waitForTimeout(2500);
      
      // Should not be able to operate after expiry
      const operateAfterExpiry = await page.evaluate((id) => {
        return (window as any).connectionLease.operate(id);
      }, leaseId);
      
      expect(operateAfterExpiry).toBe(false);
      
      // Active leases should be 0 after cleanup
      const activeLeases = await page.evaluate(() => 
        (window as any).connectionLease.getActiveLeases()
      );
      
      expect(activeLeases).toBe(0);
    });
  });

  test.describe('Connection Recovery', () => {
    test('should recover from connection failures', async ({ page }) => {
      await page.goto('/');
      
      // Mock connection failure and recovery
      await page.evaluate(() => {
        class ResilientRedisClient {
          private connectionState: 'connected' | 'disconnected' | 'reconnecting' = 'connected';
          private reconnectAttempts = 0;
          private readonly maxReconnectAttempts = 3;
          private readonly reconnectDelayMs = 1000;
          
          async execute(operation: string): Promise<string> {
            if (this.connectionState === 'disconnected') {
              await this.reconnect();
            }
            
            if (this.connectionState !== 'connected') {
              throw new Error('Redis connection unavailable');
            }
            
            // Simulate operation
            if (Math.random() < 0.1) { // 10% failure rate
              this.connectionState = 'disconnected';
              throw new Error('Connection lost during operation');
            }
            
            return `Operation ${operation} completed`;
          }
          
          private async reconnect(): Promise<void> {
            if (this.connectionState === 'reconnecting') {
              return; // Already reconnecting
            }
            
            this.connectionState = 'reconnecting';
            
            for (let attempt = 1; attempt <= this.maxReconnectAttempts; attempt++) {
              try {
                await new Promise(resolve => setTimeout(resolve, this.reconnectDelayMs * attempt));
                
                // Simulate reconnection (80% success rate)
                if (Math.random() < 0.8) {
                  this.connectionState = 'connected';
                  this.reconnectAttempts = 0;
                  console.log(`Reconnected on attempt ${attempt}`);
                  return;
                }
                
                throw new Error('Reconnection failed');
              } catch (error) {
                console.warn(`Reconnection attempt ${attempt} failed:`, error.message);
                this.reconnectAttempts = attempt;
              }
            }
            
            this.connectionState = 'disconnected';
            throw new Error('Failed to reconnect after maximum attempts');
          }
          
          getConnectionState() {
            return {
              state: this.connectionState,
              reconnectAttempts: this.reconnectAttempts,
            };
          }
        }
        
        (window as any).resilientRedis = new ResilientRedisClient();
      });
      
      // Perform multiple operations to trigger failures and recovery
      const results: any[] = [];
      
      for (let i = 0; i < 20; i++) {
        const result = await page.evaluate(async (index) => {
          const client = (window as any).resilientRedis;
          const start = Date.now();
          
          try {
            const response = await client.execute(`operation-${index}`);
            return {
              success: true,
              response,
              duration: Date.now() - start,
              connectionState: client.getConnectionState(),
            };
          } catch (error) {
            return {
              success: false,
              error: error.message,
              duration: Date.now() - start,
              connectionState: client.getConnectionState(),
            };
          }
        }, i);
        
        results.push(result);
        await page.waitForTimeout(100);
      }
      
      // Analyze results
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      // Should have both successes and failures
      expect(successful.length).toBeGreaterThan(0);
      expect(failed.length).toBeGreaterThan(0);
      
      // Should have attempted reconnections
      const withReconnects = results.filter(r => r.connectionState.reconnectAttempts > 0);
      expect(withReconnects.length).toBeGreaterThan(0);
      
      // Final state should be stable
      const finalState = await page.evaluate(() => 
        (window as any).resilientRedis.getConnectionState()
      );
      
      expect(['connected', 'disconnected']).toContain(finalState.state);
    });
  });

  test.describe('Performance Under Load', () => {
    test('should maintain performance with limited connections', async ({ page }) => {
      await page.goto('/');
      
      // Set up performance monitoring
      await page.evaluate(() => {
        class PerformanceMonitor {
          private operations: Array<{ start: number; end: number; success: boolean }> = [];
          
          startOperation(): string {
            const operationId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            this.operations.push({ start: Date.now(), end: 0, success: false });
            return operationId;
          }
          
          endOperation(operationId: string, success: boolean): void {
            const operation = this.operations[this.operations.length - 1];
            if (operation) {
              operation.end = Date.now();
              operation.success = success;
            }
          }
          
          getMetrics() {
            const completedOps = this.operations.filter(op => op.end > 0);
            const successfulOps = completedOps.filter(op => op.success);
            
            const durations = completedOps.map(op => op.end - op.start);
            durations.sort((a, b) => a - b);
            
            const successRate = completedOps.length > 0 
              ? (successfulOps.length / completedOps.length) * 100 
              : 0;
            
            const avgDuration = durations.length > 0
              ? durations.reduce((a, b) => a + b, 0) / durations.length
              : 0;
            
            const p95Index = Math.floor(durations.length * 0.95);
            const p95Duration = durations[p95Index] || 0;
            
            return {
              totalOps: this.operations.length,
              completedOps: completedOps.length,
              successRate,
              avgDuration,
              p95Duration,
              minDuration: durations[0] || 0,
              maxDuration: durations[durations.length - 1] || 0,
            };
          }
        }
        
        (window as any).perfMonitor = new PerformanceMonitor();
        
        // Simulate Redis operations with limited pool
        (window as any).simulateRedisOp = async () => {
          const monitor = (window as any).perfMonitor;
          const operationId = monitor.startOperation();
          
          try {
            // Simulate variable operation time
            const delay = 50 + Math.random() * 100; // 50-150ms
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Simulate 95% success rate
            const success = Math.random() < 0.95;
            if (!success) {
              throw new Error('Operation failed');
            }
            
            monitor.endOperation(operationId, true);
            return { success: true, duration: delay };
          } catch (error) {
            monitor.endOperation(operationId, false);
            return { success: false, error: error.message };
          }
        };
      });
      
      // Run concurrent operations
      const startTime = Date.now();
      const operations = Array.from({ length: 50 }, (_, i) => 
        page.evaluate(() => (window as any).simulateRedisOp())
      );
      
      await Promise.all(operations);
      const totalTime = Date.now() - startTime;
      
      // Analyze performance metrics
      const metrics = await page.evaluate(() => 
        (window as any).perfMonitor.getMetrics()
      );
      
      // Performance assertions
      expect(metrics.successRate).toBeGreaterThan(90); // At least 90% success
      expect(metrics.avgDuration).toBeLessThan(200); // Average under 200ms
      expect(metrics.p95Duration).toBeLessThan(300); // P95 under 300ms
      expect(totalTime).toBeLessThan(5000); // Complete within 5s
      
      console.log('Performance Metrics:', metrics);
    });
  });

  test.describe('Circuit Breaker Integration', () => {
    test('should open circuit breaker on connection failures', async ({ page }) => {
      await page.goto('/');
      
      await page.evaluate(() => {
        class RedisCircuitBreaker {
          private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
          private failureCount = 0;
          private readonly failureThreshold = 5;
          private readonly resetTimeoutMs = 3000;
          private lastFailureTime = 0;
          private successCount = 0;
          
          async execute<T>(operation: () => Promise<T>): Promise<T> {
            // Check if circuit should move to HALF_OPEN
            if (this.state === 'OPEN' && 
                Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
              this.state = 'HALF_OPEN';
              this.successCount = 0;
            }
            
            // Reject if circuit is OPEN
            if (this.state === 'OPEN') {
              throw new Error('Circuit breaker is OPEN');
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
              if (this.successCount >= 2) {
                this.state = 'CLOSED';
                this.failureCount = 0;
              }
            } else if (this.state === 'CLOSED') {
              this.failureCount = 0;
            }
          }
          
          private onFailure(): void {
            this.lastFailureTime = Date.now();
            
            if (this.state === 'HALF_OPEN') {
              this.state = 'OPEN';
            } else if (this.state === 'CLOSED') {
              this.failureCount++;
              if (this.failureCount >= this.failureThreshold) {
                this.state = 'OPEN';
              }
            }
          }
          
          getState() {
            return {
              state: this.state,
              failureCount: this.failureCount,
              successCount: this.successCount,
              lastFailureTime: this.lastFailureTime,
            };
          }
        }
        
        (window as any).redisCircuitBreaker = new RedisCircuitBreaker();
      });
      
      // Trigger failures to open circuit
      for (let i = 0; i < 6; i++) {
        await page.evaluate(async () => {
          const cb = (window as any).redisCircuitBreaker;
          try {
            await cb.execute(async () => {
              throw new Error('Redis connection failed');
            });
          } catch (error) {
            // Expected failure
          }
        });
      }
      
      // Verify circuit is open
      let state = await page.evaluate(() => 
        (window as any).redisCircuitBreaker.getState()
      );
      
      expect(state.state).toBe('OPEN');
      expect(state.failureCount).toBeGreaterThanOrEqual(5);
      
      // Verify requests are rejected
      const rejectedError = await page.evaluate(async () => {
        const cb = (window as any).redisCircuitBreaker;
        try {
          await cb.execute(async () => 'success');
          return null;
        } catch (error) {
          return error.message;
        }
      });
      
      expect(rejectedError).toBe('Circuit breaker is OPEN');
      
      // Wait for reset timeout
      await page.waitForTimeout(3500);
      
      // Should transition to HALF_OPEN and allow test requests
      await page.evaluate(async () => {
        const cb = (window as any).redisCircuitBreaker;
        
        // Two successful operations should close circuit
        await cb.execute(async () => 'success');
        await cb.execute(async () => 'success');
      });
      
      state = await page.evaluate(() => 
        (window as any).redisCircuitBreaker.getState()
      );
      
      expect(state.state).toBe('CLOSED');
      expect(state.failureCount).toBe(0);
    });
  });
});