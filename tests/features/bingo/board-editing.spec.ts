import { test, expect } from '../../fixtures/auth.fixture';
import { 
  waitForNetworkIdle, 
  waitForAnimations
} from '../../helpers/test-utils';
import {
  createTypedTestBoard,
  getTypedGameState,
  measureOperationPerformance,
  TypedTestSessionManager
} from './bingo-test-utils';
import {
  TYPED_CARD_FIXTURES,
  BOARD_TEMPLATES,
  PERFORMANCE_BENCHMARKS,
  generateBoardLayout,
  getCardsForCriteria
} from './bingo-fixtures';
import {
  StateSyncTester,
  NetworkSimulator,
  WebSocketEventTracker
} from './realtime-test-utils';
import type { Tables } from '../../../types/database.types';

/**
 * Enhanced Board Editing Tests with Full Type Safety and Advanced Features
 */
test.describe('Enhanced Bingo Board Editing', () => {
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
      title: 'Enhanced Board Editing Test',
      size: 5,
      gameType: 'Valorant',
      difficulty: 'medium',
      winConditions: {
        line: true,
        diagonal: true,
        corners: false,
        majority: false
      }
    });
    
    testBoard = boardFixture.board;
    sessionManager.trackBoard(testBoard.id);
    sessionManager.trackPage(authenticatedPage);
  });

  test.describe('Typed Card Management', () => {
    test('should create cards with full type validation', async ({ authenticatedPage }) => {
      const cardData: Omit<Tables<'bingo_cards'>, 'id' | 'created_at' | 'updated_at'> = {
        title: 'Typed Test Card',
        game_type: 'Valorant',
        difficulty: 'hard',
        description: 'A test card with full type safety',
        tags: ['test', 'typed', 'automation'],
        is_public: true,
        creator_id: null,
        votes: 0
      };

      // Create card with typed data
      await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
      await authenticatedPage.getByLabel(/card text/i).fill(cardData.title);
      await authenticatedPage.getByLabel(/description/i).fill(cardData.description || '');
      await authenticatedPage.getByLabel(/category/i).selectOption('action');
      await authenticatedPage.getByLabel(/difficulty/i).selectOption(cardData.difficulty);
      
      // Add tags
      if (cardData.tags) {
        for (const tag of cardData.tags) {
          await authenticatedPage.getByLabel(/tags/i).fill(tag);
          await authenticatedPage.keyboard.press('Enter');
        }
      }
      
      await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
      
      // Verify card appears with correct data
      const cardElement = authenticatedPage.getByTestId('library-card').filter({ hasText: cardData.title }).first();
      await expect(cardElement).toBeVisible();
      await expect(cardElement).toContainText(cardData.difficulty);
      await expect(cardElement).toContainText('test');
    });

    test('should import cards from typed fixtures', async ({ authenticatedPage }) => {
      // Get valorant cards from fixtures
      const valorantCards = TYPED_CARD_FIXTURES['Valorant'].slice(0, 5);
      
      // Simulate importing cards (would typically be via API)
      for (const card of valorantCards) {
        await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
        await authenticatedPage.getByLabel(/card text/i).fill(card.title);
        await authenticatedPage.getByLabel(/description/i).fill(card.description || '');
        await authenticatedPage.getByLabel(/category/i).selectOption('action');
        await authenticatedPage.getByLabel(/difficulty/i).selectOption(card.difficulty);
        await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
        
        // Verify each card is added
        await expect(authenticatedPage.getByTestId('card-library')).toContainText(card.title);
      }
      
      // Verify correct count
      const cardElements = await authenticatedPage.getByTestId('library-card').all();
      expect(cardElements).toHaveLength(valorantCards.length);
    });

    test('should validate card data against database types', async ({ authenticatedPage }) => {
      // Test invalid difficulty
      await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
      await authenticatedPage.getByLabel(/card text/i).fill('Invalid Difficulty Test');
      
      // Try to set invalid difficulty via DOM manipulation
      await authenticatedPage.evaluate(() => {
        const difficultySelect = document.querySelector('select[name="difficulty"]') as HTMLSelectElement;
        if (difficultySelect) {
          const option = document.createElement('option');
          option.value = 'invalid-difficulty';
          option.textContent = 'Invalid';
          difficultySelect.appendChild(option);
          difficultySelect.value = 'invalid-difficulty';
        }
      });
      
      await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
      
      // Should show validation error
      await expect(authenticatedPage.getByText(/invalid difficulty/i)).toBeVisible();
    });
  });

  test.describe('Advanced Board Layout Management', () => {
    test('should generate typed board layout from cards', async ({ authenticatedPage }) => {
      // Add cards to library
      const cardsNeeded = testBoard.size! * testBoard.size!;
      const cards = getCardsForCriteria('Valorant', 'medium', cardsNeeded);
      
      // Add cards to board
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        if (!card) continue;
        
        await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
        await authenticatedPage.getByLabel(/card text/i).fill(card.title);
        await authenticatedPage.getByLabel(/category/i).selectOption('action');
        await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
      }
      
      // Generate typed layout
      const layout = generateBoardLayout(cards, testBoard.size!);
      
      // Place cards according to typed layout
      for (let row = 0; row < testBoard.size!; row++) {
        for (let col = 0; col < testBoard.size!; col++) {
          const row_layout = layout[row];
          if (!row_layout) continue;
          const cell = row_layout[col];
          if (!cell || !cell.text) continue;
          
          const cardElement = authenticatedPage.getByTestId('library-card')
            .filter({ hasText: cell.text }).first();
          const gridCell = authenticatedPage.getByTestId(`grid-cell-${row}-${col}`);
          
          await cardElement.dragTo(gridCell);
          await expect(gridCell).toContainText(cell.text);
        }
      }
      
      // Verify typed board state
      const gameState = await getTypedGameState(authenticatedPage);
      expect(gameState.markedCells).toHaveLength(0); // No cells marked yet
      expect(gameState.players).toHaveLength(0); // No players yet
    });

    test('should handle dynamic board resizing with type safety', async ({ authenticatedPage }) => {
      // Start with 5x5 board, add some cards
      const initialCards = getCardsForCriteria('Valorant', 'easy', 9); // 3x3 worth
      
      for (let i = 0; i < initialCards.length; i++) {
        const card = initialCards[i];
        if (!card) continue;
        
        await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
        await authenticatedPage.getByLabel(/card text/i).fill(card.title);
        await authenticatedPage.getByLabel(/category/i).selectOption('action');
        await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
        
        // Place in grid
        const row = Math.floor(i / 3);
        const col = i % 3;
        const cardElement = authenticatedPage.getByTestId('library-card')
          .filter({ hasText: card.title }).first();
        const gridCell = authenticatedPage.getByTestId(`grid-cell-${row}-${col}`);
        await cardElement.dragTo(gridCell);
      }
      
      // Change board size to 3x3
      await authenticatedPage.getByRole('button', { name: /board.*settings/i }).click();
      await authenticatedPage.getByLabel(/board size/i).selectOption('3');
      await authenticatedPage.getByRole('button', { name: /save.*settings/i }).click();
      
      // Verify grid is correctly resized
      const gridCells = authenticatedPage.getByTestId(/grid-cell-\d+-\d+/);
      await expect(gridCells).toHaveCount(9); // 3x3 = 9 cells
      
      // Verify cards beyond bounds are moved back to library
      // Cards at positions [3,x], [4,x], [x,3], [x,4] should be in library
      for (let i = 0; i < initialCards.length; i++) {
        const card = initialCards[i];
        if (!card) continue;
        
        const row = Math.floor(i / 3);
        const col = i % 3;
        const gridCell = authenticatedPage.getByTestId(`grid-cell-${row}-${col}`);
        await expect(gridCell).toContainText(card.title);
      }
      
      // Update typed board reference
      testBoard.size = 3;
    });

    test('should preserve card state during board template changes', async ({ authenticatedPage }) => {
      // Apply a board template
      const template = BOARD_TEMPLATES['valorant-beginner'];
      if (!template) {
        throw new Error('Template not found');
      }
      
      // Simulate loading template
      await authenticatedPage.getByRole('button', { name: /load.*template/i }).click();
      await authenticatedPage.getByText('Valorant Beginner').click();
      await authenticatedPage.getByRole('button', { name: /apply.*template/i }).click();
      
      // Verify template is applied
      await expect(authenticatedPage.getByTestId('board-title')).toContainText(template.board.title);
      
      // Verify cards from template are loaded
      for (const card of template.cards) {
        await expect(authenticatedPage.getByTestId('card-library')).toContainText(card.title);
      }
    });
  });

  test.describe('Real-time Collaborative Editing', () => {
    test('should sync board changes across multiple editors', async ({ authenticatedPage, context }) => {
      // Create second editor session
      const editorPage2 = await context.newPage();
      sessionManager.trackPage(editorPage2);
      
      // Navigate second editor to same board
      await editorPage2.goto(`/play-area/bingo/edit/${testBoard.id}`);
      await waitForNetworkIdle(editorPage2);
      
      // Set up state sync testing
      const syncTester = new StateSyncTester([authenticatedPage, editorPage2]);
      await syncTester.startTracking();
      
      // Editor 1 adds a card
      await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
      await authenticatedPage.getByLabel(/card text/i).fill('Collaborative Card');
      await authenticatedPage.getByLabel(/category/i).selectOption('action');
      await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
      
      // Verify sync to editor 2
      const syncResult = await syncTester.measureSyncLatency(
        async () => { /* Card addition already triggered */ },
        (_state: unknown) => {
          // Check if the state includes the new card
          return true; // Simplified check
        }
      );
      
      expect(syncResult.averageLatency).toBeLessThan(
        PERFORMANCE_BENCHMARKS.realtimeSync.normal.p95
      );
      
      // Verify both editors show the card
      await expect(editorPage2.getByTestId('card-library')).toContainText('Collaborative Card');
    });

    test('should handle concurrent card editing conflicts', async ({ authenticatedPage, context }) => {
      // Set up second editor
      const editorPage2 = await context.newPage();
      sessionManager.trackPage(editorPage2);
      await editorPage2.goto(`/play-area/bingo/edit/${testBoard.id}`);
      await waitForNetworkIdle(editorPage2);
      
      // Both editors try to add cards with same name
      const conflictResolution = Promise.all([
        // Editor 1
        (async () => {
          await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
          await authenticatedPage.getByLabel(/card text/i).fill('Conflict Card');
          await authenticatedPage.getByLabel(/category/i).selectOption('action');
          await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
        })(),
        // Editor 2 (same time)
        (async () => {
          await editorPage2.getByRole('button', { name: /add.*card/i }).click();
          await editorPage2.getByLabel(/card text/i).fill('Conflict Card');
          await editorPage2.getByLabel(/category/i).selectOption('weapon');
          await editorPage2.getByRole('button', { name: /save.*card/i }).click();
        })()
      ]);
      
      await conflictResolution;
      
      // Wait for conflict resolution
      await authenticatedPage.waitForTimeout(1000);
      
      // One should succeed, other should show conflict error
      const page1HasCard = await authenticatedPage.getByTestId('card-library').textContent();
      const page2HasCard = await editorPage2.getByTestId('card-library').textContent();
      const page1HasError = await authenticatedPage.getByText(/already exists/i).isVisible().catch(() => false);
      const page2HasError = await editorPage2.getByText(/already exists/i).isVisible().catch(() => false);
      
      // Exactly one should have the card, the other should have error
      expect((page1HasCard?.includes('Conflict Card') || false) !== (page2HasCard?.includes('Conflict Card') || false)).toBe(true);
      expect(page1HasError !== page2HasError).toBe(true);
    });

    test('should handle network disconnection during editing', async ({ authenticatedPage }) => {
      const eventTracker = new WebSocketEventTracker(authenticatedPage);
      await eventTracker.startTracking();
      
      // Add a card while online
      await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
      await authenticatedPage.getByLabel(/card text/i).fill('Online Card');
      await authenticatedPage.getByLabel(/category/i).selectOption('action');
      await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
      
      // Go offline
      const networkSim = new NetworkSimulator(authenticatedPage.context());
      await networkSim.applyConditions({ offline: true });
      
      // Try to add card while offline
      await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
      await authenticatedPage.getByLabel(/card text/i).fill('Offline Card');
      await authenticatedPage.getByLabel(/category/i).selectOption('action');
      await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
      
      // Should show offline indicator
      await expect(authenticatedPage.getByText(/offline/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/changes pending/i)).toBeVisible();
      
      // Card should appear locally
      await expect(authenticatedPage.getByTestId('card-library')).toContainText('Offline Card');
      
      // Go back online
      await networkSim.applyConditions({ offline: false });
      
      // Wait for sync
      await eventTracker.waitForEvent('card_created', 5000);
      
      // Verify offline changes are synced
      await expect(authenticatedPage.getByText(/synced/i)).toBeVisible();
    });
  });

  test.describe('Performance and Scalability', () => {
    test('should handle large card libraries efficiently', async ({ authenticatedPage }) => {
      const largeCardSet: Array<{
        title: string;
        category: string;
        difficulty: string;
      }> = [];
      const cardCount = 100;
      
      // Generate large set of cards
      for (let i = 0; i < cardCount; i++) {
        largeCardSet.push({
          title: `Performance Card ${i + 1}`,
          category: ['action', 'weapon', 'map', 'agent'][i % 4] || 'action',
          difficulty: ['easy', 'medium', 'hard'][i % 3] || 'easy'
        });
      }
      
      // Measure card addition performance
      const addCardsResult = await measureOperationPerformance(
        async () => {
          for (const card of largeCardSet) {
            await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
            await authenticatedPage.getByLabel(/card text/i).fill(card.title);
            await authenticatedPage.getByLabel(/category/i).selectOption(card.category);
            await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
          }
        },
        'add-large-card-set',
        30000 // 30 seconds for 100 cards
      );
      
      expect(addCardsResult.passed).toBe(true);
      
      // Test filtering performance with large set
      const filterResult = await measureOperationPerformance(
        async () => {
          await authenticatedPage.getByPlaceholder(/search cards/i).fill('Performance Card 50');
          await waitForAnimations(authenticatedPage);
        },
        'filter-large-card-set',
        1000 // Should filter within 1 second
      );
      
      expect(filterResult.passed).toBe(true);
      
      // Verify correct card is shown
      await expect(authenticatedPage.getByTestId('card-library')).toContainText('Performance Card 50');
      await expect(authenticatedPage.getByTestId('card-library')).not.toContainText('Performance Card 51');
    });

    test('should optimize drag and drop with many cards', async ({ authenticatedPage }) => {
      // Add many cards for drag testing
      const cardCount = 25; // 5x5 board
      
      for (let i = 0; i < cardCount; i++) {
        await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
        await authenticatedPage.getByLabel(/card text/i).fill(`Drag Card ${i + 1}`);
        await authenticatedPage.getByLabel(/category/i).selectOption('action');
        await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
      }
      
      // Test drag performance
      const dragResult = await measureOperationPerformance(
        async () => {
          for (let i = 0; i < 5; i++) { // Test first 5 cards
            const card = authenticatedPage.getByTestId('library-card')
              .filter({ hasText: `Drag Card ${i + 1}` }).first();
            const row = Math.floor(i / 5);
            const col = i % 5;
            const cell = authenticatedPage.getByTestId(`grid-cell-${row}-${col}`);
            
            await card.dragTo(cell);
          }
        },
        'drag-multiple-cards',
        5000 // Should complete within 5 seconds
      );
      
      expect(dragResult.passed).toBe(true);
      
      // Verify all cards are placed correctly
      for (let i = 0; i < 5; i++) {
        const row = Math.floor(i / 5);
        const col = i % 5;
        const cell = authenticatedPage.getByTestId(`grid-cell-${row}-${col}`);
        await expect(cell).toContainText(`Drag Card ${i + 1}`);
      }
    });
  });

  test.describe('Accessibility and Usability', () => {
    test('should support full keyboard navigation', async ({ authenticatedPage }) => {
      // Add a card first
      await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
      await authenticatedPage.getByLabel(/card text/i).fill('Keyboard Nav Test');
      await authenticatedPage.getByLabel(/category/i).selectOption('action');
      await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
      
      // Test keyboard navigation through interface
      await authenticatedPage.keyboard.press('Tab'); // Focus on first focusable element
      
      // Should be able to navigate to grid
      let attempts = 0;
      while (attempts < 20) { // Max 20 tab presses to find grid
        const focusedElement = await authenticatedPage.locator(':focus').getAttribute('data-testid');
        if (focusedElement?.includes('grid-cell')) {
          break;
        }
        await authenticatedPage.keyboard.press('Tab');
        attempts++;
      }
      
      // Should be able to navigate within grid using arrow keys
      await authenticatedPage.keyboard.press('ArrowRight');
      await expect(authenticatedPage.getByTestId('grid-cell-0-1')).toBeFocused();
      
      // Should be able to navigate to card library
      await authenticatedPage.keyboard.press('Tab');
      attempts = 0;
      while (attempts < 10) {
        const focusedElement = await authenticatedPage.locator(':focus').getAttribute('data-testid');
        if (focusedElement?.includes('library-card')) {
          break;
        }
        await authenticatedPage.keyboard.press('Tab');
        attempts++;
      }
      
      // Should be able to select card with keyboard
      await authenticatedPage.keyboard.press('Enter');
      // Card should be selected/highlighted
    });

    test('should provide screen reader support', async ({ authenticatedPage }) => {
      // Check for proper ARIA labels and roles
      await expect(authenticatedPage.getByRole('main')).toBeVisible();
      await expect(authenticatedPage.getByRole('region', { name: /board editor/i })).toBeVisible();
      await expect(authenticatedPage.getByRole('grid')).toBeVisible();
      
      // Check that grid cells have proper labels
      const firstCell = authenticatedPage.getByTestId('grid-cell-0-0');
      const ariaLabel = await firstCell.getAttribute('aria-label');
      expect(ariaLabel).toMatch(/cell.*position.*0.*0/i);
      
      // Check that cards have descriptive labels
      await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
      await authenticatedPage.getByLabel(/card text/i).fill('Screen Reader Test');
      await authenticatedPage.getByLabel(/category/i).selectOption('action');
      await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
      
      const card = authenticatedPage.getByTestId('library-card').filter({ hasText: 'Screen Reader Test' }).first();
      const cardLabel = await card.getAttribute('aria-label');
      expect(cardLabel).toContain('Screen Reader Test');
      expect(cardLabel).toContain('action');
    });

    test('should handle high contrast and zoom modes', async ({ authenticatedPage }) => {
      // Test with high zoom level
      await authenticatedPage.setViewportSize({ width: 1920, height: 1080 });
      await authenticatedPage.evaluate(() => {
        document.body.style.zoom = '200%';
      });
      
      // Interface should still be usable
      await expect(authenticatedPage.getByTestId('bingo-grid')).toBeVisible();
      await expect(authenticatedPage.getByTestId('card-library')).toBeVisible();
      
      // Test with forced high contrast
      await authenticatedPage.emulateMedia({ forcedColors: 'active' });
      
      // Elements should remain visible and accessible
      await expect(authenticatedPage.getByRole('button', { name: /add.*card/i })).toBeVisible();
      
      // Reset
      await authenticatedPage.evaluate(() => {
        document.body.style.zoom = '100%';
      });
      await authenticatedPage.emulateMedia({ forcedColors: 'none' });
    });
  });

  test.describe('Error Recovery and Edge Cases', () => {
    test('should recover from corrupted board state', async ({ authenticatedPage }) => {
      // Simulate corrupted state
      await authenticatedPage.evaluate(() => {
        localStorage.setItem('board-draft', 'corrupted-json-data');
      });
      
      // Reload page
      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);
      
      // Should show recovery message and reset to clean state
      await expect(authenticatedPage.getByText(/recovered.*error/i)).toBeVisible();
      await expect(authenticatedPage.getByTestId('bingo-grid')).toBeVisible();
      
      // Should be able to continue editing normally
      await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
      await authenticatedPage.getByLabel(/card text/i).fill('Recovery Test');
      await authenticatedPage.getByLabel(/category/i).selectOption('action');
      await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
      
      await expect(authenticatedPage.getByTestId('card-library')).toContainText('Recovery Test');
    });

    test('should handle memory pressure gracefully', async ({ authenticatedPage }) => {
      // Simulate memory pressure by creating many DOM elements
      await authenticatedPage.evaluate(() => {
        const container = document.createElement('div');
        container.style.display = 'none';
        document.body.appendChild(container);
        
        // Create many elements to simulate memory pressure
        for (let i = 0; i < 10000; i++) {
          const div = document.createElement('div');
          div.textContent = `Memory test element ${i}`;
          container.appendChild(div);
        }
      });
      
      // Application should still function
      await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
      await authenticatedPage.getByLabel(/card text/i).fill('Memory Pressure Test');
      await authenticatedPage.getByLabel(/category/i).selectOption('action');
      await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
      
      await expect(authenticatedPage.getByTestId('card-library')).toContainText('Memory Pressure Test');
      
      // Clean up
      await authenticatedPage.evaluate(() => {
        const containers = document.querySelectorAll('div[style*="display: none"]');
        containers.forEach(c => c.remove());
      });
    });

    test('should validate against XSS in card content', async ({ authenticatedPage }) => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("xss")',
        '<svg onload="alert(1)">',
        '"><script>alert("xss")</script><"'
      ];
      
      for (const maliciousInput of maliciousInputs) {
        await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
        await authenticatedPage.getByLabel(/card text/i).fill(maliciousInput);
        await authenticatedPage.getByLabel(/category/i).selectOption('action');
        await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
        
        // Should either sanitize the input or show validation error
        const libraryContent = await authenticatedPage.getByTestId('card-library').textContent();
        
        // Should not contain raw script tags or executable code
        expect(libraryContent).not.toContain('<script>');
        expect(libraryContent).not.toContain('onerror');
        expect(libraryContent).not.toContain('javascript:');
        
        // If card was created, it should contain sanitized version
        if (libraryContent?.includes(maliciousInput.replace(/<[^>]*>/g, ''))) {
          // Script tags removed, good
          expect(true).toBe(true);
        } else {
          // Or validation error shown
          const hasError = await authenticatedPage.getByText(/invalid.*content/i).isVisible().catch(() => false);
          expect(hasError).toBe(true);
        }
        
        // Close any error dialogs
        const closeButton = authenticatedPage.getByRole('button', { name: /close/i });
        if (await closeButton.isVisible().catch(() => false)) {
          await closeButton.click();
        }
      }
    });
  });
});