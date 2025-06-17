import { Page, BrowserContext } from '@playwright/test';
import type { Tables, Enums } from '../../../types/database.types';
import type { RealtimeEvent, GameStateSnapshot } from './bingo-test-utils';

/**
 * Enhanced utilities for testing real-time functionality in bingo games
 */

// =============================================================================
// WEBSOCKET EVENT TRACKING
// =============================================================================

export class WebSocketEventTracker {
  private events: RealtimeEvent[] = [];
  private page: Page;
  private isTracking = false;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Start tracking WebSocket events
   */
  async startTracking(): Promise<void> {
    if (this.isTracking) return;
    
    await this.page.evaluate(() => {
      // Inject WebSocket interceptor
      const originalSend = WebSocket.prototype.send;
      const events: any[] = [];
      
      (window as any).__wsEvents = events;
      
      WebSocket.prototype.send = function(data: string | ArrayBuffer | Blob) {
        events.push({
          type: 'send',
          data: typeof data === 'string' ? JSON.parse(data) : data,
          timestamp: Date.now()
        });
        return originalSend.call(this, data);
      };
      
      // Also track received messages
      const originalAddEventListener = WebSocket.prototype.addEventListener;
      WebSocket.prototype.addEventListener = function(type: string, listener: any) {
        if (type === 'message') {
          const wrappedListener = (event: MessageEvent) => {
            events.push({
              type: 'receive',
              data: typeof event.data === 'string' ? JSON.parse(event.data) : event.data,
              timestamp: Date.now()
            });
            listener(event);
          };
          return originalAddEventListener.call(this, type, wrappedListener);
        }
        return originalAddEventListener.call(this, type, listener);
      };
    });
    
    this.isTracking = true;
  }
  
  /**
   * Get all tracked events
   */
  async getEvents(): Promise<RealtimeEvent[]> {
    const rawEvents = await this.page.evaluate(() => {
      return (window as any).__wsEvents || [];
    });
    
    return rawEvents.map((event: any) => ({
      type: event.data.type,
      sessionId: event.data.sessionId,
      playerId: event.data.playerId,
      timestamp: event.timestamp,
      data: event.data.data,
      version: event.data.version || 1
    }));
  }
  
  /**
   * Get events of a specific type
   */
  async getEventsByType(eventType: Enums<'session_event_type'>): Promise<RealtimeEvent[]> {
    const allEvents = await this.getEvents();
    return allEvents.filter(event => event.type === eventType);
  }
  
  /**
   * Wait for a specific event
   */
  async waitForEvent(
    eventType: Enums<'session_event_type'>,
    timeout: number = 5000
  ): Promise<RealtimeEvent | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const events = await this.getEventsByType(eventType);
      if (events.length > 0) {
        return events[events.length - 1]; // Return most recent
      }
      await this.page.waitForTimeout(100);
    }
    
    return null;
  }
  
  /**
   * Clear tracked events
   */
  async clearEvents(): Promise<void> {
    await this.page.evaluate(() => {
      (window as any).__wsEvents = [];
    });
    this.events = [];
  }
  
  /**
   * Stop tracking and restore original WebSocket
   */
  async stopTracking(): Promise<void> {
    if (!this.isTracking) return;
    
    await this.page.evaluate(() => {
      // Restore original WebSocket methods
      // Note: In a real implementation, we'd store and restore the originals
      delete (window as any).__wsEvents;
    });
    
    this.isTracking = false;
  }
}

// =============================================================================
// CONNECTION RESILIENCE TESTING
// =============================================================================

export interface NetworkConditions {
  offline?: boolean;
  latency?: number;
  downloadThroughput?: number;
  uploadThroughput?: number;
  packetLoss?: number;
}

export class NetworkSimulator {
  private context: BrowserContext;
  private originalConditions?: NetworkConditions;
  
  constructor(context: BrowserContext) {
    this.context = context;
  }
  
  /**
   * Apply network conditions
   */
  async applyConditions(conditions: NetworkConditions): Promise<void> {
    // Playwright doesn't support packet loss directly, but we can simulate it
    if (conditions.offline) {
      await this.context.setOffline(true);
    } else {
      await this.context.setOffline(false);
      
      // Note: These are Chrome DevTools Protocol specific
      // In a real implementation, we'd use CDP for more granular control
    }
  }
  
  /**
   * Simulate network flakiness
   */
  async simulateFlakiness(
    duration: number,
    options: {
      disconnectProbability?: number;
      disconnectDuration?: { min: number; max: number };
      latencySpikes?: { probability: number; duration: number; multiplier: number };
    } = {}
  ): Promise<void> {
    const {
      disconnectProbability = 0.1,
      disconnectDuration = { min: 500, max: 2000 },
      latencySpikes = { probability: 0.2, duration: 1000, multiplier: 5 }
    } = options;
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < duration) {
      // Random disconnection
      if (Math.random() < disconnectProbability) {
        await this.context.setOffline(true);
        const disconnectTime = disconnectDuration.min + 
          Math.random() * (disconnectDuration.max - disconnectDuration.min);
        await new Promise(resolve => setTimeout(resolve, disconnectTime));
        await this.context.setOffline(false);
      }
      
      // Random latency spike (would need CDP for real implementation)
      if (Math.random() < latencySpikes.probability) {
        // In a real implementation, we'd increase latency here
        await new Promise(resolve => setTimeout(resolve, latencySpikes.duration));
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  /**
   * Reset network conditions
   */
  async reset(): Promise<void> {
    await this.context.setOffline(false);
  }
}

// =============================================================================
// STATE SYNCHRONIZATION TESTING
// =============================================================================

export class StateSyncTester {
  private pages: Page[];
  private eventTrackers: Map<Page, WebSocketEventTracker> = new Map();
  
  constructor(pages: Page[]) {
    this.pages = pages;
    pages.forEach(page => {
      this.eventTrackers.set(page, new WebSocketEventTracker(page));
    });
  }
  
  /**
   * Start tracking all pages
   */
  async startTracking(): Promise<void> {
    await Promise.all(
      Array.from(this.eventTrackers.values()).map(tracker => tracker.startTracking())
    );
  }
  
  /**
   * Verify state consistency across all pages
   */
  async verifyStateConsistency(): Promise<{
    consistent: boolean;
    states: GameStateSnapshot[];
    discrepancies: string[];
  }> {
    const states = await Promise.all(
      this.pages.map(page => this.getGameState(page))
    );
    
    const discrepancies: string[] = [];
    let consistent = true;
    
    // Compare all states to the first one
    const referenceState = states[0];
    
    for (let i = 1; i < states.length; i++) {
      const state = states[i];
      
      // Compare marked cells
      if (JSON.stringify(state.markedCells) !== JSON.stringify(referenceState.markedCells)) {
        discrepancies.push(`Page ${i}: Different marked cells`);
        consistent = false;
      }
      
      // Compare player count
      if (state.players.length !== referenceState.players.length) {
        discrepancies.push(`Page ${i}: Different player count`);
        consistent = false;
      }
      
      // Compare game status
      if (state.gameStatus !== referenceState.gameStatus) {
        discrepancies.push(`Page ${i}: Different game status`);
        consistent = false;
      }
    }
    
    return { consistent, states, discrepancies };
  }
  
  /**
   * Measure synchronization latency
   */
  async measureSyncLatency(
    action: (page: Page) => Promise<void>,
    expectedChange: (state: GameStateSnapshot) => boolean
  ): Promise<{
    initiatorPage: number;
    latencies: number[];
    averageLatency: number;
    maxLatency: number;
  }> {
    const initiatorIndex = 0;
    const initiatorPage = this.pages[initiatorIndex];
    
    // Record initial states
    const initialStates = await Promise.all(
      this.pages.map(page => this.getGameState(page))
    );
    
    // Perform action and record time
    const actionTime = Date.now();
    await action(initiatorPage);
    
    // Wait for all pages to reflect the change
    const latencies: number[] = [];
    const updatePromises = this.pages.map(async (page, index) => {
      if (index === initiatorIndex) {
        latencies[index] = 0; // Initiator has 0 latency
        return;
      }
      
      const startTime = Date.now();
      while (Date.now() - startTime < 5000) { // 5 second timeout
        const state = await this.getGameState(page);
        if (expectedChange(state)) {
          latencies[index] = Date.now() - actionTime;
          return;
        }
        await page.waitForTimeout(10);
      }
      latencies[index] = -1; // Timeout
    });
    
    await Promise.all(updatePromises);
    
    const validLatencies = latencies.filter(l => l >= 0);
    const averageLatency = validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length;
    const maxLatency = Math.max(...validLatencies);
    
    return {
      initiatorPage: initiatorIndex,
      latencies,
      averageLatency,
      maxLatency
    };
  }
  
  /**
   * Test concurrent actions from multiple pages
   */
  async testConcurrentActions(
    actions: Array<(page: Page) => Promise<void>>
  ): Promise<{
    executionTimes: number[];
    conflicts: number;
    finalState: GameStateSnapshot;
    eventLog: Array<{ page: number; events: RealtimeEvent[] }>;
  }> {
    // Clear event logs
    await Promise.all(
      Array.from(this.eventTrackers.values()).map(tracker => tracker.clearEvents())
    );
    
    // Execute actions concurrently
    const startTime = Date.now();
    const results = await Promise.allSettled(
      actions.map((action, index) => action(this.pages[index % this.pages.length]))
    );
    
    const executionTimes = results.map(() => Date.now() - startTime);
    const conflicts = results.filter(r => r.status === 'rejected').length;
    
    // Wait for state to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get final state and event logs
    const finalState = await this.getGameState(this.pages[0]);
    const eventLog = await Promise.all(
      this.pages.map(async (page, index) => ({
        page: index,
        events: await this.eventTrackers.get(page)!.getEvents()
      }))
    );
    
    return {
      executionTimes,
      conflicts,
      finalState,
      eventLog
    };
  }
  
  /**
   * Helper to get game state
   */
  private async getGameState(page: Page): Promise<GameStateSnapshot> {
    // This would be imported from bingo-test-utils
    // Simplified implementation here
    const markedCells: GameStateSnapshot['markedCells'] = [];
    const gridSize = 5;
    
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const cell = page.getByTestId(`grid-cell-${row}-${col}`);
        const isMarked = await cell.getAttribute('data-marked') === 'true';
        
        if (isMarked) {
          const markedBy = await cell.getAttribute('data-marked-by') || '';
          const color = await cell.getAttribute('data-player-color') || '';
          
          markedCells.push({
            position: row * gridSize + col,
            row,
            col,
            markedBy: markedBy.split(',').filter(Boolean),
            color
          });
        }
      }
    }
    
    return {
      markedCells,
      players: [],
      gameStatus: 'active',
      version: 1,
      lastUpdate: new Date().toISOString()
    };
  }
}

// =============================================================================
// CONFLICT RESOLUTION TESTING
// =============================================================================

export class ConflictResolver {
  /**
   * Test last-write-wins conflict resolution
   */
  static async testLastWriteWins(
    pages: Page[],
    cellPosition: { row: number; col: number }
  ): Promise<{
    winner: string;
    attemptTimes: number[];
    resolutionTime: number;
  }> {
    const cellSelector = `grid-cell-${cellPosition.row}-${cellPosition.col}`;
    const attemptTimes: number[] = [];
    
    // All pages attempt to mark the same cell
    const startTime = Date.now();
    const markPromises = pages.map(async (page, index) => {
      const attemptTime = Date.now();
      await page.getByTestId(cellSelector).click();
      attemptTimes[index] = attemptTime - startTime;
    });
    
    await Promise.all(markPromises);
    
    // Wait for resolution
    await pages[0].waitForTimeout(500);
    
    // Check who won
    const winner = await pages[0]
      .getByTestId(cellSelector)
      .getAttribute('data-marked-by') || '';
    
    const resolutionTime = Date.now() - startTime;
    
    return {
      winner,
      attemptTimes,
      resolutionTime
    };
  }
  
  /**
   * Test optimistic UI updates with rollback
   */
  static async testOptimisticUpdates(
    page: Page,
    cellPosition: { row: number; col: number },
    simulateFailure: boolean = false
  ): Promise<{
    optimisticUpdateTime: number;
    rollbackTime?: number;
    finalState: 'marked' | 'unmarked';
  }> {
    const cellSelector = `grid-cell-${cellPosition.row}-${cellPosition.col}`;
    const cell = page.getByTestId(cellSelector);
    
    // Inject failure simulation if needed
    if (simulateFailure) {
      await page.route('**/api/sessions/*/events', route => {
        route.abort('failed');
      });
    }
    
    const startTime = Date.now();
    
    // Click cell (triggers optimistic update)
    await cell.click();
    
    // Check for immediate visual update
    const optimisticUpdateTime = Date.now() - startTime;
    const initialMarkedState = await cell.getAttribute('data-marked');
    
    // Wait for server response/rollback
    await page.waitForTimeout(2000);
    
    const finalMarkedState = await cell.getAttribute('data-marked');
    const rollbackOccurred = initialMarkedState !== finalMarkedState;
    
    return {
      optimisticUpdateTime,
      rollbackTime: rollbackOccurred ? Date.now() - startTime - optimisticUpdateTime : undefined,
      finalState: finalMarkedState === 'true' ? 'marked' : 'unmarked'
    };
  }
}

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

export class RealtimePerformanceMonitor {
  private page: Page;
  private metrics: Array<{
    operation: string;
    timestamp: number;
    duration: number;
    details: Record<string, any>;
  }> = [];
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Start monitoring performance
   */
  async startMonitoring(): Promise<void> {
    await this.page.evaluate(() => {
      const metrics: any[] = [];
      (window as any).__performanceMetrics = metrics;
      
      // Override fetch to track API calls
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const startTime = performance.now();
        const url = args[0].toString();
        
        try {
          const response = await originalFetch.apply(this, args);
          const duration = performance.now() - startTime;
          
          metrics.push({
            operation: 'api_call',
            timestamp: Date.now(),
            duration,
            details: {
              url,
              status: response.status,
              method: args[1]?.method || 'GET'
            }
          });
          
          return response;
        } catch (error) {
          const duration = performance.now() - startTime;
          metrics.push({
            operation: 'api_call_failed',
            timestamp: Date.now(),
            duration,
            details: {
              url,
              error: error.message
            }
          });
          throw error;
        }
      };
      
      // Track WebSocket message latency
      const originalWsSend = WebSocket.prototype.send;
      WebSocket.prototype.send = function(data: any) {
        const sendTime = Date.now();
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        parsed.__sendTime = sendTime;
        return originalWsSend.call(this, JSON.stringify(parsed));
      };
    });
  }
  
  /**
   * Get performance metrics
   */
  async getMetrics(): Promise<typeof this.metrics> {
    const browserMetrics = await this.page.evaluate(() => {
      return (window as any).__performanceMetrics || [];
    });
    
    return [...this.metrics, ...browserMetrics];
  }
  
  /**
   * Get metrics summary
   */
  async getMetricsSummary(): Promise<{
    apiCalls: {
      count: number;
      averageDuration: number;
      p95Duration: number;
      failures: number;
    };
    websocket: {
      messagesSent: number;
      messagesReceived: number;
      averageLatency: number;
    };
  }> {
    const metrics = await this.getMetrics();
    
    const apiCalls = metrics.filter(m => m.operation.startsWith('api_call'));
    const apiDurations = apiCalls
      .filter(m => m.operation === 'api_call')
      .map(m => m.duration)
      .sort((a, b) => a - b);
    
    const p95Index = Math.floor(apiDurations.length * 0.95);
    
    return {
      apiCalls: {
        count: apiCalls.length,
        averageDuration: apiDurations.reduce((a, b) => a + b, 0) / apiDurations.length || 0,
        p95Duration: apiDurations[p95Index] || 0,
        failures: apiCalls.filter(m => m.operation === 'api_call_failed').length
      },
      websocket: {
        messagesSent: metrics.filter(m => m.operation === 'ws_send').length,
        messagesReceived: metrics.filter(m => m.operation === 'ws_receive').length,
        averageLatency: 0 // Would need proper tracking for this
      }
    };
  }
}

// =============================================================================
// ERROR INJECTION UTILITIES
// =============================================================================

export class ErrorInjector {
  private page: Page;
  private originalFetch?: any;
  private injectedErrors: Map<string, any> = new Map();
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Simulate session corruption
   */
  async simulateSessionCorruption(): Promise<void> {
    await this.page.evaluate(() => {
      // Corrupt local session data
      const sessionData = localStorage.getItem('bingo-session');
      if (sessionData) {
        const corrupted = sessionData.slice(0, -10) + 'CORRUPTED';
        localStorage.setItem('bingo-session', corrupted);
      }
    });
  }
  
  /**
   * Simulate database partition/connection issues
   */
  async simulateDatabasePartition(duration: number = 5000): Promise<void> {
    await this.page.route('**/api/sessions/**', route => {
      route.abort('connectionfailed');
    });
    
    setTimeout(async () => {
      await this.page.unroute('**/api/sessions/**');
    }, duration);
  }
  
  /**
   * Simulate memory pressure
   */
  async simulateMemoryPressure(): Promise<void> {
    await this.page.evaluate(() => {
      // Create memory pressure by allocating large arrays
      const memoryPressure: any[] = [];
      for (let i = 0; i < 1000; i++) {
        memoryPressure.push(new Array(100000).fill(Math.random()));
      }
      (window as any).__memoryPressure = memoryPressure;
    });
  }
  
  /**
   * Inject specific API errors
   */
  async injectApiError(endpoint: string, errorCode: number, duration?: number): Promise<void> {
    await this.page.route(endpoint, route => {
      route.fulfill({
        status: errorCode,
        body: JSON.stringify({ 
          error: `Injected error ${errorCode}`,
          code: errorCode,
          timestamp: Date.now()
        })
      });
    });
    
    if (duration) {
      setTimeout(async () => {
        await this.page.unroute(endpoint);
      }, duration);
    }
  }
  
  /**
   * Simulate WebSocket connection issues
   */
  async simulateWebSocketFailure(): Promise<void> {
    await this.page.evaluate(() => {
      const originalWebSocket = window.WebSocket;
      (window as any).WebSocket = function(url: string) {
        const ws = new originalWebSocket(url);
        setTimeout(() => {
          ws.close(1006, 'Connection failed');
        }, 100);
        return ws;
      };
    });
  }
  
  /**
   * Clean up all injected errors
   */
  async cleanup(): Promise<void> {
    await this.page.unrouteAll();
    await this.page.evaluate(() => {
      // Clean up memory pressure
      delete (window as any).__memoryPressure;
      
      // Restore WebSocket if modified
      if ((window as any).__originalWebSocket) {
        window.WebSocket = (window as any).__originalWebSocket;
        delete (window as any).__originalWebSocket;
      }
    });
    
    this.injectedErrors.clear();
  }
}

// =============================================================================
// PERFORMANCE REGRESSION TESTING
// =============================================================================

export class PerformanceRegression {
  private page: Page;
  private baselines: Map<string, number> = new Map();
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Benchmark against stored baseline
   */
  async benchmarkAgainstBaseline(
    operation: () => Promise<void>,
    operationName: string,
    expectedBaselineMs?: number
  ): Promise<{
    current: number;
    baseline: number;
    regression: number;
    passed: boolean;
  }> {
    const startTime = performance.now();
    await operation();
    const current = performance.now() - startTime;
    
    const baseline = expectedBaselineMs || this.baselines.get(operationName) || current;
    const regression = ((current - baseline) / baseline) * 100;
    const passed = regression <= 20; // Allow 20% regression
    
    // Store baseline if not exists
    if (!this.baselines.has(operationName)) {
      this.baselines.set(operationName, current);
    }
    
    return { current, baseline, regression, passed };
  }
  
  /**
   * Detect memory leaks
   */
  async detectMemoryLeaks(
    operation: () => Promise<void>,
    iterations: number = 5
  ): Promise<{
    memoryGrowth: number;
    leakDetected: boolean;
    measurements: number[];
  }> {
    const measurements: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      // Force garbage collection if available
      await this.page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      // Measure memory before operation
      const beforeMemory = await this.getMemoryUsage();
      
      await operation();
      
      // Measure memory after operation
      const afterMemory = await this.getMemoryUsage();
      measurements.push(afterMemory - beforeMemory);
    }
    
    const avgGrowth = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const leakDetected = avgGrowth > 5 * 1024 * 1024; // 5MB threshold
    
    return {
      memoryGrowth: avgGrowth,
      leakDetected,
      measurements
    };
  }
  
  /**
   * Measure CPU usage
   */
  async measureCPUUsage(
    operation: () => Promise<void>,
    duration: number = 5000
  ): Promise<{
    averageCPU: number;
    peakCPU: number;
    samples: number[];
  }> {
    const samples: number[] = [];
    const interval = 100; // Sample every 100ms
    
    // Start CPU monitoring
    const startTime = Date.now();
    const cpuMonitor = setInterval(async () => {
      const cpuUsage = await this.getCPUUsage();
      samples.push(cpuUsage);
    }, interval);
    
    // Run operation
    await operation();
    
    // Wait for full duration
    while (Date.now() - startTime < duration) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    clearInterval(cpuMonitor);
    
    const averageCPU = samples.reduce((a, b) => a + b, 0) / samples.length;
    const peakCPU = Math.max(...samples);
    
    return { averageCPU, peakCPU, samples };
  }
  
  /**
   * Helper to get memory usage
   */
  private async getMemoryUsage(): Promise<number> {
    return await this.page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
  }
  
  /**
   * Helper to get CPU usage (approximation)
   */
  private async getCPUUsage(): Promise<number> {
    return await this.page.evaluate(() => {
      const start = performance.now();
      let count = 0;
      while (performance.now() - start < 10) {
        count++;
      }
      // Normalize to 0-100 scale (very rough approximation)
      return Math.min(100, count / 10000);
    });
  }
}

// =============================================================================
// STRESS TESTING UTILITIES
// =============================================================================

export class StressTester {
  /**
   * Simulate rapid cell marking
   */
  static async rapidCellMarking(
    page: Page,
    options: {
      cellsPerSecond: number;
      duration: number;
      pattern?: 'sequential' | 'random' | 'diagonal';
    }
  ): Promise<{
    totalMarked: number;
    successRate: number;
    errors: string[];
  }> {
    const { cellsPerSecond, duration, pattern = 'random' } = options;
    const interval = 1000 / cellsPerSecond;
    const gridSize = 5; // Default
    const totalCells = gridSize * gridSize;
    
    let marked = 0;
    let errors: string[] = [];
    const startTime = Date.now();
    
    while (Date.now() - startTime < duration) {
      try {
        let cellIndex: number;
        
        switch (pattern) {
          case 'sequential':
            cellIndex = marked % totalCells;
            break;
          case 'diagonal':
            const diagIndex = marked % gridSize;
            cellIndex = diagIndex * gridSize + diagIndex;
            break;
          case 'random':
          default:
            cellIndex = Math.floor(Math.random() * totalCells);
        }
        
        const row = Math.floor(cellIndex / gridSize);
        const col = cellIndex % gridSize;
        
        await page.getByTestId(`grid-cell-${row}-${col}`).click();
        marked++;
      } catch (error) {
        errors.push(error.message);
      }
      
      await page.waitForTimeout(interval);
    }
    
    const expectedMarks = Math.floor(duration / interval);
    const successRate = marked / expectedMarks;
    
    return {
      totalMarked: marked,
      successRate,
      errors
    };
  }
  
  /**
   * Simulate player churn (joining/leaving)
   */
  static async simulatePlayerChurn(
    hostPage: Page,
    context: BrowserContext,
    options: {
      maxPlayers: number;
      churnRate: number; // players per minute
      duration: number;
      sessionCode: string;
    }
  ): Promise<{
    totalJoins: number;
    totalLeaves: number;
    peakConcurrent: number;
    errors: string[];
  }> {
    const { maxPlayers, churnRate, duration, sessionCode } = options;
    const churnInterval = 60000 / churnRate; // milliseconds between churn events
    
    const activePlayers: Page[] = [];
    let totalJoins = 0;
    let totalLeaves = 0;
    let peakConcurrent = 0;
    const errors: string[] = [];
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < duration) {
      try {
        // Decide whether to add or remove a player
        const shouldAdd = activePlayers.length < maxPlayers && 
                         (activePlayers.length === 0 || Math.random() > 0.5);
        
        if (shouldAdd) {
          // Add a player
          const newPlayer = await context.newPage();
          await newPlayer.goto('/play-area/bingo');
          await newPlayer.getByRole('button', { name: /join.*game/i }).click();
          await newPlayer.getByLabel(/session code/i).fill(sessionCode);
          await newPlayer.getByRole('button', { name: /join/i }).click();
          
          activePlayers.push(newPlayer);
          totalJoins++;
          peakConcurrent = Math.max(peakConcurrent, activePlayers.length);
        } else if (activePlayers.length > 0) {
          // Remove a player
          const playerIndex = Math.floor(Math.random() * activePlayers.length);
          const player = activePlayers.splice(playerIndex, 1)[0];
          await player.close();
          totalLeaves++;
        }
      } catch (error) {
        errors.push(error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, churnInterval));
    }
    
    // Clean up remaining players
    for (const player of activePlayers) {
      await player.close();
    }
    
    return {
      totalJoins,
      totalLeaves,
      peakConcurrent,
      errors
    };
  }
}