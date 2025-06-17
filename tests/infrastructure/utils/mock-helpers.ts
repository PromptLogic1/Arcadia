/**
 * Enhanced type-safe mock utilities for infrastructure testing
 * 
 * This module provides advanced mocking capabilities with realistic
 * network simulation, error injection, and type safety for all
 * infrastructure test scenarios.
 */

import type { Page, Route } from '@playwright/test';
import type {
  ApiError,
  NetworkError,
  InfrastructureError,
  RateLimitError,
} from '../types/errors';
import {
  generateApiError,
  generateNetworkError,
  generateInfrastructureError,
  generateRateLimitError,
} from './error-generators';

/**
 * Options for mocking API responses with network simulation
 */
export interface MockApiOptions<T = unknown> {
  status: number;
  body?: T;
  headers?: Record<string, string>;
  delay?: number;
  jitter?: number;
  failureRate?: number;
  networkCondition?: NetworkCondition;
}

/**
 * Network condition presets for realistic testing
 */
export type NetworkCondition = 
  | 'fast-3g'
  | 'slow-3g'
  | 'offline'
  | 'flaky'
  | 'high-latency'
  | 'packet-loss';

/**
 * Network condition configurations
 */
const NETWORK_CONDITIONS: Record<NetworkCondition, {
  delay: number;
  jitter: number;
  failureRate: number;
  bandwidth?: number;
}> = {
  'fast-3g': { delay: 100, jitter: 50, failureRate: 0.01 },
  'slow-3g': { delay: 500, jitter: 200, failureRate: 0.05 },
  'offline': { delay: 0, jitter: 0, failureRate: 1 },
  'flaky': { delay: 200, jitter: 500, failureRate: 0.3 },
  'high-latency': { delay: 2000, jitter: 500, failureRate: 0.02 },
  'packet-loss': { delay: 100, jitter: 50, failureRate: 0.15 },
};

/**
 * Mock API response with advanced network simulation
 */
export async function mockApiResponseTyped<T>(
  page: Page,
  pattern: string | RegExp,
  options: MockApiOptions<T>
): Promise<void> {
  await page.route(pattern, async (route) => {
    // Apply network condition if specified
    const networkConfig = options.networkCondition 
      ? NETWORK_CONDITIONS[options.networkCondition]
      : null;
    
    const delay = options.delay || networkConfig?.delay || 0;
    const jitter = options.jitter || networkConfig?.jitter || 0;
    const failureRate = options.failureRate || networkConfig?.failureRate || 0;
    
    // Simulate network delay with jitter
    if (delay > 0) {
      const actualDelay = delay + (Math.random() - 0.5) * jitter;
      await new Promise(resolve => setTimeout(resolve, Math.max(0, actualDelay)));
    }
    
    // Simulate random failures
    if (failureRate > 0 && Math.random() < failureRate) {
      await route.abort('failed');
      return;
    }
    
    // Return response
    await route.fulfill({
      status: options.status,
      contentType: 'application/json',
      headers: {
        'X-Response-Time': delay.toString(),
        ...options.headers,
      },
      body: JSON.stringify(options.body || {}),
    });
  });
}

/**
 * Mock network failure with specific error type
 */
export async function mockNetworkFailure(
  page: Page,
  pattern: string | RegExp,
  errorType: NetworkError['type'] = 'timeout',
  options?: Partial<NetworkError>
): Promise<void> {
  await page.route(pattern, async (route) => {
    const error = generateNetworkError(errorType, options);
    
    switch (errorType) {
      case 'timeout':
        // Simulate timeout by not responding
        await new Promise(resolve => setTimeout(resolve, 30000));
        break;
      
      case 'connection':
      case 'refused':
      case 'reset':
        await route.abort('failed');
        break;
      
      case 'dns':
        await route.abort('namenotresolved');
        break;
      
      case 'ssl':
        await route.abort('failed');
        break;
    }
  });
}

/**
 * Mock infrastructure service failure
 */
export async function mockInfrastructureFailure(
  page: Page,
  service: InfrastructureError['service'],
  operation: string,
  options?: Partial<InfrastructureError>
): Promise<void> {
  const error = generateInfrastructureError(service, operation, options);
  
  // Inject error into page context
  await page.evaluate((errorData) => {
    (window as any).__infrastructureError = errorData;
  }, error);
  
  // Mock service-specific endpoints
  switch (service) {
    case 'redis':
      await mockRedisFailure(page, error);
      break;
    
    case 'supabase':
      await mockSupabaseFailure(page, error);
      break;
    
    case 'sentry':
      await mockSentryFailure(page, error);
      break;
  }
}

/**
 * Mock Redis-specific failures
 */
async function mockRedisFailure(
  page: Page,
  error: InfrastructureError
): Promise<void> {
  await page.evaluate((errorData) => {
    // Override Redis client methods
    if ((window as any).__redis) {
      const redis = (window as any).__redis;
      const operations = ['get', 'set', 'del', 'keys', 'ping'];
      
      operations.forEach(op => {
        if (redis[op]) {
          redis[op] = async () => {
            throw new Error(errorData.message);
          };
        }
      });
    }
  }, error);
}

/**
 * Mock Supabase-specific failures
 */
async function mockSupabaseFailure(
  page: Page,
  error: InfrastructureError
): Promise<void> {
  // Mock Supabase API endpoints
  await page.route('**/rest/v1/**', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        message: error.message,
        code: error.code,
      }),
    });
  });
  
  await page.route('**/realtime/v1/**', async (route) => {
    await route.abort('failed');
  });
}

/**
 * Mock Sentry-specific failures
 */
async function mockSentryFailure(
  page: Page,
  error: InfrastructureError
): Promise<void> {
  await page.route('**/api/*/store/**', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Service unavailable',
      }),
    });
  });
}

/**
 * Mock rate limiting with proper headers
 */
export async function mockRateLimit(
  page: Page,
  pattern: string | RegExp,
  limit: number,
  remaining: number,
  resetTime?: number
): Promise<void> {
  const reset = resetTime || Date.now() + 60000;
  const error = generateRateLimitError(limit, remaining, { resetTime: reset });
  
  await page.route(pattern, async (route) => {
    await route.fulfill({
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
        'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
      },
      body: JSON.stringify({
        error: error.message,
        code: error.code,
      }),
    });
  });
}

/**
 * Mock progressive degradation of service
 */
export async function mockProgressiveDegradation(
  page: Page,
  pattern: string | RegExp,
  stages: Array<{
    requestCount: number;
    status: number;
    delay?: number;
    body?: unknown;
  }>
): Promise<void> {
  let requestCount = 0;
  
  await page.route(pattern, async (route) => {
    requestCount++;
    
    // Find appropriate stage based on request count
    const stage = stages.find(s => requestCount <= s.requestCount) || stages[stages.length - 1];
    
    // Apply delay if specified
    if (stage.delay) {
      await new Promise(resolve => setTimeout(resolve, stage.delay));
    }
    
    // Return response for current stage
    await route.fulfill({
      status: stage.status,
      contentType: 'application/json',
      body: JSON.stringify(stage.body || { error: `Stage ${requestCount}` }),
    });
  });
}

/**
 * Circuit breaker state manager for testing
 */
export class MockCircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  
  constructor(
    private threshold = 5,
    private timeout = 30000,
    private halfOpenSuccesses = 3
  ) {}
  
  async mockResponse(route: Route): Promise<void> {
    switch (this.state) {
      case 'CLOSED':
        // Normal operation, but track failures
        if (Math.random() < 0.3) { // 30% failure rate for testing
          this.recordFailure();
          await route.abort('failed');
        } else {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ status: 'ok' }),
          });
        }
        break;
      
      case 'OPEN':
        // Check if timeout has passed
        if (Date.now() - this.lastFailureTime > this.timeout) {
          this.state = 'HALF_OPEN';
          this.successCount = 0;
        } else {
          // Reject immediately
          await route.fulfill({
            status: 503,
            body: JSON.stringify({
              error: 'Circuit breaker is OPEN',
              retryAfter: this.timeout - (Date.now() - this.lastFailureTime),
            }),
          });
        }
        break;
      
      case 'HALF_OPEN':
        // Allow limited requests through
        if (Math.random() < 0.7) { // 70% success rate
          this.successCount++;
          if (this.successCount >= this.halfOpenSuccesses) {
            this.state = 'CLOSED';
            this.failureCount = 0;
          }
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ status: 'ok' }),
          });
        } else {
          this.state = 'OPEN';
          this.lastFailureTime = Date.now();
          await route.abort('failed');
        }
        break;
    }
  }
  
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
  
  getState(): string {
    return this.state;
  }
}

/**
 * Mock WebSocket failures for real-time features
 */
export async function mockWebSocketFailure(
  page: Page,
  type: 'connection' | 'disconnect' | 'message-loss'
): Promise<void> {
  await page.evaluate((failureType) => {
    const originalWebSocket = window.WebSocket;
    
    // Override WebSocket constructor
    (window as any).WebSocket = class extends originalWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        
        switch (failureType) {
          case 'connection':
            // Prevent connection
            setTimeout(() => {
              this.dispatchEvent(new CloseEvent('close', {
                code: 1006,
                reason: 'Connection failed',
              }));
            }, 100);
            break;
          
          case 'disconnect':
            // Disconnect after 2 seconds
            setTimeout(() => {
              this.close(1006, 'Abnormal closure');
            }, 2000);
            break;
          
          case 'message-loss':
            // Drop 30% of messages
            const originalSend = this.send.bind(this);
            this.send = (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
              if (Math.random() > 0.3) {
                originalSend(data);
              }
            };
            break;
        }
      }
    };
  }, type);
}

/**
 * Create request interceptor for monitoring
 */
export async function createRequestMonitor(
  page: Page
): Promise<{
  getRequests: () => Array<{ url: string; method: string; status?: number }>;
  clear: () => void;
}> {
  const requests: Array<{ url: string; method: string; status?: number }> = [];
  
  await page.route('**/*', async (route, request) => {
    const entry = {
      url: request.url(),
      method: request.method(),
      status: undefined as number | undefined,
    };
    
    requests.push(entry);
    
    const response = await route.fetch();
    entry.status = response.status();
    
    await route.fulfill({ response });
  });
  
  return {
    getRequests: () => [...requests],
    clear: () => requests.length = 0,
  };
}