import type { Database } from '@/types/database.types';

// Database types
export type UserActivityRow =
  Database['public']['Tables']['user_activity']['Row'];
export type UserActivityInsert =
  Database['public']['Tables']['user_activity']['Insert'];
export type ActivityType = Database['public']['Enums']['activity_type'];

// Enhanced activity types
export interface UserActivity extends UserActivityRow {
  user?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

// Activity data schemas by type
export interface LoginActivityData {
  device?: string;
  browser?: string;
  ip_address?: string;
  location?: string;
}

export interface BoardActivityData {
  board_id: string;
  board_title: string;
  game_type: Database['public']['Enums']['game_category'];
  difficulty: Database['public']['Enums']['difficulty_level'];
  session_id?: string;
  score?: number;
  completion_time?: number;
}

export interface SubmissionActivityData {
  challenge_id: string;
  challenge_title: string;
  language: string;
  status: Database['public']['Enums']['submission_status'];
  execution_time?: number;
  memory_usage?: number;
  test_cases_passed?: number;
  total_test_cases?: number;
}

export interface DiscussionActivityData {
  discussion_id: number;
  title: string;
  game: string;
  tags?: string[];
}

export interface CommentActivityData {
  comment_id: number;
  discussion_id: number;
  discussion_title: string;
  content_preview: string;
}

export interface AchievementActivityData {
  achievement_id: string;
  achievement_name: string;
  achievement_type: string;
  points: number;
  category?: string;
}

// Union type for all activity data
export type ActivityData =
  | LoginActivityData
  | BoardActivityData
  | SubmissionActivityData
  | DiscussionActivityData
  | CommentActivityData
  | AchievementActivityData;

// Type guards for activity data validation
export function isBoardActivityData(
  data: ActivityData
): data is BoardActivityData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'board_id' in data &&
    'board_title' in data &&
    typeof data.board_id === 'string' &&
    typeof data.board_title === 'string'
  );
}

export function isSubmissionActivityData(
  data: ActivityData
): data is SubmissionActivityData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'challenge_id' in data &&
    'challenge_title' in data &&
    typeof data.challenge_id === 'string' &&
    typeof data.challenge_title === 'string'
  );
}

export function isDiscussionActivityData(
  data: ActivityData
): data is DiscussionActivityData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'discussion_id' in data &&
    'title' in data &&
    typeof data.discussion_id === 'number' &&
    typeof data.title === 'string'
  );
}

export function isCommentActivityData(
  data: ActivityData
): data is CommentActivityData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'comment_id' in data &&
    'discussion_title' in data &&
    typeof data.comment_id === 'number' &&
    typeof data.discussion_title === 'string'
  );
}

export function isAchievementActivityData(
  data: ActivityData
): data is AchievementActivityData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'achievement_id' in data &&
    'achievement_name' in data &&
    typeof data.achievement_id === 'string' &&
    typeof data.achievement_name === 'string'
  );
}

export function isLoginActivityData(
  data: ActivityData
): data is LoginActivityData {
  return data !== null && typeof data === 'object';
}

// Activity with typed data
export interface TypedUserActivity<T extends ActivityType>
  extends Omit<UserActivity, 'data'> {
  activity_type: T;
  data: T extends 'login' | 'logout'
    ? LoginActivityData
    : T extends 'board_create' | 'board_join' | 'board_complete'
      ? BoardActivityData
      : T extends 'submission_create'
        ? SubmissionActivityData
        : T extends 'discussion_create'
          ? DiscussionActivityData
          : T extends 'comment_create'
            ? CommentActivityData
            : T extends 'achievement_unlock'
              ? AchievementActivityData
              : Record<string, unknown>;
}

// Activity feed types
export interface ActivityFeedItem {
  id: string;
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  activity_type: ActivityType;
  message: string;
  data: ActivityData;
  timestamp: string;
  icon: string;
  color: string;
}

export interface ActivityFeedOptions {
  limit?: number;
  offset?: number;
  user_id?: string;
  activity_types?: ActivityType[];
  start_date?: string;
  end_date?: string;
}

// Real-time activity types
export interface RealtimeActivityUpdate {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  activity: UserActivity;
}

// Activity statistics
export interface ActivityStats {
  total_activities: number;
  activities_today: number;
  activities_this_week: number;
  activities_this_month: number;
  most_active_type: ActivityType;
  streak_days: number;
  last_activity: string | null;
}

export interface DailyActivityCount {
  date: string;
  count: number;
  types: Record<ActivityType, number>;
}

// Activity preferences
export interface ActivityNotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  activity_types: ActivityType[];
  digest_frequency: 'daily' | 'weekly' | 'monthly' | 'never';
}

// API response types
export interface ActivityFeedResponse {
  activities: ActivityFeedItem[];
  total_count: number;
  has_more: boolean;
  next_cursor?: string;
}

export interface ActivityStatsResponse {
  stats: ActivityStats;
  daily_counts: DailyActivityCount[];
  activity_distribution: Record<ActivityType, number>;
}

// Form types
export interface LogActivityRequest {
  activity_type: ActivityType;
  data?: ActivityData;
}

// Utility types
export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  login: '🔑',
  logout: '🚪',
  board_create: '🎯',
  board_join: '🎮',
  board_complete: '🏆',
  submission_create: '💻',
  discussion_create: '💬',
  comment_create: '📝',
  achievement_unlock: '🏅',
};

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  login: 'green',
  logout: 'gray',
  board_create: 'blue',
  board_join: 'purple',
  board_complete: 'yellow',
  submission_create: 'cyan',
  discussion_create: 'pink',
  comment_create: 'orange',
  achievement_unlock: 'gold',
};

export const ACTIVITY_MESSAGES: Record<
  ActivityType,
  (data: ActivityData, username: string) => string
> = {
  login: (data, username) => `${username} logged in`,
  logout: (data, username) => `${username} logged out`,
  board_create: (data, username) => {
    if (isBoardActivityData(data)) {
      return `${username} created a new bingo board: ${data.board_title}`;
    }
    return `${username} created a new bingo board`;
  },
  board_join: (data, username) => {
    if (isBoardActivityData(data)) {
      return `${username} joined a bingo game: ${data.board_title}`;
    }
    return `${username} joined a bingo game`;
  },
  board_complete: (data, username) => {
    if (isBoardActivityData(data)) {
      return `${username} completed a bingo board: ${data.board_title}`;
    }
    return `${username} completed a bingo board`;
  },
  submission_create: (data, username) => {
    if (isSubmissionActivityData(data)) {
      return `${username} submitted a solution for: ${data.challenge_title}`;
    }
    return `${username} submitted a solution`;
  },
  discussion_create: (data, username) => {
    if (isDiscussionActivityData(data)) {
      return `${username} started a discussion: ${data.title}`;
    }
    return `${username} started a discussion`;
  },
  comment_create: (data, username) => {
    if (isCommentActivityData(data)) {
      return `${username} commented on: ${data.discussion_title}`;
    }
    return `${username} commented on a discussion`;
  },
  achievement_unlock: (data, username) => {
    if (isAchievementActivityData(data)) {
      return `${username} unlocked achievement: ${data.achievement_name}`;
    }
    return `${username} unlocked an achievement`;
  },
};
