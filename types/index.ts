// =============================================================================
// CENTRALIZED TYPE SYSTEM - Single Source of Truth (Supabase Generated)
// =============================================================================

// Import everything as namespace to avoid conflicts with re-exports
import type * as DatabaseTypes from './database-generated';

// Re-export essential database types directly (primary source of truth)
export type {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from './database-generated';

// =============================================================================
// TYPE ALIASES FOR CLEAN API
// =============================================================================

// Clean type aliases for application use
export type Difficulty = DatabaseTypes.Enums<'difficulty_level'>;
export type DifficultyLevel = Difficulty; // Backward compatibility
export type GameCategory = DatabaseTypes.Enums<'game_category'>;
export type ActivityType = DatabaseTypes.Enums<'activity_type'>;
export type QueueStatus = DatabaseTypes.Enums<'queue_status'>;
export type BoardStatus = DatabaseTypes.Enums<'board_status'>;
export type SessionStatus = DatabaseTypes.Enums<'session_status'>;
export type UserRole = DatabaseTypes.Enums<'user_role'>;
export type VisibilityType = DatabaseTypes.Enums<'visibility_type'>;
export type VoteType = DatabaseTypes.Enums<'vote_type'>;
export type TagAction = DatabaseTypes.Enums<'tag_action'>;
export type TagStatus = DatabaseTypes.Enums<'tag_status'>;
export type TagType = DatabaseTypes.Enums<'tag_type'>;
export type ChallengeStatus = DatabaseTypes.Enums<'challenge_status'>;
export type SubmissionStatus = DatabaseTypes.Enums<'submission_status'>;

// Composite types
export type BoardCell = DatabaseTypes.CompositeTypes<'board_cell'>;
export type BoardSettings = DatabaseTypes.CompositeTypes<'board_settings'>;
export type SessionSettings = DatabaseTypes.CompositeTypes<'session_settings'>;
export type TagCategory = DatabaseTypes.CompositeTypes<'tag_category'>;
export type WinConditions = DatabaseTypes.CompositeTypes<'win_conditions'>;

// JSON type for compatibility
export type Json =
  DatabaseTypes.Database['public']['Tables']['bingo_boards']['Row']['board_state'];

// =============================================================================
// TABLE ROW TYPES (Convenience exports)
// =============================================================================

// Bingo domain
export type BingoBoard = DatabaseTypes.Tables<'bingo_boards'>;
export type BingoCard = DatabaseTypes.Tables<'bingo_cards'>;
export type BingoSession = DatabaseTypes.Tables<'bingo_sessions'>;
export type BingoSessionPlayer = DatabaseTypes.Tables<'bingo_session_players'>;
export type BingoSessionQueue = DatabaseTypes.Tables<'bingo_session_queue'>;
export type BingoSessionEvent = DatabaseTypes.Tables<'bingo_session_events'>;
export type BingoSessionCell = DatabaseTypes.Tables<'bingo_session_cells'>;

// View types - Extract from the database type directly to avoid type constraint issues
export type SessionStats =
  DatabaseTypes.Database['public']['Views']['session_stats']['Row'];

// User domain
export type User = DatabaseTypes.Tables<'users'>;
export type UserSession = DatabaseTypes.Tables<'user_sessions'>;
export type UserFriend = DatabaseTypes.Tables<'user_friends'>;
export type UserAchievement = DatabaseTypes.Tables<'user_achievements'>;
export type UserActivity = DatabaseTypes.Tables<'user_activity'>;

// Community domain
export type Discussion = DatabaseTypes.Tables<'discussions'>;
export type Comment = DatabaseTypes.Tables<'comments'>;
export type Tag = DatabaseTypes.Tables<'tags'>;
export type TagVote = DatabaseTypes.Tables<'tag_votes'>;
export type TagReport = DatabaseTypes.Tables<'tag_reports'>;
export type TagHistory = DatabaseTypes.Tables<'tag_history'>;

// Other domain
export type Category = DatabaseTypes.Tables<'categories'>;
export type Challenge = DatabaseTypes.Tables<'challenges'>;
export type ChallengeTag = DatabaseTypes.Tables<'challenge_tags'>;
export type Submission = DatabaseTypes.Tables<'submissions'>;
export type BoardBookmark = DatabaseTypes.Tables<'board_bookmarks'>;
export type BoardVote = DatabaseTypes.Tables<'board_votes'>;
export type CardVote = DatabaseTypes.Tables<'card_votes'>;

// =============================================================================
// INSERT/UPDATE TYPES (Convenience exports)
// =============================================================================

export type BingoBoardInsert = DatabaseTypes.TablesInsert<'bingo_boards'>;
export type BingoBoardUpdate = DatabaseTypes.TablesUpdate<'bingo_boards'>;
export type BingoCardInsert = DatabaseTypes.TablesInsert<'bingo_cards'>;
export type BingoCardUpdate = DatabaseTypes.TablesUpdate<'bingo_cards'>;
export type BingoSessionInsert = DatabaseTypes.TablesInsert<'bingo_sessions'>;
export type BingoSessionUpdate = DatabaseTypes.TablesUpdate<'bingo_sessions'>;
export type BingoSessionPlayerInsert =
  DatabaseTypes.TablesInsert<'bingo_session_players'>;
export type BingoSessionQueueInsert =
  DatabaseTypes.TablesInsert<'bingo_session_queue'>;
export type BingoSessionQueueUpdate =
  DatabaseTypes.TablesUpdate<'bingo_session_queue'>;
export type UserActivityInsert = DatabaseTypes.TablesInsert<'user_activity'>;
export type UserActivityUpdate = DatabaseTypes.TablesUpdate<'user_activity'>;

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
  profile_visibility?: DatabaseTypes.Enums<'visibility_type'>;
  achievements_visibility?: DatabaseTypes.Enums<'visibility_type'>;
  submissions_visibility?: DatabaseTypes.Enums<'visibility_type'>;
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

// Constants object for backward compatibility
export const Constants = {
  public: {
    Enums: {
      difficulty_level: [
        'beginner',
        'easy',
        'medium',
        'hard',
        'expert',
      ] as const,
      game_category: [
        'All Games',
        'World of Warcraft',
        'Fortnite',
        'Minecraft',
        'Among Us',
        'Apex Legends',
        'League of Legends',
        'Overwatch',
        'Call of Duty: Warzone',
        'Valorant',
        'CS:GO',
        'Dota 2',
        'Rocket League',
        'Fall Guys',
        'Dead by Daylight',
        'Cyberpunk 2077',
        'The Witcher 3',
        'Elden Ring',
        'Dark Souls',
        'Bloodborne',
        'Sekiro',
        'Hollow Knight',
        'Celeste',
        'Hades',
        'The Binding of Isaac',
        'Risk of Rain 2',
        'Deep Rock Galactic',
        'Valheim',
        'Subnautica',
        "No Man's Sky",
        'Terraria',
        'Stardew Valley',
        'Animal Crossing',
        'Splatoon 3',
        'Super Mario Odyssey',
        'The Legend of Zelda: Breath of the Wild',
        'Super Smash Bros. Ultimate',
      ] as const,
    },
  },
} as const;

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

// =============================================================================
// TABLE TYPE HELPERS
// =============================================================================

// Type aliases for common table types
export type GameResult = DatabaseTypes.Tables<'game_results'>;
// Tables type is already re-exported above
