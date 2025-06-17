import { test, expect } from '../../fixtures/auth.fixture';
import { 
  waitForNetworkIdle, 
  waitForAnimations,
  mockApiResponse
} from '../../helpers/test-utils';

test.describe('Bingo Win Detection', () => {
  let testBoardId: string;

  test.beforeEach(async ({ authenticatedPage }) => {
    // Create a complete 5x5 test board for win pattern testing
    await authenticatedPage.goto('/play-area/bingo');
    await waitForNetworkIdle(authenticatedPage);
    
    await authenticatedPage.getByRole('button', { name: /create.*board/i }).click();
    await authenticatedPage.getByLabel(/title/i).fill('Win Detection Test Board');
    await authenticatedPage.getByRole('combobox', { name: /game type/i }).click();
    await authenticatedPage.getByRole('option', { name: /valorant/i }).click();
    await authenticatedPage.getByRole('button', { name: /create/i }).click();
    
    // Extract board ID
    const url = authenticatedPage.url();
    testBoardId = url.split('/').pop() || '';
    
    // Fill the board with 25 unique cards
    const cardTexts = [
      'Get kill', 'Plant spike', 'Defuse bomb', 'Ace round', 'Clutch 1v3',
      'Use ultimate', 'Win pistol', 'Headshot', 'Save weapon', 'Flash enemy',
      'Smoke site', 'Wallbang', 'Ninja defuse', 'Teamkill', 'Buy armor',
      'Drop weapon', 'Eco round', 'Force buy', 'Trade kill', 'First blood',
      'Entry frag', 'Support play', 'Lurk', 'Rotate fast', 'Check corners'
    ];
    
    for (let i = 0; i < 25; i++) {
      await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
      await authenticatedPage.getByLabel(/card text/i).fill(cardTexts[i]);
      await authenticatedPage.getByLabel(/category/i).selectOption('action');
      await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
      
      // Place card in grid
      const card = authenticatedPage.getByTestId('library-card').filter({ hasText: cardTexts[i] }).first();
      const row = Math.floor(i / 5);
      const col = i % 5;
      const cell = authenticatedPage.getByTestId(`grid-cell-${row}-${col}`);
      await card.dragTo(cell);
    }
    
    // Start game session
    await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
    await expect(authenticatedPage.getByText(/game started/i)).toBeVisible();
    await waitForNetworkIdle(authenticatedPage);
  });

  test.describe('Horizontal Line Wins', () => {
    test('should detect top row win', async ({ authenticatedPage }) => {
      // Mark all cells in top row (row 0)
      for (let col = 0; col < 5; col++) {
        await authenticatedPage.getByTestId(`grid-cell-0-${col}`).click();
        await expect(authenticatedPage.getByTestId(`grid-cell-0-${col}`)).toHaveAttribute('data-marked', 'true');
      }
      
      // Should detect win
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/horizontal.*line/i)).toBeVisible();
      await expect(authenticatedPage.getByRole('dialog', { name: /winner/i })).toBeVisible();
      
      // Verify winning cells are highlighted
      for (let col = 0; col < 5; col++) {
        await expect(authenticatedPage.getByTestId(`grid-cell-0-${col}`)).toHaveClass(/winning-cell/);
      }
    });

    test('should detect middle row win', async ({ authenticatedPage }) => {
      // Mark all cells in middle row (row 2)
      for (let col = 0; col < 5; col++) {
        await authenticatedPage.getByTestId(`grid-cell-2-${col}`).click();
      }
      
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/horizontal.*line/i)).toBeVisible();
    });

    test('should detect bottom row win', async ({ authenticatedPage }) => {
      // Mark all cells in bottom row (row 4)
      for (let col = 0; col < 5; col++) {
        await authenticatedPage.getByTestId(`grid-cell-4-${col}`).click();
      }
      
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/horizontal.*line/i)).toBeVisible();
    });
  });

  test.describe('Vertical Line Wins', () => {
    test('should detect left column win', async ({ authenticatedPage }) => {
      // Mark all cells in left column (col 0)
      for (let row = 0; row < 5; row++) {
        await authenticatedPage.getByTestId(`grid-cell-${row}-0`).click();
      }
      
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/vertical.*line/i)).toBeVisible();
      
      // Verify winning cells are highlighted
      for (let row = 0; row < 5; row++) {
        await expect(authenticatedPage.getByTestId(`grid-cell-${row}-0`)).toHaveClass(/winning-cell/);
      }
    });

    test('should detect middle column win', async ({ authenticatedPage }) => {
      // Mark all cells in middle column (col 2)
      for (let row = 0; row < 5; row++) {
        await authenticatedPage.getByTestId(`grid-cell-${row}-2`).click();
      }
      
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/vertical.*line/i)).toBeVisible();
    });

    test('should detect right column win', async ({ authenticatedPage }) => {
      // Mark all cells in right column (col 4)
      for (let row = 0; row < 5; row++) {
        await authenticatedPage.getByTestId(`grid-cell-${row}-4`).click();
      }
      
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/vertical.*line/i)).toBeVisible();
    });
  });

  test.describe('Diagonal Wins', () => {
    test('should detect top-left to bottom-right diagonal win', async ({ authenticatedPage }) => {
      // Mark main diagonal
      for (let i = 0; i < 5; i++) {
        await authenticatedPage.getByTestId(`grid-cell-${i}-${i}`).click();
      }
      
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/diagonal/i)).toBeVisible();
      
      // Verify winning cells are highlighted
      for (let i = 0; i < 5; i++) {
        await expect(authenticatedPage.getByTestId(`grid-cell-${i}-${i}`)).toHaveClass(/winning-cell/);
      }
    });

    test('should detect top-right to bottom-left diagonal win', async ({ authenticatedPage }) => {
      // Mark anti-diagonal
      for (let i = 0; i < 5; i++) {
        await authenticatedPage.getByTestId(`grid-cell-${i}-${4-i}`).click();
      }
      
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/diagonal/i)).toBeVisible();
      
      // Verify winning cells are highlighted
      for (let i = 0; i < 5; i++) {
        await expect(authenticatedPage.getByTestId(`grid-cell-${i}-${4-i}`)).toHaveClass(/winning-cell/);
      }
    });
  });

  test.describe('Special Pattern Wins', () => {
    test('should detect four corners win', async ({ authenticatedPage }) => {
      // Mark four corners
      const corners = [
        'grid-cell-0-0', 'grid-cell-0-4',
        'grid-cell-4-0', 'grid-cell-4-4'
      ];
      
      for (const corner of corners) {
        await authenticatedPage.getByTestId(corner).click();
      }
      
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/four.*corners/i)).toBeVisible();
      
      // Verify winning cells are highlighted
      for (const corner of corners) {
        await expect(authenticatedPage.getByTestId(corner)).toHaveClass(/winning-cell/);
      }
    });

    test('should detect X pattern win', async ({ authenticatedPage }) => {
      // Mark both diagonals for X pattern
      const xCells = [
        'grid-cell-0-0', 'grid-cell-1-1', 'grid-cell-2-2', 'grid-cell-3-3', 'grid-cell-4-4',
        'grid-cell-0-4', 'grid-cell-1-3', 'grid-cell-3-1', 'grid-cell-4-0'
      ];
      
      for (const cell of xCells) {
        await authenticatedPage.getByTestId(cell).click();
      }
      
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/x.*pattern/i)).toBeVisible();
    });

    test('should detect plus/cross pattern win', async ({ authenticatedPage }) => {
      // Mark middle row and middle column
      const plusCells = [
        'grid-cell-2-0', 'grid-cell-2-1', 'grid-cell-2-2', 'grid-cell-2-3', 'grid-cell-2-4',
        'grid-cell-0-2', 'grid-cell-1-2', 'grid-cell-3-2', 'grid-cell-4-2'
      ];
      
      for (const cell of plusCells) {
        await authenticatedPage.getByTestId(cell).click();
      }
      
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/plus.*pattern/i)).toBeVisible();
    });

    test('should detect full house win', async ({ authenticatedPage }) => {
      // Mark all cells
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          await authenticatedPage.getByTestId(`grid-cell-${row}-${col}`).click();
        }
      }
      
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/full.*house/i)).toBeVisible();
      
      // All cells should be highlighted
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          await expect(authenticatedPage.getByTestId(`grid-cell-${row}-${col}`)).toHaveClass(/winning-cell/);
        }
      }
    });
  });

  test.describe('Win Detection Edge Cases', () => {
    test('should not detect win with incomplete pattern', async ({ authenticatedPage }) => {
      // Mark 4 out of 5 cells in top row
      for (let col = 0; col < 4; col++) {
        await authenticatedPage.getByTestId(`grid-cell-0-${col}`).click();
      }
      
      // Should not show win dialog
      await expect(authenticatedPage.getByText(/bingo/i)).not.toBeVisible();
      await expect(authenticatedPage.getByRole('dialog', { name: /winner/i })).not.toBeVisible();
    });

    test('should detect multiple wins simultaneously', async ({ authenticatedPage }) => {
      // Create a scenario where multiple patterns complete at once
      // Mark most of first row and first column
      for (let i = 0; i < 4; i++) {
        await authenticatedPage.getByTestId(`grid-cell-0-${i}`).click();
        await authenticatedPage.getByTestId(`grid-cell-${i}-0`).click();
      }
      
      // Mark the corner cell that completes both patterns
      await authenticatedPage.getByTestId('grid-cell-0-4').click();
      await authenticatedPage.getByTestId('grid-cell-4-0').click();
      
      // Should detect win (may show multiple patterns or prioritize one)
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
    });

    test('should handle unmarking cells that break win patterns', async ({ authenticatedPage }) => {
      // Mark complete row
      for (let col = 0; col < 5; col++) {
        await authenticatedPage.getByTestId(`grid-cell-0-${col}`).click();
      }
      
      // Verify win is detected
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
      
      // Close win dialog
      await authenticatedPage.getByRole('button', { name: /close/i }).click();
      
      // Unmark one cell to break the pattern
      await authenticatedPage.getByTestId('grid-cell-0-2').click();
      
      // Win state should be removed
      await expect(authenticatedPage.getByText(/bingo/i)).not.toBeVisible();
      await expect(authenticatedPage.getByTestId('grid-cell-0-2')).not.toHaveClass(/winning-cell/);
    });

    test('should detect wins in different board sizes', async ({ authenticatedPage }) => {
      // Navigate back to create a 3x3 board
      await authenticatedPage.goto('/play-area/bingo');
      await authenticatedPage.getByRole('button', { name: /create.*board/i }).click();
      await authenticatedPage.getByLabel(/title/i).fill('3x3 Win Test');
      await authenticatedPage.getByRole('combobox', { name: /game type/i }).click();
      await authenticatedPage.getByRole('option', { name: /valorant/i }).click();
      await authenticatedPage.getByLabel(/board size/i).selectOption('3');
      await authenticatedPage.getByRole('button', { name: /create/i }).click();
      
      // Add 9 cards for 3x3 board
      const smallBoardCards = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
      for (let i = 0; i < 9; i++) {
        await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
        await authenticatedPage.getByLabel(/card text/i).fill(smallBoardCards[i]);
        await authenticatedPage.getByLabel(/category/i).selectOption('action');
        await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
        
        const card = authenticatedPage.getByTestId('library-card').filter({ hasText: smallBoardCards[i] }).first();
        const row = Math.floor(i / 3);
        const col = i % 3;
        const cell = authenticatedPage.getByTestId(`grid-cell-${row}-${col}`);
        await card.dragTo(cell);
      }
      
      await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
      
      // Mark top row of 3x3 board
      for (let col = 0; col < 3; col++) {
        await authenticatedPage.getByTestId(`grid-cell-0-${col}`).click();
      }
      
      // Should detect win on smaller board
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/horizontal.*line/i)).toBeVisible();
    });
  });

  test.describe('Multiplayer Win Detection', () => {
    test('should detect correct winner in multiplayer game', async ({ authenticatedPage, context }) => {
      // Navigate back to the prepared 5x5 board
      await authenticatedPage.goto(`/play-area/bingo/edit/${testBoardId}`);
      await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
      
      const sessionCode = await authenticatedPage.getByTestId('session-code').textContent();
      
      // Add second player
      const player2Page = await context.newPage();
      await player2Page.goto('/play-area/bingo');
      await player2Page.getByRole('button', { name: /join.*game/i }).click();
      await player2Page.getByLabel(/session code/i).fill(sessionCode || '');
      await player2Page.getByRole('button', { name: /join/i }).click();
      
      // Player 1 marks most of top row
      for (let col = 0; col < 4; col++) {
        await authenticatedPage.getByTestId(`grid-cell-0-${col}`).click();
      }
      
      // Player 2 marks some random cells
      await player2Page.getByTestId('grid-cell-1-1').click();
      await player2Page.getByTestId('grid-cell-2-2').click();
      
      // Player 1 completes the winning pattern
      await authenticatedPage.getByTestId('grid-cell-0-4').click();
      
      // Both players should see Player 1 as winner
      await expect(authenticatedPage.getByText(/you won/i)).toBeVisible();
      await expect(player2Page.getByText(/player.*won/i)).toBeVisible();
      
      // Winner announcement should show on both screens
      await expect(authenticatedPage.getByRole('dialog', { name: /winner/i })).toBeVisible();
      await expect(player2Page.getByRole('dialog', { name: /winner/i })).toBeVisible();
      
      await player2Page.close();
    });

    test('should handle simultaneous wins', async ({ authenticatedPage, context }) => {
      await authenticatedPage.goto(`/play-area/bingo/edit/${testBoardId}`);
      await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
      
      const sessionCode = await authenticatedPage.getByTestId('session-code').textContent();
      
      const player2Page = await context.newPage();
      await player2Page.goto('/play-area/bingo');
      await player2Page.getByRole('button', { name: /join.*game/i }).click();
      await player2Page.getByLabel(/session code/i).fill(sessionCode || '');
      await player2Page.getByRole('button', { name: /join/i }).click();
      
      // Set up scenario where both players are one cell away from winning
      // Player 1: top row (mark 4/5)
      for (let col = 0; col < 4; col++) {
        await authenticatedPage.getByTestId(`grid-cell-0-${col}`).click();
      }
      
      // Player 2: left column (mark 4/5, skip the corner that player 1 already marked)
      for (let row = 1; row < 5; row++) {
        await player2Page.getByTestId(`grid-cell-${row}-0`).click();
      }
      
      // Both players try to complete their patterns simultaneously
      await Promise.all([
        authenticatedPage.getByTestId('grid-cell-0-4').click(),
        player2Page.getByTestId('grid-cell-0-0').click()
      ]);
      
      // One player should be declared winner (based on timestamp/server processing)
      const player1Won = await authenticatedPage.getByText(/you won/i).isVisible();
      const player2Won = await player2Page.getByText(/you won/i).isVisible();
      
      expect(player1Won || player2Won).toBe(true);
      expect(player1Won && player2Won).toBe(false); // Only one should win
      
      await player2Page.close();
    });
  });

  test.describe('Win Animations and Effects', () => {
    test('should display victory animation', async ({ authenticatedPage }) => {
      // Complete a winning pattern
      for (let col = 0; col < 5; col++) {
        await authenticatedPage.getByTestId(`grid-cell-0-${col}`).click();
      }
      
      // Verify animation elements are present
      await expect(authenticatedPage.locator('.victory-animation')).toBeVisible();
      await expect(authenticatedPage.locator('.confetti-container')).toBeVisible();
      
      // Check animation is actually running
      const animationElement = authenticatedPage.locator('.victory-animation');
      const animationDuration = await animationElement.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.animationDuration;
      });
      
      expect(parseFloat(animationDuration)).toBeGreaterThan(0);
    });

    test('should play victory sound effect', async ({ authenticatedPage }) => {
      // Enable audio context for testing
      await authenticatedPage.evaluate(() => {
        // Mock audio play for testing
        window.AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        HTMLAudioElement.prototype.play = jest.fn().mockResolvedValue(undefined);
      });
      
      // Complete winning pattern
      for (let col = 0; col < 5; col++) {
        await authenticatedPage.getByTestId(`grid-cell-0-${col}`).click();
      }
      
      // Verify audio play was called
      const audioPlayCalled = await authenticatedPage.evaluate(() => {
        return HTMLAudioElement.prototype.play.mock?.calls?.length > 0;
      });
      
      expect(audioPlayCalled).toBe(true);
    });

    test('should highlight winning pattern cells', async ({ authenticatedPage }) => {
      // Complete diagonal pattern
      for (let i = 0; i < 5; i++) {
        await authenticatedPage.getByTestId(`grid-cell-${i}-${i}`).click();
      }
      
      // All diagonal cells should be highlighted
      for (let i = 0; i < 5; i++) {
        await expect(authenticatedPage.getByTestId(`grid-cell-${i}-${i}`)).toHaveClass(/winning-cell/);
      }
      
      // Non-winning cells should not be highlighted
      await expect(authenticatedPage.getByTestId('grid-cell-0-1')).not.toHaveClass(/winning-cell/);
      await expect(authenticatedPage.getByTestId('grid-cell-1-0')).not.toHaveClass(/winning-cell/);
    });
  });

  test.describe('Win Performance', () => {
    test('should detect wins quickly', async ({ authenticatedPage }) => {
      // Mark 4 cells in a row quickly
      for (let col = 0; col < 4; col++) {
        await authenticatedPage.getByTestId(`grid-cell-0-${col}`).click();
      }
      
      // Time the final cell that triggers win detection
      const startTime = Date.now();
      await authenticatedPage.getByTestId('grid-cell-0-4').click();
      
      // Win should be detected quickly
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
      const endTime = Date.now();
      
      const detectionTime = endTime - startTime;
      expect(detectionTime).toBeLessThan(50); // Should detect win in under 50ms
    });

    test('should handle rapid cell marking without missing wins', async ({ authenticatedPage }) => {
      // Rapidly mark all cells in top row
      const cells = [];
      for (let col = 0; col < 5; col++) {
        cells.push(authenticatedPage.getByTestId(`grid-cell-0-${col}`));
      }
      
      // Click all cells rapidly
      await Promise.all(cells.map(cell => cell.click()));
      
      // Should still detect the win
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/horizontal.*line/i)).toBeVisible();
    });
  });

  test.describe('Win State Persistence', () => {
    test('should maintain win state after page refresh', async ({ authenticatedPage }) => {
      // Complete winning pattern
      for (let col = 0; col < 5; col++) {
        await authenticatedPage.getByTestId(`grid-cell-0-${col}`).click();
      }
      
      await expect(authenticatedPage.getByText(/bingo/i)).toBeVisible();
      
      // Close win modal
      await authenticatedPage.getByRole('button', { name: /close/i }).click();
      
      // Refresh page
      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);
      
      // Win state should be restored
      for (let col = 0; col < 5; col++) {
        await expect(authenticatedPage.getByTestId(`grid-cell-0-${col}`)).toHaveClass(/winning-cell/);
      }
      await expect(authenticatedPage.getByTestId('game-status')).toContainText(/won/i);
    });
  });
});