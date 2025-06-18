import { test, expect } from '../../fixtures/auth.fixture';

// Extend Window interface for test properties
declare global {
  interface Window {
    __testUserReputation?: string;
    __testAppealData?: unknown;
    __testModerationLog?: unknown;
  }
}
import { 
  waitForNetworkIdle, 
} from '../../helpers/test-utils';
import {
  createTypedDiscussion,
  createTypedComment,
  reportContent,
} from '../../helpers/community-test-helpers';
import {
  MODERATION_TEST_CONTENT,
} from './fixtures/community-fixtures';

/**
 * Enhanced Content Moderation Tests
 * 
 * This comprehensive test suite covers:
 * - Advanced spam detection algorithms
 * - Complex rate limiting scenarios
 * - Content filtering edge cases
 * - Automated moderation systems
 * - Appeal and review processes
 * - Cross-platform content synchronization
 * - AI-powered content analysis
 */

test.describe('Enhanced Content Moderation', () => {
  test.describe('Advanced Spam Detection', () => {
    test('detects obvious spam patterns with high confidence', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Test obvious spam content
      const spamPattern = MODERATION_TEST_CONTENT.spam.patterns[0];
      await page.getByLabel('Title').fill('Spam Test Discussion');
      await page.getByLabel('Content').fill(spamPattern);
      await page.getByLabel('Game').selectOption('Pokemon');

      // Submit and verify spam detection
      await page.getByRole('button', { name: /create discussion/i }).click();

      // Verify spam prevention
      await expect(page.getByText(/appears to contain spam/i)).toBeVisible();
      await expect(page.getByText(/community guidelines/i)).toBeVisible();
      
      // Verify confidence score is high
      await expect(page.getByText(/confidence: high/i)).toBeVisible();
    });

    test('detects subtle spam patterns with ML analysis', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Test subtle spam content
      const subtleSpamPattern = MODERATION_TEST_CONTENT.suspicious.patterns[0];
      await page.getByLabel('Title').fill('Subtle Spam Test');
      await page.getByLabel('Content').fill(subtleSpamPattern);
      await page.getByLabel('Game').selectOption('Pokemon');

      await page.getByRole('button', { name: /create discussion/i }).click();

      // Verify subtle spam detection with lower confidence
      await expect(page.getByText(/may contain promotional content/i)).toBeVisible();
      await expect(page.getByText(/confidence: medium/i)).toBeVisible();
      
      // Verify user can still post but with warning
      await page.getByRole('button', { name: /post anyway/i }).click();
      await waitForNetworkIdle(page);
      
      // Verify post is created but flagged for review
      await expect(page.getByText(/flagged for review/i)).toBeVisible();
    });

    test('handles repetitive content and link spam', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Test repetitive spam content
      const repetitiveSpamPattern = MODERATION_TEST_CONTENT.spam.patterns[1];
      await page.getByLabel('Title').fill('Repetitive Spam Test');
      await page.getByLabel('Content').fill(repetitiveSpamPattern);
      await page.getByLabel('Game').selectOption('Pokemon');

      await page.getByRole('button', { name: /create discussion/i }).click();

      // Verify repetition detection
      await expect(page.getByText(/excessive repetition detected/i)).toBeVisible();
      await expect(page.getByText(/multiple links to same domain/i)).toBeVisible();
    });

    test('allows legitimate promotional content with proper context', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Test legitimate promotional content
      await page.getByLabel('Title').fill('Sharing my tournament highlights video');
      await page.getByLabel('Content').fill('I created a highlights video from last week\'s tournament. It shows some advanced techniques that might be helpful for others. You can find it on my channel if you\'re interested in seeing the strategies in action.');
      await page.getByLabel('Game').selectOption('Pokemon');

      await page.getByRole('button', { name: /create discussion/i }).click();

      // Verify legitimate content is allowed
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await waitForNetworkIdle(page);
      
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await expect(discussionCard).toBeVisible();
      await expect(discussionCard).toContainText('tournament highlights video');
    });
  });

  test.describe('Sophisticated Rate Limiting', () => {
    test('implements sliding window rate limiting for discussions', async ({ authenticatedPage: page }) => {
      // Test sliding window algorithm
      const _timeWindow = 5 * 60 * 1000; // 5 minutes
      const maxRequests = 3;

      // Create discussions at specific intervals
      for (let i = 0; i < maxRequests; i++) {
        await createTypedDiscussion(page, {
          title: `Rate limit test discussion ${i + 1}`,
          content: `Testing sliding window rate limiting ${i + 1}`,
        });
        
        if (i < maxRequests - 1) {
          await page.waitForTimeout(1000); // 1 second between requests
        }
      }

      // Fourth request should be rate limited
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();
      
      await page.getByLabel('Title').fill('Rate limited discussion');
      await page.getByLabel('Content').fill('This should be rate limited');
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();

      // Verify rate limiting with specific time information
      await expect(page.getByText(/posting too quickly/i)).toBeVisible();
      await expect(page.getByText(/wait.*minute/i)).toBeVisible();
      
      // Verify rate limit details
      await expect(page.getByText(/3 discussions.*5 minutes/i)).toBeVisible();
    });

    test('implements token bucket rate limiting for comments', async ({ authenticatedPage: page }) => {
      // Create discussion for commenting
      const discussionId = await createTypedDiscussion(page);

      // Test token bucket algorithm - allows burst but limits sustained rate
      const burstSize = 5;
      const _refillRate = 1; // 1 token per minute

      // Use all tokens in burst
      for (let i = 0; i < burstSize; i++) {
        await createTypedComment(page, discussionId, {
          content: `Burst comment ${i + 1}`,
        });
      }

      // Next comment should be rate limited
      await page.goto(`/community/discussions/${discussionId}`);
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill('Rate limited comment');
      await page.getByRole('button', { name: /post comment/i }).click();

      // Verify token bucket rate limiting
      await expect(page.getByText(/comment rate limit exceeded/i)).toBeVisible();
      await expect(page.getByText(/tokens.*refill/i)).toBeVisible();
    });

    test('applies different rate limits based on user reputation', async ({ authenticatedPage: page }) => {
      // Test should verify that established users have higher rate limits
      // This would typically require test data setup for user reputation
      
      // Mock high reputation user
      await page.addInitScript(() => {
        window.__testUserReputation = 'high';
      });

      // High reputation users should have higher limits
      for (let i = 0; i < 5; i++) {
        await createTypedDiscussion(page, {
          title: `High rep user discussion ${i + 1}`,
          content: `High reputation user posting ${i + 1}`,
        });
      }

      // Verify high rep user can post more
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();
      
      await page.getByLabel('Title').fill('Additional high rep discussion');
      await page.getByLabel('Content').fill('High rep users get higher limits');
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();

      // Should succeed for high rep user
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await waitForNetworkIdle(page);
    });
  });

  test.describe('Content Filtering and Sanitization', () => {
    test('sanitizes HTML and script injection attempts', async ({ authenticatedPage: page }) => {
      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '&lt;script&gt;alert("Encoded XSS")&lt;/script&gt;',
        'javascript:alert("Protocol XSS")',
      ];

      for (const maliciousInput of maliciousInputs) {
        const discussionId = await createTypedDiscussion(page, {
          title: 'XSS Test Discussion',
          content: `Testing input sanitization: ${maliciousInput}`,
        });

        await page.goto(`/community/discussions/${discussionId}`);
        
        // Verify content is sanitized
        await expect(page.locator('script')).toHaveCount(0);
        await expect(page.locator('iframe')).toHaveCount(0);
        
        // Verify sanitized content is displayed safely
        const discussionContent = page.locator('[data-testid="discussion-content"]');
        const content = await discussionContent.textContent();
        expect(content).toContain('Testing input sanitization:');
        expect(content).not.toContain('<script>');
      }
    });

    test('filters inappropriate language while preserving context', async ({ authenticatedPage: page }) => {
      const testContent = 'This content contains some mild inappropriate language that should be filtered but context preserved.';
      
      await createTypedDiscussion(page, {
        title: 'Language Filtering Test',
        content: testContent,
      });

      await page.goto('/community');
      
      // Verify content filtering
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      const filteredContent = await discussionCard.getByTestId('discussion-content').textContent();
      
      // Should preserve most content but filter inappropriate parts
      expect(filteredContent).toContain('This content contains');
      expect(filteredContent).toContain('context preserved');
      
      // Verify filtering indicator
      await expect(discussionCard.getByText(/content filtered/i)).toBeVisible();
    });

    test('handles Unicode and emoji content correctly', async ({ authenticatedPage: page }) => {
      const unicodeContent = '🎮 Gaming discussion with émojis and spéciál characters 日本語 العربية 🚀';
      
      const discussionId = await createTypedDiscussion(page, {
        title: 'Unicode Test 🎯',
        content: unicodeContent,
      });

      await page.goto(`/community/discussions/${discussionId}`);
      
      // Verify Unicode content is preserved
      await expect(page.getByText(unicodeContent)).toBeVisible();
      await expect(page.getByRole('heading')).toContainText('Unicode Test 🎯');
      
      // Verify search works with Unicode
      await page.goto('/community');
      await page.getByPlaceholder('Search discussions...').fill('🎮');
      await page.keyboard.press('Enter');
      await waitForNetworkIdle(page);
      
      await expect(page.getByText('Unicode Test 🎯')).toBeVisible();
    });
  });

  test.describe('Automated Moderation Systems', () => {
    test('escalates content to human moderators based on confidence scores', async ({ authenticatedPage: page }) => {
      // Create borderline content that requires human review
      const borderlineContent = {
        title: 'Questionable discussion title',
        content: 'This content is borderline and should be escalated to human moderators for review due to ambiguous nature.',
        game: 'Pokemon',
      };

      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();
      
      await page.getByLabel('Title').fill(borderlineContent.title);
      await page.getByLabel('Content').fill(borderlineContent.content);
      await page.getByLabel('Game').selectOption(borderlineContent.game);
      await page.getByRole('button', { name: /create discussion/i }).click();

      // Verify escalation to human review
      await expect(page.getByText(/submitted for review/i)).toBeVisible();
      await expect(page.getByText(/confidence: low/i)).toBeVisible();
      await expect(page.getByText(/human moderator/i)).toBeVisible();
    });

    test('implements auto-approval for trusted content patterns', async ({ authenticatedPage: page }) => {
      // Test content that matches trusted patterns
      const trustedContent = {
        title: 'Strategy guide: Advanced techniques for competitive play',
        content: 'This comprehensive guide covers advanced competitive strategies including frame data analysis, matchup charts, and tournament preparation tips.',
        game: 'Pokemon',
        tags: ['guide', 'competitive', 'strategy'],
      };

      const discussionId = await createTypedDiscussion(page, trustedContent);
      await page.goto(`/community/discussions/${discussionId}`);

      // Verify auto-approval for trusted content
      await expect(page.getByTestId('approval-status')).toContainText('Auto-approved');
      await expect(page.getByTestId('confidence-score')).toContainText('High');
    });

    test('implements content scoring based on multiple factors', async ({ authenticatedPage: page }) => {
      // Test comprehensive content scoring
      const factors = [
        'User reputation score',
        'Content length and quality',
        'Topic relevance',
        'Community engagement potential',
        'Safety assessment',
      ];

      const highQualityContent = {
        title: 'Comprehensive analysis of speedrun optimization techniques',
        content: 'This detailed analysis examines various speedrun optimization techniques across multiple game categories. We\'ll explore routing efficiency, trick execution, and consistency factors that contribute to successful runs. The guide includes mathematical analysis of time saves and risk assessment for each technique.',
        game: 'Sonic',
        tags: ['speedrun', 'analysis', 'optimization'],
      };

      const discussionId = await createTypedDiscussion(page, highQualityContent);
      await page.goto(`/community/discussions/${discussionId}`);

      // Verify comprehensive scoring
      for (const factor of factors) {
        await expect(page.getByTestId('scoring-factors')).toContainText(factor);
      }

      // Verify overall quality score
      await expect(page.getByTestId('quality-score')).toContainText(/[8-9]\d\/100/); // High score 80-99
    });
  });

  test.describe('Appeal and Review Processes', () => {
    test('allows users to appeal moderation decisions', async ({ authenticatedPage: page }) => {
      // Create content that gets flagged
      const inappropriatePattern = MODERATION_TEST_CONTENT.inappropriate.patterns[0];
      const discussionId = await createTypedDiscussion(page, {
        title: 'Appeal Test Discussion',
        content: inappropriatePattern,
        game: 'Pokemon',
        tags: ['test'],
      });

      // Report the content
      await reportContent(page, 'discussion', discussionId, 'harassment', 'Testing appeal process');

      // Navigate to moderated content
      await page.goto(`/community/discussions/${discussionId}`);
      
      // Verify moderation notice
      await expect(page.getByText(/content has been moderated/i)).toBeVisible();
      
      // Start appeal process
      await page.getByRole('button', { name: /appeal decision/i }).click();
      
      // Fill appeal form
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByLabel('Appeal reason').selectOption('false_positive');
      await page.getByLabel('Additional context').fill('This content was taken out of context and is not actually harassment.');
      await page.getByRole('button', { name: /submit appeal/i }).click();

      // Verify appeal submission
      await expect(page.getByText(/appeal submitted/i)).toBeVisible();
      await expect(page.getByText(/review within 24 hours/i)).toBeVisible();
    });

    test('tracks appeal status and provides updates', async ({ authenticatedPage: page }) => {
      // Mock appeal status data
      await page.addInitScript(() => {
        window.__testAppealData = {
          id: 'appeal_123',
          status: 'under_review',
          submitted_at: new Date().toISOString(),
          estimated_response: '24 hours',
        };
      });

      await page.goto('/user/appeals');

      // Verify appeal tracking
      await expect(page.getByText('Appeal #appeal_123')).toBeVisible();
      await expect(page.getByText('Status: Under Review')).toBeVisible();
      await expect(page.getByText('Estimated response: 24 hours')).toBeVisible();
      
      // Verify progress indicator
      await expect(page.locator('[data-testid="appeal-progress"]')).toBeVisible();
    });

    test('implements transparent moderation logs', async ({ authenticatedPage: page }) => {
      const discussionId = await createTypedDiscussion(page);
      
      // Mock moderation actions
      await page.addInitScript(() => {
        window.__testModerationLog = [
          {
            action: 'flagged',
            reason: 'user_report',
            timestamp: new Date().toISOString(),
            moderator: 'auto_mod_system',
          },
          {
            action: 'reviewed',
            decision: 'approved',
            timestamp: new Date().toISOString(),
            moderator: 'human_mod_001',
          },
        ];
      });

      await page.goto(`/community/discussions/${discussionId}`);
      await page.getByRole('button', { name: /moderation history/i }).click();

      // Verify transparent moderation log
      await expect(page.getByText('Moderation History')).toBeVisible();
      await expect(page.getByText('Flagged by user report')).toBeVisible();
      await expect(page.getByText('Reviewed and approved')).toBeVisible();
      await expect(page.getByText('human_mod_001')).toBeVisible();
    });
  });

  test.describe('Cross-Platform Content Synchronization', () => {
    test('synchronizes moderation decisions across platforms', async ({ authenticatedPage: page, context }) => {
      const discussionId = await createTypedDiscussion(page);
      
      // Moderate content on first instance
      await reportContent(page, 'discussion', discussionId, 'spam', 'Cross-platform sync test');
      
      // Open second browser instance
      const page2 = await context.newPage();
      await page2.goto(`/community/discussions/${discussionId}`);
      
      // Verify moderation status syncs
      await expect(page2.getByText(/content has been moderated/i)).toBeVisible({ timeout: 10000 });
      
      // Verify sync indicators
      await expect(page2.getByTestId('sync-status')).toContainText('Synchronized');
    });

    test('handles offline moderation queue and sync on reconnect', async ({ authenticatedPage: page }) => {
      // Simulate offline mode
      await page.context().setOffline(true);
      
      const discussionId = await createTypedDiscussion(page);
      
      // Attempt to report while offline
      await page.goto(`/community/discussions/${discussionId}`);
      await page.getByRole('button', { name: /report/i }).click();
      await page.getByLabel('Reason').selectOption('spam');
      await page.getByRole('button', { name: /submit report/i }).click();
      
      // Verify offline queue
      await expect(page.getByText(/queued for sync/i)).toBeVisible();
      
      // Go back online
      await page.context().setOffline(false);
      await page.reload();
      await waitForNetworkIdle(page);
      
      // Verify sync on reconnect
      await expect(page.getByText(/report submitted/i)).toBeVisible();
      await expect(page.getByTestId('sync-status')).toContainText('Synchronized');
    });
  });

  test.describe('Performance Under Load', () => {
    test('maintains moderation performance with high report volume', async ({ authenticatedPage: page }) => {
      // Create multiple discussions for stress testing
      const discussionIds = [];
      for (let i = 0; i < 10; i++) {
        const id = await createTypedDiscussion(page, {
          title: `Load test discussion ${i}`,
          content: `Performance testing content ${i}`,
        });
        discussionIds.push(id);
      }

      // Submit multiple reports simultaneously
      const reportPromises = discussionIds.map(id => 
        reportContent(page, 'discussion', id, 'spam', `Load test report for ${id}`)
      );

      const startTime = Date.now();
      await Promise.all(reportPromises);
      const endTime = Date.now();

      // Verify performance under load
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(30000); // 30 seconds max for 10 reports

      // Verify all reports were processed
      for (const id of discussionIds) {
        await page.goto(`/community/discussions/${id}`);
        await expect(page.getByText(/reported/i)).toBeVisible();
      }
    });

    test('handles concurrent moderation actions without conflicts', async ({ authenticatedPage: page, context }) => {
      const discussionId = await createTypedDiscussion(page);
      
      // Open multiple tabs for concurrent actions
      const pages = [page];
      for (let i = 0; i < 3; i++) {
        pages.push(await context.newPage());
      }

      // Navigate all pages to the discussion
      await Promise.all(pages.map(p => p.goto(`/community/discussions/${discussionId}`)));

      // Attempt concurrent moderation actions
      const actions = pages.map((p, index) => 
        reportContent(p, 'discussion', discussionId, 'spam', `Concurrent report ${index}`)
      );

      await Promise.allSettled(actions);

      // Verify only one report was accepted (no duplicates)
      await page.goto(`/community/discussions/${discussionId}`);
      const reportCount = await page.locator('[data-testid="report-count"]').textContent();
      expect(parseInt(reportCount || '0')).toBe(1);
    });
  });
});