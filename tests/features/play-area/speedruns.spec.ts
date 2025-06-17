import { test, expect } from '../../fixtures/auth.fixture';
import { 
  waitForNetworkIdle, 
  mockApiResponse, 
  getStoreState,
  waitForStore
} from '../../helpers/test-utils';

test.describe('Speedrun System', () => {
  const mockSpeedrunData = {
    id: 'speedrun-123',
    board_id: 'test-board',
    board_title: 'Speed Challenge Board',
    difficulty: 'hard',
    best_time: null,
    current_time: 0,
    status: 'ready'
  };

  test.beforeEach(async ({ authenticatedPage }) => {
    // Mock speedrun data
    await mockApiResponse(authenticatedPage, '**/api/speedruns/**', {
      status: 200,
      body: { success: true, data: mockSpeedrunData }
    });

    await authenticatedPage.goto('/speedruns');
    await waitForNetworkIdle(authenticatedPage);
  });

  test.describe('Speedrun Timer Functionality', () => {
    test('should display speedrun interface correctly', async ({ authenticatedPage }) => {
      // Check main elements
      await expect(authenticatedPage.locator('h1')).toContainText(/speedrun/i);
      await expect(authenticatedPage.locator('[data-testid="speedrun-timer"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="start-speedrun"]')).toBeVisible();
      
      // Timer should show initial state
      await expect(authenticatedPage.locator('[data-testid="speedrun-timer"]')).toContainText('00:00.000');
    });

    test('should start timer accurately', async ({ authenticatedPage }) => {
      // Start speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      
      // Timer should start running
      await authenticatedPage.waitForTimeout(100);
      const timer = authenticatedPage.locator('[data-testid="speedrun-timer"]');
      await expect(timer).not.toContainText('00:00.000');
      
      // Verify button state changes
      await expect(authenticatedPage.locator('[data-testid="start-speedrun"]')).toBeDisabled();
      await expect(authenticatedPage.locator('[data-testid="pause-timer"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="stop-timer"]')).toBeVisible();
    });

    test('should maintain millisecond precision', async ({ authenticatedPage }) => {
      const startTime = Date.now();
      
      // Start timer
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      
      // Wait exactly 2 seconds
      await authenticatedPage.waitForTimeout(2000);
      
      // Check timer display
      const timerText = await authenticatedPage.locator('[data-testid="speedrun-timer"]').textContent();
      const [minutes, seconds, milliseconds] = timerText!.split(/[:.]/).map(Number);
      const displayedTime = minutes * 60000 + seconds * 1000 + milliseconds;
      
      // Allow 100ms tolerance for processing delays
      expect(displayedTime).toBeGreaterThanOrEqual(1900);
      expect(displayedTime).toBeLessThanOrEqual(2100);
    });

    test('should handle pause and resume correctly', async ({ authenticatedPage }) => {
      // Start timer
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(1000);
      
      // Pause
      await authenticatedPage.click('[data-testid="pause-timer"]');
      const pausedTime = await authenticatedPage.locator('[data-testid="speedrun-timer"]').textContent();
      
      // Wait while paused
      await authenticatedPage.waitForTimeout(1000);
      
      // Time should not advance
      const stillPausedTime = await authenticatedPage.locator('[data-testid="speedrun-timer"]').textContent();
      expect(stillPausedTime).toBe(pausedTime);
      
      // Resume
      await authenticatedPage.click('[data-testid="resume-timer"]');
      await authenticatedPage.waitForTimeout(500);
      
      // Time should be running again
      const resumedTime = await authenticatedPage.locator('[data-testid="speedrun-timer"]').textContent();
      expect(resumedTime).not.toBe(pausedTime);
    });

    test('should stop timer and record time', async ({ authenticatedPage }) => {
      // Mock speedrun completion
      await mockApiResponse(authenticatedPage, '**/api/speedruns/complete', {
        status: 200,
        body: { 
          success: true, 
          data: { 
            time: 45.678,
            rank: 3,
            improvement: true
          }
        }
      });

      // Start timer
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(1000);
      
      // Stop timer
      await authenticatedPage.click('[data-testid="stop-timer"]');
      
      // Should show completion dialog
      await expect(authenticatedPage.locator('[data-testid="speedrun-complete-dialog"]')).toBeVisible();
      await expect(authenticatedPage.locator('text=45.678')).toBeVisible();
      await expect(authenticatedPage.locator('text=Rank #3')).toBeVisible();
    });

    test('should reset timer correctly', async ({ authenticatedPage }) => {
      // Start and run timer
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(1000);
      
      // Reset
      await authenticatedPage.click('[data-testid="reset-timer"]');
      
      // Timer should return to initial state
      await expect(authenticatedPage.locator('[data-testid="speedrun-timer"]')).toContainText('00:00.000');
      await expect(authenticatedPage.locator('[data-testid="start-speedrun"]')).toBeEnabled();
    });
  });

  test.describe('Speedrun Validation and Anti-Cheat', () => {
    test('should validate minimum completion time', async ({ authenticatedPage }) => {
      // Mock validation failure for too-fast time
      await mockApiResponse(authenticatedPage, '**/api/speedruns/complete', {
        status: 400,
        body: { 
          error: 'Invalid speedrun time',
          message: 'Completion time too fast to be legitimate'
        }
      });

      // Start and immediately try to complete
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(100); // Very short time
      await authenticatedPage.click('[data-testid="stop-timer"]');
      
      // Should show validation error
      await expect(authenticatedPage.locator('[role="alert"]')).toContainText(/invalid speedrun time/i);
    });

    test('should require actual game completion', async ({ authenticatedPage }) => {
      // Mock game board
      await mockApiResponse(authenticatedPage, '**/api/boards/test-board/state', {
        status: 200,
        body: {
          success: true,
          data: {
            boardState: Array.from({ length: 25 }, (_, i) => ({
              position: i,
              text: `Cell ${i + 1}`,
              is_marked: false
            })),
            completed: false
          }
        }
      });

      await authenticatedPage.goto('/speedruns/test-board');
      await waitForNetworkIdle(authenticatedPage);

      // Start speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      
      // Try to complete without finishing board
      await authenticatedPage.click('[data-testid="complete-speedrun"]');
      
      // Should require board completion
      await expect(authenticatedPage.locator('[role="alert"]')).toContainText(/complete the game first/i);
    });

    test('should detect automated play patterns', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/speedruns/test-board');
      await waitForNetworkIdle(authenticatedPage);

      // Start speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      
      // Make moves with exact same timing (bot-like)
      for (let i = 0; i < 5; i++) {
        await authenticatedPage.click(`[data-testid="game-cell-${i}"]`);
        await authenticatedPage.waitForTimeout(1000); // Exactly 1 second
      }
      
      // Should trigger anti-automation warning
      await expect(authenticatedPage.locator('[data-testid="automation-warning"]')).toBeVisible();
    });

    test('should validate game completion sequence', async ({ authenticatedPage }) => {
      // Mock game events tracking
      const gameEvents: string[] = [];
      
      await authenticatedPage.routeWebSocket('**/ws', ws => {
        ws.onMessage(message => {
          const data = JSON.parse(message);
          gameEvents.push(data.type);
        });
      });

      await authenticatedPage.goto('/speedruns/test-board');
      await waitForNetworkIdle(authenticatedPage);

      // Start speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      
      // Try to complete without proper sequence
      await authenticatedPage.click('[data-testid="complete-speedrun"]');
      
      // Should validate event sequence
      const validationError = await authenticatedPage.locator('[role="alert"]').textContent();
      if (validationError?.includes('validation')) {
        expect(gameEvents).not.toContain('game_completed');
      }
    });
  });

  test.describe('Leaderboard Integration', () => {
    test('should display speedrun leaderboard', async ({ authenticatedPage }) => {
      // Mock leaderboard data
      await mockApiResponse(authenticatedPage, '**/api/speedruns/leaderboard**', {
        status: 200,
        body: {
          success: true,
          data: [
            {
              id: 1,
              username: 'SpeedMaster',
              time: 32.145,
              rank: 1,
              achieved_at: new Date().toISOString()
            },
            {
              id: 2,
              username: 'QuickPlayer',
              time: 35.678,
              rank: 2,
              achieved_at: new Date().toISOString()
            },
            {
              id: 3,
              username: 'FastRunner',
              time: 40.234,
              rank: 3,
              achieved_at: new Date().toISOString()
            }
          ]
        }
      });

      await authenticatedPage.goto('/speedruns/leaderboard');
      await waitForNetworkIdle(authenticatedPage);

      // Check leaderboard displays
      await expect(authenticatedPage.locator('[data-testid="speedrun-leaderboard"]')).toBeVisible();
      
      // Check top entries
      const entries = authenticatedPage.locator('[data-testid^="leaderboard-entry-"]');
      await expect(entries).toHaveCount(3);
      
      // Check ranking order
      await expect(entries.nth(0)).toContainText('SpeedMaster');
      await expect(entries.nth(0)).toContainText('32.145');
      await expect(entries.nth(1)).toContainText('QuickPlayer');
      await expect(entries.nth(2)).toContainText('FastRunner');
    });

    test('should filter leaderboard by time period', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/speedruns/leaderboard');
      await waitForNetworkIdle(authenticatedPage);

      // Select weekly filter
      const periodFilter = authenticatedPage.locator('[data-testid="period-filter"]');
      await periodFilter.selectOption('weekly');
      
      // URL should update
      await expect(authenticatedPage).toHaveURL(/period=weekly/);
      
      // Results should be filtered for recent times
      const entries = authenticatedPage.locator('[data-testid^="leaderboard-entry-"]');
      const count = await entries.count();
      
      for (let i = 0; i < count; i++) {
        const dateElement = entries.nth(i).locator('.date');
        if (await dateElement.isVisible()) {
          const dateText = await dateElement.textContent();
          const date = new Date(dateText!);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          expect(date.getTime()).toBeGreaterThan(weekAgo.getTime());
        }
      }
    });

    test('should show personal best times', async ({ authenticatedPage, testUser }) => {
      // Mock personal records
      await mockApiResponse(authenticatedPage, '**/api/speedruns/personal-best**', {
        status: 200,
        body: {
          success: true,
          data: {
            best_time: 42.567,
            rank: 5,
            attempts: 12,
            improvement_trend: 'improving'
          }
        }
      });

      await authenticatedPage.goto('/speedruns/personal');
      await waitForNetworkIdle(authenticatedPage);

      // Check personal stats
      await expect(authenticatedPage.locator('[data-testid="personal-best"]')).toContainText('42.567');
      await expect(authenticatedPage.locator('[data-testid="personal-rank"]')).toContainText('5');
      await expect(authenticatedPage.locator('[data-testid="total-attempts"]')).toContainText('12');
    });

    test('should update leaderboard in real-time', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/speedruns/leaderboard');
      await waitForNetworkIdle(authenticatedPage);

      // Mock real-time update
      await authenticatedPage.routeWebSocket('**/ws', ws => {
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'speedrun_completed',
            data: {
              username: 'NewChampion',
              time: 30.123,
              rank: 1
            }
          }));
        }, 1000);
      });

      // New record should appear at top
      await expect(authenticatedPage.locator('[data-testid="leaderboard-entry-0"]')).toContainText('NewChampion', {
        timeout: 3000
      });
      await expect(authenticatedPage.locator('[data-testid="leaderboard-entry-0"]')).toContainText('30.123');
    });
  });

  test.describe('Game Integration', () => {
    test('should start speedrun from board page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/challenge-hub/board/test-board');
      await waitForNetworkIdle(authenticatedPage);

      // Check speedrun button
      const speedrunButton = authenticatedPage.locator('[data-testid="start-speedrun"]');
      await expect(speedrunButton).toBeVisible();
      
      await speedrunButton.click();
      
      // Should navigate to speedrun mode
      await expect(authenticatedPage).toHaveURL(/\/speedruns\/test-board/);
      await expect(authenticatedPage.locator('[data-testid="speedrun-timer"]')).toBeVisible();
    });

    test('should track completion progress during speedrun', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/speedruns/test-board');
      await waitForNetworkIdle(authenticatedPage);

      // Mock board with progress tracking
      await mockApiResponse(authenticatedPage, '**/api/boards/test-board/state', {
        status: 200,
        body: {
          success: true,
          data: {
            boardState: Array.from({ length: 25 }, (_, i) => ({
              position: i,
              text: `Cell ${i + 1}`,
              is_marked: i < 5 // 5 cells marked
            })),
            completion_percentage: 20
          }
        }
      });

      // Start speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      
      // Check progress indicator
      const progress = authenticatedPage.locator('[data-testid="speedrun-progress"]');
      if (await progress.isVisible()) {
        await expect(progress).toContainText('20%');
      }
    });

    test('should handle win detection correctly', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/speedruns/test-board');
      await waitForNetworkIdle(authenticatedPage);

      // Start speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');

      // Mock win detection
      await authenticatedPage.routeWebSocket('**/ws', ws => {
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'game_completed',
            sessionId: 'speedrun-session',
            winner: 'current-user',
            completion_time: 45.678
          }));
        }, 2000);
      });

      // Should automatically stop timer and show completion
      await expect(authenticatedPage.locator('[data-testid="speedrun-complete-dialog"]')).toBeVisible({
        timeout: 5000
      });
    });
  });

  test.describe('Performance and Accuracy', () => {
    test('should maintain timer accuracy under load', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/speedruns/test-board');
      await waitForNetworkIdle(authenticatedPage);

      // Start timer
      const startTime = Date.now();
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      
      // Simulate high CPU load with rapid operations
      const operations = [];
      for (let i = 0; i < 50; i++) {
        operations.push(
          authenticatedPage.evaluate(() => {
            // CPU intensive operation
            let result = 0;
            for (let j = 0; j < 10000; j++) {
              result += Math.random();
            }
            return result;
          })
        );
      }
      
      await Promise.all(operations);
      
      // Wait for specific duration
      await authenticatedPage.waitForTimeout(3000);
      
      // Check timer accuracy despite load
      const timerText = await authenticatedPage.locator('[data-testid="speedrun-timer"]').textContent();
      const [minutes, seconds, milliseconds] = timerText!.split(/[:.]/).map(Number);
      const displayedTime = minutes * 60000 + seconds * 1000 + milliseconds;
      
      // Should be close to 3 seconds despite load
      expect(displayedTime).toBeGreaterThanOrEqual(2800);
      expect(displayedTime).toBeLessThanOrEqual(3200);
    });

    test('should handle browser tab switching correctly', async ({ authenticatedPage, context }) => {
      await authenticatedPage.goto('/speedruns/test-board');
      await waitForNetworkIdle(authenticatedPage);

      // Start timer
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(1000);
      
      // Switch to new tab
      const newPage = await context.newPage();
      await newPage.goto('about:blank');
      await newPage.waitForTimeout(2000);
      
      // Switch back
      await authenticatedPage.bringToFront();
      
      // Timer should still be running accurately
      const timerText = await authenticatedPage.locator('[data-testid="speedrun-timer"]').textContent();
      expect(timerText).not.toBe('00:00.000');
      
      // Should show warning about tab switching if configured
      const tabWarning = authenticatedPage.locator('[data-testid="tab-switch-warning"]');
      if (await tabWarning.isVisible()) {
        await expect(tabWarning).toContainText(/tab switching detected/i);
      }
    });

    test('should handle rapid start/stop operations', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/speedruns/test-board');
      await waitForNetworkIdle(authenticatedPage);

      // Rapid start/stop cycles
      for (let i = 0; i < 5; i++) {
        await authenticatedPage.click('[data-testid="start-speedrun"]');
        await authenticatedPage.waitForTimeout(100);
        await authenticatedPage.click('[data-testid="reset-timer"]');
        await authenticatedPage.waitForTimeout(100);
      }
      
      // Final start should work correctly
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(500);
      
      const timerText = await authenticatedPage.locator('[data-testid="speedrun-timer"]').textContent();
      expect(timerText).not.toBe('00:00.000');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle timer synchronization errors', async ({ authenticatedPage }) => {
      // Mock timer sync failure
      await mockApiResponse(authenticatedPage, '**/api/speedruns/sync-time', {
        status: 500,
        body: { error: 'Timer synchronization failed' }
      });

      await authenticatedPage.goto('/speedruns/test-board');
      await waitForNetworkIdle(authenticatedPage);

      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(2000);
      
      // Should show sync error warning
      const syncWarning = authenticatedPage.locator('[data-testid="timer-sync-warning"]');
      if (await syncWarning.isVisible()) {
        await expect(syncWarning).toContainText(/synchronization/i);
      }
    });

    test('should handle submission failures gracefully', async ({ authenticatedPage }) => {
      // Mock submission failure
      await mockApiResponse(authenticatedPage, '**/api/speedruns/complete', {
        status: 500,
        body: { error: 'Failed to submit speedrun' }
      });

      await authenticatedPage.goto('/speedruns/test-board');
      await waitForNetworkIdle(authenticatedPage);

      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(1000);
      await authenticatedPage.click('[data-testid="stop-timer"]');
      
      // Should show submission error
      await expect(authenticatedPage.locator('[role="alert"]')).toContainText(/failed to submit/i);
      
      // Should offer retry option
      const retryButton = authenticatedPage.locator('[data-testid="retry-submission"]');
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeEnabled();
      }
    });

    test('should handle network disconnection during speedrun', async ({ authenticatedPage, context }) => {
      await authenticatedPage.goto('/speedruns/test-board');
      await waitForNetworkIdle(authenticatedPage);

      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(1000);
      
      // Simulate network offline
      await context.setOffline(true);
      
      // Timer should continue running locally
      await authenticatedPage.waitForTimeout(1000);
      const timerText = await authenticatedPage.locator('[data-testid="speedrun-timer"]').textContent();
      expect(timerText).not.toBe('00:00.000');
      
      // Should show offline indicator
      await expect(authenticatedPage.locator('[data-testid="offline-mode"]')).toBeVisible();
      
      // Reconnect
      await context.setOffline(false);
      
      // Should sync when reconnected
      await expect(authenticatedPage.locator('[data-testid="sync-status"]')).toContainText(/synced/i, {
        timeout: 5000
      });
    });
  });
});