/**
 * Client-safe Bingo Sessions Service
 *
 * Pure functions for multiplayer bingo session operations.
 * No state management - only data fetching and mutations.
 * This version excludes password hashing operations for client-side compatibility.
 */

import { createClient } from '@/lib/supabase';
import type {
  Tables,
  Enums,
  CompositeTypes,
  Json,
} from '@/types/database.types';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { isError, getErrorMessage } from '@/lib/error-guards';
import { generateSessionCode } from '@/lib/crypto-utils';
import { log } from '@/lib/logger';

// Use database types
export type BingoSession = Tables<'bingo_sessions'>;
export type SessionPlayer = Tables<'bingo_session_players'>;
export type SessionSettings = CompositeTypes<'session_settings'>;
export type SessionStatus = Enums<'session_status'>;
export type GameCategory = Enums<'game_category'>;

// Type for session_stats view - matches actual database view structure
export interface SessionWithStats {
  board_difficulty: Enums<'difficulty_level'> | null;
  board_game_type: GameCategory | null;
  board_id: string | null;
  board_title: string | null;
  created_at: string | null;
  current_player_count: number | null;
  current_state: Json | null;
  ended_at: string | null;
  has_password: boolean | null;
  host_id: string | null;
  host_username: string | null;
  id: string | null;
  max_players: number | null;
  session_code: string | null;
  settings: SessionSettings | null;
  started_at: string | null;
  status: SessionStatus | null;
  updated_at: string | null;
  version: number | null;
  winner_id: string | null;
}

// Type for valid sessions (filtered to remove nulls for required fields)
export interface ValidSessionWithStats {
  board_difficulty: Enums<'difficulty_level'> | null;
  board_game_type: GameCategory | null;
  board_id: string;
  board_title: string | null;
  created_at: string;
  current_player_count: number | null;
  current_state: Json | null;
  ended_at: string | null;
  has_password: boolean | null;
  host_id: string;
  host_username: string | null;
  id: string;
  max_players: number | null;
  session_code: string | null;
  settings: SessionSettings | null;
  started_at: string | null;
  status: SessionStatus;
  updated_at: string;
  version: number | null;
  winner_id: string | null;
}

// Type for session with joined players
export interface SessionWithPlayers extends BingoSession {
  bingo_session_players: SessionPlayer[];
}

// Type for session with minimal player data (for performance)
export interface SessionWithMinimalPlayers extends BingoSession {
  bingo_session_players: {
    user_id: string;
    display_name: string;
    color: string;
    team: number | null;
  }[];
}

// Helper to convert Supabase errors to standard Error objects
function toStandardError(error: {
  message: string;
  code?: string;
  details?: string;
}): Error {
  // Create a proper Error instance without type assertions
  const err = new Error(error.message);
  // Store additional context in the error's cause property (standard JS feature)
  Object.defineProperty(err, 'cause', {
    value: { code: error.code, details: error.details },
    writable: true,
    enumerable: false,
    configurable: true,
  });
  return err;
}

// API payload types (excluding password operations)
export interface CreateSessionData {
  board_id: string;
  host_id: string;
  settings?: {
    max_players?: number;
    allow_spectators?: boolean;
    auto_start?: boolean;
    time_limit?: number;
    require_approval?: boolean;
    // Note: password handling moved to server-side API routes
  };
}

export interface JoinSessionData {
  session_id: string;
  user_id: string;
  display_name: string;
  color: string;
  team?: number | null;
  // Note: password verification moved to server-side API routes
}

export interface SessionFilters {
  search?: string;
  gameCategory?: GameCategory;
  difficulty?: Enums<'difficulty_level'>;
  status?: 'active' | 'waiting' | 'all';
  showPrivate?: boolean;
}

export const sessionsService = {
  /**
   * Get session by ID
   */
  async getSessionById(
    sessionId: string
  ): Promise<ServiceResponse<BingoSession>> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('bingo_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        log.error('Failed to get session by ID', toStandardError(error), {
          metadata: {
            service: 'sessions.service',
            method: 'getSessionById',
            sessionId,
          },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(data);
    } catch (error) {
      log.error(
        'Unexpected error getting session by ID',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'sessions.service',
            method: 'getSessionById',
            sessionId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Get sessions with stats (for listings)
   */
  async getSessionsWithStats(
    filters: SessionFilters = {}
  ): Promise<ServiceResponse<ValidSessionWithStats[]>> {
    try {
      const supabase = createClient();
      let query = supabase.from('session_stats').select('*');

      // Apply filters
      if (filters.search) {
        query = query.or(
          `board_title.ilike.%${filters.search}%,host_username.ilike.%${filters.search}%`
        );
      }

      if (filters.gameCategory) {
        query = query.eq('board_game_type', filters.gameCategory);
      }

      if (filters.difficulty) {
        query = query.eq('board_difficulty', filters.difficulty);
      }

      if (filters.status === 'active') {
        query = query.eq('status', 'active');
      } else if (filters.status === 'waiting') {
        query = query.eq('status', 'waiting');
      }

      if (!filters.showPrivate) {
        query = query.eq('has_password', false);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        log.error('Failed to get sessions with stats', toStandardError(error), {
          metadata: {
            service: 'sessions.service',
            method: 'getSessionsWithStats',
            filters,
          },
        });
        return createServiceError(error.message);
      }

      // Filter out invalid sessions (those missing required fields)
      const validSessions: ValidSessionWithStats[] = (data || []).filter(
        (session): session is ValidSessionWithStats =>
          session.id !== null &&
          session.host_id !== null &&
          session.board_id !== null &&
          session.status !== null &&
          session.created_at !== null &&
          session.updated_at !== null
      );

      return createServiceSuccess(validSessions);
    } catch (error) {
      log.error(
        'Unexpected error getting sessions with stats',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'sessions.service',
            method: 'getSessionsWithStats',
            filters,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Get sessions by board ID with players in a single query (fixes N+1 issue)
   */
  async getSessionsByBoardIdWithPlayers(
    boardId: string,
    status?: SessionStatus
  ): Promise<ServiceResponse<SessionWithMinimalPlayers[]>> {
    try {
      const supabase = createClient();
      let query = supabase
        .from('bingo_sessions')
        .select(
          `
          *,
          bingo_session_players (
            user_id,
            display_name,
            color,
            team
          )
        `
        )
        .eq('board_id', boardId);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        log.error(
          'Failed to get sessions with players by board ID',
          toStandardError(error),
          {
            metadata: {
              service: 'sessions.service',
              method: 'getSessionsByBoardIdWithPlayers',
              boardId,
              status,
            },
          }
        );
        return createServiceError(error.message);
      }

      // Transform the data to match expected format
      const sessionsWithPlayers = (data || []).map(session => ({
        ...session,
        bingo_session_players: session.bingo_session_players || [],
      }));

      return createServiceSuccess(sessionsWithPlayers);
    } catch (error) {
      log.error(
        'Unexpected error getting sessions with players by board ID',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'sessions.service',
            method: 'getSessionsByBoardIdWithPlayers',
            boardId,
            status,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Generate a session code (client-safe)
   */
  generateSessionCode,
};
