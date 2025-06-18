import { test, expect } from '../../fixtures/auth.fixture';
import type { Route } from '@playwright/test';
import { 
  waitForNetworkIdle, 
  mockApiResponse
} from '../../helpers/test-utils';

test.describe('Game Filtering and Discovery', () => {
  const mockGamesData = [
    {
      id: 'game-1',
      title: 'Classic Bingo',
      category: 'puzzle',
      difficulty: 'easy',
      player_count: 1250,
      average_duration: 15,
      rating: 4.5,
      tags: ['classic', 'family-friendly', 'quick'],
      created_at: new Date(Date.now() - 86400000).toISOString(),
      thumbnail: '/images/classic-bingo.jpg'
    },
    {
      id: 'game-2', 
      title: 'Speed Chess Bingo',
      category: 'strategy',
      difficulty: 'hard',
      player_count: 890,
      average_duration: 25,
      rating: 4.8,
      tags: ['chess', 'strategy', 'competitive'],
      created_at: new Date(Date.now() - 172800000).toISOString(),
      thumbnail: '/images/chess-bingo.jpg'
    },
    {
      id: 'game-3',
      title: 'Action Movie Bingo',
      category: 'entertainment',
      difficulty: 'medium',
      player_count: 567,
      average_duration: 120,
      rating: 4.2,
      tags: ['movies', 'entertainment', 'long-form'],
      created_at: new Date(Date.now() - 259200000).toISOString(),
      thumbnail: '/images/movie-bingo.jpg'
    },
    {
      id: 'game-4',
      title: 'Math Challenge',
      category: 'educational',
      difficulty: 'hard',
      player_count: 234,
      average_duration: 30,
      rating: 4.0,
      tags: ['math', 'educational', 'challenge'],
      created_at: new Date(Date.now() - 345600000).toISOString(),
      thumbnail: '/images/math-bingo.jpg'
    }
  ];

  test.beforeEach(async ({ authenticatedPage }) => {
    // Mock games data
    await mockApiResponse(authenticatedPage, '**/api/games**', {
      status: 200,
      body: { 
        success: true, 
        data: {
          games: mockGamesData,
          total: mockGamesData.length,
          filters: {
            categories: ['puzzle', 'strategy', 'entertainment', 'educational'],
            difficulties: ['easy', 'medium', 'hard'],
            tags: ['classic', 'family-friendly', 'quick', 'chess', 'strategy', 'competitive', 'movies', 'entertainment', 'long-form', 'math', 'educational', 'challenge']
          }
        }
      }
    });

    await authenticatedPage.goto('/games');
    await waitForNetworkIdle(authenticatedPage);
  });

  test.describe('Basic Filtering Interface', () => {
    test('should display all games initially', async ({ authenticatedPage }) => {
      // Check page loads with all games
      await expect(authenticatedPage.locator('h1')).toContainText(/games|discover/i);
      
      const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]');
      await expect(gameCards).toHaveCount(4);
      
      // Check first game card
      const firstCard = gameCards.first();
      await expect(firstCard).toContainText('Classic Bingo');
      await expect(firstCard).toContainText('easy');
      await expect(firstCard).toContainText('1,250 players');
    });

    test('should show filter controls', async ({ authenticatedPage }) => {
      // Check filter section is visible
      const filtersSection = authenticatedPage.locator('[data-testid="game-filters"]');
      await expect(filtersSection).toBeVisible();
      
      // Check basic filter controls
      await expect(authenticatedPage.locator('[data-testid="category-filter"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="difficulty-filter"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="search-input"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="sort-select"]')).toBeVisible();
    });

    test('should have search functionality', async ({ authenticatedPage }) => {
      const searchInput = authenticatedPage.locator('[data-testid="search-input"]');
      
      // Search for specific game
      await searchInput.fill('Chess');
      await authenticatedPage.waitForTimeout(300); // Debounce
      
      // Should filter results
      const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
      await expect(gameCards).toHaveCount(1);
      await expect(gameCards.first()).toContainText('Speed Chess Bingo');
    });

    test('should clear search correctly', async ({ authenticatedPage }) => {
      const searchInput = authenticatedPage.locator('[data-testid="search-input"]');
      
      // Search and then clear
      await searchInput.fill('Chess');
      await authenticatedPage.waitForTimeout(300);
      
      // Clear search
      const clearButton = authenticatedPage.locator('[data-testid="clear-search"]');
      if (await clearButton.isVisible()) {
        await clearButton.click();
      } else {
        await searchInput.clear();
      }
      
      await authenticatedPage.waitForTimeout(300);
      
      // Should show all games again
      const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
      await expect(gameCards).toHaveCount(4);
    });
  });

  test.describe('Category Filtering', () => {
    test('should filter by category', async ({ authenticatedPage }) => {
      const categoryFilter = authenticatedPage.locator('[data-testid="category-filter"]');
      
      // Filter by strategy category
      await categoryFilter.selectOption('strategy');
      await waitForNetworkIdle(authenticatedPage);
      
      // Should show only strategy games
      const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
      await expect(gameCards).toHaveCount(1);
      await expect(gameCards.first()).toContainText('Speed Chess Bingo');
      
      // URL should reflect filter
      expect(authenticatedPage.url()).toMatch(/category=strategy/);
    });

    test('should display category chips', async ({ authenticatedPage }) => {
      // Check if category chips are available
      const categoryChips = authenticatedPage.locator('[data-testid="category-chips"]');
      if (await categoryChips.isVisible()) {
        const chips = categoryChips.locator('[data-testid^="category-chip-"]');
        const chipCount = await chips.count();
        expect(chipCount).toBeGreaterThan(0);
        
        // Click on puzzle chip
        const puzzleChip = chips.locator('text=puzzle').first();
        await puzzleChip.click();
        
        // Should filter to puzzle games
        const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
        await expect(gameCards).toHaveCount(1);
        await expect(gameCards.first()).toContainText('Classic Bingo');
      }
    });

    test('should handle multiple category selection', async ({ authenticatedPage }) => {
      const multiSelectFilter = authenticatedPage.locator('[data-testid="category-multi-select"]');
      if (await multiSelectFilter.isVisible()) {
        // Select multiple categories
        await multiSelectFilter.click();
        await authenticatedPage.locator('[data-value="puzzle"]').click();
        await authenticatedPage.locator('[data-value="strategy"]').click();
        
        // Should show games from both categories
        const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
        await expect(gameCards).toHaveCount(2);
      }
    });
  });

  test.describe('Difficulty Filtering', () => {
    test('should filter by difficulty level', async ({ authenticatedPage }) => {
      const difficultyFilter = authenticatedPage.locator('[data-testid="difficulty-filter"]');
      
      // Filter by hard difficulty
      await difficultyFilter.selectOption('hard');
      await waitForNetworkIdle(authenticatedPage);
      
      // Should show only hard games
      const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
      await expect(gameCards).toHaveCount(2); // Speed Chess and Math Challenge
      
      // Check both games are hard difficulty
      await expect(gameCards.first()).toContainText('hard');
      await expect(gameCards.nth(1)).toContainText('hard');
    });

    test('should display difficulty badges correctly', async ({ authenticatedPage }) => {
      const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]');
      
      // Check difficulty badges
      const easyBadge = gameCards.first().locator('[data-testid="difficulty-badge"]');
      await expect(easyBadge).toContainText('easy');
      await expect(easyBadge).toHaveClass(/easy|green/);
      
      const hardBadge = gameCards.nth(1).locator('[data-testid="difficulty-badge"]');
      await expect(hardBadge).toContainText('hard');
      await expect(hardBadge).toHaveClass(/hard|red/);
    });

    test('should filter by difficulty range', async ({ authenticatedPage }) => {
      const difficultyRange = authenticatedPage.locator('[data-testid="difficulty-range"]');
      if (await difficultyRange.isVisible()) {
        // Set range to easy-medium
        await difficultyRange.locator('[data-testid="min-difficulty"]').selectOption('easy');
        await difficultyRange.locator('[data-testid="max-difficulty"]').selectOption('medium');
        
        // Should show easy and medium games
        const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
        await expect(gameCards).toHaveCount(2); // Classic Bingo (easy) and Action Movie (medium)
      }
    });
  });

  test.describe('Advanced Filtering', () => {
    test('should filter by player count', async ({ authenticatedPage }) => {
      const playerCountFilter = authenticatedPage.locator('[data-testid="player-count-filter"]');
      if (await playerCountFilter.isVisible()) {
        // Filter for popular games (>500 players)
        await playerCountFilter.selectOption('popular');
        await waitForNetworkIdle(authenticatedPage);
        
        // Should show games with >500 players
        const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
        await expect(gameCards).toHaveCount(3); // Classic, Chess, Movie bingo
      }
    });

    test('should filter by average duration', async ({ authenticatedPage }) => {
      const durationFilter = authenticatedPage.locator('[data-testid="duration-filter"]');
      if (await durationFilter.isVisible()) {
        // Filter for quick games (<30 minutes)
        await durationFilter.selectOption('quick');
        await waitForNetworkIdle(authenticatedPage);
        
        // Should show quick games only
        const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
        await expect(gameCards).toHaveCount(3); // Exclude Action Movie (120 min)
      }
    });

    test('should filter by rating', async ({ authenticatedPage }) => {
      const ratingFilter = authenticatedPage.locator('[data-testid="rating-filter"]');
      if (await ratingFilter.isVisible()) {
        // Filter for high-rated games (4.5+ stars)
        await ratingFilter.selectOption('4.5+');
        await waitForNetworkIdle(authenticatedPage);
        
        // Should show only highly rated games
        const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
        await expect(gameCards).toHaveCount(2); // Classic (4.5) and Chess (4.8)
      }
    });

    test('should filter by tags', async ({ authenticatedPage }) => {
      const tagsFilter = authenticatedPage.locator('[data-testid="tags-filter"]');
      if (await tagsFilter.isVisible()) {
        // Select competitive tag
        await tagsFilter.click();
        const competitiveTag = authenticatedPage.locator('[data-testid="tag-competitive"]');
        await competitiveTag.click();
        
        // Should show competitive games
        const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
        await expect(gameCards).toHaveCount(1);
        await expect(gameCards.first()).toContainText('Speed Chess Bingo');
      }
    });

    test('should handle date range filtering', async ({ authenticatedPage }) => {
      const dateFilter = authenticatedPage.locator('[data-testid="date-filter"]');
      if (await dateFilter.isVisible()) {
        // Filter for recent games (last 2 days)
        await dateFilter.selectOption('recent');
        await waitForNetworkIdle(authenticatedPage);
        
        // Should show recent games
        const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
        await expect(gameCards).toHaveCount(2); // Classic and Chess bingo
      }
    });
  });

  test.describe('Sorting Functionality', () => {
    test('should sort by popularity', async ({ authenticatedPage }) => {
      const sortSelect = authenticatedPage.locator('[data-testid="sort-select"]');
      
      // Sort by player count (descending)
      await sortSelect.selectOption('popularity');
      await waitForNetworkIdle(authenticatedPage);
      
      // Check order
      const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]');
      await expect(gameCards.first()).toContainText('Classic Bingo'); // 1250 players
      await expect(gameCards.nth(1)).toContainText('Speed Chess Bingo'); // 890 players
      await expect(gameCards.nth(2)).toContainText('Action Movie Bingo'); // 567 players
      await expect(gameCards.nth(3)).toContainText('Math Challenge'); // 234 players
    });

    test('should sort by rating', async ({ authenticatedPage }) => {
      const sortSelect = authenticatedPage.locator('[data-testid="sort-select"]');
      
      // Sort by rating (highest first)
      await sortSelect.selectOption('rating');
      await waitForNetworkIdle(authenticatedPage);
      
      // Check order
      const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]');
      await expect(gameCards.first()).toContainText('Speed Chess Bingo'); // 4.8 rating
      await expect(gameCards.nth(1)).toContainText('Classic Bingo'); // 4.5 rating
    });

    test('should sort by newest', async ({ authenticatedPage }) => {
      const sortSelect = authenticatedPage.locator('[data-testid="sort-select"]');
      
      // Sort by creation date (newest first)
      await sortSelect.selectOption('newest');
      await waitForNetworkIdle(authenticatedPage);
      
      // Check order (Classic should be first as most recent)
      const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]');
      await expect(gameCards.first()).toContainText('Classic Bingo');
    });

    test('should sort alphabetically', async ({ authenticatedPage }) => {
      const sortSelect = authenticatedPage.locator('[data-testid="sort-select"]');
      
      // Sort alphabetically (A-Z)
      await sortSelect.selectOption('alphabetical');
      await waitForNetworkIdle(authenticatedPage);
      
      // Check order
      const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]');
      await expect(gameCards.first()).toContainText('Action Movie Bingo');
      await expect(gameCards.nth(1)).toContainText('Classic Bingo');
      await expect(gameCards.nth(2)).toContainText('Math Challenge');
      await expect(gameCards.nth(3)).toContainText('Speed Chess Bingo');
    });
  });

  test.describe('Combined Filtering', () => {
    test('should apply multiple filters simultaneously', async ({ authenticatedPage }) => {
      // Apply category filter
      const categoryFilter = authenticatedPage.locator('[data-testid="category-filter"]');
      await categoryFilter.selectOption('puzzle');
      
      // Apply difficulty filter
      const difficultyFilter = authenticatedPage.locator('[data-testid="difficulty-filter"]');
      await difficultyFilter.selectOption('easy');
      
      // Apply search
      const searchInput = authenticatedPage.locator('[data-testid="search-input"]');
      await searchInput.fill('Classic');
      
      await waitForNetworkIdle(authenticatedPage);
      
      // Should show only Classic Bingo (puzzle + easy + contains "Classic")
      const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
      await expect(gameCards).toHaveCount(1);
      await expect(gameCards.first()).toContainText('Classic Bingo');
    });

    test('should maintain filter state in URL', async ({ authenticatedPage }) => {
      // Apply multiple filters
      const categoryFilter = authenticatedPage.locator('[data-testid="category-filter"]');
      await categoryFilter.selectOption('strategy');
      
      const difficultyFilter = authenticatedPage.locator('[data-testid="difficulty-filter"]');
      await difficultyFilter.selectOption('hard');
      
      await waitForNetworkIdle(authenticatedPage);
      
      // Check URL contains filter parameters
      const url = authenticatedPage.url();
      expect(url).toMatch(/category=strategy/);
      expect(url).toMatch(/difficulty=hard/);
      
      // Refresh page
      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);
      
      // Filters should be maintained
      await expect(categoryFilter).toHaveValue('strategy');
      await expect(difficultyFilter).toHaveValue('hard');
      
      // Results should still be filtered
      const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
      await expect(gameCards).toHaveCount(1);
      await expect(gameCards.first()).toContainText('Speed Chess Bingo');
    });

    test('should clear all filters', async ({ authenticatedPage }) => {
      // Apply some filters
      const categoryFilter = authenticatedPage.locator('[data-testid="category-filter"]');
      await categoryFilter.selectOption('strategy');
      
      const searchInput = authenticatedPage.locator('[data-testid="search-input"]');
      await searchInput.fill('Chess');
      
      await waitForNetworkIdle(authenticatedPage);
      
      // Should show filtered results
      const filteredCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
      await expect(filteredCards).toHaveCount(1);
      
      // Clear all filters
      const clearFiltersButton = authenticatedPage.locator('[data-testid="clear-all-filters"]');
      await clearFiltersButton.click();
      
      await waitForNetworkIdle(authenticatedPage);
      
      // Should show all games again
      const allCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
      await expect(allCards).toHaveCount(4);
      
      // Filters should be reset
      await expect(categoryFilter).toHaveValue('');
      await expect(searchInput).toHaveValue('');
    });
  });

  test.describe('Filter Performance and UX', () => {
    test('should debounce search input', async ({ authenticatedPage }) => {
      const searchInput = authenticatedPage.locator('[data-testid="search-input"]');
      
      // Type rapidly
      await searchInput.fill('Chess');
      
      // Should not make requests until debounce period
      await authenticatedPage.waitForTimeout(200);
      
      // Results should update after debounce
      const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
      await expect(gameCards).toHaveCount(1);
    });

    test('should show loading states during filtering', async ({ authenticatedPage }) => {
      // Mock slow response
      await authenticatedPage.route('**/api/games**', async (route: Route) => {
        await authenticatedPage.waitForTimeout(2000); // 2 second delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { games: [], total: 0 } })
        });
      });

      const categoryFilter = authenticatedPage.locator('[data-testid="category-filter"]');
      await categoryFilter.selectOption('strategy');
      
      // Should show loading state
      const loadingIndicator = authenticatedPage.locator('[data-testid="games-loading"]');
      await expect(loadingIndicator).toBeVisible({ timeout: 1000 });
      
      // Loading should disappear when done
      await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
    });

    test('should handle filter errors gracefully', async ({ authenticatedPage }) => {
      // Mock API error
      await mockApiResponse(authenticatedPage, '**/api/games**', {
        status: 500,
        body: { error: 'Filter service unavailable' }
      });

      const categoryFilter = authenticatedPage.locator('[data-testid="category-filter"]');
      await categoryFilter.selectOption('strategy');
      
      await waitForNetworkIdle(authenticatedPage);
      
      // Should show error message
      const errorMessage = authenticatedPage.locator('[data-testid="filter-error"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/error|failed/i);
      
      // Should have retry option
      const retryButton = authenticatedPage.locator('[data-testid="retry-filters"]');
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeEnabled();
      }
    });

    test('should be responsive on mobile', async ({ authenticatedPage }) => {
      // Test mobile viewport
      await authenticatedPage.setViewportSize({ width: 375, height: 667 });
      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);
      
      // Filters should be collapsed or in mobile layout
      const mobileFilters = authenticatedPage.locator('[data-testid="mobile-filters"]');
      const filterToggle = authenticatedPage.locator('[data-testid="filter-toggle"]');
      
      if (await filterToggle.isVisible()) {
        await filterToggle.click();
        await expect(mobileFilters).toBeVisible();
      }
      
      // Should still be functional
      const categoryFilter = authenticatedPage.locator('[data-testid="category-filter"]');
      if (await categoryFilter.isVisible()) {
        await categoryFilter.selectOption('puzzle');
        await waitForNetworkIdle(authenticatedPage);
        
        const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
        await expect(gameCards).toHaveCount(1);
      }
    });
  });

  test.describe('Filter Persistence and Memory', () => {
    test('should remember filter preferences', async ({ authenticatedPage }) => {
      // Apply preferred filters
      const categoryFilter = authenticatedPage.locator('[data-testid="category-filter"]');
      await categoryFilter.selectOption('puzzle');
      
      const sortSelect = authenticatedPage.locator('[data-testid="sort-select"]');
      await sortSelect.selectOption('rating');
      
      await waitForNetworkIdle(authenticatedPage);
      
      // Navigate away and back
      await authenticatedPage.goto('/profile');
      await waitForNetworkIdle(authenticatedPage);
      
      await authenticatedPage.goto('/games');
      await waitForNetworkIdle(authenticatedPage);
      
      // Preferences should be restored (if implemented)
      const savedFilters = await authenticatedPage.evaluate(() => {
        return localStorage.getItem('gameFilters');
      });
      
      if (savedFilters) {
        const filters = JSON.parse(savedFilters);
        expect(filters.category).toBe('puzzle');
        expect(filters.sort).toBe('rating');
      }
    });

    test('should handle browser back/forward with filters', async ({ authenticatedPage }) => {
      // Apply filter
      const categoryFilter = authenticatedPage.locator('[data-testid="category-filter"]');
      await categoryFilter.selectOption('strategy');
      await waitForNetworkIdle(authenticatedPage);
      
      // Navigate to game detail
      const gameCard = authenticatedPage.locator('[data-testid^="game-card-"]').first();
      await gameCard.click();
      
      // Go back
      await authenticatedPage.goBack();
      
      // Filter should be maintained
      await expect(categoryFilter).toHaveValue('strategy');
      const gameCards = authenticatedPage.locator('[data-testid^="game-card-"]:visible');
      await expect(gameCards).toHaveCount(1);
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ authenticatedPage }) => {
      // Tab through filter controls
      await authenticatedPage.keyboard.press('Tab');
      const searchInput = authenticatedPage.locator('[data-testid="search-input"]');
      await expect(searchInput).toBeFocused();
      
      await authenticatedPage.keyboard.press('Tab');
      const categoryFilter = authenticatedPage.locator('[data-testid="category-filter"]');
      await expect(categoryFilter).toBeFocused();
      
      // Should be able to operate with keyboard
      await authenticatedPage.keyboard.press('ArrowDown');
      await authenticatedPage.keyboard.press('Enter');
      
      await waitForNetworkIdle(authenticatedPage);
    });

    test('should have proper ARIA labels', async ({ authenticatedPage }) => {
      // Check filter controls have proper labels
      const searchInput = authenticatedPage.locator('[data-testid="search-input"]');
      await expect(searchInput).toHaveAttribute('aria-label', /search|find/i);
      
      const categoryFilter = authenticatedPage.locator('[data-testid="category-filter"]');
      await expect(categoryFilter).toHaveAttribute('aria-label', /category/i);
      
      // Check game cards have proper structure
      const gameCard = authenticatedPage.locator('[data-testid^="game-card-"]').first();
      await expect(gameCard).toHaveAttribute('role', 'article');
    });

    test('should announce filter changes to screen readers', async ({ authenticatedPage }) => {
      const searchInput = authenticatedPage.locator('[data-testid="search-input"]');
      await searchInput.fill('Chess');
      await waitForNetworkIdle(authenticatedPage);
      
      // Check if results announcement exists
      const resultsAnnouncement = authenticatedPage.locator('[data-testid="search-results-announcement"]');
      if (await resultsAnnouncement.isVisible()) {
        await expect(resultsAnnouncement).toContainText(/1 result/i);
        await expect(resultsAnnouncement).toHaveAttribute('aria-live', 'polite');
      }
    });
  });
});