/**
 * Bingo-related validation schemas for runtime type safety
 * These schemas match the database types and ensure data integrity
 */

import { z } from 'zod';
import { boardCellSchema } from './common';

// Enums from database - must match database-generated.ts exactly
export const difficultyLevelSchema = z.enum(['beginner', 'easy', 'medium', 'hard', 'expert']);
export const gameCategorySchema = z.enum([
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
]);
export const boardStatusSchema = z.enum(['draft', 'active', 'paused', 'completed', 'archived']);
export const sessionStatusSchema = z.enum(['waiting', 'active', 'completed', 'cancelled']);
export const winConditionSchema = z.enum(['single_line', 'full_board', 'pattern', 'blackout']);
export const queueStatusSchema = z.enum(['pending', 'processing', 'matched', 'expired', 'cancelled']);

// Win conditions composite type
export const winConditionsSchema = z.object({
  line: z.boolean().nullable(),
  majority: z.boolean().nullable(),
  diagonal: z.boolean().nullable(),
  corners: z.boolean().nullable(),
});

// Board settings composite type
export const boardSettingsSchema = z.object({
  team_mode: z.boolean().nullable(),
  lockout: z.boolean().nullable(),
  sound_enabled: z.boolean().nullable(),
  win_conditions: winConditionsSchema.nullable(),
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

// Bingo board schema
export const bingoBoardSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  game_type: gameCategorySchema,
  difficulty: difficultyLevelSchema,
  creator_id: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  is_public: z.boolean().nullable(),
  size: z.number().int().positive().nullable(),
  board_state: z.array(boardCellSchema).nullable(),
  settings: boardSettingsSchema.nullable(),
  votes: z.number().int().nullable(),
  bookmarked_count: z.number().int().nullable(),
  cloned_from: z.string().uuid().nullable(),
  status: boardStatusSchema.nullable(),
  version: z.number().int().nullable(),
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
  id: z.string().uuid(),
  board_id: z.string().uuid().nullable(),
  host_id: z.string().nullable(),
  status: sessionStatusSchema.nullable(),
  created_at: z.string().nullable(),
  started_at: z.string().nullable(),
  ended_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  settings: sessionSettingsSchema.nullable(),
  session_code: z.string().nullable(),
  winner_id: z.string().nullable(),
  current_state: z.array(boardCellSchema).nullable(),
  version: z.number().int().nullable(),
});

// Bingo session player schema
export const bingoSessionPlayerSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid().nullable(),
  user_id: z.string().nullable(),
  player_name: z.string(),
  joined_at: z.string().nullable(),
  team: z.number().int().nullable(),
  score: z.number().int().nullable(),
  color: z.string(),
  is_active: z.boolean().nullable(),
  completed_cells: z.array(z.number()).nullable(),
  last_active: z.string().nullable(),
  version: z.number().int().nullable(),
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
export const sessionStatsSchema = bingoSessionSchema.extend({
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

// Type exports for convenience
export type BingoBoardSchema = z.infer<typeof bingoBoardSchema>;
export type BingoCardSchema = z.infer<typeof bingoCardSchema>;
export type BingoSessionSchema = z.infer<typeof bingoSessionSchema>;
export type BingoSessionPlayerSchema = z.infer<typeof bingoSessionPlayerSchema>;
export type BoardCollectionSchema = z.infer<typeof boardCollectionSchema>;
export type QueueEntrySchema = z.infer<typeof queueEntrySchema>;