import { test, expect } from '../../fixtures/auth.fixture';
import type {
  Discussion,
  Comment,
  DiscussionWithAuthor,
  CommentWithAuthor,
  UserScenario,
  SearchFilters,
  RateLimitConfig,
  ModerationPattern,
} from './types';
import {
  createTypedDiscussion,
  createTypedComment,
  generateDiscussionData,
  generateCommentData,
  testRealTimeUpdates,
  testRateLimit,
  testAccessibility,
  measurePerformance,
  testConcurrentOperations,
  testSearchAndFilters,
  loginAsUser,
  TEST_SCENARIOS,
} from './community-test-utils';
import {
  testMultiTabRealtime,
  testRaceConditions,
  testNetworkResilience,
  testOptimisticUpdates,
  realtimeTestManager,
} from './realtime-test-utils';
import {
  MODERATION_TEST_PATTERNS,
  calculateSpamScore,
  moderateContent,
  ADVANCED_SPAM_PATTERNS,
  MULTILINGUAL_SPAM_PATTERNS,
  GAMING_CONTEXT_PATTERNS,
  MODERATION_TEST_SCENARIOS,
} from './moderation-patterns';
import { USER_TEST_SCENARIOS, RATE_LIMIT_TESTS } from './types';
import { waitForNetworkIdle } from '../../helpers/test-utils';

/**
 * Enhanced Community & Social Features Test Suite
 * 
 * This comprehensive test suite covers:
 * - Advanced type-safe testing with database schema validation
 * - Real-time multi-tab synchronization testing
 * - Sophisticated content moderation and spam detection
 * - Rate limiting with multiple algorithms (sliding window, token bucket)
 * - Accessibility compliance (WCAG 2.1 AA)
 * - Performance optimization validation
 * - Concurrent operation testing and race condition detection
 * - Advanced search and filtering capabilities
 * - Multilingual content support
 * - Edge case handling and security testing
 */

test.describe('Enhanced Community & Social Features', () => {
  test.describe('Type-Safe Discussion Management', () => {
    test('creates discussions with full database type validation', async ({ authenticatedPage: page }) => {
      const discussionData = generateDiscussionData({
        scenario: 'regularUser',
        contentType: 'safe',
      });

      const discussionId = await createTypedDiscussion(page, discussionData, {
        validate: true,
        user: USER_TEST_SCENARIOS.regularUser,
      });

      // Verify discussion was created with proper typing
      await page.goto(`/community/discussions/${discussionId}`);
      await expect(page.getByTestId('discussion-title')).toContainText(discussionData.title!);
      await expect(page.getByTestId('discussion-game')).toContainText(discussionData.game!);
      
      if (discussionData.challenge_type) {
        await expect(page.getByTestId('discussion-challenge-type')).toContainText(discussionData.challenge_type);
      }
      
      if (discussionData.tags) {
        for (const tag of discussionData.tags) {
          await expect(page.getByText(`#${tag}`)).toBeVisible();
        }
      }
    });

    test('validates discussion creation with Zod schema compliance', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      const validationTests = [
        { field: 'title', value: '', expectedError: 'Title is required' },
        { field: 'title', value: 'x'.repeat(256), expectedError: 'Title too long' },
        { field: 'content', value: '', expectedError: 'Content is required' },
        { field: 'content', value: 'x'.repeat(5001), expectedError: 'Content must be less than 5000 characters' },
        { field: 'game', value: '', expectedError: 'Please select a specific game' },
      ];

      for (const testCase of validationTests) {
        // Clear all fields first
        await page.getByLabel('Title').fill('');
        await page.getByLabel('Content').fill('');
        
        // Fill test values
        if (testCase.field === 'title') {
          await page.getByLabel('Title').fill(testCase.value);
          await page.getByLabel('Content').fill('Valid content');
        } else if (testCase.field === 'content') {
          await page.getByLabel('Title').fill('Valid Title');
          await page.getByLabel('Content').fill(testCase.value);
        } else if (testCase.field === 'game') {
          await page.getByLabel('Title').fill('Valid Title');
          await page.getByLabel('Content').fill('Valid content');
          // Don't select game to test validation
        }
        
        await page.getByRole('button', { name: /create discussion/i }).click();
        await expect(page.getByText(testCase.expectedError)).toBeVisible();
      }
    });

    test('handles tag validation with maximum limit enforcement', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();
      
      await page.getByLabel('Title').fill('Tag Validation Test');
      await page.getByLabel('Content').fill('Testing tag limits');
      await page.getByLabel('Game').selectOption('Pokemon');

      // Add 5 tags (maximum allowed)
      const tags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'];
      for (const tag of tags) {
        await page.getByLabel('Tags').fill(tag);
        await page.keyboard.press('Enter');
        await expect(page.getByText(`#${tag}`)).toBeVisible();
      }

      // Try to add 6th tag
      await page.getByLabel('Tags').fill('tag6');
      await page.keyboard.press('Enter');
      
      // Verify 6th tag is rejected
      await expect(page.getByText('Maximum 5 tags allowed')).toBeVisible();
      await expect(page.getByText('#tag6')).not.toBeVisible();
      
      // Verify tag input is disabled
      await expect(page.getByLabel('Tags')).toBeDisabled();
    });
  });

  test.describe('Advanced Real-Time Features', () => {
    test('synchronizes comments across multiple browser sessions', async ({ authenticatedPage: page, context }) => {
      const discussionId = await TEST_SCENARIOS.createBasicDiscussion(page);
      
      const result = await testMultiTabRealtime(page, await context.newPage(), {
        type: 'comment',
        discussionId,
        data: { content: 'Real-time synchronized comment test' },
      });

      expect(result.syncTime).toBeLessThan(3000); // Should sync within 3 seconds
      expect(result.page1Events.length).toBeGreaterThan(0);
      expect(result.page2Events.length).toBeGreaterThan(0);
    });

    test('handles race conditions in concurrent comment posting', async ({ authenticatedPage: page, context }) => {
      const discussionId = await TEST_SCENARIOS.createBasicDiscussion(page);
      const page2 = await context.newPage();
      const page3 = await context.newPage();
      
      // Navigate all pages to the discussion
      await Promise.all([
        page.goto(`/community/discussions/${discussionId}`),
        page2.goto(`/community/discussions/${discussionId}`),
        page3.goto(`/community/discussions/${discussionId}`),
      ]);

      const result = await testRaceConditions([page, page2, page3], [
        {
          pageIndex: 0,
          operation: async () => {
            await page.getByPlaceholder('What are your thoughts on this discussion?').fill('Comment from page 1');
            await page.getByRole('button', { name: /post comment/i }).click();
            return 'comment-1';
          },
          expectedOutcome: 'success',
        },
        {
          pageIndex: 1,
          operation: async () => {
            await page2.getByPlaceholder('What are your thoughts on this discussion?').fill('Comment from page 2');
            await page2.getByRole('button', { name: /post comment/i }).click();
            return 'comment-2';
          },
          expectedOutcome: 'success',
        },
        {
          pageIndex: 2,
          operation: async () => {
            await page3.getByPlaceholder('What are your thoughts on this discussion?').fill('Comment from page 3');
            await page3.getByRole('button', { name: /post comment/i }).click();
            return 'comment-3';
          },
          expectedOutcome: 'success',
        },
      ]);

      expect(result.results.filter(r => r.success).length).toBeGreaterThanOrEqual(2);
      expect(result.conflictResolution).toBeOneOf(['first_wins', 'merge']);
    });

    test('validates optimistic updates with server confirmation', async ({ authenticatedPage: page }) => {
      const discussionId = await TEST_SCENARIOS.createBasicDiscussion(page);
      await page.goto(`/community/discussions/${discussionId}`);
      
      const result = await testOptimisticUpdates(page, 'upvote', {});
      
      expect(result.optimisticUpdateTime).toBeLessThan(500); // Should be immediate
      expect(result.serverConfirmationTime).toBeLessThan(3000); // Server should confirm quickly
      expect(result.rollbackOccurred).toBe(false); // Should not rollback for valid operations
    });

    test('recovers gracefully from network failures', async ({ authenticatedPage: page }) => {
      const discussionId = await TEST_SCENARIOS.createBasicDiscussion(page);
      await page.goto(`/community/discussions/${discussionId}`);
      
      const result = await testNetworkResilience(page, 'offline');
      
      expect(result.dataIntegrity).toBe(true);
      if (result.reconnectionTime) {
        expect(result.reconnectionTime).toBeLessThan(10000); // Should reconnect within 10 seconds
      }
    });
  });

  test.describe('Comprehensive Content Moderation', () => {
    test('detects spam with ML-like confidence scoring', async ({ authenticatedPage: page }) => {
      const spamPatterns = MODERATION_TEST_SCENARIOS.autoSpamDetection;
      
      for (const pattern of spamPatterns.slice(0, 3)) { // Test first 3 patterns
        await page.goto('/community');
        await page.getByRole('button', { name: /new discussion/i }).click();
        
        await page.getByLabel('Title').fill('Spam Detection Test');
        await page.getByLabel('Content').fill(pattern.content);
        await page.getByLabel('Game').selectOption('Pokemon');
        
        await page.getByRole('button', { name: /create discussion/i }).click();
        
        // Verify spam detection
        switch (pattern.expectedAction) {
          case 'auto_remove':
            await expect(page.getByText(/content.*blocked.*spam/i)).toBeVisible();
            break;
          case 'auto_flag':
            await expect(page.getByText(/content.*flagged.*review/i)).toBeVisible();
            break;
          case 'require_review':
            await expect(page.getByText(/content.*pending.*review/i)).toBeVisible();
            break;
        }
        
        if (pattern.confidence === 'high') {
          await expect(page.getByText(/confidence.*high/i)).toBeVisible();
        }
      }
    });

    test('handles multilingual spam detection', async ({ authenticatedPage: page }) => {
      const multilingualPatterns = MODERATION_TEST_SCENARIOS.multilingualSupport;
      
      for (const pattern of multilingualPatterns.slice(0, 2)) {
        const result = calculateSpamScore(pattern.content);
        
        expect(result.score).toBeGreaterThan(0.6); // Should detect multilingual spam
        expect(result.confidence).toBeOneOf(['medium', 'high']);
        expect(result.reasons).toContain(pattern.reasons[0]);
      }
    });

    test('prevents false positives on legitimate gaming content', async ({ authenticatedPage: page }) => {
      const legitimateContent = [
        'This free play mode is amazing! Great value for money saved.',
        'Best gold farming strategy guide for beginners.',
        'Looking to trade my shiny Charizard for Blastoise.',
        'Frame-perfect inputs using tool-assisted practice methods.',
      ];

      for (const content of legitimateContent) {
        const result = calculateSpamScore(content);
        
        expect(result.score).toBeLessThan(0.5); // Should not flag legitimate content
        expect(result.confidence).toBeOneOf(['low', 'medium']);
      }
    });

    test('enforces sophisticated rate limiting algorithms', async ({ authenticatedPage: page }) => {
      const rateLimitTests = RATE_LIMIT_TESTS.slice(0, 2); // Test first 2 scenarios
      
      for (const config of rateLimitTests) {
        const operation = async () => {
          if (config.action === 'create_comment') {
            const discussionId = await TEST_SCENARIOS.createBasicDiscussion(page);
            await page.goto(`/community/discussions/${discussionId}`);
            await page.getByPlaceholder('What are your thoughts on this discussion?').fill(`Rate limit test comment ${Date.now()}`);
            await page.getByRole('button', { name: /post comment/i }).click();
          } else if (config.action === 'create_discussion') {
            await page.goto('/community');
            await page.getByRole('button', { name: /new discussion/i }).click();
            await page.getByLabel('Title').fill(`Rate limit test ${Date.now()}`);
            await page.getByLabel('Content').fill('Rate limit test content');
            await page.getByLabel('Game').selectOption('Pokemon');
            await page.getByRole('button', { name: /create discussion/i }).click();
          }
        };

        const result = await testRateLimit(page, config, operation);
        
        expect(result.successful).toBeLessThanOrEqual(config.expectedLimit);
        expect(result.blocked).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Advanced Search & Discovery', () => {
    test('performs complex multi-filter searches with proper typing', async ({ authenticatedPage: page }) => {
      // Create diverse test content
      const testDiscussions = [
        { game: 'Pokemon', challenge_type: 'Bingo', tags: ['strategy', 'tips'] },
        { game: 'Sonic', challenge_type: 'Speedrun', tags: ['glitch', 'route'] },
        { game: 'Pokemon', challenge_type: 'Achievement Hunt', tags: ['completion'] },
      ];

      for (const data of testDiscussions) {
        await createTypedDiscussion(page, generateDiscussionData({ 
          scenario: 'regularUser',
          contentType: 'safe',
          ...data,
        }));
      }

      // Test complex filtering
      const filters: SearchFilters = {
        game: 'Pokemon',
        challengeType: 'Bingo',
        tags: ['strategy'],
        sortBy: 'newest',
      };

      const results = await testSearchAndFilters(page, filters);
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.game).toBe('Pokemon');
      });
    });

    test('handles search performance with large datasets', async ({ authenticatedPage: page }) => {
      // Create larger dataset for performance testing
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(createTypedDiscussion(page, generateDiscussionData({
          scenario: 'regularUser',
          contentType: 'safe',
        })));
      }
      await Promise.all(promises);

      const performanceResult = await measurePerformance(page, async () => {
        await page.goto('/community');
        await page.getByPlaceholder('Search discussions...').fill('test');
        await page.keyboard.press('Enter');
        await waitForNetworkIdle(page);
      });

      expect(performanceResult.loadTime).toBeLessThan(3000); // Should complete within 3 seconds
      expect(performanceResult.memoryUsage).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });

  test.describe('Accessibility & User Experience', () => {
    test('provides comprehensive keyboard navigation', async ({ authenticatedPage: page }) => {
      const discussionId = await TEST_SCENARIOS.createBasicDiscussion(page);
      await createTypedComment(page, discussionId, generateCommentData(parseInt(discussionId)));
      
      await page.goto(`/community/discussions/${discussionId}`);
      
      // Test keyboard navigation through comments
      await page.keyboard.press('Tab'); // Focus first interactive element
      
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Navigate through comment interactions
      await page.keyboard.press('Tab'); // Upvote button
      await page.keyboard.press('Tab'); // Reply button
      await page.keyboard.press('Tab'); // More options
      
      // Verify accessibility
      const accessibilityResult = await testAccessibility(page);
      expect(accessibilityResult.passed).toBe(true);
      expect(accessibilityResult.score).toBeGreaterThan(80);
    });

    test('supports screen readers with proper ARIA labels', async ({ authenticatedPage: page }) => {
      const discussionId = await TEST_SCENARIOS.createBasicDiscussion(page);
      await page.goto(`/community/discussions/${discussionId}`);
      
      // Check discussion accessibility
      const discussionElement = page.getByTestId('discussion-card').first();
      await expect(discussionElement).toHaveAttribute('role', 'article');
      await expect(discussionElement).toHaveAttribute('aria-labelledby');
      
      // Check comment accessibility
      await createTypedComment(page, discussionId, generateCommentData(parseInt(discussionId)));
      
      const commentElement = page.getByTestId('comment').first();
      await expect(commentElement).toHaveAttribute('role', 'article');
      await expect(commentElement).toHaveAttribute('aria-level');
    });

    test('maintains responsive design across viewports', async ({ authenticatedPage: page }) => {
      const discussionId = await TEST_SCENARIOS.createBasicDiscussion(page);
      await page.goto(`/community/discussions/${discussionId}`);
      
      const viewports = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 768, height: 1024 },  // Tablet
        { width: 375, height: 667 },   // Mobile
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        
        // Verify core elements remain functional
        await expect(page.getByTestId('discussion-title')).toBeVisible();
        await expect(page.getByPlaceholder('What are your thoughts on this discussion?')).toBeVisible();
        
        // Test comment interaction at this viewport
        await page.getByPlaceholder('What are your thoughts on this discussion?').fill(`Responsive test ${viewport.width}x${viewport.height}`);
        await page.getByRole('button', { name: /post comment/i }).click();
        
        await expect(page.getByText(`Responsive test ${viewport.width}x${viewport.height}`)).toBeVisible();
      }
    });
  });

  test.describe('Advanced Security & Edge Cases', () => {
    test('prevents XSS attacks in user-generated content', async ({ authenticatedPage: page }) => {
      const xssPayloads = [
        '<script>alert("XSS")</script>Safe content',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      ];

      for (const payload of xssPayloads) {
        await page.goto('/community');
        await page.getByRole('button', { name: /new discussion/i }).click();
        
        await page.getByLabel('Title').fill('XSS Test');
        await page.getByLabel('Content').fill(payload);
        await page.getByLabel('Game').selectOption('Pokemon');
        
        await page.getByRole('button', { name: /create discussion/i }).click();
        await waitForNetworkIdle(page);
        
        // Verify XSS is prevented - no alert dialogs should appear
        const dialogs: string[] = [];
        page.on('dialog', dialog => dialogs.push(dialog.message()));
        
        await page.waitForTimeout(1000);
        expect(dialogs).toHaveLength(0);
        
        // Content should be escaped/sanitized
        await expect(page.locator('script')).not.toBeAttached();
      }
    });

    test('handles Unicode and emoji content correctly', async ({ authenticatedPage: page }) => {
      const unicodeContent = {
        title: '🎮 Gaming Tips 日本語 العربية 中文 🚀',
        content: 'Testing emojis 😀😎🎯 and special chars: ñáéíóú ©™® 你好世界',
      };

      const discussionId = await createTypedDiscussion(page, {
        ...generateDiscussionData(),
        ...unicodeContent,
      });

      await page.goto(`/community/discussions/${discussionId}`);
      
      // Verify all Unicode characters display correctly
      await expect(page.getByTestId('discussion-title')).toContainText(unicodeContent.title);
      await expect(page.getByTestId('discussion-content')).toContainText(unicodeContent.content);
      
      // Test Unicode in comments
      await createTypedComment(page, discussionId, {
        content: 'Unicode comment: 🎯 测试评论 café résumé',
      });
      
      await expect(page.getByText('Unicode comment: 🎯 测试评论 café résumé')).toBeVisible();
    });

    test('manages memory efficiently with large comment threads', async ({ authenticatedPage: page }) => {
      const discussionId = await TEST_SCENARIOS.createBasicDiscussion(page);
      
      // Create a large comment thread
      await TEST_SCENARIOS.createCommentThread(page, discussionId, 5);
      
      await page.goto(`/community/discussions/${discussionId}`);
      
      // Monitor memory usage
      const performanceMetrics = await measurePerformance(page, async () => {
        // Scroll through all comments
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await waitForNetworkIdle(page);
      });
      
      expect(performanceMetrics.memoryUsage).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
      expect(performanceMetrics.loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('handles concurrent operations without data corruption', async ({ authenticatedPage: page, context }) => {
      const discussionId = await TEST_SCENARIOS.createBasicDiscussion(page);
      const pages = [page, await context.newPage(), await context.newPage()];
      
      // Navigate all pages to the discussion
      await Promise.all(pages.map(p => p.goto(`/community/discussions/${discussionId}`)));
      
      const operations = [
        {
          id: 'upvote-1',
          operation: () => pages[0].getByRole('button', { name: /upvote/i }).first().click(),
          expectedResult: 'success' as const,
        },
        {
          id: 'comment-1',
          operation: async () => {
            await pages[1].getByPlaceholder('What are your thoughts on this discussion?').fill('Concurrent comment 1');
            await pages[1].getByRole('button', { name: /post comment/i }).click();
          },
          expectedResult: 'success' as const,
        },
        {
          id: 'comment-2',
          operation: async () => {
            await pages[2].getByPlaceholder('What are your thoughts on this discussion?').fill('Concurrent comment 2');
            await pages[2].getByRole('button', { name: /post comment/i }).click();
          },
          expectedResult: 'success' as const,
        },
      ];

      const result = await testConcurrentOperations(page, operations);
      
      expect(result.operations.filter(op => op.result === 'success').length).toBeGreaterThanOrEqual(2);
      expect(result.totalTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  test.describe('Performance Optimization Validation', () => {
    test('maintains sub-3s load times for complex discussions', async ({ authenticatedPage: page }) => {
      const discussionId = await TEST_SCENARIOS.createBasicDiscussion(page);
      
      // Add substantial content
      for (let i = 0; i < 20; i++) {
        await createTypedComment(page, discussionId, generateCommentData(parseInt(discussionId)));
      }
      
      const performanceResult = await measurePerformance(page, async () => {
        await page.goto(`/community/discussions/${discussionId}`);
        await waitForNetworkIdle(page);
      });
      
      expect(performanceResult.loadTime).toBeLessThan(3000);
      expect(performanceResult.renderTime).toBeLessThan(1000);
    });

    test('implements efficient pagination for large datasets', async ({ authenticatedPage: page }) => {
      // Test pagination performance
      await page.goto('/community');
      
      // Verify initial load shows limited items
      const initialItems = await page.locator('[data-testid="discussion-card"]').count();
      expect(initialItems).toBeLessThanOrEqual(20);
      
      // Test load more functionality
      if (await page.getByRole('button', { name: /load more/i }).isVisible()) {
        const performanceResult = await measurePerformance(page, async () => {
          await page.getByRole('button', { name: /load more/i }).click();
          await waitForNetworkIdle(page);
        });
        
        expect(performanceResult.loadTime).toBeLessThan(2000); // Pagination should be fast
        
        const afterLoadItems = await page.locator('[data-testid="discussion-card"]').count();
        expect(afterLoadItems).toBeGreaterThan(initialItems);
      }
    });
  });
});