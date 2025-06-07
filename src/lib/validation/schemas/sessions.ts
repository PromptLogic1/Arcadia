/**
 * Session-specific validation schemas
 * Used for /api/bingo/sessions routes
 */

import { z } from 'zod';
import {
  uuidSchema,
  sessionStatusSchema,
  boardCellSchema,
  sessionSettingsSchema,
  displayNameSchema,
  hexColorSchema,
  teamSchema,
} from './common';

// POST /api/bingo/sessions - Create session
export const createSessionRequestSchema = z.object({
  boardId: uuidSchema,
  displayName: displayNameSchema.optional(),
  color: hexColorSchema.optional(),
  team: teamSchema.optional(),
  settings: sessionSettingsSchema.optional(),
});

export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;

// PATCH /api/bingo/sessions - Update session
export const patchSessionRequestSchema = z.object({
  sessionId: uuidSchema,
  currentState: z.array(boardCellSchema).nullable().optional(),
  winnerId: uuidSchema.nullable().optional(),
  status: sessionStatusSchema.nullable().optional(),
});

export type PatchSessionRequest = z.infer<typeof patchSessionRequestSchema>;

// GET /api/bingo/sessions - Query params
export const getSessionsQuerySchema = z.object({
  boardId: uuidSchema,
  status: sessionStatusSchema.optional(),
});

export type GetSessionsQuery = z.infer<typeof getSessionsQuerySchema>;

// POST /api/bingo/sessions/join - Join session
export const joinSessionRequestSchema = z.object({
  sessionId: uuidSchema,
  displayName: displayNameSchema,
  color: hexColorSchema,
  team: teamSchema.optional(),
});

export type JoinSessionRequest = z.infer<typeof joinSessionRequestSchema>;

// POST /api/bingo/sessions/join-by-code - Join by code
export const joinByCodeRequestSchema = z.object({
  sessionCode: z
    .string()
    .length(6, 'Session code must be 6 characters')
    .regex(/^[A-Z0-9]{6}$/, 'Invalid session code format'),
  displayName: displayNameSchema.optional(),
  color: hexColorSchema.optional(),
  team: teamSchema.optional(),
  password: z.string().optional(),
});

export type JoinByCodeRequest = z.infer<typeof joinByCodeRequestSchema>;

// POST /api/bingo/sessions/[id]/start - Start session
export const startSessionRequestSchema = z.object({
  sessionId: uuidSchema,
});

export type StartSessionRequest = z.infer<typeof startSessionRequestSchema>;

// POST /api/bingo/sessions/[id]/mark-cell - Mark cell
export const markCellRequestSchema = z.object({
  sessionId: uuidSchema,
  cellIndex: z.number().int().min(0).max(99), // Assuming max 10x10 grid
  playerId: uuidSchema,
});

export type MarkCellRequest = z.infer<typeof markCellRequestSchema>;

// POST /api/bingo/sessions/[id]/complete - Complete session
export const completeSessionRequestSchema = z.object({
  winnerId: uuidSchema,
  winning_patterns: z.array(z.string()),
  final_score: z.number().int(),
});

export type CompleteSessionRequest = z.infer<
  typeof completeSessionRequestSchema
>;

// PATCH /api/bingo/sessions/players - Update a player
export const updatePlayerRequestSchema = z.object({
  sessionId: uuidSchema,
  displayName: displayNameSchema.optional(),
  color: hexColorSchema.optional(),
  team: teamSchema.optional(),
});

export type UpdatePlayerRequest = z.infer<typeof updatePlayerRequestSchema>;

// DELETE /api/bingo/sessions/players - Leave a session
export const leaveSessionRequestSchema = z.object({
  sessionId: uuidSchema,
});

export type LeaveSessionRequest = z.infer<typeof leaveSessionRequestSchema>;

// Response schemas
export const sessionResponseSchema = z.object({
  id: uuidSchema,
  board_id: uuidSchema,
  host_id: uuidSchema.nullable(),
  session_code: z.string().nullable(),
  current_state: z.array(boardCellSchema).nullable(),
  status: sessionStatusSchema,
  version: z.number().int(),
  winner_id: uuidSchema.nullable(),
  started_at: z.string().nullable(),
  ended_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  settings: sessionSettingsSchema.nullable(),
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;

export const playerResponseSchema = z.object({
  id: uuidSchema,
  session_id: uuidSchema,
  user_id: uuidSchema,
  display_name: z.string(),
  color: z.string(),
  team: z.number().nullable(),
  score: z.number().nullable(),
  position: z.number().nullable(),
  is_host: z.boolean(),
  is_ready: z.boolean(),
  joined_at: z.string(),
  left_at: z.string().nullable(),
});

export type PlayerResponse = z.infer<typeof playerResponseSchema>;
