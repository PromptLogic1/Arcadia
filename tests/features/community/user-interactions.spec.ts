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
 * User Interactions Tests
 * 
 * Tests social features and user interactions including:
 * - Following/unfollowing users
 * - Upvoting discussions and comments
 * - Sharing discussions
 * - User profile interactions
 * - Social notifications
 * - Privacy controls
 */

test.describe('User Interactions', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/community');
    await waitForNetworkIdle(page);
  });

  test.describe('Following System', () => {
    test('user can follow another user from profile', async ({ authenticatedPage: page }) => {
      // Navigate to user profile
      await page.goto('/users/pro_gamer_123');
      await waitForNetworkIdle(page);

      // Verify initial state
      await expect(page.getByRole('button', { name: /follow/i })).toBeVisible();
      await expect(page.getByText('0 Followers')).toBeVisible();

      // Click follow button
      await page.getByRole('button', { name: /follow/i }).click();
      await waitForNetworkIdle(page);

      // Verify following state
      await expect(page.getByRole('button', { name: /following/i })).toBeVisible();
      await expect(page.getByText('1 Follower')).toBeVisible();
      await expect(page.getByText('You are now following pro_gamer_123')).toBeVisible();

      // Verify in following list
      await page.goto('/user/following');
      await waitForNetworkIdle(page);
      await expect(page.getByText('pro_gamer_123')).toBeVisible();
    });

    test('user can unfollow a user', async ({ authenticatedPage: page }) => {
      // Follow user first
      await page.goto('/users/pro_gamer_123');
      await page.getByRole('button', { name: /follow/i }).click();
      await waitForNetworkIdle(page);

      // Verify following state
      await expect(page.getByRole('button', { name: /following/i })).toBeVisible();

      // Unfollow user
      await page.getByRole('button', { name: /following/i }).click();
      await waitForNetworkIdle(page);

      // Verify unfollowed state
      await expect(page.getByRole('button', { name: /follow/i })).toBeVisible();
      await expect(page.getByText('You unfollowed pro_gamer_123')).toBeVisible();
    });

    test('user can follow from discussion author link', async ({ authenticatedPage: page }) => {
      // Create test discussion to have an author to follow
      await createTestDiscussion(page);
      
      // Find discussion and click author name
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();
      await waitForAnimations(page);

      // Click author profile link
      await page.getByTestId('discussion-author').click();
      await waitForNetworkIdle(page);

      // Follow from profile
      await page.getByRole('button', { name: /follow/i }).click();
      await waitForNetworkIdle(page);

      // Verify following
      await expect(page.getByRole('button', { name: /following/i })).toBeVisible();
    });

    test('following count updates in real-time', async ({ authenticatedPage: page, context }) => {
      // Open profile in two tabs
      const page1 = page;
      const page2 = await context.newPage();
      
      await page1.goto('/users/pro_gamer_123');
      await page2.goto('/users/pro_gamer_123');
      
      // Get initial follower count on both pages
      await expect(page1.getByText('0 Followers')).toBeVisible();
      await expect(page2.getByText('0 Followers')).toBeVisible();

      // Follow from page1
      await page1.getByRole('button', { name: /follow/i }).click();
      await waitForNetworkIdle(page1);

      // Verify count updates on page2
      await expect(page2.getByText('1 Follower')).toBeVisible({ timeout: 5000 });
    });

    test('prevents following yourself', async ({ authenticatedPage: page }) => {
      // Navigate to your own profile
      await page.goto('/user/profile');
      await waitForNetworkIdle(page);

      // Verify no follow button exists
      await expect(page.getByRole('button', { name: /follow/i })).not.toBeVisible();
      await expect(page.getByText('This is your profile')).toBeVisible();
    });

    test('shows mutual following indicators', async ({ authenticatedPage: page }) => {
      // Mock mutual following data
      await mockApiResponse(page, '**/api/users/pro_gamer_123**', {
        body: {
          user: {
            id: 'pro_gamer_123',
            username: 'pro_gamer_123',
            isFollowing: false,
            isFollowedBy: true,
            mutualFollows: 5,
          },
        },
      });

      await page.goto('/users/pro_gamer_123');
      await waitForNetworkIdle(page);

      // Verify mutual following indicators
      await expect(page.getByText('Follows you')).toBeVisible();
      await expect(page.getByText('5 mutual followers')).toBeVisible();
    });
  });

  test.describe('Upvoting System', () => {
    test('user can upvote discussions with optimistic updates', async ({ authenticatedPage: page }) => {
      await createTestDiscussion(page);
      
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      const upvoteButton = discussionCard.getByRole('button', { name: /upvote/i });
      
      // Get initial upvote count
      const initialText = await upvoteButton.textContent();
      const initialCount = parseInt(initialText?.match(/\d+/)?.[0] || '0');

      // Click upvote
      await upvoteButton.click();

      // Verify optimistic update (immediate)
      await expect(upvoteButton).toContainText(`${initialCount + 1}`);
      await expect(upvoteButton).toHaveClass(/text-red-400/); // Upvoted state

      // Verify persistence after reload
      await page.reload();
      await waitForNetworkIdle(page);
      const upvoteButtonAfterReload = page.locator('[data-testid="discussion-card"]').first().getByRole('button', { name: /upvote/i });
      await expect(upvoteButtonAfterReload).toContainText(`${initialCount + 1}`);
      await expect(upvoteButtonAfterReload).toHaveClass(/text-red-400/);
    });

    test('user can remove upvote from discussion', async ({ authenticatedPage: page }) => {
      await createTestDiscussion(page);
      
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      const upvoteButton = discussionCard.getByRole('button', { name: /upvote/i });
      
      // Get initial count
      const initialText = await upvoteButton.textContent();
      const initialCount = parseInt(initialText?.match(/\d+/)?.[0] || '0');

      // Upvote first
      await upvoteButton.click();
      await expect(upvoteButton).toContainText(`${initialCount + 1}`);
      await expect(upvoteButton).toHaveClass(/text-red-400/);

      // Remove upvote
      await upvoteButton.click();
      await expect(upvoteButton).toContainText(`${initialCount}`);
      await expect(upvoteButton).not.toHaveClass(/text-red-400/);
    });

    test('upvote counts sync across multiple sessions', async ({ authenticatedPage: page, context }) => {
      await createTestDiscussion(page);
      
      // Open discussion in two tabs
      const page1 = page;
      const page2 = await context.newPage();
      
      await page2.goto('/community');
      await waitForNetworkIdle(page2);

      const upvoteButton1 = page1.locator('[data-testid="discussion-card"]').first().getByRole('button', { name: /upvote/i });
      const upvoteButton2 = page2.locator('[data-testid="discussion-card"]').first().getByRole('button', { name: /upvote/i });

      // Get initial count on page1
      const initialText = await upvoteButton1.textContent();
      const initialCount = parseInt(initialText?.match(/\d+/)?.[0] || '0');

      // Upvote on page1
      await upvoteButton1.click();

      // Verify count updates on page2
      await expect(upvoteButton2).toContainText(`${initialCount + 1}`, { timeout: 5000 });
    });

    test('prevents spam upvoting with rate limiting', async ({ authenticatedPage: page }) => {
      await createTestDiscussion(page);
      
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      const upvoteButton = discussionCard.getByRole('button', { name: /upvote/i });

      // Rapidly click upvote multiple times
      for (let i = 0; i < 10; i++) {
        await upvoteButton.click();
        await page.waitForTimeout(100);
      }

      // Should show rate limiting message
      await expect(page.getByText('You\'re voting too quickly')).toBeVisible();
      await expect(page.getByText('Please wait before voting again')).toBeVisible();
    });

    test('upvote button shows loading state during request', async ({ authenticatedPage: page }) => {
      await createTestDiscussion(page);
      
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      const upvoteButton = discussionCard.getByRole('button', { name: /upvote/i });

      // Mock slow response
      await mockApiResponse(page, '**/api/discussions/*/upvote**', {
        delay: 2000,
        body: { success: true },
      });

      // Click upvote
      await upvoteButton.click();

      // Verify loading state
      await expect(upvoteButton).toBeDisabled();
      await expect(upvoteButton.locator('[data-testid="loading-spinner"]')).toBeVisible();
    });
  });

  test.describe('Sharing System', () => {
    test('user can share discussion via copy link', async ({ authenticatedPage: page, context }) => {
      await createTestDiscussion(page);

      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-write', 'clipboard-read']);
      
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();
      await waitForAnimations(page);

      // Click share button
      await page.getByRole('button', { name: /share/i }).click();

      // Test copy link
      await page.getByRole('button', { name: /copy link/i }).click();

      // Verify success message
      await expect(page.getByText('Link copied to clipboard')).toBeVisible();

      // Verify clipboard contains correct URL
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toMatch(/\/community\/discussions\/\d+/);
    });

    test('user can share to social media platforms', async ({ authenticatedPage: page, context }) => {
      await createTestDiscussion(page);
      
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();
      await page.getByRole('button', { name: /share/i }).click();

      // Test Twitter sharing
      const [twitterPage] = await Promise.all([
        context.waitForEvent('page'),
        page.getByRole('button', { name: /share on twitter/i }).click()
      ]);

      await expect(twitterPage).toHaveURL(/twitter\.com\/intent\/tweet/);
      await expect(twitterPage.url()).toContain('text=Check%20out%20this%20discussion');
      await twitterPage.close();

      // Test Reddit sharing
      const [redditPage] = await Promise.all([
        context.waitForEvent('page'),
        page.getByRole('button', { name: /share on reddit/i }).click()
      ]);

      await expect(redditPage).toHaveURL(/reddit\.com\/submit/);
      await redditPage.close();
    });

    test('share modal provides multiple sharing options', async ({ authenticatedPage: page }) => {
      await createTestDiscussion(page);
      
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();
      await page.getByRole('button', { name: /share/i }).click();

      // Verify all sharing options are available
      await expect(page.getByRole('button', { name: /copy link/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /share on twitter/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /share on reddit/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /share on discord/i })).toBeVisible();
      
      // Verify share counts
      await expect(page.getByText(/shared \d+ times/i)).toBeVisible();
    });

    test('tracks share analytics', async ({ authenticatedPage: page }) => {
      await createTestDiscussion(page);
      
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();
      await page.getByRole('button', { name: /share/i }).click();

      // Share via copy link
      await page.getByRole('button', { name: /copy link/i }).click();

      // Verify share count increments
      await expect(page.getByText(/shared \d+ times/i)).toBeVisible();
      
      // Share count should be tracked
      const shareText = await page.getByText(/shared \d+ times/i).textContent();
      const shareCount = parseInt(shareText?.match(/\d+/)?.[0] || '0');
      expect(shareCount).toBeGreaterThan(0);
    });
  });

  test.describe('User Profile Interactions', () => {
    test('user can view another user\'s profile and activity', async ({ authenticatedPage: page }) => {
      // Navigate to user profile
      await page.goto('/users/pro_gamer_123');
      await waitForNetworkIdle(page);

      // Verify profile information
      await expect(page.getByText('pro_gamer_123')).toBeVisible();
      await expect(page.getByText('Member since')).toBeVisible();
      await expect(page.getByText('Discussions created:')).toBeVisible();
      await expect(page.getByText('Comments posted:')).toBeVisible();

      // Verify activity feed
      await expect(page.getByText('Recent Activity')).toBeVisible();
      await expect(page.locator('[data-testid="activity-item"]')).toBeVisible();
    });

    test('user can send private message to another user', async ({ authenticatedPage: page }) => {
      await page.goto('/users/pro_gamer_123');
      await waitForNetworkIdle(page);

      // Click message button
      await page.getByRole('button', { name: /send message/i }).click();

      // Verify message modal opens
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Send Message to pro_gamer_123')).toBeVisible();

      // Fill and send message
      await page.getByLabel('Subject').fill('Test Message');
      await page.getByLabel('Message').fill('Hello, this is a test message!');
      await page.getByRole('button', { name: /send message/i }).click();

      // Verify success
      await expect(page.getByText('Message sent successfully')).toBeVisible();
    });

    test('user can view their own activity and statistics', async ({ authenticatedPage: page }) => {
      await page.goto('/user/profile');
      await waitForNetworkIdle(page);

      // Verify profile sections
      await expect(page.getByText('Your Profile')).toBeVisible();
      await expect(page.getByText('Activity Overview')).toBeVisible();
      await expect(page.getByText('Recent Discussions')).toBeVisible();
      await expect(page.getByText('Recent Comments')).toBeVisible();

      // Verify statistics
      await expect(page.getByText('Total Upvotes Received:')).toBeVisible();
      await expect(page.getByText('Discussions Created:')).toBeVisible();
      await expect(page.getByText('Comments Posted:')).toBeVisible();
    });

    test('user can update their profile information', async ({ authenticatedPage: page }) => {
      await page.goto('/user/profile');
      await page.getByRole('button', { name: /edit profile/i }).click();

      // Update profile fields
      await page.getByLabel('Display Name').fill('Updated Display Name');
      await page.getByLabel('Bio').fill('This is my updated bio with gaming interests');
      await page.getByLabel('Location').fill('New Location');

      // Save changes
      await page.getByRole('button', { name: /save changes/i }).click();

      // Verify updates
      await expect(page.getByText('Profile updated successfully')).toBeVisible();
      await expect(page.getByText('Updated Display Name')).toBeVisible();
      await expect(page.getByText('This is my updated bio')).toBeVisible();
    });
  });

  test.describe('Notification System', () => {
    test('user receives notification when someone follows them', async ({ authenticatedPage: page, context }) => {
      // Create second user session
      const page2 = await context.newPage();
      
      // User 2 follows User 1
      await page2.goto('/users/current_user_id');
      await page2.getByRole('button', { name: /follow/i }).click();
      await waitForNetworkIdle(page2);

      // Check notifications for User 1
      await page.goto('/notifications');
      await waitForNetworkIdle(page);

      // Verify follow notification
      await expect(page.getByText('started following you')).toBeVisible();
      await expect(page.getByRole('link', { name: 'View profile' })).toBeVisible();
    });

    test('user receives notification when their discussion is upvoted', async ({ authenticatedPage: page, context }) => {
      // Create discussion as User 1
      await createTestDiscussion(page);
      
      // User 2 upvotes the discussion
      const page2 = await context.newPage();
      await page2.goto('/community');
      await waitForNetworkIdle(page2);
      
      const upvoteButton = page2.locator('[data-testid="discussion-card"]').first().getByRole('button', { name: /upvote/i });
      await upvoteButton.click();

      // Check notifications for User 1
      await page.goto('/notifications');
      await waitForNetworkIdle(page);

      // Verify upvote notification
      await expect(page.getByText('upvoted your discussion')).toBeVisible();
    });

    test('user can mark notifications as read', async ({ authenticatedPage: page }) => {
      await page.goto('/notifications');
      await waitForNetworkIdle(page);

      // Verify unread notifications
      const unreadNotifications = page.locator('[data-testid="notification-unread"]');
      const unreadCount = await unreadNotifications.count();
      
      if (unreadCount > 0) {
        // Mark first notification as read
        await unreadNotifications.first().getByRole('button', { name: /mark as read/i }).click();

        // Verify notification is marked as read
        await expect(unreadNotifications.first()).toHaveClass(/notification-read/);
      }
    });

    test('user can configure notification preferences', async ({ authenticatedPage: page }) => {
      await page.goto('/settings/notifications');
      await waitForNetworkIdle(page);

      // Toggle notification types
      await page.getByLabel('Email notifications for follows').uncheck();
      await page.getByLabel('Push notifications for upvotes').check();
      await page.getByLabel('Email digest frequency').selectOption('weekly');

      // Save preferences
      await page.getByRole('button', { name: /save preferences/i }).click();

      // Verify success
      await expect(page.getByText('Notification preferences saved')).toBeVisible();

      // Verify persistence
      await page.reload();
      await expect(page.getByLabel('Email notifications for follows')).not.toBeChecked();
      await expect(page.getByLabel('Push notifications for upvotes')).toBeChecked();
    });
  });

  test.describe('Privacy Controls', () => {
    test('user can block another user', async ({ authenticatedPage: page }) => {
      await page.goto('/users/annoying_user');
      await page.getByRole('button', { name: /more actions/i }).click();
      await page.getByRole('menuitem', { name: /block user/i }).click();

      // Confirm block action
      const confirmDialog = page.getByRole('dialog');
      await expect(confirmDialog).toContainText('Are you sure you want to block annoying_user?');
      await expect(confirmDialog).toContainText('You will no longer see their content');
      
      await page.getByRole('button', { name: /block user/i }).click();

      // Verify block confirmation
      await expect(page.getByText('User blocked successfully')).toBeVisible();
      await expect(page.getByText('You will no longer see content from this user')).toBeVisible();

      // Verify blocked user content is hidden
      await page.goto('/community');
      await waitForNetworkIdle(page);
      await expect(page.getByText('Content from blocked user')).not.toBeVisible();
    });

    test('user can unblock a previously blocked user', async ({ authenticatedPage: page }) => {
      // Block user first
      await page.goto('/users/annoying_user');
      await page.getByRole('button', { name: /more actions/i }).click();
      await page.getByRole('menuitem', { name: /block user/i }).click();
      await page.getByRole('button', { name: /block user/i }).click();
      await waitForNetworkIdle(page);

      // Go to blocked users settings
      await page.goto('/settings/blocked-users');
      await waitForNetworkIdle(page);

      // Verify blocked user appears in list
      await expect(page.getByText('annoying_user')).toBeVisible();

      // Unblock user
      await page.getByRole('button', { name: /unblock/i }).click();

      // Verify unblock confirmation
      await expect(page.getByText('User unblocked successfully')).toBeVisible();
      await expect(page.getByText('annoying_user')).not.toBeVisible();
    });

    test('user can set discussion visibility to private', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Fill discussion form
      await fillForm(page, {
        title: 'Private Strategy Discussion',
        content: 'This should only be visible to invited users',
      });
      
      await page.getByLabel('Game').selectOption('Pokemon');
      
      // Set to private
      await page.getByLabel('Visibility').selectOption('private');
      await page.getByLabel('Invite users').fill('trusted_friend');
      await page.keyboard.press('Enter');
      
      await page.getByRole('button', { name: /create discussion/i }).click();
      await waitForNetworkIdle(page);

      // Verify private discussion indicators
      await expect(page.getByText('Private Discussion')).toBeVisible();
      await expect(page.getByText('Only invited users can see this')).toBeVisible();
    });

    test('private discussions are not visible to unauthorized users', async ({ authenticatedPage: page, context }) => {
      // Create private discussion
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();
      
      await fillForm(page, {
        title: 'Secret Strategy Discussion',
        content: 'Top secret gaming strategies',
      });
      
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByLabel('Visibility').selectOption('private');
      await page.getByRole('button', { name: /create discussion/i }).click();
      await waitForNetworkIdle(page);

      const discussionUrl = page.url();

      // Try to access as different user
      const page2 = await context.newPage();
      await page2.goto(discussionUrl);
      await waitForNetworkIdle(page2);

      // Verify access denied
      await expect(page2.getByText('You don\'t have permission to view this discussion')).toBeVisible();
      await expect(page2.getByText('Secret Strategy Discussion')).not.toBeVisible();
    });
  });

  test.describe('Social Features Performance', () => {
    test('following/unfollowing is responsive', async ({ authenticatedPage: page }) => {
      await page.goto('/users/pro_gamer_123');
      
      const startTime = Date.now();
      await page.getByRole('button', { name: /follow/i }).click();
      await expect(page.getByRole('button', { name: /following/i })).toBeVisible();
      const endTime = Date.now();

      // Should complete within 2 seconds
      expect(endTime - startTime).toBeLessThan(2000);
    });

    test('upvote interactions have good performance', async ({ authenticatedPage: page }) => {
      await createTestDiscussion(page);
      
      const upvoteButton = page.locator('[data-testid="discussion-card"]').first().getByRole('button', { name: /upvote/i });
      
      const startTime = Date.now();
      await upvoteButton.click();
      // Wait for optimistic update
      await expect(upvoteButton).toHaveClass(/text-red-400/);
      const endTime = Date.now();

      // Optimistic update should be instant (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  test.describe('Accessibility', () => {
    test('social interaction buttons are accessible', async ({ authenticatedPage: page }) => {
      await createTestDiscussion(page);
      
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      
      // Check accessibility of interaction buttons
      const accessibilityResult = await checkAccessibility(page, '[data-testid="discussion-interactions"]');
      expect(accessibilityResult.passed).toBe(true);

      // Test keyboard navigation
      await discussionCard.focus();
      await page.keyboard.press('Tab'); // Focus upvote button
      await expect(discussionCard.getByRole('button', { name: /upvote/i })).toBeFocused();

      await page.keyboard.press('Tab'); // Focus share button
      await expect(discussionCard.getByRole('button', { name: /share/i })).toBeFocused();
    });

    test('user profile interactions are keyboard accessible', async ({ authenticatedPage: page }) => {
      await page.goto('/users/pro_gamer_123');
      
      // Test keyboard navigation through profile actions
      await page.keyboard.press('Tab'); // Focus follow button
      await expect(page.getByRole('button', { name: /follow/i })).toBeFocused();

      await page.keyboard.press('Tab'); // Focus message button
      await expect(page.getByRole('button', { name: /send message/i })).toBeFocused();

      await page.keyboard.press('Tab'); // Focus more actions
      await expect(page.getByRole('button', { name: /more actions/i })).toBeFocused();
    });
  });
});

// Helper function to create a test discussion
async function createTestDiscussion(page: any) {
  await page.goto('/community');
  await page.getByRole('button', { name: /new discussion/i }).click();
  
  await fillForm(page, {
    title: 'Test Discussion for Interactions',
    content: 'This discussion is for testing user interactions',
  });
  
  await page.getByLabel('Game').selectOption('Pokemon');
  await page.getByRole('button', { name: /create discussion/i }).click();
  await waitForNetworkIdle(page);
}