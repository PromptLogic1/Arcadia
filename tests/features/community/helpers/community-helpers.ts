import { Page, expect } from '@playwright/test';
import type { Tables } from '@/types/database.types';
import { 
  generateDiscussion, 
  generateComment,
  type Discussion,
  type Comment,
  type DiscussionWithAuthor,
  type CommentWithAuthor,
} from '../fixtures/community-fixtures';
import { waitForNetworkIdle } from '../../../helpers/test-utils';

// Pagination interfaces
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

export type PaginatedDiscussions = PaginatedResponse<DiscussionWithAuthor>;
export type PaginatedComments = PaginatedResponse<CommentWithAuthor>;

// User interaction event types
export interface CommentInteractionEvent {
  type: 'upvote' | 'downvote' | 'report' | 'reply';
  commentId: number;
  userId: string;
  timestamp: string;
}

export interface DiscussionFilterEvent {
  game?: string | null;
  challengeType?: string | null;
  tags?: string[];
  searchTerm?: string;
  sortBy?: 'newest' | 'oldest' | 'most_upvoted' | 'most_comments';
}

// Helper to create a typed discussion
export async function createTypedDiscussion(
  page: Page,
  discussionData?: Partial<Discussion>
): Promise<string> {
  const data = generateDiscussion(discussionData);
  
  await page.goto('/community');
  await page.getByRole('button', { name: /new discussion/i }).click();
  
  // Fill form with typed data
  if (data.title) await page.getByLabel('Title').fill(data.title);
  if (data.content) await page.getByLabel('Content').fill(data.content);
  if (data.game) await page.getByLabel('Game').selectOption(data.game);
  if (data.challenge_type) await page.getByLabel('Challenge Type').selectOption(data.challenge_type);
  
  // Add tags
  if (data.tags) {
    for (const tag of data.tags) {
      await page.getByLabel('Tags').fill(tag);
      await page.keyboard.press('Enter');
    }
  }
  
  await page.getByRole('button', { name: /create discussion/i }).click();
  await waitForNetworkIdle(page);
  
  // Get the created discussion ID
  const discussionCard = page.locator('[data-testid="discussion-card"]').first();
  const discussionId = await discussionCard.getAttribute('data-discussion-id');
  
  if (!discussionId) throw new Error('Failed to create discussion');
  return discussionId;
}

// Helper to create a typed comment
export async function createTypedComment(
  page: Page,
  discussionId: string,
  commentData?: Partial<Comment>
): Promise<string> {
  const data = generateComment(parseInt(discussionId), commentData);
  
  // Ensure discussion is expanded
  const discussionCard = page.locator(`[data-discussion-id="${discussionId}"]`);
  const isExpanded = await discussionCard.getAttribute('data-expanded');
  if (isExpanded !== 'true') {
    await discussionCard.click();
    await waitForNetworkIdle(page);
  }
  
  // Fill and submit comment
  if (data.content) {
    await page.getByPlaceholder('What are your thoughts on this discussion?').fill(data.content);
    await page.getByRole('button', { name: /post comment/i }).click();
    await waitForNetworkIdle(page);
  }
  
  // Get created comment ID
  const comment = page.locator('[data-testid="comment"]').last();
  const commentId = await comment.getAttribute('data-comment-id');
  
  if (!commentId) throw new Error('Failed to create comment');
  return commentId;
}

// Helper to test discussion filtering with types
export async function testDiscussionFilters(
  page: Page,
  filters: DiscussionFilterEvent
): Promise<DiscussionWithAuthor[]> {
  await page.goto('/community');
  
  // Apply filters
  if (filters.game) {
    await page.getByLabel('Filter by game').selectOption(filters.game);
  }
  
  if (filters.challengeType) {
    await page.getByLabel('Filter by challenge type').selectOption(filters.challengeType);
  }
  
  if (filters.searchTerm) {
    await page.getByPlaceholder('Search discussions...').fill(filters.searchTerm);
    await page.waitForTimeout(500); // Debounce
  }
  
  if (filters.tags && filters.tags.length > 0) {
    for (const tag of filters.tags) {
      await page.getByRole('button', { name: new RegExp(`#${tag}`, 'i') }).click();
    }
  }
  
  if (filters.sortBy) {
    await page.getByLabel('Sort by').selectOption(filters.sortBy);
  }
  
  await waitForNetworkIdle(page);
  
  // Extract filtered results
  const discussions = await page.locator('[data-testid="discussion-card"]').all();
  const results: DiscussionWithAuthor[] = [];
  
  for (const discussion of discussions) {
    const title = await discussion.locator('[data-testid="discussion-title"]').textContent();
    const game = await discussion.locator('[data-testid="discussion-game"]').textContent();
    const author = await discussion.locator('[data-testid="discussion-author"]').textContent();
    
    results.push({
      id: parseInt(await discussion.getAttribute('data-discussion-id') || '0'),
      title: title || '',
      content: '',
      game: game || '',
      author_id: '',
      author: {
        id: '',
        username: author || '',
      },
    } as DiscussionWithAuthor);
  }
  
  return results;
}

// Helper to test user interactions with proper typing
export async function performCommentInteraction(
  page: Page,
  event: CommentInteractionEvent
): Promise<void> {
  const comment = page.locator(`[data-comment-id="${event.commentId}"]`);
  
  switch (event.type) {
    case 'upvote':
      await comment.getByRole('button', { name: /upvote/i }).click();
      break;
    case 'downvote':
      await comment.getByRole('button', { name: /downvote/i }).click();
      break;
    case 'report':
      await comment.getByRole('button', { name: /more options/i }).click();
      await page.getByRole('menuitem', { name: /report/i }).click();
      break;
    case 'reply':
      await comment.getByRole('button', { name: /reply/i }).click();
      break;
  }
  
  await waitForNetworkIdle(page);
}

// Test moderation functionality with proper types
export async function testModerationAction(
  page: Page,
  content: string,
  expectedAction: 'auto_flag' | 'auto_remove' | 'require_review' | 'approve'
): Promise<void> {
  // Create content
  const discussionId = await createTypedDiscussion(page, {
    title: 'Moderation Test',
    content: content,
  });
  
  // Check moderation status
  const discussionCard = page.locator(`[data-discussion-id="${discussionId}"]`);
  
  switch (expectedAction) {
    case 'auto_flag':
      await expect(discussionCard).toHaveAttribute('data-flagged', 'true');
      break;
    case 'auto_remove':
      await expect(discussionCard).not.toBeVisible();
      break;
    case 'require_review':
      await expect(discussionCard).toHaveAttribute('data-pending-review', 'true');
      break;
    case 'approve':
      await expect(discussionCard).toBeVisible();
      await expect(discussionCard).not.toHaveAttribute('data-flagged');
      break;
  }
}

// Helper to test rate limiting
export interface RateLimitConfig {
  endpoint: string;
  limit: number;
  window: number; // seconds
  identifier: 'ip' | 'user' | 'session';
}

export async function testRateLimit(
  page: Page,
  config: RateLimitConfig,
  action: () => Promise<void>
): Promise<{ successful: number; blocked: number }> {
  const results: { success: boolean; timestamp: number }[] = [];
  
  // Perform actions up to limit + buffer
  for (let i = 0; i < config.limit + 5; i++) {
    const start = Date.now();
    let success = true;
    
    try {
      await action();
    } catch (error) {
      success = false;
      // Check if it's a rate limit error
      const errorMessage = await page.locator('[role="alert"]').textContent();
      if (!errorMessage?.includes('rate limit')) {
        throw error; // Re-throw if not rate limit
      }
    }
    
    results.push({ success, timestamp: start });
    
    // Small delay between requests
    await page.waitForTimeout(100);
  }
  
  const successful = results.filter(r => r.success).length;
  const blocked = results.filter(r => !r.success).length;
  
  return { successful, blocked };
}

// Setup real-time listener for testing
export async function setupRealtimeListener(
  page: Page,
  channel: string
): Promise<(eventType: string) => Promise<any[]>> {
  // Inject realtime listener into page context
  await page.evaluate((ch) => {
    (window as any).__realtimeEvents = [];
    
    // Mock Supabase realtime subscription
    const mockChannel = {
      on: (event: string, callback: Function) => {
        (window as any).__realtimeCallback = callback;
        return mockChannel;
      },
      subscribe: () => {
        console.log(`Subscribed to channel: ${ch}`);
        return mockChannel;
      },
    };
    
    // Store the mock for testing
    (window as any).__mockChannel = mockChannel;
  }, channel);
  
  // Return function to get events by type
  return async (eventType: string) => {
    return page.evaluate((type) => {
      return ((window as any).__realtimeEvents || []).filter((e: any) => e.type === type);
    }, eventType);
  };
}

// Trigger a mock real-time event
export async function triggerRealtimeEvent(
  page: Page,
  eventType: string,
  payload: any
): Promise<void> {
  await page.evaluate((args) => {
    const callback = (window as any).__realtimeCallback;
    if (callback) {
      const event = {
        type: args.eventType,
        ...args.payload,
      };
      (window as any).__realtimeEvents.push(event);
      callback(event);
    }
  }, { eventType, payload });
}

// Test accessibility for discussions
export async function testDiscussionAccessibility(page: Page): Promise<{
  passed: boolean;
  violations: string[];
}> {
  const violations: string[] = [];
  
  // Check discussion cards
  const discussions = await page.locator('[data-testid="discussion-card"]').all();
  
  for (const discussion of discussions) {
    // Check ARIA attributes
    const role = await discussion.getAttribute('role');
    if (role !== 'article') {
      violations.push('Discussion card missing role="article"');
    }
    
    const ariaLabel = await discussion.getAttribute('aria-label');
    if (!ariaLabel) {
      violations.push('Discussion card missing aria-label');
    }
    
    // Check interactive elements
    const buttons = await discussion.locator('button').all();
    for (const button of buttons) {
      const buttonText = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      if (!buttonText?.trim() && !ariaLabel) {
        violations.push('Button missing accessible text');
      }
    }
  }
  
  // Check comment thread structure
  const comments = await page.locator('[data-testid="comment"]').all();
  for (const comment of comments) {
    const role = await comment.getAttribute('role');
    if (role !== 'article') {
      violations.push('Comment missing role="article"');
    }
    
    const level = await comment.getAttribute('aria-level');
    if (!level) {
      violations.push('Nested comment missing aria-level');
    }
  }
  
  return {
    passed: violations.length === 0,
    violations,
  };
}

// Test pagination functionality
export async function testPagination(
  page: Page,
  expectedTotalItems: number,
  itemsPerPage: number = 20
): Promise<void> {
  const loadedItems = new Set<string>();
  let hasMore = true;
  let currentPage = 1;
  
  while (hasMore) {
    // Get current page items
    const items = await page.locator('[data-testid="discussion-card"]').all();
    
    for (const item of items) {
      const itemId = await item.getAttribute('data-discussion-id');
      if (itemId) loadedItems.add(itemId);
    }
    
    // Check if "Load More" button exists
    const loadMoreButton = page.getByRole('button', { name: /load more/i });
    hasMore = await loadMoreButton.isVisible();
    
    if (hasMore) {
      await loadMoreButton.click();
      await waitForNetworkIdle(page);
      currentPage++;
    }
    
    // Prevent infinite loops
    if (currentPage > Math.ceil(expectedTotalItems / itemsPerPage) + 1) {
      throw new Error('Pagination exceeded expected pages');
    }
  }
  
  // Verify all items loaded
  expect(loadedItems.size).toBeGreaterThanOrEqual(Math.min(expectedTotalItems, 100)); // Cap at 100 for testing
}