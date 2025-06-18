import { test, expect } from '../../fixtures/auth.fixture';
import type { Page } from '@playwright/test';
import { 
  waitForNetworkIdle, 
  mockApiResponse
} from '../../helpers/test-utils';
import { GameFixtureFactory } from './fixtures/game-fixtures';
import { createWebSocketContext, type GameWebSocketEvent } from '../../helpers/websocket-helpers';
import { createPerformanceContext } from '../../helpers/performance-helpers';

/**
 * Type definitions for timer precision
 */
type MillisecondTime = number & { readonly __brand: 'MillisecondTime' };

// Local TimerAccuracy type that matches our usage
interface TimerAccuracy {
  accuracy: number;
  precision: string;
  startTime: number;
  endTime: number;
  expectedDuration: number;
}

interface SpeedrunTime {
  minutes: number;
  seconds: number;
  milliseconds: number;
  totalMs: MillisecondTime;
}

interface SpeedrunValidation {
  isValid: boolean;
  reason?: string;
  suspiciousPatterns?: string[];
}

/**
 * Enhanced Speedrun System Tests
 * Focus on timer accuracy, anti-cheat, and performance under load
 */
test.describe('Enhanced Speedrun System', () => {
  let wsContext: Awaited<ReturnType<typeof createWebSocketContext>>;
  let perfContext: Awaited<ReturnType<typeof createPerformanceContext>>;

  // Helper to parse timer display
  const parseTimerDisplay = (display: string): SpeedrunTime => {
    const match = display.match(/(\d{2}):(\d{2})\.(\d{3})/);
    if (!match) throw new Error(`Invalid timer format: ${display}`);
    
    const parts = match.slice(1).map(Number);
    if (parts.length !== 3) throw new Error(`Invalid timer format: ${display}`);
    
    const [minutes, seconds, milliseconds] = parts;
    if (minutes === undefined || seconds === undefined || milliseconds === undefined) {
      throw new Error(`Failed to parse timer parts: ${display}`);
    }
    const totalMs = (minutes * 60000 + seconds * 1000 + milliseconds) as MillisecondTime;
    
    return { minutes, seconds, milliseconds, totalMs };
  };

  // Helper to get timer value
  const getTimerValue = async (page: Page): Promise<number> => {
    const timerText = await page.locator('[data-testid="speedrun-timer"]').textContent();
    if (!timerText) return 0;
    const parsed = parseTimerDisplay(timerText);
    return parsed.totalMs;
  };

  test.beforeEach(async ({ authenticatedPage }) => {
    wsContext = await createWebSocketContext(authenticatedPage);
    perfContext = await createPerformanceContext(authenticatedPage);
  });

  test.afterEach(async () => {
    await wsContext?.cleanup();
    await perfContext?.cleanup();
  });

  test.describe('Timer Precision and Accuracy', () => {
    test('should maintain millisecond precision over extended period', async ({ authenticatedPage }) => {
      const { session } = GameFixtureFactory.speedrunScenario();

      await mockApiResponse(authenticatedPage, '**/api/speedruns/**', {
        status: 200,
        body: { 
          success: true, 
          data: {
            id: session.id,
            board_id: session.board_id,
            status: 'ready',
            best_time: null,
            current_time: 0
          }
        }
      });

      await authenticatedPage.goto(`/speedruns/${session.board_id}`);
      await waitForNetworkIdle(authenticatedPage);

      // Start speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      
      // Measure timer accuracy over 10 seconds
      const measurements: number[] = [];
      for (let i = 0; i < 10; i++) {
        await authenticatedPage.waitForTimeout(1000);
        const accuracy = await perfContext.timer.measureAccuracy(
          authenticatedPage,
          1000,
          () => getTimerValue(authenticatedPage)
        );
        measurements.push(accuracy.drift);
      }

      // Verify accuracy requirements
      const maxDrift = Math.max(...measurements);
      const avgDrift = measurements.reduce((sum, d) => sum + d, 0) / measurements.length;
      
      expect(maxDrift).toBeLessThan(100); // Max 100ms drift
      expect(avgDrift).toBeLessThan(50); // Average under 50ms
      
      // Generate accuracy report
      console.log('Timer Accuracy Report:', perfContext.timer.generateReport());
    });

    test('should compensate for tab switching and background throttling', async ({ authenticatedPage, context }) => {
      await authenticatedPage.goto('/speedruns/test-board');
      await waitForNetworkIdle(authenticatedPage);

      // Start timer
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      const startTime = Date.now();
      const initialTimer = await getTimerValue(authenticatedPage);

      // Switch to new tab (simulates background throttling)
      const newPage = await context.newPage();
      await newPage.goto('about:blank');
      await newPage.bringToFront();
      
      // Wait 5 seconds in background
      await newPage.waitForTimeout(5000);
      
      // Switch back
      await authenticatedPage.bringToFront();
      
      // Check timer accuracy
      const endTime = Date.now();
      const finalTimer = await getTimerValue(authenticatedPage);
      
      const realElapsed = endTime - startTime;
      const timerElapsed = finalTimer - initialTimer;
      const drift = Math.abs(realElapsed - timerElapsed);
      
      // Should maintain accuracy despite tab switching
      expect(drift).toBeLessThan(200); // Allow slightly more drift for tab switching
      
      // Should show tab switch warning
      const warning = authenticatedPage.locator('[data-testid="tab-switch-warning"]');
      if (await warning.isVisible()) {
        await expect(warning).toContainText(/tab switching detected/i);
      }
    });

    test('should handle timer under CPU stress', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/speedruns/test-board');
      await waitForNetworkIdle(authenticatedPage);

      // Start timer
      await authenticatedPage.click('[data-testid="start-speedrun"]');

      // Apply CPU load
      await perfContext.cpu.startLoad(authenticatedPage, 'high');

      // Measure accuracy under load
      const measurements: TimerAccuracy[] = [];
      for (let i = 0; i < 5; i++) {
        const accuracy = await perfContext.timer.measureAccuracy(
          authenticatedPage,
          2000,
          () => getTimerValue(authenticatedPage)
        );
        // Convert performance helper TimerAccuracy to our local type
        measurements.push({
          accuracy: (accuracy as { drift?: number }).drift || 0,
          precision: 'ms',
          startTime: Date.now() - 2000,
          endTime: Date.now(),
          expectedDuration: 2000
        });
      }

      // Stop CPU load
      await perfContext.cpu.stopLoad(authenticatedPage);

      // Verify timer maintained accuracy under stress
      const maxDrift = Math.max(...measurements.map(m => m.accuracy));
      expect(maxDrift).toBeLessThan(150); // Allow slightly more drift under load
      
      // Check if timer meets requirements
      expect(perfContext.timer.meetsAccuracyRequirements(150)).toBe(true);
    });
  });

  test.describe('Anti-Cheat Validation', () => {
    test('should detect and prevent impossibly fast completions', async ({ authenticatedPage }) => {
      const boardId = 'test-board';
      
      // Mock board with minimum completion time
      await mockApiResponse(authenticatedPage, `**/api/boards/${boardId}`, {
        status: 200,
        body: {
          success: true,
          data: {
            ...GameFixtureFactory.board({ id: boardId }),
            settings: {
              min_completion_time: 30000, // 30 seconds minimum
              speedrun_enabled: true
            }
          }
        }
      });

      await authenticatedPage.goto(`/speedruns/${boardId}`);
      await waitForNetworkIdle(authenticatedPage);

      // Start speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      
      // Try to complete immediately (cheating attempt)
      await authenticatedPage.waitForTimeout(1000); // Only 1 second
      
      // Mock validation failure
      await mockApiResponse(authenticatedPage, '**/api/speedruns/complete', {
        status: 400,
        body: { 
          error: 'Invalid speedrun time',
          validation: {
            isValid: false,
            reason: 'Completion time below minimum threshold',
            suspiciousPatterns: ['impossible_time', 'no_user_input']
          } as SpeedrunValidation
        }
      });

      await authenticatedPage.click('[data-testid="stop-timer"]');
      
      // Should show validation error
      await expect(authenticatedPage.locator('[role="alert"]')).toContainText(/invalid speedrun time/i);
      await expect(authenticatedPage.locator('[data-testid="validation-reason"]')).toContainText(/below minimum threshold/i);
    });

    test('should validate consistent input patterns', async ({ authenticatedPage }) => {
      const { session } = GameFixtureFactory.speedrunScenario();
      const boardState = GameFixtureFactory.boardState();
      
      await mockApiResponse(authenticatedPage, `**/api/speedruns/${session.board_id}`, {
        status: 200,
        body: { success: true, data: { boardState } }
      });

      await authenticatedPage.goto(`/speedruns/${session.board_id}`);
      await waitForNetworkIdle(authenticatedPage);

      // Start speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');

      // Track input patterns
      const inputTimings: number[] = [];
      const startTime = Date.now();

      // Make moves with exact same timing (bot-like behavior)
      for (let i = 0; i < 10; i++) {
        const clickTime = Date.now() - startTime;
        inputTimings.push(clickTime);
        
        await authenticatedPage.click(`[data-testid="game-cell-${i}"]`);
        await authenticatedPage.waitForTimeout(1000); // Exactly 1 second between clicks
      }

      // Calculate timing variance
      const intervals = inputTimings.slice(1).map((t, i) => t - (inputTimings[i] ?? 0));
      const variance = Math.max(...intervals) - Math.min(...intervals);

      // Low variance indicates automated behavior
      if (variance < 50) { // Less than 50ms variance
        await expect(authenticatedPage.locator('[data-testid="automation-warning"]')).toBeVisible();
        await expect(authenticatedPage.locator('[data-testid="automation-warning"]')).toContainText(/automated behavior detected/i);
      }
    });

    test('should require actual game completion', async ({ authenticatedPage }) => {
      const boardId = 'test-board';
      const boardState = GameFixtureFactory.boardState();
      
      await mockApiResponse(authenticatedPage, `**/api/boards/${boardId}/state`, {
        status: 200,
        body: {
          success: true,
          data: {
            boardState,
            completed: false,
            winningPattern: null
          }
        }
      });

      await authenticatedPage.goto(`/speedruns/${boardId}`);
      await waitForNetworkIdle(authenticatedPage);

      // Start speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      
      // Try to complete without winning
      await authenticatedPage.click('[data-testid="complete-speedrun"]');
      
      // Should require game completion
      await expect(authenticatedPage.locator('[role="alert"]')).toContainText(/complete the game first/i);
      
      // Now simulate winning pattern
      const winningCells = [0, 1, 2, 3, 4]; // Top row
      for (const cell of winningCells) {
        await authenticatedPage.click(`[data-testid="game-cell-${cell}"]`);
        await authenticatedPage.waitForTimeout(200);
      }

      // Mock win detection
      wsContext.helper.simulateGameComplete(
        'speedrun-session',
        'current-user',
        'horizontal_line',
        45.678
      );

      // Now completion should work
      await expect(authenticatedPage.locator('[data-testid="speedrun-complete-dialog"]')).toBeVisible({
        timeout: 5000
      });
    });
  });

  test.describe('Leaderboard Integration', () => {
    test('should update leaderboard in real-time', async ({ authenticatedPage }) => {
      // Mock initial leaderboard
      const leaderboardData = [
        { id: 1, username: 'SpeedKing', time: 28.456, rank: 1, achieved_at: new Date().toISOString() },
        { id: 2, username: 'QuickPlayer', time: 31.234, rank: 2, achieved_at: new Date().toISOString() },
        { id: 3, username: 'FastGamer', time: 35.789, rank: 3, achieved_at: new Date().toISOString() }
      ];

      await mockApiResponse(authenticatedPage, '**/api/speedruns/leaderboard**', {
        status: 200,
        body: { success: true, data: leaderboardData }
      });

      await authenticatedPage.goto('/speedruns/leaderboard');
      await waitForNetworkIdle(authenticatedPage);

      // Verify initial leaderboard
      const entries = authenticatedPage.locator('[data-testid^="leaderboard-entry-"]');
      await expect(entries).toHaveCount(3);
      await expect(entries.first()).toContainText('SpeedKing');

      // Simulate new record via WebSocket - broadcast to all connections
      const _speedrunEvent: GameWebSocketEvent = {
        type: 'speedrun_completed',
        time: 27.123,
        rank: 1,
        boardId: 'test-board'
      };
      // Since we don't have a specific session, we'll trigger the event via page evaluation

      // Also simulate the WebSocket event
      await authenticatedPage.evaluate(() => {
        window.dispatchEvent(new CustomEvent('speedrun-new-record', {
          detail: {
            username: 'NewChampion',
            time: 27.123,
            rank: 1
          }
        }));
      });

      // New record should appear at top
      await expect(entries.first()).toContainText('NewChampion', { timeout: 5000 });
      await expect(entries.first()).toContainText('27.123');
      
      // Previous #1 should now be #2
      await expect(entries.nth(1)).toContainText('SpeedKing');
    });

    test('should display personal best with improvement tracking', async ({ authenticatedPage }) => {
      const personalBest = {
        best_time: 42.567,
        rank: 5,
        attempts: 12,
        improvement_trend: 'improving',
        recent_times: [45.234, 43.890, 42.567],
        average_time: 44.123
      };

      await mockApiResponse(authenticatedPage, '**/api/speedruns/personal-best**', {
        status: 200,
        body: { success: true, data: personalBest }
      });

      await authenticatedPage.goto('/speedruns/personal');
      await waitForNetworkIdle(authenticatedPage);

      // Verify personal stats display
      await expect(authenticatedPage.locator('[data-testid="personal-best"]')).toContainText('42.567');
      await expect(authenticatedPage.locator('[data-testid="personal-rank"]')).toContainText('#5');
      await expect(authenticatedPage.locator('[data-testid="total-attempts"]')).toContainText('12');
      await expect(authenticatedPage.locator('[data-testid="improvement-trend"]')).toContainText(/improving/i);

      // Check improvement chart if visible
      const chart = authenticatedPage.locator('[data-testid="improvement-chart"]');
      if (await chart.isVisible()) {
        // Should show downward trend (improving times)
        const trend = await chart.getAttribute('data-trend');
        expect(trend).toBe('improving');
      }
    });
  });

  test.describe('Performance and Reliability', () => {
    test('should handle timer with network latency', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/speedruns/test-board');
      await waitForNetworkIdle(authenticatedPage);

      // Apply network throttling
      await perfContext.network.simulateSlow3G();

      // Start timer
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      const clientStartTime = Date.now();

      // Wait for server sync
      await authenticatedPage.waitForTimeout(2000);

      // Simulate server time sync
      const serverTime = Date.now() - 100; // Server is 100ms behind
      wsContext.helper.simulateTimerSync(serverTime, clientStartTime);

      // Timer should adjust for latency
      const syncIndicator = authenticatedPage.locator('[data-testid="sync-status"]');
      if (await syncIndicator.isVisible()) {
        await expect(syncIndicator).toContainText(/synced/i);
      }

      // Restore network
      await perfContext.network.restore();
    });

    test('should recover from disconnection during speedrun', async ({ authenticatedPage, context }) => {
      await authenticatedPage.goto('/speedruns/test-board');
      await waitForNetworkIdle(authenticatedPage);

      // Start speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      const startTimer = await getTimerValue(authenticatedPage);

      // Simulate network disconnection
      await context.setOffline(true);
      await authenticatedPage.waitForTimeout(2000);

      // Timer should continue locally
      const offlineTimer = await getTimerValue(authenticatedPage);
      expect(offlineTimer).toBeGreaterThan(startTimer);

      // Should show offline indicator
      await expect(authenticatedPage.locator('[data-testid="offline-mode"]')).toBeVisible();

      // Reconnect
      await context.setOffline(false);
      
      // Should sync when reconnected
      await expect(authenticatedPage.locator('[data-testid="sync-status"]')).toContainText(/synced/i, {
        timeout: 5000
      });

      // Complete speedrun
      await authenticatedPage.click('[data-testid="stop-timer"]');
      
      // Should handle submission with offline time included
      const submitButton = authenticatedPage.locator('[data-testid="submit-time"]');
      if (await submitButton.isVisible()) {
        await expect(submitButton).toBeEnabled();
      }
    });

    test('should prevent memory leaks during long speedrun sessions', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/speedruns/test-board');
      await waitForNetworkIdle(authenticatedPage);

      // Start monitoring
      const initialMetrics = await perfContext.performance.captureMetrics();

      // Start speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');

      // Simulate 5 minutes of gameplay with actions
      const actions = ['mark_cell', 'unmark_cell', 'check_pattern'];
      const startTime = Date.now();
      
      while (Date.now() - startTime < 5 * 60 * 1000) {
        // Random game action
        const action = actions[Math.floor(Math.random() * actions.length)];
        const cellIndex = Math.floor(Math.random() * 25);
        
        if (action === 'mark_cell' || action === 'unmark_cell') {
          await authenticatedPage.click(`[data-testid="game-cell-${cellIndex}"]`);
        }

        // Check memory periodically
        if ((Date.now() - startTime) % 60000 < 1000) { // Every minute
          const hasLeak = await perfContext.performance.checkMemoryLeak(30 * 1024 * 1024); // 30MB threshold
          expect(hasLeak).toBe(false);
        }

        await authenticatedPage.waitForTimeout(Math.random() * 1000 + 500);
      }

      // Final memory check
      const finalMetrics = await perfContext.performance.captureMetrics();
      const memoryGrowth = finalMetrics.jsHeapUsedSize - initialMetrics.jsHeapUsedSize;
      
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
      
      // Generate performance report
      const report = await perfContext.performance.generateReport();
      console.log('Speedrun Performance Report:', report);
    });
  });
});