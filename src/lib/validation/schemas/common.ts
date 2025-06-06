/**
 * Common validation schemas used across multiple API routes
 * All schemas are strict with no type assertions
 */

import { z } from 'zod';

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Session status enum
export const sessionStatusSchema = z.enum([
  'waiting',
  'active',
  'completed',
  'cancelled',
]);

// Board cell schema matching database composite type
export const boardCellSchema = z.object({
  text: z.string().nullable(),
  colors: z.array(z.string()).nullable(),
  completed_by: z.array(z.string()).nullable(),
  blocked: z.boolean().nullable(),
  is_marked: z.boolean().nullable(),
  cell_id: z.string().nullable(),
  version: z.number().nullable(),
  last_updated: z.number().nullable(),
  last_modified_by: z.string().nullable(),
});

// Session settings schema
export const sessionSettingsSchema = z.object({
  max_players: z.number().int().min(1).max(50).optional(),
  allow_spectators: z.boolean().optional(),
  auto_start: z.boolean().optional(),
  time_limit: z.number().int().positive().nullable().optional(),
  require_approval: z.boolean().optional(),
  password: z.string().min(1).max(100).optional(),
});

// Player color validation (hex color)
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format');

// Display name validation
export const displayNameSchema = z
  .string()
  .min(1, 'Display name is required')
  .max(50, 'Display name too long');

// Team validation
export const teamSchema = z.number().int().min(0).max(10).nullable();

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Common error response
export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
});

// Request metadata for logging
export const requestMetadataSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  boardId: z.string().optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
});
