import { test, expect } from '../../fixtures/auth.fixture';
import { 
  waitForNetworkIdle, 
  mockApiResponse
} from '../../helpers/test-utils';
import { gameFixtures, gameScenarios } from '../../fixtures/game-fixtures';
import { createWebSocketContext } from '../../helpers/websocket-helpers';
import { createPerformanceContext } from '../../helpers/performance-helpers';
import type { Tables } from '@/types/database.types';
import type { SessionWithStats, PlayerWithStatus } from '../../fixtures/game-fixtures';

/**
 * Enhanced Game Session Management Tests
 * Demonstrates proper type safety, fixtures, and performance testing
 */
test.describe('Enhanced Game Session Management', () => {
  let wsContext: Awaited<ReturnType<typeof createWebSocketContext>>;
  let perfContext: Awaited<ReturnType<typeof createPerformanceContext>>;

  test.beforeEach(async ({ authenticatedPage }) => {
    // Set up contexts
    wsContext = await createWebSocketContext(authenticatedPage);
    perfContext = await createPerformanceContext(authenticatedPage);
  });

  test.afterEach(async () => {
    // Clean up contexts
    await wsContext?.cleanup();
    await perfContext?.cleanup();
  });

  test.describe('Type-Safe Session Management', () => {
    test('should display session with proper database types', async ({ authenticatedPage, testUser }) => {
      // Generate typed session data
      const { session, players } = gameScenarios.waitingSession(3);
      
      // Override with test user as host
      const typedSession: SessionWithStats = {
        ...session,
        host_id: testUser.id,
        board_title: 'Type-Safe Bingo Game',
        host_username: testUser.email || 'TestHost'
      };

      const typedPlayers: PlayerWithStatus[] = players.map((p, i) => ({
        ...p,
        user_id: i === 0 ? testUser.id : p.user_id,
        display_name: i === 0 ? testUser.email || 'TestHost' : p.display_name,
        is_active: true,
        connection_status: 'connected'
      }));

      // Mock with typed data
      await mockApiResponse(authenticatedPage, `**/api/sessions/${typedSession.id}`, {
        status: 200,
        body: { 
          success: true, 
          data: {
            ...typedSession,
            players: typedPlayers
          }
        }
      });

      await authenticatedPage.goto(`/play-area/session/${typedSession.id}`);
      await waitForNetworkIdle(authenticatedPage);

      // Verify typed data is displayed correctly
      await expect(authenticatedPage.locator('h1')).toContainText(typedSession.board_title!);
      await expect(authenticatedPage.locator('text=Hosted by')).toContainText(typedSession.host_username!);
      
      // Verify player count
      const playersCard = authenticatedPage.locator('[data-testid="players-list"]');
      await expect(playersCard).toContainText(`Players (${typedPlayers.length})`);
    });

    test('should handle game state transitions with typed events', async ({ authenticatedPage, testUser }) => {
      const { session, players } = gameScenarios.activeGame(4, 0);
      
      // Set test user as host
      session.host_id = testUser.id;
      players[0] = { ...players[0], user_id: testUser.id, is_host: true };

      await mockApiResponse(authenticatedPage, `**/api/sessions/${session.id}`, {
        status: 200,
        body: { success: true, data: { ...session, players } }
      });

      await authenticatedPage.goto(`/play-area/session/${session.id}`);
      await waitForNetworkIdle(authenticatedPage);

      // Use WebSocket helper to simulate typed events
      wsContext.helper.simulateGameStart(session.id);

      // Verify game started
      await expect(authenticatedPage.locator('[data-testid="game-status"]')).toContainText(/in progress/i, {
        timeout: 3000
      });

      // Simulate typed cell mark event
      const position = 12; // Center cell
      wsContext.helper.simulateCellMark(
        session.id,
        position,
        players[1].user_id,
        players[1].color
      );

      // Wait for cell update
      await authenticatedPage.waitForTimeout(500);
    });
  });

  test.describe('Real-time Synchronization with Types', () => {
    test('should sync player events with proper types', async ({ authenticatedPage }) => {
      const { session, players } = gameScenarios.waitingSession(2);

      await mockApiResponse(authenticatedPage, `**/api/sessions/${session.id}`, {
        status: 200,
        body: { success: true, data: { ...session, players } }
      });

      await authenticatedPage.goto(`/play-area/session/${session.id}`);
      await waitForNetworkIdle(authenticatedPage);

      // Generate new typed player
      const newPlayer = gameFixtures.player({
        session_id: session.id,
        display_name: 'NewPlayer',
        color: '#00FF00',
        position: 2
      });

      // Simulate player join with typed event
      wsContext.helper.simulatePlayerJoin(session.id, newPlayer);

      // Verify player appears
      await expect(authenticatedPage.locator(`[data-testid="player-${newPlayer.user_id}"]`)).toBeVisible({
        timeout: 3000
      });

      // Verify player count updated
      await expect(authenticatedPage.locator('[data-testid="players-list"]')).toContainText('Players (3)');
    });

    test('should handle game completion with typed winner data', async ({ authenticatedPage }) => {
      const { session, players, boardState } = gameScenarios.activeGame(4, 20);

      await mockApiResponse(authenticatedPage, `**/api/sessions/${session.id}`, {
        status: 200,
        body: { success: true, data: { ...session, players } }
      });

      await mockApiResponse(authenticatedPage, `**/api/sessions/${session.id}/board-state`, {
        status: 200,
        body: { success: true, data: { boardState, version: 1 } }
      });

      await authenticatedPage.goto(`/play-area/session/${session.id}`);
      await waitForNetworkIdle(authenticatedPage);

      // Simulate game completion with typed event
      const winner = players[Math.floor(Math.random() * players.length)];
      wsContext.helper.simulateGameComplete(
        session.id,
        winner.user_id,
        'horizontal_line',
        245.678 // Duration in seconds
      );

      // Verify completion UI
      await expect(authenticatedPage.locator('[data-testid="game-winner"]')).toContainText(winner.display_name, {
        timeout: 5000
      });
    });
  });

  test.describe('Performance Testing', () => {
    test('should handle rapid cell marking without degradation', async ({ authenticatedPage, testUser }) => {
      const { session, players, boardState } = gameScenarios.activeGame(4, 0);
      
      // Set up active game
      await mockApiResponse(authenticatedPage, `**/api/sessions/${session.id}`, {
        status: 200,
        body: { success: true, data: { ...session, players } }
      });

      await mockApiResponse(authenticatedPage, `**/api/sessions/${session.id}/board-state`, {
        status: 200,
        body: { success: true, data: { boardState, version: 1 } }
      });

      // Mock mark cell endpoint
      let markCount = 0;
      await authenticatedPage.route('**/api/sessions/mark-cell', async route => {
        markCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await authenticatedPage.goto(`/play-area/session/${session.id}`);
      await waitForNetworkIdle(authenticatedPage);

      // Measure render performance during rapid marking
      const renderTime = await perfContext.performance.measureRenderPerformance(async () => {
        // Simulate 20 rapid cell marks
        for (let i = 0; i < 20; i++) {
          const position = i;
          const player = players[i % players.length];
          
          // Click cell
          await authenticatedPage.click(`[data-testid="game-cell-${position}"]`);
          
          // Simulate WebSocket update
          wsContext.helper.simulateCellMark(
            session.id,
            position,
            player.user_id,
            player.color
          );
          
          // Small delay between marks
          await authenticatedPage.waitForTimeout(50);
        }
      });

      // Performance assertions
      expect(renderTime).toBeLessThan(2000); // Should complete in under 2 seconds
      expect(markCount).toBe(20); // All marks should be sent
      
      // Check memory usage
      const hasMemoryLeak = await perfContext.performance.checkMemoryLeak(10 * 1024 * 1024); // 10MB threshold
      expect(hasMemoryLeak).toBe(false);
    });

    test('should maintain performance with many concurrent players', async ({ authenticatedPage }) => {
      // Generate session with many players
      const playerCount = 50;
      const sessionId = gameFixtures.session().id;
      const players = Array.from({ length: playerCount }, () => 
        gameFixtures.player({ session_id: sessionId })
      );

      await mockApiResponse(authenticatedPage, `**/api/sessions/${sessionId}`, {
        status: 200,
        body: { 
          success: true, 
          data: {
            ...gameFixtures.session({ id: sessionId }),
            players: players.slice(0, 8), // Initially show 8 players
            current_player_count: playerCount,
            max_players: 100
          }
        }
      });

      const startTime = Date.now();
      await authenticatedPage.goto(`/play-area/session/${sessionId}`);
      await waitForNetworkIdle(authenticatedPage);
      const loadTime = Date.now() - startTime;

      // Should load quickly even with many players
      expect(loadTime).toBeLessThan(3000);

      // Simulate players joining/leaving rapidly
      for (let i = 8; i < 20; i++) {
        wsContext.helper.simulatePlayerJoin(sessionId, players[i]);
        await authenticatedPage.waitForTimeout(100);
      }

      // UI should remain responsive
      const metrics = await perfContext.performance.captureMetrics();
      expect(metrics.jsHeapUsedSize).toBeLessThan(100 * 1024 * 1024); // Under 100MB

      // Generate performance report
      const report = await perfContext.performance.generateReport();
      console.log('Performance Report:', report);
    });
  });

  test.describe('Error Handling with Types', () => {
    test('should handle invalid session data gracefully', async ({ authenticatedPage }) => {
      const sessionId = 'invalid-session';
      
      // Mock with invalid data that doesn't match types
      await mockApiResponse(authenticatedPage, `**/api/sessions/${sessionId}`, {
        status: 200,
        body: { 
          success: true, 
          data: {
            id: sessionId,
            // Missing required fields according to Tables<'bingo_sessions'>
            board_id: null,
            host_id: null,
            status: 'invalid_status', // Invalid enum value
            // This would fail TypeScript checks
          }
        }
      });

      await authenticatedPage.goto(`/play-area/session/${sessionId}`);
      await waitForNetworkIdle(authenticatedPage);

      // Should show error state
      await expect(authenticatedPage.locator('[data-testid="session-error"]')).toBeVisible();
    });

    test('should validate event data types', async ({ authenticatedPage }) => {
      const { session, players } = gameScenarios.activeGame();

      await mockApiResponse(authenticatedPage, `**/api/sessions/${session.id}`, {
        status: 200,
        body: { success: true, data: { ...session, players } }
      });

      await authenticatedPage.goto(`/play-area/session/${session.id}`);
      await waitForNetworkIdle(authenticatedPage);

      // Try to send invalid event through WebSocket
      const invalidEvent = {
        type: 'cell_marked',
        sessionId: session.id,
        position: 'invalid', // Should be number
        playerId: 123, // Should be string
        color: null // Should be string
      };

      // This would be caught by TypeScript in real code
      // @ts-expect-error - Demonstrating type safety
      wsContext.helper.broadcast(session.id, invalidEvent);

      // UI should not crash
      await authenticatedPage.waitForTimeout(1000);
      await expect(authenticatedPage.locator('[data-testid="game-board"]')).toBeVisible();
    });
  });

  test.describe('Complex Scenarios', () => {
    test('should handle game session with all features', async ({ authenticatedPage, testUser }) => {
      // Set up complete game scenario
      const { session, players, boardState, completionEvent } = gameScenarios.completedGame();
      
      // Generate achievement for game completion
      const achievement = gameFixtures.achievement({
        user_id: completionEvent.user_id!,
        achievement_name: 'first_win',
        achievement_type: 'gameplay',
        points: 100,
        unlocked_at: new Date().toISOString()
      });

      // Mock all endpoints
      await mockApiResponse(authenticatedPage, `**/api/sessions/${session.id}`, {
        status: 200,
        body: { success: true, data: { ...session, players } }
      });

      await mockApiResponse(authenticatedPage, `**/api/sessions/${session.id}/board-state`, {
        status: 200,
        body: { success: true, data: { boardState, version: 1 } }
      });

      await mockApiResponse(authenticatedPage, '**/api/achievements/unlock', {
        status: 200,
        body: { success: true, achievement }
      });

      await authenticatedPage.goto(`/play-area/session/${session.id}`);
      await waitForNetworkIdle(authenticatedPage);

      // Verify completed game state
      await expect(authenticatedPage.locator('[data-testid="game-status"]')).toContainText(/completed/i);
      
      // Simulate achievement unlock via WebSocket
      wsContext.helper.simulateAchievementUnlock({
        id: achievement.achievement_name,
        title: 'First Victory',
        points: achievement.points!,
        icon: '🏆'
      });

      // Verify achievement notification
      await expect(authenticatedPage.locator('[data-testid="achievement-notification"]')).toBeVisible({
        timeout: 5000
      });
    });
  });
});