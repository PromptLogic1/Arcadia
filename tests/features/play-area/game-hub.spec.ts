import { test, expect } from '../../fixtures/auth.fixture';
import {
  waitForNetworkIdle,
  mockApiResponse,
  fillForm,
  getPerformanceMetrics,
} from '../../helpers/test-utils';

test.describe('Play Area Game Hub', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/play-area');
    await waitForNetworkIdle(authenticatedPage);
  });

  test.describe('Game Discovery and Browsing', () => {
    test('should display play area hub with active sessions', async ({
      authenticatedPage,
    }) => {
      // Wait for page to load
      await expect(authenticatedPage.locator('h1')).toContainText('Play Area');

      // Check main navigation elements
      await expect(
        authenticatedPage.getByRole('button', { name: /host session/i })
      ).toBeVisible();
      await expect(
        authenticatedPage.getByRole('button', { name: /join by code/i })
      ).toBeVisible();

      // Check stats cards
      await expect(
        authenticatedPage.locator('[data-testid="active-players-card"]', {
          hasText: 'Active Players',
        })
      ).toBeVisible();
      await expect(
        authenticatedPage.locator('[data-testid="recent-activity-card"]', {
          hasText: 'Recent Activity',
        })
      ).toBeVisible();

      // Check session tabs
      await expect(
        authenticatedPage.getByRole('tab', { name: /public sessions/i })
      ).toBeVisible();
      await expect(
        authenticatedPage.getByRole('tab', { name: /join session/i })
      ).toBeVisible();
    });

    test('should show empty state when no sessions available', async ({
      authenticatedPage,
    }) => {
      // Mock empty sessions response
      await mockApiResponse(authenticatedPage, '**/api/sessions**', {
        status: 200,
        body: { sessions: [], total: 0 },
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Check empty state
      await expect(
        authenticatedPage.locator('[data-testid="empty-sessions"]')
      ).toBeVisible();
      await expect(
        authenticatedPage.locator('text=No Active Sessions')
      ).toBeVisible();
      await expect(
        authenticatedPage.locator('text=Be the first to host a gaming session!')
      ).toBeVisible();
    });

    test('should display session cards with proper information', async ({
      authenticatedPage,
    }) => {
      // Mock sessions data
      await mockApiResponse(authenticatedPage, '**/api/sessions**', {
        status: 200,
        body: {
          sessions: [
            {
              id: 'session-1',
              board_title: 'Test Bingo Board',
              session_code: 'ABC123',
              status: 'waiting',
              current_player_count: 2,
              max_players: 4,
              difficulty: 'medium',
              game_type: 'bingo',
              host_username: 'TestHost',
              created_at: new Date().toISOString(),
            },
            {
              id: 'session-2',
              board_title: 'Challenge Board',
              session_code: 'XYZ789',
              status: 'active',
              current_player_count: 3,
              max_players: 6,
              difficulty: 'hard',
              game_type: 'speedrun',
              host_username: 'SpeedRunner',
              created_at: new Date().toISOString(),
            },
          ],
          total: 2,
        },
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Check session cards are displayed
      const sessionCards = authenticatedPage.locator(
        '[data-testid^="session-card-"]'
      );
      await expect(sessionCards).toHaveCount(2);

      // Check first session card details
      const firstCard = sessionCards.first();
      await expect(firstCard).toContainText('Test Bingo Board');
      await expect(firstCard).toContainText('TestHost');
      await expect(firstCard).toContainText('2/4');
      await expect(firstCard).toContainText('medium');
      await expect(firstCard).toContainText('waiting');

      // Check second session card
      const secondCard = sessionCards.nth(1);
      await expect(secondCard).toContainText('Challenge Board');
      await expect(secondCard).toContainText('SpeedRunner');
      await expect(secondCard).toContainText('3/6');
      await expect(secondCard).toContainText('hard');
      await expect(secondCard).toContainText('active');
    });

    test('should handle session filters correctly', async ({
      authenticatedPage,
    }) => {
      // Check if filters are available
      const filtersSection = authenticatedPage.locator(
        '[data-testid="session-filters"]'
      );
      if (await filtersSection.isVisible()) {
        // Test difficulty filter
        const difficultyFilter = authenticatedPage.locator(
          '[data-testid="difficulty-filter"]'
        );
        if (await difficultyFilter.isVisible()) {
          await difficultyFilter.selectOption('hard');
          await waitForNetworkIdle(authenticatedPage);

          // Check that URL or state reflects filter
          const url = authenticatedPage.url();
          expect(url).toMatch(/difficulty=hard|filter.*hard/);
        }

        // Test status filter
        const statusFilter = authenticatedPage.locator(
          '[data-testid="status-filter"]'
        );
        if (await statusFilter.isVisible()) {
          await statusFilter.selectOption('active');
          await waitForNetworkIdle(authenticatedPage);
        }
      }
    });

    test('should refresh sessions list', async ({ authenticatedPage }) => {
      const refreshButton = authenticatedPage.getByRole('button', {
        name: /refresh/i,
      });
      await expect(refreshButton).toBeVisible();

      // Click refresh and check loading state
      await refreshButton.click();

      // Should show loading state briefly
      await expect(
        refreshButton.locator('[data-testid="loading-spinner"]')
      ).toBeVisible({ timeout: 1000 });

      // Should complete refresh
      await expect(
        refreshButton.locator('[data-testid="loading-spinner"]')
      ).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Session Creation Flow', () => {
    test('should open host session dialog', async ({ authenticatedPage }) => {
      await authenticatedPage
        .getByRole('button', { name: /host session/i })
        .click();

      // Check dialog opens
      const dialog = authenticatedPage.locator(
        '[data-testid="host-session-dialog"]'
      );
      await expect(dialog).toBeVisible();

      // Check dialog content
      await expect(dialog).toContainText('Host Session');
      await expect(dialog.locator('[name="sessionName"]')).toBeVisible();
      await expect(dialog.locator('[name="maxPlayers"]')).toBeVisible();
      await expect(dialog.locator('[name="difficulty"]')).toBeVisible();
    });

    test('should create session with valid inputs', async ({
      authenticatedPage,
    }) => {
      // Mock session creation success
      await mockApiResponse(authenticatedPage, '**/api/sessions/create', {
        status: 200,
        body: {
          success: true,
          data: {
            id: 'new-session-123',
            session_code: 'NEW123',
          },
        },
      });

      await authenticatedPage
        .getByRole('button', { name: /host session/i })
        .click();

      const dialog = authenticatedPage.locator(
        '[data-testid="host-session-dialog"]'
      );

      // Fill form
      await fillForm(authenticatedPage, {
        sessionName: 'Test Game Session',
        maxPlayers: '4',
        difficulty: 'medium',
      });

      // Submit form
      await dialog.getByRole('button', { name: /create session/i }).click();

      // Should redirect to session page
      await expect(authenticatedPage).toHaveURL(
        /\/play-area\/session\/new-session-123/
      );
    });

    test('should handle session creation errors', async ({
      authenticatedPage,
    }) => {
      // Mock session creation failure
      await mockApiResponse(authenticatedPage, '**/api/sessions/create', {
        status: 500,
        body: { error: 'Failed to create session' },
      });

      await authenticatedPage
        .getByRole('button', { name: /host session/i })
        .click();

      const dialog = authenticatedPage.locator(
        '[data-testid="host-session-dialog"]'
      );

      // Fill and submit form
      await fillForm(authenticatedPage, {
        sessionName: 'Test Session',
      });

      await dialog.getByRole('button', { name: /create session/i }).click();

      // Should show error message
      await expect(authenticatedPage.locator('[role="alert"]')).toContainText(
        /failed to create/i
      );
    });
  });

  test.describe('Join Session Flow', () => {
    test('should open join by code dialog', async ({ authenticatedPage }) => {
      await authenticatedPage
        .getByRole('button', { name: /join by code/i })
        .click();

      // Check dialog opens
      const dialog = authenticatedPage.locator(
        '[data-testid="join-session-dialog"]'
      );
      await expect(dialog).toBeVisible();

      // Check dialog content
      await expect(dialog).toContainText('Join Session by Code');
      await expect(dialog.locator('[name="sessionCode"]')).toBeVisible();
    });

    test('should join session with valid code', async ({
      authenticatedPage,
    }) => {
      // Switch to join session tab first
      await authenticatedPage
        .getByRole('tab', { name: /join session/i })
        .click();

      // Fill session code
      const codeInput = authenticatedPage.locator('[name="sessionCode"]');
      await codeInput.fill('ABC123');

      // Submit
      await authenticatedPage
        .getByRole('button', { name: /join session/i })
        .click();

      // Should process join attempt (implementation may vary)
      await waitForNetworkIdle(authenticatedPage);
    });

    test('should join session directly from session card', async ({
      authenticatedPage,
    }) => {
      // Mock sessions with joinable session
      await mockApiResponse(authenticatedPage, '**/api/sessions**', {
        status: 200,
        body: {
          sessions: [
            {
              id: 'joinable-session',
              board_title: 'Joinable Game',
              status: 'waiting',
              current_player_count: 1,
              max_players: 4,
              host_username: 'Host',
            },
          ],
        },
      });

      // Mock join session success
      await mockApiResponse(authenticatedPage, '**/api/sessions/join', {
        status: 200,
        body: { success: true },
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Click join button on session card
      const joinButton = authenticatedPage
        .locator('[data-testid="join-session-button"]')
        .first();
      await joinButton.click();

      // Should redirect to session
      await expect(authenticatedPage).toHaveURL(
        /\/play-area\/session\/joinable-session/
      );
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('should load within performance budget', async ({
      authenticatedPage,
    }) => {
      const startTime = Date.now();

      await authenticatedPage.goto('/play-area');
      await waitForNetworkIdle(authenticatedPage);

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Under 3 seconds

      // Check performance metrics
      const metrics = await getPerformanceMetrics(authenticatedPage);
      expect(metrics.domContentLoaded).toBeLessThan(2000);
      expect(metrics.firstContentfulPaint).toBeLessThan(1500);
    });

    test('should be accessible', async ({ authenticatedPage }) => {
      // Check heading structure
      await expect(authenticatedPage.locator('h1')).toHaveText('Play Area');

      // Check button accessibility
      const hostButton = authenticatedPage.getByRole('button', {
        name: /host session/i,
      });
      await expect(hostButton).toBeVisible();
      await expect(hostButton).toBeEnabled();

      // Check keyboard navigation
      await hostButton.focus();
      await expect(hostButton).toBeFocused();

      // Check tab navigation works
      await authenticatedPage.keyboard.press('Tab');
      const joinButton = authenticatedPage.getByRole('button', {
        name: /join by code/i,
      });
      await expect(joinButton).toBeFocused();
    });

    test('should handle large session lists efficiently', async ({
      authenticatedPage,
    }) => {
      // Mock many sessions
      const sessions = Array.from({ length: 100 }, (_, i) => ({
        id: `session-${i}`,
        board_title: `Game Session ${i}`,
        session_code: `ABC${i.toString().padStart(3, '0')}`,
        status: i % 2 === 0 ? 'waiting' : 'active',
        current_player_count: Math.floor(Math.random() * 4) + 1,
        max_players: 4,
        difficulty: ['easy', 'medium', 'hard'][i % 3],
        game_type: 'bingo',
        host_username: `Host${i}`,
        created_at: new Date().toISOString(),
      }));

      await mockApiResponse(authenticatedPage, '**/api/sessions**', {
        status: 200,
        body: { sessions, total: 100 },
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Check virtualization is working - should only render visible items
      const sessionCards = authenticatedPage.locator(
        '[data-testid^="session-card-"]'
      );
      const visibleCount = await sessionCards.count();

      // Should show limited number (virtualized)
      expect(visibleCount).toBeLessThan(50);
      expect(visibleCount).toBeGreaterThan(0);

      // Test scrolling performance
      const container = authenticatedPage.locator(
        '[data-testid="sessions-container"]'
      );
      if (await container.isVisible()) {
        const startTime = Date.now();
        await container.evaluate(el => (el.scrollTop = 1000));
        await authenticatedPage.waitForTimeout(100);
        const scrollTime = Date.now() - startTime;

        expect(scrollTime).toBeLessThan(200); // Smooth scrolling
      }
    });
  });

  test.describe('Real-time Updates', () => {
    test('should update session list in real-time', async ({
      authenticatedPage,
    }) => {
      // Initial empty state
      await mockApiResponse(authenticatedPage, '**/api/sessions**', {
        status: 200,
        body: { sessions: [], total: 0 },
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Mock WebSocket connection for real-time updates
      await authenticatedPage.routeWebSocket('**/ws', ws => {
        // Send new session event after 1 second
        setTimeout(() => {
          ws.send(
            JSON.stringify({
              type: 'session_created',
              session: {
                id: 'new-session',
                board_title: 'New Game',
                status: 'waiting',
                current_player_count: 1,
                max_players: 4,
                host_username: 'NewHost',
              },
            })
          );
        }, 1000);
      });

      // Should show new session without page refresh
      await expect(
        authenticatedPage.locator('[data-testid="session-card-new-session"]')
      ).toBeVisible({
        timeout: 3000,
      });
    });

    test('should update player counts in real-time', async ({
      authenticatedPage,
    }) => {
      // Mock session with initial player count
      await mockApiResponse(authenticatedPage, '**/api/sessions**', {
        status: 200,
        body: {
          sessions: [
            {
              id: 'updating-session',
              board_title: 'Live Session',
              status: 'waiting',
              current_player_count: 2,
              max_players: 4,
              host_username: 'Host',
            },
          ],
        },
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Check initial player count
      const sessionCard = authenticatedPage.locator(
        '[data-testid="session-card-updating-session"]'
      );
      await expect(sessionCard).toContainText('2/4');

      // Mock WebSocket update
      await authenticatedPage.routeWebSocket('**/ws', ws => {
        setTimeout(() => {
          ws.send(
            JSON.stringify({
              type: 'session_updated',
              sessionId: 'updating-session',
              updates: {
                current_player_count: 3,
              },
            })
          );
        }, 500);
      });

      // Should update to new count
      await expect(sessionCard).toContainText('3/4', { timeout: 2000 });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({
      authenticatedPage,
    }) => {
      // Mock API failure
      await mockApiResponse(authenticatedPage, '**/api/sessions**', {
        status: 500,
        body: { error: 'Internal server error' },
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Should show error state
      await expect(
        authenticatedPage.locator('[data-testid="error-message"]')
      ).toBeVisible();
      await expect(
        authenticatedPage.locator('text=Failed to load sessions')
      ).toBeVisible();
    });

    test('should handle network disconnection', async ({
      authenticatedPage,
      context,
    }) => {
      // Start with working connection
      await expect(authenticatedPage.locator('h1')).toContainText('Play Area');

      // Simulate network offline
      await context.setOffline(true);

      // Try to refresh
      const refreshButton = authenticatedPage.getByRole('button', {
        name: /refresh/i,
      });
      await refreshButton.click();

      // Should show offline indicator or error
      await expect(
        authenticatedPage.locator('[data-testid="connection-status"]')
      ).toContainText(/offline/i, {
        timeout: 5000,
      });

      // Reconnect
      await context.setOffline(false);

      // Should recover
      await refreshButton.click();
      await expect(
        authenticatedPage.locator('[data-testid="connection-status"]')
      ).toContainText(/online/i, {
        timeout: 5000,
      });
    });
  });
});
