import { beforeEach, afterEach } from '@jest/globals';
import {
  resetAllMocks,
  mockSupabase,
  mockRateLimiter,
  mockCache,
} from './mocks';
import { resetFactoryCounters } from './factories';

// Global test setup for Community feature tests
beforeEach(() => {
  // Reset all mocks to clean state
  resetAllMocks();

  // Reset factory counters for deterministic IDs
  resetFactoryCounters();

  // Clear localStorage
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
    window.sessionStorage.clear();
  }

  // Reset timers if they exist
  try {
    jest.clearAllTimers();
  } catch {
    // Ignore if timers are not fake
  }

  // Setup console spy to suppress logs during tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // Clean up any side effects
  jest.restoreAllMocks();

  // Clear any remaining timers if they exist
  try {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  } catch {
    // Ignore if timers are not fake
  }
});

// Global test utilities - Jest custom matchers
interface CustomMatchers<R = unknown> {
  toBeValidDiscussion(): R;
  toBeValidComment(): R;
  toHaveSpamScore(expected: number): R;
  toBeWithinRateLimit(): R;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface
    interface Matchers<R> extends CustomMatchers<R> {}
  }
}

// Custom matchers
expect.extend({
  toBeValidDiscussion(received) {
    const required = ['id', 'title', 'content', 'author_id', 'game'];
    const missing = required.filter(field => !(field in received));

    if (missing.length > 0) {
      return {
        message: () =>
          `Expected discussion to have required fields: ${missing.join(', ')}`,
        pass: false,
      };
    }

    if (typeof received.title !== 'string' || received.title.length === 0) {
      return {
        message: () => 'Expected discussion to have a valid title',
        pass: false,
      };
    }

    if (typeof received.content !== 'string' || received.content.length === 0) {
      return {
        message: () => 'Expected discussion to have valid content',
        pass: false,
      };
    }

    return {
      message: () => 'Discussion is valid',
      pass: true,
    };
  },

  toBeValidComment(received) {
    const required = ['id', 'content', 'author_id', 'discussion_id'];
    const missing = required.filter(field => !(field in received));

    if (missing.length > 0) {
      return {
        message: () =>
          `Expected comment to have required fields: ${missing.join(', ')}`,
        pass: false,
      };
    }

    if (typeof received.content !== 'string' || received.content.length === 0) {
      return {
        message: () => 'Expected comment to have valid content',
        pass: false,
      };
    }

    return {
      message: () => 'Comment is valid',
      pass: true,
    };
  },

  toHaveSpamScore(received, expected: number) {
    if (typeof received !== 'object' || !('score' in received)) {
      return {
        message: () => 'Expected object with spam score',
        pass: false,
      };
    }

    const tolerance = 0.1;
    const pass = Math.abs(received.score - expected) <= tolerance;

    return {
      message: () =>
        `Expected spam score ${received.score} to be close to ${expected}`,
      pass,
    };
  },

  toBeWithinRateLimit(received) {
    if (typeof received !== 'object' || !('allowed' in received)) {
      return {
        message: () => 'Expected rate limit result object',
        pass: false,
      };
    }

    return {
      message: () =>
        received.allowed
          ? 'Request is within rate limit'
          : `Rate limit exceeded. ${received.reason || ''}`,
      pass: received.allowed,
    };
  },
});

// Test environment configuration
export const testConfig = {
  // Database
  database: {
    url: 'memory://test',
    logging: false,
  },

  // Rate limiting
  rateLimit: {
    windowMs: 1000, // 1 second for tests
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // Notifications
  notifications: {
    channels: ['in_app'], // Only in-app for tests
    batchSize: 10,
    retryAttempts: 1,
  },

  // Search
  search: {
    indexName: 'test_index',
    maxResults: 100,
  },

  // Moderation
  moderation: {
    autoFlag: true,
    autoRemove: false, // Don't auto-remove in tests
    reviewRequired: false,
  },

  // Cache
  cache: {
    ttl: 1000, // 1 second for tests
    prefix: 'test:',
  },
};

// Helper functions for tests
export const waitFor = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const mockDate = (date: string | Date) => {
  const mockDate = new Date(date);
  jest.setSystemTime(mockDate);
  return mockDate;
};

export const expectToThrowAsync = async (
  fn: () => Promise<unknown>,
  errorMessage?: string
) => {
  try {
    await fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    if (
      errorMessage &&
      error instanceof Error &&
      !error.message.includes(errorMessage)
    ) {
      throw new Error(
        `Expected error message to contain "${errorMessage}", got: ${error.message}`
      );
    }
    return error;
  }
};

export const createTestTable = (name: string, data: unknown[]) => {
  const table = new Map();
  data.forEach((item, index) => {
    const record = item as Record<string, unknown>;
    table.set(record.id || index, item);
  });
  return table;
};

// Mock services setup
export const setupMockServices = () => {
  // All mocks are already configured with default values in the mocks module
  return {
    mockSupabase,
    mockRateLimiter,
    mockCache,
  };
};

// Test data builders
export const buildTestData = {
  discussion: (overrides = {}) => ({
    id: 1,
    title: 'Test Discussion',
    content: 'Test content',
    author_id: 'user-1',
    game: 'Pokemon',
    challenge_type: 'Bingo',
    tags: ['test'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    upvotes: 0,
    downvotes: 0,
    comment_count: 0,
    is_pinned: false,
    is_locked: false,
    ...overrides,
  }),

  comment: (overrides = {}) => ({
    id: 1,
    content: 'Test comment',
    author_id: 'user-1',
    discussion_id: 1,
    parent_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    upvotes: 0,
    downvotes: 0,
    is_deleted: false,
    ...overrides,
  }),

  user: (overrides = {}) => ({
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    reputation: 100,
    violations: 0,
    is_banned: false,
    banned_until: null,
    role: 'user',
    ...overrides,
  }),
};
