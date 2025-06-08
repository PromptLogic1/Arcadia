import type { Database } from '@/types/database.types';

// Base types from database
export type UserRow = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

// Enhanced profile types
export interface UserProfile extends UserRow {
  // Computed fields
  totalExperiencePoints: number;
  achievementCount: number;
  bingoGamesPlayed: number;
  challengesCompleted: number;
  friendsCount: number;

  // Recent activity
  recentAchievements: UserAchievement[];
  recentSubmissions: RecentSubmission[];
  recentBingoGames: RecentBingoGame[];
}

export interface UserAchievement {
  id: string;
  achievement_name: string;
  achievement_type: string;
  description: string | null;
  points: number;
  unlocked_at: string;
  metadata?: {
    gameType?: string;
    difficulty?: string;
    category?: string;
  };
}

export interface RecentSubmission {
  id: string;
  challenge_title: string;
  language: string;
  status: Database['public']['Enums']['submission_status'];
  created_at: string;
}

export interface RecentBingoGame {
  session_id: string;
  board_title: string;
  game_type: Database['public']['Enums']['game_category'];
  difficulty: Database['public']['Enums']['difficulty_level'];
  result: 'won' | 'lost' | 'ongoing';
  created_at: string;
}

// Profile statistics
export interface ProfileStatistics {
  overview: {
    totalExperience: number;
    totalAchievements: number;
    currentLevel: number;
    nextLevelProgress: number;
  };
  bingo: {
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
    favoriteGameType: Database['public']['Enums']['game_category'];
    totalCellsCompleted: number;
  };
  challenges: {
    attempted: number;
    completed: number;
    successRate: number;
    favoriteLanguage: string;
    totalSubmissions: number;
  };
  social: {
    friendsCount: number;
    discussionsStarted: number;
    commentsPosted: number;
    totalUpvotes: number;
  };
}

// Profile privacy settings
export interface PrivacySettings {
  profile_visibility: Database['public']['Enums']['visibility_type'];
  achievements_visibility: Database['public']['Enums']['visibility_type'];
  submissions_visibility: Database['public']['Enums']['visibility_type'];
  showLocation: boolean;
  showRealName: boolean;
  allowFriendRequests: boolean;
  showOnlineStatus: boolean;
}

// Form types for profile editing
export interface ProfileUpdateForm {
  username?: string;
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  land?: string | null;
  region?: string | null;
  city?: string | null;
  privacy: PrivacySettings;
}

// Validation schema types
export interface ProfileValidation {
  username: {
    isValid: boolean;
    errors: string[];
    isAvailable?: boolean;
  };
  bio: {
    isValid: boolean;
    errors: string[];
    charCount: number;
    maxChars: number;
  };
  location: {
    isValid: boolean;
    errors: string[];
  };
}

// API response types
export interface UserProfileResponse {
  profile: UserProfile;
  statistics: ProfileStatistics;
  canView: {
    profile: boolean;
    achievements: boolean;
    submissions: boolean;
  };
}

export interface ProfileUpdateResponse {
  success: boolean;
  profile: UserProfile;
  errors?: Record<string, string[]>;
}

// Experience and leveling system
export interface ExperienceLevel {
  level: number;
  requiredXP: number;
  title: string;
  perks: string[];
  badgeUrl?: string;
}

export const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  { level: 1, requiredXP: 0, title: 'Newcomer', perks: ['Basic features'] },
  {
    level: 2,
    requiredXP: 100,
    title: 'Explorer',
    perks: ['Profile customization'],
  },
  {
    level: 3,
    requiredXP: 250,
    title: 'Challenger',
    perks: ['Custom bingo boards'],
  },
  {
    level: 4,
    requiredXP: 500,
    title: 'Strategist',
    perks: ['Advanced statistics'],
  },
  {
    level: 5,
    requiredXP: 1000,
    title: 'Master',
    perks: ['Priority support', 'Beta features'],
  },
] as const;

// Utility functions types
export interface ProfileUtils {
  calculateLevel: (experience: number) => ExperienceLevel;
  getNextLevel: (currentLevel: number) => ExperienceLevel | null;
  getProgressToNextLevel: (experience: number) => number;
  canViewProfile: (
    viewerRole: Database['public']['Enums']['user_role'],
    profileSettings: PrivacySettings
  ) => boolean;
}
