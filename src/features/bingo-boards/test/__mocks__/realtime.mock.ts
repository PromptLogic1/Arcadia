import { jest } from '@jest/globals';
import type { GameEvent } from '../../types';

// Mock Supabase realtime client
export const createMockRealtimeClient = () => {
  const mockChannel = {
    on: jest.fn(() => mockChannel), // Return self for chaining
    off: jest.fn(() => mockChannel),
    send: jest.fn(() => ({ error: null })),
    subscribe: jest
      .fn()
      .mockImplementation(() => Promise.resolve({ error: null })),
    unsubscribe: jest
      .fn()
      .mockImplementation(() => Promise.resolve({ error: null })),
    track: jest.fn(() => ({ error: null })),
    untrack: jest.fn(() => ({ error: null })),
  };

  const mockClient = {
    channel: jest.fn().mockReturnValue(mockChannel),
    removeChannel: jest.fn(),
    removeAllChannels: jest.fn(),
    getChannels: jest.fn().mockReturnValue([]),
  };

  return {
    client: mockClient,
    channel: mockChannel,
  };
};

// Mock WebSocket connection
export class MockWebSocket {
  readyState = 0; // WebSocket.CONNECTING
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  private eventHandlers: Map<string, EventListener[]> = new Map();

  constructor(url: string) {
    this.url = url;
    // Simulate connection after a brief delay
    setTimeout(() => {
      this.readyState = 1; // WebSocket.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string): void {
    if (this.readyState !== 1) {
      // WebSocket.OPEN
      throw new Error('WebSocket is not open');
    }

    // Echo back for testing
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', { data }));
      }
    }, 1);
  }

  close(code?: number, reason?: string): void {
    this.readyState = 3; // WebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, []);
    }
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.push(listener);
    }
  }

  removeEventListener(type: string, listener: EventListener): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(listener);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  dispatchEvent(event: Event): boolean {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
    return true;
  }

  // Test utilities
  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      this.onmessage(
        new MessageEvent('message', {
          data: typeof data === 'string' ? data : JSON.stringify(data),
        })
      );
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateDisconnection(): void {
    this.readyState = 3; // WebSocket.CLOSED
    if (this.onclose) {
      this.onclose(
        new CloseEvent('close', { code: 1006, reason: 'Connection lost' })
      );
    }
  }
}

// Mock game event bus
export class MockGameEventBus {
  private listeners: Map<string, Array<(event: GameEvent) => void>> = new Map();
  private events: GameEvent[] = [];

  on(eventType: string, callback: (event: GameEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.push(callback);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  emit(event: GameEvent): void {
    this.events.push(event);
    const callbacks = this.listeners.get(event.type);
    if (callbacks) {
      callbacks.forEach(callback => callback(event));
    }
  }

  getEvents(): GameEvent[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }

  getEventsByType(type: string): GameEvent[] {
    return this.events.filter(event => event.type === type);
  }
}

// Mock presence system
interface PresenceData {
  status: string;
  lastActivity?: Date;
  [key: string]: unknown;
}

export class MockPresenceTracker {
  private presenceData: Map<string, PresenceData> = new Map();
  private onlineUsers: Set<string> = new Set();

  track(userId: string, data: PresenceData): void {
    this.presenceData.set(userId, data);
    this.onlineUsers.add(userId);
  }

  untrack(userId: string): void {
    this.presenceData.delete(userId);
    this.onlineUsers.delete(userId);
  }

  getPresence(userId: string): PresenceData | undefined {
    return this.presenceData.get(userId);
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }

  getOnlineCount(): number {
    return this.onlineUsers.size;
  }

  // Simulate user going offline
  simulateOffline(userId: string): void {
    this.onlineUsers.delete(userId);
  }

  // Simulate user coming back online
  simulateOnline(userId: string, data: PresenceData): void {
    this.presenceData.set(userId, data);
    this.onlineUsers.add(userId);
  }
}

// Mock network condition simulator
export class MockNetworkConditions {
  private latency = 0;
  private packetLoss = 0;
  private isOffline = false;

  setLatency(ms: number): void {
    this.latency = ms;
  }

  setPacketLoss(percentage: number): void {
    this.packetLoss = Math.max(0, Math.min(1, percentage));
  }

  setOffline(offline: boolean): void {
    this.isOffline = offline;
  }

  async simulateNetworkCall<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOffline) {
      throw new Error('Network offline');
    }

    // Simulate packet loss
    if (Math.random() < this.packetLoss) {
      throw new Error('Packet lost');
    }

    // Simulate latency
    if (this.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latency));
    }

    return operation();
  }

  // Simulate network partition
  async simulatePartition(duration: number): Promise<void> {
    this.setOffline(true);
    await new Promise(resolve => setTimeout(resolve, duration));
    this.setOffline(false);
  }

  // Simulate unstable connection
  simulateInstability(duration: number, maxLatency = 1000): void {
    const interval = setInterval(() => {
      this.setLatency(Math.random() * maxLatency);
      this.setPacketLoss(Math.random() * 0.1); // Up to 10% packet loss
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      this.setLatency(0);
      this.setPacketLoss(0);
    }, duration);
  }
}

// Mock rate limiter
export class MockRateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private limits: Map<string, { count: number; window: number }> = new Map();

  setLimit(key: string, count: number, windowMs: number): void {
    this.limits.set(key, { count, window: windowMs });
  }

  async checkLimit(
    key: string
  ): Promise<{ allowed: boolean; remaining: number; reset: number }> {
    const limit = this.limits.get(key);
    if (!limit) {
      return { allowed: true, remaining: Infinity, reset: 0 };
    }

    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < limit.window);

    if (validAttempts.length >= limit.count) {
      return {
        allowed: false,
        remaining: 0,
        reset: validAttempts[0]! + limit.window,
      };
    }

    // Record this attempt
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);

    return {
      allowed: true,
      remaining: limit.count - validAttempts.length,
      reset: now + limit.window,
    };
  }

  reset(key?: string): void {
    if (key) {
      this.attempts.delete(key);
    } else {
      this.attempts.clear();
    }
  }
}

// Mock database operations with timing
export class MockDatabaseOperations {
  private operations: Array<{
    type: string;
    duration: number;
    timestamp: number;
  }> = [];
  private latency = 10; // Default 10ms

  setLatency(ms: number): void {
    this.latency = ms;
  }

  async mockQuery(
    queryType: string
  ): Promise<{ success: boolean; timestamp: number }> {
    const start = performance.now();

    // Simulate database latency
    await new Promise(resolve => setTimeout(resolve, this.latency));

    const duration = performance.now() - start;
    this.operations.push({
      type: queryType,
      duration,
      timestamp: Date.now(),
    });

    return { success: true, timestamp: Date.now() };
  }

  async mockTransaction(
    operations: string[]
  ): Promise<{ success: boolean; operations: number }> {
    const start = performance.now();

    // Simulate transaction overhead
    const transactionLatency = this.latency * operations.length * 1.1;
    await new Promise(resolve => setTimeout(resolve, transactionLatency));

    const duration = performance.now() - start;
    this.operations.push({
      type: `transaction:${operations.join(',')}`,
      duration,
      timestamp: Date.now(),
    });

    return { success: true, operations: operations.length };
  }

  getOperationStats(): {
    totalOperations: number;
    averageDuration: number;
    operationsByType: Map<string, number>;
  } {
    const operationsByType = new Map<string, number>();
    let totalDuration = 0;

    this.operations.forEach(op => {
      operationsByType.set(op.type, (operationsByType.get(op.type) ?? 0) + 1);
      totalDuration += op.duration;
    });

    return {
      totalOperations: this.operations.length,
      averageDuration:
        this.operations.length > 0 ? totalDuration / this.operations.length : 0,
      operationsByType,
    };
  }

  clearStats(): void {
    this.operations = [];
  }
}

// Mock utilities
export const mockUtils = {
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  randomDelay: (min: number, max: number) =>
    new Promise(resolve =>
      setTimeout(resolve, min + Math.random() * (max - min))
    ),

  simulateConcurrentOperations: async (
    operations: Array<() => Promise<unknown>>
  ) => {
    return Promise.allSettled(operations.map(op => op()));
  },

  measureOperation: async <T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    return { result, duration };
  },
};
