// =============================================================================
// CENTRALIZED TYPE SYSTEM - Single Source of Truth (Supabase First)
// =============================================================================

// Re-export all database types as the primary source of truth
export * from './database-types';

// Import what we need for application types
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
  GameCategory as DbGameCategory,
  DifficultyLevel as DbDifficultyLevel,
  QueueStatus as DbQueueStatus,
  BoardCell as DbBoardCell,
} from './database-types';

// =============================================================================
// TYPE ALIASES FOR CLEAN API
// =============================================================================

// Eliminate naming confusion with clean aliases
export type Difficulty = DbDifficultyLevel;
export type GameCategory = DbGameCategory;
export type ActivityType = Enums<'activity_type'>;

// =============================================================================
// TABLE ROW TYPES (Convenience exports)
// =============================================================================

// Bingo domain
export type BingoBoard = Tables<'bingo_boards'>;
export type BingoCard = Tables<'bingo_cards'>;
export type BingoSession = Tables<'bingo_sessions'>;
export type BingoSessionPlayer = Tables<'bingo_session_players'>;
export type BingoSessionQueue = Tables<'bingo_session_queue'>;
export type BingoSessionEvent = Tables<'bingo_session_events'>;
export type BingoSessionCell = Tables<'bingo_session_cells'>;

// User domain
export type User = Tables<'users'>;
export type UserSession = Tables<'user_sessions'>;
export type UserFriend = Tables<'user_friends'>;
export type UserAchievement = Tables<'user_achievements'>;
export type UserActivity = Tables<'user_activity'>;

// Community domain
export type Discussion = Tables<'discussions'>;
export type Comment = Tables<'comments'>;
export type Tag = Tables<'tags'>;
export type TagVote = Tables<'tag_votes'>;
export type TagReport = Tables<'tag_reports'>;
export type TagHistory = Tables<'tag_history'>;

// Other domain
export type Category = Tables<'categories'>;
export type Challenge = Tables<'challenges'>;
export type ChallengeTag = Tables<'challenge_tags'>;
export type Submission = Tables<'submissions'>;
export type BoardBookmark = Tables<'board_bookmarks'>;
export type BoardVote = Tables<'board_votes'>;
export type CardVote = Tables<'card_votes'>;

// =============================================================================
// INSERT/UPDATE TYPES (Convenience exports)
// =============================================================================

export type BingoBoardInsert = TablesInsert<'bingo_boards'>;
export type BingoBoardUpdate = TablesUpdate<'bingo_boards'>;
export type BingoCardInsert = TablesInsert<'bingo_cards'>;
export type BingoCardUpdate = TablesUpdate<'bingo_cards'>;
export type BingoSessionInsert = TablesInsert<'bingo_sessions'>;
export type BingoSessionUpdate = TablesUpdate<'bingo_sessions'>;
export type BingoSessionPlayerInsert = TablesInsert<'bingo_session_players'>;
export type BingoSessionQueueInsert = TablesInsert<'bingo_session_queue'>;
export type BingoSessionQueueUpdate = TablesUpdate<'bingo_session_queue'>;
export type UserActivityInsert = TablesInsert<'user_activity'>;
export type UserActivityUpdate = TablesUpdate<'user_activity'>;

// =============================================================================
// ENHANCED APPLICATION TYPES (extends database types)
// =============================================================================

// NOTE: Enhanced types like GamePlayer, GameBoard, GameSession are now
// defined in domains/bingo.ts to avoid conflicts. Import them from there.

// =============================================================================
// UI/FORM TYPES
// =============================================================================

export interface CreateBoardForm {
  title: string;
  description?: string;
  game_type: GameCategory;
  difficulty: Difficulty;
  size: number;
  is_public: boolean;
  tags?: string[];
  sort?: 'newest' | 'oldest' | 'popular' | 'rating';
}

export interface CreateCardForm {
  title: string;
  description?: string;
  game_type: GameCategory;
  difficulty: Difficulty;
  is_public: boolean;
  tags?: string[];
}

export interface FilterOptions {
  game_type?: GameCategory | 'All Games';
  difficulty?: Difficulty | 'all';
  search?: string;
  tags?: string[];
  is_public?: boolean;
  sort?: 'newest' | 'oldest' | 'popular' | 'rating';
}

// Consolidated Profile Form Data (replaces feature-specific duplicates)
export interface ProfileFormData {
  username?: string;
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  region?: string | null;
  land?: string | null;
  profile_visibility?: Enums<'visibility_type'>;
  achievements_visibility?: Enums<'visibility_type'>;
  submissions_visibility?: Enums<'visibility_type'>;
}

// =============================================================================
// UTILITY TYPES (These are defined in src/types/index.ts - remove duplication)
// =============================================================================

// export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
// export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// API Response wrapper
// export interface ApiResponse<T = unknown> {
//   data: T
//   success: boolean
//   message?: string
//   error?: string
// }

// Pagination
// export interface PaginationParams {
//   page: number
//   limit: number
//   offset?: number
// }

// export interface PaginatedResponse<T> extends ApiResponse<T[]> {
//   pagination: {
//     total: number
//     pages: number
//     current: number
//     hasNext: boolean
//     hasPrev: boolean
//   }
// }

// =============================================================================
// CONSTANTS FOR APPLICATION USE
// =============================================================================

export const DIFFICULTY_OPTIONS: {
  value: Difficulty;
  label: string;
  color: string;
}[] = [
  {
    value: 'beginner',
    label: 'Beginner',
    color: 'bg-green-100 text-green-800',
  },
  { value: 'easy', label: 'Easy', color: 'bg-blue-100 text-blue-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'hard', label: 'Hard', color: 'bg-orange-100 text-orange-800' },
  { value: 'expert', label: 'Expert', color: 'bg-red-100 text-red-800' },
];

// Application constants - exported from here for consistency
export const DIFFICULTIES: Difficulty[] = [
  'beginner',
  'easy',
  'medium',
  'hard',
  'expert',
];

export const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  beginner: 'bg-green-100 text-green-800 border-green-200',
  easy: 'bg-blue-100 text-blue-800 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  hard: 'bg-orange-100 text-orange-800 border-orange-200',
  expert: 'bg-red-100 text-red-800 border-red-200',
};

// Default bingo card template
export const DEFAULT_BINGO_CARD: Omit<BingoCard, 'id'> = {
  title: '',
  difficulty: 'medium',
  game_type: 'All Games',
  description: '',
  tags: [],
  is_public: false,
  votes: 0,
  creator_id: null,
  created_at: null,
  updated_at: null,
};

export const GAME_CATEGORY_OPTIONS: { value: GameCategory; label: string }[] = [
  { value: 'All Games', label: 'All Games' },
  { value: 'World of Warcraft', label: 'World of Warcraft' },
  { value: 'Fortnite', label: 'Fortnite' },
  { value: 'Minecraft', label: 'Minecraft' },
  { value: 'Among Us', label: 'Among Us' },
  { value: 'Apex Legends', label: 'Apex Legends' },
  { value: 'League of Legends', label: 'League of Legends' },
  { value: 'Overwatch', label: 'Overwatch' },
  { value: 'Call of Duty: Warzone', label: 'Call of Duty: Warzone' },
  { value: 'Valorant', label: 'Valorant' },
];

export const PLAYER_COLORS = [
  { name: 'Cyan', color: '#06b6d4', hoverColor: '#0891b2' },
  { name: 'Purple', color: '#8b5cf6', hoverColor: '#7c3aed' },
  { name: 'Pink', color: '#ec4899', hoverColor: '#db2777' },
  { name: 'Green', color: '#10b981', hoverColor: '#059669' },
  { name: 'Orange', color: '#f59e0b', hoverColor: '#d97706' },
  { name: 'Red', color: '#ef4444', hoverColor: '#dc2626' },
  { name: 'Yellow', color: '#eab308', hoverColor: '#ca8a04' },
  { name: 'Indigo', color: '#6366f1', hoverColor: '#4f46e5' },
  { name: 'Teal', color: '#14b8a6', hoverColor: '#0d9488' },
  { name: 'Rose', color: '#f43f5e', hoverColor: '#e11d48' },
  { name: 'Lime', color: '#84cc16', hoverColor: '#65a30d' },
  { name: 'Sky', color: '#0ea5e9', hoverColor: '#0284c7' },
] as const;

// Default values
export const DEFAULT_BOARD_SIZE = 5;
export const MIN_BOARD_SIZE = 3;
export const MAX_BOARD_SIZE = 6;
export const DEFAULT_MAX_PLAYERS = 4;
export const MAX_PLAYERS = 12;

// =============================================================================
// VALIDATION RULES (Consolidated from features)
// =============================================================================

export const VALIDATION_RULES = {
  username: {
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_-]+$/,
    reserved: [
      'admin',
      'moderator', 
      'support',
      'api',
      'www',
      'app',
      'root',
      'system',
    ],
  },
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },
  bio: {
    maxLength: 500,
  },
  fullName: {
    maxLength: 100,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  displayName: {
    minLength: 3,
    maxLength: 20,
  },
} as const;

export type ValidationRules = typeof VALIDATION_RULES;

// =============================================================================
// DOMAIN TYPE RE-EXPORTS
// =============================================================================

// Re-export domain-specific types for convenience
export * from './domains/bingo';
export * from './domains/community';
