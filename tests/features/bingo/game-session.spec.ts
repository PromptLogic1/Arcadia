import { test, expect } from '../../fixtures/auth.fixture';
import { 
  waitForNetworkIdle,
  getPerformanceMetrics
} from '../../helpers/test-utils';
import { TIMEOUTS } from '../../helpers/test-data';

test.describe('Bingo Game Session', () => {
  let testBoardId: string;

  test.beforeEach(async ({ authenticatedPage }) => {
    // Create a complete test board
    await authenticatedPage.goto('/play-area/bingo');
    await waitForNetworkIdle(authenticatedPage);
    
    await authenticatedPage.getByRole('button', { name: /create.*board/i }).click();
    await authenticatedPage.getByLabel(/title/i).fill('Game Session Test Board');
    await authenticatedPage.getByRole('combobox', { name: /game type/i }).click();
    await authenticatedPage.getByRole('option', { name: /valorant/i }).click();
    await authenticatedPage.getByRole('button', { name: /create/i }).click();
    
    // Extract board ID
    const url = authenticatedPage.url();
    testBoardId = url.split('/').pop() || '';
    
    // Add cards to fill the board (3x3 for faster testing)
    await authenticatedPage.goto(`/play-area/bingo/edit/${testBoardId}`);
    await waitForNetworkIdle(authenticatedPage);
    
    // Change to smaller board size for faster testing
    await authenticatedPage.getByRole('button', { name: /board.*settings/i }).click();
    await authenticatedPage.getByLabel(/board size/i).selectOption('3');
    await authenticatedPage.getByRole('button', { name: /save.*settings/i }).click();
    
    // Add 9 cards for 3x3 board
    const cardTexts = [
      'Get a kill', 'Plant the spike', 'Defuse the bomb',
      'Ace the round', 'Clutch 1v3', 'Use ultimate',
      'Win pistol round', 'Headshot kill', 'Save weapon'
    ];
    
    for (let i = 0; i < cardTexts.length; i++) {
      const cardText = cardTexts[i];
      if (!cardText) continue;
      
      await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
      await authenticatedPage.getByLabel(/card text/i).fill(cardText);
      await authenticatedPage.getByLabel(/category/i).selectOption('action');
      await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
      
      // Place card in grid
      const card = authenticatedPage.getByTestId('library-card').filter({ hasText: cardText }).first();
      const row = Math.floor(i / 3);
      const col = i % 3;
      const cell = authenticatedPage.getByTestId(`grid-cell-${row}-${col}`);
      await card.dragTo(cell);
    }
    
    await waitForNetworkIdle(authenticatedPage);
  });

  test('should start a new game session', async ({ authenticatedPage }) => {
    // Start game session
    await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
    
    // Verify game session is created
    await expect(authenticatedPage.getByText(/game started/i)).toBeVisible();
    await expect(authenticatedPage).toHaveURL(/\/bingo\/session\/[a-zA-Z0-9-]+$/);
    
    // Verify game UI elements are present
    await expect(authenticatedPage.getByTestId('bingo-grid')).toBeVisible();
    await expect(authenticatedPage.getByTestId('player-list')).toBeVisible();
    await expect(authenticatedPage.getByTestId('game-controls')).toBeVisible();
    
    // Verify session code is displayed
    await expect(authenticatedPage.getByTestId('session-code')).toBeVisible();
    const sessionCode = await authenticatedPage.getByTestId('session-code').textContent();
    expect(sessionCode).toMatch(/^[A-Z0-9]{6}$/); // 6-character alphanumeric code
  });

  test('should allow players to join existing session', async ({ authenticatedPage, context }) => {
    // Host starts session
    await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
    await expect(authenticatedPage.getByText(/game started/i)).toBeVisible();
    
    const sessionCode = await authenticatedPage.getByTestId('session-code').textContent();
    
    // Player joins in new tab
    const playerPage = await context.newPage();
    await playerPage.goto('/play-area/bingo');
    await waitForNetworkIdle(playerPage);
    
    await playerPage.getByRole('button', { name: /join.*game/i }).click();
    await playerPage.getByLabel(/session code/i).fill(sessionCode || '');
    await playerPage.getByRole('button', { name: /join/i }).click();
    
    // Verify player successfully joined
    await expect(playerPage).toHaveURL(/\/bingo\/session\/[a-zA-Z0-9-]+$/);
    await expect(playerPage.getByText(/joined game/i)).toBeVisible();
    
    // Both players should see updated player count
    await expect(authenticatedPage.getByText(/2 players/i)).toBeVisible();
    await expect(playerPage.getByText(/2 players/i)).toBeVisible();
    
    // Both should see the same board
    const hostGridText = await authenticatedPage.getByTestId('bingo-grid').textContent();
    const playerGridText = await playerPage.getByTestId('bingo-grid').textContent();
    expect(hostGridText).toBe(playerGridText);
    
    await playerPage.close();
  });

  test('should mark cells when clicked', async ({ authenticatedPage }) => {
    // Start game
    await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
    await expect(authenticatedPage.getByText(/game started/i)).toBeVisible();
    
    // Click on a cell
    const cell = authenticatedPage.getByTestId('grid-cell-0-0');
    await cell.click();
    
    // Verify cell is marked
    await expect(cell).toHaveAttribute('data-marked', 'true');
    await expect(cell).toHaveClass(/marked/);
    
    // Verify mark appears with player color
    const playerId = await authenticatedPage.evaluate(() => window.localStorage.getItem('playerId'));
    await expect(cell).toHaveAttribute('data-marked-by', playerId || '');
    
    // Click another cell
    const cell2 = authenticatedPage.getByTestId('grid-cell-1-1');
    await cell2.click();
    await expect(cell2).toHaveAttribute('data-marked', 'true');
    
    // First cell should still be marked
    await expect(cell).toHaveAttribute('data-marked', 'true');
  });

  test('should sync cell marks in real-time between players', async ({ authenticatedPage, context }) => {
    // Start session with two players
    await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
    const sessionCode = await authenticatedPage.getByTestId('session-code').textContent();
    
    const playerPage = await context.newPage();
    await playerPage.goto('/play-area/bingo');
    await playerPage.getByRole('button', { name: /join.*game/i }).click();
    await playerPage.getByLabel(/session code/i).fill(sessionCode || '');
    await playerPage.getByRole('button', { name: /join/i }).click();
    
    // Host marks a cell
    const hostCell = authenticatedPage.getByTestId('grid-cell-0-0');
    await hostCell.click();
    
    // Player should see the mark
    const playerCell = playerPage.getByTestId('grid-cell-0-0');
    await expect(playerCell).toHaveAttribute('data-marked', 'true');
    
    // Player marks a different cell
    const playerCell2 = playerPage.getByTestId('grid-cell-1-1');
    await playerCell2.click();
    
    // Host should see the player's mark
    const hostCell2 = authenticatedPage.getByTestId('grid-cell-1-1');
    await expect(hostCell2).toHaveAttribute('data-marked', 'true');
    
    // Both players should see all marks
    await expect(authenticatedPage.getByTestId('grid-cell-0-0')).toHaveAttribute('data-marked', 'true');
    await expect(authenticatedPage.getByTestId('grid-cell-1-1')).toHaveAttribute('data-marked', 'true');
    await expect(playerPage.getByTestId('grid-cell-0-0')).toHaveAttribute('data-marked', 'true');
    await expect(playerPage.getByTestId('grid-cell-1-1')).toHaveAttribute('data-marked', 'true');
    
    await playerPage.close();
  });

  test('should unmark cells when clicked again', async ({ authenticatedPage }) => {
    await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
    
    const cell = authenticatedPage.getByTestId('grid-cell-1-1');
    
    // Mark cell
    await cell.click();
    await expect(cell).toHaveAttribute('data-marked', 'true');
    
    // Unmark cell
    await cell.click();
    await expect(cell).toHaveAttribute('data-marked', 'false');
    await expect(cell).not.toHaveClass(/marked/);
  });

  test('should handle concurrent cell marking', async ({ authenticatedPage, context }) => {
    // Setup two players
    await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
    const sessionCode = await authenticatedPage.getByTestId('session-code').textContent();
    
    const playerPage = await context.newPage();
    await playerPage.goto('/play-area/bingo');
    await playerPage.getByRole('button', { name: /join.*game/i }).click();
    await playerPage.getByLabel(/session code/i).fill(sessionCode || '');
    await playerPage.getByRole('button', { name: /join/i }).click();
    
    // Both players try to mark same cell simultaneously
    const cellSelector = 'grid-cell-2-2';
    const hostCell = authenticatedPage.getByTestId(cellSelector);
    const playerCell = playerPage.getByTestId(cellSelector);
    
    await Promise.all([
      hostCell.click(),
      playerCell.click()
    ]);
    
    // Cell should be marked by one of the players
    await expect(hostCell).toHaveAttribute('data-marked', 'true');
    await expect(playerCell).toHaveAttribute('data-marked', 'true');
    
    // Both should see the same marking state
    const hostMarkedBy = await hostCell.getAttribute('data-marked-by');
    const playerMarkedBy = await playerCell.getAttribute('data-marked-by');
    expect(hostMarkedBy).toBe(playerMarkedBy);
    
    await playerPage.close();
  });

  test('should display player list with colors', async ({ authenticatedPage, context }) => {
    await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
    const sessionCode = await authenticatedPage.getByTestId('session-code').textContent();
    
    // Add multiple players
    const playerPages = [];
    for (let i = 0; i < 3; i++) {
      const playerPage = await context.newPage();
      await playerPage.goto('/play-area/bingo');
      await playerPage.getByRole('button', { name: /join.*game/i }).click();
      await playerPage.getByLabel(/session code/i).fill(sessionCode || '');
      await playerPage.getByRole('button', { name: /join/i }).click();
      playerPages.push(playerPage);
    }
    
    // Verify player count
    await expect(authenticatedPage.getByText(/4 players/i)).toBeVisible();
    
    // Verify each player has unique color
    const playerList = authenticatedPage.getByTestId('player-list');
    const playerItems = playerList.getByTestId(/player-item-\d+/);
    await expect(playerItems).toHaveCount(4);
    
    // Each player should have a distinct color indicator
    const playerColors = [];
    for (let i = 0; i < 4; i++) {
      const playerItem = authenticatedPage.getByTestId(`player-item-${i}`);
      const colorClass = await playerItem.getAttribute('data-player-color');
      expect(colorClass).toBeTruthy();
      expect(playerColors).not.toContain(colorClass);
      playerColors.push(colorClass);
    }
    
    // Cleanup
    for (const page of playerPages) {
      await page.close();
    }
  });

  test('should handle player disconnection gracefully', async ({ authenticatedPage, context }) => {
    await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
    const sessionCode = await authenticatedPage.getByTestId('session-code').textContent();
    
    // Player joins
    const playerPage = await context.newPage();
    await playerPage.goto('/play-area/bingo');
    await playerPage.getByRole('button', { name: /join.*game/i }).click();
    await playerPage.getByLabel(/session code/i).fill(sessionCode || '');
    await playerPage.getByRole('button', { name: /join/i }).click();
    
    // Verify 2 players
    await expect(authenticatedPage.getByText(/2 players/i)).toBeVisible();
    
    // Player disconnects
    await playerPage.close();
    
    // Host should see updated player count
    await expect(authenticatedPage.getByText(/1 players/i)).toBeVisible();
    
    // Game should continue for remaining players
    const cell = authenticatedPage.getByTestId('grid-cell-0-0');
    await cell.click();
    await expect(cell).toHaveAttribute('data-marked', 'true');
  });

  test('should show game controls and timer', async ({ authenticatedPage }) => {
    await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
    
    // Verify game controls are present
    await expect(authenticatedPage.getByTestId('game-controls')).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /pause/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /end.*game/i })).toBeVisible();
    
    // Verify timer is running
    await expect(authenticatedPage.getByTestId('game-timer')).toBeVisible();
    const initialTime = await authenticatedPage.getByTestId('game-timer').textContent();
    
    // Wait a moment and check timer has updated
    await authenticatedPage.waitForTimeout(2000);
    const updatedTime = await authenticatedPage.getByTestId('game-timer').textContent();
    expect(updatedTime).not.toBe(initialTime);
  });

  test('should pause and resume game', async ({ authenticatedPage }) => {
    await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
    
    // Pause game
    await authenticatedPage.getByRole('button', { name: /pause/i }).click();
    await expect(authenticatedPage.getByText(/game paused/i)).toBeVisible();
    
    // Verify cells cannot be marked when paused
    const cell = authenticatedPage.getByTestId('grid-cell-0-0');
    await cell.click();
    await expect(cell).toHaveAttribute('data-marked', 'false');
    
    // Resume game
    await authenticatedPage.getByRole('button', { name: /resume/i }).click();
    await expect(authenticatedPage.getByText(/game resumed/i)).toBeVisible();
    
    // Verify cells can be marked again
    await cell.click();
    await expect(cell).toHaveAttribute('data-marked', 'true');
  });

  test('should end game manually', async ({ authenticatedPage }) => {
    await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
    
    // Mark some cells
    await authenticatedPage.getByTestId('grid-cell-0-0').click();
    await authenticatedPage.getByTestId('grid-cell-1-1').click();
    
    // End game
    await authenticatedPage.getByRole('button', { name: /end.*game/i }).click();
    await authenticatedPage.getByRole('button', { name: /confirm/i }).click();
    
    // Should show game ended state
    await expect(authenticatedPage.getByText(/game ended/i)).toBeVisible();
    
    // Should show game summary
    await expect(authenticatedPage.getByTestId('game-summary')).toBeVisible();
    await expect(authenticatedPage.getByText(/cells marked/i)).toBeVisible();
    
    // Should not be able to mark more cells
    const cell = authenticatedPage.getByTestId('grid-cell-2-2');
    await cell.click();
    await expect(cell).toHaveAttribute('data-marked', 'false');
  });

  test('should handle invalid session codes', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/play-area/bingo');
    
    await authenticatedPage.getByRole('button', { name: /join.*game/i }).click();
    
    // Try invalid session code
    await authenticatedPage.getByLabel(/session code/i).fill('INVALID');
    await authenticatedPage.getByRole('button', { name: /join/i }).click();
    
    await expect(authenticatedPage.getByText(/session not found/i)).toBeVisible();
    
    // Try empty session code
    await authenticatedPage.getByLabel(/session code/i).clear();
    await authenticatedPage.getByRole('button', { name: /join/i }).click();
    
    await expect(authenticatedPage.getByText(/session code.*required/i)).toBeVisible();
  });

  test('should handle network disconnections during gameplay', async ({ authenticatedPage, context }) => {
    await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
    
    // Mark a cell
    await authenticatedPage.getByTestId('grid-cell-0-0').click();
    await expect(authenticatedPage.getByTestId('grid-cell-0-0')).toHaveAttribute('data-marked', 'true');
    
    // Simulate network failure
    await context.setOffline(true);
    
    // Try to mark another cell
    await authenticatedPage.getByTestId('grid-cell-1-1').click();
    
    // Should show connection error
    await expect(authenticatedPage.getByText(/connection.*lost/i)).toBeVisible();
    
    // Local state might still update for better UX
    await expect(authenticatedPage.getByTestId('grid-cell-1-1')).toHaveAttribute('data-marked', 'true');
    
    // Reconnect
    await context.setOffline(false);
    
    // Should show reconnected state
    await expect(authenticatedPage.getByText(/reconnected/i)).toBeVisible();
    
    // State should sync
    await expect(authenticatedPage.getByTestId('grid-cell-1-1')).toHaveAttribute('data-marked', 'true');
  });

  test('should measure game session performance', async ({ authenticatedPage }) => {
    const startTime = Date.now();
    
    // Start game
    await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
    await expect(authenticatedPage.getByText(/game started/i)).toBeVisible();
    
    const gameStartTime = Date.now();
    
    // Perform multiple cell marks rapidly
    const cellMarkTimes = [];
    for (let i = 0; i < 9; i++) {
      const markStart = Date.now();
      const row = Math.floor(i / 3);
      const col = i % 3;
      await authenticatedPage.getByTestId(`grid-cell-${row}-${col}`).click();
      const markEnd = Date.now();
      cellMarkTimes.push(markEnd - markStart);
    }
    
    // Verify performance benchmarks
    const sessionStartTime = gameStartTime - startTime;
    expect(sessionStartTime).toBeLessThan(TIMEOUTS.navigation);
    
    // Cell marking should be very fast
    const avgMarkTime = cellMarkTimes.reduce((a, b) => a + b, 0) / cellMarkTimes.length;
    expect(avgMarkTime).toBeLessThan(100); // Should be under 100ms
    
    // No mark should take longer than 500ms
    const maxMarkTime = Math.max(...cellMarkTimes);
    expect(maxMarkTime).toBeLessThan(500);
    
    // Get detailed performance metrics
    const metrics = await getPerformanceMetrics(authenticatedPage);
    expect(metrics.firstContentfulPaint).toBeLessThan(2000);
  });

  test('should support spectator mode', async ({ authenticatedPage, context }) => {
    // Start game
    await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
    const sessionCode = await authenticatedPage.getByTestId('session-code').textContent();
    
    // Mark some cells as host
    await authenticatedPage.getByTestId('grid-cell-0-0').click();
    await authenticatedPage.getByTestId('grid-cell-1-1').click();
    
    // Spectator joins
    const spectatorPage = await context.newPage();
    await spectatorPage.goto('/play-area/bingo');
    await spectatorPage.getByRole('button', { name: /spectate.*game/i }).click();
    await spectatorPage.getByLabel(/session code/i).fill(sessionCode || '');
    await spectatorPage.getByRole('button', { name: /spectate/i }).click();
    
    // Spectator should see the game state
    await expect(spectatorPage.getByTestId('grid-cell-0-0')).toHaveAttribute('data-marked', 'true');
    await expect(spectatorPage.getByTestId('grid-cell-1-1')).toHaveAttribute('data-marked', 'true');
    
    // Spectator should not be able to mark cells
    await spectatorPage.getByTestId('grid-cell-2-2').click();
    await expect(spectatorPage.getByTestId('grid-cell-2-2')).toHaveAttribute('data-marked', 'false');
    
    // Spectator should see spectator indicator
    await expect(spectatorPage.getByText(/spectating/i)).toBeVisible();
    
    await spectatorPage.close();
  });

  test('should handle maximum player limit', async ({ authenticatedPage, context }) => {
    await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
    const sessionCode = await authenticatedPage.getByTestId('session-code').textContent();
    
    // Add players up to the limit (assuming 20 is the max)
    const playerPages = [];
    const maxPlayers = 20;
    
    for (let i = 1; i < maxPlayers; i++) { // -1 because host is player 1
      const playerPage = await context.newPage();
      await playerPage.goto('/play-area/bingo');
      await playerPage.getByRole('button', { name: /join.*game/i }).click();
      await playerPage.getByLabel(/session code/i).fill(sessionCode || '');
      await playerPage.getByRole('button', { name: /join/i }).click();
      playerPages.push(playerPage);
      
      if (i < 5) { // Only keep first few pages open to save resources
        continue;
      } else {
        await playerPage.close();
      }
    }
    
    // Try to add one more player (should fail)
    const overflowPlayerPage = await context.newPage();
    await overflowPlayerPage.goto('/play-area/bingo');
    await overflowPlayerPage.getByRole('button', { name: /join.*game/i }).click();
    await overflowPlayerPage.getByLabel(/session code/i).fill(sessionCode || '');
    await overflowPlayerPage.getByRole('button', { name: /join/i }).click();
    
    // Should show error message
    await expect(overflowPlayerPage.getByText(/session is full/i)).toBeVisible();
    
    // Cleanup
    for (const page of playerPages.slice(0, 5)) {
      await page.close();
    }
    await overflowPlayerPage.close();
  });
});