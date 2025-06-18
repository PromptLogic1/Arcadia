import type { Tables, TablesInsert, TablesUpdate } from '../../../types/database.types';
import { z } from 'zod';

// Type aliases for better readability and consistency
export type Discussion = Tables<'discussions'>;
export type Comment = Tables<'comments'>;
export type DiscussionInsert = TablesInsert<'discussions'>;
export type DiscussionUpdate = TablesUpdate<'discussions'>;
export type CommentInsert = TablesInsert<'comments'>;
export type CommentUpdate = TablesUpdate<'comments'>;

// Extended types with relations for testing
export interface DiscussionWithAuthor extends Discussion {
  author?: {
    id: string;
    username: string;
    avatar_url?: string | null;
  };
  comment_count?: number;
  comments?: CommentWithAuthor[];
}

export interface CommentWithAuthor extends Comment {
  author?: {
    id: string;
    username: string;
    avatar_url?: string | null;
  };
  replies?: CommentWithAuthor[];
  parent_id?: number | null;
  depth?: number;
}

// Real-time event types with proper validation
export interface RealTimeEvent<T = unknown> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  schema: 'public';
  table: 'discussions' | 'comments';
  new?: T;
  old?: T;
  commit_timestamp: string;
}

export interface WebSocketMessage<T = unknown> {
  topic: string;
  event: string;
  payload: T;
  ref?: string;
}

// Zod schemas for validation testing
export const DiscussionCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  content: z.string().min(1, 'Content is required').max(5000, 'Content must be less than 5000 characters'),
  game: z.string().min(1, 'Please select a specific game'),
  challenge_type: z.string().optional(),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed').optional(),
});

export const CommentCreateSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be less than 2000 characters')
    .refine(val => val.trim().length > 0, 'Comment cannot be empty'),
  discussion_id: z.number().positive('Invalid discussion ID'),
  parent_id: z.number().positive().optional(),
});

export const ReportSchema = z.object({
  reason: z.enum(['spam', 'harassment', 'hate-speech', 'misinformation', 'copyright', 'off-topic', 'other']),
  details: z.string().optional(),
}).refine(data => {
  if (data.reason === 'other' && (!data.details || data.details.length < 10)) {
    return false;
  }
  return true;
}, {
  message: 'Please provide additional details for other reports',
  path: ['details'],
});

// User scenarios with enhanced typing
export interface UserScenario {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'moderator' | 'admin';
  reputation: number;
  joinedDaysAgo: number;
  permissions: string[];
  rateLimit: {
    comments: number;
    discussions: number;
    upvotes: number;
  };
  authToken?: string;
}

export const USER_TEST_SCENARIOS: Record<string, UserScenario> = {
  newUser: {
    id: 'test-new-user',
    username: 'new_user_test',
    email: 'newuser@test.com',
    role: 'user',
    reputation: 0,
    joinedDaysAgo: 1,
    permissions: ['read', 'comment'],
    rateLimit: { comments: 5, discussions: 1, upvotes: 20 },
  },
  regularUser: {
    id: 'test-regular-user',
    username: 'regular_user_test',
    email: 'regular@test.com',
    role: 'user',
    reputation: 100,
    joinedDaysAgo: 30,
    permissions: ['read', 'comment', 'create_discussion', 'upvote'],
    rateLimit: { comments: 20, discussions: 5, upvotes: 100 },
  },
  trustedUser: {
    id: 'test-trusted-user',
    username: 'trusted_user_test',
    email: 'trusted@test.com',
    role: 'user',
    reputation: 500,
    joinedDaysAgo: 180,
    permissions: ['read', 'comment', 'create_discussion', 'upvote', 'edit_own', 'delete_own'],
    rateLimit: { comments: 50, discussions: 10, upvotes: 200 },
  },
  moderator: {
    id: 'test-moderator',
    username: 'moderator_test',
    email: 'moderator@test.com',
    role: 'moderator',
    reputation: 1000,
    joinedDaysAgo: 365,
    permissions: ['read', 'comment', 'create_discussion', 'upvote', 'edit_any', 'delete_any', 'moderate'],
    rateLimit: { comments: 100, discussions: 20, upvotes: 500 },
  },
  spammer: {
    id: 'test-spammer',
    username: 'spammer_test',
    email: 'spammer@test.com',
    role: 'user',
    reputation: -50,
    joinedDaysAgo: 0,
    permissions: ['read'],
    rateLimit: { comments: 0, discussions: 0, upvotes: 0 },
  },
} as const;

// Moderation content patterns with confidence scoring
export interface ModerationPattern {
  content: string;
  expectedAction: 'auto_flag' | 'auto_remove' | 'require_review' | 'approve';
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

export const MODERATION_PATTERNS: Record<string, ModerationPattern[]> = {
  spam: [
    {
      content: 'BUY CHEAP GOLD NOW!!! BEST PRICES!!! Visit spam-site.com',
      expectedAction: 'auto_flag',
      confidence: 'high',
      reasons: ['excessive_caps', 'multiple_exclamation', 'external_link', 'commercial_language'],
    },
    {
      content: 'FREE MONEY!!! Click here: bit.ly/free-coins',
      expectedAction: 'auto_remove',
      confidence: 'high',
      reasons: ['scam_keywords', 'shortened_url', 'excessive_caps'],
    },
    {
      content: 'Amazing deals on game currency! Contact me for details.',
      expectedAction: 'require_review',
      confidence: 'medium',
      reasons: ['commercial_language', 'contact_request'],
    },
  ],
  inappropriate: [
    {
      content: 'This game is [EXPLICIT CONTENT] and the developers are [OFFENSIVE LANGUAGE]',
      expectedAction: 'auto_remove',
      confidence: 'high',
      reasons: ['profanity', 'inappropriate_content'],
    },
    {
      content: 'I hate [GROUP] people, they ruin everything',
      expectedAction: 'auto_flag',
      confidence: 'high',
      reasons: ['hate_speech', 'targeting_groups'],
    },
  ],
  safe: [
    {
      content: 'Great strategy guide! This helped me complete the challenge.',
      expectedAction: 'approve',
      confidence: 'high',
      reasons: ['positive_feedback', 'gaming_related'],
    },
    {
      content: 'I love this game. The speedrun community is awesome!',
      expectedAction: 'approve',
      confidence: 'high',
      reasons: ['positive_sentiment', 'community_focused'],
    },
  ],
};

// Rate limiting configuration
export interface RateLimitConfig {
  action: 'create_comment' | 'create_discussion' | 'upvote' | 'report';
  userType: keyof typeof USER_TEST_SCENARIOS;
  expectedLimit: number;
  windowMs: number;
  algorithm: 'sliding_window' | 'fixed_window' | 'token_bucket';
}

export const RATE_LIMIT_TESTS: RateLimitConfig[] = [
  {
    action: 'create_comment',
    userType: 'newUser',
    expectedLimit: 5,
    windowMs: 3600000, // 1 hour
    algorithm: 'sliding_window',
  },
  {
    action: 'create_comment',
    userType: 'regularUser',
    expectedLimit: 20,
    windowMs: 3600000,
    algorithm: 'sliding_window',
  },
  {
    action: 'create_discussion',
    userType: 'newUser',
    expectedLimit: 1,
    windowMs: 86400000, // 24 hours
    algorithm: 'fixed_window',
  },
  {
    action: 'upvote',
    userType: 'regularUser',
    expectedLimit: 100,
    windowMs: 3600000,
    algorithm: 'token_bucket',
  },
];

// Search and filter types
export interface SearchFilters {
  game?: string | null;
  challengeType?: string | null;
  tags?: string[];
  searchTerm?: string;
  sortBy?: 'newest' | 'oldest' | 'most_upvoted' | 'most_comments';
  authorId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface SearchResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  filters: SearchFilters;
}

// Performance metrics for testing
export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  networkRequests: number;
  bundleSize?: number;
}

export interface AccessibilityResult {
  passed: boolean;
  violations: AccessibilityViolation[];
  score: number;
}

export interface AccessibilityViolation {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  element: string;
  description: string;
  help: string;
}

// Test data generation interfaces
export interface TestDataOptions {
  count?: number;
  includeAuthor?: boolean;
  includeComments?: boolean;
  scenario?: keyof typeof USER_TEST_SCENARIOS;
  contentType?: keyof typeof MODERATION_PATTERNS;
}

// WebSocket testing types
export interface WebSocketTestConfig {
  channel: string;
  events: string[];
  timeout: number;
  expectedMessageCount: number;
}

// Database state interfaces for testing
export interface TestDatabaseState {
  discussions: DiscussionWithAuthor[];
  comments: CommentWithAuthor[];
  users: UserScenario[];
  reports: unknown[];
}

// Error types for testing
export interface TestError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning';
}

// Test result types
export interface TestResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: TestError;
  metadata?: {
    duration: number;
    retries: number;
    timestamp: string;
  };
}

// Concurrent operation testing
export interface ConcurrentTestOperation {
  id: string;
  operation: () => Promise<unknown>;
  expectedResult: 'success' | 'failure' | 'race_condition';
  delay?: number;
}

export interface ConcurrentTestResult {
  operations: Array<{
    id: string;
    result: 'success' | 'failure' | 'timeout';
    data?: unknown;
    error?: string;
    duration: number;
  }>;
  raceConditionsDetected: number;
  totalTime: number;
}

// Export utility type guards
export const isDiscussion = (obj: unknown): obj is Discussion => {
  const d = obj as Record<string, unknown>;
  return d && typeof d.id === 'number' && typeof d.title === 'string';
};

export const isComment = (obj: unknown): obj is Comment => {
  const c = obj as Record<string, unknown>;
  return c && typeof c.id === 'number' && typeof c.content === 'string';
};

export const isRealTimeEvent = (obj: unknown): obj is RealTimeEvent => {
  const e = obj as Record<string, unknown>;
  return e && ['INSERT', 'UPDATE', 'DELETE'].includes(e.eventType as string);
};