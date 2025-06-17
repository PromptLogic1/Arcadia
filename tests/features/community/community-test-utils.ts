import { Page, expect } from '@playwright/test';
import type {
  Discussion,
  Comment,
  DiscussionWithAuthor,
  CommentWithAuthor,
  DiscussionInsert,
  CommentInsert,
  UserScenario,
  ModerationPattern,
  RateLimitConfig,
  SearchFilters,
  PerformanceMetrics,
  AccessibilityResult,
  TestResult,
  ConcurrentTestOperation,
  ConcurrentTestResult,
  TestDataOptions,
} from './types';
import {
  USER_TEST_SCENARIOS,
  MODERATION_PATTERNS,
  DiscussionCreateSchema,
  CommentCreateSchema,
  isDiscussion,
  isComment,
} from './types';
import { waitForNetworkIdle } from '../../helpers/test-utils';

// Type-safe discussion creation with full validation
export async function createTypedDiscussion(
  page: Page,
  discussionData: Partial<DiscussionInsert>,
  options: { validate?: boolean; user?: UserScenario } = {}
): Promise<string> {
  const { validate = true, user } = options;
  
  // Validate data if requested
  if (validate) {
    const result = DiscussionCreateSchema.safeParse(discussionData);
    if (!result.success) {
      throw new Error(`Invalid discussion data: ${result.error.message}`);
    }
  }

  // Switch user context if provided
  if (user) {
    await loginAsUser(page, user);
  }

  await page.goto('/community');
  await waitForNetworkIdle(page);
  
  // Click create discussion button
  await page.getByRole('button', { name: /new discussion/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Fill form with type-safe data
  if (discussionData.title) {
    await page.getByLabel('Title').fill(discussionData.title);
  }
  
  if (discussionData.content) {
    await page.getByLabel('Content').fill(discussionData.content);
  }
  
  if (discussionData.game) {
    await page.getByLabel('Game').selectOption(discussionData.game);
  }
  
  if (discussionData.challenge_type) {
    await page.getByLabel('Challenge Type').selectOption(discussionData.challenge_type);
  }

  // Add tags with proper validation
  if (discussionData.tags && Array.isArray(discussionData.tags)) {
    for (const tag of discussionData.tags.slice(0, 5)) { // Limit to 5 tags
      await page.getByLabel('Tags').fill(tag);
      await page.keyboard.press('Enter');
      await expect(page.getByText(tag)).toBeVisible();
    }
  }

  // Submit form
  await page.getByRole('button', { name: /create discussion/i }).click();
  await waitForNetworkIdle(page);

  // Extract and validate discussion ID
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const discussionCard = page.locator('[data-testid="discussion-card"]').first();
  await expect(discussionCard).toBeVisible();
  
  const discussionId = await discussionCard.getAttribute('data-discussion-id');
  if (!discussionId) {
    throw new Error('Failed to create discussion - no ID found');
  }

  // Validate created discussion content
  if (discussionData.title) {
    await expect(discussionCard).toContainText(discussionData.title);
  }
  if (discussionData.game) {
    await expect(discussionCard).toContainText(discussionData.game);
  }

  return discussionId;
}

// Type-safe comment creation with validation
export async function createTypedComment(
  page: Page,
  discussionId: string,
  commentData: Partial<CommentInsert>,
  options: { validate?: boolean; user?: UserScenario; parentId?: string } = {}
): Promise<string> {
  const { validate = true, user, parentId } = options;

  // Validate data if requested
  if (validate) {
    const result = CommentCreateSchema.safeParse({
      ...commentData,
      discussion_id: parseInt(discussionId),
    });
    if (!result.success) {
      throw new Error(`Invalid comment data: ${result.error.message}`);
    }
  }

  // Switch user context if provided
  if (user) {
    await loginAsUser(page, user);
  }

  // Navigate to discussion and ensure it's expanded
  await page.goto(`/community/discussions/${discussionId}`);
  await waitForNetworkIdle(page);

  // Handle parent comment replies
  if (parentId) {
    const parentComment = page.locator(`[data-comment-id="${parentId}"]`);
    await parentComment.getByRole('button', { name: /reply/i }).click();
    await expect(page.getByPlaceholder('Write a reply...')).toBeVisible();
    
    if (commentData.content) {
      await page.getByPlaceholder('Write a reply...').fill(commentData.content);
    }
    
    await page.getByRole('button', { name: /post reply/i }).click();
  } else {
    // Regular comment
    const discussionCard = page.locator(`[data-discussion-id="${discussionId}"]`);
    const isExpanded = await discussionCard.getAttribute('data-expanded');
    
    if (isExpanded !== 'true') {
      await discussionCard.click();
      await waitForNetworkIdle(page);
    }

    if (commentData.content) {
      await page.getByPlaceholder('What are your thoughts on this discussion?').fill(commentData.content);
    }
    
    await page.getByRole('button', { name: /post comment/i }).click();
  }

  await waitForNetworkIdle(page);

  // Extract comment ID from the newly created comment
  const commentSelector = parentId ? '[data-testid="comment-reply"]' : '[data-testid="comment"]';
  const commentElement = page.locator(commentSelector).last();
  await expect(commentElement).toBeVisible();
  
  const commentId = await commentElement.getAttribute('data-comment-id');
  if (!commentId) {
    throw new Error('Failed to create comment - no ID found');
  }

  // Validate created comment content
  if (commentData.content) {
    await expect(commentElement).toContainText(commentData.content);
  }

  return commentId;
}

// Mock data generation utilities (local implementation)
const mockData = {
  helpers: {
    arrayElement: <T>(array: readonly T[]): T => array[Math.floor(Math.random() * array.length)],
    arrayElements: <T>(array: readonly T[], options?: { min: number; max: number }): T[] => {
      const min = options?.min ?? 1;
      const max = options?.max ?? array.length;
      const count = Math.floor(Math.random() * (max - min + 1)) + min;
      const shuffled = [...array].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    },
  },
  lorem: {
    paragraphs: (options?: { min: number; max: number }) => {
      const sentences = [
        'This is a great strategy for completing the challenge.',
        'I found this technique really helpful during my speedrun.',
        'The community here is amazing and very supportive.',
        'Thanks for sharing this detailed guide with everyone.',
        'I never thought about approaching it this way before.',
      ];
      const count = options ? Math.floor(Math.random() * (options.max - options.min + 1)) + options.min : 2;
      return Array.from({ length: count }, () => sentences[Math.floor(Math.random() * sentences.length)]).join(' ');
    },
    sentence: (options?: { min: number; max: number }) => {
      const sentences = [
        'This is a comprehensive strategy guide for beginners.',
        'I found this technique really helpful during my recent runs.',
        'The community feedback has been incredibly valuable.',
        'Thanks for sharing this detailed walkthrough with everyone.',
        'This approach definitely improves completion times.',
      ];
      return sentences[Math.floor(Math.random() * sentences.length)];
    },
  },
};

// Generate realistic test data with type safety
export function generateDiscussionData(options: TestDataOptions = {}): DiscussionInsert {
  const { scenario = 'regularUser', contentType = 'safe' } = options;
  const userScenario = USER_TEST_SCENARIOS[scenario];
  
  const games = ['Pokemon', 'Sonic', 'Mario', 'Zelda', 'Metroid', 'Kirby'];
  const challengeTypes = ['Bingo', 'Speedrun', 'Achievement Hunt', 'Puzzle', 'Co-op'];
  const tags = ['strategy', 'help', 'tips', 'speedrun', 'glitch', 'guide', 'tournament'];

  let title: string;
  let content: string;

  if (contentType in MODERATION_PATTERNS) {
    const patterns = MODERATION_PATTERNS[contentType];
    const pattern = mockData.helpers.arrayElement(patterns);
    title = `Test Discussion - ${contentType}`;
    content = pattern.content;
  } else {
    title = mockData.helpers.arrayElement([
      `Best strategies for ${mockData.helpers.arrayElement(games)} ${mockData.helpers.arrayElement(challengeTypes)}`,
      `Tips for completing ${mockData.helpers.arrayElement(games)} challenges`,
      `${mockData.helpers.arrayElement(games)} glitch discovered!`,
      `Need help with ${mockData.helpers.arrayElement(challengeTypes)} challenge`,
    ]);
    content = mockData.lorem.paragraphs({ min: 1, max: 3 });
  }

  return {
    title,
    content,
    game: mockData.helpers.arrayElement(games),
    challenge_type: mockData.helpers.arrayElement(challengeTypes),
    tags: mockData.helpers.arrayElements(tags, { min: 1, max: 3 }),
    author_id: userScenario.id,
  };
}

export function generateCommentData(
  discussionId: number,
  options: TestDataOptions = {}
): CommentInsert {
  const { scenario = 'regularUser', contentType = 'safe' } = options;
  const userScenario = USER_TEST_SCENARIOS[scenario];

  let content: string;

  if (contentType in MODERATION_PATTERNS) {
    const patterns = MODERATION_PATTERNS[contentType];
    const pattern = mockData.helpers.arrayElement(patterns);
    content = pattern.content;
  } else {
    const commentTypes = [
      'Great point! I\'ve been using this strategy and it works well.',
      'Have you tried using the warp glitch for this section?',
      'Thanks for sharing! This helped me complete the challenge.',
      mockData.lorem.sentence({ min: 10, max: 20 }),
    ];
    content = mockData.helpers.arrayElement(commentTypes);
  }

  return {
    content,
    discussion_id: discussionId,
    author_id: userScenario.id,
  };
}

// Real-time testing utilities
export async function testRealTimeUpdates(
  page1: Page,
  page2: Page,
  discussionId: string,
  updateType: 'comment' | 'upvote' | 'discussion_update',
  data: any
): Promise<void> {
  // Navigate both pages to the discussion
  await page1.goto(`/community/discussions/${discussionId}`);
  await page2.goto(`/community/discussions/${discussionId}`);
  await Promise.all([
    waitForNetworkIdle(page1),
    waitForNetworkIdle(page2),
  ]);

  switch (updateType) {
    case 'comment':
      // Add comment on page1
      await page1.getByPlaceholder('What are your thoughts on this discussion?').fill(data.content);
      await page1.getByRole('button', { name: /post comment/i }).click();

      // Verify comment appears on page2 in real-time
      await expect(page2.getByText(data.content)).toBeVisible({ timeout: 5000 });
      break;

    case 'upvote':
      // Get initial count on both pages
      const upvoteButton1 = page1.getByRole('button', { name: /upvote/i }).first();
      const upvoteButton2 = page2.getByRole('button', { name: /upvote/i }).first();
      
      const initialText = await upvoteButton1.textContent();
      const initialCount = parseInt(initialText?.match(/\d+/)?.[0] || '0');

      // Upvote on page1
      await upvoteButton1.click();

      // Verify count updates on page2
      await expect(upvoteButton2).toContainText(String(initialCount + 1), { timeout: 5000 });
      break;

    case 'discussion_update':
      // Edit discussion on page1
      await page1.getByRole('button', { name: /edit/i }).click();
      await page1.getByLabel('Content').fill(data.content);
      await page1.getByRole('button', { name: /save changes/i }).click();

      // Verify update appears on page2
      await expect(page2.getByText(data.content)).toBeVisible({ timeout: 5000 });
      await expect(page2.getByText('(edited)')).toBeVisible();
      break;
  }
}

// Rate limiting testing
export async function testRateLimit(
  page: Page,
  config: RateLimitConfig,
  operation: () => Promise<void>
): Promise<{ successful: number; blocked: number; errors: string[] }> {
  const results: { success: boolean; error?: string; timestamp: number }[] = [];
  const user = USER_TEST_SCENARIOS[config.userType];
  
  // Login as the specified user
  await loginAsUser(page, user);

  // Perform operations up to limit + buffer
  for (let i = 0; i < config.expectedLimit + 3; i++) {
    const start = Date.now();
    let success = true;
    let error: string | undefined;

    try {
      await operation();
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      
      // Check if it's a rate limit error
      const errorMessage = await page.locator('[role="alert"]').textContent();
      if (!errorMessage?.includes('rate limit') && !errorMessage?.includes('too quickly')) {
        throw err; // Re-throw if not rate limit
      }
    }

    results.push({ success, error, timestamp: start });

    // Small delay between requests to simulate realistic usage
    await page.waitForTimeout(200);
  }

  const successful = results.filter(r => r.success).length;
  const blocked = results.filter(r => !r.success).length;
  const errors = results.filter(r => r.error).map(r => r.error!);

  return { successful, blocked, errors };
}

// Accessibility testing
export async function testAccessibility(
  page: Page,
  selector?: string
): Promise<AccessibilityResult> {
  // Inject axe-core for accessibility testing
  await page.addScriptTag({
    url: 'https://unpkg.com/axe-core@4.4.3/axe.min.js',
  });

  // Run accessibility audit
  const result = await page.evaluate((sel) => {
    return new Promise((resolve) => {
      (window as any).axe.run(sel ? document.querySelector(sel) : document, (err: any, results: any) => {
        if (err) throw err;
        resolve(results);
      });
    });
  }, selector);

  const axeResults = result as any;
  
  const violations = axeResults.violations.map((violation: any) => ({
    rule: violation.id,
    severity: violation.impact,
    element: violation.nodes[0]?.target[0] || 'unknown',
    description: violation.description,
    help: violation.help,
  }));

  return {
    passed: violations.length === 0,
    violations,
    score: Math.max(0, 100 - violations.length * 10),
  };
}

// Performance testing
export async function measurePerformance(
  page: Page,
  operation: () => Promise<void>
): Promise<PerformanceMetrics> {
  // Clear performance marks
  await page.evaluate(() => performance.clearMarks());
  
  const startTime = Date.now();
  await page.evaluate(() => performance.mark('operation-start'));
  
  await operation();
  
  await page.evaluate(() => performance.mark('operation-end'));
  const endTime = Date.now();

  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const memory = (performance as any).memory;
    
    return {
      loadTime: navigation.loadEventEnd - navigation.loadEventStart,
      renderTime: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      memoryUsage: memory ? memory.usedJSHeapSize : 0,
      networkRequests: performance.getEntriesByType('resource').length,
    };
  });

  return {
    ...metrics,
    loadTime: endTime - startTime,
  };
}

// Concurrent operation testing
export async function testConcurrentOperations(
  page: Page,
  operations: ConcurrentTestOperation[]
): Promise<ConcurrentTestResult> {
  const startTime = Date.now();
  const results: any[] = [];

  const promises = operations.map(async (op, index) => {
    if (op.delay) {
      await page.waitForTimeout(op.delay);
    }

    const opStartTime = Date.now();
    let result: 'success' | 'failure' | 'timeout' = 'success';
    let data: any;
    let error: string | undefined;

    try {
      data = await Promise.race([
        op.operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), 10000)
        ),
      ]);
    } catch (err) {
      if (err instanceof Error && err.message === 'Operation timeout') {
        result = 'timeout';
      } else {
        result = 'failure';
        error = err instanceof Error ? err.message : String(err);
      }
    }

    const duration = Date.now() - opStartTime;

    return {
      id: op.id,
      result,
      data,
      error,
      duration,
      expectedResult: op.expectedResult,
    };
  });

  const operationResults = await Promise.allSettled(promises);
  
  operationResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      results.push({
        id: operations[index].id,
        result: 'failure',
        error: result.reason,
        duration: 0,
      });
    }
  });

  // Detect race conditions
  const raceConditionsDetected = results.filter(r => 
    r.expectedResult === 'race_condition' && r.result === 'failure'
  ).length;

  return {
    operations: results,
    raceConditionsDetected,
    totalTime: Date.now() - startTime,
  };
}

// User management utilities
export async function loginAsUser(page: Page, user: UserScenario): Promise<void> {
  // Mock authentication or use test credentials
  await page.evaluate((userData) => {
    // Store user data in sessionStorage for test authentication
    sessionStorage.setItem('test-user', JSON.stringify(userData));
  }, user);

  // Navigate to trigger auth check
  await page.goto('/');
  await waitForNetworkIdle(page);
}

// Search and filter testing
export async function testSearchAndFilters(
  page: Page,
  filters: SearchFilters
): Promise<DiscussionWithAuthor[]> {
  await page.goto('/community');
  await waitForNetworkIdle(page);

  // Apply search term
  if (filters.searchTerm) {
    await page.getByPlaceholder('Search discussions...').fill(filters.searchTerm);
    await page.waitForTimeout(500); // Debounce
  }

  // Apply game filter
  if (filters.game) {
    await page.getByLabel('Filter by game').selectOption(filters.game);
  }

  // Apply challenge type filter
  if (filters.challengeType) {
    await page.getByLabel('Filter by challenge type').selectOption(filters.challengeType);
  }

  // Apply tag filters
  if (filters.tags && filters.tags.length > 0) {
    for (const tag of filters.tags) {
      await page.getByRole('button', { name: new RegExp(`#${tag}`, 'i') }).click();
    }
  }

  // Apply sorting
  if (filters.sortBy) {
    await page.getByLabel('Sort by').selectOption(filters.sortBy);
  }

  await waitForNetworkIdle(page);

  // Extract results
  const discussions = await page.locator('[data-testid="discussion-card"]').all();
  const results: DiscussionWithAuthor[] = [];

  for (const discussion of discussions) {
    const title = await discussion.locator('[data-testid="discussion-title"]').textContent();
    const game = await discussion.locator('[data-testid="discussion-game"]').textContent();
    const author = await discussion.locator('[data-testid="discussion-author"]').textContent();
    const id = await discussion.getAttribute('data-discussion-id');

    if (title && game && author && id) {
      results.push({
        id: parseInt(id),
        title,
        content: '',
        game,
        author_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        upvotes: 0,
        tags: null,
        challenge_type: null,
        author: {
          id: '',
          username: author,
        },
      });
    }
  }

  return results;
}

// Validation testing utilities
export async function testFormValidation(
  page: Page,
  formSelector: string,
  validationCases: Array<{
    field: string;
    value: string;
    expectedError?: string;
    shouldPass?: boolean;
  }>
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const testCase of validationCases) {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      // Clear and fill the field
      await page.locator(formSelector).locator(`[name="${testCase.field}"]`).fill('');
      await page.locator(formSelector).locator(`[name="${testCase.field}"]`).fill(testCase.value);
      
      // Submit form
      await page.locator(formSelector).getByRole('button', { name: /submit|create|save/i }).click();
      
      if (testCase.expectedError) {
        // Expect validation error
        await expect(page.getByText(testCase.expectedError)).toBeVisible();
        success = !testCase.shouldPass;
      } else if (testCase.shouldPass) {
        // Expect success
        await expect(page.getByText(testCase.expectedError || '')).not.toBeVisible();
        success = true;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    results.push({
      success,
      error: error ? { code: 'validation_test_failed', message: error, severity: 'error' } : undefined,
      metadata: {
        duration: Date.now() - startTime,
        retries: 0,
        timestamp: new Date().toISOString(),
      },
    });
  }

  return results;
}

// Cleanup utilities
export async function cleanupTestData(page: Page, testIds: string[]): Promise<void> {
  // In a real implementation, this would call cleanup APIs
  // For now, we'll just ensure we're in a clean state
  await page.evaluate((ids) => {
    // Clear any test data from local/session storage
    for (const id of ids) {
      localStorage.removeItem(`test-discussion-${id}`);
      localStorage.removeItem(`test-comment-${id}`);
    }
  }, testIds);
}

// Export commonly used test scenarios
export const TEST_SCENARIOS = {
  createBasicDiscussion: (page: Page) => createTypedDiscussion(page, generateDiscussionData()),
  createSpamDiscussion: (page: Page) => createTypedDiscussion(page, generateDiscussionData({ contentType: 'spam' })),
  createCommentThread: async (page: Page, discussionId: string, depth: number = 3) => {
    const comments = [];
    let parentId: string | undefined;
    
    for (let i = 0; i < depth; i++) {
      const commentId = await createTypedComment(
        page,
        discussionId,
        generateCommentData(parseInt(discussionId)),
        { parentId }
      );
      comments.push(commentId);
      parentId = commentId;
    }
    
    return comments;
  },
} as const;