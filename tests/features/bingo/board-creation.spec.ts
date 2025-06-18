import { test, expect } from '../../fixtures/auth.fixture';
import type { Route } from '@playwright/test';
import { 
  waitForNetworkIdle, 
  fillForm, 
  mockApiResponse,
  getPerformanceMetrics 
} from '../../helpers/test-utils';
import { BINGO_TEST_DATA, TIMEOUTS } from '../../helpers/test-data';

test.describe('Bingo Board Creation', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/play-area/bingo');
    await waitForNetworkIdle(authenticatedPage);
  });

  test('should create a new bingo board with valid data', async ({ authenticatedPage }) => {
    // Navigate to create board
    await authenticatedPage.getByRole('button', { name: /create.*board/i }).click();
    
    // Fill board creation form
    await fillForm(authenticatedPage, {
      title: BINGO_TEST_DATA.board.title,
      description: BINGO_TEST_DATA.board.description,
      boardSize: '5',
      gameType: 'valorant',
      difficulty: 'medium',
      tags: BINGO_TEST_DATA.board.tags.join(', '),
      isPublic: BINGO_TEST_DATA.board.isPublic,
    });

    // Submit form
    await authenticatedPage.getByRole('button', { name: /create/i }).click();
    
    // Verify success message
    await expect(authenticatedPage.getByText(/board created successfully/i)).toBeVisible();
    
    // Verify redirect to board editor
    await expect(authenticatedPage).toHaveURL(/\/bingo\/edit\/[a-zA-Z0-9-]+$/);
    
    // Verify board data is saved
    await expect(authenticatedPage.getByTestId('board-title')).toContainText(BINGO_TEST_DATA.board.title);
    await expect(authenticatedPage.getByTestId('board-description')).toContainText(BINGO_TEST_DATA.board.description);
  });

  test('should enforce board creation constraints', async ({ authenticatedPage }) => {
    await authenticatedPage.getByRole('button', { name: /create.*board/i }).click();
    
    // Test empty title validation
    await authenticatedPage.getByRole('button', { name: /create/i }).click();
    await expect(authenticatedPage.getByText(/title.*required/i)).toBeVisible();
    
    // Test title length limits
    const longTitle = 'a'.repeat(101);
    await authenticatedPage.getByLabel(/title/i).fill(longTitle);
    await expect(authenticatedPage.getByText(/title.*100 characters/i)).toBeVisible();
    
    // Test invalid board size
    await authenticatedPage.evaluate(() => {
      const sizeInput = document.querySelector('[name="boardSize"]') as HTMLInputElement;
      if (sizeInput) {
        sizeInput.value = '10';
        sizeInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await expect(authenticatedPage.getByText(/board size.*between 3 and 6/i)).toBeVisible();
    
    // Test invalid board size (too small)
    await authenticatedPage.evaluate(() => {
      const sizeInput = document.querySelector('[name="boardSize"]') as HTMLInputElement;
      if (sizeInput) {
        sizeInput.value = '2';
        sizeInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await expect(authenticatedPage.getByText(/board size.*between 3 and 6/i)).toBeVisible();
  });

  test('should validate required fields', async ({ authenticatedPage }) => {
    const createButton = authenticatedPage.getByRole('button', { name: /create.*board/i });
    await createButton.click();
    
    // Submit without filling required fields
    await authenticatedPage.getByRole('button', { name: /create/i }).click();
    
    // Check for validation errors
    await expect(authenticatedPage.getByText(/title.*required/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/game type.*required/i)).toBeVisible();
    
    // Fill title only
    await authenticatedPage.getByLabel(/title/i).fill('Valid Title');
    await authenticatedPage.getByRole('button', { name: /create/i }).click();
    
    // Should still show game type error
    await expect(authenticatedPage.getByText(/game type.*required/i)).toBeVisible();
  });

  test('should create board with minimum valid data', async ({ authenticatedPage }) => {
    await authenticatedPage.getByRole('button', { name: /create.*board/i }).click();
    
    // Fill only required fields
    await authenticatedPage.getByLabel(/title/i).fill('Minimal Board');
    await authenticatedPage.getByRole('combobox', { name: /game type/i }).click();
    await authenticatedPage.getByRole('option', { name: /valorant/i }).click();
    
    // Submit with minimal data
    await authenticatedPage.getByRole('button', { name: /create/i }).click();
    
    // Should succeed
    await expect(authenticatedPage.getByText(/board created successfully/i)).toBeVisible();
    await expect(authenticatedPage).toHaveURL(/\/bingo\/edit\/[a-zA-Z0-9-]+$/);
  });

  test('should handle board creation with maximum size', async ({ authenticatedPage }) => {
    await authenticatedPage.getByRole('button', { name: /create.*board/i }).click();
    
    // Create maximum size board (6x6)
    await fillForm(authenticatedPage, {
      title: 'Maximum Size Board',
      boardSize: '6',
      gameType: 'valorant',
      difficulty: 'hard',
    });
    
    await authenticatedPage.getByRole('button', { name: /create/i }).click();
    
    // Verify creation succeeds
    await expect(authenticatedPage.getByText(/board created successfully/i)).toBeVisible();
    
    // Verify grid has correct dimensions
    await expect(authenticatedPage.getByTestId('bingo-grid')).toBeVisible();
    const gridCells = authenticatedPage.getByTestId(/grid-cell-\d+-\d+/);
    await expect(gridCells).toHaveCount(36); // 6x6 = 36 cells
  });

  test('should create board with all optional fields', async ({ authenticatedPage }) => {
    await authenticatedPage.getByRole('button', { name: /create.*board/i }).click();
    
    // Fill all fields including optional ones
    await fillForm(authenticatedPage, {
      title: 'Complete Board',
      description: 'A board with all fields filled',
      boardSize: '5',
      gameType: 'valorant',
      difficulty: 'medium',
      tags: 'competitive, fps, esports',
      isPublic: true,
    });
    
    await authenticatedPage.getByRole('button', { name: /create/i }).click();
    
    // Verify all data is saved
    await expect(authenticatedPage.getByText(/board created successfully/i)).toBeVisible();
    
    // Check that all fields are preserved
    await expect(authenticatedPage.getByTestId('board-title')).toContainText('Complete Board');
    await expect(authenticatedPage.getByTestId('board-description')).toContainText('A board with all fields filled');
    await expect(authenticatedPage.getByTestId('board-tags')).toContainText('competitive');
    await expect(authenticatedPage.getByTestId('board-tags')).toContainText('fps');
    await expect(authenticatedPage.getByTestId('board-tags')).toContainText('esports');
  });

  test('should handle network errors during creation', async ({ authenticatedPage }) => {
    // Mock network failure
    await mockApiResponse(authenticatedPage, '**/api/bingo/boards', {
      status: 500,
      body: { error: 'Internal server error' },
    });
    
    await authenticatedPage.getByRole('button', { name: /create.*board/i }).click();
    
    await fillForm(authenticatedPage, {
      title: 'Test Board',
      gameType: 'valorant',
    });
    
    await authenticatedPage.getByRole('button', { name: /create/i }).click();
    
    // Should show error message
    await expect(authenticatedPage.getByText(/failed to create board/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/please try again/i)).toBeVisible();
    
    // Should not redirect
    await expect(authenticatedPage).toHaveURL(/\/play-area\/bingo/);
  });

  test('should show loading state during creation', async ({ authenticatedPage }) => {
    await authenticatedPage.getByRole('button', { name: /create.*board/i }).click();
    
    // Fill form
    await fillForm(authenticatedPage, {
      title: 'Loading Test Board',
      gameType: 'valorant',
    });
    
    // Mock slow response
    await authenticatedPage.route('**/api/bingo/boards', async (route: Route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });
    
    // Submit form
    const submitButton = authenticatedPage.getByRole('button', { name: /create/i });
    await submitButton.click();
    
    // Should show loading state
    await expect(submitButton).toBeDisabled();
    await expect(authenticatedPage.getByText(/creating board/i)).toBeVisible();
    
    // Should eventually succeed
    await expect(authenticatedPage.getByText(/board created successfully/i)).toBeVisible({ timeout: 10000 });
  });

  test('should create boards with different game types', async ({ authenticatedPage }) => {
    const gameTypes = ['valorant', 'minecraft', 'league-of-legends', 'custom'];
    
    for (const gameType of gameTypes) {
      await authenticatedPage.getByRole('button', { name: /create.*board/i }).click();
      
      await fillForm(authenticatedPage, {
        title: `${gameType} Board`,
        gameType: gameType,
      });
      
      await authenticatedPage.getByRole('button', { name: /create/i }).click();
      
      // Verify creation succeeds
      await expect(authenticatedPage.getByText(/board created successfully/i)).toBeVisible();
      
      // Navigate back to create another board
      await authenticatedPage.goto('/play-area/bingo');
      await waitForNetworkIdle(authenticatedPage);
    }
  });

  test('should measure board creation performance', async ({ authenticatedPage }) => {
    const startTime = Date.now();
    
    await authenticatedPage.getByRole('button', { name: /create.*board/i }).click();
    
    await fillForm(authenticatedPage, {
      title: 'Performance Test Board',
      gameType: 'valorant',
    });
    
    const formFillTime = Date.now();
    
    await authenticatedPage.getByRole('button', { name: /create/i }).click();
    
    // Wait for creation to complete
    await expect(authenticatedPage.getByText(/board created successfully/i)).toBeVisible();
    
    const completionTime = Date.now();
    
    // Check performance metrics
    const formFillDuration = formFillTime - startTime;
    const creationDuration = completionTime - formFillTime;
    
    // Form should be interactive quickly
    expect(formFillDuration).toBeLessThan(TIMEOUTS.navigation);
    
    // Creation should complete within reasonable time
    expect(creationDuration).toBeLessThan(TIMEOUTS.api);
    
    // Get detailed performance metrics
    const metrics = await getPerformanceMetrics(authenticatedPage);
    expect(metrics.domContentLoaded).toBeLessThan(3000);
  });

  test('should handle concurrent board creation', async ({ authenticatedPage, context }) => {
    // Create multiple tabs for concurrent creation
    const pages = [authenticatedPage];
    
    // Create additional pages
    for (let i = 1; i < 3; i++) {
      const newPage = await context.newPage();
      await newPage.goto('/play-area/bingo');
      await waitForNetworkIdle(newPage);
      pages.push(newPage);
    }
    
    // Create boards concurrently
    const creationPromises = pages.map(async (page, index) => {
      await page.getByRole('button', { name: /create.*board/i }).click();
      
      await fillForm(page, {
        title: `Concurrent Board ${index + 1}`,
        gameType: 'valorant',
      });
      
      await page.getByRole('button', { name: /create/i }).click();
      
      return page.waitForSelector('text=/board created successfully/i');
    });
    
    // All should succeed
    await Promise.all(creationPromises);
    
    // Verify all boards were created
    for (const page of pages) {
      await expect(page).toHaveURL(/\/bingo\/edit\/[a-zA-Z0-9-]+$/);
    }
    
    // Cleanup additional pages
    for (let i = 1; i < pages.length; i++) {
      const page = pages[i];
      if (page) {
        await page.close();
      }
    }
  });

  test('should preserve form data on validation errors', async ({ authenticatedPage }) => {
    await authenticatedPage.getByRole('button', { name: /create.*board/i }).click();
    
    // Fill form with some valid and some invalid data
    await authenticatedPage.getByLabel(/title/i).fill('Test Board');
    await authenticatedPage.getByLabel(/description/i).fill('Test description');
    // Leave game type empty to trigger validation error
    
    await authenticatedPage.getByRole('button', { name: /create/i }).click();
    
    // Should show validation error
    await expect(authenticatedPage.getByText(/game type.*required/i)).toBeVisible();
    
    // But form data should be preserved
    await expect(authenticatedPage.getByLabel(/title/i)).toHaveValue('Test Board');
    await expect(authenticatedPage.getByLabel(/description/i)).toHaveValue('Test description');
  });

  test('should redirect to boards list after creation', async ({ authenticatedPage }) => {
    await authenticatedPage.getByRole('button', { name: /create.*board/i }).click();
    
    await fillForm(authenticatedPage, {
      title: 'Redirect Test Board',
      gameType: 'valorant',
    });
    
    await authenticatedPage.getByRole('button', { name: /create/i }).click();
    
    // Wait for success message
    await expect(authenticatedPage.getByText(/board created successfully/i)).toBeVisible();
    
    // Should redirect to board editor
    await expect(authenticatedPage).toHaveURL(/\/bingo\/edit\/[a-zA-Z0-9-]+$/);
    
    // Board should be visible in the hub when navigating back
    await authenticatedPage.goto('/play-area/bingo');
    await waitForNetworkIdle(authenticatedPage);
    
    await expect(authenticatedPage.getByText('Redirect Test Board')).toBeVisible();
  });
});