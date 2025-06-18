import type { Tables } from '@/types/database-generated';
import { vi } from 'vitest';

// Mock Supabase client
export const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: null, error: null })),
        data: null,
        error: null,
      })),
      order: vi.fn(() => ({
        limit: vi.fn(() => ({ data: [], error: null })),
      })),
    })),
    insert: vi.fn(() => ({ data: null, error: null })),
    update: vi.fn(() => ({ data: null, error: null })),
    delete: vi.fn(() => ({ data: null, error: null })),
  })),
  auth: {
    getUser: vi.fn(() => ({ data: { user: null }, error: null })),
    getSession: vi.fn(() => ({ data: { session: null }, error: null })),
  },
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  })),
};

// Mock user profiles
export const mockUsers = {
  newUser: {
    id: 'new-user-123',
    username: 'newbie',
    email: 'new@example.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    reputation: 0,
    violations: 0,
    is_banned: false,
    banned_until: null,
    role: 'user',
  } as Tables<'profiles'>,

  regularUser: {
    id: 'regular-user-123',
    username: 'regular_player',
    email: 'regular@example.com',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    reputation: 150,
    violations: 0,
    is_banned: false,
    banned_until: null,
    role: 'user',
  } as Tables<'profiles'>,

  trustedUser: {
    id: 'trusted-user-123',
    username: 'veteran_player',
    email: 'trusted@example.com',
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    reputation: 500,
    violations: 0,
    is_banned: false,
    banned_until: null,
    role: 'user',
  } as Tables<'profiles'>,

  moderator: {
    id: 'mod-user-123',
    username: 'moderator',
    email: 'mod@example.com',
    created_at: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    reputation: 1000,
    violations: 0,
    is_banned: false,
    banned_until: null,
    role: 'moderator',
  } as Tables<'profiles'>,

  bannedUser: {
    id: 'banned-user-123',
    username: 'troublemaker',
    email: 'banned@example.com',
    created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    reputation: 50,
    violations: 5,
    is_banned: true,
    banned_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    role: 'user',
  } as Tables<'profiles'>,
};

// Mock notification service
export const mockNotificationService = {
  sendEmail: vi.fn(),
  sendPush: vi.fn(),
  createInApp: vi.fn(),
  batchNotifications: vi.fn(),
};

// Mock rate limiter
export const mockRateLimiter = {
  checkLimit: vi.fn(() => ({ allowed: true, remaining: 10, reset: Date.now() + 3600000 })),
  consume: vi.fn(),
  reset: vi.fn(),
};

// Mock cache service
export const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
};

// Mock search service
export const mockSearchService = {
  search: vi.fn(() => ({ results: [], total: 0 })),
  index: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
};

// Mock permission service
export const mockPermissionService = {
  checkPermission: vi.fn(() => true),
  getUserPermissions: vi.fn(() => ['read', 'write', 'vote']),
  canPerformAction: vi.fn(() => true),
};

// Mock moderation service
export const mockModerationService = {
  checkContent: vi.fn(() => ({ 
    classification: 'safe', 
    action: 'approve',
    confidence: 0.1,
    reasons: [],
  })),
  reportContent: vi.fn(),
  reviewContent: vi.fn(),
  banUser: vi.fn(),
};

// Mock analytics service
export const mockAnalytics = {
  track: vi.fn(),
  identify: vi.fn(),
  page: vi.fn(),
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