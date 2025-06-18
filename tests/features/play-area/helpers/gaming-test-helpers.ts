/// <reference types="../../../types/test-types.d.ts" />
import type { Page, Locator, Route } from '@playwright/test';
import type { 
  TestGameEvent, 
  TestPerformanceMetrics, 
  TestTimerAssertions,
  TestGameAssertions,
  TestNetworkConditions,
  TestApiResponse,
  TestSession,
  TestSessionPlayer,
  TestGameState
} from '../types/test-types';

/**
 * Enhanced gaming test helpers with type safety
 * Provides utilities for WebSocket testing, performance monitoring, and game interactions
 */
export class GamingTestHelpers {

  // ===== WEBSOCKET TESTING =====

  /**
   * Set up WebSocket mocking for real-time game events
   */
  static async setupWebSocketMocking(page: Page): Promise<WebSocketTestHelper> {
    const helper = new WebSocketTestHelper();
    
    await page.routeWebSocket('**/ws', ws => {
      const connection = new MockWebSocketConnection(ws, helper);
      helper.connections.set(connection.id, connection);
      
      ws.onMessage(message => {
        try {
          const data = typeof message === 'string' ? JSON.parse(message) : JSON.parse(message.toString());
          connection.handleMessage(data);
        } catch (error) {
          console.warn('Failed to parse WebSocket message:', error);
        }
      });
      
      ws.onClose(() => {
        helper.connections.delete(connection.id);
      });
    });
    
    return helper;
  }

  /**
   * Simulate real-time game events
   */
  static async simulateGameEvent(
    page: Page, 
    event: TestGameEvent, 
    delay = 0
  ): Promise<void> {
    if (delay > 0) {
      await page.waitForTimeout(delay);
    }
    
    await page.evaluate((eventData) => {
      // Simulate receiving WebSocket event
      const event = new CustomEvent('websocket-message', {
        detail: eventData
      });
      window.dispatchEvent(event);
    }, event);
  }

  /**
   * Wait for specific game event to occur
   */
  static async waitForGameEvent(
    page: Page, 
    eventType: string, 
    timeout = 5000
  ): Promise<TestGameEvent | null> {
    try {
      const eventData = await page.waitForFunction(
        (type) => {
          return new Promise((resolve) => {
            const handler = (event: Event) => {
              if ('detail' in event && (event as CustomEvent).detail?.type === type) {
                window.removeEventListener('websocket-message', handler);
                resolve((event as CustomEvent).detail);
              }
            };
            window.addEventListener('websocket-message', handler);
          });
        },
        eventType,
        { timeout }
      );
      
      return await eventData.jsonValue() as TestGameEvent;
    } catch (error) {
      console.warn(`Timeout waiting for event: ${eventType}`);
      return null;
    }
  }

  // ===== TIMER TESTING =====

  /**
   * Start speedrun timer and verify accuracy
   */
  static async startTimerAndVerify(
    page: Page, 
    testDuration = 2000
  ): Promise<TestTimerAssertions> {
    const startTime = Date.now();
    
    // Start timer
    await page.click('[data-testid="start-speedrun"]');
    
    // Wait for test duration
    await page.waitForTimeout(testDuration);
    
    // Get timer display
    const timerText = await page.locator('[data-testid="speedrun-timer"]').textContent();
    if (!timerText) throw new Error('Timer not found');
    
    const endTime = Date.now();
    const actualDuration = endTime - startTime;
    
    // Parse timer display (MM:SS.mmm format)
    const parts = timerText.split(/[:.]/).map(Number);
    if (parts.length !== 3) throw new Error(`Invalid timer format: ${timerText}`);
    const [minutes, seconds, milliseconds] = parts;
    if (minutes === undefined || seconds === undefined || milliseconds === undefined) {
      throw new Error(`Failed to parse timer parts: ${timerText}`);
    }
    const displayedTime = minutes * 60000 + seconds * 1000 + milliseconds;
    
    return {
      accuracy: Math.abs(displayedTime - testDuration),
      precision: 'ms',
      startTime,
      endTime,
      expectedDuration: testDuration
    };
  }

  /**
   * Test timer precision under different conditions
   */
  static async testTimerPrecision(
    page: Page,
    conditions: {
      duration: number;
      cpuLoad?: boolean;
      networkLatency?: number;
      backgroundTab?: boolean;
    }
  ): Promise<TestTimerAssertions> {
    // Apply test conditions
    if (conditions.cpuLoad) {
      await this.simulateCpuLoad(page);
    }
    
    if (conditions.networkLatency) {
      await this.simulateNetworkLatency(page, conditions.networkLatency);
    }
    
    if (conditions.backgroundTab) {
      // Simulate background tab (limited in test environment)
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: true, writable: true });
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
    }
    
    return await this.startTimerAndVerify(page, conditions.duration);
  }

  /**
   * Simulate CPU load for performance testing
   */
  static async simulateCpuLoad(page: Page): Promise<() => Promise<void>> {
    await page.evaluate(() => {
      // @ts-ignore - Creating CPU load
      window.cpuLoadWorker = new Worker(URL.createObjectURL(new Blob([`
        let running = true;
        self.onmessage = (e) => { 
          if (e.data === 'stop') running = false; 
        };
        while (running) {
          Math.sqrt(Math.random() * 1000000);
        }
      `], { type: 'application/javascript' })));
    });
    
    // Return cleanup function
    return async () => {
      await page.evaluate(() => {
        // @ts-ignore
        if (window.cpuLoadWorker) {
          // @ts-ignore
          window.cpuLoadWorker.postMessage('stop');
          // @ts-ignore
          window.cpuLoadWorker.terminate();
        }
      });
    };
  }

  // ===== PERFORMANCE MONITORING =====

  /**
   * Measure comprehensive performance metrics
   */
  static async measurePerformance(page: Page): Promise<TestPerformanceMetrics> {
    const metrics = await page.evaluate(() => {
      const timing = performance.timing;
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstContentfulPaint: 0, // Would need PerformanceObserver
        largestContentfulPaint: 0, // Would need PerformanceObserver  
        firstInputDelay: 0, // Would need PerformanceObserver
        cumulativeLayoutShift: 0, // Would need PerformanceObserver
        jsHeapSize: performance.memory?.usedJSHeapSize || 0,
        loadTime: timing.loadEventEnd - timing.navigationStart,
        networkRequests: performance.getEntriesByType('resource').length,
        memoryUsage: performance.memory?.usedJSHeapSize || 0
      };
    });
    
    return metrics;
  }

  /**
   * Monitor memory usage over time
   */
  static async monitorMemoryUsage(
    page: Page, 
    duration = 10000,
    interval = 1000
  ): Promise<number[]> {
    const measurements: number[] = [];
    const startTime = Date.now();
    
    while (Date.now() - startTime < duration) {
      const memory = await page.evaluate(() => {
        return performance.memory?.usedJSHeapSize || 0;
      });
      measurements.push(memory);
      await page.waitForTimeout(interval);
    }
    
    return measurements;
  }

  /**
   * Test performance under concurrent load
   */
  static async testConcurrentLoad(
    page: Page, 
    concurrentActions = 10
  ): Promise<{ duration: number; errors: number; metrics: TestPerformanceMetrics }> {
    const startTime = Date.now();
    let errors = 0;
    
    // Create concurrent promises
    const actions = Array.from({ length: concurrentActions }, async (_, i) => {
      try {
        // Simulate rapid game actions
        await page.click(`[data-testid="game-cell-${i % 25}"]`, { force: true });
        await page.waitForTimeout(Math.random() * 100);
      } catch (error) {
        errors++;
      }
    });
    
    await Promise.all(actions);
    
    const duration = Date.now() - startTime;
    const metrics = await this.measurePerformance(page);
    
    return { duration, errors, metrics };
  }

  // ===== NETWORK SIMULATION =====

  /**
   * Simulate network latency
   */
  static async simulateNetworkLatency(page: Page, latencyMs: number): Promise<void> {
    await page.route('**/*', async (route: Route) => {
      await new Promise(resolve => setTimeout(resolve, latencyMs));
      await route.continue();
    });
  }

  /**
   * Simulate network conditions
   */
  static async applyNetworkConditions(
    page: Page, 
    conditions: TestNetworkConditions
  ): Promise<void> {
    if (conditions.offline) {
      await page.context().setOffline(true);
      return;
    }
    
    await page.route('**/*', async (route: Route) => {
      // Simulate packet loss
      if (Math.random() < conditions.packetLoss) {
        await route.abort();
        return;
      }
      
      // Simulate latency
      if (conditions.latency > 0) {
        await new Promise(resolve => setTimeout(resolve, conditions.latency));
      }
      
      await route.continue();
    });
  }

  // ===== GAME INTERACTION HELPERS =====

  /**
   * Mark a cell and verify the action
   */
  static async markCell(
    page: Page, 
    cellIndex: number, 
    expectedPlayer?: string
  ): Promise<TestGameAssertions> {
    const cell = page.locator(`[data-testid="game-cell-${cellIndex}"]`);
    
    // Click the cell
    await cell.click();
    
    // Wait for state change
    await page.waitForTimeout(100);
    
    // Verify cell is marked
    const isMarked = await cell.getAttribute('data-marked') === 'true';
    const markedBy = await cell.getAttribute('data-marked-by');
    
    // Count total marked cells
    const markedCells = await page.locator('[data-testid^="game-cell-"][data-marked="true"]').count();
    
    // Get game state
    const gameStatus = await page.locator('[data-testid="game-status"]').textContent();
    const playerCount = await page.locator('[data-testid^="player-"]').count();
    
    return {
      cellCount: 25, // Assuming 5x5 grid
      markedCells: [cellIndex], // Array of marked cell indices
      winner: gameStatus?.includes('won') ? (markedBy || undefined) : undefined,
      gameState: this.parseGameState(gameStatus || ''),
      playerCount
    };
  }

  /**
   * Wait for player to join session
   */
  static async waitForPlayerJoin(
    page: Page, 
    playerId: string, 
    timeout = 5000
  ): Promise<boolean> {
    try {
      await page.waitForSelector(`[data-testid="player-${playerId}"]`, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for achievement notification
   */
  static async waitForAchievementUnlock(
    page: Page, 
    achievementId: string, 
    timeout = 5000
  ): Promise<boolean> {
    try {
      await page.waitForSelector(`[data-testid="achievement-unlocked-${achievementId}"]`, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  // ===== API MOCKING HELPERS =====

  /**
   * Mock API response with proper typing
   */
  static async mockApiResponse<T>(
    page: Page, 
    url: string, 
    response: TestApiResponse<T>
  ): Promise<void> {
    await page.route(url, route => {
      route.fulfill({
        status: response.success ? 200 : 400,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Mock session data for testing
   */
  static async mockSessionData(
    page: Page, 
    sessionId: string, 
    sessionData: TestSession
  ): Promise<void> {
    await this.mockApiResponse(page, `**/api/sessions/${sessionId}`, {
      success: true,
      data: sessionData
    });
  }

  /**
   * Mock game state for testing
   */
  static async mockGameState(
    page: Page, 
    sessionId: string, 
    gameState: TestGameState
  ): Promise<void> {
    await this.mockApiResponse(page, `**/api/sessions/${sessionId}/board-state`, {
      success: true,
      data: gameState
    });
  }

  // ===== UTILITY METHODS =====

  private static parseGameState(statusText: string): 'waiting' | 'active' | 'paused' | 'completed' {
    if (statusText.toLowerCase().includes('waiting')) return 'waiting';
    if (statusText.toLowerCase().includes('progress')) return 'active';
    if (statusText.toLowerCase().includes('paused')) return 'paused';
    if (statusText.toLowerCase().includes('completed')) return 'completed';
    return 'waiting';
  }

  /**
   * Wait for network idle state
   */
  static async waitForNetworkIdle(
    page: Page, 
    timeout = 2000
  ): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Get store state for debugging
   */
  static async getStoreState(page: Page, storeName: string): Promise<unknown> {
    return await page.evaluate((name) => {
      // @ts-ignore - Accessing global store for testing
      return window[name]?.getState();
    }, storeName);
  }

  /**
   * Wait for store state change
   */
  static async waitForStore(
    page: Page, 
    storeName: string, 
    condition: (state: unknown) => boolean,
    timeout = 5000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const state = await this.getStoreState(page, storeName);
      if (condition(state)) return true;
      await page.waitForTimeout(100);
    }
    
    return false;
  }
}

// ===== WEBSOCKET HELPER CLASSES =====

class WebSocketTestHelper {
  public connections = new Map<string, MockWebSocketConnection>();
  
  simulateEvent(sessionId: string, event: TestGameEvent): void {
    this.connections.forEach(connection => {
      if (connection.sessionId === sessionId) {
        connection.sendEvent(event);
      }
    });
  }
  
  async waitForEvent(
    sessionId: string, 
    eventType: string, 
    timeout = 5000
  ): Promise<TestGameEvent | null> {
    const connection = Array.from(this.connections.values())
      .find(conn => conn.sessionId === sessionId);
    
    if (!connection) return null;
    
    return await connection.waitForEvent(eventType, timeout);
  }
}

class MockWebSocketConnection {
  public id: string;
  public sessionId = '';
  private events: TestGameEvent[] = [];
  private eventHandlers: Map<string, (event: TestGameEvent) => void> = new Map();
  
  constructor(private ws: unknown, private helper: WebSocketTestHelper) {
    this.id = Math.random().toString(36).substr(2, 9);
  }
  
  handleMessage(data: unknown): void {
    if (typeof data === 'object' && data !== null && 'type' in data && data.type === 'subscribe' && 'sessionId' in data) {
      this.sessionId = (data as { sessionId: string }).sessionId;
    }
  }
  
  sendEvent(event: TestGameEvent): void {
    this.events.push(event);
    (this.ws as { send: (data: string) => void }).send(JSON.stringify(event));
    
    // Trigger any waiting handlers
    const handler = this.eventHandlers.get(event.type);
    if (handler) {
      handler(event);
    }
  }
  
  async waitForEvent(eventType: string, timeout: number): Promise<TestGameEvent | null> {
    // Check if event already exists
    const existingEvent = this.events.find(e => e.type === eventType);
    if (existingEvent) return existingEvent;
    
    // Wait for new event
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), timeout);
      
      this.eventHandlers.set(eventType, (event) => {
        clearTimeout(timer);
        this.eventHandlers.delete(eventType);
        resolve(event);
      });
    });
  }
}

// Export main class and utilities
export const {
  setupWebSocketMocking,
  simulateGameEvent,
  waitForGameEvent,
  startTimerAndVerify,
  testTimerPrecision,
  measurePerformance,
  monitorMemoryUsage,
  testConcurrentLoad,
  simulateNetworkLatency,
  applyNetworkConditions,
  markCell,
  waitForPlayerJoin,
  waitForAchievementUnlock,
  mockApiResponse,
  mockSessionData,
  mockGameState,
  waitForNetworkIdle,
  getStoreState,
  waitForStore
} = GamingTestHelpers;