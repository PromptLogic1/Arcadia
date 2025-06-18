/**
 * Community Test Configuration
 * 
 * Central configuration for community feature tests
 * with type safety and reusable patterns
 */

import type { Tables } from '../../../types/database.types';

// Test environment configuration
export const TEST_CONFIG = {
  // Timeouts
  timeouts: {
    animation: 300,
    debounce: 500,
    network: 5000,
    realtime: 10000,
  },
  
  // Pagination
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
    testDataCount: 150,
  },
  
  // Rate limiting
  rateLimits: {
    testing: {
      window: 60, // seconds
      bufferRequests: 5, // extra requests to verify blocking
    },
  },
  
  // Real-time testing
  realtime: {
    channels: {
      discussions: 'public:discussions',
      comments: 'public:comments',
      moderation: 'private:moderation',
    },
    eventTypes: ['INSERT', 'UPDATE', 'DELETE'],
  },
  
  // Mock API endpoints
  endpoints: {
    discussions: '/api/discussions',
    comments: '/api/comments',
    users: '/api/users',
    moderation: '/api/moderation',
    search: '/api/search',
  },
} as const;

// Type guards for database tables
export function isValidDiscussion(data: unknown): data is Tables<'discussions'> {
  if (typeof data !== 'object' || data === null) return false;
  
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.title === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.game === 'string'
  );
}

export function isValidComment(data: unknown): data is Tables<'comments'> {
  if (typeof data !== 'object' || data === null) return false;
  
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.content === 'string' &&
    typeof obj.discussion_id === 'number'
  );
}

// Test data validation schemas (using Zod patterns)
export const testDataSchemas = {
  discussion: {
    title: { min: 5, max: 200 },
    content: { min: 10, max: 5000 },
    tags: { min: 0, max: 5 },
  },
  comment: {
    content: { min: 1, max: 2000 },
    maxNestingLevel: 5,
  },
  user: {
    username: { min: 3, max: 20, pattern: /^[a-zA-Z0-9_]+$/ },
    email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  },
};

// Performance benchmarks
export const PERFORMANCE_BENCHMARKS = {
  discussions: {
    load: 2000, // ms
    create: 1000,
    update: 800,
    delete: 500,
  },
  comments: {
    load: 1500,
    create: 500,
    update: 400,
    delete: 300,
    realtimeUpdate: 100,
  },
  search: {
    instant: 100,
    debounced: 600,
    fullText: 2000,
  },
};

// Accessibility requirements
export const A11Y_REQUIREMENTS = {
  // WCAG 2.1 Level AA compliance
  contrastRatio: {
    normal: 4.5,
    large: 3,
  },
  focusIndicator: {
    minWidth: 2,
    style: 'solid',
  },
  interactiveElements: {
    minSize: 44, // pixels
    minSpacing: 8,
  },
  announcements: {
    liveRegions: ['polite', 'assertive'],
    srOnly: true,
  },
};

// Error messages for validation
export const VALIDATION_ERRORS = {
  discussion: {
    titleRequired: 'Title is required',
    titleTooShort: 'Title must be at least 5 characters',
    titleTooLong: 'Title must be less than 200 characters',
    contentRequired: 'Content is required',
    contentTooShort: 'Content must be at least 10 characters',
    contentTooLong: 'Content must be less than 5000 characters',
    gameRequired: 'Please select a specific game',
    invalidTags: 'Invalid tag format',
  },
  comment: {
    contentRequired: 'Comment cannot be empty',
    contentTooLong: 'Comment must be less than 2000 characters',
    nestingTooDeep: 'Maximum nesting level reached',
    parentNotFound: 'Parent comment not found',
  },
  moderation: {
    spamDetected: 'Your content has been flagged as spam',
    inappropriateContent: 'Content violates community guidelines',
    rateLimitExceeded: 'Too many requests. Please try again later',
    permissionDenied: 'You do not have permission to perform this action',
  },
} as const;

// Test user fixtures with full type safety
export interface TestUser {
  id: string;
  email: string;
  username: string;
  password: string;
  reputation: number;
  role: 'user' | 'moderator' | 'admin';
  created_at: string;
}

export const TEST_USERS: Record<string, TestUser> = {
  newUser: {
    id: 'test-new-user',
    email: 'newuser@test.com',
    username: 'newuser123',
    password: 'Test123!@#',
    reputation: 0,
    role: 'user',
    created_at: new Date().toISOString(),
  },
  regularUser: {
    id: 'test-regular-user',
    email: 'regular@test.com',
    username: 'regularuser',
    password: 'Test123!@#',
    reputation: 100,
    role: 'user',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  trustedUser: {
    id: 'test-trusted-user',
    email: 'trusted@test.com',
    username: 'trusteduser',
    password: 'Test123!@#',
    reputation: 500,
    role: 'user',
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  moderator: {
    id: 'test-moderator',
    email: 'mod@test.com',
    username: 'moderator',
    password: 'Test123!@#',
    reputation: 1000,
    role: 'moderator',
    created_at: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

// Helper to get test user by type
export function getTestUser(userType: keyof typeof TEST_USERS): TestUser {
  const user = TEST_USERS[userType];
  if (!user) {
    throw new Error(`Test user type '${userType}' not found`);
  }
  return user;
}

// Mock data generators configuration
export const MOCK_DATA_CONFIG = {
  seed: 12345, // For consistent random data
  locale: 'en_US',
  imageProviders: ['picsum', 'placeholder'],
  dateRange: {
    past: 365, // days
    future: 30, // days
  },
};

// Test cleanup utilities
export const CLEANUP_CONFIG = {
  // Patterns for test data that should be cleaned up
  testDataPatterns: {
    discussions: /^Test Discussion/,
    comments: /^Test Comment/,
    users: /^test[-_]/,
  },
  
  // Cleanup strategies
  strategies: {
    immediate: 'delete',
    delayed: 'flag_for_deletion',
    archive: 'move_to_archive',
  },
  
  // Retention periods (in seconds)
  retention: {
    discussions: 3600, // 1 hour
    comments: 1800, // 30 minutes
    reports: 86400, // 24 hours
  },
};

// Export a function to validate test environment
export async function validateTestEnvironment(): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  // Check required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }
  
  // Additional validation can be added here
  
  return {
    valid: errors.length === 0,
    errors,
  };
}