/**
 * Bingo-related validation schemas for runtime type safety
 * These schemas match the database types and ensure data integrity
 */

import { z } from 'zod';
import { Constants } from '@/types/database.types';

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

// Session settings composite type
export const sessionSettingsSchema = z.object({
  max_players: z.number().int().positive().nullable(),
  allow_spectators: z.boolean().nullable(),
  auto_start: z.boolean().nullable(),
  time_limit: z.number().int().positive().nullable(),
  require_approval: z.boolean().nullable(),
  password: z.string().nullable(),
});

// Schema for board settings, aligning with the composite type
export const zBoardSettings = z.object({
  team_mode: z.boolean().nullable(),
  lockout: z.boolean().nullable(),
  sound_enabled: z.boolean().nullable(),
  win_conditions: z
    .object({
      line: z.boolean().nullable(),
      majority: z.boolean().nullable(),
      diagonal: z.boolean().nullable(),
      corners: z.boolean().nullable(),
    })
    .nullable(),
});

// Schema for a single board cell, aligning with the composite type
export const zBoardCell = z.object({
  cell_id: z.string().uuid().nullable(),
  text: z.string().nullable(),
  colors: z.array(z.string()).nullable(),
  completed_by: z.array(z.string().uuid()).nullable(),
  blocked: z.boolean().nullable(),
  is_marked: z.boolean().nullable(),
  version: z.number().int().nullable(),
  last_updated: z.number().nullable(),
  last_modified_by: z.string().uuid().nullable(),
});

export const zBoardState = z.array(zBoardCell);
export const boardStateSchema = zBoardState; // Alias for compatibility

// Bingo board schema
export const bingoBoardSchema = z.object({
  id: z.string(),
  created_at: z.string().datetime(),
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
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

// Bingo session schema
export const bingoSessionSchema = z.object({
  id: z.string(),
  created_at: z.string().datetime().nullable(), // Allow null from database
  board_id: z.string(),
  host_id: z.string(),
  status: z.enum(['waiting', 'active', 'completed', 'cancelled']),
  session_code: z.string().nullable(),
  winner_id: z.string().nullable(),
  current_state: zBoardState.nullable(),
  version: z.number().int().nullable(),
  updated_at: z.string().datetime().nullable(), // Ensure datetime validation
  started_at: z.string().datetime().nullable(), // Ensure datetime validation
  ended_at: z.string().datetime().nullable(), // Ensure datetime validation
  settings: sessionSettingsSchema.nullable(),
});

// Bingo session player schema
export const bingoSessionPlayerSchema = z.object({
  id: z.string().uuid().nullable(),
  session_id: z.string().uuid(),
  user_id: z.string(),
  display_name: z.string(),
  joined_at: z.string().nullable(),
  team: z.number().int().nullable(),
  score: z.number().int().nullable(),
  color: z.string(),
  is_ready: z.boolean().nullable(),
  is_host: z.boolean().nullable(),
  avatar_url: z.string().nullable(),
  created_at: z.string().nullable(),
  left_at: z.string().nullable(),
  position: z.number().nullable(),
  updated_at: z.string().nullable(),
});

// Board collections schema
export const boardCollectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  owner_id: z.string().nullable(),
  is_public: z.boolean().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  board_count: z.number().int().nullable(),
  tags: z.array(z.string()).nullable(),
  featured: z.boolean().nullable(),
  settings: z.any().nullable(), // JSON type
});

// Collection boards junction
export const collectionBoardsSchema = z.object({
  collection_id: z.string().uuid(),
  board_id: z.string().uuid(),
  added_at: z.string().nullable(),
  display_order: z.number().int().nullable(),
});

// Board bookmarks
export const boardBookmarkSchema = z.object({
  user_id: z.string(),
  board_id: z.string().uuid(),
  created_at: z.string().nullable(),
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
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  requested_at: z.string().nullable(),
  processed_at: z.string().nullable(),
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
  title: z.string().min(3).max(100),
  size: z.number().int().min(3).max(10),
  settings: zBoardSettings,
  game_type: gameCategorySchema,
  difficulty: difficultyLevelSchema,
  is_public: z.boolean().default(false),
  board_state: zBoardState,
});

// Alias for backwards compatibility
export const createBingoBoardSchema = createBoardApiSchema;

// Mark cell API schema
export const markCellRequestSchema = z.object({
  cell_position: z.number().int().min(0).max(99), // Assuming max 10x10 grid
  user_id: z.string().uuid('Invalid user ID format'),
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
