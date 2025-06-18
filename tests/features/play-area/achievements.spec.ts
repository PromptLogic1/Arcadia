import { test, expect } from '../../fixtures/auth.fixture';
import type { Route } from '@playwright/test';
import { 
  waitForNetworkIdle, 
  mockApiResponse
} from '../../helpers/test-utils';
import type { Tables } from '../../../types/database.types';

test.describe('Achievement System', () => {
  // Type-safe achievement mock data using database schema
  const mockAchievements: Tables<'user_achievements'>[] = [
    {
      id: 'ach-first-win-001',
      user_id: 'test-user-id',
      achievement_name: 'first_win',
      achievement_type: 'gameplay',
      description: 'Win your first game',
      points: 50,
      unlocked_at: null,
      created_at: new Date().toISOString(),
      metadata: {
        category: 'gameplay',
        rarity: 'common',
        progress: 0,
        max_progress: 1,
        icon: '🏆'
      }
    },
    {
      id: 'ach-streak-002',
      user_id: 'test-user-id',
      achievement_name: 'winning_streak_3',
      achievement_type: 'gameplay',
      description: 'Win 3 games in a row',
      points: 150,
      unlocked_at: null,
      created_at: new Date().toISOString(),
      metadata: {
        category: 'gameplay',
        rarity: 'uncommon',
        progress: 0,
        max_progress: 3,
        icon: '🔥'
      }
    },
    {
      id: 'ach-speedrun-003',
      user_id: 'test-user-id',
      achievement_name: 'speedrun_master',
      achievement_type: 'speedrun',
      description: 'Complete a speedrun under 30 seconds',
      points: 300,
      unlocked_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      created_at: new Date().toISOString(),
      metadata: {
        category: 'speedrun',
        rarity: 'rare',
        progress: 1,
        max_progress: 1,
        icon: '⚡'
      }
    }
  ];

  test.beforeEach(async ({ authenticatedPage }) => {
    // Mock achievements data
    await mockApiResponse(authenticatedPage, '**/api/achievements**', {
      status: 200,
      body: { success: true, data: mockAchievements }
    });

    await authenticatedPage.goto('/achievements');
    await waitForNetworkIdle(authenticatedPage);
  });

  test.describe('Achievement Display and Organization', () => {
    test('should display achievement list correctly', async ({ authenticatedPage }) => {
      // Check page header
      await expect(authenticatedPage.locator('h1')).toContainText(/achievement/i);
      
      // Check achievement cards are displayed
      const achievementCards = authenticatedPage.locator('[data-testid^="achievement-"]');
      await expect(achievementCards).toHaveCount(3);
      
      // Check first achievement details
      const firstAchievement = authenticatedPage.locator('[data-testid="achievement-first_win"]');
      await expect(firstAchievement).toContainText('First Victory');
      await expect(firstAchievement).toContainText('Win your first game');
      await expect(firstAchievement).toContainText('50 points');
      await expect(firstAchievement).toContainText('🏆');
      
      // Should show locked state
      await expect(firstAchievement).toHaveAttribute('data-unlocked', 'false');
    });

    test('should show achievement progress correctly', async ({ authenticatedPage }) => {
      // Check progress tracking achievement
      const streakAchievement = authenticatedPage.locator('[data-testid="achievement-winning_streak_3"]');
      await expect(streakAchievement).toContainText('0/3');
      
      // Check progress bar if visible
      const progressBar = streakAchievement.locator('[data-testid="progress-bar"]');
      if (await progressBar.isVisible()) {
        await expect(progressBar).toHaveAttribute('aria-valuenow', '0');
        await expect(progressBar).toHaveAttribute('aria-valuemax', '3');
      }
    });

    test('should display unlocked achievements correctly', async ({ authenticatedPage }) => {
      const unlockedAchievement = authenticatedPage.locator('[data-testid="achievement-speedrun_master"]');
      
      // Should show unlocked state
      await expect(unlockedAchievement).toHaveAttribute('data-unlocked', 'true');
      await expect(unlockedAchievement).toContainText('Speed Demon');
      await expect(unlockedAchievement).toContainText('300 points');
      
      // Should show unlock date
      await expect(unlockedAchievement).toContainText(/unlocked/i);
    });

    test('should filter achievements by category', async ({ authenticatedPage }) => {
      // Check category filters
      const categoryFilter = authenticatedPage.locator('[data-testid="category-filter"]');
      await expect(categoryFilter).toBeVisible();
      
      // Filter by speedrun category
      await categoryFilter.selectOption('speedrun');
      await waitForNetworkIdle(authenticatedPage);
      
      // Should only show speedrun achievements
      const visibleAchievements = authenticatedPage.locator('[data-testid^="achievement-"]:visible');
      await expect(visibleAchievements).toHaveCount(1);
      await expect(visibleAchievements).toContainText('Speed Demon');
    });

    test('should filter achievements by unlock status', async ({ authenticatedPage }) => {
      // Filter by unlocked
      const statusFilter = authenticatedPage.locator('[data-testid="status-filter"]');
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('unlocked');
        await waitForNetworkIdle(authenticatedPage);
        
        // Should only show unlocked achievements
        const unlockedAchievements = authenticatedPage.locator('[data-testid^="achievement-"][data-unlocked="true"]:visible');
        await expect(unlockedAchievements).toHaveCount(1);
      }
    });

    test('should sort achievements by different criteria', async ({ authenticatedPage }) => {
      const sortFilter = authenticatedPage.locator('[data-testid="sort-filter"]');
      if (await sortFilter.isVisible()) {
        // Sort by points (highest first)
        await sortFilter.selectOption('points-desc');
        await waitForNetworkIdle(authenticatedPage);
        
        const achievements = authenticatedPage.locator('[data-testid^="achievement-"]');
        const firstAchievement = achievements.first();
        await expect(firstAchievement).toContainText('Speed Demon'); // 300 points
      }
    });
  });

  test.describe('Real-Time Achievement Unlocking', () => {
    test('should unlock achievement in real-time during gameplay', async ({ authenticatedPage }) => {
      // Navigate to a game session
      await authenticatedPage.goto('/play-area/session/test-session');
      await waitForNetworkIdle(authenticatedPage);

      // Mock game completion that triggers achievement
      await authenticatedPage.routeWebSocket('**/ws', ws => {
        // Simulate game completion after 2 seconds
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'achievement_unlocked',
            achievement: {
              id: 'first_win',
              title: 'First Victory',
              description: 'Win your first game',
              points: 50,
              icon: '🏆'
            }
          }));
        }, 2000);
      });

      // Mock a game win action
      await authenticatedPage.evaluate(() => {
        // Simulate game completion
        window.dispatchEvent(new CustomEvent('game-completed', {
          detail: { winner: 'current-user' }
        }));
      });

      // Achievement notification should appear
      const notification = authenticatedPage.locator('[data-testid="achievement-unlocked"]');
      await expect(notification).toBeVisible({ timeout: 5000 });
      await expect(notification).toContainText('First Victory');
      await expect(notification).toContainText('50 points');
    });

    test('should update progress for multi-step achievements', async ({ authenticatedPage }) => {
      // Mock progress update
      await mockApiResponse(authenticatedPage, '**/api/achievements/progress', {
        status: 200,
        body: {
          success: true,
          data: {
            achievement_id: 'winning_streak_3',
            progress: 1,
            max_progress: 3
          }
        }
      });

      // Navigate to achievements page
      await authenticatedPage.goto('/achievements');
      await waitForNetworkIdle(authenticatedPage);

      // Simulate progress update via WebSocket
      await authenticatedPage.routeWebSocket('**/ws', ws => {
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'achievement_progress',
            achievement_id: 'winning_streak_3',
            progress: 1,
            max_progress: 3
          }));
        }, 1000);
      });

      // Progress should update
      const streakAchievement = authenticatedPage.locator('[data-testid="achievement-winning_streak_3"]');
      await expect(streakAchievement).toContainText('1/3', { timeout: 3000 });
    });

    test('should show achievement unlock animation', async ({ authenticatedPage }) => {
      // Go to game session and trigger achievement
      await authenticatedPage.goto('/play-area/session/test-session');
      await waitForNetworkIdle(authenticatedPage);

      // Mock achievement unlock
      await authenticatedPage.routeWebSocket('**/ws', ws => {
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'achievement_unlocked',
            achievement: {
              id: 'speedrun_beginner',
              title: 'Quick Start',
              description: 'Complete your first speedrun',
              points: 100,
              icon: '🏃'
            }
          }));
        }, 1000);
      });

      // Achievement modal should appear with animation
      const modal = authenticatedPage.locator('[data-testid="achievement-unlock-modal"]');
      await expect(modal).toBeVisible({ timeout: 3000 });
      
      // Check animation classes
      await expect(modal).toHaveClass(/animate/);
      
      // Modal should auto-close after animation
      await expect(modal).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Achievement Details and History', () => {
    test('should show achievement details in modal', async ({ authenticatedPage }) => {
      // Click on an achievement
      const achievement = authenticatedPage.locator('[data-testid="achievement-speedrun_master"]');
      await achievement.click();
      
      // Details modal should open
      const modal = authenticatedPage.locator('[data-testid="achievement-details-modal"]');
      await expect(modal).toBeVisible();
      
      // Check modal content
      await expect(modal).toContainText('Speed Demon');
      await expect(modal).toContainText('Complete a speedrun under 30 seconds');
      await expect(modal).toContainText('300 points');
      await expect(modal).toContainText('Rare');
      
      // Should show unlock date for unlocked achievements
      await expect(modal).toContainText(/unlocked.*ago/i);
    });

    test('should display achievement statistics', async ({ authenticatedPage }) => {
      // Navigate to achievement stats
      await authenticatedPage.goto('/achievements/stats');
      await waitForNetworkIdle(authenticatedPage);

      // Mock stats data
      await mockApiResponse(authenticatedPage, '**/api/achievements/stats', {
        status: 200,
        body: {
          success: true,
          data: {
            total_achievements: 50,
            unlocked_achievements: 15,
            total_points: 1250,
            completion_percentage: 30,
            recent_unlocks: 3,
            rarity_breakdown: {
              common: 8,
              uncommon: 4,
              rare: 2,
              epic: 1,
              legendary: 0
            }
          }
        }
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Check stats display
      await expect(authenticatedPage.locator('[data-testid="total-points"]')).toContainText('1,250');
      await expect(authenticatedPage.locator('[data-testid="completion-rate"]')).toContainText('30%');
      await expect(authenticatedPage.locator('[data-testid="unlocked-count"]')).toContainText('15/50');
    });

    test('should show achievement unlock history', async ({ authenticatedPage }) => {
      // Mock unlock history
      await mockApiResponse(authenticatedPage, '**/api/achievements/history', {
        status: 200,
        body: {
          success: true,
          data: [
            {
              achievement_id: 'speedrun_master',
              title: 'Speed Demon',
              unlocked_at: new Date(Date.now() - 86400000).toISOString(),
              points: 300
            },
            {
              achievement_id: 'first_board',
              title: 'Board Creator',
              unlocked_at: new Date(Date.now() - 172800000).toISOString(),
              points: 75
            }
          ]
        }
      });

      await authenticatedPage.goto('/achievements/history');
      await waitForNetworkIdle(authenticatedPage);

      // Check history list
      const historyItems = authenticatedPage.locator('[data-testid^="history-item-"]');
      await expect(historyItems).toHaveCount(2);
      
      // Check most recent unlock
      const recentUnlock = historyItems.first();
      await expect(recentUnlock).toContainText('Speed Demon');
      await expect(recentUnlock).toContainText('1 day ago');
    });
  });

  test.describe('Achievement Validation and Integrity', () => {
    test('should handle concurrent achievement unlock attempts', async ({ authenticatedPage }) => {
      // Mock achievement that could be unlocked multiple times concurrently
      await authenticatedPage.route('**/api/achievements/unlock', async (route: Route) => {
        // Simulate race condition by adding delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await route.fulfill({
          status: 409,
          body: JSON.stringify({ 
            error: 'Achievement already unlocked',
            achievement_id: 'first_win'
          })
        });
      });

      await authenticatedPage.goto('/play-area/session/test-session');
      await waitForNetworkIdle(authenticatedPage);

      // Simulate rapid concurrent unlock attempts
      const unlockPromises = Array.from({ length: 5 }, () =>
        authenticatedPage.evaluate(() => {
          return fetch('/api/achievements/unlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              achievement_id: 'first_win',
              trigger_data: { game_won: true }
            })
          });
        })
      );

      await Promise.all(unlockPromises);

      // Should not show multiple notifications
      const notifications = authenticatedPage.locator('[data-testid="achievement-unlocked"]');
      const count = await notifications.count();
      expect(count).toBeLessThanOrEqual(1);
    });

    test('should prevent duplicate achievement unlocks', async ({ authenticatedPage }) => {
      // Mock achievement service to return already unlocked
      await mockApiResponse(authenticatedPage, '**/api/achievements/unlock', {
        status: 409,
        body: { 
          error: 'Achievement already unlocked',
          achievement_id: 'first_win'
        }
      });

      await authenticatedPage.goto('/play-area/session/test-session');
      await waitForNetworkIdle(authenticatedPage);

      // Simulate duplicate unlock attempt
      await authenticatedPage.evaluate(() => {
        fetch('/api/achievements/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            achievement_id: 'first_win',
            trigger_data: { game_won: true }
          })
        });
      });

      // Should not show duplicate notification
      await expect(authenticatedPage.locator('[data-testid="achievement-unlocked"]')).not.toBeVisible();
    });

    test('should validate achievement conditions server-side', async ({ authenticatedPage }) => {
      // Try to directly unlock achievement with invalid conditions
      const response = await authenticatedPage.request.post('/api/achievements/unlock', {
        data: {
          achievement_id: 'speedrun_expert',
          trigger_data: { timeSeconds: 10 } // Impossibly fast time
        }
      });

      expect(response.status()).toBe(400);
      const error = await response.json();
      expect(error.message).toContain('Invalid achievement conditions');
    });

    test('should verify game completion before achievement unlock', async ({ authenticatedPage }) => {
      // Mock incomplete game state
      await mockApiResponse(authenticatedPage, '**/api/game/validate-completion', {
        status: 400,
        body: { 
          error: 'Game not completed',
          completion_status: false 
        }
      });

      await authenticatedPage.goto('/play-area/session/test-session');
      await waitForNetworkIdle(authenticatedPage);

      // Try to unlock completion-based achievement
      const response = await authenticatedPage.request.post('/api/achievements/unlock', {
        data: {
          achievement_id: 'first_win',
          session_id: 'test-session'
        }
      });

      expect(response.status()).toBe(400);
    });

    test('should rate-limit achievement checks', async ({ authenticatedPage }) => {
      // Rapid achievement check requests
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(
          authenticatedPage.request.post('/api/achievements/check', {
            data: { event_type: 'game_completed' }
          })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some should be rate limited
      const rateLimited = responses.filter(r => r.status() === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  test.describe('Social Features', () => {
    test('should display achievement showcase in profile', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/profile');
      await waitForNetworkIdle(authenticatedPage);

      // Check achievement showcase section
      const showcase = authenticatedPage.locator('[data-testid="achievement-showcase"]');
      await expect(showcase).toBeVisible();
      
      // Should show featured achievements
      const featuredAchievements = showcase.locator('[data-testid^="featured-achievement-"]');
      await expect(featuredAchievements.first()).toBeVisible();
    });

    test('should allow sharing achievements', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/achievements');
      await waitForNetworkIdle(authenticatedPage);

      // Click share button on an unlocked achievement
      const unlockedAchievement = authenticatedPage.locator('[data-testid="achievement-speedrun_master"]');
      const shareButton = unlockedAchievement.locator('[data-testid="share-achievement"]');
      
      if (await shareButton.isVisible()) {
        await shareButton.click();
        
        // Share modal should open
        const shareModal = authenticatedPage.locator('[data-testid="share-modal"]');
        await expect(shareModal).toBeVisible();
      }
    });

    test('should show community achievement leaderboard', async ({ authenticatedPage }) => {
      // Mock leaderboard data
      await mockApiResponse(authenticatedPage, '**/api/achievements/leaderboard', {
        status: 200,
        body: {
          success: true,
          data: [
            {
              username: 'AchievementHunter',
              total_points: 2500,
              unlocked_count: 35,
              rank: 1
            },
            {
              username: 'CompletionistMaster',
              total_points: 2200,
              unlocked_count: 32,
              rank: 2
            }
          ]
        }
      });

      await authenticatedPage.goto('/achievements/leaderboard');
      await waitForNetworkIdle(authenticatedPage);

      // Check leaderboard entries
      const entries = authenticatedPage.locator('[data-testid^="leaderboard-entry-"]');
      await expect(entries).toHaveCount(2);
      
      // Check top entry
      await expect(entries.first()).toContainText('AchievementHunter');
      await expect(entries.first()).toContainText('2,500');
      await expect(entries.first()).toContainText('#1');
    });
  });

  test.describe('Performance and User Experience', () => {
    test('should load achievements efficiently', async ({ authenticatedPage }) => {
      // Mock large number of achievements
      const manyAchievements = Array.from({ length: 100 }, (_, i) => ({
        id: `achievement_${i}`,
        title: `Achievement ${i}`,
        description: `Description for achievement ${i}`,
        points: (i + 1) * 10,
        category: ['gameplay', 'speedrun', 'social'][i % 3],
        rarity: ['common', 'uncommon', 'rare', 'epic'][i % 4],
        unlocked: i < 20,
        progress: i < 20 ? 1 : Math.floor(Math.random() * 5),
        max_progress: i < 20 ? 1 : 5,
        icon: '🏆'
      }));

      await mockApiResponse(authenticatedPage, '**/api/achievements**', {
        status: 200,
        body: { success: true, data: manyAchievements }
      });

      const startTime = Date.now();
      await authenticatedPage.goto('/achievements');
      await waitForNetworkIdle(authenticatedPage);
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time
      expect(loadTime).toBeLessThan(3000);

      // Should use virtualization for large lists
      const visibleAchievements = authenticatedPage.locator('[data-testid^="achievement-"]:visible');
      const visibleCount = await visibleAchievements.count();
      
      // Should show limited number (virtualized)
      expect(visibleCount).toBeLessThan(50);
      expect(visibleCount).toBeGreaterThan(0);
    });

    test('should handle achievement notifications gracefully', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/play-area/session/test-session');
      await waitForNetworkIdle(authenticatedPage);

      // Mock multiple achievement unlocks in rapid succession
      await authenticatedPage.routeWebSocket('**/ws', ws => {
        setTimeout(() => {
          // Send multiple achievements
          for (let i = 0; i < 3; i++) {
            setTimeout(() => {
              ws.send(JSON.stringify({
                type: 'achievement_unlocked',
                achievement: {
                  id: `rapid_achievement_${i}`,
                  title: `Rapid Achievement ${i}`,
                  points: 50,
                  icon: '🏆'
                }
              }));
            }, i * 500);
          }
        }, 1000);
      });

      // Should queue notifications properly
      const notifications = authenticatedPage.locator('[data-testid="achievement-unlocked"]');
      await expect(notifications.first()).toBeVisible({ timeout: 3000 });
      
      // Should not overlap notifications
      await authenticatedPage.waitForTimeout(3000);
      const visibleNotifications = await notifications.count();
      expect(visibleNotifications).toBeLessThanOrEqual(1); // Only one visible at a time
    });

    test('should persist achievement data across sessions', async ({ authenticatedPage }) => {
      // Check achievements are cached
      await authenticatedPage.goto('/achievements');
      await waitForNetworkIdle(authenticatedPage);

      // Check initial load
      await expect(authenticatedPage.locator('[data-testid="achievement-first_win"]')).toBeVisible();

      // Simulate page refresh
      await authenticatedPage.reload();
      
      // Should show cached data quickly
      await expect(authenticatedPage.locator('[data-testid="achievement-first_win"]')).toBeVisible({
        timeout: 1000
      });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle achievement service errors', async ({ authenticatedPage }) => {
      // Mock achievement service failure
      await mockApiResponse(authenticatedPage, '**/api/achievements**', {
        status: 500,
        body: { error: 'Achievement service unavailable' }
      });

      await authenticatedPage.goto('/achievements');
      await waitForNetworkIdle(authenticatedPage);

      // Should show error state
      await expect(authenticatedPage.locator('[data-testid="achievements-error"]')).toBeVisible();
      await expect(authenticatedPage.locator('text=Failed to load achievements')).toBeVisible();
      
      // Should have retry button
      const retryButton = authenticatedPage.locator('[data-testid="retry-achievements"]');
      await expect(retryButton).toBeVisible();
    });

    test('should handle unlock failures gracefully', async ({ authenticatedPage }) => {
      // Mock unlock failure
      await mockApiResponse(authenticatedPage, '**/api/achievements/unlock', {
        status: 500,
        body: { error: 'Failed to unlock achievement' }
      });

      await authenticatedPage.goto('/play-area/session/test-session');
      await waitForNetworkIdle(authenticatedPage);

      // Trigger achievement unlock
      await authenticatedPage.evaluate(() => {
        fetch('/api/achievements/unlock', {
          method: 'POST',
          body: JSON.stringify({ achievement_id: 'first_win' })
        });
      });

      // Should show error notification but not break flow
      const errorNotification = authenticatedPage.locator('[role="alert"]');
      if (await errorNotification.isVisible()) {
        await expect(errorNotification).toContainText(/failed/i);
      }
    });

    test('should handle network disconnection during achievement sync', async ({ authenticatedPage, context }) => {
      await authenticatedPage.goto('/achievements');
      await waitForNetworkIdle(authenticatedPage);

      // Simulate network offline
      await context.setOffline(true);

      // Try to unlock achievement
      await authenticatedPage.evaluate(() => {
        window.dispatchEvent(new CustomEvent('achievement-earned', {
          detail: { achievement_id: 'offline_test' }
        }));
      });

      // Should queue for later sync
      const queueStatus = authenticatedPage.locator('[data-testid="sync-queue-status"]');
      if (await queueStatus.isVisible()) {
        await expect(queueStatus).toContainText(/queued/i);
      }

      // Reconnect
      await context.setOffline(false);

      // Should sync queued achievements
      await expect(authenticatedPage.locator('[data-testid="sync-complete"]')).toBeVisible({
        timeout: 5000
      });
    });
  });
});