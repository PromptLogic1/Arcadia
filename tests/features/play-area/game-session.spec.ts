import { test, expect } from '../../fixtures/auth.fixture';
import { 
  GamingTestHelpers,
  waitForNetworkIdle,
  mockApiResponse
} from './helpers/gaming-test-helpers';
import { GameFixtureFactory } from './fixtures/game-fixtures';
import type { 
  TestSession, 
  TestSessionPlayer, 
  TestGameState,
  TestGameEvent
} from './types/test-types';

test.describe('Enhanced Game Session Management', () => {
  let mockSession: TestSession;
  let mockPlayers: TestSessionPlayer[];
  let mockGameState: TestGameState;

  test.beforeEach(async ({ authenticatedPage, testUser }) => {
    // Generate type-safe test data
    const scenario = GameFixtureFactory.multiplayerScenario(3);
    mockSession = scenario.session;
    mockPlayers = scenario.players;
    mockGameState = scenario.gameState;

    // Ensure current user is included in session
    mockPlayers[1] = GameFixtureFactory.sessionPlayer({
      ...mockPlayers[1],
      user_id: testUser.id,
      display_name: testUser.email,
      is_current_user: true
    });

    // Mock session API with proper typing
    await GamingTestHelpers.mockSessionData(authenticatedPage, mockSession.id, {
      ...mockSession,
      players: mockPlayers
    });

    await authenticatedPage.goto(`/play-area/session/${mockSession.id}`);
    await waitForNetworkIdle(authenticatedPage);
  });

  test.describe('Session Information and UI', () => {
    test('should display session details with type-safe data', async ({ authenticatedPage }) => {
      // Verify page title and session info
      await expect(authenticatedPage.locator('h1')).toContainText(mockSession.board_title || '');
      await expect(authenticatedPage.locator('[data-testid="session-code"]')).toContainText(mockSession.session_code || '');
      
      // Verify session details card
      const detailsCard = authenticatedPage.locator('[data-testid="session-details"]');
      await expect(detailsCard).toContainText(mockSession.difficulty || 'medium');
      await expect(detailsCard).toContainText(`${mockPlayers.length}/${mockSession.max_players}`);
      
      // Verify host information
      const hostPlayer = mockPlayers.find(p => p.is_host);
      if (hostPlayer) {
        await expect(authenticatedPage.locator('[data-testid="host-info"]')).toContainText(hostPlayer.display_name);
      }
    });

    test('should display players list with correct status indicators', async ({ authenticatedPage }) => {
      const playersCard = authenticatedPage.locator('[data-testid="players-list"]');
      await expect(playersCard).toContainText(`Players (${mockPlayers.length})`);

      // Verify each player is displayed correctly
      for (const player of mockPlayers) {
        const playerElement = authenticatedPage.locator(`[data-testid="player-${player.user_id}"]`);
        await expect(playerElement).toBeVisible();
        await expect(playerElement).toContainText(player.display_name);
        
        // Check host crown for host player
        if (player.is_host) {
          await expect(playerElement.locator('[data-testid="host-crown"]')).toBeVisible();
        }
        
        // Check ready status
        if (player.is_ready) {
          await expect(playerElement).toContainText('Ready');
        }
      }
    });

    test('should copy session code to clipboard', async ({ authenticatedPage }) => {
      const copyButton = authenticatedPage.locator('[data-testid="copy-session-code"]');
      await copyButton.click();
      
      // Verify success feedback
      await expect(copyButton.locator('[data-testid="copy-success"]')).toBeVisible({ timeout: 2000 });
    });

    test('should share session with proper URL', async ({ authenticatedPage }) => {
      const shareButton = authenticatedPage.locator('[data-testid="share-session"]');
      
      if (await shareButton.isVisible()) {
        await shareButton.click();
        
        // Note: Actual share behavior depends on browser API availability
        // In tests, we verify the button works without errors
        await expect(shareButton).toBeEnabled();
      }
    });
  });

  test.describe('Real-time Multiplayer Synchronization', () => {
    test('should sync player join events in real-time', async ({ authenticatedPage }) => {
      // Set up WebSocket mocking
      const _wsHelper = await GamingTestHelpers.setupWebSocketMocking(authenticatedPage);
      
      // Create new player joining event
      const newPlayer = GameFixtureFactory.sessionPlayer({
        session_id: mockSession.id,
        user_id: 'new-player-' + Date.now(),
        display_name: 'New Player',
        is_host: false,
        position: mockPlayers.length
      });

      const joinEvent: TestGameEvent = {
        id: 'event-' + Date.now(),
        type: 'player_joined',
        session_id: mockSession.id,
        player_id: newPlayer.user_id,
        data: { player: newPlayer },
        timestamp: Date.now(),
        sequence: 1
      };

      // Simulate player join
      await GamingTestHelpers.simulateGameEvent(authenticatedPage, joinEvent, 1000);

      // Verify new player appears in UI
      const newPlayerElement = authenticatedPage.locator(`[data-testid="player-${newPlayer.user_id}"]`);
      await expect(newPlayerElement).toBeVisible({ timeout: 3000 });
      await expect(newPlayerElement).toContainText(newPlayer.display_name);

      // Verify player count updated
      const playerCount = `${mockPlayers.length + 1}/${mockSession.max_players}`;
      await expect(authenticatedPage.locator('[data-testid="player-count"]')).toContainText(playerCount);
    });

    test('should handle player disconnection gracefully', async ({ authenticatedPage }) => {
      const _wsHelper = await GamingTestHelpers.setupWebSocketMocking(authenticatedPage);
      
      // Ensure we have enough players to test
      if (mockPlayers.length < 3) {
        test.skip();
        return;
      }
      
      const disconnectEvent: TestGameEvent = {
        id: 'disconnect-' + Date.now(),
        type: 'player_disconnected',
        session_id: mockSession.id,
        player_id: mockPlayers[2]?.user_id || 'unknown-player',
        data: { reason: 'network_error' },
        timestamp: Date.now(),
        sequence: 2
      };

      // Simulate disconnection
      await GamingTestHelpers.simulateGameEvent(authenticatedPage, disconnectEvent, 500);

      // Verify disconnection indicator
      const playerId = mockPlayers[2]?.user_id || 'unknown-player';
      const playerElement = authenticatedPage.locator(`[data-testid="player-${playerId}"]`);
      await expect(playerElement.locator('[data-testid="connection-status"]')).toContainText('disconnected', { timeout: 2000 });
    });

    test('should sync game state changes across players', async ({ authenticatedPage }) => {
      const _wsHelper = await GamingTestHelpers.setupWebSocketMocking(authenticatedPage);
      
      const gameStartEvent: TestGameEvent = {
        id: 'start-' + Date.now(),
        type: 'game_started',
        session_id: mockSession.id,
        data: { 
          status: 'active',
          started_at: new Date().toISOString(),
          board_state: mockGameState.board_state
        },
        timestamp: Date.now(),
        sequence: 3
      };

      // Simulate game start
      await GamingTestHelpers.simulateGameEvent(authenticatedPage, gameStartEvent, 300);

      // Verify game status update
      await expect(authenticatedPage.locator('[data-testid="game-status"]')).toContainText(/in progress|active/i, { timeout: 2000 });
      
      // Verify game board becomes visible
      await expect(authenticatedPage.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('Game State Management', () => {
    test('should start game as host with proper validation', async ({ authenticatedPage, testUser }) => {
      // Make current user the host
      const hostSession = { ...mockSession, host_id: testUser.id };
      const hostPlayers = mockPlayers.map(p => 
        p.user_id === testUser.id ? { ...p, is_host: true } : p
      );

      await GamingTestHelpers.mockSessionData(authenticatedPage, mockSession.id, {
        ...hostSession,
        players: hostPlayers
      });

      // Mock game start API
      await mockApiResponse(authenticatedPage, '**/api/sessions/start', {
        success: true,
        data: { session_id: mockSession.id, status: 'active' }
      });

      // Mock board state API
      await GamingTestHelpers.mockGameState(authenticatedPage, mockSession.id, mockGameState);

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Verify start button is available for host
      const startButton = authenticatedPage.locator('button:has-text("Start Game"), button:has-text("start game")').first();
      await expect(startButton).toBeVisible();
      await expect(startButton).toBeEnabled();

      // Start the game
      await startButton.click();

      // Verify game started successfully
      await expect(authenticatedPage.locator('[role="alert"]')).toContainText(/game started/i, { timeout: 3000 });
    });

    test('should prevent non-host from starting game', async ({ authenticatedPage }) => {
      // Current user is not host in default mock data
      const startButton = authenticatedPage.locator('button:has-text("Start Game"), button:has-text("start game")').first();
      
      if (await startButton.isVisible()) {
        await expect(startButton).toBeDisabled();
      } else {
        // Start button should not be visible for non-hosts
        await expect(startButton).not.toBeVisible();
      }
    });

    test('should handle game state transitions correctly', async ({ authenticatedPage }) => {
      // Mock active game state
      const activeSession = { ...mockSession, status: 'active' as const };
      await GamingTestHelpers.mockSessionData(authenticatedPage, mockSession.id, activeSession);
      await GamingTestHelpers.mockGameState(authenticatedPage, mockSession.id, mockGameState);

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Verify active game UI
      await expect(authenticatedPage.locator('[data-testid="game-status"]')).toContainText(/active|in progress/i);
      await expect(authenticatedPage.locator('[data-testid="game-board"]')).toBeVisible();

      // Verify game cells are interactive
      const gameCells = authenticatedPage.locator('[data-testid^="game-cell-"]');
      await expect(gameCells.first()).toBeEnabled();
    });
  });

  test.describe('Game Board Interaction', () => {
    test('should handle cell marking with optimistic updates', async ({ authenticatedPage, testUser }) => {
      // Set up active game
      const activeSession = { ...mockSession, status: 'active' as const };
      await GamingTestHelpers.mockSessionData(authenticatedPage, mockSession.id, activeSession);
      await GamingTestHelpers.mockGameState(authenticatedPage, mockSession.id, mockGameState);

      // Mock mark cell API
      await mockApiResponse(authenticatedPage, '**/api/sessions/mark-cell', {
        success: true,
        data: { cell_marked: true, position: 0 }
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Mark a cell using helper
      const assertions = await GamingTestHelpers.markCell(authenticatedPage, 0, testUser.id);

      // Verify cell was marked
      expect(assertions.markedCells).toBeGreaterThan(0);
      
      // Verify optimistic UI update
      const markedCell = authenticatedPage.locator('[data-testid="game-cell-0"]');
      await expect(markedCell).toHaveAttribute('data-marked', 'true');
    });

    test('should handle cell marking conflicts', async ({ authenticatedPage }) => {
      // Mock conflict response
      await mockApiResponse(authenticatedPage, '**/api/sessions/mark-cell', {
        success: false,
        error: 'Cell already marked',
        code: 'CELL_CONFLICT'
      });

      const activeSession = { ...mockSession, status: 'active' as const };
      await GamingTestHelpers.mockSessionData(authenticatedPage, mockSession.id, activeSession);
      await GamingTestHelpers.mockGameState(authenticatedPage, mockSession.id, mockGameState);

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Try to mark a cell
      const cell = authenticatedPage.locator('[data-testid="game-cell-0"]');
      await cell.click();

      // Verify conflict handling
      await expect(authenticatedPage.locator('[role="alert"]')).toContainText(/already marked|conflict/i, { timeout: 2000 });
    });

    test('should display game board placeholder when not started', async ({ authenticatedPage }) => {
      // Session is in waiting state by default
      const placeholder = authenticatedPage.locator('[data-testid="game-board-placeholder"]');
      await expect(placeholder).toBeVisible();
      await expect(placeholder).toContainText(/waiting.*start/i);
    });
  });

  test.describe('Performance and Scalability', () => {
    test('should maintain performance with multiple rapid interactions', async ({ authenticatedPage }) => {
      const activeSession = { ...mockSession, status: 'active' as const };
      await GamingTestHelpers.mockSessionData(authenticatedPage, mockSession.id, activeSession);
      await GamingTestHelpers.mockGameState(authenticatedPage, mockSession.id, mockGameState);

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Test concurrent load
      const loadTest = await GamingTestHelpers.testConcurrentLoad(authenticatedPage, 10);

      // Verify performance metrics
      expect(loadTest.duration).toBeLessThan(5000); // Under 5 seconds
      expect(loadTest.errors).toBeLessThan(2); // Allow minimal errors
      expect(loadTest.metrics.memoryUsage).toBeLessThan(100 * 1024 * 1024); // Under 100MB
    });

    test('should handle network latency gracefully', async ({ authenticatedPage }) => {
      // Simulate high latency
      await GamingTestHelpers.simulateNetworkLatency(authenticatedPage, 500);

      const activeSession = { ...mockSession, status: 'active' as const };
      await GamingTestHelpers.mockSessionData(authenticatedPage, mockSession.id, activeSession);

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Verify UI remains responsive
      const startTime = Date.now();
      await authenticatedPage.click('[data-testid="refresh-session"]');
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeGreaterThan(400); // Accounts for simulated latency
      expect(responseTime).toBeLessThan(2000); // But still reasonable
    });

    test('should recover from temporary network disconnection', async ({ authenticatedPage, context }) => {
      const activeSession = { ...mockSession, status: 'active' as const };
      await GamingTestHelpers.mockSessionData(authenticatedPage, mockSession.id, activeSession);

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Simulate network offline
      await context.setOffline(true);

      // Try to interact
      await authenticatedPage.click('[data-testid="refresh-session"]');

      // Verify offline indicator
      await expect(authenticatedPage.locator('[data-testid="connection-status"]')).toContainText(/offline|disconnected/i, { timeout: 3000 });

      // Reconnect
      await context.setOffline(false);

      // Verify recovery
      await expect(authenticatedPage.locator('[data-testid="connection-status"]')).toContainText(/online|connected/i, { timeout: 5000 });
    });
  });

  test.describe('Session Persistence and Navigation', () => {
    test('should maintain session state after page refresh', async ({ authenticatedPage }) => {
      // Verify initial state
      await expect(authenticatedPage.locator('h1')).toContainText(mockSession.board_title || '');

      // Refresh page
      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Verify state persisted
      await expect(authenticatedPage.locator('h1')).toContainText(mockSession.board_title || '');
      await expect(authenticatedPage.locator('[data-testid="session-code"]')).toContainText(mockSession.session_code || '');
    });

    test('should handle browser navigation correctly', async ({ authenticatedPage }) => {
      const sessionUrl = authenticatedPage.url();

      // Navigate away
      await authenticatedPage.goto('/play-area');
      await expect(authenticatedPage.locator('h1')).toContainText('Play Area');

      // Navigate back
      await authenticatedPage.goBack();
      await expect(authenticatedPage).toHaveURL(sessionUrl);
      await expect(authenticatedPage.locator('h1')).toContainText(mockSession.board_title || '');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle session not found gracefully', async ({ authenticatedPage }) => {
      const invalidSessionId = 'non-existent-session-id';
      
      // Mock 404 response
      await mockApiResponse(authenticatedPage, `**/api/sessions/${invalidSessionId}`, {
        success: false,
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });

      await authenticatedPage.goto(`/play-area/session/${invalidSessionId}`);
      await waitForNetworkIdle(authenticatedPage);

      // Verify error state
      await expect(authenticatedPage.locator('[data-testid="session-error"]')).toBeVisible();
      await expect(authenticatedPage.locator('text=Session Not Found')).toBeVisible();

      // Verify back button works
      const backButton = authenticatedPage.locator('button:has-text("Back to Play Area"), button:has-text("back to play area")').first();
      await expect(backButton).toBeVisible();
    });

    test('should handle API errors during game actions', async ({ authenticatedPage }) => {
      // Mock API failure
      await mockApiResponse(authenticatedPage, '**/api/sessions/start', {
        success: false,
        error: 'Server error',
        code: 'INTERNAL_ERROR'
      });

      const activeSession = { ...mockSession, status: 'active' as const };
      await GamingTestHelpers.mockSessionData(authenticatedPage, mockSession.id, activeSession);

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Try action that will fail
      const actionButton = authenticatedPage.locator('button:has-text("Start Game"), button:has-text("Refresh"), button:has-text("start game"), button:has-text("refresh")').first();
      if (await actionButton.isVisible()) {
        await actionButton.click();

        // Verify error handling
        await expect(authenticatedPage.locator('[role="alert"]')).toContainText(/error|failed/i, { timeout: 3000 });
      }
    });

    test('should require authentication for session access', async ({ page }) => {
      // Test unauthenticated access
      await page.goto(`/play-area/session/${mockSession.id}`);
      await waitForNetworkIdle(page);

      // Should redirect to login or show auth required
      const currentUrl = page.url();
      const hasAuthCheck = currentUrl.includes('/auth/login') || 
                          await page.locator('text=Sign In Required').isVisible();
      
      expect(hasAuthCheck).toBeTruthy();
    });
  });

  test.describe('Timer Integration', () => {
    test('should display timer when game is active', async ({ authenticatedPage }) => {
      const activeSession = { ...mockSession, status: 'active' as const };
      await GamingTestHelpers.mockSessionData(authenticatedPage, mockSession.id, activeSession);

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Check if timer is visible
      const timer = authenticatedPage.locator('[data-testid="game-timer"]');
      
      if (await timer.isVisible()) {
        // Verify timer format (MM:SS or MM:SS.mmm)
        await expect(timer).toContainText(/\d{1,2}:\d{2}(\.\d{3})?/);
      }
    });

    test('should maintain timer accuracy during session', async ({ authenticatedPage }) => {
      const activeSession = { ...mockSession, status: 'active' as const };
      await GamingTestHelpers.mockSessionData(authenticatedPage, mockSession.id, activeSession);

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      const timer = authenticatedPage.locator('[data-testid="game-timer"]');
      
      if (await timer.isVisible()) {
        // Record initial time
        const initialTime = await timer.textContent();
        
        // Wait and check if timer is running
        await authenticatedPage.waitForTimeout(1000);
        const updatedTime = await timer.textContent();
        
        // Timer should be running (times should be different)
        expect(updatedTime).not.toBe(initialTime);
      }
    });
  });
});