/**
 * Type transformation utilities for converting between Zod schemas and database types
 *
 * These utilities ensure that optional fields from Zod schemas are properly converted
 * to nullable fields expected by the database, avoiding type errors.
 */

import type { BoardCell, BoardSettings, WinConditions } from '@/types';

/**
 * Transform a board cell from Zod parse result to database-compatible format
 * Converts undefined values to null
 */
export function transformBoardCell(cell: {
  cell_id?: string | null;
  text?: string | null;
  colors?: string[] | null;
  completed_by?: string[] | null;
  blocked?: boolean | null;
  is_marked?: boolean | null;
  version?: number | null;
  last_updated?: number | null;
  last_modified_by?: string | null;
}): BoardCell {
  return {
    cell_id: cell.cell_id ?? null,
    text: cell.text ?? null,
    colors: cell.colors ?? null,
    completed_by: cell.completed_by ?? null,
    blocked: cell.blocked ?? null,
    is_marked: cell.is_marked ?? null,
    version: cell.version ?? null,
    last_updated: cell.last_updated ?? null,
    last_modified_by: cell.last_modified_by ?? null,
  };
}

/**
 * Transform an array of board cells
 */
export function transformBoardState(cells: Array<any>): BoardCell[] {
  return cells.map(transformBoardCell);
}

/**
 * Transform win conditions from Zod parse result to database-compatible format
 */
export function transformWinConditions(
  conditions?: {
    line?: boolean | null;
    majority?: boolean | null;
    diagonal?: boolean | null;
    corners?: boolean | null;
  } | null
): WinConditions | null {
  if (!conditions) return null;

  return {
    line: conditions.line ?? false,
    majority: conditions.majority ?? false,
    diagonal: conditions.diagonal ?? false,
    corners: conditions.corners ?? false,
  };
}

/**
 * Transform board settings from Zod parse result to database-compatible format
 */
export function transformBoardSettings(
  settings?: {
    team_mode?: boolean | null;
    lockout?: boolean | null;
    sound_enabled?: boolean | null;
    win_conditions?: {
      line?: boolean | null;
      majority?: boolean | null;
      diagonal?: boolean | null;
      corners?: boolean | null;
    } | null;
  } | null
): BoardSettings | null {
  if (!settings) return null;

  return {
    team_mode: settings.team_mode ?? false,
    lockout: settings.lockout ?? false,
    sound_enabled: settings.sound_enabled ?? true,
    win_conditions: transformWinConditions(settings.win_conditions),
  };
}

/**
 * Transform session settings from Zod parse result to database-compatible format
 */
export function transformSessionSettings(
  settings?: {
    max_players?: number | null;
    allow_spectators?: boolean | null;
    auto_start?: boolean | null;
    time_limit?: number | null;
    require_approval?: boolean | null;
    password?: string | null;
  } | null
): {
  max_players: number | null;
  allow_spectators: boolean | null;
  auto_start: boolean | null;
  time_limit: number | null;
  require_approval: boolean | null;
  password: string | null;
} | null {
  if (!settings) return null;

  return {
    max_players: settings.max_players ?? null,
    allow_spectators: settings.allow_spectators ?? null,
    auto_start: settings.auto_start ?? null,
    time_limit: settings.time_limit ?? null,
    require_approval: settings.require_approval ?? null,
    password: settings.password ?? null,
  };
}
