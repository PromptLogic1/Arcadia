import { vi } from 'vitest';
import type { GameEvent } from '../../types';

// Mock Supabase realtime client
export const createMockRealtimeClient = () => {
  const mockChannel = {
    on: vi.fn(),
    off: vi.fn(),
    send: vi.fn(),
    subscribe: vi.fn().mockResolvedValue({ error: null }),
    unsubscribe: vi.fn().mockResolvedValue({ error: null }),
    track: vi.fn(),
    untrack: vi.fn(),
  };

  const mockClient = {
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
    removeAllChannels: vi.fn(),
    getChannels: vi.fn().mockReturnValue([]),
  };

  return {
    client: mockClient,
    channel: mockChannel,
  };
};

// Mock WebSocket connection
export class MockWebSocket {
  readyState = WebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(url: string) {
    this.url = url;
    // Simulate connection after a brief delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string): void {
    if (this.readyState !== WebSocket.OPEN) {
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
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }

  addEventListener(type: string, listener: Function): void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, []);
    }
    this.eventHandlers.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: Function): void {
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
  simulateMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { 
        data: typeof data === 'string' ? data : JSON.stringify(data) 
      }));
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateDisconnection(): void {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: 1006, reason: 'Connection lost' }));
    }
  }
}

// Mock game event bus
export class MockGameEventBus {
  private listeners: Map<string, Function[]> = new Map();
  private events: GameEvent[] = [];

  on(eventType: string, callback: Function): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);

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
export class MockPresenceTracker {
  private presenceData: Map<string, any> = new Map();
  private onlineUsers: Set<string> = new Set();

  track(userId: string, data: any): void {
    this.presenceData.set(userId, data);
    this.onlineUsers.add(userId);
  }

  untrack(userId: string): void {
    this.presenceData.delete(userId);
    this.onlineUsers.delete(userId);
  }

  getPresence(userId: string): any {
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
  simulateOnline(userId: string, data: any): void {
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

  async checkLimit(key: string): Promise<{ allowed: boolean; remaining: number; reset: number }> {
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
  private operations: Array<{ type: string; duration: number; timestamp: number }> = [];
  private latency = 10; // Default 10ms

  setLatency(ms: number): void {
    this.latency = ms;
  }

  async mockQuery(queryType: string): Promise<any> {
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

  async mockTransaction(operations: string[]): Promise<any> {
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
      operationsByType.set(op.type, (operationsByType.get(op.type) || 0) + 1);
      totalDuration += op.duration;
    });

    return {
      totalOperations: this.operations.length,
      averageDuration: this.operations.length > 0 ? totalDuration / this.operations.length : 0,
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
    new Promise(resolve => setTimeout(resolve, min + Math.random() * (max - min))),
  
  simulateConcurrentOperations: async (operations: Array<() => Promise<any>>) => {
    return Promise.allSettled(operations.map(op => op()));
  },
  
  measureOperation: async <T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    return { result, duration };
  },
};