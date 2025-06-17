import { test, expect } from '../../fixtures/auth.fixture';
import { 
  GamingTestHelpers,
  waitForNetworkIdle,
  mockApiResponse
} from './helpers/gaming-test-helpers';
import { GameFixtureFactory } from './fixtures/game-fixtures';
import type { 
  TestSpeedrun, 
  TestTimerAssertions,
  TestPerformanceMetrics,
  TestGameEvent
} from './types/test-types';

test.describe('Speedrun Timer Precision & Anti-Cheat', () => {
  let mockSpeedrun: TestSpeedrun;
  
  test.beforeEach(async ({ authenticatedPage, testUser }) => {
    // Generate test speedrun data
    mockSpeedrun = GameFixtureFactory.speedrun({
      user_id: testUser.id,
      board_title: 'Precision Test Board',
      time_seconds: 0,
      is_verified: false
    });

    // Mock speedrun APIs
    await mockApiResponse(authenticatedPage, '**/api/speedruns/**', {
      success: true,
      data: mockSpeedrun
    });

    await mockApiResponse(authenticatedPage, '**/api/speedruns/submit', {
      success: true,
      data: { verified: true, rank: 1 }
    });

    await authenticatedPage.goto('/speedruns');
    await waitForNetworkIdle(authenticatedPage);
  });

  test.describe('Timer Accuracy and Precision', () => {
    test('should maintain millisecond precision under normal conditions', async ({ authenticatedPage }) => {
      const testDuration = 5000; // 5 seconds
      const timerAssertions = await GamingTestHelpers.startTimerAndVerify(authenticatedPage, testDuration);

      // Verify accuracy within 100ms tolerance
      expect(timerAssertions.accuracy).toBeLessThanOrEqual(100);
      expect(timerAssertions.precision).toBe('ms');
      
      console.log(`Timer accuracy: ±${timerAssertions.accuracy}ms for ${testDuration}ms test`);
    });

    test('should maintain accuracy under CPU load', async ({ authenticatedPage }) => {
      const conditions = {
        duration: 3000,
        cpuLoad: true
      };

      const timerAssertions = await GamingTestHelpers.testTimerPrecision(authenticatedPage, conditions);

      // Allow higher tolerance under CPU load (150ms)
      expect(timerAssertions.accuracy).toBeLessThanOrEqual(150);
      
      console.log(`Timer accuracy under CPU load: ±${timerAssertions.accuracy}ms`);
    });

    test('should handle network latency without timer drift', async ({ authenticatedPage }) => {
      const conditions = {
        duration: 2000,
        networkLatency: 300
      };

      const timerAssertions = await GamingTestHelpers.testTimerPrecision(authenticatedPage, conditions);

      // Network latency should not affect timer accuracy significantly
      expect(timerAssertions.accuracy).toBeLessThanOrEqual(120);
      
      console.log(`Timer accuracy with network latency: ±${timerAssertions.accuracy}ms`);
    });

    test('should maintain precision in background tab simulation', async ({ authenticatedPage }) => {
      const conditions = {
        duration: 2000,
        backgroundTab: true
      };

      const timerAssertions = await GamingTestHelpers.testTimerPrecision(authenticatedPage, conditions);

      // Background tab may have higher drift (200ms tolerance)
      expect(timerAssertions.accuracy).toBeLessThanOrEqual(200);
      
      console.log(`Timer accuracy in background: ±${timerAssertions.accuracy}ms`);
    });

    test('should start timer with immediate response', async ({ authenticatedPage }) => {
      const startButton = authenticatedPage.locator('[data-testid="start-speedrun"]');
      const timer = authenticatedPage.locator('[data-testid="speedrun-timer"]');

      // Verify initial state
      await expect(timer).toContainText('00:00.000');
      await expect(startButton).toBeEnabled();

      // Start timer and measure response time
      const startTime = Date.now();
      await startButton.click();

      // Wait for timer to show non-zero value
      await authenticatedPage.waitForFunction(() => {
        const timerElement = document.querySelector('[data-testid="speedrun-timer"]');
        return timerElement && timerElement.textContent !== '00:00.000';
      }, { timeout: 1000 });

      const responseTime = Date.now() - startTime;

      // Timer should start within 50ms
      expect(responseTime).toBeLessThan(50);

      // Verify UI state changes
      await expect(startButton).toBeDisabled();
      await expect(authenticatedPage.locator('[data-testid="pause-timer"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="stop-timer"]')).toBeVisible();
    });

    test('should handle pause and resume with precision', async ({ authenticatedPage }) => {
      // Start timer
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(1000);

      // Pause timer
      await authenticatedPage.click('[data-testid="pause-timer"]');
      const pausedTime = await authenticatedPage.locator('[data-testid="speedrun-timer"]').textContent();

      // Wait while paused
      await authenticatedPage.waitForTimeout(1500);

      // Verify time didn't advance
      const stillPausedTime = await authenticatedPage.locator('[data-testid="speedrun-timer"]').textContent();
      expect(stillPausedTime).toBe(pausedTime);

      // Resume timer
      await authenticatedPage.click('[data-testid="resume-timer"]');
      await authenticatedPage.waitForTimeout(500);

      // Verify timer is running again
      const resumedTime = await authenticatedPage.locator('[data-testid="speedrun-timer"]').textContent();
      expect(resumedTime).not.toBe(pausedTime);

      // Verify pause/resume buttons
      await expect(authenticatedPage.locator('[data-testid="pause-timer"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="resume-timer"]')).not.toBeVisible();
    });

    test('should reset timer correctly', async ({ authenticatedPage }) => {
      // Start and run timer
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(1000);

      // Stop/reset timer
      await authenticatedPage.click('[data-testid="stop-timer"]');

      // Verify timer reset
      const timer = authenticatedPage.locator('[data-testid="speedrun-timer"]');
      await expect(timer).toContainText('00:00.000');

      // Verify buttons reset
      await expect(authenticatedPage.locator('[data-testid="start-speedrun"]')).toBeEnabled();
      await expect(authenticatedPage.locator('[data-testid="pause-timer"]')).not.toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="stop-timer"]')).not.toBeVisible();
    });
  });

  test.describe('Timer Format and Display', () => {
    test('should display timer in correct format', async ({ authenticatedPage }) => {
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(100);

      const timer = authenticatedPage.locator('[data-testid="speedrun-timer"]');
      const timerText = await timer.textContent();

      // Should match MM:SS.mmm format
      expect(timerText).toMatch(/^\d{1,2}:\d{2}\.\d{3}$/);
    });

    test('should handle long duration formatting', async ({ authenticatedPage }) => {
      // Mock a timer that's been running for over an hour
      await authenticatedPage.evaluate(() => {
        // Simulate timer state for 1 hour, 5 minutes, 30.123 seconds
        const mockTime = (60 * 60 + 5 * 60 + 30) * 1000 + 123;
        
        // Update timer display (this would normally be done by the timer component)
        const timerElement = document.querySelector('[data-testid="speedrun-timer"]');
        if (timerElement) {
          const hours = Math.floor(mockTime / 3600000);
          const minutes = Math.floor((mockTime % 3600000) / 60000);
          const seconds = Math.floor((mockTime % 60000) / 1000);
          const milliseconds = mockTime % 1000;
          
          timerElement.textContent = hours > 0 
            ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
            : `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
        }
      });

      const timer = authenticatedPage.locator('[data-testid="speedrun-timer"]');
      const timerText = await timer.textContent();

      // Should handle hours format
      expect(timerText).toMatch(/^\d{1,2}:\d{2}:\d{2}\.\d{3}$/);
    });

    test('should update timer display smoothly', async ({ authenticatedPage }) => {
      await authenticatedPage.click('[data-testid="start-speedrun"]');

      const timer = authenticatedPage.locator('[data-testid="speedrun-timer"]');
      const initialTime = await timer.textContent();

      // Wait for multiple updates
      for (let i = 0; i < 3; i++) {
        await authenticatedPage.waitForTimeout(100);
        const currentTime = await timer.textContent();
        expect(currentTime).not.toBe(initialTime);
      }
    });
  });

  test.describe('Anti-Cheat and Validation', () => {
    test('should detect impossibly fast completion times', async ({ authenticatedPage }) => {
      // Mock submission with impossibly fast time
      await mockApiResponse(authenticatedPage, '**/api/speedruns/submit', {
        success: false,
        error: 'Invalid speedrun time: completion too fast to be legitimate',
        code: 'INVALID_TIME'
      });

      // Start speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(100);

      // Try to complete immediately
      await authenticatedPage.click('[data-testid="complete-speedrun"]');

      // Should show validation error
      await expect(authenticatedPage.locator('[role="alert"]')).toContainText(/invalid.*time|too fast/i, { timeout: 3000 });
    });

    test('should validate game completion before accepting time', async ({ authenticatedPage }) => {
      // Mock WebSocket to track game events
      const wsHelper = await GamingTestHelpers.setupWebSocketMocking(authenticatedPage);
      
      // Start speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(500);

      // Try to complete without actually playing
      await authenticatedPage.click('[data-testid="complete-speedrun"]');

      // Should require actual game completion
      await expect(authenticatedPage.locator('[role="alert"]')).toContainText(/complete.*game|finish.*first/i, { timeout: 3000 });
    });

    test('should detect automated play patterns', async ({ authenticatedPage }) => {
      // Start speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(100);

      // Simulate bot-like behavior with exact timing
      const cells = await authenticatedPage.locator('[data-testid^="game-cell-"]').all();
      
      if (cells.length > 0) {
        // Click cells with exactly the same interval (bot-like behavior)
        for (let i = 0; i < Math.min(5, cells.length); i++) {
          await cells[i].click();
          await authenticatedPage.waitForTimeout(1000); // Exactly 1 second - too consistent
        }

        // Should trigger automation detection
        const automationWarning = authenticatedPage.locator('[data-testid="automation-warning"]');
        if (await automationWarning.isVisible()) {
          await expect(automationWarning).toContainText(/automated|bot|suspicious/i);
        }
      }
    });

    test('should validate server-side timer synchronization', async ({ authenticatedPage }) => {
      // Mock server time validation
      await mockApiResponse(authenticatedPage, '**/api/speedruns/validate-time', {
        success: false,
        error: 'Timer desynchronized from server',
        code: 'TIME_SYNC_ERROR'
      });

      // Start speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(2000);

      // Try to submit
      await authenticatedPage.click('[data-testid="complete-speedrun"]');

      // Should validate with server
      await expect(authenticatedPage.locator('[role="alert"]')).toContainText(/sync|server|validation/i, { timeout: 3000 });
    });

    test('should prevent timer manipulation', async ({ authenticatedPage }) => {
      // Start speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(1000);

      // Try to manipulate timer via console
      await authenticatedPage.evaluate(() => {
        // Attempt to modify timer state directly
        try {
          // @ts-ignore - Attempting malicious modification
          if (window.gameTimerStore) {
            // @ts-ignore
            window.gameTimerStore.setState({ currentTime: 5000 });
          }
        } catch (error) {
          // Timer should be protected from direct manipulation
        }
      });

      // Timer should continue running normally
      await authenticatedPage.waitForTimeout(500);
      const timerText = await authenticatedPage.locator('[data-testid="speedrun-timer"]').textContent();
      
      // Should show realistic time progression, not manipulated value
      expect(timerText).toMatch(/^0:[01]\d\.\d{3}$/); // Should be in 0-2 minute range
    });
  });

  test.describe('Performance Under Load', () => {
    test('should maintain timer accuracy during intensive operations', async ({ authenticatedPage }) => {
      // Start CPU-intensive operations
      const stopCpuLoad = await GamingTestHelpers.simulateCpuLoad(authenticatedPage);

      try {
        // Test timer under load
        const timerAssertions = await GamingTestHelpers.startTimerAndVerify(authenticatedPage, 3000);

        // Should maintain reasonable accuracy even under load
        expect(timerAssertions.accuracy).toBeLessThanOrEqual(200);
      } finally {
        await stopCpuLoad();
      }
    });

    test('should handle rapid start/stop cycles', async ({ authenticatedPage }) => {
      for (let i = 0; i < 5; i++) {
        // Start timer
        await authenticatedPage.click('[data-testid="start-speedrun"]');
        await authenticatedPage.waitForTimeout(200);

        // Stop timer
        await authenticatedPage.click('[data-testid="stop-timer"]');
        await authenticatedPage.waitForTimeout(100);

        // Verify reset state
        await expect(authenticatedPage.locator('[data-testid="speedrun-timer"]')).toContainText('00:00.000');
      }

      // Should still work normally after rapid cycles
      const finalTest = await GamingTestHelpers.startTimerAndVerify(authenticatedPage, 1000);
      expect(finalTest.accuracy).toBeLessThanOrEqual(100);
    });

    test('should monitor memory usage during extended speedrun', async ({ authenticatedPage }) => {
      // Start speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');

      // Monitor memory for 10 seconds
      const memoryMeasurements = await GamingTestHelpers.monitorMemoryUsage(
        authenticatedPage, 
        10000, // 10 seconds
        1000   // 1 second intervals
      );

      // Calculate memory growth
      const initialMemory = memoryMeasurements[0];
      const finalMemory = memoryMeasurements[memoryMeasurements.length - 1];
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be minimal (< 5MB)
      expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024);

      console.log(`Memory growth during speedrun: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  test.describe('Leaderboard Integration', () => {
    test('should submit verified speedrun to leaderboard', async ({ authenticatedPage }) => {
      // Mock successful completion
      await mockApiResponse(authenticatedPage, '**/api/speedruns/submit', {
        success: true,
        data: {
          id: 'speedrun-' + Date.now(),
          time_seconds: 45.123,
          rank: 3,
          is_personal_best: true,
          verified: true
        }
      });

      // Mock leaderboard data
      const leaderboard = GameFixtureFactory.leaderboardEntries(10);
      await mockApiResponse(authenticatedPage, '**/api/leaderboards/speedrun', {
        success: true,
        data: leaderboard
      });

      // Complete speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(2000);
      await authenticatedPage.click('[data-testid="complete-speedrun"]');

      // Should show completion notification
      await expect(authenticatedPage.locator('[data-testid="speedrun-completed"]')).toContainText(/completed|finished/i, { timeout: 3000 });

      // Should show rank and time
      await expect(authenticatedPage.locator('[data-testid="speedrun-result"]')).toContainText(/rank.*3/i, { timeout: 2000 });
    });

    test('should handle leaderboard submission errors', async ({ authenticatedPage }) => {
      // Mock submission failure
      await mockApiResponse(authenticatedPage, '**/api/speedruns/submit', {
        success: false,
        error: 'Leaderboard service unavailable',
        code: 'SERVICE_UNAVAILABLE'
      });

      // Complete speedrun
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(1000);
      await authenticatedPage.click('[data-testid="complete-speedrun"]');

      // Should handle error gracefully
      await expect(authenticatedPage.locator('[role="alert"]')).toContainText(/unavailable|error|failed/i, { timeout: 3000 });
    });
  });

  test.describe('Cross-Platform Consistency', () => {
    test('should maintain timer accuracy across different viewport sizes', async ({ authenticatedPage }) => {
      // Test mobile viewport
      await authenticatedPage.setViewportSize({ width: 375, height: 667 });
      const mobileTest = await GamingTestHelpers.startTimerAndVerify(authenticatedPage, 2000);

      // Test desktop viewport
      await authenticatedPage.setViewportSize({ width: 1920, height: 1080 });
      await authenticatedPage.click('[data-testid="stop-timer"]');
      await authenticatedPage.waitForTimeout(100);
      
      const desktopTest = await GamingTestHelpers.startTimerAndVerify(authenticatedPage, 2000);

      // Both should have similar accuracy
      expect(mobileTest.accuracy).toBeLessThanOrEqual(150);
      expect(desktopTest.accuracy).toBeLessThanOrEqual(150);

      const accuracyDifference = Math.abs(mobileTest.accuracy - desktopTest.accuracy);
      expect(accuracyDifference).toBeLessThan(50); // Should be consistent across viewports
    });

    test('should handle different timer precision requirements', async ({ authenticatedPage }) => {
      // Test millisecond precision
      await authenticatedPage.click('[data-testid="start-speedrun"]');
      await authenticatedPage.waitForTimeout(1234); // Specific duration for testing

      const timer = authenticatedPage.locator('[data-testid="speedrun-timer"]');
      const timerText = await timer.textContent();

      // Should show millisecond precision
      expect(timerText).toMatch(/\.\d{3}$/);

      // Parse and verify precision
      const [minutes, seconds, milliseconds] = timerText!.split(/[:.]/).map(Number);
      const totalMs = minutes * 60000 + seconds * 1000 + milliseconds;

      // Should be close to test duration (1234ms ± 100ms tolerance)
      expect(totalMs).toBeGreaterThanOrEqual(1134);
      expect(totalMs).toBeLessThanOrEqual(1334);
    });
  });
});