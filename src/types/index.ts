// =============================================================================
// APPLICATION TYPE SYSTEM - Single Source of Truth (Database-Generated Types)
// =============================================================================

// Re-export everything from the root types (database-generated)
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
  // Type aliases
  Difficulty,
  DifficultyLevel,
  GameCategory,
  ActivityType,
  QueueStatus,
  BoardStatus,
  SessionStatus,
  UserRole,
  VisibilityType,
  VoteType,
  TagAction,
  TagStatus,
  TagType,
  ChallengeStatus,
  SubmissionStatus,
  BoardCell,
  BoardSettings,
  SessionSettings,
  TagCategory,
  WinConditions,
  // Table row types
  BingoBoard,
  BingoCard,
  BingoSession,
  BingoSessionPlayer,
} from '../../types';

// Application-specific product types
export * from './product-types';

// Import the specific types we need for constants and helpers
import type { Difficulty, GameCategory, BingoCard } from '../../types';

// =============================================================================
// CONSTANTS (derived from database types)
// =============================================================================

// Export constants for backward compatibility
export const Constants = {
  public: {
    Enums: {
      difficulty_level: ['beginner', 'easy', 'medium', 'hard', 'expert'] as const,
      game_category: ['All Games', 'World of Warcraft', 'Fortnite', 'Minecraft'] as const,
    }
  }
} as const;

// Application constants derived from database types
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

export const GAME_CATEGORIES: GameCategory[] = [
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
];

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// API Response types
export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    pages: number;
    current: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =============================================================================
// APPLICATION-SPECIFIC INTERFACES
// =============================================================================

export interface BingoCardFilter {
  game?: GameCategory;
  difficulty?: Difficulty;
  category?: string;
  search?: string;
}

export interface BingoCardStats {
  total: number;
  completed: number;
  byDifficulty: Record<Difficulty, number>;
  byCategory: Record<string, number>;
}

// Default bingo card template (without ID for creating new cards)
export const DEFAULT_BINGO_CARD: Omit<BingoCard, 'id'> = {
  title: '',
  difficulty: 'medium',
  game_type: 'All Games',
  description: null,
  tags: null,
  is_public: false,
  votes: 0,
  creator_id: null,
  created_at: null,
  updated_at: null,
};

// Helper function to create an empty bingo card with ID
export const createEmptyBingoCard = (
  gameType: GameCategory = 'All Games',
  creatorId = ''
): BingoCard => ({
  id: '', // Empty string represents an empty grid cell
  title: '',
  difficulty: 'medium',
  game_type: gameType,
  description: null,
  tags: null,
  is_public: false,
  votes: 0,
  creator_id: creatorId || null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

// Helper function to create a new bingo card with temporary ID
export const createNewBingoCard = (
  data: Partial<BingoCard>,
  gameType: GameCategory = 'All Games',
  creatorId = ''
): BingoCard => ({
  id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  title: data.title || '',
  difficulty: data.difficulty || 'medium',
  game_type: data.game_type || gameType,
  description: data.description || null,
  tags: data.tags || null,
  is_public: data.is_public ?? false,
  votes: data.votes ?? 0,
  creator_id: data.creator_id || creatorId || null,
  created_at: data.created_at || new Date().toISOString(),
  updated_at: data.updated_at || new Date().toISOString(),
});

// Helper function to validate UUID format
export const isValidUUID = (id: string | null): boolean => {
  if (!id || id === '') return false;

  // Skip temporary IDs
  if (id.startsWith('temp-') || id.startsWith('cell-')) return false;

  // Basic UUID format validation
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id
  );
};
