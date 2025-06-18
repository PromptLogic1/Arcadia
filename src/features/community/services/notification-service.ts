// Notification Service - Business Logic for Community Notifications
// This file contains the core notification logic extracted from E2E tests

export interface NotificationTrigger {
  type: NotificationType;
  actor_id: string;
  target_id: string;
  resource_type: 'discussion' | 'comment' | 'user' | 'team' | 'report';
  resource_id: string;
  parent_id?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  in_app_notifications: boolean;
  comment_replies: boolean;
  discussion_updates: boolean;
  mentions: boolean;
  upvotes: boolean;
  new_followers: boolean;
  weekly_digest: boolean;
  promotional: boolean;
  quiet_hours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

export interface NotificationContext {
  resource_type: string;
  resource_id: string;
  notification_type?: string;
  exclude_users?: string[];
  metadata?: Record<string, unknown>;
}

export interface NotificationBatch {
  type: string;
  count: number;
  actors: string[];
  recipient_id: string;
  resource_type: string;
  resource_id: string;
  created_at: string;
}

export interface NotificationContent {
  title: string;
  body: string;
  preview?: string;
  details?: string;
  action_url?: string;
}


export type NotificationType = 
  | 'comment_reply'
  | 'mention'
  | 'discussion_update'
  | 'upvote'
  | 'upvote_batch'
  | 'new_follower'
  | 'content_removed'
  | 'content_approved'
  | 'account_security'
  | 'team_mention'
  | 'content_reported'
  | 'new_discussion'
  | 'weekly_digest';

export interface Notification {
  id?: string;
  type: NotificationType;
  recipient_id: string;
  actor_id?: string;
  resource_type?: string;
  resource_id?: string;
  title?: string;
  body?: string;
  read_at?: string | null;
  created_at?: string;
  metadata?: Record<string, unknown>;
  // Additional properties for batched notifications
  actors?: string[];
  count?: number;
}

// Extended notification interface for formatting with actor and resource data
export interface NotificationForFormatting {
  type: NotificationType;
  actor: { username: string };
  resource: {
    type?: string;
    id?: string;
    content?: string;
    title?: string;
    discussion_title?: string;
  };
  metadata?: Record<string, unknown>;
  // For batch notifications
  actors?: Array<{ username: string }>;
  count?: number;
}

// Create and trigger a notification
export async function triggerNotification(
  trigger: NotificationTrigger,
  options: {
    channels?: string[];
    checkBlocked?: boolean;
    blockedUsers?: string[];
    emailQueue?: (email: unknown) => void;
    pushService?: (push: unknown) => void;
  } = {}
): Promise<Notification | null> {
  const { actor_id, target_id, type } = trigger;

  // Don't notify users about their own actions
  if (actor_id === target_id) {
    return null;
  }

  // Check if target has blocked actor
  if (options.checkBlocked && options.blockedUsers?.includes(actor_id)) {
    return null;
  }

  // Create notification
  const notification: Notification = {
    id: `notif-${Date.now()}-${Math.random()}`,
    type,
    recipient_id: target_id,
    actor_id,
    resource_type: trigger.resource_type,
    resource_id: trigger.resource_id,
    created_at: new Date().toISOString(),
    metadata: trigger.metadata,
  };

  // Generate content
  const content = await formatNotificationContent({
    type,
    actor: { username: `user-${actor_id}` }, // Mock data
    resource: {
      type: trigger.resource_type,
      id: trigger.resource_id,
      content: trigger.metadata?.content as string || 'Content',
    },
    metadata: trigger.metadata,
  });

  notification.title = content.title;
  notification.body = content.body;

  // Send via different channels
  const channels = options.channels || ['in_app'];
  
  try {
    if (channels.includes('email') && options.emailQueue) {
      await options.emailQueue({
        to: `${target_id}@example.com`,
        subject: content.title,
        template: type,
        data: { notification, content },
      });
    }

    if (channels.includes('push') && options.pushService) {
      await options.pushService({
        token: `push-token-${target_id}`,
        title: content.title,
        body: content.body,
        data: { notification },
      });
    }

    if (channels.includes('in_app')) {
      // Store in database (mock)
      console.log('Created in-app notification:', notification);
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
    // Continue execution - don't fail the original operation
  }

  return notification;
}

// Check if notification should be sent based on preferences
export function shouldSendNotification(
  type: NotificationType,
  preferences: NotificationPreferences,
  options: {
    checkQuietHours?: boolean;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  } = {}
): boolean {
  // Always send critical notifications
  if (options.priority === 'critical') {
    return true;
  }

  // Always send high priority notifications (security, moderation)
  if (options.priority === 'high' && ['content_removed', 'account_security'].includes(type)) {
    return true;
  }

  // Check general notification preferences
  if (!preferences.in_app_notifications) {
    return false;
  }

  // Check specific notification type preferences
  switch (type) {
    case 'comment_reply':
      if (!preferences.comment_replies) return false;
      break;
    case 'discussion_update':
      if (!preferences.discussion_updates) return false;
      break;
    case 'mention':
      if (!preferences.mentions) return false;
      break;
    case 'upvote':
    case 'upvote_batch':
      if (!preferences.upvotes) return false;
      break;
    case 'new_follower':
      if (!preferences.new_followers) return false;
      break;
    case 'weekly_digest':
      if (!preferences.weekly_digest) return false;
      break;
    default:
      break;
  }

  // Check quiet hours
  if (options.checkQuietHours && preferences.quiet_hours.enabled) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { start, end } = preferences.quiet_hours;
    
    // Handle quiet hours that span midnight
    if (start > end) {
      if (currentTime >= start || currentTime <= end) {
        return false;
      }
    } else {
      if (currentTime >= start && currentTime <= end) {
        return false;
      }
    }
  }

  return true;
}

// Get notification recipients based on context
export async function getNotificationRecipients(
  context: NotificationContext,
  candidateUsers: string[]
): Promise<string[]> {
  let recipients = [...candidateUsers];

  // Remove excluded users
  if (context.exclude_users) {
    recipients = recipients.filter(user => !context.exclude_users!.includes(user));
  }

  // Apply context-specific filtering
  switch (context.resource_type) {
    case 'discussion':
      // For discussion updates, include author and commenters
      break;
    
    case 'user':
      // For user actions, include followers
      break;
    
    case 'team':
      // For team mentions, include all team members
      break;
    
    case 'report':
      // For reports, include moderators
      break;
  }

  return recipients;
}

// Batch similar notifications
export async function batchNotifications(
  notifications: Notification[],
  options: {
    timeWindow?: number; // milliseconds
  } = {}
): Promise<NotificationBatch[]> {
  const timeWindow = options.timeWindow || 30 * 60 * 1000; // 30 minutes
  const batches: NotificationBatch[] = [];
  const processed = new Set<number>();

  notifications.forEach((notification, index) => {
    if (processed.has(index)) return;

    const similar = notifications.filter((other, otherIndex) => {
      if (otherIndex === index || processed.has(otherIndex)) return false;
      
      // Same type and recipient
      if (other.type !== notification.type || 
          other.recipient_id !== notification.recipient_id) {
        return false;
      }

      // Same resource
      if (other.resource_id !== notification.resource_id) {
        return false;
      }

      // Within time window
      const timeDiff = Math.abs(
        new Date(other.created_at || Date.now()).getTime() - 
        new Date(notification.created_at || Date.now()).getTime()
      );
      
      return timeDiff <= timeWindow;
    });

    if (similar.length > 0) {
      // Create batch
      const allNotifications = [notification, ...similar];
      const actors = allNotifications
        .map(n => n.actor_id)
        .filter((id): id is string => id !== undefined)
        .filter((id, index, array) => array.indexOf(id) === index);

      batches.push({
        type: `${notification.type}_batch`,
        count: allNotifications.length,
        actors,
        recipient_id: notification.recipient_id,
        resource_type: notification.resource_type || '',
        resource_id: notification.resource_id || '',
        created_at: new Date().toISOString(),
      });

      // Mark as processed
      processed.add(index);
      similar.forEach((similarNotification) => {
        const originalIndex = notifications.indexOf(similarNotification);
        if (originalIndex !== -1) {
          processed.add(originalIndex);
        }
      });
    } else {
      // Single notification
      batches.push({
        type: notification.type,
        count: 1,
        actors: notification.actor_id ? [notification.actor_id] : [],
        recipient_id: notification.recipient_id,
        resource_type: notification.resource_type || '',
        resource_id: notification.resource_id || '',
        created_at: notification.created_at || new Date().toISOString(),
      });
      processed.add(index);
    }
  });

  return batches;
}

// Format notification content for display
export async function formatNotificationContent(notification: NotificationForFormatting): Promise<NotificationContent> {
  const { type, actor, resource, metadata } = notification;

  switch (type) {
    case 'comment_reply':
      return {
        title: `New reply from ${actor.username}`,
        body: `${actor.username} replied to your comment in "${resource.discussion_title || 'a discussion'}"`,
        preview: truncateText(resource.content || '', 200),
      };

    case 'mention':
      return {
        title: `${actor.username} mentioned you`,
        body: `${actor.username} mentioned you in a ${resource.type}`,
        preview: truncateText(resource.content || '', 200),
      };

    case 'discussion_update':
      return {
        title: 'New activity in your discussion',
        body: `${actor.username} commented on your discussion`,
        preview: truncateText(resource.content || '', 200),
      };

    case 'upvote':
      return {
        title: 'Your content was upvoted',
        body: `${actor.username} upvoted your ${resource.type}`,
        preview: truncateText(resource.content || '', 200),
      };

    case 'upvote_batch': {
      const actorNames = notification.actors?.slice(0, 3).map(a => a.username).join(', ');
      const othersCount = Math.max(0, (notification.count || 0) - 3);
      const othersText = othersCount > 0 ? ` and ${othersCount} others` : '';
      
      return {
        title: `${notification.count} new upvotes`,
        body: `${actorNames}${othersText} upvoted your ${resource.type}`,
        preview: truncateText(resource.content || '', 200),
      };
    }

    case 'new_follower':
      return {
        title: 'New follower',
        body: `${actor.username} started following you`,
      };

    case 'content_removed':
      return {
        title: 'Content removed',
        body: `Your ${resource.type} "${resource.title || 'content'}" was removed`,
        details: `Reason: ${metadata?.reason}\n${metadata?.action_details || ''}`,
      };

    case 'content_approved':
      return {
        title: 'Content approved',
        body: `Your ${resource.type} was approved after review`,
      };

    default:
      return {
        title: 'New notification',
        body: 'You have a new notification',
      };
  }
}

// Helper function to truncate text
function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text || '';
  }
  
  return text.substring(0, maxLength - 3) + '...';
}

// Mark notifications as read
export async function markNotificationsAsRead(
  notificationIds: string[],
  userId: string
): Promise<void> {
  // Mock implementation
  console.log(`Marked notifications as read for user ${userId}:`, notificationIds);
}

// Get unread notification count
export async function getUnreadNotificationCount(_userId: string): Promise<number> {
  // Mock implementation
  return Math.floor(Math.random() * 10);
}

// Clean up old notifications
export async function cleanupOldNotifications(olderThanDays = 30): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  console.log(`Cleaning up notifications older than ${cutoffDate.toISOString()}`);
  // Mock implementation
}