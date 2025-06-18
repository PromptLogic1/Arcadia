import { type Page, expect } from '@playwright/test';
import type { Tables } from '../../types/database.types';
import { waitForNetworkIdle, waitForAnimations } from './test-utils';

// ============================================================================
// TYPES - Using proper database types
// ============================================================================

export type Discussion = Tables<'discussions'>;
export type Comment = Tables<'comments'>;

export interface DiscussionWithAuthor extends Discussion {
  author?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

export interface CommentWithAuthor extends Comment {
  author?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  replies?: CommentWithAuthor[];
}

export interface ModerationReport {
  id: string;
  content_type: 'discussion' | 'comment';
  content_id: string;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'copyright' | 'other';
  details?: string;
  reporter_id: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface CommunityFilters {
  game?: string | null;
  challenge_type?: string | null;
  tags?: string[];
  search_term?: string;
  sort_by?: 'newest' | 'oldest' | 'most_upvoted' | 'most_comments';
}

// ============================================================================
// TYPE-SAFE CONTENT GENERATORS
// ============================================================================

/**
 * Generate type-safe discussion data with proper validation
 */
export function generateDiscussion(overrides?: Partial<Discussion>): Omit<Discussion, 'id' | 'created_at' | 'updated_at'> {
  const baseDiscussion = {
    title: 'Test Discussion: Best Strategies for Speedrunning',
    content: 'Looking for advice on improving speedrun times. What techniques work best for you?',
    game: 'Pokemon',
    challenge_type: 'Speedrun',
    tags: ['help', 'speedrun', 'strategy'],
    author_id: null,
    upvotes: 0,
    ...overrides,
  };

  // Validate required fields match database schema
  if (!baseDiscussion.title || baseDiscussion.title.length < 3) {
    throw new Error('Discussion title must be at least 3 characters');
  }
  if (!baseDiscussion.content || baseDiscussion.content.length < 10) {
    throw new Error('Discussion content must be at least 10 characters');
  }
  if (!baseDiscussion.game) {
    throw new Error('Discussion must have a game specified');
  }

  return baseDiscussion;
}

/**
 * Generate type-safe comment data with proper validation
 */
export function generateComment(discussion_id: number, overrides?: Partial<Comment>): Omit<Comment, 'id' | 'created_at' | 'updated_at'> {
  const baseComment = {
    content: 'Great question! I recommend practicing the duplication glitch for faster item collection.',
    discussion_id,
    author_id: null,
    upvotes: 0,
    ...overrides,
  };

  // Validate required fields
  if (!baseComment.content || baseComment.content.length < 1) {
    throw new Error('Comment content cannot be empty');
  }
  if (baseComment.content.length > 2000) {
    throw new Error('Comment content must be less than 2000 characters');
  }
  if (!baseComment.discussion_id) {
    throw new Error('Comment must be associated with a discussion');
  }

  return baseComment;
}

/**
 * Generate spam content for moderation testing
 */
export function generateSpamContent(): Partial<Discussion> {
  return {
    title: 'BUY CHEAP GOLD NOW!!! BEST PRICES!!!',
    content: 'Visit spam-site.com for the cheapest game gold! LIMITED TIME OFFER! Click now!!!',
    game: 'All Games',
    tags: ['spam', 'advertisement'],
  };
}

/**
 * Generate inappropriate content for moderation testing
 */
export function generateInappropriateContent(): Partial<Discussion> {
  return {
    title: 'Inappropriate Discussion Title',
    content: 'This content contains inappropriate language and harmful material for testing moderation systems.',
    game: 'Pokemon',
    tags: ['inappropriate'],
  };
}

// ============================================================================
// TYPE-SAFE INTERACTION HELPERS
// ============================================================================

/**
 * Create a type-safe discussion with proper validation
 */
export async function createTypedDiscussion(
  page: Page,
  discussionData?: Partial<Discussion>
): Promise<string> {
  const data = generateDiscussion(discussionData);
  
  await page.goto('/community');
  await waitForNetworkIdle(page);
  
  // Open discussion creation modal
  await page.getByRole('button', { name: /new discussion/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  
  // Fill form with type-safe data
  await page.getByLabel('Title').fill(data.title);
  await page.getByLabel('Content').fill(data.content);
  await page.getByLabel('Game').selectOption(data.game);
  
  if (data.challenge_type) {
    await page.getByLabel('Challenge Type').selectOption(data.challenge_type);
  }
  
  // Add tags if provided
  if (data.tags && data.tags.length > 0) {
    for (const tag of data.tags) {
      await page.getByLabel('Tags').fill(tag);
      await page.keyboard.press('Enter');
      // Verify tag was added
      await expect(page.getByText(`#${tag}`)).toBeVisible();
    }
  }
  
  // Submit form
  await page.getByRole('button', { name: /create discussion/i }).click();
  
  // Wait for modal to close and discussion to appear
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await waitForNetworkIdle(page);
  
  // Extract and return discussion ID
  const discussionCard = page.locator('[data-testid="discussion-card"]').first();
  await expect(discussionCard).toBeVisible();
  
  const discussionId = await discussionCard.getAttribute('data-discussion-id');
  if (!discussionId) {
    throw new Error('Failed to create discussion - no ID found');
  }
  
  return discussionId;
}

/**
 * Create a type-safe comment with validation
 */
export async function createTypedComment(
  page: Page,
  discussionId: string,
  commentData?: Partial<Comment>
): Promise<string> {
  const data = generateComment(parseInt(discussionId), commentData);
  
  // Navigate to discussion and expand comments
  const discussionCard = page.locator(`[data-discussion-id="${discussionId}"]`);
  await expect(discussionCard).toBeVisible();
  
  // Expand discussion if not already expanded
  const isExpanded = await discussionCard.getAttribute('data-expanded');
  if (isExpanded !== 'true') {
    await discussionCard.click();
    await waitForAnimations(page);
  }
  
  // Verify comment section is visible
  await expect(page.getByPlaceholder('What are your thoughts on this discussion?')).toBeVisible();
  
  // Fill and submit comment
  await page.getByPlaceholder('What are your thoughts on this discussion?').fill(data.content);
  await page.getByRole('button', { name: /post comment/i }).click();
  
  await waitForNetworkIdle(page);
  
  // Get the created comment ID
  const commentElement = page.locator('[data-testid="comment"]').last();
  await expect(commentElement).toBeVisible();
  
  const commentId = await commentElement.getAttribute('data-comment-id');
  if (!commentId) {
    throw new Error('Failed to create comment - no ID found');
  }
  
  return commentId;
}

/**
 * Perform upvote action with optimistic update validation
 */
export async function upvoteDiscussion(
  page: Page,
  discussionId: string
): Promise<void> {
  const discussionCard = page.locator(`[data-discussion-id="${discussionId}"]`);
  const upvoteButton = discussionCard.getByRole('button', { name: /upvote/i });
  
  // Get initial count
  const initialText = await upvoteButton.textContent();
  const initialCount = parseInt(initialText?.match(/\d+/)?.[0] || '0');
  
  // Click upvote
  await upvoteButton.click();
  
  // Verify optimistic update (immediate UI change)
  await expect(upvoteButton).toContainText(String(initialCount + 1));
  await expect(upvoteButton).toHaveClass(/text-red-400|active/);
  
  // Wait for server confirmation
  await waitForNetworkIdle(page);
  
  // Verify persistent state after network request
  await expect(upvoteButton).toContainText(String(initialCount + 1));
}

/**
 * Apply community filters with type safety
 */
export async function applyCommunityFilters(
  page: Page,
  filters: CommunityFilters
): Promise<void> {
  // Apply game filter
  if (filters.game !== undefined) {
    if (filters.game) {
      await page.getByLabel('Game').selectOption(filters.game);
    } else {
      await page.getByLabel('Game').selectOption('all');
    }
  }
  
  // Apply challenge type filter
  if (filters.challenge_type !== undefined) {
    if (filters.challenge_type) {
      await page.getByLabel('Challenge Type').selectOption(filters.challenge_type);
    } else {
      await page.getByLabel('Challenge Type').selectOption('all');
    }
  }
  
  // Apply search term
  if (filters.search_term !== undefined) {
    const searchInput = page.getByPlaceholder('Search discussions...');
    await searchInput.fill(filters.search_term);
    await page.keyboard.press('Enter');
  }
  
  // Apply sorting
  if (filters.sort_by) {
    await page.getByLabel('Sort by').selectOption(filters.sort_by);
  }
  
  // Apply tag filters
  if (filters.tags && filters.tags.length > 0) {
    for (const tag of filters.tags) {
      await page.getByLabel('Filter by tag').fill(tag);
      await page.keyboard.press('Enter');
    }
  }
  
  await waitForNetworkIdle(page);
}

/**
 * Report content with proper moderation flow
 */
export async function reportContent(
  page: Page,
  contentType: 'discussion' | 'comment',
  contentId: string,
  reason: ModerationReport['reason'],
  details?: string
): Promise<void> {
  const contentElement = contentType === 'discussion' 
    ? page.locator(`[data-discussion-id="${contentId}"]`)
    : page.locator(`[data-comment-id="${contentId}"]`);
  
  // Open report modal
  await contentElement.getByRole('button', { name: /report/i }).click();
  
  // Verify modal opens
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Report Content')).toBeVisible();
  
  // Select reason
  await page.getByLabel('Reason').selectOption(reason);
  
  // Add details if provided
  if (details) {
    await page.getByLabel('Additional details').fill(details);
  }
  
  // Submit report
  await page.getByRole('button', { name: /submit report/i }).click();
  
  // Verify confirmation
  await expect(page.getByText('Thank you for your report')).toBeVisible();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  
  // Verify content is marked as reported
  await expect(contentElement.getByRole('button', { name: /report/i })).toBeDisabled();
}

// ============================================================================
// REAL-TIME TESTING HELPERS
// ============================================================================

/**
 * Test real-time updates with multiple browser contexts
 */
export async function testRealTimeUpdates(
  page1: Page,
  page2: Page,
  discussionId: string,
  action: 'comment' | 'upvote',
  actionData?: { content?: string }
): Promise<void> {
  // Both pages should be on the same discussion
  await page1.goto(`/community/discussions/${discussionId}`);
  await page2.goto(`/community/discussions/${discussionId}`);
  
  await waitForNetworkIdle(page1);
  await waitForNetworkIdle(page2);
  
  if (action === 'comment' && actionData?.content) {
    // Add comment on page2
    await page2.getByPlaceholder('What are your thoughts on this discussion?').fill(actionData.content);
    await page2.getByRole('button', { name: /post comment/i }).click();
    
    // Verify comment appears on page1 in real-time
    await expect(page1.getByText(actionData.content)).toBeVisible({ timeout: 10000 });
    
    // Verify comment count updates
    await expect(page1.getByText(/comments \(\d+\)/i)).toBeVisible();
  }
  
  if (action === 'upvote') {
    // Get initial count on page1
    const upvoteButton1 = page1.getByRole('button', { name: /upvote/i });
    const initialText = await upvoteButton1.textContent();
    const initialCount = parseInt(initialText?.match(/\d+/)?.[0] || '0');
    
    // Upvote on page2
    await page2.getByRole('button', { name: /upvote/i }).click();
    
    // Verify count updates on page1
    await expect(upvoteButton1).toContainText(String(initialCount + 1), { timeout: 10000 });
  }
}

/**
 * Test rate limiting with proper timing
 */
export async function testRateLimit(
  page: Page,
  action: 'create_discussion' | 'create_comment',
  limit = 3
): Promise<void> {
  const actions = [];
  
  for (let i = 0; i < limit; i++) {
    if (action === 'create_discussion') {
      actions.push(createTypedDiscussion(page, {
        title: `Rate Limit Test Discussion ${i}`,
        content: `Testing rate limiting for discussion creation ${i}`,
      }));
    } else if (action === 'create_comment') {
      // Assume we have a discussion to comment on
      const discussionId = await createTypedDiscussion(page);
      actions.push(createTypedComment(page, discussionId, {
        content: `Rate limit test comment ${i}`,
      }));
    }
  }
  
  // Execute all actions rapidly
  await Promise.all(actions);
  
  // Try one more action - should be rate limited
  if (action === 'create_discussion') {
    await page.goto('/community');
    await page.getByRole('button', { name: /new discussion/i }).click();
    
    await page.getByLabel('Title').fill('Rate Limited Discussion');
    await page.getByLabel('Content').fill('This should be rate limited');
    await page.getByLabel('Game').selectOption('Pokemon');
    await page.getByRole('button', { name: /create discussion/i }).click();
    
    // Verify rate limit message
    await expect(page.getByText(/you're posting too quickly/i)).toBeVisible();
    await expect(page.getByText(/please wait/i)).toBeVisible();
  }
}

// ============================================================================
// ACCESSIBILITY TESTING
// ============================================================================

/**
 * Test community accessibility features
 */
export async function testCommunityAccessibility(page: Page): Promise<void> {
  await page.goto('/community');
  await waitForNetworkIdle(page);
  
  // Test keyboard navigation
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  
  // Test screen reader support
  const discussions = page.locator('[data-testid="discussion-card"]');
  const firstDiscussion = discussions.first();
  
  // Verify ARIA labels
  await expect(firstDiscussion).toHaveAttribute('role', 'article');
  await expect(firstDiscussion.getByRole('heading')).toBeVisible();
  
  // Test modal accessibility
  await page.getByRole('button', { name: /new discussion/i }).click();
  const modal = page.getByRole('dialog');
  
  await expect(modal).toHaveAttribute('aria-labelledby');
  await expect(modal).toHaveAttribute('aria-describedby');
  
  // Test form accessibility
  await expect(page.getByLabel('Title')).toBeVisible();
  await expect(page.getByLabel('Content')).toBeVisible();
  await expect(page.getByLabel('Game')).toBeVisible();
  
  // Test focus management
  const titleInput = page.getByLabel('Title');
  await expect(titleInput).toBeFocused();
  
  // Close modal with Escape
  await page.keyboard.press('Escape');
  await expect(modal).not.toBeVisible();
}

// ============================================================================
// PERFORMANCE TESTING
// ============================================================================

/**
 * Test pagination performance for large comment threads
 */
export async function testCommentPagination(
  page: Page,
  discussionId: string,
  commentCount = 50
): Promise<void> {
  // Create multiple comments
  for (let i = 0; i < commentCount; i++) {
    await createTypedComment(page, discussionId, {
      content: `Performance test comment ${i} - testing pagination and loading`,
    });
  }
  
  await page.goto(`/community/discussions/${discussionId}`);
  
  // Verify initial load (should show first batch)
  const comments = page.locator('[data-testid="comment"]');
  const initialCount = await comments.count();
  expect(initialCount).toBeGreaterThan(0);
  
  // Test infinite scroll or pagination
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  
  // Wait for more comments to load
  await waitForNetworkIdle(page);
  
  // Verify more comments loaded
  const finalCount = await comments.count();
  expect(finalCount).toBeGreaterThan(20);
  
  // Test search performance within comments
  await page.getByPlaceholder('Search comments...').fill('test comment 25');
  await waitForNetworkIdle(page);
  
  // Verify search results
  await expect(page.getByText('test comment 25')).toBeVisible();
}