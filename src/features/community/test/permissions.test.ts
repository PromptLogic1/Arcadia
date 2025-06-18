import { describe, it, expect } from '@jest/globals';
import type { Tables } from '@/types/database.types';
import {
  checkUserPermissions,
  enforceRateLimits,
  getUserTrustLevel,
  canUserPerformAction,
  getActionPermissions,
  type UserPermissions,
  type UserAction,
  type RateLimitConfig,
  type TrustLevel,
} from '../services/permissions-service';

// Mock user data
const createMockUser = (overrides: Partial<Tables<'profiles'>> = {}): Tables<'profiles'> => ({
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  reputation: 0,
  violations: 0,
  is_banned: false,
  banned_until: null,
  role: 'user',
  ...overrides,
});

describe('Permissions Service', () => {
  describe('User Trust Level Calculation', () => {
    it('should calculate new user trust level', () => {
      const user = createMockUser({
        created_at: new Date().toISOString(),
        reputation: 0,
        violations: 0,
      });

      const trustLevel = getUserTrustLevel(user);
      expect(trustLevel.level).toBe('new');
      expect(trustLevel.permissions).toContain('read');
      expect(trustLevel.permissions).not.toContain('create_discussion');
    });

    it('should calculate basic user trust level', () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const user = createMockUser({
        created_at: weekAgo.toISOString(),
        reputation: 20,
        violations: 0,
      });

      const trustLevel = getUserTrustLevel(user);
      expect(trustLevel.level).toBe('basic');
      expect(trustLevel.permissions).toContain('read');
      expect(trustLevel.permissions).toContain('write');
      expect(trustLevel.permissions).toContain('create_discussion');
    });

    it('should calculate regular user trust level', () => {
      const monthsAgo = new Date();
      monthsAgo.setMonth(monthsAgo.getMonth() - 3);

      const user = createMockUser({
        created_at: monthsAgo.toISOString(),
        reputation: 150,
        violations: 0,
      });

      const trustLevel = getUserTrustLevel(user);
      expect(trustLevel.level).toBe('regular');
      expect(trustLevel.permissions).toContain('vote');
      expect(trustLevel.permissions).toContain('edit_own');
      expect(trustLevel.permissions).toContain('delete_own');
    });

    it('should calculate trusted user trust level', () => {
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);

      const user = createMockUser({
        created_at: yearAgo.toISOString(),
        reputation: 500,
        violations: 0,
      });

      const trustLevel = getUserTrustLevel(user);
      expect(trustLevel.level).toBe('trusted');
      expect(trustLevel.permissions).toContain('flag_content');
      expect(trustLevel.permissions).toContain('wiki_edit');
    });

    it('should grant moderator permissions', () => {
      const user = createMockUser({
        role: 'moderator',
        reputation: 1000,
      });

      const trustLevel = getUserTrustLevel(user);
      expect(trustLevel.level).toBe('moderator');
      expect(trustLevel.permissions).toContain('moderate');
      expect(trustLevel.permissions).toContain('edit_any');
      expect(trustLevel.permissions).toContain('delete_any');
      expect(trustLevel.permissions).toContain('ban_user');
    });

    it('should downgrade trust level for users with violations', () => {
      const monthsAgo = new Date();
      monthsAgo.setMonth(monthsAgo.getMonth() - 6);

      const user = createMockUser({
        created_at: monthsAgo.toISOString(),
        reputation: 200,
        violations: 3, // Multiple violations
      });

      const trustLevel = getUserTrustLevel(user);
      expect(trustLevel.level).toBe('basic'); // Downgraded from regular
      expect(trustLevel.permissions).not.toContain('delete_own');
    });

    it('should restrict banned users', () => {
      const user = createMockUser({
        is_banned: true,
        banned_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
      });

      const trustLevel = getUserTrustLevel(user);
      expect(trustLevel.level).toBe('banned');
      expect(trustLevel.permissions).toContain('read');
      expect(trustLevel.permissions).not.toContain('write');
      expect(trustLevel.permissions).not.toContain('vote');
    });

    it('should restore permissions after ban expires', () => {
      const user = createMockUser({
        is_banned: true,
        banned_until: new Date(Date.now() - 1000).toISOString(), // Ban expired
        reputation: 100,
      });

      const trustLevel = getUserTrustLevel(user);
      expect(trustLevel.level).not.toBe('banned');
      expect(trustLevel.permissions).toContain('write');
    });
  });

  describe('Action Permissions', () => {
    const actions: UserAction[] = [
      'create_discussion',
      'create_comment',
      'edit_discussion',
      'delete_discussion',
      'upvote',
      'downvote',
      'report_content',
      'moderate_content',
    ];

    it('should check permissions for new users', () => {
      const newUser = createMockUser({
        created_at: new Date().toISOString(),
        reputation: 0,
      });

      expect(canUserPerformAction(newUser, 'create_comment')).toBe(true);
      expect(canUserPerformAction(newUser, 'create_discussion')).toBe(false);
      expect(canUserPerformAction(newUser, 'upvote')).toBe(false);
      expect(canUserPerformAction(newUser, 'report_content')).toBe(true);
    });

    it('should check permissions for regular users', () => {
      const regularUser = createMockUser({
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        reputation: 150,
      });

      expect(canUserPerformAction(regularUser, 'create_discussion')).toBe(true);
      expect(canUserPerformAction(regularUser, 'upvote')).toBe(true);
      expect(canUserPerformAction(regularUser, 'edit_discussion', { ownContent: true })).toBe(true);
      expect(canUserPerformAction(regularUser, 'edit_discussion', { ownContent: false })).toBe(false);
      expect(canUserPerformAction(regularUser, 'moderate_content')).toBe(false);
    });

    it('should check permissions for moderators', () => {
      const moderator = createMockUser({
        role: 'moderator',
        reputation: 1000,
      });

      actions.forEach(action => {
        expect(canUserPerformAction(moderator, action)).toBe(true);
      });

      // Moderators can edit/delete any content
      expect(canUserPerformAction(moderator, 'edit_discussion', { ownContent: false })).toBe(true);
      expect(canUserPerformAction(moderator, 'delete_discussion', { ownContent: false })).toBe(true);
    });

    it('should handle content ownership checks', () => {
      const user = createMockUser({
        id: 'user-123',
        reputation: 150,
      });

      const ownContent = { author_id: 'user-123' };
      const otherContent = { author_id: 'user-456' };

      expect(canUserPerformAction(user, 'edit_discussion', { 
        ownContent: true,
        content: ownContent 
      })).toBe(true);

      expect(canUserPerformAction(user, 'edit_discussion', { 
        ownContent: false,
        content: otherContent 
      })).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce comment rate limits for new users', async () => {
      const newUser = createMockUser({
        created_at: new Date().toISOString(),
        reputation: 0,
      });

      const config: RateLimitConfig = {
        action: 'create_comment',
        userId: newUser.id,
        trustLevel: 'new',
      };

      // Simulate multiple attempts
      const results = [];
      for (let i = 0; i < 7; i++) {
        results.push(await enforceRateLimits(config));
      }

      // First 5 should succeed (new user limit)
      expect(results.slice(0, 5).every(r => r.allowed)).toBe(true);
      // 6th and 7th should be blocked
      expect(results[5].allowed).toBe(false);
      expect(results[6].allowed).toBe(false);
      expect(results[5].reason).toContain('rate limit');
    });

    it('should enforce discussion creation rate limits', async () => {
      const basicUser = createMockUser({
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        reputation: 50,
      });

      const config: RateLimitConfig = {
        action: 'create_discussion',
        userId: basicUser.id,
        trustLevel: 'basic',
      };

      // Basic users can create 3 discussions per day
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(await enforceRateLimits(config));
      }

      expect(results.slice(0, 3).every(r => r.allowed)).toBe(true);
      expect(results[3].allowed).toBe(false);
      expect(results[3].waitTime).toBeGreaterThan(0);
    });

    it('should allow higher limits for trusted users', async () => {
      const trustedUser = createMockUser({
        created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        reputation: 500,
      });

      const config: RateLimitConfig = {
        action: 'create_comment',
        userId: trustedUser.id,
        trustLevel: 'trusted',
      };

      // Trusted users have 100 comment limit
      const results = [];
      for (let i = 0; i < 20; i++) {
        results.push(await enforceRateLimits(config));
      }

      // All 20 should succeed (well under limit)
      expect(results.every(r => r.allowed)).toBe(true);
    });

    it('should have no rate limits for moderators', async () => {
      const moderator = createMockUser({
        role: 'moderator',
      });

      const config: RateLimitConfig = {
        action: 'create_comment',
        userId: moderator.id,
        trustLevel: 'moderator',
      };

      // Test many attempts
      const results = [];
      for (let i = 0; i < 200; i++) {
        results.push(await enforceRateLimits(config));
      }

      // All should succeed
      expect(results.every(r => r.allowed)).toBe(true);
    });

    it('should calculate correct wait times', async () => {
      const user = createMockUser({
        reputation: 20,
      });

      const config: RateLimitConfig = {
        action: 'create_comment',
        userId: user.id,
        trustLevel: 'basic',
        window: 3600, // 1 hour window
      };

      // Use up the limit
      for (let i = 0; i < 20; i++) {
        await enforceRateLimits(config);
      }

      // Next attempt should be blocked with wait time
      const result = await enforceRateLimits(config);
      expect(result.allowed).toBe(false);
      expect(result.waitTime).toBeGreaterThan(0);
      expect(result.waitTime).toBeLessThanOrEqual(3600);
    });

    it('should implement sliding window rate limiting', async () => {
      const user = createMockUser({
        reputation: 50,
      });

      const config: RateLimitConfig = {
        action: 'create_comment',
        userId: user.id,
        trustLevel: 'basic',
        algorithm: 'sliding_window',
        window: 300, // 5 minute window
      };

      // Make requests over time
      const results = [];
      const startTime = Date.now();

      // First batch
      for (let i = 0; i < 5; i++) {
        results.push(await enforceRateLimits(config));
      }

      // Wait 2 minutes
      await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000));

      // Try more requests
      for (let i = 0; i < 5; i++) {
        results.push(await enforceRateLimits(config));
      }

      // Should allow some requests as older ones fall out of window
      const allowedAfterWait = results.slice(5).filter(r => r.allowed).length;
      expect(allowedAfterWait).toBeGreaterThan(0);
    });
  });

  describe('Permission Matrix', () => {
    it('should return correct permissions for each trust level', () => {
      const levels: TrustLevel[] = ['new', 'basic', 'regular', 'trusted', 'moderator'];

      levels.forEach(level => {
        const permissions = getActionPermissions(level);
        
        // All users can read
        expect(permissions.read).toBe(true);
        
        // New users have restricted permissions
        if (level === 'new') {
          expect(permissions.create_discussion).toBe(false);
          expect(permissions.upvote).toBe(false);
        }
        
        // Basic and above can create discussions
        if (['basic', 'regular', 'trusted', 'moderator'].includes(level)) {
          expect(permissions.create_discussion).toBe(true);
          expect(permissions.upvote).toBe(true);
        }
        
        // Only moderators can moderate
        expect(permissions.moderate).toBe(level === 'moderator');
      });
    });

    it('should include daily limits in permissions', () => {
      const newUserPerms = getActionPermissions('new');
      const regularPerms = getActionPermissions('regular');
      const modPerms = getActionPermissions('moderator');

      expect(newUserPerms.limits.daily_comments).toBe(5);
      expect(newUserPerms.limits.daily_discussions).toBe(0);

      expect(regularPerms.limits.daily_comments).toBe(50);
      expect(regularPerms.limits.daily_discussions).toBe(10);

      expect(modPerms.limits.daily_comments).toBe(-1); // Unlimited
      expect(modPerms.limits.daily_discussions).toBe(-1);
    });
  });

  describe('Complex Permission Scenarios', () => {
    it('should handle temporary permission overrides', () => {
      const user = createMockUser({
        reputation: 100,
        temporary_permissions: {
          create_wiki: true,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      expect(canUserPerformAction(user, 'create_wiki')).toBe(true);
    });

    it('should handle permission inheritance for special roles', () => {
      const vipUser = createMockUser({
        role: 'vip',
        reputation: 50, // Low reputation but VIP
      });

      const trustLevel = getUserTrustLevel(vipUser);
      expect(trustLevel.permissions).toContain('create_discussion');
      expect(trustLevel.permissions).toContain('no_ads');
      expect(trustLevel.permissions).toContain('priority_support');
    });

    it('should apply contextual permissions', () => {
      const user = createMockUser({
        reputation: 200,
        is_event_participant: true,
      });

      // During events, participants get special permissions
      expect(canUserPerformAction(user, 'create_event_post', {
        context: 'event',
        eventId: 'event-123',
      })).toBe(true);

      // Outside events, they don't
      expect(canUserPerformAction(user, 'create_event_post', {
        context: 'normal',
      })).toBe(false);
    });

    it('should check discussion-specific permissions', () => {
      const user = createMockUser({
        reputation: 150,
      });

      const lockedDiscussion = {
        id: 1,
        is_locked: true,
        author_id: 'other-user',
      };

      const ownLockedDiscussion = {
        id: 2,
        is_locked: true,
        author_id: user.id,
      };

      // Can't comment on locked discussions
      expect(canUserPerformAction(user, 'create_comment', {
        discussion: lockedDiscussion,
      })).toBe(false);

      // Even if it's their own
      expect(canUserPerformAction(user, 'create_comment', {
        discussion: ownLockedDiscussion,
      })).toBe(false);

      // But moderators can
      const moderator = createMockUser({ role: 'moderator' });
      expect(canUserPerformAction(moderator, 'create_comment', {
        discussion: lockedDiscussion,
      })).toBe(true);
    });
  });
});