import { test, expect } from '../../fixtures/auth.fixture';
import { 
  waitForNetworkIdle, 
  waitForAnimations,
  mockApiResponse
} from '../../helpers/test-utils';
import {
  createTypedTestBoard,
  startTypedGameSession,
  markWinPattern,
  verifyWinDetection,
  getTypedGameState,
  createTypedMultiplayerSession,
  measureOperationPerformance,
  TypedTestSessionManager
} from './bingo-test-utils';
import {
  BOARD_TEMPLATES,
  MULTIPLAYER_SCENARIOS,
  PERFORMANCE_BENCHMARKS,
  GAME_STATE_FIXTURES
} from './bingo-fixtures';
import {
  StateSyncTester,
  ConflictResolver,
  RealtimePerformanceMonitor,
  WebSocketEventTracker
} from './realtime-test-utils';
import type { Tables, Enums } from '../../../types/database.types';

/**
 * Enhanced Win Detection Tests with Full Type Safety
 */
test.describe('Typed Bingo Win Detection', () => {
  let sessionManager: TypedTestSessionManager;
  let testBoard: Tables<'bingo_boards'>;
  let testSession: Tables<'bingo_sessions'>;

  test.beforeAll(() => {
    sessionManager = new TypedTestSessionManager();
  });

  test.afterEach(async () => {
    await sessionManager.cleanup();
  });

  test.beforeEach(async ({ authenticatedPage }) => {
    // Create a typed test board with proper fixtures
    const boardFixture = await createTypedTestBoard(authenticatedPage, {
      title: 'Typed Win Detection Test',
      size: 5,
      gameType: 'valorant',
      difficulty: 'medium',
      winConditions: {
        line: true,
        diagonal: true,
        corners: true,
        majority: false
      }
    });
    
    testBoard = boardFixture.board;
    sessionManager.trackBoard(testBoard.id);
    
    // Start typed game session
    const session = await startTypedGameSession(authenticatedPage, testBoard.id);
    testSession = session.session;
    sessionManager.trackSession(testSession.id);
    sessionManager.trackPage(authenticatedPage);
  });

  test.describe('Typed Pattern Detection', () => {
    test('should detect horizontal line with type safety', async ({ authenticatedPage }) => {
      // Use typed pattern marking
      const markedPositions = await markWinPattern(authenticatedPage, 'horizontal', {
        row: 0,
        boardSize: testBoard.size || 5,
        playerId: 'test-player-1',
        color: '#06b6d4'
      });
      
      // Verify win with typed response
      const winResult = await verifyWinDetection(
        authenticatedPage,
        'test-player-1',
        'horizontal'
      );
      
      expect(winResult.pattern).toBe('Horizontal Line');
      expect(winResult.winningCells).toEqual(markedPositions);
      
      // Verify game state update
      const gameState = await getTypedGameState(authenticatedPage);
      expect(gameState.gameStatus).toBe('completed');
    });

    test('should detect diagonal win with conflict resolution', async ({ authenticatedPage, context }) => {
      // Create multiplayer session with typed players
      const playerPage = await context.newPage();
      sessionManager.trackPage(playerPage);
      
      const { players } = await createTypedMultiplayerSession(
        authenticatedPage,
        [playerPage],
        {
          boardId: testBoard.id,
          playerColors: ['#06b6d4', '#8b5cf6']
        }
      );
      
      // Test concurrent diagonal marking
      const conflictTest = await ConflictResolver.testLastWriteWins(
        [authenticatedPage, playerPage],
        { row: 2, col: 2 } // Center cell
      );
      
      // Complete diagonal patterns for both players
      await markWinPattern(authenticatedPage, 'diagonal', {
        boardSize: 5,
        playerId: players[0].player_id
      });
      
      // Verify correct winner despite conflict
      const winResult = await verifyWinDetection(
        authenticatedPage,
        players[0].display_name,
        'diagonal'
      );
      
      expect(winResult.winner).toContain(players[0].display_name);
      expect(conflictTest.resolutionTime).toBeLessThan(200);
    });

    test('should detect complex patterns with performance tracking', async ({ authenticatedPage }) => {
      const monitor = new RealtimePerformanceMonitor(authenticatedPage);
      await monitor.startMonitoring();
      
      // Test X-pattern detection performance
      const xPatternResult = await measureOperationPerformance(
        async () => {
          return await markWinPattern(authenticatedPage, 'x', {
            boardSize: 5,
            playerId: 'test-player',
            color: '#10b981'
          });
        },
        'x-pattern-marking',
        PERFORMANCE_BENCHMARKS.cellMarking.local.p95 * 9 // 9 cells for X
      );
      
      expect(xPatternResult.passed).toBe(true);
      
      // Verify win detection performance
      const detectionResult = await measureOperationPerformance(
        async () => {
          return await verifyWinDetection(authenticatedPage, 'test-player', 'x-pattern');
        },
        'x-pattern-detection',
        PERFORMANCE_BENCHMARKS.winDetection.complex.p95
      );
      
      expect(detectionResult.passed).toBe(true);
      
      const metrics = await monitor.getMetricsSummary();
      expect(metrics.apiCalls.p95Duration).toBeLessThan(200);
    });
  });

  test.describe('Real-time Win Synchronization', () => {
    test('should sync win state across multiple players', async ({ authenticatedPage, context }) => {
      // Set up multiplayer scenario
      const scenario = MULTIPLAYER_SCENARIOS.teamChallenge;
      const playerPages: Page[] = [];
      
      for (let i = 0; i < scenario.playerCount - 1; i++) {
        const page = await context.newPage();
        playerPages.push(page);
        sessionManager.trackPage(page);
      }
      
      const { session, players } = await createTypedMultiplayerSession(
        authenticatedPage,
        playerPages,
        {
          boardId: testBoard.id,
          sessionSettings: scenario.sessionSettings
        }
      );
      
      // Set up state sync tester
      const syncTester = new StateSyncTester([authenticatedPage, ...playerPages]);
      await syncTester.startTracking();
      
      // Host completes winning pattern
      const winCells = await markWinPattern(authenticatedPage, 'horizontal', {
        row: 2,
        playerId: players[0].player_id
      });
      
      // Measure sync latency
      const syncResult = await syncTester.measureSyncLatency(
        async () => { /* Win detection already triggered */ },
        (state) => state.gameStatus === 'completed'
      );
      
      expect(syncResult.averageLatency).toBeLessThan(
        PERFORMANCE_BENCHMARKS.realtimeSync.normal.p95
      );
      
      // Verify all players see consistent state
      const stateCheck = await syncTester.verifyStateConsistency();
      expect(stateCheck.consistent).toBe(true);
      expect(stateCheck.discrepancies).toHaveLength(0);
    });

    test('should handle win detection during network issues', async ({ authenticatedPage }) => {
      const eventTracker = new WebSocketEventTracker(authenticatedPage);
      await eventTracker.startTracking();
      
      // Mark most of winning pattern
      for (let col = 0; col < 4; col++) {
        await authenticatedPage.getByTestId(`grid-cell-1-${col}`).click();
      }
      
      // Simulate network disconnection
      await authenticatedPage.context().setOffline(true);
      
      // Complete winning pattern while offline
      await authenticatedPage.getByTestId('grid-cell-1-4').click();
      
      // Should show optimistic win locally
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
      
      // Reconnect
      await authenticatedPage.context().setOffline(false);
      
      // Wait for sync
      await eventTracker.waitForEvent('game_won', 5000);
      
      // Verify win is properly recorded
      const events = await eventTracker.getEventsByType('game_won');
      expect(events).toHaveLength(1);
      expect(events[0].data).toMatchObject({
        pattern: 'horizontal',
        winningCells: expect.any(Array)
      });
    });
  });

  test.describe('Edge Cases and Special Scenarios', () => {
    test('should handle pre-defined game states correctly', async ({ authenticatedPage }) => {
      // Test each pre-defined game state fixture
      for (const fixture of GAME_STATE_FIXTURES) {
        // Reset board
        await authenticatedPage.reload();
        await waitForNetworkIdle(authenticatedPage);
        
        // Apply fixture state
        for (const { position, playerId, color } of fixture.markedCells) {
          const row = Math.floor(position / fixture.boardSize);
          const col = position % fixture.boardSize;
          
          // Mock the cell as marked by specific player
          await authenticatedPage.evaluate(
            ({ row, col, playerId, color }) => {
              const cell = document.querySelector(`[data-testid="grid-cell-${row}-${col}"]`);
              if (cell) {
                cell.setAttribute('data-marked', 'true');
                cell.setAttribute('data-marked-by', playerId);
                cell.setAttribute('data-player-color', color);
              }
            },
            { row, col, playerId, color }
          );
        }
        
        // Trigger win detection check
        await authenticatedPage.evaluate(() => {
          window.dispatchEvent(new Event('check-win-condition'));
        });
        
        // Verify expected outcome
        if (fixture.expectedWinner) {
          await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
          const winResult = await verifyWinDetection(
            authenticatedPage,
            fixture.expectedWinner,
            fixture.expectedPattern!
          );
          expect(winResult.winner).toContain(fixture.expectedWinner);
        } else {
          await expect(authenticatedPage.getByText(/bingo/i)).not.toBeVisible();
        }
      }
    });

    test('should detect wins on different board sizes', async ({ authenticatedPage }) => {
      // Test 3x3 board
      const smallBoard = await createTypedTestBoard(authenticatedPage, {
        title: '3x3 Win Test',
        size: 3,
        gameType: 'minecraft',
        difficulty: 'easy'
      });
      
      await startTypedGameSession(authenticatedPage, smallBoard.board.id);
      
      // Mark diagonal on 3x3
      const positions = await markWinPattern(authenticatedPage, 'diagonal', {
        boardSize: 3,
        playerId: 'test-player'
      });
      
      expect(positions).toHaveLength(3);
      await verifyWinDetection(authenticatedPage, 'test-player', 'diagonal');
      
      // Test 6x6 board
      const largeBoard = await createTypedTestBoard(authenticatedPage, {
        title: '6x6 Win Test',
        size: 6,
        gameType: 'league-of-legends',
        difficulty: 'hard'
      });
      
      await startTypedGameSession(authenticatedPage, largeBoard.board.id);
      
      // Mark plus pattern on 6x6
      const plusPositions = await markWinPattern(authenticatedPage, 'plus', {
        boardSize: 6,
        playerId: 'test-player'
      });
      
      expect(plusPositions).toHaveLength(11); // 6 + 6 - 1 (center overlap)
      await verifyWinDetection(authenticatedPage, 'test-player', 'plus');
    });
  });

  test.describe('Win State Persistence and Recovery', () => {
    test('should persist win state to database', async ({ authenticatedPage }) => {
      // Complete a win
      await markWinPattern(authenticatedPage, 'horizontal', {
        row: 0,
        playerId: 'test-player'
      });
      
      const winResult = await verifyWinDetection(authenticatedPage, 'test-player', 'horizontal');
      
      // Verify database update via typed query
      const sessionState = await authenticatedPage.evaluate(async (sessionId) => {
        const response = await fetch(`/api/sessions/${sessionId}`);
        return response.json();
      }, testSession.id);
      
      expect(sessionState).toMatchObject({
        status: 'completed',
        winner_id: expect.any(String),
        ended_at: expect.any(String)
      });
    });

    test('should recover win state after refresh', async ({ authenticatedPage }) => {
      // Create specific win state
      const winCells = await markWinPattern(authenticatedPage, 'four-corners', {
        boardSize: 5,
        playerId: 'test-player'
      });
      
      await verifyWinDetection(authenticatedPage, 'test-player', 'four-corners');
      
      // Refresh page
      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);
      
      // Verify win state is restored
      const gameState = await getTypedGameState(authenticatedPage);
      expect(gameState.gameStatus).toBe('completed');
      
      // Verify winning cells are still highlighted
      for (const position of winCells) {
        const row = Math.floor(position / 5);
        const col = position % 5;
        await expect(
          authenticatedPage.getByTestId(`grid-cell-${row}-${col}`)
        ).toHaveClass(/winning-cell/);
      }
    });
  });

  test.describe('Performance Benchmarks', () => {
    test('should meet win detection performance targets', async ({ authenticatedPage }) => {
      const results: Record<string, boolean> = {};
      
      // Test each win pattern performance
      const patterns: Array<Parameters<typeof markWinPattern>[1]> = [
        'horizontal', 'vertical', 'diagonal', 'four-corners', 'x', 'plus'
      ];
      
      for (const pattern of patterns) {
        const result = await measureOperationPerformance(
          async () => {
            // Clear board first
            await authenticatedPage.reload();
            await waitForNetworkIdle(authenticatedPage);
            
            // Mark pattern and detect win
            await markWinPattern(authenticatedPage, pattern);
            await authenticatedPage.waitForSelector('[role="dialog"][aria-label*="winner"]');
          },
          `win-detection-${pattern}`,
          PERFORMANCE_BENCHMARKS.winDetection.complex.p95
        );
        
        results[pattern] = result.passed;
      }
      
      // All patterns should meet performance targets
      Object.entries(results).forEach(([pattern, passed]) => {
        expect(passed).toBe(true);
      });
    });
  });
});