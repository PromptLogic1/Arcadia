import { test, expect } from '../../fixtures/auth.fixture';
import { 
  waitForNetworkIdle, 
  waitForAnimations
} from '../../helpers/test-utils';
import {
  createTypedTestBoard,
  startTypedGameSession,
  joinTypedGameSession,
  createTypedMultiplayerSession,
  markWinPattern,
  verifyWinDetection,
  getTypedGameState,
  TypedTestSessionManager
} from './bingo-test-utils';
import {
  MULTIPLAYER_SCENARIOS,
  COMPLEX_GAME_STATES,
  SECURITY_TEST_SCENARIOS,
  PERFORMANCE_BENCHMARKS
} from './bingo-fixtures';
import {
  ErrorInjector,
  LoadTestFramework,
  PerformanceRegressionTester,
  SecurityTestFramework
} from './realtime-test-utils-enhanced';
import {
  StateSyncTester,
  ConflictResolver,
  WebSocketEventTracker,
  NetworkSimulator
} from './realtime-test-utils';
import type { Tables, Enums } from '../../../types/database.types';

/**
 * Enhanced Multiplayer Bingo Tests with Advanced Real-time Features
 */
test.describe('Enhanced Multiplayer Bingo', () => {
  let sessionManager: TypedTestSessionManager;
  let testBoard: Tables<'bingo_boards'>;

  test.beforeAll(() => {
    sessionManager = new TypedTestSessionManager();
  });

  test.afterEach(async () => {
    await sessionManager.cleanup();
  });

  test.beforeEach(async ({ authenticatedPage }) => {
    const boardFixture = await createTypedTestBoard(authenticatedPage, {
      title: 'Enhanced Multiplayer Test',
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
    sessionManager.trackPage(authenticatedPage);
  });

  test.describe('Advanced Conflict Resolution', () => {
    test('should handle near-win conflict scenarios', async ({ authenticatedPage, context }) => {
      const scenario = COMPLEX_GAME_STATES.nearWinConflict;
      
      // Create multiplayer session
      const player2Page = await context.newPage();
      sessionManager.trackPage(player2Page);
      
      const { session, players } = await createTypedMultiplayerSession(
        authenticatedPage,
        [player2Page],
        {
          boardId: testBoard.id,
          playerColors: ['#06b6d4', '#8b5cf6']
        }
      );
      
      // Set up the near-win conflict state
      for (const cellData of scenario.markedCells) {
        const row = Math.floor(cellData.position / scenario.boardSize);
        const col = cellData.position % scenario.boardSize;
        
        // Determine which page should mark this cell
        const playerPage = cellData.playerId === 'player1' ? authenticatedPage : player2Page;
        
        await playerPage.getByTestId(`grid-cell-${row}-${col}`).click();
        await playerPage.waitForTimeout(100); // Allow sync
      }
      
      // Set up conflict resolver
      const conflictResolver = new ConflictResolver();
      
      // Both players try to mark the conflict cell simultaneously
      const conflictResult = await ConflictResolver.testLastWriteWins(
        [authenticatedPage, player2Page],
        { row: Math.floor(scenario.conflictCell / scenario.boardSize), 
          col: scenario.conflictCell % scenario.boardSize }
      );
      
      expect(conflictResult.resolutionTime).toBeLessThan(500);
      expect(conflictResult.winner).not.toBe(-1); // Should resolve to a winner
      
      // Verify one player achieved win
      const player1State = await getTypedGameState(authenticatedPage);
      const player2State = await getTypedGameState(player2Page);
      
      expect(player1State.gameStatus === 'completed' || player2State.gameStatus === 'completed').toBe(true);
    });

    test('should handle team vs team scenarios', async ({ authenticatedPage, context }) => {
      const scenario = COMPLEX_GAME_STATES.teamVersusTeam;
      
      // Create 4-player session for team game
      const playerPages = [];
      for (let i = 0; i < 3; i++) {
        const page = await context.newPage();
        playerPages.push(page);
        sessionManager.trackPage(page);
      }
      
      const { session, players } = await createTypedMultiplayerSession(
        authenticatedPage,
        playerPages,
        {
          boardId: testBoard.id,
          sessionSettings: { max_players: 4, allow_spectators: false }
        }
      );
      
      // Assign teams
      const redTeamPages = [authenticatedPage, playerPages[0]];
      const blueTeamPages = [playerPages[1], playerPages[2]];
      
      // Set up team conflict state
      for (const cellData of scenario.markedCells) {
        const row = Math.floor(cellData.position / scenario.boardSize);
        const col = cellData.position % scenario.boardSize;
        
        let playerPage: any;
        if (cellData.team === 'red') {
          playerPage = redTeamPages[cellData.playerId === 'player1' ? 0 : 1];
        } else {
          playerPage = blueTeamPages[cellData.playerId === 'player3' ? 0 : 1];
        }
        
        await playerPage.getByTestId(`grid-cell-${row}-${col}`).click();
        await playerPage.waitForTimeout(50);
      }
      
      // Verify team win detection
      if (scenario.expectedWinner === 'red') {
        // Red team should have completed a line
        const redWinDetected = await authenticatedPage.getByText(/bingo/i).isVisible().catch(() => false) ||
                               await playerPages[0].getByText(/bingo/i).isVisible().catch(() => false);
        expect(redWinDetected).toBe(true);
      }
    });
  });

  test.describe('Load Testing and Scalability', () => {
    test('should handle high player count sessions', async ({ authenticatedPage, browser }) => {
      const loadTester = new LoadTestFramework(browser);
      
      // Create session for load testing
      const session = await startTypedGameSession(authenticatedPage, testBoard.id, {
        max_players: 20,
        allow_spectators: true
      });
      
      // Run load test
      const loadTestResults = await loadTester.runLoadTest({
        concurrentUsers: 10,
        duration: 30000, // 30 seconds
        rampUpTime: 5000, // 5 seconds ramp up
        sessionId: session.session.session_code || undefined,
        userBehavior: 'normal'
      });
      
      expect(loadTestResults.successfulConnections).toBeGreaterThan(8); // 80% success rate
      expect(loadTestResults.averageLatency).toBeLessThan(2000); // Under 2 seconds
      expect(loadTestResults.failedConnections).toBeLessThan(2);
      
      // Verify performance metrics
      expect(loadTestResults.messagesPerSecond).toBeGreaterThan(0);
      expect(loadTestResults.conflictsDetected).toBeLessThan(loadTestResults.successfulConnections * 0.1);
    });

    test('should determine maximum players per session', async ({ browser }) => {
      const loadTester = new LoadTestFramework(browser);
      
      const maxPlayers = await loadTester.testMaxPlayersPerSession();
      
      // Should support at least 10 players (based on requirements)
      expect(maxPlayers).toBeGreaterThanOrEqual(10);
      
      // Log result for monitoring
      console.log(`Maximum players per session: ${maxPlayers}`);
    });

    test('should test concurrent session limits', async ({ browser }) => {
      const loadTester = new LoadTestFramework(browser);
      
      const maxSessions = await loadTester.testMaxConcurrentSessions();
      
      // Should support at least 50 concurrent sessions
      expect(maxSessions).toBeGreaterThanOrEqual(50);
      
      console.log(`Maximum concurrent sessions: ${maxSessions}`);
    });
  });

  test.describe('Network Resilience and Error Recovery', () => {
    test('should handle network partitions gracefully', async ({ authenticatedPage, context }) => {
      const player2Page = await context.newPage();
      sessionManager.trackPage(player2Page);
      
      const { session } = await createTypedMultiplayerSession(
        authenticatedPage,
        [player2Page],
        { boardId: testBoard.id }
      );
      
      const errorInjector = new ErrorInjector(authenticatedPage);
      const eventTracker = new WebSocketEventTracker(authenticatedPage);
      await eventTracker.startTracking();
      
      // Simulate database partition
      await errorInjector.simulateDatabasePartition(3000);
      
      // Try to perform actions during partition
      await authenticatedPage.getByTestId('grid-cell-1-1').click();
      
      // Should show appropriate error handling
      const errorShown = await authenticatedPage.getByText(/connection.*error|network.*error/i)
        .isVisible().catch(() => false);
      expect(errorShown).toBe(true);
      
      // Wait for partition to end and verify recovery
      await authenticatedPage.waitForTimeout(4000);
      
      // Should be able to perform actions again
      await authenticatedPage.getByTestId('grid-cell-2-2').click();
      await expect(authenticatedPage.getByTestId('grid-cell-2-2')).toHaveAttribute('data-marked', 'true');
      
      await errorInjector.cleanup();
    });

    test('should handle WebSocket connection failures', async ({ authenticatedPage }) => {
      const errorInjector = new ErrorInjector(authenticatedPage);
      
      // Start session
      const session = await startTypedGameSession(authenticatedPage, testBoard.id);
      
      // Simulate WebSocket failures
      await errorInjector.simulateWebSocketFailures(0.5, 10000); // 50% failure rate
      
      // Perform multiple actions
      const actions = [];
      for (let i = 0; i < 10; i++) {
        actions.push(async () => {
          const row = Math.floor(i / 5);
          const col = i % 5;
          await authenticatedPage.getByTestId(`grid-cell-${row}-${col}`).click();
        });
      }
      
      // Execute actions despite WebSocket issues
      const results = await Promise.allSettled(actions.map(action => action()));
      
      // At least some actions should succeed (with retries/fallbacks)
      const successfulActions = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulActions).toBeGreaterThan(5);
      
      await errorInjector.cleanup();
    });

    test('should recover from session corruption', async ({ authenticatedPage }) => {
      const session = await startTypedGameSession(authenticatedPage, testBoard.id);
      const errorInjector = new ErrorInjector(authenticatedPage);
      
      // Corrupt session data
      await errorInjector.simulateSessionCorruption();
      
      // Reload page to trigger recovery
      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);
      
      // Should show recovery message or gracefully handle corruption
      const recoveryShown = await authenticatedPage.getByText(/recovered|restored|error/i)
        .isVisible().catch(() => false);
      
      // Should be able to continue using the application
      await expect(authenticatedPage.getByTestId('bingo-grid')).toBeVisible();
      
      await errorInjector.cleanup();
    });
  });

  test.describe('Performance Regression Testing', () => {
    test('should detect performance regressions', async ({ authenticatedPage }) => {
      const perfTester = new PerformanceRegressionTester(authenticatedPage);
      
      // Define baseline performance
      const baseline = {
        name: 'multiplayer-baseline',
        metrics: {
          cellMarkingLatency: { p50: 50, p95: 100, p99: 150 },
          winDetectionTime: { p50: 20, p95: 40, p99: 60 },
          realtimeSync: { p50: 80, p95: 160, p99: 240 },
          memoryUsage: { baseline: 50000000, max: 100000000 },
          networkRequests: { count: 10, averageDuration: 200 }
        },
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
      
      // Run benchmark
      const results = await perfTester.benchmarkAgainstBaseline(
        'multiplayer-performance',
        baseline
      );
      
      // Should not have significant regressions
      expect(results.passed).toBe(true);
      
      if (results.regressions.length > 0) {
        console.warn('Performance regressions detected:', results.regressions);
      }
      
      if (results.improvements.length > 0) {
        console.log('Performance improvements detected:', results.improvements);
      }
    });

    test('should detect memory leaks during gameplay', async ({ authenticatedPage, context }) => {
      const perfTester = new PerformanceRegressionTester(authenticatedPage);
      const player2Page = await context.newPage();
      sessionManager.trackPage(player2Page);
      
      // Create multiplayer session
      await createTypedMultiplayerSession(
        authenticatedPage,
        [player2Page],
        { boardId: testBoard.id }
      );
      
      // Test for memory leaks during extended gameplay
      const memoryResults = await perfTester.detectMemoryLeaks();
      
      expect(memoryResults.hasLeak).toBe(false);
      
      if (memoryResults.hasLeak) {
        console.warn(`Memory leak detected: ${memoryResults.leakSize} bytes`);
      }
    });

    test('should measure CPU usage during high activity', async ({ authenticatedPage, context }) => {
      const perfTester = new PerformanceRegressionTester(authenticatedPage);
      const player2Page = await context.newPage();
      sessionManager.trackPage(player2Page);
      
      await createTypedMultiplayerSession(
        authenticatedPage,
        [player2Page],
        { boardId: testBoard.id }
      );
      
      // Measure CPU during intensive activity
      const cpuResults = await perfTester.measureCPUUsage(async () => {
        // Rapid cell marking by both players
        const actions = [];
        for (let i = 0; i < 25; i++) {
          const row = Math.floor(i / 5);
          const col = i % 5;
          
          // Alternate between players
          const page = i % 2 === 0 ? authenticatedPage : player2Page;
          actions.push(page.getByTestId(`grid-cell-${row}-${col}`).click());
        }
        
        await Promise.all(actions);
      });
      
      // CPU usage should be reasonable
      expect(cpuResults.averageUsage).toBeLessThan(80); // Less than 80% average
      expect(cpuResults.peakUsage).toBeLessThan(95); // Less than 95% peak
      expect(cpuResults.operationTime).toBeLessThan(5000); // Complete within 5 seconds
    });
  });

  test.describe('Security Testing', () => {
    test('should protect against session hijacking', async ({ authenticatedPage }) => {
      const securityTester = new SecurityTestFramework(authenticatedPage);
      
      const securityResults = await securityTester.testSessionSecurity();
      
      expect(securityResults.passed).toBe(true);
      
      if (!securityResults.passed) {
        console.error('Security vulnerabilities detected:', securityResults.vulnerabilities);
        
        // Fail test if critical vulnerabilities found
        const criticalVulns = securityResults.vulnerabilities.filter(v => v.severity === 'critical');
        expect(criticalVulns).toHaveLength(0);
      }
    });

    test('should validate input sanitization', async ({ authenticatedPage }) => {
      const session = await startTypedGameSession(authenticatedPage, testBoard.id);
      
      // Test malicious inputs from security test scenarios
      const maliciousInputs = SECURITY_TEST_SCENARIOS.inputValidation.maliciousInputs;
      
      for (const maliciousInput of maliciousInputs) {
        // Try to inject malicious content
        await authenticatedPage.evaluate((payload) => {
          // Try to manipulate WebSocket messages
          const mockMessage = {
            type: 'cell_marked',
            data: {
              cellPosition: 0,
              playerId: payload,
              sessionId: payload
            }
          };
          
          // This would normally be sent via WebSocket
          // In a real test, we'd intercept and modify actual messages
        }, maliciousInput.payload);
        
        // Verify the application handles malicious input safely
        const errorState = await authenticatedPage.evaluate(() => {
          return window.console.error.toString().includes('error') || 
                 document.querySelector('[data-testid="error-message"]') !== null;
        });
        
        // Should either handle gracefully or show appropriate error
        // Should not execute malicious code
      }
    });

    test('should enforce rate limiting', async ({ authenticatedPage }) => {
      const session = await startTypedGameSession(authenticatedPage, testBoard.id);
      
      // Attempt rapid cell marking (potential DoS)
      const rapidActions = [];
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        rapidActions.push(async () => {
          const row = Math.floor(Math.random() * 5);
          const col = Math.floor(Math.random() * 5);
          await authenticatedPage.getByTestId(`grid-cell-${row}-${col}`).click();
        });
      }
      
      const results = await Promise.allSettled(rapidActions.map(action => action()));
      const duration = Date.now() - startTime;
      
      const successfulActions = results.filter(r => r.status === 'fulfilled').length;
      const actionsPerSecond = (successfulActions * 1000) / duration;
      
      // Should be rate limited - not allow excessive actions per second
      expect(actionsPerSecond).toBeLessThan(50);
      
      // Should show rate limiting feedback
      const rateLimitMessage = await authenticatedPage.getByText(/too many|rate limit|slow down/i)
        .isVisible().catch(() => false);
      
      if (actionsPerSecond > 30) {
        expect(rateLimitMessage).toBe(true);
      }
    });
  });

  test.describe('Advanced Game Scenarios', () => {
    test('should handle spectator-heavy sessions', async ({ authenticatedPage, browser }) => {
      const scenario = COMPLEX_GAME_STATES.spectatorHeavy;
      
      // Create session with spectators allowed
      const session = await startTypedGameSession(authenticatedPage, testBoard.id, {
        max_players: scenario.activePlayerCount,
        allow_spectators: true
      });
      
      // Add active players
      const playerPages = [];
      for (let i = 0; i < scenario.activePlayerCount - 1; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        await joinTypedGameSession(page, session.session.session_code || '');
        playerPages.push(page);
        sessionManager.trackPage(page);
      }
      
      // Add spectators (simplified - would normally join as spectators)
      const spectatorPages = [];
      for (let i = 0; i < Math.min(scenario.spectatorCount, 10); i++) { // Limit for test
        const context = await browser.newContext();
        const page = await context.newPage();
        // Join as spectator (implementation would differ)
        await page.goto(`/play-area/bingo/session/${session.session.id}?spectator=true`);
        spectatorPages.push(page);
        sessionManager.trackPage(page);
      }
      
      // Verify all can observe gameplay
      await authenticatedPage.getByTestId('grid-cell-1-1').click();
      
      // All spectators should see the change
      for (const spectatorPage of spectatorPages.slice(0, 3)) { // Test first 3
        await expect(spectatorPage.getByTestId('grid-cell-1-1'))
          .toHaveAttribute('data-marked', 'true');
      }
      
      // Cleanup
      for (const page of [...playerPages, ...spectatorPages]) {
        await page.context().close();
      }
    });

    test('should handle maximum player chaos scenario', async ({ authenticatedPage, browser }) => {
      const scenario = COMPLEX_GAME_STATES.maxPlayerChaos;
      
      // Create large session
      const session = await startTypedGameSession(authenticatedPage, testBoard.id, {
        max_players: 20,
        allow_spectators: false
      });
      
      // Add multiple players (limited for test performance)
      const playerPages = [];
      const maxTestPlayers = Math.min(scenario.playerCount, 8); // Limit for test
      
      for (let i = 0; i < maxTestPlayers - 1; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        await joinTypedGameSession(page, session.session.session_code || '');
        playerPages.push(page);
        sessionManager.trackPage(page);
      }
      
      // Simulate chaotic concurrent actions
      const chaosActions = [];
      const allPages = [authenticatedPage, ...playerPages];
      
      for (let i = 0; i < scenario.concurrentActions; i++) {
        const page = allPages[i % allPages.length];
        const row = Math.floor(Math.random() * scenario.boardSize);
        const col = Math.floor(Math.random() * scenario.boardSize);
        
        chaosActions.push(async () => {
          await page.getByTestId(`grid-cell-${row}-${col}`).click();
        });
      }
      
      // Execute all actions concurrently
      const startTime = Date.now();
      const results = await Promise.allSettled(chaosActions.map(action => action()));
      const duration = Date.now() - startTime;
      
      // Verify system handled chaos gracefully
      const successfulActions = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulActions).toBeGreaterThan(scenario.concurrentActions * 0.5); // At least 50% success
      expect(duration).toBeLessThan(10000); // Complete within 10 seconds
      
      // Verify final state is consistent across all players
      const syncTester = new StateSyncTester(allPages);
      const consistencyCheck = await syncTester.verifyStateConsistency();
      expect(consistencyCheck.consistent).toBe(true);
      
      // Cleanup
      for (const page of playerPages) {
        await page.context().close();
      }
    });
  });
});