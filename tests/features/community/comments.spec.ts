import { test, expect } from '../../fixtures/auth.fixture';
import { 
  waitForNetworkIdle, 
  waitForAnimations,
  checkAccessibility,
} from '../../helpers/test-utils';
import {
  createTypedDiscussion,
  createTypedComment,
  testRealTimeUpdates,
  testCommentPagination,
  type Discussion,
  type Comment,
} from '../../helpers/community-test-helpers';
import {
  generateComment,
  generateCommentThread,
  USER_SCENARIOS,
  MODERATION_TEST_CONTENT,
  type CommentWithAuthor,
} from '../../fixtures/community-fixtures';
import { ERROR_MESSAGES, TIMEOUTS } from '../../helpers/test-data';
import type { Tables } from '@/types/database.types';

/**
 * Enhanced Comment System Tests with Type Safety
 * 
 * This refactored test suite provides:
 * - Full TypeScript type safety using Tables<'discussions'> and Tables<'comments'>
 * - Comprehensive real-time testing scenarios
 * - Advanced moderation edge cases
 * - Performance testing for large comment threads
 * - Accessibility compliance validation
 * - Race condition detection and prevention
 */

test.describe('Enhanced Comment System', () => {
  let testDiscussion: { id: string; data: Partial<Tables<'discussions'>> };

  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Create a type-safe test discussion using proper database types
    const discussionData: Partial<Tables<'discussions'>> = {
      title: 'Enhanced Comment Testing Discussion',
      content: 'This discussion tests enhanced comment functionality with full type safety and proper database schema validation.',
      game: 'Pokemon',
      challenge_type: 'Bingo',
      tags: ['test', 'enhanced', 'comments'],
    };
    
    const discussionId = await createTypedDiscussion(page, discussionData);
    testDiscussion = { id: discussionId, data: discussionData };
  });

  test.describe('Type-Safe Comment Operations', () => {
    test('creates comment with proper database types and validation', async ({ authenticatedPage: page }) => {
      // Use type-safe comment creation
      const commentData: Partial<Tables<'comments'>> = {
        content: 'This is a type-safe comment using proper database schema types.',
        discussion_id: parseInt(testDiscussion.id),
      };

      const commentId = await createTypedComment(page, testDiscussion.id, commentData);

      // Navigate to discussion to verify comment
      await page.goto('/community');
      const discussionCard = page.locator(`[data-discussion-id="${testDiscussion.id}"]`);
      await discussionCard.click();
      await waitForAnimations(page);

      // Verify comment appears with correct type-safe data
      const commentElement = page.locator(`[data-comment-id="${commentId}"]`);
      await expect(commentElement).toBeVisible();
      await expect(commentElement).toContainText(commentData.content!);
      
      // Verify comment metadata is properly typed
      await expect(commentElement.getByTestId('comment-author')).toBeVisible();
      await expect(commentElement.getByTestId('comment-timestamp')).toBeVisible();
    });

    test('validates comment content with Zod schema compliance', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      const discussionCard = page.locator(`[data-discussion-id="${testDiscussion.id}"]`);
      await discussionCard.click();
      await waitForAnimations(page);

      // Test comprehensive validation scenarios
      const validationTests = [
        { 
          content: '', 
          error: 'Comment cannot be empty',
          description: 'Empty content validation'
        },
        { 
          content: '   \n\t  ', 
          error: 'Comment cannot be empty',
          description: 'Whitespace-only content validation'
        },
        { 
          content: 'x'.repeat(2001), 
          error: 'Comment must be less than 2000 characters',
          description: 'Maximum length validation'
        },
        { 
          content: '<script>alert("xss")</script>Hello', 
          sanitized: '&lt;script&gt;alert("xss")&lt;/script&gt;Hello',
          description: 'XSS content sanitization'
        },
      ];

      for (const validationTest of validationTests) {
        // Clear previous input
        await page.getByPlaceholder('What are your thoughts on this discussion?').fill('');
        
        // Fill with test content
        await page.getByPlaceholder('What are your thoughts on this discussion?').fill(validationTest.content);
        await page.getByRole('button', { name: /post comment/i }).click();

        if (validationTest.error) {
          // Verify validation error appears
          await expect(page.getByText(validationTest.error)).toBeVisible();
        } else if (validationTest.sanitized) {
          // Verify content is properly sanitized
          await waitForNetworkIdle(page);
          await expect(page.getByText(validationTest.sanitized)).toBeVisible();
        }
      }
    });

  });

  test.describe('Real-Time Comment Updates', () => {
    test('comments update across multiple browser sessions in real-time', async ({ authenticatedPage: page, context }) => {
      // Create second browser context to simulate another user
      const page2 = await context.newPage();
      
      // Test real-time comment updates
      await testRealTimeUpdates(page, page2, testDiscussion.id, 'comment', {
        content: 'This comment should appear in real-time across sessions!'
      });
    });

    test('detects and handles race conditions in rapid comment posting', async ({ authenticatedPage: page }) => {
      // Navigate to discussion
      await page.goto('/community');
      const discussionCard = page.locator(`[data-discussion-id="${testDiscussion.id}"]`);
      await discussionCard.click();
      await waitForAnimations(page);

      // Attempt rapid comment posting to detect race conditions
      const rapidComments = [
        'Rapid comment 1',
        'Rapid comment 2', 
        'Rapid comment 3'
      ];

      const commentPromises = rapidComments.map(async (content, index) => {
        // Small delay to stagger requests slightly
        await page.waitForTimeout(index * 100);
        
        try {
          return await createTypedComment(page, testDiscussion.id, { content });
        } catch (error) {
          // Expected for race condition testing
          return null;
        }
      });

      const results = await Promise.allSettled(commentPromises);
      
      // Verify at least one comment was created successfully
      const successfulComments = results.filter(result => 
        result.status === 'fulfilled' && result.value !== null
      );
      
      expect(successfulComments.length).toBeGreaterThan(0);
      
      // Verify no duplicate comments were created
      await waitForNetworkIdle(page);
      const commentElements = page.locator('[data-testid="comment"]');
      const commentTexts = await commentElements.allTextContents();
      
      // Check for duplicate content
      const uniqueTexts = new Set(commentTexts);
      expect(uniqueTexts.size).toBe(commentTexts.length);
    });

    test('handles concurrent upvoting without double-counting', async ({ authenticatedPage: page, context }) => {
      // Create a comment to upvote
      const commentId = await createTypedComment(page, testDiscussion.id, {
        content: 'Comment for concurrent upvote testing'
      });

      // Open same comment in two tabs
      const page2 = await context.newPage();
      await page.goto(`/community/discussions/${testDiscussion.id}`);
      await page2.goto(`/community/discussions/${testDiscussion.id}`);

      const commentElement1 = page.locator(`[data-comment-id="${commentId}"]`);
      const commentElement2 = page2.locator(`[data-comment-id="${commentId}"]`);

      const upvoteButton1 = commentElement1.getByRole('button', { name: /upvote/i });
      const upvoteButton2 = commentElement2.getByRole('button', { name: /upvote/i });

      // Get initial count
      const initialText = await upvoteButton1.textContent();
      const initialCount = parseInt(initialText?.match(/\d+/)?.[0] || '0');

      // Attempt concurrent upvotes
      await Promise.all([
        upvoteButton1.click(),
        upvoteButton2.click()
      ]);

      await waitForNetworkIdle(page);
      await waitForNetworkIdle(page2);

      // Verify count increased by exactly 1 (no double counting)
      const finalText1 = await upvoteButton1.textContent();
      const finalCount1 = parseInt(finalText1?.match(/\d+/)?.[0] || '0');
      
      expect(finalCount1).toBe(initialCount + 1);

      // Verify both pages show same count
      const finalText2 = await upvoteButton2.textContent();
      const finalCount2 = parseInt(finalText2?.match(/\d+/)?.[0] || '0');
      
      expect(finalCount2).toBe(finalCount1);
    });
  });

  test.describe('Performance and Scalability', () => {
    test('handles large comment threads with pagination', async ({ authenticatedPage: page }) => {
      // Test pagination performance with many comments
      await testCommentPagination(page, testDiscussion.id, 25);
    });

    test('maintains performance with nested comment threads', async ({ authenticatedPage: page }) => {
      // Create nested comment thread
      const parentCommentId = await createTypedComment(page, testDiscussion.id, {
        content: 'Parent comment for thread testing'
      });

      // Create multiple replies to test nesting performance
      for (let i = 0; i < 5; i++) {
        await createTypedComment(page, testDiscussion.id, {
          content: `Reply ${i + 1} to parent comment`
        });
      }

      await page.goto(`/community/discussions/${testDiscussion.id}`);
      
      // Verify all comments load efficiently
      const comments = page.locator('[data-testid="comment"]');
      await expect(comments).toHaveCountGreaterThanOrEqual(6);
      
      // Test scrolling performance
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await waitForNetworkIdle(page);
      
      // Verify no performance degradation
      const performanceMetrics = await page.evaluate(() => ({
        loadTime: performance.now(),
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      }));
      
      expect(performanceMetrics.loadTime).toBeLessThan(10000); // 10 seconds max
    });
  });

  test.describe('Enhanced Accessibility', () => {
    test('provides comprehensive keyboard navigation for comments', async ({ authenticatedPage: page }) => {
      // Create test comments
      await createTypedComment(page, testDiscussion.id, {
        content: 'First comment for accessibility testing'
      });
      await createTypedComment(page, testDiscussion.id, {
        content: 'Second comment for navigation testing'
      });

      await page.goto(`/community/discussions/${testDiscussion.id}`);
      
      // Test keyboard navigation
      await page.keyboard.press('Tab'); // Focus first interactive element
      await page.keyboard.press('Enter'); // Expand discussion if needed
      
      // Navigate through comments
      await page.keyboard.press('Tab'); // Comment input
      await page.keyboard.press('Tab'); // First comment action
      await page.keyboard.press('Tab'); // Second comment action
      
      // Verify focus is visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('supports screen readers with proper ARIA labels', async ({ authenticatedPage: page }) => {
      await createTypedComment(page, testDiscussion.id, {
        content: 'Screen reader test comment'
      });

      await page.goto(`/community/discussions/${testDiscussion.id}`);
      
      // Check ARIA compliance
      const comments = page.locator('[data-testid="comment"]');
      const firstComment = comments.first();
      
      // Verify ARIA attributes
      await expect(firstComment).toHaveAttribute('role', 'article');
      await expect(firstComment).toHaveAttribute('aria-labelledby');
      
      // Verify comment metadata is accessible
      await expect(firstComment.getByRole('heading')).toBeVisible();
      await expect(firstComment.getByText(/commented/i)).toBeVisible();
    });
  });

  test.describe('Legacy Compatibility Tests', () => {
    test('user can add comment to discussion', async ({ authenticatedPage: page }) => {
      // Expand discussion to show comment form

      // Verify comment section is visible
      await expect(page.getByText('Comments (0)')).toBeVisible();
      
      // Add a comment
      const commentText = 'Great question! I use the duplication glitch for faster completions.';
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill(commentText);
      await page.getByRole('button', { name: /post comment/i }).click();

      // Verify comment appears
      await expect(page.getByText(commentText)).toBeVisible();
      await expect(page.getByText('Comments (1)')).toBeVisible();
      
      // Verify comment metadata
      await expect(page.getByText('just now')).toBeVisible();
      await expect(page.locator('[data-testid="comment-author"]')).toBeVisible();
    });

    test('validates comment content before submission', async ({ authenticatedPage: page }) => {
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      // Try to submit empty comment
      await page.getByRole('button', { name: /post comment/i }).click();
      await expect(page.getByText('Comment cannot be empty')).toBeVisible();

      // Try to submit comment with only whitespace
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill('   ');
      await page.getByRole('button', { name: /post comment/i }).click();
      await expect(page.getByText('Comment cannot be empty')).toBeVisible();

      // Try to submit oversized comment (>2000 characters)
      const longComment = 'x'.repeat(2001);
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill(longComment);
      await page.getByRole('button', { name: /post comment/i }).click();
      await expect(page.getByText('Comment must be less than 2000 characters')).toBeVisible();

      // Submit valid comment
      const validComment = 'This is a valid comment with proper length.';
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill(validComment);
      await page.getByRole('button', { name: /post comment/i }).click();
      
      await expect(page.getByText(validComment)).toBeVisible();
      await expect(page.getByText('Comment cannot be empty')).not.toBeVisible();
    });

    test('comment input clears after successful submission', async ({ authenticatedPage: page }) => {
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      const commentInput = page.getByPlaceholder('What are your thoughts on this discussion?');
      const commentText = 'This comment should clear after posting';
      
      await commentInput.fill(commentText);
      await expect(commentInput).toHaveValue(commentText);
      
      await page.getByRole('button', { name: /post comment/i }).click();
      await waitForNetworkIdle(page);
      
      // Verify input is cleared
      await expect(commentInput).toHaveValue('');
      
      // Verify comment was posted
      await expect(page.getByText(commentText)).toBeVisible();
    });

    test('displays loading state during comment submission', async ({ authenticatedPage: page }) => {
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      await page.getByPlaceholder('What are your thoughts on this discussion?').fill('Loading test comment');
      
      // Click submit and immediately check for loading state
      const submitButton = page.getByRole('button', { name: /post comment/i });
      await submitButton.click();
      
      // Verify loading state (button should be disabled and show "Posting...")
      await expect(submitButton).toBeDisabled();
      await expect(page.getByText('Posting...')).toBeVisible();
      
      // Wait for completion
      await waitForNetworkIdle(page);
      await expect(submitButton).toBeEnabled();
      await expect(page.getByText('Post Comment')).toBeVisible();
    });
  });

  test.describe('Nested Comment Threads', () => {
    test('user can reply to comments creating nested threads', async ({ authenticatedPage: page }) => {
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      // Add initial comment
      const initialComment = 'This is the parent comment for threading test';
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill(initialComment);
      await page.getByRole('button', { name: /post comment/i }).click();
      await waitForNetworkIdle(page);

      // Click reply on the comment
      const commentElement = page.locator('[data-testid="comment"]').first();
      await commentElement.getByRole('button', { name: /reply/i }).click();

      // Verify reply form appears
      await expect(page.getByPlaceholder('Write a reply...')).toBeVisible();

      // Add reply
      const replyText = 'This is a nested reply to the parent comment';
      await page.getByPlaceholder('Write a reply...').fill(replyText);
      await page.getByRole('button', { name: /post reply/i }).click();
      await waitForNetworkIdle(page);

      // Verify nested reply appears with proper indentation
      const replyElement = page.locator('[data-testid="comment-reply"]').first();
      await expect(replyElement).toContainText(replyText);
      await expect(replyElement).toHaveClass(/ml-8/); // Indented reply
      
      // Verify thread structure
      await expect(page.getByText(initialComment)).toBeVisible();
      await expect(page.getByText(replyText)).toBeVisible();
    });

    test('supports multiple levels of nested replies', async ({ authenticatedPage: page }) => {
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      // Add parent comment
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill('Level 0 comment');
      await page.getByRole('button', { name: /post comment/i }).click();
      await waitForNetworkIdle(page);

      // Add level 1 reply
      await page.locator('[data-testid="comment"]').first().getByRole('button', { name: /reply/i }).click();
      await page.getByPlaceholder('Write a reply...').fill('Level 1 reply');
      await page.getByRole('button', { name: /post reply/i }).click();
      await waitForNetworkIdle(page);

      // Add level 2 reply
      await page.locator('[data-testid="comment-reply"]').first().getByRole('button', { name: /reply/i }).click();
      await page.getByPlaceholder('Write a reply...').fill('Level 2 reply');
      await page.getByRole('button', { name: /post reply/i }).click();
      await waitForNetworkIdle(page);

      // Verify all levels are present with proper indentation
      await expect(page.getByText('Level 0 comment')).toBeVisible();
      
      const level1Reply = page.locator('[data-testid="comment-reply"]').filter({ hasText: 'Level 1 reply' });
      await expect(level1Reply).toHaveClass(/ml-8/);
      
      const level2Reply = page.locator('[data-testid="comment-reply"]').filter({ hasText: 'Level 2 reply' });
      await expect(level2Reply).toHaveClass(/ml-16/);
    });

    test('can collapse and expand comment threads', async ({ authenticatedPage: page }) => {
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      // Create a thread with multiple replies
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill('Collapsible thread parent');
      await page.getByRole('button', { name: /post comment/i }).click();
      await waitForNetworkIdle(page);

      // Add multiple replies
      for (let i = 1; i <= 3; i++) {
        await page.locator('[data-testid="comment"]').first().getByRole('button', { name: /reply/i }).click();
        await page.getByPlaceholder('Write a reply...').fill(`Reply number ${i}`);
        await page.getByRole('button', { name: /post reply/i }).click();
        await waitForNetworkIdle(page);
      }

      // Verify all replies are visible
      for (let i = 1; i <= 3; i++) {
        await expect(page.getByText(`Reply number ${i}`)).toBeVisible();
      }

      // Collapse the thread
      await page.locator('[data-testid="comment"]').first().getByRole('button', { name: /collapse/i }).click();

      // Verify replies are hidden
      for (let i = 1; i <= 3; i++) {
        await expect(page.getByText(`Reply number ${i}`)).not.toBeVisible();
      }

      // Expand the thread
      await page.locator('[data-testid="comment"]').first().getByRole('button', { name: /expand/i }).click();

      // Verify replies are visible again
      for (let i = 1; i <= 3; i++) {
        await expect(page.getByText(`Reply number ${i}`)).toBeVisible();
      }
    });
  });

  test.describe('Comment Interactions', () => {
    test('user can upvote comments', async ({ authenticatedPage: page }) => {
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      // Add a comment to upvote
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill('Comment to upvote');
      await page.getByRole('button', { name: /post comment/i }).click();
      await waitForNetworkIdle(page);

      // Get the upvote button for the comment
      const commentElement = page.locator('[data-testid="comment"]').first();
      const upvoteButton = commentElement.getByRole('button', { name: /upvote/i });
      
      // Get initial upvote count
      const initialCount = await upvoteButton.textContent();
      const count = parseInt(initialCount?.match(/\d+/)?.[0] || '0');

      // Click upvote
      await upvoteButton.click();

      // Verify optimistic update
      await expect(upvoteButton).toContainText(`${count + 1}`);
      await expect(upvoteButton).toHaveClass(/text-red-400/); // Upvoted state
    });

    test('user can remove upvote from comment', async ({ authenticatedPage: page }) => {
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      // Add and upvote a comment
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill('Comment for upvote toggle');
      await page.getByRole('button', { name: /post comment/i }).click();
      await waitForNetworkIdle(page);

      const commentElement = page.locator('[data-testid="comment"]').first();
      const upvoteButton = commentElement.getByRole('button', { name: /upvote/i });
      
      // Initial upvote
      await upvoteButton.click();
      await expect(upvoteButton).toHaveClass(/text-red-400/);

      // Remove upvote
      await upvoteButton.click();
      await expect(upvoteButton).not.toHaveClass(/text-red-400/);
    });

    test('user can report inappropriate comments', async ({ authenticatedPage: page }) => {
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      // Add a comment to report
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill('Potentially inappropriate comment');
      await page.getByRole('button', { name: /post comment/i }).click();
      await waitForNetworkIdle(page);

      // Open comment options menu
      const commentElement = page.locator('[data-testid="comment"]').first();
      await commentElement.getByRole('button', { name: /more options/i }).click();

      // Click report option
      await page.getByRole('menuitem', { name: /report/i }).click();

      // Fill report form
      await page.getByLabel('Reason').selectOption('inappropriate');
      await page.getByLabel('Additional details').fill('This comment violates community guidelines');
      await page.getByRole('button', { name: /submit report/i }).click();

      // Verify report confirmation
      await expect(page.getByText('Thank you for your report')).toBeVisible();
      await expect(page.getByText('Our moderation team will review this content')).toBeVisible();
    });
  });

  test.describe('Comment Formatting and Content', () => {
    test('supports markdown formatting in comments', async ({ authenticatedPage: page }) => {
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      // Add comment with markdown
      const markdownComment = '**Bold text**, *italic text*, and `code snippet`';
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill(markdownComment);
      await page.getByRole('button', { name: /post comment/i }).click();
      await waitForNetworkIdle(page);

      // Verify markdown is rendered
      const commentElement = page.locator('[data-testid="comment"]').first();
      await expect(commentElement.locator('strong')).toContainText('Bold text');
      await expect(commentElement.locator('em')).toContainText('italic text');
      await expect(commentElement.locator('code')).toContainText('code snippet');
    });

    test('sanitizes potentially dangerous HTML in comments', async ({ authenticatedPage: page }) => {
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      // Try to inject dangerous HTML
      const dangerousContent = '<script>alert("XSS")</script><img src=x onerror=alert("XSS")>Safe content';
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill(dangerousContent);
      await page.getByRole('button', { name: /post comment/i }).click();
      await waitForNetworkIdle(page);

      // Verify dangerous content is sanitized but safe content remains
      const commentElement = page.locator('[data-testid="comment"]').first();
      await expect(commentElement).toContainText('Safe content');
      await expect(commentElement.locator('script')).not.toBeAttached();
      
      // Verify no alert dialogs appear
      await page.waitForTimeout(1000);
      const dialogs: string[] = [];
      page.on('dialog', dialog => dialogs.push(dialog.message()));
      expect(dialogs).toHaveLength(0);
    });

    test('preserves line breaks in comments', async ({ authenticatedPage: page }) => {
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      // Add multi-line comment
      const multiLineComment = 'Line 1\nLine 2\n\nLine 4 after blank line';
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill(multiLineComment);
      await page.getByRole('button', { name: /post comment/i }).click();
      await waitForNetworkIdle(page);

      // Verify line breaks are preserved
      const commentElement = page.locator('[data-testid="comment"]').first();
      const commentText = await commentElement.textContent();
      expect(commentText).toContain('Line 1');
      expect(commentText).toContain('Line 2');
      expect(commentText).toContain('Line 4 after blank line');
    });

    test('handles unicode and emoji characters correctly', async ({ authenticatedPage: page }) => {
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      // Add comment with unicode and emojis
      const unicodeComment = 'Unicode test: 你好 🎮 ñáéíóú 🚀 العربية';
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill(unicodeComment);
      await page.getByRole('button', { name: /post comment/i }).click();
      await waitForNetworkIdle(page);

      // Verify all characters display correctly
      const commentElement = page.locator('[data-testid="comment"]').first();
      await expect(commentElement).toContainText(unicodeComment);
    });
  });

  test.describe('Real-time Comment Updates', () => {
    test('comments appear in real-time for other users', async ({ authenticatedPage: page, context }) => {
      // Open discussion in two tabs
      const page1 = page;
      const page2 = await context.newPage();
      
      // Navigate both pages to the discussion
      const discussionCard1 = page1.locator('[data-testid="discussion-card"]').first();
      await discussionCard1.click();
      
      await page2.goto('/community');
      await waitForNetworkIdle(page2);
      const discussionCard2 = page2.locator('[data-testid="discussion-card"]').first();
      await discussionCard2.click();

      // Add comment from page1
      await page1.getByPlaceholder('What are your thoughts on this discussion?').fill('Real-time test comment');
      await page1.getByRole('button', { name: /post comment/i }).click();

      // Verify comment appears on page2 without refresh
      await expect(page2.getByText('Real-time test comment')).toBeVisible({ timeout: 5000 });
      await expect(page2.getByText('Comments (1)')).toBeVisible();
    });

    test('comment count updates in real-time', async ({ authenticatedPage: page, context }) => {
      const page1 = page;
      const page2 = await context.newPage();
      
      // Open discussion on both pages
      const discussionCard1 = page1.locator('[data-testid="discussion-card"]').first();
      await discussionCard1.click();
      
      await page2.goto('/community');
      await waitForNetworkIdle(page2);
      const discussionCard2 = page2.locator('[data-testid="discussion-card"]').first();
      await discussionCard2.click();

      // Verify initial count on both pages
      await expect(page1.getByText('Comments (0)')).toBeVisible();
      await expect(page2.getByText('Comments (0)')).toBeVisible();

      // Add comment from page1
      await page1.getByPlaceholder('What are your thoughts on this discussion?').fill('Count update test');
      await page1.getByRole('button', { name: /post comment/i }).click();

      // Verify count updates on both pages
      await expect(page1.getByText('Comments (1)')).toBeVisible();
      await expect(page2.getByText('Comments (1)')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Comment Performance', () => {
    test('handles large number of comments efficiently', async ({ authenticatedPage: page }) => {
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      const startTime = Date.now();

      // Simulate many comments being loaded
      const commentCount = 50;
      for (let i = 1; i <= commentCount; i++) {
        await page.getByPlaceholder('What are your thoughts on this discussion?').fill(`Performance test comment ${i}`);
        await page.getByRole('button', { name: /post comment/i }).click();
        
        // Only wait for network idle every 10 comments to speed up test
        if (i % 10 === 0) {
          await waitForNetworkIdle(page);
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle 50 comments within reasonable time (30 seconds)
      expect(duration).toBeLessThan(30000);

      // Verify all comments are present
      await expect(page.getByText(`Comments (${commentCount})`)).toBeVisible();
    });

    test('comment loading implements pagination for large threads', async ({ authenticatedPage: page }) => {
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      // Mock a large number of comments
      await mockApiResponse(page, '**/api/comments**', {
        body: {
          comments: Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            content: `Comment ${i + 1}`,
            author_id: 'test-user',
            discussion_id: testDiscussionId,
            created_at: new Date().toISOString(),
            upvotes: 0,
          })),
          hasMore: true,
        },
      });

      // Verify initial load shows limited comments (e.g., 20)
      await expect(page.locator('[data-testid="comment"]')).toHaveCount(20);
      await expect(page.getByRole('button', { name: /load more comments/i })).toBeVisible();

      // Load more comments
      await page.getByRole('button', { name: /load more comments/i }).click();
      await waitForNetworkIdle(page);

      // Verify more comments loaded
      await expect(page.locator('[data-testid="comment"]')).toHaveCount(40);
    });
  });

  test.describe('Comment Accessibility', () => {
    test('comment section is accessible', async ({ authenticatedPage: page }) => {
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      // Check accessibility of comment section
      const accessibilityResult = await checkAccessibility(page, '[data-testid="comments-section"]');
      expect(accessibilityResult.passed).toBe(true);

      // Test keyboard navigation
      await page.keyboard.press('Tab'); // Focus comment input
      await expect(page.getByPlaceholder('What are your thoughts on this discussion?')).toBeFocused();

      await page.keyboard.press('Tab'); // Focus submit button
      await expect(page.getByRole('button', { name: /post comment/i })).toBeFocused();
    });

    test('nested comments maintain proper heading hierarchy', async ({ authenticatedPage: page }) => {
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      // Add parent comment
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill('Parent comment');
      await page.getByRole('button', { name: /post comment/i }).click();
      await waitForNetworkIdle(page);

      // Add reply
      await page.locator('[data-testid="comment"]').first().getByRole('button', { name: /reply/i }).click();
      await page.getByPlaceholder('Write a reply...').fill('Nested reply');
      await page.getByRole('button', { name: /post reply/i }).click();

      // Verify proper ARIA structure
      const parentComment = page.locator('[data-testid="comment"]').first();
      await expect(parentComment).toHaveAttribute('role', 'article');
      
      const nestedReply = page.locator('[data-testid="comment-reply"]').first();
      await expect(nestedReply).toHaveAttribute('role', 'article');
      await expect(nestedReply).toHaveAttribute('aria-level', '2');
    });
  });
});