import { test, expect } from '../../fixtures/auth.fixture';
import { 
  waitForNetworkIdle, 
  fillForm,
  checkAccessibility,
  waitForAnimations 
} from '../../helpers/test-utils';

/**
 * Discussion Creation and Management Tests
 * 
 * Tests the complete lifecycle of discussions including:
 * - Creating new discussions
 * - Editing existing discussions  
 * - Deleting discussions
 * - Form validation
 * - Error handling
 * - Real-time updates
 */

test.describe('Discussion Management', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state
    await page.goto('/community');
    await waitForNetworkIdle(page);
  });

  test.describe('Discussion Creation', () => {
    test('user can create a new discussion with all fields', async ({ authenticatedPage: page }) => {
      // Navigate to community page
      await page.goto('/community');
      await waitForNetworkIdle(page);

      // Click create discussion button
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Verify modal opens
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Create Discussion')).toBeVisible();

      // Fill in discussion form
      await fillForm(page, {
        title: 'Tips for completing Bingo challenges',
        content: 'I\'m struggling with the shiny hunting challenge. Any tips for improving completion time?',
      });

      // Select game and challenge type
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByLabel('Challenge Type').selectOption('Bingo');

      // Add tags
      await page.getByLabel('Tags').fill('help');
      await page.keyboard.press('Enter');
      await page.getByLabel('Tags').fill('bingo');
      await page.keyboard.press('Enter');
      await page.getByLabel('Tags').fill('strategy');
      await page.keyboard.press('Enter');

      // Verify tags appear
      await expect(page.getByText('help')).toBeVisible();
      await expect(page.getByText('bingo')).toBeVisible();
      await expect(page.getByText('strategy')).toBeVisible();

      // Submit form
      await page.getByRole('button', { name: /create discussion/i }).click();

      // Verify discussion created and modal closes
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await waitForNetworkIdle(page);

      // Verify discussion appears in list
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await expect(discussionCard).toContainText('Tips for completing Bingo challenges');
      await expect(discussionCard).toContainText('Pokemon');
      await expect(discussionCard).toContainText('Bingo');
      await expect(discussionCard).toContainText('#help');
      await expect(discussionCard).toContainText('#bingo');
      await expect(discussionCard).toContainText('#strategy');
    });

    test('validates required fields when creating discussion', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Try to submit empty form
      await page.getByRole('button', { name: /create discussion/i }).click();

      // Verify validation errors
      await expect(page.getByText('Title is required')).toBeVisible();
      await expect(page.getByText('Content is required')).toBeVisible();
      await expect(page.getByText('Please select a specific game')).toBeVisible();

      // Fill title only
      await page.getByLabel('Title').fill('Test Title');
      await page.getByRole('button', { name: /create discussion/i }).click();

      // Verify remaining errors
      await expect(page.getByText('Title is required')).not.toBeVisible();
      await expect(page.getByText('Content is required')).toBeVisible();
      await expect(page.getByText('Please select a specific game')).toBeVisible();

      // Fill content
      await page.getByLabel('Content').fill('Test content');
      await page.getByRole('button', { name: /create discussion/i }).click();

      // Verify remaining error
      await expect(page.getByText('Content is required')).not.toBeVisible();
      await expect(page.getByText('Please select a specific game')).toBeVisible();

      // Select game
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();

      // Verify form submits successfully
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('prevents creating discussion with overly long content', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Create content that's too long (>5000 characters)
      const longContent = 'a'.repeat(5001);
      
      await page.getByLabel('Title').fill('Valid Title');
      await page.getByLabel('Content').fill(longContent);
      await page.getByLabel('Game').selectOption('Pokemon');
      
      await page.getByRole('button', { name: /create discussion/i }).click();

      // Verify error message
      await expect(page.getByText(/content must be less than 5000 characters/i)).toBeVisible();
    });

    test('limits tags to maximum of 5', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Add 5 tags
      const tags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'];
      for (const tag of tags) {
        await page.getByLabel('Tags').fill(tag);
        await page.keyboard.press('Enter');
      }

      // Verify all 5 tags are added
      for (const tag of tags) {
        await expect(page.getByText(tag)).toBeVisible();
      }

      // Try to add 6th tag
      await page.getByLabel('Tags').fill('tag6');
      await page.keyboard.press('Enter');

      // Verify tag input is disabled and 6th tag not added
      await expect(page.getByLabel('Tags')).toBeDisabled();
      await expect(page.getByText('tag6')).not.toBeVisible();
    });

    test('allows removing tags before submission', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Add some tags
      await page.getByLabel('Tags').fill('remove-me');
      await page.keyboard.press('Enter');
      await page.getByLabel('Tags').fill('keep-me');
      await page.keyboard.press('Enter');

      // Verify tags are added
      await expect(page.getByText('remove-me')).toBeVisible();
      await expect(page.getByText('keep-me')).toBeVisible();

      // Remove first tag
      await page.locator('[data-testid="tag-remove"]').first().click();

      // Verify only the correct tag was removed
      await expect(page.getByText('remove-me')).not.toBeVisible();
      await expect(page.getByText('keep-me')).toBeVisible();

      // Verify tag input is enabled again
      await expect(page.getByLabel('Tags')).toBeEnabled();
    });
  });

  test.describe('Discussion Editing', () => {
    test('author can edit their discussion', async ({ authenticatedPage: page }) => {
      // Create a discussion first
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();
      
      await fillForm(page, {
        title: 'Original Title',
        content: 'Original content for editing test',
      });
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();
      await waitForNetworkIdle(page);

      // Find and expand the created discussion
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();
      await waitForAnimations(page);

      // Click edit button
      await page.getByRole('button', { name: /edit/i }).click();

      // Verify edit form opens with current values
      await expect(page.getByRole('textbox', { name: /title/i })).toHaveValue('Original Title');
      await expect(page.getByRole('textbox', { name: /content/i })).toHaveValue('Original content for editing test');

      // Update content
      await page.getByLabel('Title').fill('Updated: Original Title');
      await page.getByLabel('Content').fill('EDIT: Found some great strategies to share!');

      // Save changes
      await page.getByRole('button', { name: /save changes/i }).click();
      await waitForNetworkIdle(page);

      // Verify updates are reflected
      await expect(page.getByText('Updated: Original Title')).toBeVisible();
      await expect(page.getByText('EDIT: Found some great strategies to share!')).toBeVisible();
      await expect(page.getByText('(edited)')).toBeVisible();
    });

    test('non-author cannot edit discussion', async ({ authenticatedPage: page }) => {
      // Navigate to a discussion not created by current user
      await page.goto('/community');
      await waitForNetworkIdle(page);

      // Expand first discussion (assuming it's not created by current user)
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();
      await waitForAnimations(page);

      // Verify edit button is not visible
      await expect(page.getByRole('button', { name: /edit/i })).not.toBeVisible();
    });

    test('validates edited content', async ({ authenticatedPage: page }) => {
      // Create a discussion to edit
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();
      
      await fillForm(page, {
        title: 'Edit Test Discussion',
        content: 'Content to be edited',
      });
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();
      await waitForNetworkIdle(page);

      // Open edit form
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();
      await page.getByRole('button', { name: /edit/i }).click();

      // Clear required fields
      await page.getByLabel('Title').fill('');
      await page.getByLabel('Content').fill('');

      // Try to save
      await page.getByRole('button', { name: /save changes/i }).click();

      // Verify validation errors
      await expect(page.getByText('Title is required')).toBeVisible();
      await expect(page.getByText('Content is required')).toBeVisible();
    });
  });

  test.describe('Discussion Deletion', () => {
    test('author can delete their discussion with confirmation', async ({ authenticatedPage: page }) => {
      // Create a discussion to delete
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();
      
      await fillForm(page, {
        title: 'Discussion to Delete',
        content: 'This discussion will be deleted',
      });
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();
      await waitForNetworkIdle(page);

      // Expand discussion and click delete
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();
      await page.getByRole('button', { name: /delete/i }).click();

      // Verify confirmation dialog
      const confirmDialog = page.getByRole('dialog');
      await expect(confirmDialog).toContainText('Are you sure you want to delete this discussion?');
      await expect(confirmDialog).toContainText('This action cannot be undone');

      // Confirm deletion
      await page.getByRole('button', { name: /delete discussion/i }).click();

      // Verify discussion is removed
      await expect(page.getByText('Discussion deleted successfully')).toBeVisible();
      await expect(page.getByText('Discussion to Delete')).not.toBeVisible();
    });

    test('user can cancel discussion deletion', async ({ authenticatedPage: page }) => {
      // Create a discussion
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();
      
      await fillForm(page, {
        title: 'Discussion Not to Delete',
        content: 'This discussion should remain',
      });
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();
      await waitForNetworkIdle(page);

      // Start deletion process
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();
      await page.getByRole('button', { name: /delete/i }).click();

      // Cancel deletion
      await page.getByRole('button', { name: /cancel/i }).click();

      // Verify discussion still exists
      await expect(page.getByText('Discussion Not to Delete')).toBeVisible();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('non-author cannot delete discussion', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await waitForNetworkIdle(page);

      // Expand first discussion (assuming not created by current user)
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();
      await waitForAnimations(page);

      // Verify delete button is not visible
      await expect(page.getByRole('button', { name: /delete/i })).not.toBeVisible();
    });
  });

  test.describe('Form Accessibility', () => {
    test('create discussion form is accessible', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Check accessibility
      const accessibilityResult = await checkAccessibility(page);
      expect(accessibilityResult.passed).toBe(true);

      // Test keyboard navigation
      await page.keyboard.press('Tab'); // Should focus title input
      await expect(page.getByLabel('Title')).toBeFocused();

      await page.keyboard.press('Tab'); // Should focus game select
      await expect(page.getByLabel('Game')).toBeFocused();

      await page.keyboard.press('Tab'); // Should focus challenge select
      await expect(page.getByLabel('Challenge Type')).toBeFocused();

      await page.keyboard.press('Tab'); // Should focus content textarea
      await expect(page.getByLabel('Content')).toBeFocused();
    });

    test('edit form maintains accessibility', async ({ authenticatedPage: page }) => {
      // Create and edit a discussion
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();
      
      await fillForm(page, {
        title: 'Accessibility Test Discussion',
        content: 'Testing accessibility features',
      });
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();
      await waitForNetworkIdle(page);

      // Open edit form
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();
      await page.getByRole('button', { name: /edit/i }).click();

      // Check accessibility
      const accessibilityResult = await checkAccessibility(page);
      expect(accessibilityResult.passed).toBe(true);
    });
  });

  test.describe('Error Handling', () => {
    test('handles network errors gracefully during creation', async ({ authenticatedPage: page, context }) => {
      // Mock network failure for discussion creation
      await context.route('**/api/discussions', route => {
        route.abort('failed');
      });

      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();
      
      await fillForm(page, {
        title: 'Network Error Test',
        content: 'This should fail to create',
      });
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();

      // Verify error handling
      await expect(page.getByText(/failed to create discussion/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();

      // Restore network and retry
      await context.unroute('**/api/discussions');
      await page.getByRole('button', { name: /retry/i }).click();

      // Verify discussion is created after retry
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.getByText('Network Error Test')).toBeVisible();
    });

    test('handles server errors during deletion', async ({ authenticatedPage: page, context }) => {
      // Create a discussion first
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();
      
      await fillForm(page, {
        title: 'Server Error Test',
        content: 'This deletion should fail',
      });
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();
      await waitForNetworkIdle(page);

      // Mock server error for deletion
      await context.route('**/api/discussions/**', route => {
        if (route.request().method() === 'DELETE') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal server error' }),
          });
        } else {
          route.continue();
        }
      });

      // Attempt deletion
      const discussionCard = page.locator('[data-testid="discussion-card"]').first();
      await discussionCard.click();
      await page.getByRole('button', { name: /delete/i }).click();
      await page.getByRole('button', { name: /delete discussion/i }).click();

      // Verify error handling
      await expect(page.getByText(/failed to delete discussion/i)).toBeVisible();
      await expect(page.getByText('Server Error Test')).toBeVisible(); // Discussion still exists
    });
  });

  test.describe('Performance', () => {
    test('discussion creation has acceptable performance', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      
      const startTime = Date.now();
      
      await page.getByRole('button', { name: /new discussion/i }).click();
      await fillForm(page, {
        title: 'Performance Test Discussion',
        content: 'Testing creation performance',
      });
      await page.getByLabel('Game').selectOption('Pokemon');
      await page.getByRole('button', { name: /create discussion/i }).click();
      
      // Wait for discussion to appear
      await expect(page.getByText('Performance Test Discussion')).toBeVisible();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    test('form interactions are responsive', async ({ authenticatedPage: page }) => {
      await page.goto('/community');
      await page.getByRole('button', { name: /new discussion/i }).click();

      // Test typing responsiveness
      const titleInput = page.getByLabel('Title');
      const startTime = Date.now();
      
      await titleInput.fill('Responsive Input Test');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should respond within 100ms
      expect(duration).toBeLessThan(100);
      
      // Verify value was set correctly
      await expect(titleInput).toHaveValue('Responsive Input Test');
    });
  });
});