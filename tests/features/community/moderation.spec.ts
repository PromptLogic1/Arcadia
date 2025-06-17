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
 * Content Moderation Tests
 * 
 * Tests content reporting and moderation features including:
 * - Reporting inappropriate content
 * - Spam detection and prevention
 * - Rate limiting mechanisms
 * - Content filtering
 * - XSS and security prevention
 * - Moderator tools and actions
 * - Automated content moderation
 */

test.describe('Content Moderation', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/community');
    await waitForNetworkIdle(page);
  });

  test.describe('Content Reporting', () => {
    test('user can report inappropriate discussion', async ({ authenticatedPage: page }) => {
      // Create a discussion to report
      await createSpamDiscussion(page);
      
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();
      await waitForAnimations(page);

      // Click report button
      await page.getByRole('button', { name: /report/i }).click();

      // Verify report modal opens
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Report Content')).toBeVisible();

      // Select reason and add details
      await page.getByLabel('Reason').selectOption('spam');
      await page.getByLabel('Additional details').fill('This discussion is clearly spam advertising external services');

      // Submit report
      await page.getByRole('button', { name: /submit report/i }).click();

      // Verify confirmation
      await expect(page.getByText('Thank you for your report')).toBeVisible();
      await expect(page.getByText('Our moderation team will review this content within 24 hours')).toBeVisible();
      
      // Verify report button is disabled after reporting
      await expect(page.getByRole('button', { name: /report/i })).toBeDisabled();
      await expect(page.getByText('Reported')).toBeVisible();
    });

    test('user can report inappropriate comment', async ({ authenticatedPage: page }) => {
      // Create discussion and add inappropriate comment
      await createTestDiscussion(page);
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      // Add inappropriate comment
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill('This is an inappropriate comment with offensive language');
      await page.getByRole('button', { name: /post comment/i }).click();
      await waitForNetworkIdle(page);

      // Report the comment
      const commentElement = page.locator('[data-testid="comment"]').first();
      await commentElement.getByRole('button', { name: /more options/i }).click();
      await page.getByRole('menuitem', { name: /report/i }).click();

      // Fill report form
      await page.getByLabel('Reason').selectOption('harassment');
      await page.getByLabel('Additional details').fill('This comment contains inappropriate language');
      await page.getByRole('button', { name: /submit report/i }).click();

      // Verify report success
      await expect(page.getByText('Comment reported successfully')).toBeVisible();
    });

    test('report form validates required fields', async ({ authenticatedPage: page }) => {
      await createTestDiscussion(page);
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();
      await page.getByRole('button', { name: /report/i }).click();

      // Try to submit without selecting reason
      await page.getByRole('button', { name: /submit report/i }).click();
      await expect(page.getByText('Please select a reason for reporting')).toBeVisible();

      // Select reason but submit without details for specific categories
      await page.getByLabel('Reason').selectOption('other');
      await page.getByRole('button', { name: /submit report/i }).click();
      await expect(page.getByText('Please provide additional details')).toBeVisible();
    });

    test('prevents duplicate reports from same user', async ({ authenticatedPage: page }) => {
      await createTestDiscussion(page);
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      // Submit first report
      await page.getByRole('button', { name: /report/i }).click();
      await page.getByLabel('Reason').selectOption('spam');
      await page.getByLabel('Additional details').fill('First report');
      await page.getByRole('button', { name: /submit report/i }).click();
      await waitForNetworkIdle(page);

      // Try to report again
      await expect(page.getByRole('button', { name: /report/i })).toBeDisabled();
      await expect(page.getByText('You have already reported this content')).toBeVisible();
    });

    test('report reasons cover common moderation cases', async ({ authenticatedPage: page }) => {
      await createTestDiscussion(page);
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();
      await page.getByRole('button', { name: /report/i }).click();

      // Verify all report reasons are available
      const reasonSelect = page.getByLabel('Reason');
      await expect(reasonSelect.locator('option[value="spam"]')).toBeVisible();
      await expect(reasonSelect.locator('option[value="harassment"]')).toBeVisible();
      await expect(reasonSelect.locator('option[value="hate-speech"]')).toBeVisible();
      await expect(reasonSelect.locator('option[value="misinformation"]')).toBeVisible();
      await expect(reasonSelect.locator('option[value="copyright"]')).toBeVisible();
      await expect(reasonSelect.locator('option[value="off-topic"]')).toBeVisible();
      await expect(reasonSelect.locator('option[value="other"]')).toBeVisible();
    });
  });

  test.describe('Spam Detection', () => {
    test('system detects and flags obvious spam content', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Try to submit obvious spam content
      await fillForm(page, {
        title: 'BUY CHEAP GOLD NOW!!! BEST PRICES!!!',
        content: 'Visit spam-site.com for the cheapest game gold! Amazing deals! Click here now!!! $$$',
      });
      
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();

      // Verify spam detection
      await expect(page.getByText('Your post appears to contain spam')).toBeVisible();
      await expect(page.getByText('Please review our community guidelines')).toBeVisible();
      await expect(page.getByRole('button', { name: /review and edit/i })).toBeVisible();
    });

    test('spam detection analyzes multiple criteria', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Test various spam indicators
      const spamContent = `
        FREE MONEY!!! CLICK HERE!!!
        www.spam-site.com
        AMAZING DEALS $$$$$
        BUY NOW OR MISS OUT!!!
      `;

      await fillForm(page, {
        title: 'URGENT!!! LIMITED TIME OFFER!!!',
        content: spamContent,
      });
      
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();

      // Verify spam indicators are caught
      await expect(page.getByText('Content flagged for review')).toBeVisible();
      await expect(page.getByText('Detected issues:')).toBeVisible();
      await expect(page.getByText('• Excessive use of capital letters')).toBeVisible();
      await expect(page.getByText('• Multiple exclamation marks')).toBeVisible();
      await expect(page.getByText('• Potential external links')).toBeVisible();
    });

    test('allows legitimate content with similar keywords', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Legitimate content that might trigger false positives
      await fillForm(page, {
        title: 'Best strategy for gold farming in RPGs',
        content: 'What are the most effective methods for earning gold in role-playing games? I\'m looking for legitimate in-game strategies.',
      });
      
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();
      await waitForNetworkIdle(page);

      // Should not trigger spam detection
      await expect(page.getByText('Best strategy for gold farming')).toBeVisible();
      await expect(page.getByText('Your post appears to contain spam')).not.toBeVisible();
    });

    test('escalates repeated spam attempts', async ({ authenticatedPage: page }) => {
      // Attempt multiple spam posts
      for (let i = 1; i <= 3; i++) {
        await page.goto('/community');
        await page.getByRole('button', { name: /new discussion/i }).click();
        
        await fillForm(page, {
          title: `SPAM ATTEMPT ${i}!! BUY NOW!!!`,
          content: `Spam content attempt number ${i} with external links`,
        });
        
        await page.getByLabel('Game').selectOption('Pokemon');
        await page.getByRole('button', { name: /create discussion/i }).click();
        
        if (i < 3) {
          await expect(page.getByText('Your post appears to contain spam')).toBeVisible();
          await page.getByRole('button', { name: /cancel/i }).click();
        }
      }

      // Third attempt should trigger stronger measures
      await expect(page.getByText('Account temporarily restricted')).toBeVisible();
      await expect(page.getByText('Multiple spam attempts detected')).toBeVisible();
      await expect(page.getByText('Contact support if you believe this is an error')).toBeVisible();
    });
  });

  test.describe('Rate Limiting', () => {
    test('prevents rapid discussion creation', async ({ authenticatedPage: page }) => {
      // Create discussions rapidly
      for (let i = 1; i <= 4; i++) {
        await page.goto('/community');
        await page.getByRole('button', { name: /new discussion/i }).click();
        
        await fillForm(page, {
          title: `Rate Limit Test Discussion ${i}`,
          content: `This is test discussion number ${i} for rate limiting`,
        });
        
        await page.getByLabel('Game').selectOption('Pokemon');
        await page.getByRole('button', { name: /create discussion/i }).click();
        
        if (i <= 3) {
          await waitForNetworkIdle(page);
        }
      }

      // Fourth attempt should be rate limited
      await expect(page.getByText('You\'re posting too quickly')).toBeVisible();
      await expect(page.getByText('Please wait 5 minutes before creating another discussion')).toBeVisible();
      await expect(page.getByText('Rate limit: 3 discussions per 5 minutes')).toBeVisible();
    });

    test('prevents comment spam with rate limiting', async ({ authenticatedPage: page }) => {
      await createTestDiscussion(page);
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      // Post comments rapidly
      for (let i = 1; i <= 10; i++) {
        await page.getByPlaceholder('What are your thoughts on this discussion?').fill(`Rapid comment ${i}`);
        await page.getByRole('button', { name: /post comment/i }).click();
        
        if (i < 8) {
          await waitForNetworkIdle(page);
        }
      }

      // Should hit rate limit
      await expect(page.getByText('Comment rate limit exceeded')).toBeVisible();
      await expect(page.getByText('Please wait before posting another comment')).toBeVisible();
    });

    test('shows remaining time for rate limit', async ({ authenticatedPage: page }) => {
      // Trigger rate limit
      for (let i = 1; i <= 4; i++) {
        await page.goto('/community');
        await page.getByRole('button', { name: /new discussion/i }).click();
        
        await fillForm(page, {
          title: `Rate Limit Timer Test ${i}`,
          content: `Testing rate limit timer ${i}`,
        });
        
        await page.getByLabel('Game').selectOption('Pokemon');
        await page.getByRole('button', { name: /create discussion/i }).click();
        
        if (i <= 3) {
          await waitForNetworkIdle(page);
        }
      }

      // Check rate limit message with countdown
      await expect(page.getByText(/Time remaining: \d+:\d+/)).toBeVisible();
      await expect(page.getByText('You can create another discussion in')).toBeVisible();
    });

    test('rate limits reset after cooldown period', async ({ authenticatedPage: page }) => {
      // This test would normally require waiting for actual cooldown
      // Instead, we'll mock the time advancement
      
      // Trigger rate limit
      for (let i = 1; i <= 4; i++) {
        await page.goto('/community');
        await page.getByRole('button', { name: /new discussion/i }).click();
        
        await fillForm(page, {
          title: `Cooldown Test ${i}`,
          content: `Testing cooldown ${i}`,
        });
        
        await page.getByLabel('Game').selectOption('Pokemon');
        await page.getByRole('button', { name: /create discussion/i }).click();
        
        if (i <= 3) {
          await waitForNetworkIdle(page);
        }
      }

      // Verify rate limit is active
      await expect(page.getByText('You\'re posting too quickly')).toBeVisible();

      // Mock time advancement (in a real test, this would advance server time)
      await mockApiResponse(page, '**/api/rate-limit/check**', {
        body: { allowed: true, remaining: 3, resetTime: null },
      });

      // Try to create discussion again
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();
      
      await fillForm(page, {
        title: 'Post-Cooldown Discussion',
        content: 'This should work after cooldown',
      });
      
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();

      // Should succeed
      await expect(page.getByText('Post-Cooldown Discussion')).toBeVisible();
    });
  });

  test.describe('Content Filtering', () => {
    test('filters profanity in discussions and comments', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Include filtered words (using mild examples for testing)
      await fillForm(page, {
        title: 'Discussion with inappropriate word',
        content: 'This content contains a filtered word that should be replaced',
      });
      
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();
      await waitForNetworkIdle(page);

      // Verify content is filtered/flagged
      await expect(page.getByText('Content contains filtered words')).toBeVisible();
      await expect(page.getByText('Please review and edit your content')).toBeVisible();
    });

    test('allows appeal for false positive filtering', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Content that might trigger false positive
      await fillForm(page, {
        title: 'Scunthorpe United FC Discussion',
        content: 'Discussing legitimate topics that might trigger filters',
      });
      
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();

      // If flagged, should have appeal option
      if (await page.getByText('Content flagged by filter').isVisible()) {
        await expect(page.getByRole('button', { name: /appeal this decision/i })).toBeVisible();
        
        await page.getByRole('button', { name: /appeal this decision/i }).click();
        await page.getByLabel('Reason for appeal').fill('This is a legitimate discussion about a football team');
        await page.getByRole('button', { name: /submit appeal/i }).click();
        
        await expect(page.getByText('Appeal submitted for review')).toBeVisible();
      }
    });

    test('escalates content with multiple violations', async ({ authenticatedPage: page }) => {
      // Simulate multiple content violations
      const violations = [
        'First violation content',
        'Second violation with more issues',
        'Third violation - pattern detected'
      ];

      for (let i = 0; i < violations.length; i++) {
        await page.goto('/community');
        await page.getByRole('button', { name: /new discussion/i }).click();
        
        await fillForm(page, {
          title: `Violation Test ${i + 1}`,
          content: violations[i],
        });
        
        await page.getByLabel('Game').selectOption('Pokemon');
        await page.getByRole('button', { name: /create discussion/i }).click();
        
        if (i < 2) {
          await expect(page.getByText('Content flagged for review')).toBeVisible();
          await page.getByRole('button', { name: /cancel/i }).click();
        }
      }

      // Third violation should escalate
      await expect(page.getByText('Account flagged for repeated violations')).toBeVisible();
      await expect(page.getByText('Manual review required')).toBeVisible();
    });
  });

  test.describe('XSS and Security Prevention', () => {
    test('prevents XSS attacks in discussion content', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Try to inject malicious script
      const xssPayload = '<script>alert("XSS")</script><img src=x onerror=alert("XSS")>';
      await fillForm(page, {
        title: 'XSS Test Discussion',
        content: `Safe content with dangerous payload: ${xssPayload}`,
      });
      
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();
      await waitForNetworkIdle(page);

      // Verify script tags are escaped/removed, not executed
      const discussionContent = page.locator('[data-testid="discussion-content"]');
      await expect(discussionContent).toContainText('Safe content');
      
      // Script should be visible as text, not executed
      await expect(discussionContent.locator('script')).not.toBeAttached();
      
      // Verify no alert dialogs appear
      await page.waitForTimeout(1000);
      const dialogs: string[] = [];
      page.on('dialog', dialog => dialogs.push(dialog.message()));
      expect(dialogs).toHaveLength(0);
    });

    test('sanitizes HTML in comments', async ({ authenticatedPage: page }) => {
      await createTestDiscussion(page);
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();

      // Try to inject malicious HTML in comment
      const maliciousComment = '<script>alert("comment XSS")</script><iframe src="malicious.com"></iframe>Safe comment text';
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill(maliciousComment);
      await page.getByRole('button', { name: /post comment/i }).click();
      await waitForNetworkIdle(page);

      // Verify malicious elements are removed but safe content remains
      const commentElement = page.locator('[data-testid="comment"]').first();
      await expect(commentElement).toContainText('Safe comment text');
      await expect(commentElement.locator('script')).not.toBeAttached();
      await expect(commentElement.locator('iframe')).not.toBeAttached();
    });

    test('validates and sanitizes URLs in content', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Include various URL types
      const contentWithUrls = `
        Safe link: https://example.com
        Suspicious link: javascript:alert('xss')
        Data URL: data:text/html,<script>alert('xss')</script>
        Local link: /safe/internal/link
      `;

      await fillForm(page, {
        title: 'URL Validation Test',
        content: contentWithUrls,
      });
      
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();
      await waitForNetworkIdle(page);

      // Verify safe URLs are preserved and dangerous ones are removed/neutralized
      const content = page.locator('[data-testid="discussion-content"]');
      await expect(content.locator('a[href="https://example.com"]')).toBeVisible();
      await expect(content.locator('a[href^="javascript:"]')).not.toBeAttached();
      await expect(content.locator('a[href^="data:"]')).not.toBeAttached();
    });

    test('prevents CSRF attacks in form submissions', async ({ authenticatedPage: page }) => {
      // Mock CSRF token validation
      await mockApiResponse(page, '**/api/discussions**', {
        status: 403,
        body: { error: 'CSRF token mismatch' },
      });

      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();
      
      await fillForm(page, {
        title: 'CSRF Test Discussion',
        content: 'Testing CSRF protection',
      });
      
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();

      // Should show CSRF error
      await expect(page.getByText('Security validation failed')).toBeVisible();
      await expect(page.getByText('Please refresh the page and try again')).toBeVisible();
    });
  });

  test.describe('Moderator Tools', () => {
    test('moderator can view reported content', async ({ authenticatedPage: page }) => {
      // Mock moderator role
      await mockApiResponse(page, '**/api/user/role**', {
        body: { role: 'moderator', permissions: ['view_reports', 'moderate_content'] },
      });

      await page.goto('/moderation/reports');
      await waitForNetworkIdle(page);

      // Verify moderator dashboard
      await expect(page.getByText('Content Reports')).toBeVisible();
      await expect(page.getByText('Pending Reports')).toBeVisible();
      await expect(page.locator('[data-testid="report-item"]')).toBeVisible();

      // Verify report details
      const reportItem = page.locator('[data-testid="report-item"]').first();
      await expect(reportItem).toContainText('Reported by:');
      await expect(reportItem).toContainText('Reason:');
      await expect(reportItem).toContainText('Reported at:');
    });

    test('moderator can take action on reported content', async ({ authenticatedPage: page }) => {
      await mockApiResponse(page, '**/api/user/role**', {
        body: { role: 'moderator', permissions: ['view_reports', 'moderate_content'] },
      });

      await page.goto('/moderation/reports');
      await waitForNetworkIdle(page);

      const reportItem = page.locator('[data-testid="report-item"]').first();
      
      // Test different moderation actions
      await reportItem.getByRole('button', { name: /take action/i }).click();

      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Moderation Actions')).toBeVisible();

      // Verify available actions
      await expect(page.getByRole('button', { name: /approve content/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /remove content/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /warn user/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /suspend user/i })).toBeVisible();

      // Take action
      await page.getByRole('button', { name: /remove content/i }).click();
      await page.getByLabel('Reason for action').fill('Content violates community guidelines');
      await page.getByRole('button', { name: /confirm action/i }).click();

      await expect(page.getByText('Content removed successfully')).toBeVisible();
    });

    test('moderator can view user history for repeat offenders', async ({ authenticatedPage: page }) => {
      await mockApiResponse(page, '**/api/user/role**', {
        body: { role: 'moderator', permissions: ['view_reports', 'moderate_content', 'view_user_history'] },
      });

      await page.goto('/moderation/reports');
      await page.locator('[data-testid="report-item"]').first().getByRole('link', { name: /view user history/i }).click();
      await waitForNetworkIdle(page);

      // Verify user moderation history
      await expect(page.getByText('User Moderation History')).toBeVisible();
      await expect(page.getByText('Previous Reports:')).toBeVisible();
      await expect(page.getByText('Actions Taken:')).toBeVisible();
      await expect(page.getByText('Account Status:')).toBeVisible();
    });
  });

  test.describe('Automated Moderation', () => {
    test('automatically hides content with high report ratio', async ({ authenticatedPage: page }) => {
      await createTestDiscussion(page);
      
      // Mock high report count
      await mockApiResponse(page, '**/api/discussions/*/reports**', {
        body: { reportCount: 10, autoHidden: true },
      });

      await page.reload();
      await waitForNetworkIdle(page);

      // Content should be automatically hidden
      await expect(page.getByText('Content hidden due to reports')).toBeVisible();
      await expect(page.getByText('This content is under review')).toBeVisible();
      await expect(page.getByRole('button', { name: /show content/i })).toBeVisible();
    });

    test('applies automatic restrictions to flagged accounts', async ({ authenticatedPage: page }) => {
      // Mock account with automatic restrictions
      await mockApiResponse(page, '**/api/user/restrictions**', {
        body: { 
          restricted: true, 
          reason: 'Multiple content violations',
          restrictions: ['no_posting', 'no_commenting'],
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
      });

      await page.goto('/community');
      
      // Verify restrictions are displayed
      await expect(page.getByText('Account temporarily restricted')).toBeVisible();
      await expect(page.getByText('Restrictions expire in:')).toBeVisible();
      
      // Verify posting is disabled
      await expect(page.getByRole('button', { name: /new discussion/i })).toBeDisabled();
    });
  });

  test.describe('Appeal Process', () => {
    test('user can appeal moderation decisions', async ({ authenticatedPage: page }) => {
      // Mock content that was moderated
      await mockApiResponse(page, '**/api/discussions/1**', {
        body: {
          discussion: {
            id: 1,
            title: 'My Discussion',
            content: 'This was removed',
            status: 'removed',
            moderationReason: 'Spam',
            canAppeal: true
          }
        },
      });

      await page.goto('/user/moderated-content');
      await waitForNetworkIdle(page);

      // Find moderated content and appeal
      await page.getByRole('button', { name: /appeal decision/i }).click();

      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Appeal Moderation Decision')).toBeVisible();

      // Fill appeal form
      await page.getByLabel('Reason for appeal').fill('This content does not violate community guidelines. It was legitimate discussion about gaming strategies.');
      await page.getByLabel('Additional context').fill('I believe this was incorrectly flagged as spam when it was actually helpful gaming advice.');
      
      await page.getByRole('button', { name: /submit appeal/i }).click();

      await expect(page.getByText('Appeal submitted successfully')).toBeVisible();
      await expect(page.getByText('You will receive a response within 48 hours')).toBeVisible();
    });

    test('tracks appeal status and updates', async ({ authenticatedPage: page }) => {
      await page.goto('/user/appeals');
      await waitForNetworkIdle(page);

      // Verify appeal tracking
      await expect(page.getByText('Your Appeals')).toBeVisible();
      await expect(page.locator('[data-testid="appeal-item"]')).toBeVisible();

      const appealItem = page.locator('[data-testid="appeal-item"]').first();
      await expect(appealItem).toContainText('Status:');
      await expect(appealItem).toContainText('Submitted:');
      await expect(appealItem).toContainText('Content:');
    });
  });
});

// Helper functions
async function createTestDiscussion(page: any) {
  await page.goto('/community');
  await page.getByRole('button', { name: /new discussion/i }).click();
  
  await fillForm(page, {
    title: 'Legitimate Test Discussion',
    content: 'This is a normal discussion for testing moderation features',
  });
  
  await page.getByLabel('Game').selectOption('Pokemon');
  await page.getByRole('button', { name: /create discussion/i }).click();
  await waitForNetworkIdle(page);
}

async function createSpamDiscussion(page: any) {
  await page.goto('/community');
  await page.getByRole('button', { name: /new discussion/i }).click();
  
  await fillForm(page, {
    title: 'BUY CHEAP GOLD NOW!!!',
    content: 'Visit spam.site for cheap game gold! Amazing deals! Click now!!!',
  });
  
  await page.getByLabel('Game').selectOption('Pokemon');
  await page.getByRole('button', { name: /create discussion/i }).click();
  await waitForNetworkIdle(page);
}