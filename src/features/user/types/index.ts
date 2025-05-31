import type {
  TablesInsert,
  TablesUpdate,
  User,
  UserAchievement,
  UserRole,
  VisibilityType,
} from '@/types';

// Extended user types
export interface UserProfile extends User {
  total_achievements?: number;
  total_points?: number;
  friend_count?: number;
  boards_created?: number;
  challenges_completed?: number;
  join_date?: string;
  is_friend?: boolean;
  friend_status?: 'pending' | 'accepted' | 'blocked';
  mutual_friends?: number;
}

export interface UserWithStats extends User {
  stats: UserStats;
  recent_activity: UserActivity[];
  achievements: UserAchievement[];
}

export interface UserStats {
  total_boards_created: number;
  total_games_played: number;
  total_wins: number;
  win_rate: number;
  total_challenges_completed: number;
  total_submissions: number;
  total_points: number;
  total_achievements: number;
  current_streak: number;
  longest_streak: number;
  favorite_game?: string;
  rank?: number;
  level?: number;
  next_level_points?: number;
}

export interface UserActivity {
  id: string;
  type:
    | 'board_created'
    | 'game_won'
    | 'challenge_completed'
    | 'achievement_unlocked'
    | 'friend_added';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Achievement types
export interface AchievementWithProgress extends UserAchievement {
  progress?: number;
  max_progress?: number;
  percentage?: number;
  is_unlocked: boolean;
}

export interface AchievementCategory {
  id: string;
  name: string;
  description: string;
  achievements: AchievementWithProgress[];
  total_points: number;
  unlocked_count: number;
}

// Friend system types
export interface FriendRequest {
  id: string;
  from_user: UserProfile;
  to_user: UserProfile;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at?: string;
}

export interface FriendshipStatus {
  are_friends: boolean;
  status: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked';
  request_id?: string;
}

// Form types
export interface UpdateProfileFormData {
  username?: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  city?: string;
  region?: string;
  land?: string;
  profile_visibility?: VisibilityType;
  achievements_visibility?: VisibilityType;
  submissions_visibility?: VisibilityType;
}

export interface PrivacySettingsFormData {
  profile_visibility: VisibilityType;
  achievements_visibility: VisibilityType;
  submissions_visibility: VisibilityType;
}

export interface NotificationSettingsFormData {
  email_notifications: boolean;
  friend_requests: boolean;
  achievement_notifications: boolean;
  game_invites: boolean;
  challenge_updates: boolean;
  weekly_digest: boolean;
}

// Search and filter types
export interface UserSearchFilters {
  query?: string;
  role?: UserRole;
  region?: string;
  land?: string;
  min_points?: number;
  max_points?: number;
  is_online?: boolean;
}

export type UserSortBy =
  | 'username_asc'
  | 'username_desc'
  | 'points_asc'
  | 'points_desc'
  | 'joined_asc'
  | 'joined_desc'
  | 'last_active';

export interface UserSearchOptions {
  filters: UserSearchFilters;
  sort: UserSortBy;
  page: number;
  limit: number;
}

// Leaderboard types
export interface LeaderboardUser {
  user_id: string;
  username: string;
  avatar_url?: string;
  total_points: number;
  total_achievements: number;
  rank: number;
  rank_change?: number;
  level?: number;
}

export interface Leaderboard {
  type: 'points' | 'achievements' | 'challenges' | 'games_won';
  users: LeaderboardUser[];
  user_rank?: number;
  total_users: number;
  last_updated: string;
}

// Session management types
export interface ActiveSession {
  id: string;
  device_info?: {
    userAgent?: string;
    platform?: string;
    browser?: string;
    os?: string;
  };
  ip_address?: string;
  location?: {
    city?: string;
    country?: string;
  };
  created_at: string;
  last_activity: string;
  is_current: boolean;
}

// Component prop types
export interface UserCardProps {
  user: UserProfile;
  showStats?: boolean;
  showFriendButton?: boolean;
  onClick?: () => void;
  className?: string;
}

export interface UserProfileProps {
  user: UserWithStats;
  isOwner?: boolean;
  onEdit?: () => void;
  onFriendAction?: (action: 'add' | 'remove' | 'block') => void;
}

export interface AchievementListProps {
  achievements: AchievementWithProgress[];
  showProgress?: boolean;
  groupByCategory?: boolean;
  className?: string;
}

export interface FriendListProps {
  friends: UserProfile[];
  onFriendClick?: (friend: UserProfile) => void;
  onRemoveFriend?: (friendId: string) => void;
  loading?: boolean;
}

// Validation types
export interface ProfileValidationRules {
  username: {
    minLength: number;
    maxLength: number;
    pattern: RegExp;
    reserved: string[];
  };
  bio: {
    maxLength: number;
  };
  fullName: {
    maxLength: number;
  };
}

// Insert/update types
export type UserInsert = TablesInsert<'users'>;
export type UserUpdate = TablesUpdate<'users'>;
export type UserAchievementInsert = TablesInsert<'user_achievements'>;
export type UserFriendInsert = TablesInsert<'user_friends'>;

// Constants
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  user: 'User',
  premium: 'Premium',
  moderator: 'Moderator',
  admin: 'Administrator',
} as const;

export const VISIBILITY_LABELS: Record<VisibilityType, string> = {
  public: 'Public',
  friends: 'Friends Only',
  private: 'Private',
} as const;

export const PROFILE_VALIDATION: ProfileValidationRules = {
  username: {
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_-]+$/,
    reserved: ['admin', 'moderator', 'support', 'api', 'www', 'app'],
  },
  bio: {
    maxLength: 500,
  },
  fullName: {
    maxLength: 100,
  },
} as const;

export const ACHIEVEMENT_TYPES = {
  BOARD_CREATOR: 'board_creator',
  GAME_MASTER: 'game_master',
  CHALLENGE_SOLVER: 'challenge_solver',
  SOCIAL_BUTTERFLY: 'social_butterfly',
  STREAK_KEEPER: 'streak_keeper',
  COMMUNITY_HELPER: 'community_helper',
} as const;

export const LEVELS = [
  { level: 1, points: 0, title: 'Rookie' },
  { level: 2, points: 100, title: 'Player' },
  { level: 3, points: 250, title: 'Competitor' },
  { level: 4, points: 500, title: 'Expert' },
  { level: 5, points: 1000, title: 'Master' },
  { level: 6, points: 2000, title: 'Grandmaster' },
  { level: 7, points: 5000, title: 'Legend' },
] as const;
