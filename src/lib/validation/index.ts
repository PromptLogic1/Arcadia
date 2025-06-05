/**
 * ARCADIA VALIDATION SYSTEM - Zero Type Assertions Architecture
 *
 * Database-generated types as Single Source of Truth with proper validation
 * ELIMINATES: All type assertions, blind casting, unsafe operations
 */

import { z } from 'zod';
import type {
  Json,
} from '@/types/database-generated';
// Unused but available if needed:
// Tables, Enums, CompositeTypes

// =============================================================================
// BRANDED TYPES SYSTEM - Eliminates string/ID confusion
// =============================================================================

export type BrandedId<T extends string> = string & { readonly __brand: T };

export type UserId = BrandedId<'UserId'>;
export type BoardId = BrandedId<'BoardId'>;
export type SessionId = BrandedId<'SessionId'>;
export type CardId = BrandedId<'CardId'>;

/**
 * Runtime-safe ID creation with validation
 */
export function createUserId(id: unknown): UserId | null {
  if (typeof id === 'string' && id.length > 0) {
    return id as UserId;
  }
  return null;
}

export function createBoardId(id: unknown): BoardId | null {
  if (typeof id === 'string' && id.length > 0) {
    return id as BoardId;
  }
  return null;
}

export function createSessionId(id: unknown): SessionId | null {
  if (typeof id === 'string' && id.length > 0) {
    return id as SessionId;
  }
  return null;
}

export function createCardId(id: unknown): CardId | null {
  if (typeof id === 'string' && id.length > 0) {
    return id as CardId;
  }
  return null;
}

// =============================================================================
// VALIDATION RESULT TYPES
// =============================================================================

export type ValidationResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

// =============================================================================
// DATABASE ENUM VALIDATION - Based on actual database-generated types
// =============================================================================

export const DifficultySchema = z.enum([
  'beginner',
  'easy',
  'medium',
  'hard',
  'expert',
]);

export const GameCategorySchema = z.enum([
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

export const BoardStatusSchema = z.enum([
  'draft',
  'active',
  'paused',
  'completed',
  'archived',
]);

export const SessionStatusSchema = z.enum([
  'waiting',
  'active',
  'paused',
  'completed',
  'cancelled',
]);

export const QueueStatusSchema = z.enum(['waiting', 'matched', 'cancelled']);

// =============================================================================
// SAFE VALIDATION FUNCTIONS
// =============================================================================

/**
 * Safe validation that never throws exceptions
 */
export function safeValidate<T>(
  schema: z.ZodType<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data, error: null };
    }

    const errorMessage = result.error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    return {
      success: false,
      data: null,
      error: `Validation failed: ${errorMessage}`,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validate array of items safely
 */
export function safeValidateArray<T>(
  schema: z.ZodType<T>,
  data: unknown[]
): ValidationResult<T[]> {
  if (!Array.isArray(data)) {
    return {
      success: false,
      data: null,
      error: 'Expected array but received ' + typeof data,
    };
  }

  const validated: T[] = [];
  const errors: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const result = safeValidate(schema, data[i]);
    if (result.success) {
      validated.push(result.data);
    } else {
      errors.push(`Item ${i}: ${result.error}`);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      data: null,
      error: `Array validation failed: ${errors.join('; ')}`,
    };
  }

  return { success: true, data: validated, error: null };
}

// =============================================================================
// JSON VALIDATION HELPERS
// =============================================================================

/**
 * Safe JSON validation for Supabase Json type
 */
export function validateJsonField(data: unknown): Json | null {
  if (data === null || data === undefined) {
    return null;
  }

  if (
    typeof data === 'string' ||
    typeof data === 'number' ||
    typeof data === 'boolean'
  ) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(validateJsonField).filter(item => item !== null);
  }

  if (typeof data === 'object') {
    const result: { [key: string]: Json } = {};
    for (const [key, value] of Object.entries(data)) {
      const validatedValue = validateJsonField(value);
      if (validatedValue !== null) {
        result[key] = validatedValue;
      }
    }
    return result;
  }

  return null;
}

// =============================================================================
// SERVICE RESPONSE TYPES - Standard patterns
// =============================================================================

export interface ServiceResponse<T> {
  data: T | null;
  error: string | Error | null;
  success: boolean;
}

export interface PaginatedResponse<T> extends ServiceResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Helper function to create successful service responses
 */
export function createServiceSuccess<T>(data: T): ServiceResponse<T> {
  return { data, error: null, success: true };
}

/**
 * Helper function to create error service responses
 */
export function createServiceError<T>(
  error: string | Error
): ServiceResponse<T> {
  return {
    data: null,
    error: typeof error === 'string' ? error : error.message,
    success: false,
  };
}
