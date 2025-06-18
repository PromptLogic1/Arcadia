import { test, expect } from '../../fixtures/auth.fixture';
import { 
  GamingTestHelpers,
  waitForNetworkIdle,
  mockApiResponse
} from './helpers/gaming-test-helpers';
import { GameFixtureFactory } from './fixtures/game-fixtures';
import type { 
  TestAchievement, 
  TestGameEvent,
  TestSession,
  TestSessionPlayer
} from './types/test-types';

test.describe('Real-time Achievement Tracking System', () => {
  let mockAchievements: TestAchievement[];
  let mockSession: TestSession;
  let testUserId: string;

  test.beforeEach(async ({ authenticatedPage, testUser }) => {
    testUserId = testUser.id;
    
    // Generate achievement progression scenario
    mockAchievements = GameFixtureFactory.achievementProgressionScenario(testUserId);
    
    // Generate gaming session for context
    const scenario = GameFixtureFactory.multiplayerScenario(2);
    mockSession = scenario.session;

    // Mock achievements API
    await mockApiResponse(authenticatedPage, '**/api/achievements**', {
      success: true,
      data: mockAchievements
    });

    // Mock achievement unlock API
    await mockApiResponse(authenticatedPage, '**/api/achievements/unlock', {
      success: true,
      data: { unlocked: true, points_awarded: 50 }
    });

    await authenticatedPage.goto('/achievements');
    await waitForNetworkIdle(authenticatedPage);
  });

  test.describe('Achievement Display and Categories', () => {
    test('should display achievements with correct status and metadata', async ({ authenticatedPage }) => {
      // Verify page structure
      await expect(authenticatedPage.locator('h1')).toContainText(/achievement/i);

      // Check achievement cards
      const achievementCards = authenticatedPage.locator('[data-testid^="achievement-"]');
      await expect(achievementCards).toHaveCount(mockAchievements.length);

      // Verify first achievement (unlocked)
      const firstAchievement = mockAchievements[0];
      if (firstAchievement) {
        const firstCard = authenticatedPage.locator(`[data-testid="achievement-${firstAchievement.achievement_name}"]`);
        
        await expect(firstCard).toContainText(firstAchievement.description || '');
        await expect(firstCard).toContainText(`${firstAchievement.points || 0} points`);
        await expect(firstCard).toHaveAttribute('data-unlocked', 'true');
        
        // Should show unlock date
        if (firstAchievement.unlocked_at) {
          await expect(firstCard.locator('[data-testid="unlock-date"]')).toBeVisible();
        }
      }
    });

    test('should show progress tracking for multi-step achievements', async ({ authenticatedPage }) => {
      // Find achievement with progress
      const progressAchievement = mockAchievements.find(a => {
        if (a.metadata && typeof a.metadata === 'object' && !Array.isArray(a.metadata)) {
          const meta = a.metadata as Record<string, unknown>;
          return meta.max_progress && Number(meta.max_progress) > 1;
        }
        return false;
      });

      if (progressAchievement) {
        const progressCard = authenticatedPage.locator(`[data-testid="achievement-${progressAchievement.achievement_name}"]`);
        
        // Should show progress indicator
        await expect(progressCard.locator('[data-testid="progress-bar"]')).toBeVisible();
        
        // Should show progress text
        const meta = progressAchievement.metadata as Record<string, unknown>;
        const progress = Number(meta.progress);
        const maxProgress = Number(meta.max_progress);
        const progressText = `${progress}/${maxProgress}`;
        await expect(progressCard).toContainText(progressText);

        // Progress bar should reflect completion percentage
        const progressBar = progressCard.locator('[role="progressbar"]');
        const progressValue = progress / maxProgress;
        const expectedPercentage = Math.round(progressValue * 100);
        
        await expect(progressBar).toHaveAttribute('aria-valuenow', expectedPercentage.toString());
      }
    });

    test('should filter achievements by category', async ({ authenticatedPage }) => {
      // Check if category filters are available
      const categoryFilters = authenticatedPage.locator('[data-testid="achievement-categories"]');
      
      if (await categoryFilters.isVisible()) {
        // Test filtering by category
        await categoryFilters.locator('[data-testid="category-gameplay"]').click();
        
        // Should show only gameplay achievements
        const visibleAchievements = authenticatedPage.locator('[data-testid^="achievement-"]:visible');
        const count = await visibleAchievements.count();
        
        expect(count).toBeGreaterThan(0);
        
        // Verify all visible achievements are gameplay category
        for (let i = 0; i < count; i++) {
          const achievement = visibleAchievements.nth(i);
          await expect(achievement).toHaveAttribute('data-category', 'gameplay');
        }
      }
    });

    test('should display achievement rarity and icons', async ({ authenticatedPage }) => {
      for (const achievement of mockAchievements) {
        const card = authenticatedPage.locator(`[data-testid="achievement-${achievement.achievement_name}"]`);
        
        // Check rarity display
        if (achievement.metadata && typeof achievement.metadata === 'object' && !Array.isArray(achievement.metadata)) {
          const meta = achievement.metadata as Record<string, unknown>;
          if (meta.rarity) {
            await expect(card.locator('[data-testid="rarity-badge"]')).toContainText(String(meta.rarity));
          }
          
          // Check icon display
          if (meta.icon) {
            const icon = card.locator('[data-testid="achievement-icon"]');
            await expect(icon).toContainText(String(meta.icon));
          }
        }
      }
    });
  });

  test.describe('Real-time Achievement Unlocking', () => {
    test('should unlock achievement in real-time during gameplay', async ({ authenticatedPage }) => {
      // Set up WebSocket for real-time events
      const wsHelper = await GamingTestHelpers.setupWebSocketMocking(authenticatedPage);

      // Navigate to game session
      await GamingTestHelpers.mockSessionData(authenticatedPage, mockSession.id, mockSession);
      await authenticatedPage.goto(`/play-area/session/${mockSession.id}`);
      await waitForNetworkIdle(authenticatedPage);

      // Simulate game action that triggers achievement
      const achievementEvent: TestGameEvent = {
        id: 'achievement-event-' + Date.now(),
        type: 'achievement_unlocked',
        session_id: mockSession.id,
        player_id: testUserId,
        data: {
          achievement_id: 'first_win',
          achievement_name: 'First Victory',
          points: 50,
          description: 'Win your first game',
          icon: '🏆'
        },
        timestamp: Date.now(),
        sequence: 1
      };

      // Simulate achievement unlock
      await GamingTestHelpers.simulateGameEvent(authenticatedPage, achievementEvent, 1000);

      // Should show achievement notification
      const notification = authenticatedPage.locator('[data-testid="achievement-notification"]');
      await expect(notification).toBeVisible({ timeout: 3000 });
      await expect(notification).toContainText('First Victory');
      await expect(notification).toContainText('50 points');
      await expect(notification).toContainText('🏆');
    });

    test('should prevent duplicate achievement unlocks', async ({ authenticatedPage }) => {
      // Mock already unlocked achievement
      await mockApiResponse(authenticatedPage, '**/api/achievements/unlock', {
        success: false,
        error: 'Achievement already unlocked',
        code: 'ALREADY_UNLOCKED'
      });

      const wsHelper = await GamingTestHelpers.setupWebSocketMocking(authenticatedPage);

      // Try to unlock already unlocked achievement
      const unlockedAchievement = mockAchievements[0];
      if (!unlockedAchievement) {
        test.skip();
        return;
      }
      
      const duplicateEvent: TestGameEvent = {
        id: 'duplicate-' + Date.now(),
        type: 'achievement_unlocked',
        session_id: mockSession.id,
        player_id: testUserId,
        data: {
          achievement_id: unlockedAchievement.achievement_name,
          achievement_name: unlockedAchievement.achievement_name
        },
        timestamp: Date.now(),
        sequence: 2
      };

      await GamingTestHelpers.simulateGameEvent(authenticatedPage, duplicateEvent);

      // Should not show notification for duplicate
      const notification = authenticatedPage.locator('[data-testid="achievement-notification"]');
      await expect(notification).not.toBeVisible({ timeout: 2000 });
    });

    test('should update progress for multi-step achievements', async ({ authenticatedPage }) => {
      const wsHelper = await GamingTestHelpers.setupWebSocketMocking(authenticatedPage);

      // Find a progress-based achievement
      const progressAchievement = mockAchievements.find(a => {
        if (a.metadata && typeof a.metadata === 'object' && !Array.isArray(a.metadata)) {
          const meta = a.metadata as Record<string, unknown>;
          return meta.max_progress && Number(meta.max_progress) > 1;
        }
        return false;
      });

      if (progressAchievement) {
        const meta = progressAchievement.metadata as Record<string, unknown>;
        const currentProgress = Number(meta.progress || 0);
        const maxProgress = Number(meta.max_progress);
        const progressEvent: TestGameEvent = {
          id: 'progress-' + Date.now(),
          type: 'achievement_unlocked',
          session_id: mockSession.id,
          player_id: testUserId,
          data: {
            achievement_id: progressAchievement.achievement_name,
            progress: currentProgress + 1,
            max_progress: maxProgress,
            is_complete: false
          },
          timestamp: Date.now(),
          sequence: 3
        };

        // Simulate progress update
        await GamingTestHelpers.simulateGameEvent(authenticatedPage, progressEvent);

        // Navigate to achievements page to see update
        await authenticatedPage.goto('/achievements');
        await waitForNetworkIdle(authenticatedPage);

        // Should show updated progress
        const progressCard = authenticatedPage.locator(`[data-testid="achievement-${progressAchievement.achievement_name}"]`);
        const newProgress = currentProgress + 1;
        const progressText = `${newProgress}/${maxProgress}`;
        
        await expect(progressCard).toContainText(progressText);
      }
    });

    test('should handle achievement unlock with points notification', async ({ authenticatedPage }) => {
      const wsHelper = await GamingTestHelpers.setupWebSocketMocking(authenticatedPage);

      const pointsEvent: TestGameEvent = {
        id: 'points-' + Date.now(),
        type: 'achievement_unlocked',
        session_id: mockSession.id,
        player_id: testUserId,
        data: {
          achievement_id: 'speedrun_master',
          achievement_name: 'Speedrun Master',
          points: 500,
          description: 'Complete a speedrun under 30 seconds',
          icon: '⚡',
          total_points: 750 // Previous points + new points
        },
        timestamp: Date.now(),
        sequence: 4
      };

      await GamingTestHelpers.simulateGameEvent(authenticatedPage, pointsEvent);

      // Should show points notification
      const pointsNotification = authenticatedPage.locator('[data-testid="points-notification"]');
      await expect(pointsNotification).toContainText('+500 points', { timeout: 3000 });

      // Should update total points display
      await expect(authenticatedPage.locator('[data-testid="total-points"]')).toContainText('750');
    });
  });

  test.describe('Achievement Validation and Anti-Cheat', () => {
    test('should validate achievement conditions server-side', async ({ authenticatedPage }) => {
      // Mock invalid achievement attempt
      await mockApiResponse(authenticatedPage, '**/api/achievements/unlock', {
        success: false,
        error: 'Achievement conditions not met',
        code: 'CONDITIONS_NOT_MET'
      });

      // Try to unlock achievement directly via API call
      const response = await authenticatedPage.request.post('/api/achievements/unlock', {
        data: {
          achievement_id: 'speedrun_master',
          metadata: { time_seconds: 5 } // Impossibly fast time
        }
      });

      expect(response.status()).toBe(400);
      const error = await response.json();
      expect(error.message).toContain('conditions not met');
    });

    test('should prevent achievement manipulation', async ({ authenticatedPage }) => {
      // Try to manipulate achievement state via client
      await authenticatedPage.evaluate(() => {
        try {
          // Attempt to directly modify achievement store
          // @ts-ignore
          if (window.achievementStore) {
            // @ts-ignore
            window.achievementStore.setState({
              unlockedAchievements: ['fake_achievement']
            });
          }
        } catch (error) {
          // Should be protected from direct manipulation
        }
      });

      // Check that achievements are still correctly displayed
      const achievementCards = authenticatedPage.locator('[data-testid^="achievement-"]');
      const count = await achievementCards.count();
      
      expect(count).toBe(mockAchievements.length); // Should match original data
    });

    test('should rate limit achievement check requests', async ({ authenticatedPage }) => {
      // Mock rate limiting
      await mockApiResponse(authenticatedPage, '**/api/achievements/check', {
        success: false,
        error: 'Rate limit exceeded',
        code: 'RATE_LIMITED'
      });

      // Make rapid requests
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          authenticatedPage.request.post('/api/achievements/check', {
            data: { session_id: mockSession.id }
          })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimited = responses.filter(r => r.status() === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    test('should verify achievement unlock timing', async ({ authenticatedPage }) => {
      // Mock timing validation failure
      await mockApiResponse(authenticatedPage, '**/api/achievements/unlock', {
        success: false,
        error: 'Achievement unlocked too quickly after action',
        code: 'TIMING_SUSPICIOUS'
      });

      const wsHelper = await GamingTestHelpers.setupWebSocketMocking(authenticatedPage);

      // Try to unlock achievement immediately after action
      const suspiciousEvent: TestGameEvent = {
        id: 'suspicious-' + Date.now(),
        type: 'achievement_unlocked',
        session_id: mockSession.id,
        player_id: testUserId,
        data: {
          achievement_id: 'first_win',
          time_since_action: 1 // 1ms - too fast
        },
        timestamp: Date.now(),
        sequence: 5
      };

      await GamingTestHelpers.simulateGameEvent(authenticatedPage, suspiciousEvent);

      // Should show validation error
      await expect(authenticatedPage.locator('[role="alert"]')).toContainText(/suspicious|timing/i, { timeout: 2000 });
    });
  });

  test.describe('Achievement Statistics and Analytics', () => {
    test('should display achievement completion statistics', async ({ authenticatedPage }) => {
      // Check for statistics section
      const statsSection = authenticatedPage.locator('[data-testid="achievement-stats"]');
      
      if (await statsSection.isVisible()) {
        // Calculate expected stats
        const unlockedCount = mockAchievements.filter(a => a.unlocked_at).length;
        const totalCount = mockAchievements.length;
        const completionRate = Math.round((unlockedCount / totalCount) * 100);

        await expect(statsSection).toContainText(`${unlockedCount}/${totalCount}`);
        await expect(statsSection).toContainText(`${completionRate}%`);
      }
    });

    test('should show total points earned', async ({ authenticatedPage }) => {
      const totalPoints = mockAchievements
        .filter(a => a.unlocked_at)
        .reduce((sum, a) => sum + (a.points || 0), 0);

      const pointsDisplay = authenticatedPage.locator('[data-testid="total-points"]');
      if (await pointsDisplay.isVisible()) {
        await expect(pointsDisplay).toContainText(totalPoints.toString());
      }
    });

    test('should display achievement rarity distribution', async ({ authenticatedPage }) => {
      const raritySection = authenticatedPage.locator('[data-testid="rarity-breakdown"]');
      
      if (await raritySection.isVisible()) {
        // Check each rarity level
        const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        
        for (const rarity of rarities) {
          const rarityCount = mockAchievements.filter(a => {
            if (a.metadata && typeof a.metadata === 'object' && !Array.isArray(a.metadata)) {
              const meta = a.metadata as Record<string, unknown>;
              return meta.rarity === rarity && a.unlocked_at;
            }
            return false;
          }).length;
          
          if (rarityCount > 0) {
            await expect(raritySection).toContainText(rarity);
            await expect(raritySection).toContainText(rarityCount.toString());
          }
        }
      }
    });

    test('should show recent achievements', async ({ authenticatedPage }) => {
      const recentSection = authenticatedPage.locator('[data-testid="recent-achievements"]');
      
      if (await recentSection.isVisible()) {
        // Should show recently unlocked achievements
        const recentAchievements = mockAchievements
          .filter(a => a.unlocked_at)
          .sort((a, b) => new Date(b.unlocked_at!).getTime() - new Date(a.unlocked_at!).getTime())
          .slice(0, 3);

        for (const achievement of recentAchievements) {
          await expect(recentSection).toContainText(achievement.achievement_name);
        }
      }
    });
  });

  test.describe('Achievement Social Features', () => {
    test('should allow sharing achievements', async ({ authenticatedPage }) => {
      const unlockedAchievement = mockAchievements.find(a => a.unlocked_at);
      
      if (unlockedAchievement) {
        const achievementCard = authenticatedPage.locator(`[data-testid="achievement-${unlockedAchievement.achievement_name}"]`);
        const shareButton = achievementCard.locator('[data-testid="share-achievement"]');
        
        if (await shareButton.isVisible()) {
          await shareButton.click();
          
          // Should trigger share action (behavior depends on browser API)
          // In tests, we verify the button works
          await expect(shareButton).toBeEnabled();
        }
      }
    });

    test('should display achievement leaderboards', async ({ authenticatedPage }) => {
      // Mock leaderboard data
      const leaderboard = GameFixtureFactory.leaderboardEntries(5);
      await mockApiResponse(authenticatedPage, '**/api/achievements/leaderboard', {
        success: true,
        data: leaderboard
      });

      const leaderboardSection = authenticatedPage.locator('[data-testid="achievement-leaderboard"]');
      
      if (await leaderboardSection.isVisible()) {
        // Should show top players
        for (const entry of leaderboard.slice(0, 3)) {
          await expect(leaderboardSection).toContainText(entry.username);
          await expect(leaderboardSection).toContainText(entry.score.toString());
        }
      }
    });
  });

  test.describe('Performance and Memory Management', () => {
    test('should handle large achievement lists efficiently', async ({ authenticatedPage }) => {
      // Generate large achievement list
      const largeAchievementList = Array.from({ length: 100 }, (_, i) =>
        GameFixtureFactory.achievement({
          achievement_name: `achievement_${i}`,
          description: `Test achievement ${i}`,
          points: Math.floor(Math.random() * 100) + 10
        })
      );

      await mockApiResponse(authenticatedPage, '**/api/achievements**', {
        success: true,
        data: largeAchievementList
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Measure load performance
      const metrics = await GamingTestHelpers.measurePerformance(authenticatedPage);
      expect(metrics.loadTime).toBeLessThan(5000); // Under 5 seconds

      // Check virtualization (if implemented)
      const visibleAchievements = authenticatedPage.locator('[data-testid^="achievement-"]:visible');
      const visibleCount = await visibleAchievements.count();
      
      // Should show limited number for performance (virtualization)
      expect(visibleCount).toBeLessThanOrEqual(50);
    });

    test('should not leak memory during achievement notifications', async ({ authenticatedPage }) => {
      const wsHelper = await GamingTestHelpers.setupWebSocketMocking(authenticatedPage);

      // Get initial memory
      const initialMemory = await authenticatedPage.evaluate(() => {
        const perf = performance as any;
        return perf.memory?.usedJSHeapSize || 0;
      });

      // Trigger multiple achievement notifications
      for (let i = 0; i < 10; i++) {
        const event: TestGameEvent = {
          id: `memory-test-${i}`,
          type: 'achievement_unlocked',
          session_id: mockSession.id,
          player_id: testUserId,
          data: {
            achievement_id: `test_achievement_${i}`,
            achievement_name: `Test Achievement ${i}`,
            points: 10
          },
          timestamp: Date.now(),
          sequence: i + 10
        };

        await GamingTestHelpers.simulateGameEvent(authenticatedPage, event, 100);
        await authenticatedPage.waitForTimeout(200);
      }

      // Wait for notifications to clear
      await authenticatedPage.waitForTimeout(3000);

      // Check final memory
      const finalMemory = await authenticatedPage.evaluate(() => {
        const perf = performance as any;
        return perf.memory?.usedJSHeapSize || 0;
      });

      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be minimal (< 10MB for 10 notifications)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });

    test('should maintain UI responsiveness during bulk updates', async ({ authenticatedPage }) => {
      const wsHelper = await GamingTestHelpers.setupWebSocketMocking(authenticatedPage);

      // Measure frame rate during bulk operations
      const startTime = Date.now();
      
      // Trigger multiple simultaneous updates
      const updatePromises = Array.from({ length: 20 }, (_, i) => {
        const event: TestGameEvent = {
          id: `bulk-${i}`,
          type: 'achievement_unlocked',
          session_id: mockSession.id,
          player_id: testUserId,
          data: {
            achievement_id: `bulk_achievement_${i}`,
            progress: i + 1,
            max_progress: 20
          },
          timestamp: Date.now(),
          sequence: i + 100
        };

        return GamingTestHelpers.simulateGameEvent(authenticatedPage, event);
      });

      await Promise.all(updatePromises);

      const responseTime = Date.now() - startTime;

      // Should handle bulk updates efficiently
      expect(responseTime).toBeLessThan(2000); // Under 2 seconds for 20 updates

      // UI should remain responsive
      const refreshButton = authenticatedPage.locator('[data-testid="refresh-achievements"]');
      if (await refreshButton.isVisible()) {
        const clickStart = Date.now();
        await refreshButton.click();
        const clickResponse = Date.now() - clickStart;
        
        expect(clickResponse).toBeLessThan(200); // UI should respond quickly
      }
    });
  });
});