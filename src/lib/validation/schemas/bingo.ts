/**
 * Bingo-related validation schemas for runtime type safety
 * These schemas match the database types and ensure data integrity
 */

import { z } from 'zod';
import { Constants } from '@/types/database.types';
import { sanitizeBoardContent, sanitizeCardContent } from '@/lib/sanitization';

// Enums from database - must match database-generated.ts exactly
export const difficultyLevelSchema = z.enum(
  Constants.public.Enums.difficulty_level
);
export const gameCategorySchema = z.enum(Constants.public.Enums.game_category);

export const boardStatusSchema = z.enum([
  'draft',
  'active',
  'paused',
  'completed',
  'archived',
]);
export const sessionStatusSchema = z.enum([
  'waiting',
  'active',
  'completed',
  'cancelled',
]);
export const winConditionSchema = z.enum([
  'single_line',
  'full_board',
  'pattern',
  'blackout',
]);
export const queueStatusSchema = z.enum([
  'pending',
  'processing',
  'matched',
  'expired',
  'cancelled',
]);

// Win conditions composite type
export const winConditionsSchema = z.object({
  line: z.boolean().nullable(),
  majority: z.boolean().nullable(),
  diagonal: z.boolean().nullable(),
  corners: z.boolean().nullable(),
});

// Session settings composite type - more forgiving with optional fields
export const sessionSettingsSchema = z
  .object({
    max_players: z.number().int().positive().nullable().optional(),
    allow_spectators: z.boolean().nullable().optional(),
    auto_start: z.boolean().nullable().optional(),
    time_limit: z.number().int().positive().nullable().optional(),
    require_approval: z.boolean().nullable().optional(),
    password: z.string().nullable().optional(),
  })
  .passthrough(); // Allow extra fields for forward compatibility

// Schema for board settings, aligning with the composite type
export const zBoardSettings = z
  .object({
    team_mode: z.boolean().nullable().optional(),
    lockout: z.boolean().nullable().optional(),
    sound_enabled: z.boolean().nullable().optional(),
    win_conditions: z
      .object({
        line: z.boolean().nullable().optional(),
        majority: z.boolean().nullable().optional(),
        diagonal: z.boolean().nullable().optional(),
        corners: z.boolean().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough(); // Allow extra fields for forward compatibility

// Schema for a single board cell, aligning with the composite type
export const zBoardCell = z
  .object({
    cell_id: z.string().uuid().nullable().optional(),
    text: z
      .string()
      .nullable()
      .optional()
      .transform(value => {
        if (!value) return value;
        // Sanitize card content to prevent XSS
        return sanitizeCardContent(value);
      }),
    colors: z.array(z.string()).nullable().optional(),
    completed_by: z.array(z.string().uuid()).nullable().optional(),
    blocked: z.boolean().nullable().optional(),
    is_marked: z.boolean().nullable().optional(),
    version: z.number().int().nullable().optional(),
    last_updated: z.number().nullable().optional(),
    last_modified_by: z.string().uuid().nullable().optional(),
  })
  .passthrough(); // Allow extra fields for forward compatibility

export const zBoardState = z.array(zBoardCell);
export const boardStateSchema = zBoardState; // Alias for compatibility

// Bingo board schema
export const bingoBoardSchema = z.object({
  id: z.string(),
  created_at: z.string().nullable(), // More permissive for DB data
  updated_at: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  creator_id: z.string(),
  game_type: gameCategorySchema,
  difficulty: difficultyLevelSchema,
  is_public: z.boolean().nullable(),
  size: z.number().int().positive().nullable(),
  board_state: zBoardState.nullable(),
  settings: zBoardSettings.nullable(),
  votes: z.number().int().nullable(),
  bookmarked_count: z.number().int().nullable(),
  version: z.number().int().nullable(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']),
  cloned_from: z.string().uuid().nullable(),
});

// Bingo card schema - matches database table bingo_cards
export const bingoCardSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  game_type: gameCategorySchema,
  difficulty: difficultyLevelSchema,
  tags: z.array(z.string()).nullable(),
  is_public: z.boolean().nullable(),
  votes: z.number().int().nullable(),
  creator_id: z.string().nullable(),
  created_at: z.string().nullable(), // More permissive for DB data
  updated_at: z.string().nullable(), // More permissive for DB data
});

// Bingo session schema
export const bingoSessionSchema = z.object({
  id: z.string(),
  created_at: z.string().nullable(), // More permissive for DB data
  board_id: z.string(),
  host_id: z.string(),
  status: z.enum(['waiting', 'active', 'completed', 'cancelled']),
  session_code: z.string().nullable(),
  winner_id: z.string().nullable(),
  current_state: zBoardState.nullable(),
  version: z.number().int().nullable(),
  updated_at: z.string().nullable(), // More permissive for DB data
  started_at: z.string().nullable(), // More permissive for DB data
  ended_at: z.string().nullable(), // More permissive for DB data
  settings: sessionSettingsSchema.nullable(),
});

// Bingo session player schema
export const bingoSessionPlayerSchema = z.object({
  id: z.string().uuid().nullable(),
  session_id: z.string().uuid(),
  user_id: z.string(),
  display_name: z.string(),
  joined_at: z.string().nullable(), // More permissive for DB data
  team: z.number().int().nullable(),
  score: z.number().int().nullable(),
  color: z.string(),
  is_ready: z.boolean().nullable(),
  is_host: z.boolean().nullable(),
  avatar_url: z.string().nullable(),
  created_at: z.string().nullable(), // More permissive for DB data
  left_at: z.string().nullable(), // More permissive for DB data
  position: z.number().nullable(),
  updated_at: z.string().nullable(), // More permissive for DB data
});

// Board collections schema
export const boardCollectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  owner_id: z.string().nullable(),
  is_public: z.boolean().nullable(),
  created_at: z.string().nullable(), // More permissive for DB data
  updated_at: z.string().nullable(), // More permissive for DB data
  board_count: z.number().int().nullable(),
  tags: z.array(z.string()).nullable(),
  featured: z.boolean().nullable(),
  settings: z.any().nullable(), // JSON type
});

// Collection boards junction
export const collectionBoardsSchema = z.object({
  collection_id: z.string().uuid(),
  board_id: z.string().uuid(),
  added_at: z.string().nullable(), // More permissive for DB data
  display_order: z.number().int().nullable(),
});

// Board bookmarks
export const boardBookmarkSchema = z.object({
  user_id: z.string(),
  board_id: z.string().uuid(),
  created_at: z.string().nullable(), // More permissive for DB data
});

// Queue entry schema
export const queueEntrySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().nullable(),
  session_id: z.string().uuid().nullable(),
  player_name: z.string(),
  color: z.string(),
  team: z.number().int().nullable(),
  status: queueStatusSchema.nullable(),
  created_at: z.string().nullable(), // More permissive for DB data
  updated_at: z.string().nullable(), // More permissive for DB data
  requested_at: z.string().nullable(), // More permissive for DB data
  processed_at: z.string().nullable(), // More permissive for DB data
});

// Schema for session_stats view which includes additional fields
// Use more lenient datetime validation for database-returned data
export const sessionStatsSchema = z.object({
  id: z.string(),
  created_at: z.string().nullable(), // More permissive for DB data
  board_id: z.string(),
  host_id: z.string(),
  status: z.enum(['waiting', 'active', 'completed', 'cancelled']),
  session_code: z.string().nullable(),
  winner_id: z.string().nullable(),
  current_state: zBoardState.nullable(),
  version: z.number().int().nullable(),
  updated_at: z.string().nullable(), // More permissive for DB data
  started_at: z.string().nullable(), // More permissive for DB data
  ended_at: z.string().nullable(), // More permissive for DB data
  settings: sessionSettingsSchema.nullable(),
  // Additional fields from the view
  current_player_count: z.number().nullable().optional(),
  board_title: z.string().nullable().optional(),
  board_game_type: gameCategorySchema.nullable().optional(),
  board_difficulty: difficultyLevelSchema.nullable().optional(),
  has_password: z.boolean().nullable().optional(),
  max_players: z.number().nullable().optional(),
  host_username: z.string().nullable().optional(),
});

// Array schemas for list operations
export const bingoBoardsArraySchema = z.array(bingoBoardSchema);
export const bingoCardsArraySchema = z.array(bingoCardSchema);
export const bingoSessionsArraySchema = z.array(bingoSessionSchema);
export const bingoSessionPlayersArraySchema = z.array(bingoSessionPlayerSchema);
export const boardCollectionsArraySchema = z.array(boardCollectionSchema);
export const queueEntriesArraySchema = z.array(queueEntrySchema);
export const sessionStatsArraySchema = z.array(sessionStatsSchema);

// Schemas for API route validation

export const getBingoBoardsQuerySchema = z.object({
  game: gameCategorySchema.optional(),
  difficulty: difficultyLevelSchema.optional(),
  limit: z.preprocess(
    val => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(1).max(100).default(10)
  ),
  offset: z.preprocess(
    val => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(0).default(0)
  ),
});

export const createBoardApiSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters')
    .transform(value => {
      const sanitized = sanitizeBoardContent(value);
      if (!sanitized || sanitized.trim().length === 0) {
        throw new Error('Title contains invalid characters');
      }
      return sanitized;
    })
    .refine(value => value.length >= 3, {
      message: 'Title must be at least 3 characters after sanitization',
    }),
  size: z.number().int().min(3).max(10),
  settings: zBoardSettings,
  game_type: gameCategorySchema,
  difficulty: difficultyLevelSchema,
  is_public: z.boolean().default(false),
  board_state: zBoardState,
});

// Alias for backwards compatibility
export const createBingoBoardSchema = createBoardApiSchema;

// Mark cell API schema - no user_id as it comes from auth
export const markCellRequestSchema = z.object({
  cell_position: z.number().int().min(0).max(99), // Assuming max 10x10 grid
  action: z.enum(['mark', 'unmark']),
  version: z.number().int().min(0).optional(),
});

// Type exports for convenience
export type BingoBoardSchema = z.infer<typeof bingoBoardSchema>;
export type BingoCardSchema = z.infer<typeof bingoCardSchema>;
export type BingoSessionSchema = z.infer<typeof bingoSessionSchema>;
export type BingoSessionPlayerSchema = z.infer<typeof bingoSessionPlayerSchema>;
export type BoardCollectionSchema = z.infer<typeof boardCollectionSchema>;
export type QueueEntrySchema = z.infer<typeof queueEntrySchema>;
