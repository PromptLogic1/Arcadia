import { test, expect } from '../../fixtures/auth.fixture';
import { 
  waitForNetworkIdle, 
  mockApiResponse, 
  checkAccessibility,
  waitForAnimations 
} from '../../helpers/test-utils';
import { 
  COMMUNITY_TEST_DATA, 
  ERROR_MESSAGES, 
  TIMEOUTS 
} from '../../helpers/test-data';
import {
  createTypedDiscussion,
  createTypedComment,
  performCommentInteraction,
  testRateLimit,
  setupRealtimeListener,
  triggerRealtimeEvent,
  testDiscussionAccessibility,
  type CommentInteractionEvent,
  type PaginatedComments,
} from './helpers/community-helpers';
import {
  generateComment,
  generateCommentThread,
  MODERATION_TEST_CONTENT,
  USER_SCENARIOS,
  type Comment,
  type CommentWithAuthor,
  type CommentThread,
} from './fixtures/community-fixtures';
import type { Tables } from '@/types/database.types';

/**
 * Enhanced Comment System Tests with Full Type Safety
 * 
 * This test suite demonstrates:
 * - Proper TypeScript types from database
 * - Realistic data generation
 * - Enhanced moderation testing
 * - Real-time functionality testing
 * - Comprehensive accessibility checks
 */

test.describe('Enhanced Comment System', () => {
  let testDiscussion: { id: string; data: Partial<Tables<'discussions'>> };

  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Create a typed test discussion
    const discussionData: Partial<Tables<'discussions'>> = {
      title: 'Test Discussion for Enhanced Comments',
      content: 'Testing enhanced comment functionality with full type safety',
      game: 'Pokemon',
      challenge_type: 'Bingo',
      tags: ['test', 'automated'],
    };
    
    const discussionId = await createTypedDiscussion(page, discussionData);
    testDiscussion = { id: discussionId, data: discussionData };
  });

  test.describe('Type-Safe Comment Operations', () => {
    test('creates comment with proper database types', async ({ authenticatedPage: page }) => {
      // Navigate to discussion
      await page.goto('/community');
      const discussionCard = page.locator(`[data-discussion-id="${testDiscussion.id}"]`);
      await discussionCard.click();
      await waitForAnimations(page);

      // Create typed comment
      const commentData: Partial<Tables<'comments'>> = {
        content: 'This is a type-safe comment with proper database types',
        discussion_id: parseInt(testDiscussion.id),
      };

      const commentId = await createTypedComment(page, testDiscussion.id, commentData);

      // Verify comment appears with correct data
      const commentElement = page.locator(`[data-comment-id="${commentId}"]`);
      await expect(commentElement).toBeVisible();
      await expect(commentElement).toContainText(commentData.content!);
    });

    test('handles comment validation with Zod schemas', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      const discussionCard = page.locator(`[data-discussion-id="${testDiscussion.id}"]`);
      await discussionCard.click();

      // Test various validation scenarios
      const validationTests = [
        { content: '', error: 'Comment cannot be empty' },
        { content: '   ', error: 'Comment cannot be empty' },
        { content: 'x'.repeat(2001), error: 'Comment must be less than 2000 characters' },
        { content: '<script>alert("xss")</script>', sanitized: true },
      ];

      for (const test of validationTests) {
        await page.getByPlaceholder('What are your thoughts on this discussion?').fill(test.content);
        await page.getByRole('button', { name: /post comment/i }).click();

        if (test.error) {
          await expect(page.getByText(test.error)).toBeVisible();
        } else if (test.sanitized) {
          // Verify script tags are removed
          await waitForNetworkIdle(page);
          const comments = await page.locator('[data-testid="comment"]').all();
          const lastComment = comments[comments.length - 1];
          const scriptTags = await lastComment.locator('script').count();
          expect(scriptTags).toBe(0);
        }

        // Clear input for next test
        await page.getByPlaceholder('What are your thoughts on this discussion?').clear();
      }
    });
  });

  test.describe('Realistic Comment Threads', () => {
    test('generates and displays realistic nested comment threads', async ({ authenticatedPage: page }) => {
      // Generate realistic comment thread data
      const commentThreads = generateCommentThread(
        parseInt(testDiscussion.id),
        3, // depth
        2  // children per level
      );

      // Mock API to return generated thread
      await mockApiResponse(page, '**/api/comments**', {
        body: {
          comments: commentThreads,
          hasMore: false,
        },
      });

      // Navigate to discussion
      await page.goto('/community');
      const discussionCard = page.locator(`[data-discussion-id="${testDiscussion.id}"]`);
      await discussionCard.click();
      await waitForNetworkIdle(page);

      // Verify thread structure
      for (const thread of commentThreads) {
        await verifyCommentThread(page, thread);
      }
    });

    async function verifyCommentThread(page: any, thread: CommentThread, level: number = 1) {
      // Verify parent comment
      const comment = page.locator(`[data-comment-id="${thread.id}"]`);
      await expect(comment).toBeVisible();
      await expect(comment).toHaveAttribute('aria-level', level.toString());

      // Verify author info
      if (thread.author) {
        await expect(comment.locator('[data-testid="comment-author"]')).toContainText(thread.author.username);
      }

      // Verify replies
      for (const reply of thread.replies) {
        await verifyCommentThread(page, reply, level + 1);
      }
    }
  });

  test.describe('Advanced Moderation Testing', () => {
    test('automatically detects and flags spam content', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      const discussionCard = page.locator(`[data-discussion-id="${testDiscussion.id}"]`);
      await discussionCard.click();

      // Test each spam pattern
      for (const pattern of MODERATION_TEST_CONTENT.spam.patterns) {
        await page.getByPlaceholder('What are your thoughts on this discussion?').fill(pattern);
        await page.getByRole('button', { name: /post comment/i }).click();
        
        // Verify spam detection
        await expect(page.getByText('Your comment has been flagged for review')).toBeVisible();
        
        // Clear for next test
        await page.reload();
        await discussionCard.click();
      }
    });

    test('applies content filtering based on user reputation', async ({ authenticatedPage: page }) => {
      // Test different user scenarios
      for (const [userType, scenario] of Object.entries(USER_SCENARIOS)) {
        // Mock user context
        await mockApiResponse(page, '**/api/auth/user**', {
          body: {
            user: {
              id: 'test-user-id',
              reputation: scenario.reputation,
              created_at: new Date(Date.now() - scenario.joinedDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
              permissions: scenario.permissions,
            },
          },
        });

        await page.goto('/community');
        const discussionCard = page.locator(`[data-discussion-id="${testDiscussion.id}"]`);
        await discussionCard.click();

        // Test posting ability
        const canPost = scenario.permissions.includes('comment');
        const commentInput = page.getByPlaceholder('What are your thoughts on this discussion?');
        
        if (canPost) {
          await expect(commentInput).toBeEnabled();
        } else {
          await expect(commentInput).toBeDisabled();
          await expect(page.getByText('You do not have permission to comment')).toBeVisible();
        }
      }
    });
  });

  test.describe('Enhanced Real-time Testing', () => {
    test('synchronizes comments across multiple sessions with proper types', async ({ 
      authenticatedPage: page, 
      context 
    }) => {
      // Setup real-time listeners
      const getRealtimeEvents = await setupRealtimeListener(page, 'comments');
      
      // Open second page
      const page2 = await context.newPage();
      await page2.goto('/community');
      await waitForNetworkIdle(page2);
      
      // Open same discussion in both pages
      const discussionCard1 = page.locator(`[data-discussion-id="${testDiscussion.id}"]`);
      const discussionCard2 = page2.locator(`[data-discussion-id="${testDiscussion.id}"]`);
      
      await discussionCard1.click();
      await discussionCard2.click();
      
      // Create typed comment in page2
      const commentData: Partial<Comment> = generateComment(parseInt(testDiscussion.id), {
        content: 'Real-time test comment with proper types',
      });
      
      await page2.getByPlaceholder('What are your thoughts on this discussion?').fill(commentData.content!);
      await page2.getByRole('button', { name: /post comment/i }).click();
      
      // Trigger real-time event simulation
      await triggerRealtimeEvent(page, 'INSERT', {
        new: commentData,
        old: null,
      });
      
      // Verify comment appears in page1
      await expect(page.getByText(commentData.content!)).toBeVisible({ timeout: 5000 });
      
      // Verify real-time event was captured
      const events = await getRealtimeEvents('INSERT');
      expect(events).toHaveLength(1);
      expect(events[0].new.content).toBe(commentData.content);
    });

    test('updates comment counts in real-time', async ({ authenticatedPage: page, context }) => {
      const page2 = await context.newPage();
      
      // Setup both pages
      await page.goto('/community');
      await page2.goto('/community');
      
      // Check initial count
      const discussionCard1 = page.locator(`[data-discussion-id="${testDiscussion.id}"]`);
      const discussionCard2 = page2.locator(`[data-discussion-id="${testDiscussion.id}"]`);
      
      await expect(discussionCard1.locator('[data-testid="comment-count"]')).toContainText('0');
      await expect(discussionCard2.locator('[data-testid="comment-count"]')).toContainText('0');
      
      // Add comment in page2
      await discussionCard2.click();
      await createTypedComment(page2, testDiscussion.id, {
        content: 'Count update test',
      });
      
      // Verify count updates in both pages
      await expect(discussionCard1.locator('[data-testid="comment-count"]')).toContainText('1');
      await expect(discussionCard2.locator('[data-testid="comment-count"]')).toContainText('1');
    });
  });

  test.describe('Rate Limiting with User Scenarios', () => {
    test('enforces rate limits based on user type', async ({ authenticatedPage: page }) => {
      // Test rate limiting for regular user
      const userScenario = USER_SCENARIOS.regularUser;
      
      // Mock user context
      await mockApiResponse(page, '**/api/auth/user**', {
        body: {
          user: {
            id: 'test-user-id',
            reputation: userScenario.reputation,
            permissions: userScenario.permissions,
          },
        },
      });
      
      await page.goto('/community');
      const discussionCard = page.locator(`[data-discussion-id="${testDiscussion.id}"]`);
      await discussionCard.click();
      
      // Test comment rate limiting
      const results = await testRateLimit(
        page,
        {
          endpoint: '/api/comments',
          limit: userScenario.rateLimit.comments,
          window: 3600, // 1 hour
          identifier: 'user',
        },
        async () => {
          const comment = generateComment(parseInt(testDiscussion.id));
          await page.getByPlaceholder('What are your thoughts on this discussion?').fill(comment.content!);
          await page.getByRole('button', { name: /post comment/i }).click();
          await waitForNetworkIdle(page);
        }
      );
      
      // Verify rate limiting
      expect(results.successful).toBeLessThanOrEqual(userScenario.rateLimit.comments);
      expect(results.blocked).toBeGreaterThan(0);
    });
  });

  test.describe('Pagination with Typed Responses', () => {
    test('handles paginated comments with proper types', async ({ authenticatedPage: page }) => {
      // Generate many comments for pagination testing
      const totalComments = 50;
      const pageSize = 20;
      const comments: CommentWithAuthor[] = Array.from({ length: totalComments }, (_, i) => ({
        id: i + 1,
        ...generateComment(parseInt(testDiscussion.id), {
          content: `Paginated comment ${i + 1}`,
        }),
        author: {
          id: `user-${i}`,
          username: `user${i}`,
          avatar_url: null,
        },
      } as CommentWithAuthor));
      
      // Mock paginated response
      await mockApiResponse(page, '**/api/comments**', {
        body: {
          data: comments.slice(0, pageSize),
          page: 1,
          pageSize: pageSize,
          totalCount: totalComments,
          hasMore: true,
        } as PaginatedComments,
      });
      
      await page.goto('/community');
      const discussionCard = page.locator(`[data-discussion-id="${testDiscussion.id}"]`);
      await discussionCard.click();
      await waitForNetworkIdle(page);
      
      // Verify initial load
      await expect(page.locator('[data-testid="comment"]')).toHaveCount(pageSize);
      await expect(page.getByRole('button', { name: /load more/i })).toBeVisible();
      
      // Load more comments
      await page.getByRole('button', { name: /load more/i }).click();
      await waitForNetworkIdle(page);
      
      // Verify more comments loaded
      const loadedComments = await page.locator('[data-testid="comment"]').count();
      expect(loadedComments).toBeGreaterThan(pageSize);
    });
  });

  test.describe('Enhanced Accessibility Testing', () => {
    test('ensures full accessibility compliance for comment system', async ({ authenticatedPage: page }) => {
      // Create comments with various nesting levels
      await page.goto('/community');
      const discussionCard = page.locator(`[data-discussion-id="${testDiscussion.id}"]`);
      await discussionCard.click();
      
      // Create parent comment
      const parentId = await createTypedComment(page, testDiscussion.id, {
        content: 'Parent comment for accessibility testing',
      });
      
      // Create nested reply
      const parentComment = page.locator(`[data-comment-id="${parentId}"]`);
      await parentComment.getByRole('button', { name: /reply/i }).click();
      await page.getByPlaceholder('Write a reply...').fill('Nested reply for accessibility');
      await page.getByRole('button', { name: /post reply/i }).click();
      await waitForNetworkIdle(page);
      
      // Run comprehensive accessibility tests
      const accessibilityResult = await testDiscussionAccessibility(page);
      expect(accessibilityResult.passed).toBe(true);
      
      if (!accessibilityResult.passed) {
        console.log('Accessibility violations:', accessibilityResult.violations);
      }
      
      // Test keyboard navigation
      await testKeyboardNavigation(page);
      
      // Test screen reader announcements
      await testScreenReaderAnnouncements(page);
    });
    
    async function testKeyboardNavigation(page: any) {
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'comment-input');
      
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveText(/post comment/i);
      
      // Navigate through comments
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('role', 'button');
    }
    
    async function testScreenReaderAnnouncements(page: any) {
      // Verify live regions for updates
      const liveRegion = page.locator('[aria-live="polite"]');
      await expect(liveRegion).toBeAttached();
      
      // Create comment and verify announcement
      await createTypedComment(page, testDiscussion.id, {
        content: 'Test comment for screen reader',
      });
      
      await expect(liveRegion).toContainText(/new comment added/i);
    }
  });
});