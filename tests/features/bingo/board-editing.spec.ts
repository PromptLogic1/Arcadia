import { test, expect } from '../../fixtures/auth.fixture';
import { 
  waitForNetworkIdle, 
  waitForAnimations,
  mockApiResponse,
  isInViewport,
  checkAccessibility
} from '../../helpers/test-utils';
import { BINGO_TEST_DATA, TIMEOUTS } from '../../helpers/test-data';

test.describe('Bingo Board Editing', () => {
  let testBoardId: string;

  test.beforeEach(async ({ authenticatedPage }) => {
    // Create a test board first
    await authenticatedPage.goto('/play-area/bingo');
    await waitForNetworkIdle(authenticatedPage);
    
    await authenticatedPage.getByRole('button', { name: /create.*board/i }).click();
    
    await authenticatedPage.getByLabel(/title/i).fill('Test Board for Editing');
    await authenticatedPage.getByRole('combobox', { name: /game type/i }).click();
    await authenticatedPage.getByRole('option', { name: /valorant/i }).click();
    
    await authenticatedPage.getByRole('button', { name: /create/i }).click();
    await expect(authenticatedPage.getByText(/board created successfully/i)).toBeVisible();
    
    // Extract board ID from URL
    const url = authenticatedPage.url();
    testBoardId = url.split('/').pop() || '';
    
    await waitForNetworkIdle(authenticatedPage);
  });

  test('should load board editor with existing board data', async ({ authenticatedPage }) => {
    // Should already be on the editor page
    await expect(authenticatedPage).toHaveURL(/\/bingo\/edit\/[a-zA-Z0-9-]+$/);
    
    // Verify board data is loaded
    await expect(authenticatedPage.getByTestId('board-title')).toContainText('Test Board for Editing');
    await expect(authenticatedPage.getByTestId('bingo-grid')).toBeVisible();
    await expect(authenticatedPage.getByTestId('card-library')).toBeVisible();
  });

  test('should add cards to library', async ({ authenticatedPage }) => {
    // Open card creation dialog
    await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
    
    // Fill card details
    await authenticatedPage.getByLabel(/card text/i).fill('Test Card 1');
    await authenticatedPage.getByLabel(/category/i).selectOption('action');
    await authenticatedPage.getByLabel(/difficulty/i).selectOption('medium');
    
    // Save card
    await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
    
    // Verify card appears in library
    await expect(authenticatedPage.getByTestId('card-library')).toContainText('Test Card 1');
    
    // Add multiple cards
    const cardTexts = ['Test Card 2', 'Test Card 3', 'Test Card 4'];
    
    for (const cardText of cardTexts) {
      await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
      await authenticatedPage.getByLabel(/card text/i).fill(cardText);
      await authenticatedPage.getByLabel(/category/i).selectOption('action');
      await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
      
      await expect(authenticatedPage.getByTestId('card-library')).toContainText(cardText);
    }
  });

  test('should edit existing cards', async ({ authenticatedPage }) => {
    // First add a card
    await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
    await authenticatedPage.getByLabel(/card text/i).fill('Original Card Text');
    await authenticatedPage.getByLabel(/category/i).selectOption('action');
    await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
    
    // Edit the card
    await authenticatedPage.getByText('Original Card Text').click();
    await authenticatedPage.getByRole('button', { name: /edit/i }).click();
    
    // Update card text
    await authenticatedPage.getByLabel(/card text/i).clear();
    await authenticatedPage.getByLabel(/card text/i).fill('Updated Card Text');
    await authenticatedPage.getByLabel(/category/i).selectOption('weapon');
    await authenticatedPage.getByRole('button', { name: /save.*changes/i }).click();
    
    // Verify changes are applied
    await expect(authenticatedPage.getByTestId('card-library')).toContainText('Updated Card Text');
    await expect(authenticatedPage.getByTestId('card-library')).not.toContainText('Original Card Text');
  });

  test('should delete cards from library', async ({ authenticatedPage }) => {
    // Add a card to delete
    await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
    await authenticatedPage.getByLabel(/card text/i).fill('Card to Delete');
    await authenticatedPage.getByLabel(/category/i).selectOption('action');
    await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
    
    // Verify card is added
    await expect(authenticatedPage.getByTestId('card-library')).toContainText('Card to Delete');
    
    // Delete the card
    await authenticatedPage.getByText('Card to Delete').hover();
    await authenticatedPage.getByRole('button', { name: /delete/i }).click();
    
    // Confirm deletion
    await authenticatedPage.getByRole('button', { name: /confirm.*delete/i }).click();
    
    // Verify card is removed
    await expect(authenticatedPage.getByTestId('card-library')).not.toContainText('Card to Delete');
  });

  test('should drag and drop cards from library to grid', async ({ authenticatedPage }) => {
    // Add cards to library first
    const cardTexts = ['Drag Card 1', 'Drag Card 2', 'Drag Card 3'];
    
    for (const cardText of cardTexts) {
      await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
      await authenticatedPage.getByLabel(/card text/i).fill(cardText);
      await authenticatedPage.getByLabel(/category/i).selectOption('action');
      await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
    }
    
    // Wait for cards to be rendered
    await waitForAnimations(authenticatedPage);
    
    // Drag first card to grid
    const sourceCard = authenticatedPage.getByTestId('library-card').filter({ hasText: 'Drag Card 1' }).first();
    const targetCell = authenticatedPage.getByTestId('grid-cell-0-0');
    
    await sourceCard.dragTo(targetCell);
    
    // Verify card is placed in grid
    await expect(targetCell).toContainText('Drag Card 1');
    
    // Drag second card to different cell
    const sourceCard2 = authenticatedPage.getByTestId('library-card').filter({ hasText: 'Drag Card 2' }).first();
    const targetCell2 = authenticatedPage.getByTestId('grid-cell-1-1');
    
    await sourceCard2.dragTo(targetCell2);
    await expect(targetCell2).toContainText('Drag Card 2');
  });

  test('should reorder cards within grid', async ({ authenticatedPage }) => {
    // First place some cards in the grid
    await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
    await authenticatedPage.getByLabel(/card text/i).fill('Card A');
    await authenticatedPage.getByLabel(/category/i).selectOption('action');
    await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
    
    await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
    await authenticatedPage.getByLabel(/card text/i).fill('Card B');
    await authenticatedPage.getByLabel(/category/i).selectOption('action');
    await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
    
    // Place cards in grid
    const cardA = authenticatedPage.getByTestId('library-card').filter({ hasText: 'Card A' }).first();
    const cardB = authenticatedPage.getByTestId('library-card').filter({ hasText: 'Card B' }).first();
    const cell1 = authenticatedPage.getByTestId('grid-cell-0-0');
    const cell2 = authenticatedPage.getByTestId('grid-cell-0-1');
    
    await cardA.dragTo(cell1);
    await cardB.dragTo(cell2);
    
    // Verify initial placement
    await expect(cell1).toContainText('Card A');
    await expect(cell2).toContainText('Card B');
    
    // Swap cards by dragging within grid
    await cell1.dragTo(cell2);
    
    // Verify cards are swapped
    await expect(cell1).toContainText('Card B');
    await expect(cell2).toContainText('Card A');
  });

  test('should remove cards from grid using trash zone', async ({ authenticatedPage }) => {
    // Add card and place in grid
    await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
    await authenticatedPage.getByLabel(/card text/i).fill('Card to Remove');
    await authenticatedPage.getByLabel(/category/i).selectOption('action');
    await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
    
    const card = authenticatedPage.getByTestId('library-card').filter({ hasText: 'Card to Remove' }).first();
    const cell = authenticatedPage.getByTestId('grid-cell-2-2');
    
    await card.dragTo(cell);
    await expect(cell).toContainText('Card to Remove');
    
    // Drag card to trash zone
    const trashZone = authenticatedPage.getByTestId('trash-drop-zone');
    await cell.dragTo(trashZone);
    
    // Verify card is removed from grid
    await expect(cell).not.toContainText('Card to Remove');
    await expect(cell).toBeEmpty();
  });

  test('should validate card constraints', async ({ authenticatedPage }) => {
    // Test empty card text
    await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
    await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
    
    await expect(authenticatedPage.getByText(/card text.*required/i)).toBeVisible();
    
    // Test card text length limits
    const longText = 'a'.repeat(201);
    await authenticatedPage.getByLabel(/card text/i).fill(longText);
    await expect(authenticatedPage.getByText(/card text.*200 characters/i)).toBeVisible();
    
    // Test duplicate card text
    await authenticatedPage.getByLabel(/card text/i).clear();
    await authenticatedPage.getByLabel(/card text/i).fill('Duplicate Card');
    await authenticatedPage.getByLabel(/category/i).selectOption('action');
    await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
    
    // Try to add same card again
    await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
    await authenticatedPage.getByLabel(/card text/i).fill('Duplicate Card');
    await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
    
    await expect(authenticatedPage.getByText(/card already exists/i)).toBeVisible();
  });

  test('should filter cards in library', async ({ authenticatedPage }) => {
    // Add cards with different categories
    const cards = [
      { text: 'Action Card', category: 'action' },
      { text: 'Weapon Card', category: 'weapon' },
      { text: 'Map Card', category: 'map' },
      { text: 'Agent Card', category: 'agent' },
    ];
    
    for (const card of cards) {
      await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
      await authenticatedPage.getByLabel(/card text/i).fill(card.text);
      await authenticatedPage.getByLabel(/category/i).selectOption(card.category);
      await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
    }
    
    // Test category filter
    await authenticatedPage.getByRole('combobox', { name: /filter.*category/i }).click();
    await authenticatedPage.getByRole('option', { name: /weapon/i }).click();
    
    // Should show only weapon cards
    await expect(authenticatedPage.getByTestId('card-library')).toContainText('Weapon Card');
    await expect(authenticatedPage.getByTestId('card-library')).not.toContainText('Action Card');
    await expect(authenticatedPage.getByTestId('card-library')).not.toContainText('Map Card');
    
    // Test search filter
    await authenticatedPage.getByRole('combobox', { name: /filter.*category/i }).click();
    await authenticatedPage.getByRole('option', { name: /all/i }).click();
    
    await authenticatedPage.getByPlaceholder(/search cards/i).fill('Agent');
    
    // Should show only matching cards
    await expect(authenticatedPage.getByTestId('card-library')).toContainText('Agent Card');
    await expect(authenticatedPage.getByTestId('card-library')).not.toContainText('Action Card');
  });

  test('should save board changes automatically', async ({ authenticatedPage }) => {
    // Add a card
    await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
    await authenticatedPage.getByLabel(/card text/i).fill('Auto Save Test');
    await authenticatedPage.getByLabel(/category/i).selectOption('action');
    await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
    
    // Place card in grid
    const card = authenticatedPage.getByTestId('library-card').filter({ hasText: 'Auto Save Test' }).first();
    const cell = authenticatedPage.getByTestId('grid-cell-1-1');
    await card.dragTo(cell);
    
    // Should show save indicator
    await expect(authenticatedPage.getByText(/saving/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/saved/i)).toBeVisible();
    
    // Refresh page to verify changes are persisted
    await authenticatedPage.reload();
    await waitForNetworkIdle(authenticatedPage);
    
    // Verify card is still in grid
    await expect(authenticatedPage.getByTestId('grid-cell-1-1')).toContainText('Auto Save Test');
  });

  test('should handle offline editing', async ({ authenticatedPage, context }) => {
    // Add a card first
    await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
    await authenticatedPage.getByLabel(/card text/i).fill('Offline Test Card');
    await authenticatedPage.getByLabel(/category/i).selectOption('action');
    await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
    
    // Go offline
    await context.setOffline(true);
    
    // Try to edit board
    const card = authenticatedPage.getByTestId('library-card').filter({ hasText: 'Offline Test Card' }).first();
    const cell = authenticatedPage.getByTestId('grid-cell-2-2');
    await card.dragTo(cell);
    
    // Should still allow local changes
    await expect(cell).toContainText('Offline Test Card');
    
    // Should show offline indicator
    await expect(authenticatedPage.getByText(/offline/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/changes pending/i)).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
    
    // Should sync changes
    await expect(authenticatedPage.getByText(/syncing/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/saved/i)).toBeVisible();
  });

  test('should support keyboard navigation', async ({ authenticatedPage }) => {
    // Add some cards first
    await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
    await authenticatedPage.getByLabel(/card text/i).fill('Keyboard Test Card');
    await authenticatedPage.getByLabel(/category/i).selectOption('action');
    await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
    
    // Focus on first grid cell
    await authenticatedPage.getByTestId('grid-cell-0-0').focus();
    
    // Navigate with arrow keys
    await authenticatedPage.keyboard.press('ArrowRight');
    await expect(authenticatedPage.getByTestId('grid-cell-0-1')).toBeFocused();
    
    await authenticatedPage.keyboard.press('ArrowDown');
    await expect(authenticatedPage.getByTestId('grid-cell-1-1')).toBeFocused();
    
    await authenticatedPage.keyboard.press('ArrowLeft');
    await expect(authenticatedPage.getByTestId('grid-cell-1-0')).toBeFocused();
    
    await authenticatedPage.keyboard.press('ArrowUp');
    await expect(authenticatedPage.getByTestId('grid-cell-0-0')).toBeFocused();
  });

  test('should handle board size changes', async ({ authenticatedPage }) => {
    // Open board settings
    await authenticatedPage.getByRole('button', { name: /board.*settings/i }).click();
    
    // Change board size from 5x5 to 4x4
    await authenticatedPage.getByLabel(/board size/i).selectOption('4');
    await authenticatedPage.getByRole('button', { name: /save.*settings/i }).click();
    
    // Verify grid is resized
    const gridCells = authenticatedPage.getByTestId(/grid-cell-\d+-\d+/);
    await expect(gridCells).toHaveCount(16); // 4x4 = 16 cells
    
    // Verify cards beyond new size are moved to library
    // (This would require having cards in positions that would be removed)
  });

  test('should validate grid completeness', async ({ authenticatedPage }) => {
    // Try to start game with incomplete board
    await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
    
    // Should show validation error
    await expect(authenticatedPage.getByText(/board must be complete/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/empty cells/i)).toBeVisible();
    
    // Fill the board completely
    const boardSize = 5; // Default size
    const totalCells = boardSize * boardSize;
    
    // Add enough cards
    for (let i = 0; i < totalCells; i++) {
      await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
      await authenticatedPage.getByLabel(/card text/i).fill(`Card ${i + 1}`);
      await authenticatedPage.getByLabel(/category/i).selectOption('action');
      await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
      
      // Place card in grid
      const card = authenticatedPage.getByTestId('library-card').filter({ hasText: `Card ${i + 1}` }).first();
      const row = Math.floor(i / boardSize);
      const col = i % boardSize;
      const cell = authenticatedPage.getByTestId(`grid-cell-${row}-${col}`);
      await card.dragTo(cell);
    }
    
    // Now should be able to start game
    await authenticatedPage.getByRole('button', { name: /start.*game/i }).click();
    await expect(authenticatedPage.getByText(/game started/i)).toBeVisible();
  });

  test('should check accessibility of board editor', async ({ authenticatedPage }) => {
    const accessibilityResult = await checkAccessibility(authenticatedPage);
    
    if (!accessibilityResult.passed) {
      console.warn('Accessibility violations found:', accessibilityResult.violations);
    }
    
    // Key accessibility features should be present
    await expect(authenticatedPage.getByRole('main')).toBeVisible();
    await expect(authenticatedPage.getByRole('region', { name: /bingo grid/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('region', { name: /card library/i })).toBeVisible();
    
    // All interactive elements should be keyboard accessible
    const interactiveElements = await authenticatedPage.locator('button, input, select, [tabindex]').all();
    
    for (const element of interactiveElements) {
      // Each should be focusable or explicitly excluded from tab order
      const tabIndex = await element.getAttribute('tabindex');
      const isHidden = await element.isHidden();
      
      if (!isHidden && tabIndex !== '-1') {
        await element.focus();
        await expect(element).toBeFocused();
      }
    }
  });

  test('should handle undo/redo operations', async ({ authenticatedPage }) => {
    // Add a card and place it
    await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
    await authenticatedPage.getByLabel(/card text/i).fill('Undo Test Card');
    await authenticatedPage.getByLabel(/category/i).selectOption('action');
    await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
    
    const card = authenticatedPage.getByTestId('library-card').filter({ hasText: 'Undo Test Card' }).first();
    const cell = authenticatedPage.getByTestId('grid-cell-2-2');
    await card.dragTo(cell);
    
    // Verify card is placed
    await expect(cell).toContainText('Undo Test Card');
    
    // Undo the action
    await authenticatedPage.keyboard.press('Control+z');
    
    // Verify card is removed from grid
    await expect(cell).not.toContainText('Undo Test Card');
    
    // Redo the action
    await authenticatedPage.keyboard.press('Control+y');
    
    // Verify card is back in grid
    await expect(cell).toContainText('Undo Test Card');
  });
});