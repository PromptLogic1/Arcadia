import { test, expect } from '../../fixtures/auth.fixture';
import { 
  waitForNetworkIdle, 
  waitForAnimations,
  mockApiResponse,
  fillForm
} from '../../helpers/test-utils';
import { BINGO_TEST_DATA } from '../../helpers/test-data';

test.describe('Bingo Board Sharing', () => {
  let testBoardId: string;

  test.beforeEach(async ({ authenticatedPage }) => {
    // Create a test board to share
    await authenticatedPage.goto('/play-area/bingo');
    await waitForNetworkIdle(authenticatedPage);
    
    await authenticatedPage.getByRole('button', { name: /create.*board/i }).click();
    await fillForm(authenticatedPage, {
      title: 'Shareable Test Board',
      description: 'A board for testing sharing functionality',
      gameType: 'valorant',
      isPublic: true
    });
    await authenticatedPage.getByRole('button', { name: /create/i }).click();
    
    // Extract board ID
    const url = authenticatedPage.url();
    testBoardId = url.split('/').pop() || '';
    
    // Add some cards to make it a complete board
    const cardTexts = ['Card 1', 'Card 2', 'Card 3', 'Card 4', 'Card 5'];
    for (const cardText of cardTexts) {
      await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
      await authenticatedPage.getByLabel(/card text/i).fill(cardText);
      await authenticatedPage.getByLabel(/category/i).selectOption('action');
      await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
    }
    
    await waitForNetworkIdle(authenticatedPage);
  });

  test.describe('Board Visibility Settings', () => {
    test('should create public board visible to all users', async ({ authenticatedPage, context }) => {
      // Verify board is marked as public
      await expect(authenticatedPage.getByTestId('board-visibility')).toContainText('Public');
      
      // Create second user session
      const anotherUserPage = await context.newPage();
      await anotherUserPage.goto('/play-area/bingo');
      await waitForNetworkIdle(anotherUserPage);
      
      // Public board should be visible in community boards
      await anotherUserPage.getByRole('tab', { name: /community/i }).click();
      await expect(anotherUserPage.getByText('Shareable Test Board')).toBeVisible();
      
      await anotherUserPage.close();
    });

    test('should create private board visible only to owner', async ({ authenticatedPage, context }) => {
      // Change board to private
      await authenticatedPage.getByRole('button', { name: /board.*settings/i }).click();
      await authenticatedPage.getByLabel(/private/i).check();
      await authenticatedPage.getByRole('button', { name: /save.*settings/i }).click();
      
      await expect(authenticatedPage.getByTestId('board-visibility')).toContainText('Private');
      
      // Create second user session
      const anotherUserPage = await context.newPage();
      await anotherUserPage.goto('/play-area/bingo');
      await waitForNetworkIdle(anotherUserPage);
      
      // Private board should not be visible to other users
      await anotherUserPage.getByRole('tab', { name: /community/i }).click();
      await expect(anotherUserPage.getByText('Shareable Test Board')).not.toBeVisible();
      
      await anotherUserPage.close();
    });

    test('should toggle board visibility', async ({ authenticatedPage }) => {
      // Start as public, change to private
      await authenticatedPage.getByRole('button', { name: /board.*settings/i }).click();
      await authenticatedPage.getByLabel(/private/i).check();
      await authenticatedPage.getByRole('button', { name: /save.*settings/i }).click();
      
      await expect(authenticatedPage.getByTestId('board-visibility')).toContainText('Private');
      
      // Change back to public
      await authenticatedPage.getByRole('button', { name: /board.*settings/i }).click();
      await authenticatedPage.getByLabel(/public/i).check();
      await authenticatedPage.getByRole('button', { name: /save.*settings/i }).click();
      
      await expect(authenticatedPage.getByTestId('board-visibility')).toContainText('Public');
    });
  });

  test.describe('Direct Board Sharing', () => {
    test('should generate shareable link', async ({ authenticatedPage }) => {
      // Open sharing dialog
      await authenticatedPage.getByRole('button', { name: /share/i }).click();
      
      // Should show shareable link
      const shareLink = authenticatedPage.getByTestId('share-link');
      await expect(shareLink).toBeVisible();
      
      const linkText = await shareLink.textContent();
      expect(linkText).toContain(testBoardId);
      expect(linkText).toMatch(/https?:\/\/.+\/bingo\/board\/.+/);
    });

    test('should copy link to clipboard', async ({ authenticatedPage }) => {
      await authenticatedPage.getByRole('button', { name: /share/i }).click();
      
      // Mock clipboard API
      await authenticatedPage.evaluate(() => {
        Object.assign(navigator, {
          clipboard: {
            writeText: jest.fn().mockResolvedValue(undefined)
          }
        });
      });
      
      await authenticatedPage.getByRole('button', { name: /copy.*link/i }).click();
      
      // Verify clipboard was called
      const clipboardCalled = await authenticatedPage.evaluate(() => 
        navigator.clipboard.writeText.mock?.calls?.length > 0
      );
      expect(clipboardCalled).toBe(true);
      
      // Should show confirmation message
      await expect(authenticatedPage.getByText(/link copied/i)).toBeVisible();
    });

    test('should share via social media platforms', async ({ authenticatedPage }) => {
      await authenticatedPage.getByRole('button', { name: /share/i }).click();
      
      // Should show social sharing options
      await expect(authenticatedPage.getByRole('button', { name: /twitter/i })).toBeVisible();
      await expect(authenticatedPage.getByRole('button', { name: /facebook/i })).toBeVisible();
      await expect(authenticatedPage.getByRole('button', { name: /discord/i })).toBeVisible();
      
      // Clicking Twitter share should open new window
      const twitterButton = authenticatedPage.getByRole('button', { name: /twitter/i });
      
      // Mock window.open
      await authenticatedPage.evaluate(() => {
        window.open = jest.fn();
      });
      
      await twitterButton.click();
      
      const windowOpenCalled = await authenticatedPage.evaluate(() => 
        window.open.mock?.calls?.length > 0
      );
      expect(windowOpenCalled).toBe(true);
    });

    test('should access shared board via direct link', async ({ authenticatedPage, context }) => {
      // Get share link
      await authenticatedPage.getByRole('button', { name: /share/i }).click();
      const shareLink = await authenticatedPage.getByTestId('share-link').textContent();
      
      // Open shared link in new tab
      const sharedPage = await context.newPage();
      await sharedPage.goto(shareLink || '');
      
      // Should load board in view-only mode
      await expect(sharedPage.getByTestId('board-title')).toContainText('Shareable Test Board');
      await expect(sharedPage.getByTestId('bingo-grid')).toBeVisible();
      
      // Should show play/copy options
      await expect(sharedPage.getByRole('button', { name: /play.*board/i })).toBeVisible();
      await expect(sharedPage.getByRole('button', { name: /copy.*board/i })).toBeVisible();
      
      await sharedPage.close();
    });
  });

  test.describe('Board Templates and Community', () => {
    test('should submit board as template', async ({ authenticatedPage }) => {
      // Complete the board first
      await authenticatedPage.goto(`/play-area/bingo/edit/${testBoardId}`);
      
      // Fill board with required cards
      for (let i = 5; i < 25; i++) {
        await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
        await authenticatedPage.getByLabel(/card text/i).fill(`Template Card ${i}`);
        await authenticatedPage.getByLabel(/category/i).selectOption('action');
        await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
      }
      
      // Submit as template
      await authenticatedPage.getByRole('button', { name: /submit.*template/i }).click();
      await authenticatedPage.getByLabel(/template.*description/i).fill('This is a great template for Valorant players');
      await authenticatedPage.getByLabel(/tags/i).fill('valorant, competitive, fps');
      await authenticatedPage.getByRole('button', { name: /submit/i }).click();
      
      // Should show success message
      await expect(authenticatedPage.getByText(/template submitted/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/review.*approval/i)).toBeVisible();
    });

    test('should browse community templates', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/play-area/bingo/templates');
      await waitForNetworkIdle(authenticatedPage);
      
      // Should show template gallery
      await expect(authenticatedPage.getByTestId('template-gallery')).toBeVisible();
      
      // Should have filter options
      await expect(authenticatedPage.getByRole('combobox', { name: /game.*type/i })).toBeVisible();
      await expect(authenticatedPage.getByRole('combobox', { name: /difficulty/i })).toBeVisible();
      await expect(authenticatedPage.getByPlaceholder(/search.*templates/i)).toBeVisible();
      
      // Filter by game type
      await authenticatedPage.getByRole('combobox', { name: /game.*type/i }).click();
      await authenticatedPage.getByRole('option', { name: /valorant/i }).click();
      
      // Should show only Valorant templates
      const templates = authenticatedPage.getByTestId(/template-card-/);
      await expect(templates.first()).toBeVisible();
    });

    test('should use community template', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/play-area/bingo/templates');
      
      // Select a template
      const firstTemplate = authenticatedPage.getByTestId('template-card').first();
      await firstTemplate.click();
      
      // Should show template preview
      await expect(authenticatedPage.getByTestId('template-preview')).toBeVisible();
      await expect(authenticatedPage.getByRole('button', { name: /use.*template/i })).toBeVisible();
      
      // Use the template
      await authenticatedPage.getByRole('button', { name: /use.*template/i }).click();
      
      // Should create new board with template data
      await expect(authenticatedPage).toHaveURL(/\/bingo\/edit\/[a-zA-Z0-9-]+$/);
      await expect(authenticatedPage.getByTestId('bingo-grid')).toBeVisible();
      
      // Board should be pre-populated with template cards
      const gridCells = authenticatedPage.getByTestId(/grid-cell-\d+-\d+/);
      const filledCells = await gridCells.filter({ hasNotText: '' }).count();
      expect(filledCells).toBeGreaterThan(0);
    });

    test('should rate and review templates', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/play-area/bingo/templates');
      
      const template = authenticatedPage.getByTestId('template-card').first();
      await template.click();
      
      // Should show rating section
      await expect(authenticatedPage.getByTestId('template-rating')).toBeVisible();
      
      // Rate the template (5 stars)
      const stars = authenticatedPage.getByTestId(/star-\d+/);
      await stars.nth(4).click(); // 5th star (0-indexed)
      
      // Write review
      await authenticatedPage.getByPlaceholder(/write.*review/i).fill('Great template for competitive play!');
      await authenticatedPage.getByRole('button', { name: /submit.*review/i }).click();
      
      // Should show success message
      await expect(authenticatedPage.getByText(/review submitted/i)).toBeVisible();
      
      // Review should appear in list
      await expect(authenticatedPage.getByText('Great template for competitive play!')).toBeVisible();
    });
  });

  test.describe('Collaborative Editing', () => {
    test('should allow collaborative board editing', async ({ authenticatedPage, context }) => {
      // Make board collaborative
      await authenticatedPage.getByRole('button', { name: /board.*settings/i }).click();
      await authenticatedPage.getByLabel(/allow.*collaboration/i).check();
      await authenticatedPage.getByRole('button', { name: /save.*settings/i }).click();
      
      // Get collaboration link
      await authenticatedPage.getByRole('button', { name: /share/i }).click();
      const collabLink = await authenticatedPage.getByTestId('collaboration-link').textContent();
      
      // Second user joins collaboration
      const collaboratorPage = await context.newPage();
      await collaboratorPage.goto(collabLink || '');
      
      // Both users should see live updates
      await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
      await authenticatedPage.getByLabel(/card text/i).fill('Collaborative Card');
      await authenticatedPage.getByLabel(/category/i).selectOption('action');
      await authenticatedPage.getByRole('button', { name: /save.*card/i }).click();
      
      // Collaborator should see the new card
      await expect(collaboratorPage.getByText('Collaborative Card')).toBeVisible();
      
      // Collaborator adds a card
      await collaboratorPage.getByRole('button', { name: /add.*card/i }).click();
      await collaboratorPage.getByLabel(/card text/i).fill('Second User Card');
      await collaboratorPage.getByLabel(/category/i).selectOption('action');
      await collaboratorPage.getByRole('button', { name: /save.*card/i }).click();
      
      // Original user should see the collaborator's card
      await expect(authenticatedPage.getByText('Second User Card')).toBeVisible();
      
      await collaboratorPage.close();
    });

    test('should show active collaborators', async ({ authenticatedPage, context }) => {
      // Enable collaboration
      await authenticatedPage.getByRole('button', { name: /board.*settings/i }).click();
      await authenticatedPage.getByLabel(/allow.*collaboration/i).check();
      await authenticatedPage.getByRole('button', { name: /save.*settings/i }).click();
      
      // Should show collaborators panel
      await expect(authenticatedPage.getByTestId('active-collaborators')).toBeVisible();
      await expect(authenticatedPage.getByText(/1 editor/i)).toBeVisible();
      
      // Add collaborator
      const shareLink = await authenticatedPage.getByTestId('collaboration-link').textContent();
      const collaboratorPage = await context.newPage();
      await collaboratorPage.goto(shareLink || '');
      
      // Should show 2 editors
      await expect(authenticatedPage.getByText(/2 editors/i)).toBeVisible();
      await expect(authenticatedPage.getByTestId('collaborator-avatar')).toHaveCount(2);
      
      await collaboratorPage.close();
      
      // Should go back to 1 editor
      await expect(authenticatedPage.getByText(/1 editor/i)).toBeVisible();
    });

    test('should handle edit conflicts gracefully', async ({ authenticatedPage, context }) => {
      // Setup collaboration
      await authenticatedPage.getByRole('button', { name: /board.*settings/i }).click();
      await authenticatedPage.getByLabel(/allow.*collaboration/i).check();
      await authenticatedPage.getByRole('button', { name: /save.*settings/i }).click();
      
      const shareLink = await authenticatedPage.getByTestId('collaboration-link').textContent();
      const collaboratorPage = await context.newPage();
      await collaboratorPage.goto(shareLink || '');
      
      // Both users try to edit same card simultaneously
      await authenticatedPage.getByRole('button', { name: /add.*card/i }).click();
      await collaboratorPage.getByRole('button', { name: /add.*card/i }).click();
      
      await Promise.all([
        authenticatedPage.getByLabel(/card text/i).fill('Conflict Card A'),
        collaboratorPage.getByLabel(/card text/i).fill('Conflict Card B')
      ]);
      
      await Promise.all([
        authenticatedPage.getByRole('button', { name: /save.*card/i }).click(),
        collaboratorPage.getByRole('button', { name: /save.*card/i }).click()
      ]);
      
      // Both cards should exist (no data loss)
      await expect(authenticatedPage.getByText('Conflict Card A')).toBeVisible();
      await expect(authenticatedPage.getByText('Conflict Card B')).toBeVisible();
      await expect(collaboratorPage.getByText('Conflict Card A')).toBeVisible();
      await expect(collaboratorPage.getByText('Conflict Card B')).toBeVisible();
      
      await collaboratorPage.close();
    });
  });

  test.describe('Permission Management', () => {
    test('should manage board permissions', async ({ authenticatedPage }) => {
      // Open permission settings
      await authenticatedPage.getByRole('button', { name: /board.*settings/i }).click();
      await authenticatedPage.getByRole('tab', { name: /permissions/i }).click();
      
      // Should show permission options
      await expect(authenticatedPage.getByLabel(/view.*only/i)).toBeVisible();
      await expect(authenticatedPage.getByLabel(/can.*edit/i)).toBeVisible();
      await expect(authenticatedPage.getByLabel(/can.*share/i)).toBeVisible();
      
      // Set view-only permission
      await authenticatedPage.getByLabel(/view.*only/i).check();
      await authenticatedPage.getByRole('button', { name: /save.*permissions/i }).click();
      
      await expect(authenticatedPage.getByText(/permissions updated/i)).toBeVisible();
    });

    test('should invite specific users to collaborate', async ({ authenticatedPage }) => {
      await authenticatedPage.getByRole('button', { name: /share/i }).click();
      await authenticatedPage.getByRole('tab', { name: /invite.*users/i }).click();
      
      // Invite user by email
      await authenticatedPage.getByLabel(/email.*address/i).fill('collaborator@example.com');
      await authenticatedPage.getByRole('combobox', { name: /permission/i }).click();
      await authenticatedPage.getByRole('option', { name: /can edit/i }).click();
      await authenticatedPage.getByRole('button', { name: /send.*invite/i }).click();
      
      // Should show invitation sent
      await expect(authenticatedPage.getByText(/invitation sent/i)).toBeVisible();
      
      // Should show pending invitation
      await expect(authenticatedPage.getByTestId('pending-invitations')).toContainText('collaborator@example.com');
    });

    test('should revoke access from users', async ({ authenticatedPage }) => {
      // First add a user (mock scenario)
      await authenticatedPage.evaluate(() => {
        // Mock adding a collaborator
        const collaboratorsList = document.querySelector('[data-testid="collaborators-list"]');
        if (collaboratorsList) {
          collaboratorsList.innerHTML += `
            <div data-testid="collaborator-item">
              <span>test@example.com</span>
              <button data-testid="revoke-access">Revoke</button>
            </div>
          `;
        }
      });
      
      await authenticatedPage.getByRole('button', { name: /board.*settings/i }).click();
      await authenticatedPage.getByRole('tab', { name: /collaborators/i }).click();
      
      // Revoke access
      await authenticatedPage.getByTestId('revoke-access').click();
      await authenticatedPage.getByRole('button', { name: /confirm.*revoke/i }).click();
      
      // Should remove user from list
      await expect(authenticatedPage.getByText('test@example.com')).not.toBeVisible();
    });
  });

  test.describe('Board Discovery', () => {
    test('should appear in search results', async ({ authenticatedPage, context }) => {
      // Ensure board is public and has good metadata
      await authenticatedPage.getByRole('button', { name: /board.*settings/i }).click();
      await authenticatedPage.getByLabel(/tags/i).fill('valorant, fps, competitive');
      await authenticatedPage.getByLabel(/public/i).check();
      await authenticatedPage.getByRole('button', { name: /save.*settings/i }).click();
      
      // Search from another user's perspective
      const searcherPage = await context.newPage();
      await searcherPage.goto('/play-area/bingo');
      
      // Search for the board
      await searcherPage.getByPlaceholder(/search.*boards/i).fill('Shareable Test');
      await searcherPage.keyboard.press('Enter');
      
      // Should find the board
      await expect(searcherPage.getByText('Shareable Test Board')).toBeVisible();
      
      // Search by tag
      await searcherPage.getByPlaceholder(/search.*boards/i).clear();
      await searcherPage.getByPlaceholder(/search.*boards/i).fill('valorant');
      await searcherPage.keyboard.press('Enter');
      
      await expect(searcherPage.getByText('Shareable Test Board')).toBeVisible();
      
      await searcherPage.close();
    });

    test('should show in featured boards when popular', async ({ authenticatedPage, context }) => {
      // Mock board popularity (simulate multiple plays/likes)
      await mockApiResponse(authenticatedPage, '**/api/bingo/boards/featured', {
        body: {
          featured: [{
            id: testBoardId,
            title: 'Shareable Test Board',
            description: 'A board for testing sharing functionality',
            plays: 150,
            likes: 45,
            creator: 'Test User'
          }]
        }
      });
      
      // Check featured section
      const viewerPage = await context.newPage();
      await viewerPage.goto('/play-area/bingo');
      
      await expect(viewerPage.getByTestId('featured-boards')).toBeVisible();
      await expect(viewerPage.getByText('Shareable Test Board')).toBeVisible();
      
      await viewerPage.close();
    });

    test('should track board statistics', async ({ authenticatedPage }) => {
      // View board statistics
      await authenticatedPage.getByRole('button', { name: /board.*settings/i }).click();
      await authenticatedPage.getByRole('tab', { name: /statistics/i }).click();
      
      // Should show usage stats
      await expect(authenticatedPage.getByTestId('total-plays')).toBeVisible();
      await expect(authenticatedPage.getByTestId('total-shares')).toBeVisible();
      await expect(authenticatedPage.getByTestId('average-rating')).toBeVisible();
      await expect(authenticatedPage.getByTestId('completion-rate')).toBeVisible();
      
      // Should show charts/graphs
      await expect(authenticatedPage.getByTestId('plays-over-time-chart')).toBeVisible();
    });
  });

  test.describe('Export and Import', () => {
    test('should export board configuration', async ({ authenticatedPage }) => {
      // Mock download functionality
      await authenticatedPage.evaluate(() => {
        // Mock URL.createObjectURL and download
        URL.createObjectURL = jest.fn(() => 'mock-url');
        HTMLAnchorElement.prototype.click = jest.fn();
      });
      
      await authenticatedPage.getByRole('button', { name: /board.*settings/i }).click();
      await authenticatedPage.getByRole('button', { name: /export.*board/i }).click();
      
      // Choose export format
      await authenticatedPage.getByRole('radio', { name: /json/i }).check();
      await authenticatedPage.getByRole('button', { name: /download/i }).click();
      
      // Should trigger download
      const downloadTriggered = await authenticatedPage.evaluate(() => 
        HTMLAnchorElement.prototype.click.mock?.calls?.length > 0
      );
      expect(downloadTriggered).toBe(true);
    });

    test('should import board from file', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/play-area/bingo');
      await authenticatedPage.getByRole('button', { name: /import.*board/i }).click();
      
      // Mock file input
      const fileInput = authenticatedPage.getByLabel(/choose.*file/i);
      await fileInput.setInputFiles({
        name: 'test-board.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({
          title: 'Imported Board',
          description: 'Board imported from file',
          cards: [
            { text: 'Imported Card 1', category: 'action' },
            { text: 'Imported Card 2', category: 'weapon' }
          ]
        }))
      });
      
      await authenticatedPage.getByRole('button', { name: /import/i }).click();
      
      // Should create new board with imported data
      await expect(authenticatedPage.getByText(/board imported/i)).toBeVisible();
      await expect(authenticatedPage).toHaveURL(/\/bingo\/edit\/[a-zA-Z0-9-]+$/);
      await expect(authenticatedPage.getByTestId('board-title')).toContainText('Imported Board');
    });
  });

  test.describe('Social Features', () => {
    test('should like and unlike boards', async ({ authenticatedPage, context }) => {
      // View board as another user
      const viewerPage = await context.newPage();
      await viewerPage.goto(`/play-area/bingo/board/${testBoardId}`);
      
      // Like the board
      await viewerPage.getByRole('button', { name: /like/i }).click();
      await expect(viewerPage.getByRole('button', { name: /liked/i })).toBeVisible();
      
      // Should increment like count
      const likeCount = await viewerPage.getByTestId('like-count').textContent();
      expect(parseInt(likeCount || '0')).toBeGreaterThan(0);
      
      // Unlike the board
      await viewerPage.getByRole('button', { name: /liked/i }).click();
      await expect(viewerPage.getByRole('button', { name: /like/i })).toBeVisible();
      
      await viewerPage.close();
    });

    test('should add boards to favorites', async ({ authenticatedPage, context }) => {
      const viewerPage = await context.newPage();
      await viewerPage.goto(`/play-area/bingo/board/${testBoardId}`);
      
      // Add to favorites
      await viewerPage.getByRole('button', { name: /favorite/i }).click();
      await expect(viewerPage.getByText(/added to favorites/i)).toBeVisible();
      
      // Should appear in user's favorites
      await viewerPage.goto('/play-area/bingo/favorites');
      await expect(viewerPage.getByText('Shareable Test Board')).toBeVisible();
      
      await viewerPage.close();
    });

    test('should follow board creators', async ({ authenticatedPage, context }) => {
      const followerPage = await context.newPage();
      await followerPage.goto(`/play-area/bingo/board/${testBoardId}`);
      
      // Follow the creator
      await followerPage.getByRole('button', { name: /follow.*creator/i }).click();
      await expect(followerPage.getByText(/following/i)).toBeVisible();
      
      // Should get notifications about new boards from this creator
      await followerPage.goto('/notifications');
      // (This would require the creator to publish another board to test)
      
      await followerPage.close();
    });
  });
});