/**
 * Central export file for all test helpers
 * This file provides a convenient way to import all test utilities
 */

// Test utilities
export * from './test-utils';

// Test data and constants
export * from './test-data';

// Achievement testing helpers
export * from './achievement-helpers';

// Community testing helpers
export * from './community-test-helpers';

// Performance testing helpers
export * from './performance-helpers';

// WebSocket testing helpers
export * from './websocket-helpers';

// Re-export commonly used types
export type {
  PerformanceMetrics,
  AccessibilityViolation,
  AccessibilityResult,
  ViewportConfig,
} from './test-utils';

export type {
  AchievementNotification,
  AchievementProgress,
  AchievementUnlockResult,
} from './achievement-helpers';

export type {
  Discussion,
  Comment,
  DiscussionWithAuthor,
  CommentWithAuthor,
  ModerationReport,
  CommunityFilters,
} from './community-test-helpers';

export type { GameWebSocketEvent } from './websocket-helpers';

// Re-export core types from test-types
export type {
  TestWindow,
  ExtendedTestWindow,
  TestUser,
  AuthSession,
  TestAuthState,
  PerformanceMetrics,
  A11yViolation,
  TestUserRole,
  OAuthProvider,
  TestError,
  MockSupabaseClient,
  SupabaseRealtimeChannel,
  SupabaseRealtimeClient,
  MockRealtimeChannel,
  MockWebSocket,
  SentryScope,
  EventCallback,
  RouteHandler,
  RealtimeEvent,
  StatusCallback,
  RouteCallback,
  AnyFunction,
  AsyncFunction,
  PageEvaluateOptions,
  MockWebSocketClass,
  PerformanceObserverCallback,
} from '../types/test-types';
