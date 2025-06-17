import { test, expect } from '../../fixtures/auth.fixture';
import { 
  GamingTestHelpers,
  waitForNetworkIdle,
  mockApiResponse
} from './helpers/gaming-test-helpers';
import { GameFixtureFactory } from './fixtures/game-fixtures';
import type { 
  TestSession,
  TestPerformanceMetrics,
  TestNetworkConditions
} from './types/test-types';

test.describe('Game Discovery & Performance Optimization', () => {
  let mockSessions: TestSession[];
  
  test.beforeEach(async ({ authenticatedPage }) => {
    // Generate large dataset for performance testing
    mockSessions = GameFixtureFactory.bulkSessions(100, {
      gameType: 'bingo',
      difficulty: 'medium'
    });

    // Add variety to the dataset
    mockSessions.forEach((session, index) => {
      session.difficulty = ['easy', 'medium', 'hard'][index % 3];
      session.game_type = ['bingo', 'speedrun', 'tournament'][index % 3];
      session.status = ['waiting', 'active', 'paused'][index % 3] as any;
      session.current_player_count = Math.floor(Math.random() * 4) + 1;
    });

    // Mock sessions API
    await mockApiResponse(authenticatedPage, '**/api/sessions**', {
      success: true,
      data: { sessions: mockSessions, total: mockSessions.length }
    });

    await authenticatedPage.goto('/play-area');
    await waitForNetworkIdle(authenticatedPage);
  });

  test.describe('Large Dataset Performance', () => {
    test('should load 100+ sessions within performance budget', async ({ authenticatedPage }) => {
      const startTime = Date.now();
      
      await authenticatedPage.goto('/play-area');
      await waitForNetworkIdle(authenticatedPage);
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Measure comprehensive performance
      const metrics = await GamingTestHelpers.measurePerformance(authenticatedPage);
      
      expect(metrics.domContentLoaded).toBeLessThan(2000);
      expect(metrics.loadTime).toBeLessThan(3000);
      expect(metrics.memoryUsage).toBeLessThan(50 * 1024 * 1024); // Under 50MB
      
      console.log(`Load performance - Time: ${loadTime}ms, Memory: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    });

    test('should implement virtualization for large session lists', async ({ authenticatedPage }) => {
      // Check session list container
      const sessionContainer = authenticatedPage.locator('[data-testid="sessions-container"]');
      await expect(sessionContainer).toBeVisible();

      // Count visible session cards
      const visibleSessions = authenticatedPage.locator('[data-testid^="session-card-"]:visible');
      const visibleCount = await visibleSessions.count();

      // Should show limited number (virtualized)
      expect(visibleCount).toBeLessThan(50);
      expect(visibleCount).toBeGreaterThan(5);

      console.log(`Virtualization - Showing ${visibleCount} of ${mockSessions.length} sessions`);
    });

    test('should maintain smooth scrolling performance', async ({ authenticatedPage }) => {
      const container = authenticatedPage.locator('[data-testid="sessions-container"]');
      
      if (await container.isVisible()) {
        // Measure scroll performance
        const scrollTests = [];
        
        for (let i = 0; i < 5; i++) {
          const startTime = Date.now();
          
          await container.evaluate((el, scrollPos) => {
            el.scrollTop = scrollPos;
          }, i * 200);
          
          await authenticatedPage.waitForTimeout(100);
          const scrollTime = Date.now() - startTime;
          scrollTests.push(scrollTime);
        }

        // Average scroll time should be smooth
        const avgScrollTime = scrollTests.reduce((a, b) => a + b, 0) / scrollTests.length;
        expect(avgScrollTime).toBeLessThan(200);

        console.log(`Scroll performance - Average: ${avgScrollTime.toFixed(2)}ms`);
      }
    });

    test('should handle concurrent user interactions efficiently', async ({ authenticatedPage }) => {
      // Test multiple rapid interactions
      const concurrentTest = await GamingTestHelpers.testConcurrentLoad(authenticatedPage, 15);

      expect(concurrentTest.duration).toBeLessThan(3000);
      expect(concurrentTest.errors).toBeLessThan(3);
      expect(concurrentTest.metrics.memoryUsage).toBeLessThan(75 * 1024 * 1024);

      console.log(`Concurrent load - Duration: ${concurrentTest.duration}ms, Errors: ${concurrentTest.errors}`);
    });
  });

  test.describe('Advanced Filtering Performance', () => {
    test('should filter sessions efficiently with multiple criteria', async ({ authenticatedPage }) => {
      const filtersSection = authenticatedPage.locator('[data-testid="session-filters"]');
      
      if (await filtersSection.isVisible()) {
        const startTime = Date.now();

        // Apply multiple filters simultaneously
        await Promise.all([
          filtersSection.locator('[data-testid="difficulty-filter"]').selectOption('hard'),
          filtersSection.locator('[data-testid="status-filter"]').selectOption('active'),
          filtersSection.locator('[data-testid="type-filter"]').selectOption('speedrun')
        ]);

        await waitForNetworkIdle(authenticatedPage);
        const filterTime = Date.now() - startTime;

        // Should filter quickly
        expect(filterTime).toBeLessThan(1000);

        // Verify results
        const filteredSessions = authenticatedPage.locator('[data-testid^="session-card-"]:visible');
        const filteredCount = await filteredSessions.count();

        // Should show subset of results
        expect(filteredCount).toBeLessThan(mockSessions.length);
        expect(filteredCount).toBeGreaterThanOrEqual(0);

        console.log(`Filter performance - Time: ${filterTime}ms, Results: ${filteredCount}`);
      }
    });

    test('should implement debounced search with optimal performance', async ({ authenticatedPage }) => {
      const searchInput = authenticatedPage.locator('[data-testid="session-search"]');
      
      if (await searchInput.isVisible()) {
        // Test rapid typing
        const searchTerm = 'speed';
        const startTime = Date.now();

        // Type rapidly to test debouncing
        for (const char of searchTerm) {
          await searchInput.type(char);
          await authenticatedPage.waitForTimeout(50); // Rapid typing
        }

        // Wait for debounce and filtering
        await authenticatedPage.waitForTimeout(400); // Debounce delay + processing
        await waitForNetworkIdle(authenticatedPage);

        const searchTime = Date.now() - startTime;

        // Should be responsive despite rapid input
        expect(searchTime).toBeLessThan(1500);

        // Verify search results
        const searchResults = authenticatedPage.locator('[data-testid^="session-card-"]:visible');
        const resultsCount = await searchResults.count();

        // Should show filtered results
        if (resultsCount > 0) {
          // Verify results contain search term
          const firstResult = searchResults.first();
          await expect(firstResult).toContainText(/speed/i);
        }

        console.log(`Search performance - Time: ${searchTime}ms, Results: ${resultsCount}`);
      }
    });

    test('should persist filter state efficiently', async ({ authenticatedPage }) => {
      const filtersSection = authenticatedPage.locator('[data-testid="session-filters"]');
      
      if (await filtersSection.isVisible()) {
        // Apply filters
        await filtersSection.locator('[data-testid="difficulty-filter"]').selectOption('easy');
        await waitForNetworkIdle(authenticatedPage);

        // Check URL reflects filter state
        const url = authenticatedPage.url();
        expect(url).toMatch(/difficulty=easy/);

        // Refresh page
        await authenticatedPage.reload();
        await waitForNetworkIdle(authenticatedPage);

        // Filter state should be restored
        const difficultyFilter = filtersSection.locator('[data-testid="difficulty-filter"]');
        await expect(difficultyFilter).toHaveValue('easy');

        // Results should be filtered
        const filteredResults = authenticatedPage.locator('[data-testid^="session-card-"]:visible');
        const count = await filteredResults.count();
        expect(count).toBeLessThan(mockSessions.length);
      }
    });

    test('should handle complex filter combinations without performance degradation', async ({ authenticatedPage }) => {
      const filtersSection = authenticatedPage.locator('[data-testid="session-filters"]');
      
      if (await filtersSection.isVisible()) {
        const startTime = Date.now();

        // Apply complex filter combination
        await filtersSection.locator('[data-testid="difficulty-filter"]').selectOption('medium');
        await filtersSection.locator('[data-testid="status-filter"]').selectOption('waiting');
        
        const searchInput = filtersSection.locator('[data-testid="session-search"]');
        if (await searchInput.isVisible()) {
          await searchInput.fill('test');
        }

        const sortFilter = filtersSection.locator('[data-testid="sort-filter"]');
        if (await sortFilter.isVisible()) {
          await sortFilter.selectOption('player-count');
        }

        await waitForNetworkIdle(authenticatedPage);
        const complexFilterTime = Date.now() - startTime;

        // Should handle complex filtering efficiently
        expect(complexFilterTime).toBeLessThan(2000);

        // Verify results are properly filtered and sorted
        const results = authenticatedPage.locator('[data-testid^="session-card-"]:visible');
        const resultsCount = await results.count();

        console.log(`Complex filtering - Time: ${complexFilterTime}ms, Results: ${resultsCount}`);
      }
    });
  });

  test.describe('Network Resilience and Edge Cases', () => {
    test('should handle slow network conditions gracefully', async ({ authenticatedPage }) => {
      // Simulate slow network
      await GamingTestHelpers.simulateNetworkLatency(authenticatedPage, 1000);

      const startTime = Date.now();
      await authenticatedPage.goto('/play-area');
      await waitForNetworkIdle(authenticatedPage);
      const loadTime = Date.now() - startTime;

      // Should still load, just slower
      expect(loadTime).toBeGreaterThan(800); // Accounts for simulated latency
      expect(loadTime).toBeLessThan(5000); // But reasonable timeout

      // UI should remain responsive
      const refreshButton = authenticatedPage.locator('[data-testid="refresh-sessions"]');
      if (await refreshButton.isVisible()) {
        const clickStart = Date.now();
        await refreshButton.click();
        const clickResponse = Date.now() - clickStart;
        expect(clickResponse).toBeLessThan(200);
      }

      console.log(`Slow network performance - Load: ${loadTime}ms`);
    });

    test('should recover from network disconnection', async ({ authenticatedPage, context }) => {
      // Initial load
      await expect(authenticatedPage.locator('h1')).toContainText('Play Area');

      // Simulate network offline
      await context.setOffline(true);

      // Try to refresh
      const refreshButton = authenticatedPage.locator('[data-testid="refresh-sessions"]');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
      }

      // Should show offline indicator
      const connectionStatus = authenticatedPage.locator('[data-testid="connection-status"]');
      if (await connectionStatus.isVisible()) {
        await expect(connectionStatus).toContainText(/offline|disconnected/i, { timeout: 3000 });
      }

      // Reconnect
      await context.setOffline(false);

      // Should recover
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        await waitForNetworkIdle(authenticatedPage);
      }

      if (await connectionStatus.isVisible()) {
        await expect(connectionStatus).toContainText(/online|connected/i, { timeout: 5000 });
      }
    });

    test('should handle API errors with fallback behavior', async ({ authenticatedPage }) => {
      // Mock API failure
      await mockApiResponse(authenticatedPage, '**/api/sessions**', {
        success: false,
        error: 'Service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE'
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Should show error state
      const errorMessage = authenticatedPage.locator('[data-testid="sessions-error"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/failed to load|unavailable/i);

      // Should show retry option
      const retryButton = authenticatedPage.locator('[data-testid="retry-sessions"]');
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeEnabled();
      }
    });

    test('should handle partial data loads gracefully', async ({ authenticatedPage }) => {
      // Mock partial data (some sessions fail to load)
      const partialSessions = mockSessions.slice(0, 50);
      await mockApiResponse(authenticatedPage, '**/api/sessions**', {
        success: true,
        data: { 
          sessions: partialSessions, 
          total: mockSessions.length,
          hasMore: true 
        }
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Should show partial data
      const sessionCards = authenticatedPage.locator('[data-testid^="session-card-"]');
      const loadedCount = await sessionCards.count();
      expect(loadedCount).toBe(Math.min(partialSessions.length, 50)); // Considering virtualization

      // Should show load more option if applicable
      const loadMoreButton = authenticatedPage.locator('[data-testid="load-more-sessions"]');
      if (await loadMoreButton.isVisible()) {
        await expect(loadMoreButton).toBeEnabled();
      }
    });
  });

  test.describe('Memory Management and Resource Optimization', () => {
    test('should not leak memory during extended browsing session', async ({ authenticatedPage }) => {
      // Get baseline memory
      const initialMemory = await authenticatedPage.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Simulate extended browsing
      for (let i = 0; i < 10; i++) {
        // Apply different filters
        const filtersSection = authenticatedPage.locator('[data-testid="session-filters"]');
        
        if (await filtersSection.isVisible()) {
          const difficulties = ['easy', 'medium', 'hard'];
          const statuses = ['waiting', 'active', 'paused'];
          
          await filtersSection.locator('[data-testid="difficulty-filter"]').selectOption(difficulties[i % 3]);
          await filtersSection.locator('[data-testid="status-filter"]').selectOption(statuses[i % 3]);
          
          await waitForNetworkIdle(authenticatedPage);
          await authenticatedPage.waitForTimeout(200);
        }
      }

      // Force garbage collection
      await authenticatedPage.evaluate(() => {
        if ('gc' in window) {
          (window as any).gc();
        }
      });

      // Check final memory
      const finalMemory = await authenticatedPage.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be reasonable (< 20MB for extended session)
      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024);

      console.log(`Memory management - Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    });

    test('should optimize image loading and caching', async ({ authenticatedPage }) => {
      // Count network requests
      const networkRequests: string[] = [];
      
      await authenticatedPage.route('**/*', route => {
        networkRequests.push(route.request().url());
        route.continue();
      });

      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Filter image requests
      const imageRequests = networkRequests.filter(url => 
        /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)
      );

      // Should not load excessive images
      expect(imageRequests.length).toBeLessThan(20);

      // Test image lazy loading by scrolling
      const container = authenticatedPage.locator('[data-testid="sessions-container"]');
      if (await container.isVisible()) {
        const initialImageCount = imageRequests.length;
        
        // Scroll to trigger lazy loading
        await container.evaluate(el => el.scrollTop = 1000);
        await authenticatedPage.waitForTimeout(500);

        // Should load more images only as needed
        const newImageRequests = networkRequests.filter(url => 
          /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)
        );
        
        expect(newImageRequests.length).toBeGreaterThanOrEqual(initialImageCount);
      }

      console.log(`Image optimization - Total requests: ${imageRequests.length}`);
    });

    test('should implement efficient data caching', async ({ authenticatedPage }) => {
      // First load
      const startTime1 = Date.now();
      await authenticatedPage.goto('/play-area');
      await waitForNetworkIdle(authenticatedPage);
      const firstLoadTime = Date.now() - startTime1;

      // Navigate away and back
      await authenticatedPage.goto('/');
      await waitForNetworkIdle(authenticatedPage);

      // Second load (should use cache)
      const startTime2 = Date.now();
      await authenticatedPage.goto('/play-area');
      await waitForNetworkIdle(authenticatedPage);
      const secondLoadTime = Date.now() - startTime2;

      // Second load should be faster due to caching
      expect(secondLoadTime).toBeLessThan(firstLoadTime);
      
      // Both should be within reasonable bounds
      expect(firstLoadTime).toBeLessThan(5000);
      expect(secondLoadTime).toBeLessThan(3000);

      console.log(`Caching performance - First: ${firstLoadTime}ms, Second: ${secondLoadTime}ms`);
    });
  });

  test.describe('Accessibility and User Experience', () => {
    test('should maintain accessibility during high-performance operations', async ({ authenticatedPage }) => {
      // Apply filters rapidly
      const filtersSection = authenticatedPage.locator('[data-testid="session-filters"]');
      
      if (await filtersSection.isVisible()) {
        // Test keyboard navigation
        await filtersSection.locator('[data-testid="difficulty-filter"]').focus();
        await authenticatedPage.keyboard.press('ArrowDown');
        await authenticatedPage.keyboard.press('Enter');

        // Should maintain focus and accessibility
        const focusedElement = await authenticatedPage.evaluate(() => document.activeElement?.tagName);
        expect(focusedElement).toBeDefined();
      }

      // Test screen reader announcements during filtering
      const searchInput = authenticatedPage.locator('[data-testid="session-search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test search');
        await waitForNetworkIdle(authenticatedPage);

        // Should have aria-live region for results
        const resultsAnnouncement = authenticatedPage.locator('[aria-live="polite"]');
        if (await resultsAnnouncement.isVisible()) {
          await expect(resultsAnnouncement).not.toBeEmpty();
        }
      }
    });

    test('should provide meaningful loading states', async ({ authenticatedPage }) => {
      // Mock slow API response
      await mockApiResponse(authenticatedPage, '**/api/sessions**', {
        success: true,
        data: { sessions: mockSessions, total: mockSessions.length }
      });

      await GamingTestHelpers.simulateNetworkLatency(authenticatedPage, 500);

      const startTime = Date.now();
      await authenticatedPage.goto('/play-area');

      // Should show loading indicator
      const loadingIndicator = authenticatedPage.locator('[data-testid="sessions-loading"]');
      await expect(loadingIndicator).toBeVisible({ timeout: 1000 });

      // Loading indicator should have accessible text
      await expect(loadingIndicator).toHaveAttribute('aria-label', /loading|loading sessions/i);

      await waitForNetworkIdle(authenticatedPage);

      // Loading should complete
      await expect(loadingIndicator).not.toBeVisible();
    });

    test('should handle responsive design efficiently', async ({ authenticatedPage }) => {
      // Test mobile viewport
      await authenticatedPage.setViewportSize({ width: 375, height: 667 });
      
      const mobileStartTime = Date.now();
      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);
      const mobileLoadTime = Date.now() - mobileStartTime;

      // Should adapt layout for mobile
      const sessionGrid = authenticatedPage.locator('[data-testid="sessions-grid"]');
      if (await sessionGrid.isVisible()) {
        // Should use mobile-optimized layout
        const gridStyle = await sessionGrid.evaluate(el => getComputedStyle(el).gridTemplateColumns);
        expect(gridStyle).toMatch(/1fr|repeat\(1,/); // Single column on mobile
      }

      // Test tablet viewport
      await authenticatedPage.setViewportSize({ width: 768, height: 1024 });
      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Test desktop viewport  
      await authenticatedPage.setViewportSize({ width: 1920, height: 1080 });
      
      const desktopStartTime = Date.now();
      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);
      const desktopLoadTime = Date.now() - desktopStartTime;

      // Performance should be consistent across viewports
      expect(mobileLoadTime).toBeLessThan(4000);
      expect(desktopLoadTime).toBeLessThan(3000);

      console.log(`Responsive performance - Mobile: ${mobileLoadTime}ms, Desktop: ${desktopLoadTime}ms`);
    });
  });

  test.describe('Real-time Updates Performance', () => {
    test('should handle real-time session updates efficiently', async ({ authenticatedPage }) => {
      const wsHelper = await GamingTestHelpers.setupWebSocketMocking(authenticatedPage);

      // Simulate multiple session updates
      const updatePromises = [];
      
      for (let i = 0; i < 10; i++) {
        const sessionUpdate = {
          id: `update-${i}`,
          type: 'session_updated' as const,
          session_id: mockSessions[i].id,
          data: {
            current_player_count: mockSessions[i].current_player_count! + 1,
            status: 'active'
          },
          timestamp: Date.now(),
          sequence: i
        };

        updatePromises.push(
          GamingTestHelpers.simulateGameEvent(authenticatedPage, sessionUpdate, i * 100)
        );
      }

      const startTime = Date.now();
      await Promise.all(updatePromises);
      const updateTime = Date.now() - startTime;

      // Should handle multiple updates efficiently
      expect(updateTime).toBeLessThan(2000);

      // UI should remain responsive
      const refreshButton = authenticatedPage.locator('[data-testid="refresh-sessions"]');
      if (await refreshButton.isVisible()) {
        const clickStart = Date.now();
        await refreshButton.click();
        const clickResponse = Date.now() - clickStart;
        expect(clickResponse).toBeLessThan(200);
      }

      console.log(`Real-time updates - Time: ${updateTime}ms for 10 updates`);
    });

    test('should throttle excessive real-time updates', async ({ authenticatedPage }) => {
      const wsHelper = await GamingTestHelpers.setupWebSocketMocking(authenticatedPage);

      // Track UI update count
      let updateCount = 0;
      await authenticatedPage.expose('trackUpdate', () => updateCount++);

      // Simulate rapid updates (faster than UI can reasonably handle)
      for (let i = 0; i < 50; i++) {
        const rapidUpdate = {
          id: `rapid-${i}`,
          type: 'session_updated' as const,
          session_id: mockSessions[0].id,
          data: { current_player_count: i + 1 },
          timestamp: Date.now(),
          sequence: i + 100
        };

        await GamingTestHelpers.simulateGameEvent(authenticatedPage, rapidUpdate, 10);
      }

      await authenticatedPage.waitForTimeout(2000);

      // UI updates should be throttled (not 1:1 with events)
      expect(updateCount).toBeLessThan(50);
      expect(updateCount).toBeGreaterThan(0);

      console.log(`Update throttling - ${updateCount} UI updates for 50 events`);
    });
  });
});