import { describe, it, expect, jest } from '@jest/globals';
import type { Tables } from '@/types/database.types';
import {
  triggerNotification,
  shouldSendNotification,
  batchNotifications,
  getNotificationRecipients,
  formatNotificationContent,
  type NotificationTrigger,
  type NotificationPreferences,
  type NotificationContext,
  type Notification as ServiceNotification,
  type NotificationBatch,
  type NotificationForFormatting,
} from '../services/notification-service';

// Mock data
const createMockUser = (id: string, prefs?: Partial<NotificationPreferences>) => ({
  id,
  username: `user${id}`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  auth_id: null,
  avatar_url: null,
  bio: null,
  city: null,
  experience_points: null,
  full_name: null,
  land: null,
  last_login_at: null,
  region: null,
  role: 'user' as const,
  achievements_visibility: null,
  profile_visibility: null,
  submissions_visibility: null,
  preferences: {
    email_notifications: true,
    push_notifications: true,
    in_app_notifications: true,
    comment_replies: true,
    discussion_updates: true,
    mentions: true,
    upvotes: false,
    new_followers: true,
    weekly_digest: true,
    promotional: false,
    quiet_hours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
    ...prefs,
  },
});

const createMockDiscussion = (overrides: Partial<Tables<'discussions'>> = {}): Tables<'discussions'> => ({
  id: 1,
  title: 'Test Discussion',
  content: 'Test content',
  author_id: 'user-1',
  game: 'Pokemon',
  challenge_type: 'Bingo',
  tags: ['strategy'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  upvotes: 0,
  ...overrides,
});

const createMockComment = (overrides: Partial<Tables<'comments'>> = {}): Tables<'comments'> => ({
  id: 1,
  content: 'Test comment',
  author_id: 'user-2',
  discussion_id: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  upvotes: 0,
  ...overrides,
});

describe('Notification Service', () => {
  describe('Notification Triggers', () => {
    it('should trigger notification for comment replies', async () => {
      const parentComment = createMockComment({
        id: 1,
        author_id: 'user-1',
        content: 'Original comment',
      });

      const replyComment = createMockComment({
        id: 2,
        author_id: 'user-2',
        content: 'This is a reply',
      });

      const trigger: NotificationTrigger = {
        type: 'comment_reply',
        actor_id: replyComment.author_id || 'user-2',
        target_id: parentComment.author_id || 'user-1',
        resource_type: 'comment',
        resource_id: replyComment.id.toString(),
        parent_id: parentComment.id.toString(),
      };

      const notification = await triggerNotification(trigger);

      expect(notification).toBeDefined();
      expect(notification!.type).toBe('comment_reply');
      expect(notification!.recipient_id).toBe('user-1');
      expect(notification!.actor_id).toBe('user-2');
      expect(notification!.resource_id).toBe('2');
    });

    it('should trigger notification for mentions', async () => {
      const comment = createMockComment({
        content: 'Hey @user3, check this out! Also @user4',
        author_id: 'user-1',
      });

      const mentions = ['user3', 'user4'];
      const notifications = [];

      for (const username of mentions) {
        const trigger: NotificationTrigger = {
          type: 'mention',
          actor_id: comment.author_id!,
          target_id: username, // Would be resolved to user ID
          resource_type: 'comment',
          resource_id: comment.id.toString(),
          metadata: {
            username,
            context: comment.content,
          },
        };

        notifications.push(await triggerNotification(trigger));
      }

      expect(notifications).toHaveLength(2);
      expect(notifications[0]!.type).toBe('mention');
      expect(notifications[1]!.type).toBe('mention');
    });

    it('should trigger notification for discussion updates', async () => {
      const discussion = createMockDiscussion({
        id: 1,
        author_id: 'user-1',
      });

      const comment = createMockComment({
        discussion_id: discussion.id,
        author_id: 'user-2',
      });

      const trigger: NotificationTrigger = {
        type: 'discussion_update',
        actor_id: comment.author_id || 'user-2',
        target_id: discussion.author_id || 'user-1',
        resource_type: 'discussion',
        resource_id: discussion.id.toString(),
        metadata: {
          update_type: 'new_comment',
          comment_id: comment.id,
        },
      };

      const notification = await triggerNotification(trigger);

      expect(notification).not.toBeNull();
      expect(notification!.type).toBe('discussion_update');
      expect(notification!.recipient_id).toBe('user-1');
      expect(notification!.metadata?.update_type).toBe('new_comment');
    });

    it('should trigger notification for upvotes when enabled', async () => {
      const comment = createMockComment({
        author_id: 'user-1',
      });

      const trigger: NotificationTrigger = {
        type: 'upvote',
        actor_id: 'user-2',
        target_id: comment.author_id || 'user-1',
        resource_type: 'comment',
        resource_id: comment.id.toString(),
      };

      const notification = await triggerNotification(trigger);

      expect(notification).not.toBeNull();
      expect(notification!.type).toBe('upvote');
      expect(notification!.recipient_id).toBe('user-1');
    });

    it('should trigger notification for new followers', async () => {
      const trigger: NotificationTrigger = {
        type: 'new_follower',
        actor_id: 'user-2',
        target_id: 'user-1',
        resource_type: 'user',
        resource_id: 'user-2',
      };

      const notification = await triggerNotification(trigger);

      expect(notification!.type).toBe('new_follower');
      expect(notification!.recipient_id).toBe('user-1');
      expect(notification!.actor_id).toBe('user-2');
    });

    it('should trigger moderation notifications', async () => {
      const discussion = createMockDiscussion({
        author_id: 'user-1',
      });

      const trigger: NotificationTrigger = {
        type: 'content_removed',
        actor_id: 'moderator-1',
        target_id: discussion.author_id!,
        resource_type: 'discussion',
        resource_id: discussion.id.toString(),
        metadata: {
          reason: 'spam',
          action: 'removed',
        },
      };

      const notification = await triggerNotification(trigger);

      expect(notification!.type).toBe('content_removed');
      expect(notification!.metadata?.reason).toBe('spam');
    });
  });

  describe('Notification Preferences', () => {
    it('should respect user notification preferences', async () => {
      const user = createMockUser('user-1', {
        comment_replies: false,
        upvotes: false,
        mentions: true,
      });

      // Should not send for disabled preferences
      expect(shouldSendNotification('comment_reply', user.preferences)).toBe(false);
      expect(shouldSendNotification('upvote', user.preferences)).toBe(false);
      
      // Should send for enabled preferences
      expect(shouldSendNotification('mention', user.preferences)).toBe(true);
    });

    it('should respect quiet hours', async () => {
      const user = createMockUser('user-1', {
        quiet_hours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
        },
      });

      // Mock current time at 23:00 (11 PM)
      const nightTime = new Date();
      nightTime.setHours(23, 0, 0, 0);
      jest.setSystemTime(nightTime);

      expect(shouldSendNotification('comment_reply', user.preferences, {
        checkQuietHours: true,
      })).toBe(false);

      // Mock current time at 09:00 (9 AM)
      const dayTime = new Date();
      dayTime.setHours(9, 0, 0, 0);
      jest.setSystemTime(dayTime);

      expect(shouldSendNotification('comment_reply', user.preferences, {
        checkQuietHours: true,
      })).toBe(true);

      jest.useRealTimers();
    });

    it('should always send critical notifications', async () => {
      const user = createMockUser('user-1', {
        email_notifications: false,
        quiet_hours: {
          enabled: true,
          start: '00:00',
          end: '23:59', // Always quiet hours
        },
      });

      // Critical notifications should bypass preferences
      expect(shouldSendNotification('account_security', user.preferences, {
        checkQuietHours: true,
        priority: 'critical',
      })).toBe(true);

      expect(shouldSendNotification('content_removed', user.preferences, {
        checkQuietHours: true,
        priority: 'high',
      })).toBe(true);
    });
  });

  describe('Notification Recipients', () => {
    it('should get discussion subscribers', async () => {
      const discussion = createMockDiscussion({
        id: 1,
        author_id: 'user-1',
      });

      const subscribers = [
        'user-1', // Author
        'user-2', // Commenter
        'user-3', // Subscriber
      ];

      const context: NotificationContext = {
        resource_type: 'discussion',
        resource_id: discussion.id.toString(),
        exclude_users: ['user-2'], // Exclude the actor
      };

      const recipients = await getNotificationRecipients(context, subscribers);

      expect(recipients).toContain('user-1');
      expect(recipients).not.toContain('user-2'); // Excluded
      expect(recipients).toContain('user-3');
    });

    it('should get followers for user actions', async () => {
      const followers = ['user-2', 'user-3', 'user-4'];

      const context: NotificationContext = {
        resource_type: 'user',
        resource_id: 'user-1',
        notification_type: 'new_discussion',
      };

      const recipients = await getNotificationRecipients(context, followers);

      expect(recipients).toHaveLength(3);
      expect(recipients).toEqual(followers);
    });

    it('should handle team mentions', async () => {
      const teamMembers = ['user-1', 'user-2', 'user-3', 'user-4'];

      const context: NotificationContext = {
        resource_type: 'team',
        resource_id: 'team-speedrunners',
        notification_type: 'team_mention',
        exclude_users: ['user-1'], // Exclude the mentioner
      };

      const recipients = await getNotificationRecipients(context, teamMembers);

      expect(recipients).toHaveLength(3);
      expect(recipients).not.toContain('user-1');
    });

    it('should get moderators for reports', async () => {
      const moderators = ['mod-1', 'mod-2', 'mod-3'];

      const context: NotificationContext = {
        resource_type: 'report',
        resource_id: 'report-123',
        notification_type: 'content_reported',
        metadata: {
          severity: 'high',
        },
      };

      const recipients = await getNotificationRecipients(context, moderators);

      expect(recipients).toHaveLength(3);
      expect(recipients).toEqual(moderators);
    });
  });

  describe('Notification Batching', () => {
    it('should batch similar notifications', async () => {
      const notifications = [
        {
          type: 'upvote' as const,
          recipient_id: 'user-1',
          actor_id: 'user-2',
          resource_id: 'comment-1',
        },
        {
          type: 'upvote' as const,
          recipient_id: 'user-1',
          actor_id: 'user-3',
          resource_id: 'comment-1',
        },
        {
          type: 'upvote' as const,
          recipient_id: 'user-1',
          actor_id: 'user-4',
          resource_id: 'comment-1',
        },
      ];

      const batched = await batchNotifications(notifications as ServiceNotification[]);

      expect(batched).toHaveLength(1);
      expect(batched[0]!.type).toBe('upvote_batch');
      expect(batched[0]!.count).toBe(3);
      expect(batched[0]!.actors).toEqual(['user-2', 'user-3', 'user-4']);
    });

    it('should not batch different notification types', async () => {
      const notifications = [
        {
          type: 'upvote' as const,
          recipient_id: 'user-1',
          actor_id: 'user-2',
          resource_id: 'comment-1',
        },
        {
          type: 'comment_reply' as const,
          recipient_id: 'user-1',
          actor_id: 'user-3',
          resource_id: 'comment-2',
        },
      ];

      const batched = await batchNotifications(notifications as ServiceNotification[]);

      expect(batched).toHaveLength(2);
      expect(batched[0]!.type).toBe('upvote');
      expect(batched[1]!.type).toBe('comment_reply');
    });

    it('should batch by time window', async () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const notifications = [
        {
          type: 'upvote' as const,
          recipient_id: 'user-1',
          created_at: now.toISOString(),
        },
        {
          type: 'upvote' as const,
          recipient_id: 'user-1',
          created_at: fiveMinutesAgo.toISOString(),
        },
        {
          type: 'upvote' as const,
          recipient_id: 'user-1',
          created_at: hourAgo.toISOString(),
        },
      ];

      const batched = await batchNotifications(notifications, {
        timeWindow: 10 * 60 * 1000, // 10 minutes
      });

      expect(batched).toHaveLength(2);
      // Recent notifications batched together
      expect(batched[0]!.count).toBe(2);
      // Older notification separate
      expect(batched[1]!.count).toBe(1);
    });
  });

  describe('Notification Content Formatting', () => {
    it('should format comment reply notifications', async () => {
      const notification = {
        type: 'comment_reply',
        actor: { username: 'johndoe' },
        resource: {
          content: 'This is a reply to your comment',
          discussion_title: 'Pokemon Speedrun Strategies',
        },
      };

      const content = await formatNotificationContent(notification as any);

      expect(content.title).toBe('New reply from johndoe');
      expect(content.body).toContain('replied to your comment');
      expect(content.body).toContain('Pokemon Speedrun Strategies');
      expect(content.preview).toBe('This is a reply to your comment');
    });

    it('should format mention notifications', async () => {
      const notification = {
        type: 'mention',
        actor: { username: 'janedoe' },
        resource: {
          content: 'Hey @user1, check out this strategy!',
          type: 'comment',
        },
      };

      const content = await formatNotificationContent(notification as any);

      expect(content.title).toBe('janedoe mentioned you');
      expect(content.body).toContain('mentioned you in a comment');
      expect(content.preview).toContain('check out this strategy');
    });

    it('should format batch notifications', async () => {
      const notification = {
        type: 'upvote_batch',
        count: 5,
        actors: [
          { username: 'user1' },
          { username: 'user2' },
          { username: 'user3' },
        ],
        resource: {
          type: 'comment',
          content: 'Great strategy guide!',
        },
      };

      const content = await formatNotificationContent(notification as any);

      expect(content.title).toBe('5 new upvotes');
      expect(content.body).toContain('user1, user2, user3 and 2 others');
      expect(content.body).toContain('upvoted your comment');
    });

    it('should format moderation notifications', async () => {
      const notification = {
        type: 'content_removed',
        actor: { username: 'moderator' },
        resource: {
          type: 'discussion',
          title: 'My Discussion',
        },
        metadata: {
          reason: 'spam',
          action_details: 'Promotional content not allowed',
        },
      };

      const content = await formatNotificationContent(notification as any);

      expect(content.title).toBe('Content removed');
      expect(content.body).toContain('Your discussion "My Discussion" was removed');
      expect(content.body).toContain('Reason: spam');
      expect(content.details).toContain('Promotional content not allowed');
    });

    it('should truncate long content', async () => {
      const longContent = 'a'.repeat(500);
      
      const notification = {
        type: 'comment_reply',
        actor: { username: 'user1' },
        resource: {
          content: longContent,
        },
      };

      const content = await formatNotificationContent(notification as any);

      expect(content.preview?.length || 0).toBeLessThanOrEqual(200);
      expect(content.preview).toContain('...');
    });
  });

  describe('Notification Delivery', () => {
    it('should queue email notifications', async () => {
      const emailQueue = jest.fn();
      
      const trigger: NotificationTrigger = {
        type: 'comment_reply',
        actor_id: 'user-2',
        target_id: 'user-1',
        resource_type: 'comment',
        resource_id: 'comment-1',
      };

      await triggerNotification(trigger, {
        channels: ['email'],
        emailQueue,
      });

      expect(emailQueue).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: expect.any(String),
        template: 'comment_reply',
        data: expect.any(Object),
      });
    });

    it('should send push notifications', async () => {
      const pushService = jest.fn();
      
      const trigger: NotificationTrigger = {
        type: 'mention',
        actor_id: 'user-2',
        target_id: 'user-1',
        resource_type: 'comment',
        resource_id: 'comment-1',
      };

      await triggerNotification(trigger, {
        channels: ['push'],
        pushService,
      });

      expect(pushService).toHaveBeenCalledWith({
        token: 'push-token-123',
        title: expect.any(String),
        body: expect.any(String),
        data: expect.any(Object),
      });
    });

    it('should create in-app notifications', async () => {
      const trigger: NotificationTrigger = {
        type: 'discussion_update',
        actor_id: 'user-2',
        target_id: 'user-1',
        resource_type: 'discussion',
        resource_id: '123',
      };

      const created = await triggerNotification(trigger, {
        channels: ['in_app'],
      });

      expect(created).toBeDefined();
      expect(created).not.toBeNull();
      expect(created!.read_at).toBeNull();
      expect(created!.created_at).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should not notify users about their own actions', async () => {
      const trigger: NotificationTrigger = {
        type: 'comment_reply',
        actor_id: 'user-1',
        target_id: 'user-1', // Same as actor
        resource_type: 'comment',
        resource_id: '1',
      };

      const notification = await triggerNotification(trigger);

      expect(notification).toBeNull();
    });

    it('should not notify blocked users', async () => {
      const trigger: NotificationTrigger = {
        type: 'comment_reply',
        actor_id: 'user-2',
        target_id: 'user-1',
        resource_type: 'comment',
        resource_id: '1',
      };

      // Mock user-1 has blocked user-2
      const notification = await triggerNotification(trigger, {
        checkBlocked: true,
        blockedUsers: ['user-2'],
      });

      expect(notification).toBeNull();
    });

    it('should handle notification failures gracefully', async () => {
      const emailQueue = jest.fn().mockRejectedValue(new Error('Email service down'));
      
      const trigger: NotificationTrigger = {
        id: 'notif-1',
        type: 'comment_reply',
        actor_id: 'user-1',
        target_id: 'user-2',
        resource_type: 'comment',
        resource_id: 'comment-1',
      };

      // Should not throw, but log error
      await expect(triggerNotification(trigger, {
        channels: ['email'],
        emailQueue,
      })).resolves.toBeDefined();
    });
  });
});