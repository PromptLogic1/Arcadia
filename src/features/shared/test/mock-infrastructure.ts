/**
 * Mock Infrastructure for Unit Testing
 *
 * Provides mock implementations of Redis, network services, and other infrastructure
 */

import { jest } from '@jest/globals';

// Mock Redis client
export class MockRedisClient {
  private store = new Map<string, { value: string; expires?: number }>();
  private subscribers = new Map<string, Set<(message: string) => void>>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expires && entry.expires < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(
    key: string,
    value: string,
    options?: { EX?: number }
  ): Promise<'OK'> {
    const expires = options?.EX ? Date.now() + options.EX * 1000 : undefined;
    this.store.set(key, { value, expires });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const value = current ? parseInt(current) + 1 : 1;
    await this.set(key, value.toString());
    return value;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;

    entry.expires = Date.now() + seconds * 1000;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -2;
    if (!entry.expires) return -1;

    const remaining = Math.floor((entry.expires - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  // Pub/Sub
  subscribe(channel: string, callback: (message: string) => void): void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    const subscribers = this.subscribers.get(channel);
    subscribers?.add(callback);
  }

  unsubscribe(channel: string, callback: (message: string) => void): void {
    this.subscribers.get(channel)?.delete(callback);
  }

  publish(channel: string, message: string): number {
    const callbacks = this.subscribers.get(channel);
    if (!callbacks) return 0;

    callbacks.forEach(callback => callback(message));
    return callbacks.size;
  }

  // Test helpers
  clear(): void {
    this.store.clear();
    this.subscribers.clear();
  }

  getStore(): Map<string, { value: string; expires?: number }> {
    return new Map(this.store);
  }
}

// Mock fetch for network simulation
export function createMockFetch() {
  const responses = new Map<
    string,
    { status: number; data: unknown; delay?: number }
  >();
  const callHistory: Array<{
    url: string;
    options?: RequestInit;
    timestamp: number;
  }> = [];

  const mockFetch = jest.fn(async (url: string, options?: RequestInit) => {
    callHistory.push({ url, options, timestamp: Date.now() });

    const response = responses.get(url);
    if (!response) {
      throw new Error(`No mock response configured for ${url}`);
    }

    if (response.delay) {
      await new Promise(resolve => setTimeout(resolve, response.delay));
    }

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => response.data,
      text: async () => JSON.stringify(response.data),
    };
  });

  return {
    fetch: mockFetch,
    mockResponse(url: string, status: number, data: unknown, delay?: number) {
      responses.set(url, { status, data, delay });
    },
    getCallHistory() {
      return [...callHistory];
    },
    reset() {
      responses.clear();
      callHistory.length = 0;
      mockFetch.mockClear();
    },
  };
}

// Network failure simulator
export class NetworkFailureSimulator {
  private failurePatterns = new Map<
    string,
    { type: 'timeout' | 'error' | 'intermittent'; rate?: number }
  >();

  addFailurePattern(
    urlPattern: string,
    type: 'timeout' | 'error' | 'intermittent',
    rate = 1
  ): void {
    this.failurePatterns.set(urlPattern, { type, rate });
  }

  shouldFail(url: string): { fail: boolean; type?: 'timeout' | 'error' } {
    for (const [pattern, config] of this.failurePatterns) {
      if (url.includes(pattern)) {
        const shouldFail =
          config.type === 'intermittent'
            ? Math.random() < (config.rate || 0.5)
            : true;

        return {
          fail: shouldFail,
          type: config.type === 'intermittent' ? 'error' : config.type,
        };
      }
    }

    return { fail: false };
  }

  reset(): void {
    this.failurePatterns.clear();
  }
}

// Time travel utilities for testing time-based logic
export class TimeTravelHelper {
  private originalDateNow = Date.now;
  private currentTime = Date.now();

  start(): void {
    Date.now = () => this.currentTime;
  }

  stop(): void {
    Date.now = this.originalDateNow;
  }

  advance(ms: number): void {
    this.currentTime += ms;
  }

  setTime(timestamp: number): void {
    this.currentTime = timestamp;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }
}

// Mock Sentry client
export class MockSentryClient {
  private events: Array<{
    type: 'exception' | 'message' | 'transaction';
    data: unknown;
    context?: Record<string, unknown>;
    timestamp: number;
  }> = [];

  captureException(error: Error, context?: Record<string, unknown>): string {
    const eventId = Math.random().toString(36).substring(2);
    this.events.push({
      type: 'exception',
      data: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      context,
      timestamp: Date.now(),
    });
    return eventId;
  }

  captureMessage(message: string, level?: string): string {
    const eventId = Math.random().toString(36).substring(2);
    this.events.push({
      type: 'message',
      data: { message, level },
      timestamp: Date.now(),
    });
    return eventId;
  }

  withScope(callback: (scope: {
    setTag: jest.Mock;
    setContext: jest.Mock;
    setUser: jest.Mock;
    setLevel: jest.Mock;
  }) => void): void {
    const scope = {
      setTag: jest.fn(),
      setContext: jest.fn(),
      setUser: jest.fn(),
      setLevel: jest.fn(),
    };
    callback(scope);
  }

  getEvents(): typeof this.events {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}

// Performance metrics collector
export class PerformanceMetricsCollector {
  private metrics: Array<{
    name: string;
    duration: number;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }> = [];

  startMeasure(name: string): () => void {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      this.metrics.push({
        name,
        duration,
        timestamp: Date.now(),
      });
    };
  }

  async measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;
      this.metrics.push({
        name,
        duration,
        timestamp: Date.now(),
        metadata: { success: true },
      });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.metrics.push({
        name,
        duration,
        timestamp: Date.now(),
        metadata: { success: false, error: (error as Error).message },
      });
      throw error;
    }
  }

  getMetrics(name?: string): typeof this.metrics {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  getStats(name?: string) {
    const filtered = name
      ? this.metrics.filter(m => m.name === name)
      : this.metrics;

    if (filtered.length === 0) {
      return null;
    }

    const durations = filtered.map(m => m.duration);
    const sorted = [...durations].sort((a, b) => a - b);

    return {
      count: filtered.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  clear(): void {
    this.metrics = [];
  }
}

// Chaos engineering helper
export class ChaosHelper {
  private chaosEnabled = false;
  private chaosConfig = {
    errorRate: 0.1,
    latencyMs: { min: 100, max: 3000 },
    timeoutRate: 0.05,
  };

  enable(config?: Partial<typeof this.chaosConfig>): void {
    this.chaosEnabled = true;
    if (config) {
      this.chaosConfig = { ...this.chaosConfig, ...config };
    }
  }

  disable(): void {
    this.chaosEnabled = false;
  }

  async maybeInjectChaos<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.chaosEnabled) {
      return operation();
    }

    // Random timeout
    if (Math.random() < this.chaosConfig.timeoutRate) {
      throw new Error('Operation timed out (chaos)');
    }

    // Random latency
    const latency =
      this.chaosConfig.latencyMs.min +
      Math.random() *
        (this.chaosConfig.latencyMs.max - this.chaosConfig.latencyMs.min);
    await new Promise(resolve => setTimeout(resolve, latency));

    // Random error
    if (Math.random() < this.chaosConfig.errorRate) {
      throw new Error('Random chaos error');
    }

    return operation();
  }
}
