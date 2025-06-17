import { test, expect } from '../../fixtures/auth.fixture';
import { 
  waitForNetworkIdle, 
  mockApiResponse, 
  fillForm,
  checkAccessibility,
  waitForAnimations 
} from '../../helpers/test-utils';
import { COMMUNITY_TEST_DATA, ERROR_MESSAGES, TIMEOUTS } from '../../helpers/test-data';

/**
 * Search and Filtering Functionality Tests
 * 
 * Tests the search and filter capabilities including:
 * - Text search across discussions
 * - Game and challenge type filtering
 * - Tag-based filtering
 * - Sort functionality
 * - Combined filters
 * - Search performance
 * - Filter persistence
 */

test.describe('Search and Filtering', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Create diverse test discussions for filtering
    await createTestDiscussions(page);
    await page.goto('/community');
    await waitForNetworkIdle(page);
  });

  test.describe('Text Search', () => {
    test('user can search discussions by title', async ({ authenticatedPage: page }) => {
      // Search by title keyword
      const searchInput = page.getByPlaceholder('Search discussions...');
      await searchInput.fill('shiny');
      await page.keyboard.press('Enter');
      await waitForNetworkIdle(page);

      // Verify search results
      await expect(page.getByText('Shiny hunting tips')).toBeVisible();
      await expect(page.getByText('Speed strategies')).not.toBeVisible();
      await expect(page.getByText('Bingo completion guide')).not.toBeVisible();

      // Verify search term is highlighted
      await expect(page.locator('[data-testid="search-highlight"]')).toContainText('shiny');
    });

    test('user can search discussions by content', async ({ authenticatedPage: page }) => {
      // Search by content keyword
      const searchInput = page.getByPlaceholder('Search discussions...');
      await searchInput.fill('challenges faster');
      await page.keyboard.press('Enter');
      await waitForNetworkIdle(page);

      // Verify content-based search results
      await expect(page.getByText('Speed strategies')).toBeVisible();
      await expect(page.getByText('Shiny hunting tips')).not.toBeVisible();
      await expect(page.getByText('Bingo completion guide')).not.toBeVisible();
    });

    test('search is case-insensitive', async ({ authenticatedPage: page }) => {
      const searchInput = page.getByPlaceholder('Search discussions...');
      
      // Test uppercase search
      await searchInput.fill('SHINY');
      await page.keyboard.press('Enter');
      await waitForNetworkIdle(page);
      await expect(page.getByText('Shiny hunting tips')).toBeVisible();

      // Test mixed case search
      await searchInput.fill('ShInY');
      await page.keyboard.press('Enter');
      await waitForNetworkIdle(page);
      await expect(page.getByText('Shiny hunting tips')).toBeVisible();

      // Test lowercase search
      await searchInput.fill('shiny');
      await page.keyboard.press('Enter');
      await waitForNetworkIdle(page);
      await expect(page.getByText('Shiny hunting tips')).toBeVisible();
    });

    test('search handles partial word matches', async ({ authenticatedPage: page }) => {
      const searchInput = page.getByPlaceholder('Search discussions...');
      
      // Search with partial word
      await searchInput.fill('shin');
      await page.keyboard.press('Enter');
      await waitForNetworkIdle(page);

      // Should match "Shiny hunting tips"
      await expect(page.getByText('Shiny hunting tips')).toBeVisible();
    });

    test('search provides suggestions as user types', async ({ authenticatedPage: page }) => {
      const searchInput = page.getByPlaceholder('Search discussions...');
      
      // Start typing
      await searchInput.fill('sh');
      
      // Wait for suggestions to appear
      await expect(page.locator('[data-testid="search-suggestions"]')).toBeVisible();
      await expect(page.getByText('Shiny hunting tips')).toBeVisible();

      // Click on suggestion
      await page.getByText('Shiny hunting tips').click();
      
      // Verify search is performed
      await expect(searchInput).toHaveValue('shiny');
      await expect(page.getByText('Shiny hunting tips')).toBeVisible();
    });

    test('clears search results when search is cleared', async ({ authenticatedPage: page }) => {
      const searchInput = page.getByPlaceholder('Search discussions...');
      
      // Perform search
      await searchInput.fill('shiny');
      await page.keyboard.press('Enter');
      await waitForNetworkIdle(page);
      
      // Verify filtered results
      const discussionCards = page.locator('[data-testid="discussion-card"]');
      await expect(discussionCards).toHaveCount(1);

      // Clear search
      await searchInput.fill('');
      await page.keyboard.press('Enter');
      await waitForNetworkIdle(page);

      // Verify all discussions are shown again
      await expect(discussionCards).toHaveCount(4); // All test discussions
    });

    test('handles empty search gracefully', async ({ authenticatedPage: page }) => {
      const searchInput = page.getByPlaceholder('Search discussions...');
      
      // Submit empty search
      await searchInput.fill('');
      await page.keyboard.press('Enter');
      await waitForNetworkIdle(page);

      // Should show all discussions
      const discussionCards = page.locator('[data-testid="discussion-card"]');
      await expect(discussionCards).toHaveCount(4);
    });

    test('shows no results message for non-matching search', async ({ authenticatedPage: page }) => {
      const searchInput = page.getByPlaceholder('Search discussions...');
      
      // Search for non-existent content
      await searchInput.fill('nonexistentcontent123');
      await page.keyboard.press('Enter');
      await waitForNetworkIdle(page);

      // Verify no results message
      await expect(page.getByText('No discussions found')).toBeVisible();
      await expect(page.getByText('Try adjusting your search terms')).toBeVisible();
    });
  });

  test.describe('Game Filtering', () => {
    test('user can filter discussions by game', async ({ authenticatedPage: page }) => {
      // Filter by Pokemon
      await page.getByLabel('Game').selectOption('Pokemon');
      await waitForNetworkIdle(page);

      // Verify Pokemon discussions are shown
      await expect(page.getByText('Shiny hunting tips')).toBeVisible();
      await expect(page.getByText('Bingo completion guide')).toBeVisible();
      
      // Verify non-Pokemon discussions are hidden
      await expect(page.getByText('Speed strategies')).not.toBeVisible();
      await expect(page.getByText('General gaming tips')).not.toBeVisible();

      // Filter by Sonic
      await page.getByLabel('Game').selectOption('Sonic');
      await waitForNetworkIdle(page);

      // Verify Sonic discussions are shown
      await expect(page.getByText('Speed strategies')).toBeVisible();
      
      // Verify non-Sonic discussions are hidden
      await expect(page.getByText('Shiny hunting tips')).not.toBeVisible();
      await expect(page.getByText('Bingo completion guide')).not.toBeVisible();
    });

    test('all games option shows all discussions', async ({ authenticatedPage: page }) => {
      // First filter by specific game
      await page.getByLabel('Game').selectOption('Pokemon');
      await waitForNetworkIdle(page);
      
      const filteredCards = page.locator('[data-testid="discussion-card"]');
      await expect(filteredCards).toHaveCount(2); // Only Pokemon discussions

      // Switch to "All Games"
      await page.getByLabel('Game').selectOption('All Games');
      await waitForNetworkIdle(page);

      // Verify all discussions are shown
      await expect(filteredCards).toHaveCount(4);
    });
  });

  test.describe('Challenge Type Filtering', () => {
    test('user can filter discussions by challenge type', async ({ authenticatedPage: page }) => {
      // Filter by Bingo
      await page.getByLabel('Challenge Type').selectOption('Bingo');
      await waitForNetworkIdle(page);

      // Verify Bingo discussions are shown
      await expect(page.getByText('Bingo completion guide')).toBeVisible();
      
      // Verify non-Bingo discussions are hidden
      await expect(page.getByText('Speed strategies')).not.toBeVisible();

      // Filter by Speedrun
      await page.getByLabel('Challenge Type').selectOption('Speedrun');
      await waitForNetworkIdle(page);

      // Verify Speedrun discussions are shown
      await expect(page.getByText('Speed strategies')).toBeVisible();
      
      // Verify non-Speedrun discussions are hidden
      await expect(page.getByText('Bingo completion guide')).not.toBeVisible();
    });

    test('all challenges option shows all discussions', async ({ authenticatedPage: page }) => {
      // Filter by specific challenge
      await page.getByLabel('Challenge Type').selectOption('Bingo');
      await waitForNetworkIdle(page);
      
      const filteredCards = page.locator('[data-testid="discussion-card"]');
      const bingoCount = await filteredCards.count();

      // Switch to "All Challenges"
      await page.getByLabel('Challenge Type').selectOption('All Challenges');
      await waitForNetworkIdle(page);

      // Verify more discussions are shown
      const allCount = await filteredCards.count();
      expect(allCount).toBeGreaterThan(bingoCount);
    });
  });

  test.describe('Combined Filtering', () => {
    test('user can combine game and challenge type filters', async ({ authenticatedPage: page }) => {
      // Apply both filters
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByLabel('Challenge Type').selectOption('Bingo');
      await waitForNetworkIdle(page);

      // Should only show Pokemon + Bingo discussions
      await expect(page.getByText('Bingo completion guide')).toBeVisible();
      
      // Should hide everything else
      await expect(page.getByText('Shiny hunting tips')).not.toBeVisible(); // Pokemon but not Bingo
      await expect(page.getByText('Speed strategies')).not.toBeVisible(); // Not Pokemon
    });

    test('user can combine search with filters', async ({ authenticatedPage: page }) => {
      // Apply search and game filter
      await page.getByPlaceholder('Search discussions...').fill('tips');
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.keyboard.press('Enter');
      await waitForNetworkIdle(page);

      // Should show only Pokemon discussions that match "tips"
      await expect(page.getByText('Shiny hunting tips')).toBeVisible();
      
      // Should hide non-matching results
      await expect(page.getByText('Bingo completion guide')).not.toBeVisible(); // Pokemon but no "tips"
      await expect(page.getByText('General gaming tips')).not.toBeVisible(); // Has "tips" but not Pokemon
    });

    test('filters interact correctly with each other', async ({ authenticatedPage: page }) => {
      // Start with game filter
      await page.getByLabel('Game').selectOption('Pokemon');
      await waitForNetworkIdle(page);
      
      let discussionCards = page.locator('[data-testid="discussion-card"]');
      const pokemonCount = await discussionCards.count();

      // Add challenge filter
      await page.getByLabel('Challenge Type').selectOption('Bingo');
      await waitForNetworkIdle(page);
      
      const combinedCount = await discussionCards.count();
      expect(combinedCount).toBeLessThanOrEqual(pokemonCount);

      // Add search
      await page.getByPlaceholder('Search discussions...').fill('completion');
      await page.keyboard.press('Enter');
      await waitForNetworkIdle(page);
      
      const finalCount = await discussionCards.count();
      expect(finalCount).toBeLessThanOrEqual(combinedCount);
    });
  });

  test.describe('Sorting Functionality', () => {
    test('user can sort discussions by different criteria', async ({ authenticatedPage: page }) => {
      // Sort by newest (default)
      const discussionCards = page.locator('[data-testid="discussion-card"]');
      const firstDiscussion = discussionCards.first();
      await expect(firstDiscussion).toContainText('General gaming tips'); // Most recent

      // Sort by oldest
      await page.getByLabel('Sort by').selectOption('oldest');
      await waitForNetworkIdle(page);
      await expect(firstDiscussion).toContainText('Shiny hunting tips'); // Oldest

      // Sort by most upvoted
      await page.getByLabel('Sort by').selectOption('most_upvoted');
      await waitForNetworkIdle(page);
      // Note: Would need to mock upvote data to test this properly

      // Sort by most comments
      await page.getByLabel('Sort by').selectOption('most_comments');
      await waitForNetworkIdle(page);
      // Note: Would need to mock comment data to test this properly
    });

    test('sort order persists during filtering', async ({ authenticatedPage: page }) => {
      // Set sort order
      await page.getByLabel('Sort by').selectOption('oldest');
      await waitForNetworkIdle(page);

      // Apply filter
      await page.getByLabel('Game').selectOption('Pokemon');
      await waitForNetworkIdle(page);

      // Verify sort order is maintained
      const sortSelect = page.getByLabel('Sort by');
      await expect(sortSelect).toHaveValue('oldest');
    });
  });

  test.describe('Tag Filtering', () => {
    test('user can filter by clicking on tags', async ({ authenticatedPage: page }) => {
      // Click on a tag in a discussion
      await page.getByText('#strategy').first().click();
      await waitForNetworkIdle(page);

      // Verify filtered results
      await expect(page.getByText('Discussions tagged with: strategy')).toBeVisible();
      
      // Should show discussions with that tag
      const discussionCards = page.locator('[data-testid="discussion-card"]');
      const cardTexts = await discussionCards.allTextContents();
      const strategyDiscussions = cardTexts.filter(text => text.includes('#strategy'));
      expect(strategyDiscussions.length).toBeGreaterThan(0);
    });

    test('can filter by multiple tags', async ({ authenticatedPage: page }) => {
      // Click on first tag
      await page.getByText('#strategy').first().click();
      await waitForNetworkIdle(page);

      // Add second tag filter
      await page.getByText('#help').first().click();
      await waitForNetworkIdle(page);

      // Verify both tags are shown in filter
      await expect(page.getByText('Discussions tagged with: strategy, help')).toBeVisible();
    });

    test('can remove tag filters', async ({ authenticatedPage: page }) => {
      // Apply tag filter
      await page.getByText('#strategy').first().click();
      await waitForNetworkIdle(page);

      // Remove tag filter
      await page.getByRole('button', { name: 'Remove strategy tag filter' }).click();
      await waitForNetworkIdle(page);

      // Verify filter is removed
      await expect(page.getByText('Discussions tagged with:')).not.toBeVisible();
    });
  });

  test.describe('Filter Clearing', () => {
    test('user can clear all filters at once', async ({ authenticatedPage: page }) => {
      // Apply multiple filters
      await page.getByPlaceholder('Search discussions...').fill('tips');
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByLabel('Challenge Type').selectOption('Bingo');
      await page.keyboard.press('Enter');
      await waitForNetworkIdle(page);

      // Verify filters are applied
      const discussionCards = page.locator('[data-testid="discussion-card"]');
      const filteredCount = await discussionCards.count();
      expect(filteredCount).toBeLessThan(4);

      // Clear all filters
      await page.getByRole('button', { name: /clear all filters/i }).click();
      await waitForNetworkIdle(page);

      // Verify all discussions are shown
      await expect(discussionCards).toHaveCount(4);
      await expect(page.getByPlaceholder('Search discussions...')).toHaveValue('');
      await expect(page.getByLabel('Game')).toHaveValue('All Games');
      await expect(page.getByLabel('Challenge Type')).toHaveValue('All Challenges');
    });

    test('individual filters can be cleared', async ({ authenticatedPage: page }) => {
      // Apply search filter
      await page.getByPlaceholder('Search discussions...').fill('shiny');
      await page.keyboard.press('Enter');
      await waitForNetworkIdle(page);

      // Clear search only
      await page.getByRole('button', { name: 'Clear search' }).click();
      await waitForNetworkIdle(page);

      // Verify search is cleared but other filters remain
      await expect(page.getByPlaceholder('Search discussions...')).toHaveValue('');
    });
  });

  test.describe('Filter Performance', () => {
    test('filtering is responsive with large datasets', async ({ authenticatedPage: page }) => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        title: `Discussion ${i + 1}`,
        content: `Content for discussion ${i + 1}`,
        game: i % 2 === 0 ? 'Pokemon' : 'Sonic',
        challenge_type: i % 3 === 0 ? 'Bingo' : 'Speedrun',
        tags: [`tag${i % 5}`],
        created_at: new Date(Date.now() - i * 1000).toISOString(),
        upvotes: Math.floor(Math.random() * 100),
      }));

      await mockApiResponse(page, '**/api/discussions**', {
        body: { discussions: largeDataset },
      });

      await page.reload();
      await waitForNetworkIdle(page);

      // Test filter performance
      const startTime = Date.now();
      
      await page.getByLabel('Game').selectOption('Pokemon');
      await waitForNetworkIdle(page);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete filtering within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    test('search debouncing works correctly', async ({ authenticatedPage: page }) => {
      const searchInput = page.getByPlaceholder('Search discussions...');
      
      // Type rapidly
      await searchInput.fill('s');
      await searchInput.fill('sh');
      await searchInput.fill('shi');
      await searchInput.fill('shin');
      await searchInput.fill('shiny');

      // Wait for debounce period
      await page.waitForTimeout(600); // Assuming 500ms debounce

      // Only final search should be executed
      await expect(page.getByText('Shiny hunting tips')).toBeVisible();
    });
  });

  test.describe('Filter State Persistence', () => {
    test('filters persist during navigation', async ({ authenticatedPage: page }) => {
      // Apply filters
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByLabel('Sort by').selectOption('oldest');
      await waitForNetworkIdle(page);

      // Navigate away and back
      await page.goto('/');
      await page.goto('/community');
      await waitForNetworkIdle(page);

      // Verify filters are restored
      await expect(page.getByLabel('Game')).toHaveValue('Pokemon');
      await expect(page.getByLabel('Sort by')).toHaveValue('oldest');
    });

    test('search query persists in URL', async ({ authenticatedPage: page }) => {
      // Perform search
      await page.getByPlaceholder('Search discussions...').fill('shiny hunting');
      await page.keyboard.press('Enter');
      await waitForNetworkIdle(page);

      // Verify URL contains search query
      expect(page.url()).toContain('search=shiny%20hunting');

      // Reload page
      await page.reload();
      await waitForNetworkIdle(page);

      // Verify search is restored
      await expect(page.getByPlaceholder('Search discussions...')).toHaveValue('shiny hunting');
      await expect(page.getByText('Shiny hunting tips')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('filter controls are accessible', async ({ authenticatedPage: page }) => {
      // Check accessibility of filter section
      const accessibilityResult = await checkAccessibility(page, '[data-testid="filters-section"]');
      expect(accessibilityResult.passed).toBe(true);

      // Test keyboard navigation
      await page.keyboard.press('Tab'); // Focus search input
      await expect(page.getByPlaceholder('Search discussions...')).toBeFocused();

      await page.keyboard.press('Tab'); // Focus game select
      await expect(page.getByLabel('Game')).toBeFocused();

      await page.keyboard.press('Tab'); // Focus challenge select
      await expect(page.getByLabel('Challenge Type')).toBeFocused();

      await page.keyboard.press('Tab'); // Focus sort select
      await expect(page.getByLabel('Sort by')).toBeFocused();
    });

    test('filter results are announced to screen readers', async ({ authenticatedPage: page }) => {
      // Apply filter
      await page.getByLabel('Game').selectOption('Pokemon');
      await waitForNetworkIdle(page);

      // Verify screen reader announcement
      await expect(page.locator('[aria-live="polite"]')).toContainText('Showing 2 discussions for Pokemon');
    });
  });
});

// Helper function to create test discussions
async function createTestDiscussions(page: any) {
  const discussions = [
    {
      title: 'Shiny hunting tips',
      content: 'Best methods for finding shinies in Pokemon games',
      game: 'Pokemon',
      challengeType: 'Achievement Hunt',
      tags: ['strategy', 'help'],
    },
    {
      title: 'Speed strategies',
      content: 'How to complete challenges faster in Sonic games',
      game: 'Sonic',
      challengeType: 'Speedrun',
      tags: ['strategy', 'advanced'],
    },
    {
      title: 'Bingo completion guide',
      content: 'Complete guide for Pokemon bingo challenges',
      game: 'Pokemon',
      challengeType: 'Bingo',
      tags: ['guide', 'beginner'],
    },
    {
      title: 'General gaming tips',
      content: 'Universal tips that work across all games',
      game: 'All Games',
      challengeType: null,
      tags: ['tips', 'general'],
    },
  ];

  for (const discussion of discussions) {
    await page.goto('/community');
    await page.getByRole('button', { name: /new discussion/i }).click();
    
    await fillForm(page, {
      title: discussion.title,
      content: discussion.content,
    });
    
    await page.getByLabel('Game').selectOption(discussion.game);
    if (discussion.challengeType) {
      await page.getByLabel('Challenge Type').selectOption(discussion.challengeType);
    }
    
    // Add tags
    for (const tag of discussion.tags) {
      await page.getByLabel('Tags').fill(tag);
      await page.keyboard.press('Enter');
    }
    
    await page.getByRole('button', { name: /create discussion/i }).click();
    await waitForNetworkIdle(page);
    
    // Small delay to ensure discussions have different timestamps
    await page.waitForTimeout(100);
  }
}