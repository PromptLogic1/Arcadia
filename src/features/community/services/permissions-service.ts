// Permissions Service - Business Logic for User Permissions and Rate Limiting
// This file contains the core permission logic extracted from E2E tests

import type { Tables } from '@/types/database.types';

export type TrustLevel =
  | 'new'
  | 'basic'
  | 'regular'
  | 'trusted'
  | 'moderator'
  | 'banned'
  | 'vip';
export type UserAction =
  | 'create_discussion'
  | 'create_comment'
  | 'edit_discussion'
  | 'delete_discussion'
  | 'upvote'
  | 'downvote'
  | 'report_content'
  | 'moderate_content'
  | 'create_wiki'
  | 'create_event_post'
  | 'flag_content';

export interface UserPermissions {
  read: boolean;
  write: boolean;
  create_discussion: boolean;
  create_comment: boolean;
  upvote: boolean;
  downvote: boolean;
  edit_own: boolean;
  edit_any: boolean;
  delete_own: boolean;
  delete_any: boolean;
  report: boolean;
  moderate: boolean;
  ban_user: boolean;
  flag_content: boolean;
  wiki_edit: boolean;
  create_wiki: boolean;
  create_event_post: boolean;
  no_ads: boolean;
  priority_support: boolean;
  limits: {
    daily_comments: number;
    daily_discussions: number;
    daily_reports: number;
  };
}

export interface UserTrustData {
  level: TrustLevel;
  reputation: number;
  accountAge: number; // days
  violations: number;
  permissions: string[];
}

export interface RateLimitConfig {
  action: UserAction;
  userId: string;
  trustLevel: TrustLevel;
  window?: number; // seconds
  algorithm?: 'fixed_window' | 'sliding_window' | 'token_bucket';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining?: number;
  reset?: number;
  waitTime?: number;
  reason?: string;
}

export interface ActionContext {
  ownContent?: boolean;
  content?: { author_id: string };
  discussion?: { is_locked: boolean; author_id: string };
  context?: 'normal' | 'event';
  eventId?: string;
}

// Calculate user trust level based on user data
export function getUserTrustLevel(user: Tables<'users'>): UserTrustData {
  const accountAge = user.created_at
    ? Math.floor(
        (Date.now() - new Date(user.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  // Default values for properties not in the database schema
  const reputation = 0; // Would come from a separate reputation system
  const violations = 0; // Would come from a separate moderation system

  // Special roles
  if (user.role === 'moderator') {
    return {
      level: 'moderator',
      reputation,
      accountAge,
      violations,
      permissions: ['all'], // All permissions
    };
  }

  if (user.role === 'premium') {
    // Using 'premium' role from database schema
    return {
      level: 'vip',
      reputation,
      accountAge,
      violations,
      permissions: [
        'read',
        'write',
        'create_discussion',
        'vote',
        'no_ads',
        'priority_support',
      ],
    };
  }

  // Calculate trust level based on reputation, age, and violations
  let level: TrustLevel = 'new';
  const permissions: string[] = ['read'];

  // Downgrade for violations
  const effectiveReputation = Math.max(0, reputation - violations * 50);
  const violationPenalty = violations > 2;

  if (accountAge >= 365) {
    level = 'trusted';
    permissions.push(
      'write',
      'create_discussion',
      'vote',
      'edit_own',
      'delete_own',
      'flag_content',
      'wiki_edit'
    );
  } else if (accountAge >= 30) {
    level = 'regular';
    permissions.push(
      'write',
      'create_discussion',
      'vote',
      'edit_own',
      'delete_own'
    );
  } else if (accountAge >= 7) {
    level = 'basic';
    permissions.push('write', 'create_discussion', 'vote');
  } else {
    level = 'new';
    permissions.push('write'); // Can comment but limited
  }

  return {
    level,
    reputation,
    accountAge,
    violations,
    permissions,
  };
}

// Get detailed permissions for a trust level
export function getActionPermissions(level: TrustLevel): UserPermissions {
  const basePermissions: UserPermissions = {
    read: true,
    write: false,
    create_discussion: false,
    create_comment: false,
    upvote: false,
    downvote: false,
    edit_own: false,
    edit_any: false,
    delete_own: false,
    delete_any: false,
    report: false,
    moderate: false,
    ban_user: false,
    flag_content: false,
    wiki_edit: false,
    create_wiki: false,
    create_event_post: false,
    no_ads: false,
    priority_support: false,
    limits: {
      daily_comments: 0,
      daily_discussions: 0,
      daily_reports: 0,
    },
  };

  switch (level) {
    case 'banned':
      return basePermissions; // Only read access

    case 'new':
      return {
        ...basePermissions,
        write: true,
        create_comment: true,
        report: true,
        limits: {
          daily_comments: 5,
          daily_discussions: 0,
          daily_reports: 3,
        },
      };

    case 'basic':
      return {
        ...basePermissions,
        write: true,
        create_discussion: true,
        create_comment: true,
        upvote: true,
        downvote: true,
        report: true,
        limits: {
          daily_comments: 20,
          daily_discussions: 3,
          daily_reports: 10,
        },
      };

    case 'regular':
      return {
        ...basePermissions,
        write: true,
        create_discussion: true,
        create_comment: true,
        upvote: true,
        downvote: true,
        edit_own: true,
        delete_own: true,
        report: true,
        limits: {
          daily_comments: 50,
          daily_discussions: 10,
          daily_reports: 20,
        },
      };

    case 'trusted':
      return {
        ...basePermissions,
        write: true,
        create_discussion: true,
        create_comment: true,
        upvote: true,
        downvote: true,
        edit_own: true,
        delete_own: true,
        report: true,
        flag_content: true,
        wiki_edit: true,
        limits: {
          daily_comments: 100,
          daily_discussions: 20,
          daily_reports: 50,
        },
      };

    case 'vip':
      return {
        ...basePermissions,
        write: true,
        create_discussion: true,
        create_comment: true,
        upvote: true,
        downvote: true,
        edit_own: true,
        delete_own: true,
        report: true,
        no_ads: true,
        priority_support: true,
        limits: {
          daily_comments: 100,
          daily_discussions: 20,
          daily_reports: 50,
        },
      };

    case 'moderator':
      return {
        ...basePermissions,
        write: true,
        create_discussion: true,
        create_comment: true,
        upvote: true,
        downvote: true,
        edit_own: true,
        edit_any: true,
        delete_own: true,
        delete_any: true,
        report: true,
        moderate: true,
        ban_user: true,
        flag_content: true,
        wiki_edit: true,
        create_wiki: true,
        create_event_post: true,
        limits: {
          daily_comments: -1, // Unlimited
          daily_discussions: -1,
          daily_reports: -1,
        },
      };

    default:
      return basePermissions;
  }
}

// Check if user can perform a specific action
export function canUserPerformAction(
  user: Tables<'users'>,
  action: UserAction,
  context?: ActionContext
): boolean {
  const trustData = getUserTrustLevel(user);
  const permissions = getActionPermissions(trustData.level);

  // Handle banned users
  if (trustData.level === 'banned') {
    return false; // Banned users can't perform any actions
  }

  // Handle locked discussions
  if (context?.discussion?.is_locked && action === 'create_comment') {
    return trustData.level === 'moderator';
  }

  // Handle content ownership
  if (action === 'edit_discussion' || action === 'delete_discussion') {
    if (
      context?.ownContent ||
      (context?.content && context.content.author_id === user.id)
    ) {
      return permissions.edit_own || permissions.edit_any;
    } else {
      return permissions.edit_any;
    }
  }

  // Handle context-specific permissions
  if (action === 'create_event_post') {
    // Note: is_event_participant would need to be added to users table or fetched separately
    const isEventParticipant = false; // Placeholder - would need proper implementation
    if (context?.context === 'event' && isEventParticipant) {
      return true;
    }
    return permissions.create_event_post;
  }

  // Handle temporary permissions
  // Note: temporary_permissions would need to be added to users table or managed separately
  // For now, we'll skip this functionality
  // if (user.temporary_permissions) {
  //   const tempPerms = user.temporary_permissions as Record<string, { expires_at: string }>;
  //   if (tempPerms[action] && new Date(tempPerms.expires_at) > new Date()) {
  //     return true;
  //   }
  // }

  // Map actions to permissions
  switch (action) {
    case 'create_discussion':
      return permissions.create_discussion;
    case 'create_comment':
      return permissions.create_comment;
    case 'upvote':
    case 'downvote':
      return permissions.upvote;
    case 'report_content':
      return permissions.report;
    case 'moderate_content':
      return permissions.moderate;
    case 'flag_content':
      return permissions.flag_content;
    case 'create_wiki':
      return permissions.create_wiki;
    default:
      return false;
  }
}

// Check user permissions (legacy compatibility)
export function checkUserPermissions(
  user: Tables<'users'>,
  requiredPermissions: string[]
): boolean {
  const trustData = getUserTrustLevel(user);

  if (trustData.permissions.includes('all')) {
    return true;
  }

  return requiredPermissions.every(permission =>
    trustData.permissions.includes(permission)
  );
}

// Rate limiting implementation
const rateLimitStore = new Map<
  string,
  { count: number; reset: number; window?: number }
>();

export async function enforceRateLimits(
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { action, userId, trustLevel, window = 3600 } = config;
  const permissions = getActionPermissions(trustLevel);

  // No limits for moderators
  if (trustLevel === 'moderator') {
    return { allowed: true };
  }

  // Get rate limit for action
  let limit: number;
  switch (action) {
    case 'create_comment':
      limit = permissions.limits.daily_comments;
      break;
    case 'create_discussion':
      limit = permissions.limits.daily_discussions;
      break;
    case 'report_content':
      limit = permissions.limits.daily_reports;
      break;
    default:
      limit = 10; // Default limit
  }

  // Unlimited
  if (limit === -1) {
    return { allowed: true };
  }

  const key = `${userId}:${action}`;
  const now = Date.now();
  const windowMs = window * 1000;

  let entry = rateLimitStore.get(key);

  // Initialize or reset if window expired
  if (!entry || now > entry.reset) {
    entry = {
      count: 0,
      reset: now + windowMs,
      window: windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  // Check if limit exceeded
  if (entry.count >= limit) {
    const waitTime = Math.max(0, entry.reset - now);
    return {
      allowed: false,
      remaining: 0,
      reset: entry.reset,
      waitTime,
      reason: `Rate limit exceeded: ${entry.count}/${limit} requests in ${window}s window`,
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: limit - entry.count,
    reset: entry.reset,
  };
}

// Clear rate limits (for testing)
export function clearRateLimits(userId?: string): void {
  if (userId) {
    // Clear for specific user
    for (const key of rateLimitStore.keys()) {
      if (key.startsWith(`${userId}:`)) {
        rateLimitStore.delete(key);
      }
    }
  } else {
    // Clear all
    rateLimitStore.clear();
  }
}

// Get current rate limit status
export function getRateLimitStatus(
  userId: string,
  action: UserAction
): { count: number; limit: number; reset: number } | null {
  const key = `${userId}:${action}`;
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return null;
  }

  // This is a simplified version - in real implementation,
  // we'd need to determine the limit based on user's trust level
  return {
    count: entry.count,
    limit: 10, // Would be calculated based on user's permissions
    reset: entry.reset,
  };
}
