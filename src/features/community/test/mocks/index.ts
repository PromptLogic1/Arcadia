import type { Tables } from '@/types/database.types';
import { jest } from '@jest/globals';

// Mock Supabase client
export const mockSupabase = {
  from: jest.fn((_table: string) => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({ data: null, error: null })),
        data: null,
        error: null,
      })),
      order: jest.fn(() => ({
        limit: jest.fn(() => ({ data: [], error: null })),
      })),
    })),
    insert: jest.fn(() => ({ data: null, error: null })),
    update: jest.fn(() => ({ data: null, error: null })),
    delete: jest.fn(() => ({ data: null, error: null })),
  })),
  auth: {
    getUser: jest.fn(() => ({ data: { user: null }, error: null })),
    getSession: jest.fn(() => ({ data: { session: null }, error: null })),
  },
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn(),
  })),
};

// Mock user profiles
export const mockUsers = {
  newUser: {
    id: 'new-user-123',
    username: 'newbie',
    auth_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    role: 'user',
    bio: null,
    full_name: null,
    avatar_url: null,
    city: null,
    land: null,
    region: null,
    experience_points: 0,
    last_login_at: null,
    achievements_visibility: 'public',
    profile_visibility: 'public',
    submissions_visibility: 'public',
  } as Tables<'users'>,

  regularUser: {
    id: 'regular-user-123',
    username: 'regular_player',
    auth_id: null,
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    role: 'user',
    bio: null,
    full_name: null,
    avatar_url: null,
    city: null,
    land: null,
    region: null,
    experience_points: 150,
    last_login_at: null,
    achievements_visibility: 'public',
    profile_visibility: 'public',
    submissions_visibility: 'public',
  } as Tables<'users'>,

  trustedUser: {
    id: 'trusted-user-123',
    username: 'veteran_player',
    auth_id: null,
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    role: 'user',
    bio: null,
    full_name: null,
    avatar_url: null,
    city: null,
    land: null,
    region: null,
    experience_points: 500,
    last_login_at: null,
    achievements_visibility: 'public',
    profile_visibility: 'public',
    submissions_visibility: 'public',
  } as Tables<'users'>,

  moderator: {
    id: 'mod-user-123',
    username: 'moderator',
    auth_id: null,
    created_at: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    role: 'moderator',
    bio: null,
    full_name: null,
    avatar_url: null,
    city: null,
    land: null,
    region: null,
    experience_points: 1000,
    last_login_at: null,
    achievements_visibility: 'public',
    profile_visibility: 'public',
    submissions_visibility: 'public',
  } as Tables<'users'>,

  bannedUser: {
    id: 'banned-user-123',
    username: 'troublemaker',
    auth_id: null,
    created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    role: 'user',
    bio: null,
    full_name: null,
    avatar_url: null,
    city: null,
    land: null,
    region: null,
    experience_points: 50,
    last_login_at: null,
    achievements_visibility: 'public',
    profile_visibility: 'public',
    submissions_visibility: 'public',
  } as Tables<'users'>,
};

// Mock notification service
export const mockNotificationService = {
  sendEmail: jest.fn(),
  sendPush: jest.fn(),
  createInApp: jest.fn(),
  batchNotifications: jest.fn(),
};

// Mock rate limiter
export const mockRateLimiter = {
  checkLimit: jest.fn<() => Promise<{
    allowed: boolean;
    remaining: number;
    reset: number;
  }>>().mockResolvedValue({
    allowed: true,
    remaining: 10,
    reset: Date.now() + 3600000,
  }),
  consume: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  reset: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
};

// Mock cache service
export const mockCache = {
  get: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
  set: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
  delete: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
  clear: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
};

// Mock search service
export const mockSearchService = {
  search: jest.fn(() => ({ results: [], total: 0 })),
  index: jest.fn(),
  remove: jest.fn(),
  update: jest.fn(),
};

// Mock permission service
export const mockPermissionService = {
  checkPermission: jest.fn(() => true),
  getUserPermissions: jest.fn(() => ['read', 'write', 'vote']),
  canPerformAction: jest.fn(() => true),
};

// Mock moderation service
export const mockModerationService = {
  checkContent: jest.fn(() => ({
    classification: 'safe',
    action: 'approve',
    confidence: 0.1,
    reasons: [],
  })),
  reportContent: jest.fn(),
  reviewContent: jest.fn(),
  banUser: jest.fn(),
};

// Mock analytics service
export const mockAnalytics = {
  track: jest.fn(),
  identify: jest.fn(),
  page: jest.fn(),
};

// Helper to reset all mocks
export const resetAllMocks = () => {
  Object.values(mockSupabase).forEach(value => {
    if (typeof value === 'function' && 'mockReset' in value) {
      value.mockReset();
    }
  });

  mockNotificationService.sendEmail.mockReset();
  mockNotificationService.sendPush.mockReset();
  mockNotificationService.createInApp.mockReset();
  mockNotificationService.batchNotifications.mockReset();

  mockRateLimiter.checkLimit.mockReset();
  mockRateLimiter.consume.mockReset();
  mockRateLimiter.reset.mockReset();

  mockCache.get.mockReset();
  mockCache.set.mockReset();
  mockCache.delete.mockReset();
  mockCache.clear.mockReset();

  mockSearchService.search.mockReset();
  mockSearchService.index.mockReset();
  mockSearchService.remove.mockReset();
  mockSearchService.update.mockReset();

  mockPermissionService.checkPermission.mockReset();
  mockPermissionService.getUserPermissions.mockReset();
  mockPermissionService.canPerformAction.mockReset();

  mockModerationService.checkContent.mockReset();
  mockModerationService.reportContent.mockReset();
  mockModerationService.reviewContent.mockReset();
  mockModerationService.banUser.mockReset();

  mockAnalytics.track.mockReset();
  mockAnalytics.identify.mockReset();
  mockAnalytics.page.mockReset();
};
