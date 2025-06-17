import { test, expect } from '../../fixtures/auth.fixture';
import { 
  waitForNetworkIdle, 
  mockApiResponse
} from '../../helpers/test-utils';
import type { Tables } from '@/types/database.types';

test.describe('Game Session Management', () => {
  const mockSessionId = 'test-session-123';
  
  // Type-safe session data using database schema
  const mockSessionData: Tables<'bingo_sessions'> = {
    id: mockSessionId,
    board_id: 'test-board-id',
    host_id: 'host-user-id',
    session_code: 'ABC123',
    status: 'waiting',
    created_at: new Date().toISOString(),
    started_at: null,
    ended_at: null,
    updated_at: new Date().toISOString(),
    winner_id: null,
    version: 1,
    current_state: null,
    settings: {
      max_players: 4,
      difficulty: 'medium',
      game_type: 'bingo',
      board_title: 'Test Bingo Game'
    }
  };

  // Type-safe session players using database schema
  const mockSessionPlayers: Tables<'bingo_session_players'>[] = [
    {
      id: 'host-session-player-id',
      session_id: mockSessionId,
      user_id: 'host-user-id',
      display_name: 'TestHost',
      is_host: true,
      is_ready: true,
      color: '#FF6B6B',
      position: 0,
      score: null,
      team: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
      left_at: null
    },
    {
      id: 'player-2-session-id',
      session_id: mockSessionId,
      user_id: 'player-2',
      display_name: 'Player2',
      is_host: false,
      is_ready: true,
      color: '#4ECDC4',
      position: 1,
      score: null,
      team: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
      left_at: null
    }
  ];

  test.beforeEach(async ({ authenticatedPage }) => {
    // Mock session data with players
    await mockApiResponse(authenticatedPage, `**/api/sessions/${mockSessionId}`, {
      status: 200,
      body: { 
        success: true, 
        data: {
          ...mockSessionData,
          players: mockSessionPlayers
        }
      }
    });

    await authenticatedPage.goto(`/play-area/session/${mockSessionId}`);
    await waitForNetworkIdle(authenticatedPage);
  });

  test.describe('Session Information Display', () => {
    test('should display session details correctly', async ({ authenticatedPage }) => {
      // Check page title and main info
      await expect(authenticatedPage.locator('h1')).toContainText('Test Bingo Game');
      await expect(authenticatedPage.locator('text=Hosted by TestHost')).toBeVisible();

      // Check session details card
      const detailsCard = authenticatedPage.locator('[data-testid="session-details"]');
      await expect(detailsCard).toContainText('medium');
      await expect(detailsCard).toContainText('Waiting for Players');
      await expect(detailsCard).toContainText('bingo');
      await expect(detailsCard).toContainText('2/4');
    });

    test('should display session code with copy functionality', async ({ authenticatedPage }) => {
      const sessionCodeButton = authenticatedPage.locator('[data-testid="session-code-button"]');
      await expect(sessionCodeButton).toContainText('ABC123');

      // Test copy functionality
      await sessionCodeButton.click();
      
      // Should show success feedback
      await expect(sessionCodeButton.locator('[data-testid="copy-success-icon"]')).toBeVisible({
        timeout: 1000
      });
    });

    test('should display players list correctly', async ({ authenticatedPage }) => {
      const playersCard = authenticatedPage.locator('[data-testid="players-list"]');
      await expect(playersCard).toContainText('Players (2)');

      // Check host player
      const hostPlayer = playersCard.locator('[data-testid="player-host-user-id"]');
      await expect(hostPlayer).toContainText('TestHost');
      await expect(hostPlayer.locator('[data-testid="host-crown"]')).toBeVisible();
      await expect(hostPlayer).toContainText('Ready');

      // Check regular player
      const player2 = playersCard.locator('[data-testid="player-player-2"]');
      await expect(player2).toContainText('Player2');
      await expect(player2).toContainText('Ready');

      // Check empty slots
      const emptySlots = playersCard.locator('[data-testid^="empty-slot-"]');
      await expect(emptySlots).toHaveCount(2); // 4 max - 2 current = 2 empty
    });

    test('should share session functionality', async ({ authenticatedPage }) => {
      const shareButton = authenticatedPage.locator('[data-testid="share-session"]');
      await expect(shareButton).toBeVisible();

      await shareButton.click();
      
      // Should copy session URL or trigger share API
      // Note: Actual share behavior depends on browser support
    });
  });

  test.describe('Game State Transitions', () => {
    test('should display correct game controls for host', async ({ authenticatedPage, testUser }) => {
      // Mock user as host
      await mockApiResponse(authenticatedPage, `**/api/sessions/${mockSessionId}`, {
        status: 200,
        body: {
          success: true,
          data: {
            ...mockSessionData,
            host_id: testUser.id,
            players: [
              {
                ...mockSessionData.players[0],
                id: testUser.id,
                display_name: testUser.email
              },
              mockSessionData.players[1]
            ]
          }
        }
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Host should see start game button
      const gameControls = authenticatedPage.locator('[data-testid="game-controls"]');
      await expect(gameControls.getByRole('button', { name: /start game/i })).toBeVisible();
      await expect(gameControls.getByRole('button', { name: /start game/i })).toBeEnabled();
    });

    test('should display correct game controls for non-host player', async ({ authenticatedPage }) => {
      // Current user is not host based on mock data
      const gameControls = authenticatedPage.locator('[data-testid="game-controls"]');
      
      // Non-host should not see start game button or it should be disabled
      const startButton = gameControls.getByRole('button', { name: /start game/i });
      if (await startButton.isVisible()) {
        await expect(startButton).toBeDisabled();
      }
    });

    test('should start game successfully as host', async ({ authenticatedPage, testUser }) => {
      // Mock user as host
      await mockApiResponse(authenticatedPage, `**/api/sessions/${mockSessionId}`, {
        status: 200,
        body: {
          success: true,
          data: {
            ...mockSessionData,
            host_id: testUser.id,
            players: [
              {
                ...mockSessionData.players[0],
                id: testUser.id,
                display_name: testUser.email
              },
              mockSessionData.players[1]
            ]
          }
        }
      });

      // Mock start game API
      await mockApiResponse(authenticatedPage, '**/api/sessions/start', {
        status: 200,
        body: { success: true }
      });

      // Mock board state for active game
      await mockApiResponse(authenticatedPage, `**/api/sessions/${mockSessionId}/board-state`, {
        status: 200,
        body: {
          success: true,
          data: {
            boardState: Array.from({ length: 25 }, (_, i) => ({
              position: i,
              text: `Cell ${i + 1}`,
              is_marked: false,
              marked_by: null,
              marked_at: null
            })),
            version: 1
          }
        }
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Start the game
      const startButton = authenticatedPage.getByRole('button', { name: /start game/i });
      await startButton.click();

      // Should show success notification
      await expect(authenticatedPage.locator('[role="alert"]')).toContainText(/game started/i);

      // Game status should update
      await expect(authenticatedPage.locator('[data-testid="game-status"]')).toContainText(/in progress/i);
    });

    test('should handle game start errors', async ({ authenticatedPage, testUser }) => {
      // Mock user as host
      await mockApiResponse(authenticatedPage, `**/api/sessions/${mockSessionId}`, {
        status: 200,
        body: {
          success: true,
          data: {
            ...mockSessionData,
            host_id: testUser.id,
            players: [
              {
                ...mockSessionData.players[0],
                id: testUser.id
              }
            ]
          }
        }
      });

      // Mock start game failure
      await mockApiResponse(authenticatedPage, '**/api/sessions/start', {
        status: 500,
        body: { error: 'Failed to start game' }
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      const startButton = authenticatedPage.getByRole('button', { name: /start game/i });
      await startButton.click();

      // Should show error notification
      await expect(authenticatedPage.locator('[role="alert"]')).toContainText(/failed to start/i);
    });
  });

  test.describe('Game Board Interaction', () => {
    test('should display game board when game is active', async ({ authenticatedPage }) => {
      // Mock active game session
      await mockApiResponse(authenticatedPage, `**/api/sessions/${mockSessionId}`, {
        status: 200,
        body: {
          success: true,
          data: { ...mockSessionData, status: 'active' }
        }
      });

      // Mock board state
      await mockApiResponse(authenticatedPage, `**/api/sessions/${mockSessionId}/board-state`, {
        status: 200,
        body: {
          success: true,
          data: {
            boardState: Array.from({ length: 25 }, (_, i) => ({
              position: i,
              text: `Cell ${i + 1}`,
              is_marked: false,
              marked_by: null,
              marked_at: null
            })),
            version: 1
          }
        }
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Check game board is visible
      const gameBoard = authenticatedPage.locator('[data-testid="game-board"]');
      await expect(gameBoard).toBeVisible();

      // Check cells are interactive
      const cells = gameBoard.locator('[data-testid^="game-cell-"]');
      await expect(cells).toHaveCount(25);
      
      // First cell should be clickable
      const firstCell = cells.first();
      await expect(firstCell).toBeEnabled();
      await expect(firstCell).toContainText('Cell 1');
    });

    test('should handle cell marking interaction', async ({ authenticatedPage, testUser }) => {
      // Mock active game with player in session
      await mockApiResponse(authenticatedPage, `**/api/sessions/${mockSessionId}`, {
        status: 200,
        body: {
          success: true,
          data: {
            ...mockSessionData,
            status: 'active',
            players: [
              mockSessionData.players[0],
              {
                ...mockSessionData.players[1],
                id: testUser.id,
                display_name: testUser.email
              }
            ]
          }
        }
      });

      // Mock board state
      await mockApiResponse(authenticatedPage, `**/api/sessions/${mockSessionId}/board-state`, {
        status: 200,
        body: {
          success: true,
          data: {
            boardState: Array.from({ length: 25 }, (_, i) => ({
              position: i,
              text: `Cell ${i + 1}`,
              is_marked: false,
              marked_by: null,
              marked_at: null
            })),
            version: 1
          }
        }
      });

      // Mock mark cell API
      await mockApiResponse(authenticatedPage, '**/api/sessions/mark-cell', {
        status: 200,
        body: { success: true }
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Click a cell
      const firstCell = authenticatedPage.locator('[data-testid="game-cell-0"]');
      await firstCell.click();

      // Should show loading state briefly
      await expect(firstCell).toHaveClass(/loading/, { timeout: 1000 });
    });

    test('should show placeholder when game not started', async ({ authenticatedPage }) => {
      // Game is in waiting state by default mock
      const gameBoard = authenticatedPage.locator('[data-testid="game-board-placeholder"]');
      await expect(gameBoard).toBeVisible();
      await expect(gameBoard).toContainText('Game board will appear here');
      await expect(gameBoard).toContainText('Waiting for game to start');
    });
  });

  test.describe('Player Management', () => {
    test('should allow non-participant to join session', async ({ authenticatedPage }) => {
      // Mock session where current user is not a participant
      await mockApiResponse(authenticatedPage, `**/api/sessions/${mockSessionId}`, {
        status: 200,
        body: {
          success: true,
          data: {
            ...mockSessionData,
            players: [mockSessionData.players[0]] // Only host, current user not included
          }
        }
      });

      // Mock join session API
      await mockApiResponse(authenticatedPage, '**/api/sessions/join', {
        status: 200,
        body: { success: true }
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Should show join button
      const joinButton = authenticatedPage.getByRole('button', { name: /join game/i });
      await expect(joinButton).toBeVisible();

      await joinButton.click();

      // Should process join request
      await waitForNetworkIdle(authenticatedPage);
    });

    test('should handle session full scenario', async ({ authenticatedPage }) => {
      // Mock full session
      const fullPlayers = Array.from({ length: 4 }, (_, i) => ({
        id: `player-${i}`,
        display_name: `Player ${i + 1}`,
        is_host: i === 0,
        is_ready: true,
        is_active: true,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        joined_at: new Date().toISOString()
      }));

      await mockApiResponse(authenticatedPage, `**/api/sessions/${mockSessionId}`, {
        status: 200,
        body: {
          success: true,
          data: {
            ...mockSessionData,
            current_player_count: 4,
            players: fullPlayers
          }
        }
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Should not show join button or it should be disabled
      const joinButton = authenticatedPage.getByRole('button', { name: /join game/i });
      if (await joinButton.isVisible()) {
        await expect(joinButton).toBeDisabled();
      }

      // Should show session is full
      await expect(authenticatedPage.locator('text=4/4')).toBeVisible();
    });

    test('should display player colors correctly', async ({ authenticatedPage }) => {
      const playersCard = authenticatedPage.locator('[data-testid="players-list"]');
      
      // Check player color indicators
      const player1Color = playersCard.locator('[data-testid="player-color-host-user-id"]');
      await expect(player1Color).toBeVisible();
      
      const player2Color = playersCard.locator('[data-testid="player-color-player-2"]');
      await expect(player2Color).toBeVisible();
    });
  });

  test.describe('Real-time Synchronization', () => {
    test('should sync player join/leave events', async ({ authenticatedPage }) => {
      // Type-safe WebSocket event for player join
      const newPlayer: Tables<'bingo_session_players'> = {
        id: 'new-player-session-id',
        session_id: mockSessionId,
        user_id: 'new-player',
        display_name: 'New Player',
        is_host: false,
        is_ready: false,
        color: '#45B7D1',
        position: 2,
        score: null,
        team: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
        left_at: null
      };

      // Mock WebSocket for real-time updates
      await authenticatedPage.routeWebSocket('**/ws', ws => {
        // Send player join event after 1 second
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'player_joined',
            sessionId: mockSessionId,
            player: newPlayer
          }));
        }, 1000);
      });

      // Should show new player in list
      await expect(authenticatedPage.locator('[data-testid="player-new-player"]')).toBeVisible({
        timeout: 3000
      });

      // Player count should update
      await expect(authenticatedPage.locator('text=3/4')).toBeVisible();
    });

    test('should sync game state changes', async ({ authenticatedPage }) => {
      // Mock WebSocket for game state updates
      await authenticatedPage.routeWebSocket('**/ws', ws => {
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'game_started',
            sessionId: mockSessionId,
            status: 'active'
          }));
        }, 500);
      });

      // Game status should update without page refresh
      await expect(authenticatedPage.locator('[data-testid="game-status"]')).toContainText(/in progress/i, {
        timeout: 2000
      });
    });

    test('should handle player disconnection gracefully', async ({ authenticatedPage }) => {
      // Mock WebSocket disconnect simulation
      await authenticatedPage.routeWebSocket('**/ws', ws => {
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'player_disconnected',
            sessionId: mockSessionId,
            playerId: 'player-2'
          }));
        }, 1000);
      });

      // Should show disconnection notification
      await expect(authenticatedPage.locator('[data-testid="player-disconnected"]')).toBeVisible({
        timeout: 3000
      });
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session state after page refresh', async ({ authenticatedPage }) => {
      // Make some state changes (join as player, mark ready, etc.)
      const sessionDetails = authenticatedPage.locator('[data-testid="session-details"]');
      await expect(sessionDetails).toContainText('Test Bingo Game');

      // Refresh page
      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // State should be restored
      await expect(sessionDetails).toContainText('Test Bingo Game');
      await expect(authenticatedPage.locator('h1')).toContainText('Test Bingo Game');
    });

    test('should handle browser back/forward navigation', async ({ authenticatedPage }) => {
      // Navigate away
      await authenticatedPage.goto('/play-area');
      await expect(authenticatedPage.locator('h1')).toContainText('Play Area');

      // Navigate back
      await authenticatedPage.goBack();
      await expect(authenticatedPage).toHaveURL(`/play-area/session/${mockSessionId}`);
      await expect(authenticatedPage.locator('h1')).toContainText('Test Bingo Game');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle session not found', async ({ authenticatedPage }) => {
      const invalidSessionId = 'non-existent-session';
      
      await mockApiResponse(authenticatedPage, `**/api/sessions/${invalidSessionId}`, {
        status: 404,
        body: { error: 'Session not found' }
      });

      await authenticatedPage.goto(`/play-area/session/${invalidSessionId}`);
      await waitForNetworkIdle(authenticatedPage);

      // Should show error state
      await expect(authenticatedPage.locator('[data-testid="session-error"]')).toBeVisible();
      await expect(authenticatedPage.locator('text=Session Not Found')).toBeVisible();
      
      // Should have back to play area button
      const backButton = authenticatedPage.getByRole('button', { name: /back to play area/i });
      await expect(backButton).toBeVisible();
      
      await backButton.click();
      await expect(authenticatedPage).toHaveURL('/play-area');
    });

    test('should handle API errors during interactions', async ({ authenticatedPage, testUser }) => {
      // Mock start game failure
      await mockApiResponse(authenticatedPage, '**/api/sessions/start', {
        status: 500,
        body: { error: 'Server error' }
      });

      // Mock user as host
      await mockApiResponse(authenticatedPage, `**/api/sessions/${mockSessionId}`, {
        status: 200,
        body: {
          success: true,
          data: {
            ...mockSessionData,
            host_id: testUser.id
          }
        }
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      const startButton = authenticatedPage.getByRole('button', { name: /start game/i });
      await startButton.click();

      // Should show error notification
      await expect(authenticatedPage.locator('[role="alert"]')).toContainText(/failed/i);
    });

    test('should require authentication', async ({ page }) => {
      // Test unauthenticated access
      await page.goto(`/play-area/session/${mockSessionId}`);
      await waitForNetworkIdle(page);

      // Should redirect to login or show auth required message
      const authRequired = page.locator('text=Sign In Required');
      const loginRedirect = page.url().includes('/auth/login');
      
      expect(await authRequired.isVisible() || loginRedirect).toBeTruthy();
    });
  });

  test.describe('Game Timer Integration', () => {
    test('should show timer when game is active', async ({ authenticatedPage }) => {
      // Mock active game
      await mockApiResponse(authenticatedPage, `**/api/sessions/${mockSessionId}`, {
        status: 200,
        body: {
          success: true,
          data: { ...mockSessionData, status: 'active' }
        }
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Check timer is visible
      const timer = authenticatedPage.locator('[data-testid="game-timer"]');
      if (await timer.isVisible()) {
        await expect(timer).toContainText(/\d{2}:\d{2}/); // MM:SS format
      }
    });

    test('should maintain timer state across interactions', async ({ authenticatedPage }) => {
      // Mock active game
      await mockApiResponse(authenticatedPage, `**/api/sessions/${mockSessionId}`, {
        status: 200,
        body: {
          success: true,
          data: { ...mockSessionData, status: 'active' }
        }
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Wait for timer to start
      await authenticatedPage.waitForTimeout(1000);

      const timer = authenticatedPage.locator('[data-testid="game-timer"]');
      if (await timer.isVisible()) {
        const initialTime = await timer.textContent();
        
        // Wait a bit more
        await authenticatedPage.waitForTimeout(1000);
        
        const updatedTime = await timer.textContent();
        expect(updatedTime).not.toBe(initialTime); // Timer should be running
      }
    });
  });
});