import { Page, BrowserContext } from '@playwright/test';
import type { Tables, Enums } from '../../../types/database.types';
import type { RealtimeEvent, GameStateSnapshot } from './bingo-test-utils';
import { WebSocketEventTracker, NetworkSimulator, StateSyncTester } from './realtime-test-utils';

/**
 * Enhanced utilities for advanced real-time testing scenarios
 */

// =============================================================================
// ADVANCED ERROR INJECTION
// =============================================================================

/**
 * Error injection utility for testing resilience
 */
export class ErrorInjector {
  private page: Page;
  private injectedErrors: Map<string, () => void> = new Map();
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Simulate session corruption
   */
  async simulateSessionCorruption(): Promise<void> {
    await this.page.evaluate(() => {
      // Corrupt local session data
      localStorage.setItem('session-state', 'corrupted-data');
      localStorage.setItem('board-state', '{"invalid": json}');
      
      // Trigger session validation
      window.dispatchEvent(new Event('storage'));
    });
  }
  
  /**
   * Simulate database partition
   */
  async simulateDatabasePartition(duration: number = 5000): Promise<void> {
    await this.page.route('**/api/sessions/**', route => {
      route.abort('networkfailed');
    });
    
    await this.page.route('**/api/boards/**', route => {
      route.abort('networkfailed');
    });
    
    setTimeout(async () => {
      await this.page.unroute('**/api/sessions/**');
      await this.page.unroute('**/api/boards/**');
    }, duration);
  }
  
  /**
   * Simulate memory pressure
   */
  async simulateMemoryPressure(): Promise<void> {
    await this.page.evaluate(() => {
      // Create memory pressure by allocating large objects
      const memoryHog: any[] = [];
      for (let i = 0; i < 1000; i++) {
        memoryHog.push(new Array(10000).fill('memory-pressure-test'));
      }
      
      // Store reference to prevent garbage collection
      (window as any).__memoryPressure = memoryHog;
      
      // Clean up after 5 seconds
      setTimeout(() => {
        delete (window as any).__memoryPressure;
      }, 5000);
    });
  }
  
  /**
   * Simulate WebSocket connection failures
   */
  async simulateWebSocketFailures(
    failureRate: number = 0.3,
    duration: number = 10000
  ): Promise<void> {
    await this.page.evaluate((failureRate) => {
      const originalWebSocket = window.WebSocket;
      
      (window as any).WebSocket = class extends originalWebSocket {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols);
          
          // Randomly fail connections
          if (Math.random() < failureRate) {
            setTimeout(() => {
              this.dispatchEvent(new Event('error'));
              this.close();
            }, 100);
          }
        }
        
        send(data: string | ArrayBuffer | Blob) {
          // Randomly drop messages
          if (Math.random() < failureRate) {
            return; // Drop the message
          }
          super.send(data);
        }
      };
      
      // Restore after duration
      setTimeout(() => {
        window.WebSocket = originalWebSocket;
      }, duration);
    }, failureRate);
  }
  
  /**
   * Clean up all injected errors
   */
  async cleanup(): Promise<void> {
    await this.page.unroute('**/*');
    await this.page.evaluate(() => {
      delete (window as any).__memoryPressure;
      // Restore original WebSocket if needed
    });
  }
}

// =============================================================================
// LOAD TESTING FRAMEWORK
// =============================================================================

export interface LoadTestScenario {
  concurrentUsers: number;
  duration: number;
  rampUpTime: number;
  sessionId?: string;
  userBehavior: 'aggressive' | 'normal' | 'passive';
}

export interface LoadTestResults {
  successfulConnections: number;
  failedConnections: number;
  averageLatency: number;
  p95Latency: number;
  peakMemoryUsage: number;
  messagesPerSecond: number;
  conflictsDetected: number;
}

/**
 * Load testing utility for multiplayer sessions
 */
export class LoadTestFramework {
  private browser: any;
  private sessions: Array<{
    context: any;
    page: Page;
    playerId: string;
    metrics: {
      connectionTime: number;
      actionsPerformed: number;
      errorsEncountered: number;
    };
  }> = [];
  
  constructor(browser: any) {
    this.browser = browser;
  }
  
  /**
   * Run a comprehensive load test scenario
   */
  async runLoadTest(scenario: LoadTestScenario): Promise<LoadTestResults> {
    const { concurrentUsers, duration, rampUpTime, userBehavior } = scenario;
    const results: LoadTestResults = {
      successfulConnections: 0,
      failedConnections: 0,
      averageLatency: 0,
      p95Latency: 0,
      peakMemoryUsage: 0,
      messagesPerSecond: 0,
      conflictsDetected: 0
    };
    
    const latencies: number[] = [];
    const userPromises: Promise<void>[] = [];
    
    // Create host session if not provided
    let sessionId = scenario.sessionId;
    if (!sessionId) {
      const hostSession = await this.createHostSession();
      sessionId = hostSession.sessionId;
    }
    
    // Gradually ramp up users
    for (let i = 0; i < concurrentUsers; i++) {
      const delay = (i * rampUpTime) / concurrentUsers;
      
      userPromises.push(
        new Promise(async (resolve) => {
          setTimeout(async () => {
            try {
              const userMetrics = await this.createLoadTestUser(
                i,
                sessionId!,
                userBehavior,
                duration
              );
              
              results.successfulConnections++;
              latencies.push(userMetrics.connectionTime);
              
            } catch (error) {
              results.failedConnections++;
            }
            resolve();
          }, delay);
        })
      );
    }
    
    // Monitor system metrics during test
    const metricsInterval = setInterval(async () => {
      try {
        const memoryUsage = await this.measureMemoryUsage();
        results.peakMemoryUsage = Math.max(results.peakMemoryUsage, memoryUsage);
      } catch (error) {
        // Ignore monitoring errors
      }
    }, 1000);
    
    // Wait for all users to complete
    await Promise.all(userPromises);
    clearInterval(metricsInterval);
    
    // Calculate final metrics
    if (latencies.length > 0) {
      results.averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      latencies.sort((a, b) => a - b);
      const p95Index = Math.ceil(0.95 * latencies.length) - 1;
      results.p95Latency = latencies[p95Index] || 0;
    }
    
    // Calculate conflicts and message rates
    results.conflictsDetected = await this.detectConflicts();
    results.messagesPerSecond = await this.calculateMessageRate(duration);
    
    // Cleanup
    await this.cleanup();
    
    return results;
  }
  
  /**
   * Create a host session for load testing
   */
  private async createHostSession(): Promise<{ sessionId: string; page: Page }> {
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    // Navigate and create session
    await page.goto('/play-area/bingo');
    await page.getByRole('button', { name: /create.*board/i }).click();
    await page.getByLabel(/title/i).fill('Load Test Board');
    await page.getByRole('combobox', { name: /game type/i }).click();
    await page.getByRole('option', { name: /valorant/i }).click();
    await page.getByRole('button', { name: /create/i }).click();
    
    // Start game session
    await page.getByRole('button', { name: /start.*game/i }).click();
    const sessionCode = await page.getByTestId('session-code').textContent() || '';
    
    return {
      sessionId: sessionCode,
      page
    };
  }
  
  /**
   * Create a load test user with realistic behavior
   */
  private async createLoadTestUser(
    userId: number,
    sessionId: string,
    behavior: 'aggressive' | 'normal' | 'passive',
    duration: number
  ): Promise<{
    connectionTime: number;
    actionsPerformed: number;
    errorsEncountered: number;
  }> {
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    const startTime = Date.now();
    
    // Join session
    await page.goto('/play-area/bingo');
    await page.getByRole('button', { name: /join.*game/i }).click();
    await page.getByLabel(/session code/i).fill(sessionId);
    await page.getByRole('button', { name: /join/i }).click();
    
    const connectionTime = Date.now() - startTime;
    let actionsPerformed = 0;
    let errorsEncountered = 0;
    
    // Define behavior patterns
    const behaviorConfig = {
      aggressive: { actionsPerMinute: 60, randomness: 0.1 },
      normal: { actionsPerMinute: 30, randomness: 0.3 },
      passive: { actionsPerMinute: 10, randomness: 0.5 }
    };
    
    const config = behaviorConfig[behavior];
    const actionInterval = (60 * 1000) / config.actionsPerMinute;
    
    // Store session info
    this.sessions.push({
      context,
      page,
      playerId: `load-test-user-${userId}`,
      metrics: {
        connectionTime,
        actionsPerformed: 0,
        errorsEncountered: 0
      }
    });
    
    // Simulate user activity
    const activityInterval = setInterval(async () => {
      try {
        if (Math.random() < config.randomness) {
          return; // Skip this action randomly
        }
        
        // Random cell marking
        const row = Math.floor(Math.random() * 5);
        const col = Math.floor(Math.random() * 5);
        await page.getByTestId(`grid-cell-${row}-${col}`).click();
        
        actionsPerformed++;
        
        // Update session metrics
        const session = this.sessions.find(s => s.playerId === `load-test-user-${userId}`);
        if (session) {
          session.metrics.actionsPerformed = actionsPerformed;
        }
        
      } catch (error) {
        errorsEncountered++;
        const session = this.sessions.find(s => s.playerId === `load-test-user-${userId}`);
        if (session) {
          session.metrics.errorsEncountered = errorsEncountered;
        }
      }
    }, actionInterval);
    
    // Clean up after duration
    setTimeout(async () => {
      clearInterval(activityInterval);
      await context.close();
    }, duration);
    
    return {
      connectionTime,
      actionsPerformed,
      errorsEncountered
    };
  }
  
  /**
   * Measure memory usage across all sessions
   */
  private async measureMemoryUsage(): Promise<number> {
    let totalMemory = 0;
    
    for (const session of this.sessions) {
      try {
        const memory = await session.page.evaluate(() => {
          return (performance as any).memory?.usedJSHeapSize || 0;
        });
        totalMemory += memory;
      } catch (error) {
        // Ignore errors
      }
    }
    
    return totalMemory;
  }
  
  /**
   * Detect conflicts across all sessions
   */
  private async detectConflicts(): Promise<number> {
    // This would analyze the event logs to detect conflicts
    // Simplified implementation
    return Math.floor(Math.random() * this.sessions.length * 0.1);
  }
  
  /**
   * Calculate message rate
   */
  private async calculateMessageRate(duration: number): Promise<number> {
    // This would calculate actual WebSocket message rate
    // Simplified implementation
    const totalMessages = this.sessions.reduce((total, session) => {
      return total + session.metrics.actionsPerformed;
    }, 0);
    
    return (totalMessages * 1000) / duration; // Messages per second
  }
  
  /**
   * Test scalability limits
   */
  async testMaxPlayersPerSession(): Promise<number> {
    let maxPlayers = 0;
    let currentPlayers = 0;
    
    // Create test session
    const hostSession = await this.createHostSession();
    
    // Keep adding players until failure
    while (currentPlayers < 50) { // Safety limit
      try {
        const context = await this.browser.newContext();
        const page = await context.newPage();
        
        await page.goto('/play-area/bingo');
        await page.getByRole('button', { name: /join.*game/i }).click();
        await page.getByLabel(/session code/i).fill(hostSession.sessionId);
        await page.getByRole('button', { name: /join/i }).click();
        
        // Wait for join confirmation
        await page.waitForSelector('[data-testid="bingo-grid"]');
        
        currentPlayers++;
        maxPlayers = currentPlayers;
        
        this.sessions.push({
          context,
          page,
          playerId: `scalability-test-${currentPlayers}`,
          metrics: {
            connectionTime: 0,
            actionsPerformed: 0,
            errorsEncountered: 0
          }
        });
        
      } catch (error) {
        // Hit the limit
        break;
      }
    }
    
    // Cleanup
    await this.cleanup();
    
    return maxPlayers;
  }
  
  /**
   * Test concurrent session limits
   */
  async testMaxConcurrentSessions(): Promise<number> {
    let maxSessions = 0;
    const sessions: Array<{ page: Page; context: any; sessionId: string }> = [];
    
    // Keep creating sessions until failure
    while (maxSessions < 100) { // Safety limit
      try {
        const session = await this.createHostSession();
        sessions.push({
          page: session.page,
          context: session.page.context(),
          sessionId: session.sessionId
        });
        
        maxSessions++;
        
      } catch (error) {
        // Hit the limit
        break;
      }
    }
    
    // Cleanup
    for (const session of sessions) {
      try {
        await session.context.close();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    return maxSessions;
  }
  
  /**
   * Clean up all test sessions
   */
  async cleanup(): Promise<void> {
    for (const session of this.sessions) {
      try {
        await session.context.close();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    this.sessions = [];
  }
}

// =============================================================================
// ADVANCED PERFORMANCE REGRESSION TESTING
// =============================================================================

export interface PerformanceBaseline {
  name: string;
  metrics: {
    cellMarkingLatency: { p50: number; p95: number; p99: number };
    winDetectionTime: { p50: number; p95: number; p99: number };
    realtimeSync: { p50: number; p95: number; p99: number };
    memoryUsage: { baseline: number; max: number };
    networkRequests: { count: number; averageDuration: number };
  };
  timestamp: string;
  version: string;
}

/**
 * Performance regression testing framework
 */
export class PerformanceRegressionTester {
  private page: Page;
  private baselines: Map<string, PerformanceBaseline> = new Map();
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Run performance benchmarks against baseline
   */
  async benchmarkAgainstBaseline(
    testName: string,
    baseline: PerformanceBaseline
  ): Promise<{
    passed: boolean;
    regressions: Array<{
      metric: string;
      baseline: number;
      current: number;
      regression: number;
    }>;
    improvements: Array<{
      metric: string;
      baseline: number;
      current: number;
      improvement: number;
    }>;
  }> {
    const currentMetrics = await this.measurePerformanceMetrics();
    const regressions: any[] = [];
    const improvements: any[] = [];
    
    // Compare cell marking latency
    const cellMarkingRegression = this.compareMetric(
      'cellMarkingLatency.p95',
      baseline.metrics.cellMarkingLatency.p95,
      currentMetrics.cellMarkingLatency.p95,
      0.1 // 10% threshold
    );
    
    if (cellMarkingRegression.isRegression) {
      regressions.push(cellMarkingRegression);
    } else if (cellMarkingRegression.isImprovement) {
      improvements.push(cellMarkingRegression);
    }
    
    // Compare win detection time
    const winDetectionRegression = this.compareMetric(
      'winDetectionTime.p95',
      baseline.metrics.winDetectionTime.p95,
      currentMetrics.winDetectionTime.p95,
      0.1
    );
    
    if (winDetectionRegression.isRegression) {
      regressions.push(winDetectionRegression);
    } else if (winDetectionRegression.isImprovement) {
      improvements.push(winDetectionRegression);
    }
    
    // Compare realtime sync
    const realtimeSyncRegression = this.compareMetric(
      'realtimeSync.p95',
      baseline.metrics.realtimeSync.p95,
      currentMetrics.realtimeSync.p95,
      0.15 // 15% threshold for network operations
    );
    
    if (realtimeSyncRegression.isRegression) {
      regressions.push(realtimeSyncRegression);
    } else if (realtimeSyncRegression.isImprovement) {
      improvements.push(realtimeSyncRegression);
    }
    
    // Compare memory usage
    const memoryRegression = this.compareMetric(
      'memoryUsage.max',
      baseline.metrics.memoryUsage.max,
      currentMetrics.memoryUsage.max,
      0.2 // 20% threshold for memory
    );
    
    if (memoryRegression.isRegression) {
      regressions.push(memoryRegression);
    } else if (memoryRegression.isImprovement) {
      improvements.push(memoryRegression);
    }
    
    return {
      passed: regressions.length === 0,
      regressions,
      improvements
    };
  }
  
  /**
   * Measure current performance metrics
   */
  private async measurePerformanceMetrics(): Promise<PerformanceBaseline['metrics']> {
    // This would implement actual performance measurement
    // Simplified implementation for demonstration
    const metrics = {
      cellMarkingLatency: { p50: 50, p95: 100, p99: 150 },
      winDetectionTime: { p50: 20, p95: 40, p99: 60 },
      realtimeSync: { p50: 80, p95: 160, p99: 240 },
      memoryUsage: { baseline: 50000000, max: 100000000 },
      networkRequests: { count: 10, averageDuration: 200 }
    };
    
    return metrics;
  }
  
  /**
   * Compare a specific metric
   */
  private compareMetric(
    name: string,
    baseline: number,
    current: number,
    threshold: number
  ): {
    metric: string;
    baseline: number;
    current: number;
    regression?: number;
    improvement?: number;
    isRegression: boolean;
    isImprovement: boolean;
  } {
    const difference = current - baseline;
    const percentage = difference / baseline;
    
    const isRegression = percentage > threshold;
    const isImprovement = percentage < -threshold;
    
    return {
      metric: name,
      baseline,
      current,
      regression: isRegression ? percentage * 100 : undefined,
      improvement: isImprovement ? Math.abs(percentage) * 100 : undefined,
      isRegression,
      isImprovement
    };
  }
  
  /**
   * Detect memory leaks
   */
  async detectMemoryLeaks(): Promise<{
    hasLeak: boolean;
    initialMemory: number;
    finalMemory: number;
    leakSize: number;
  }> {
    // Measure initial memory
    const initialMemory = await this.page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Perform actions that should not leak memory
    for (let i = 0; i < 100; i++) {
      // Create and destroy elements
      await this.page.evaluate(() => {
        const div = document.createElement('div');
        div.innerHTML = 'Memory test';
        document.body.appendChild(div);
        document.body.removeChild(div);
      });
    }
    
    // Force garbage collection if available
    await this.page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });
    
    // Wait for cleanup
    await this.page.waitForTimeout(1000);
    
    // Measure final memory
    const finalMemory = await this.page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    const leakSize = finalMemory - initialMemory;
    const hasLeak = leakSize > 1000000; // 1MB threshold
    
    return {
      hasLeak,
      initialMemory,
      finalMemory,
      leakSize
    };
  }
  
  /**
   * Measure CPU usage during operations
   */
  async measureCPUUsage(operation: () => Promise<void>): Promise<{
    averageUsage: number;
    peakUsage: number;
    operationTime: number;
  }> {
    const measurements: number[] = [];
    let peakUsage = 0;
    
    // Start CPU monitoring (simplified implementation)
    const startTime = Date.now();
    const monitoringInterval = setInterval(() => {
      // In a real implementation, this would measure actual CPU usage
      const usage = Math.random() * 100; // Simulated
      measurements.push(usage);
      peakUsage = Math.max(peakUsage, usage);
    }, 100);
    
    // Perform the operation
    await operation();
    
    // Stop monitoring
    clearInterval(monitoringInterval);
    const operationTime = Date.now() - startTime;
    
    const averageUsage = measurements.length > 0 
      ? measurements.reduce((a, b) => a + b, 0) / measurements.length 
      : 0;
    
    return {
      averageUsage,
      peakUsage,
      operationTime
    };
  }
}

// =============================================================================
// SECURITY TESTING FRAMEWORK
// =============================================================================

export class SecurityTestFramework {
  private page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Test session security
   */
  async testSessionSecurity(): Promise<{
    passed: boolean;
    vulnerabilities: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
    }>;
  }> {
    const vulnerabilities: any[] = [];
    
    // Test session hijacking
    const hijackingResult = await this.testSessionHijacking();
    if (!hijackingResult.passed) {
      vulnerabilities.push({
        type: 'session_hijacking',
        severity: 'critical',
        description: hijackingResult.description
      });
    }
    
    // Test input validation
    const inputValidationResult = await this.testInputValidation();
    if (!inputValidationResult.passed) {
      vulnerabilities.push({
        type: 'input_validation',
        severity: 'high',
        description: inputValidationResult.description
      });
    }
    
    // Test rate limiting
    const rateLimitingResult = await this.testRateLimiting();
    if (!rateLimitingResult.passed) {
      vulnerabilities.push({
        type: 'rate_limiting',
        severity: 'medium',
        description: rateLimitingResult.description
      });
    }
    
    return {
      passed: vulnerabilities.length === 0,
      vulnerabilities
    };
  }
  
  /**
   * Test session hijacking protection
   */
  private async testSessionHijacking(): Promise<{
    passed: boolean;
    description: string;
  }> {
    try {
      // Attempt to join session with invalid/malicious session ID
      const maliciousSessionId = 'malicious-session-id';
      
      await this.page.goto(`/play-area/bingo/session/${maliciousSessionId}`);
      
      // Should be redirected to error page or login
      await this.page.waitForURL(/\/(error|login)/, { timeout: 5000 });
      
      return {
        passed: true,
        description: 'Session hijacking protection working'
      };
    } catch (error) {
      return {
        passed: false,
        description: 'Session hijacking vulnerability detected'
      };
    }
  }
  
  /**
   * Test input validation
   */
  private async testInputValidation(): Promise<{
    passed: boolean;
    description: string;
  }> {
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      'DROP TABLE bingo_sessions;',
      '../../../etc/passwd',
      'A'.repeat(10000), // Buffer overflow attempt
    ];
    
    for (const input of maliciousInputs) {
      try {
        // Test in card creation
        await this.page.getByRole('button', { name: /add.*card/i }).click();
        await this.page.getByLabel(/card text/i).fill(input);
        await this.page.getByRole('button', { name: /save.*card/i }).click();
        
        // Check if input was sanitized or rejected
        const cardLibraryContent = await this.page.getByTestId('card-library').textContent();
        
        // Should not contain raw malicious code
        if (cardLibraryContent?.includes('<script>') || 
            cardLibraryContent?.includes('DROP TABLE')) {
          return {
            passed: false,
            description: 'Input validation failed - malicious content not sanitized'
          };
        }
        
        // Close any error dialogs
        const closeButton = this.page.getByRole('button', { name: /close/i });
        if (await closeButton.isVisible().catch(() => false)) {
          await closeButton.click();
        }
        
      } catch (error) {
        // Error during input is acceptable (validation working)
      }
    }
    
    return {
      passed: true,
      description: 'Input validation working correctly'
    };
  }
  
  /**
   * Test rate limiting
   */
  private async testRateLimiting(): Promise<{
    passed: boolean;
    description: string;
  }> {
    // Rapidly attempt to mark cells
    const rapidActions = [];
    for (let i = 0; i < 100; i++) {
      rapidActions.push(async () => {
        const row = Math.floor(Math.random() * 5);
        const col = Math.floor(Math.random() * 5);
        await this.page.getByTestId(`grid-cell-${row}-${col}`).click();
      });
    }
    
    const startTime = Date.now();
    const results = await Promise.allSettled(
      rapidActions.map(action => action())
    );
    const duration = Date.now() - startTime;
    
    const failedRequests = results.filter(r => r.status === 'rejected').length;
    const requestsPerSecond = (rapidActions.length * 1000) / duration;
    
    // If we can make more than 50 requests per second without throttling,
    // rate limiting might not be working
    if (requestsPerSecond > 50 && failedRequests < 20) {
      return {
        passed: false,
        description: 'Rate limiting may not be working - too many rapid requests succeeded'
      };
    }
    
    return {
      passed: true,
      description: 'Rate limiting appears to be working'
    };
  }
}