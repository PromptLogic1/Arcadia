/**
 * Bingo Sessions Service
 *
 * Pure functions for multiplayer bingo session operations.
 * No state management - only data fetching and mutations.
 */

import { createClient } from '@/lib/supabase';
import type { Tables, Enums, CompositeTypes } from '@/types/database.types';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { isError, getErrorMessage } from '@/lib/error-guards';
import {
  bingoSessionSchema,
  sessionStatsArraySchema,
} from '@/lib/validation/schemas/bingo';
import { log } from '@/lib/logger';

// Use database types
export type BingoSession = Tables<'bingo_sessions'>;
export type SessionPlayer = Tables<'bingo_session_players'>;
export type SessionSettings = CompositeTypes<'session_settings'>;
export type SessionStatus = Enums<'session_status'>;
export type GameCategory = Enums<'game_category'>;

// Type for session_stats view which includes additional fields
export interface SessionWithStats extends BingoSession {
  current_player_count?: number | null;
  board_title?: string | null;
  board_game_type?: GameCategory | null;
  board_difficulty?: Enums<'difficulty_level'> | null;
  has_password?: boolean | null;
  max_players?: number | null;
  host_username?: string | null;
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

// API payload types
export interface CreateSessionData {
  board_id: string;
  host_id: string;
  settings?: {
    max_players?: number;
    allow_spectators?: boolean;
    auto_start?: boolean;
    time_limit?: number;
    require_approval?: boolean;
    password?: string;
  };
}

export interface JoinSessionData {
  session_id: string;
  user_id: string;
  display_name: string;
  color: string;
  team?: number | null;
  password?: string;
}

export interface SessionFilters {
  search?: string;
  gameCategory?: GameCategory;
  difficulty?: string;
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
            errorCode: error.code,
            errorDetails: error.details,
          },
        });
        return createServiceError(error.message);
      }

      const validationResult = bingoSessionSchema.safeParse(data);
      if (!validationResult.success) {
        log.error('Session validation failed', validationResult.error, {
          metadata: {
            service: 'sessions.service',
            method: 'getSessionById',
            sessionId,
          },
        });
        return createServiceError('Invalid session data format');
      }

      return createServiceSuccess(validationResult.data);
    } catch (error) {
      log.error(
        'Unexpected error getting session',
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
   * Get session by code
   */
  async getSessionByCode(
    sessionCode: string
  ): Promise<ServiceResponse<BingoSession>> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_sessions')
        .select('*')
        .eq('session_code', sessionCode)
        .single();

      if (error) {
        log.error('Failed to get session by code', toStandardError(error), {
          metadata: {
            service: 'sessions.service',
            method: 'getSessionByCode',
            sessionCode,
            errorCode: error.code,
            errorDetails: error.details,
          },
        });
        return createServiceError(error.message);
      }

      const validationResult = bingoSessionSchema.safeParse(data);
      if (!validationResult.success) {
        log.error('Session validation failed', validationResult.error, {
          metadata: {
            service: 'sessions.service',
            method: 'getSessionByCode',
            sessionCode,
          },
        });
        return createServiceError('Invalid session data format');
      }

      return createServiceSuccess(validationResult.data);
    } catch (error) {
      log.error(
        'Unexpected error getting session by code',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'sessions.service',
            method: 'getSessionByCode',
            sessionCode,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Get public/active sessions with filtering
   */
  async getActiveSessions(
    filters: SessionFilters = {},
    page = 1,
    limit = 20
  ): Promise<
    ServiceResponse<{ sessions: SessionWithStats[]; totalCount: number }>
  > {
    try {
      const supabase = createClient();
      let query = supabase
        .from('session_stats')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      } else {
        // Default to waiting and active sessions
        query = query.in('status', ['waiting', 'active']);
      }

      if (filters.showPrivate === false) {
        query = query.eq('has_password', false);
      }

      if (filters.gameCategory && filters.gameCategory !== 'All Games') {
        query = query.eq('board_game_type', filters.gameCategory);
      }

      if (filters.search) {
        query = query.ilike('board_title', `%${filters.search}%`);
      }

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) {
        log.error('Failed to get active sessions', toStandardError(error), {
          metadata: {
            service: 'sessions.service',
            method: 'getActiveSessions',
            filters,
          },
        });
        return createServiceError(error.message);
      }

      // Validate with session stats schema
      const validationResult = sessionStatsArraySchema.safeParse(data);
      if (!validationResult.success) {
        log.error('Session stats validation failed', validationResult.error, {
          metadata: {
            service: 'sessions.service',
            method: 'getActiveSessions',
          },
        });
        return createServiceError('Invalid session data format');
      }

      return createServiceSuccess({
        sessions: validationResult.data,
        totalCount: count || 0,
      });
    } catch (error) {
      log.error(
        'Unexpected error getting active sessions',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'sessions.service',
            method: 'getActiveSessions',
            filters,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Create a new session
   */
  async createSession(
    sessionData: CreateSessionData
  ): Promise<ServiceResponse<BingoSession>> {
    try {
      const supabase = createClient();

      // Generate session code
      const sessionCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      const { data, error } = await supabase
        .from('bingo_sessions')
        .insert({
          board_id: sessionData.board_id,
          host_id: sessionData.host_id,
          session_code: sessionCode,
          status: 'waiting',
          settings: {
            max_players: sessionData.settings?.max_players || 8,
            allow_spectators: sessionData.settings?.allow_spectators || true,
            auto_start: sessionData.settings?.auto_start || false,
            time_limit: sessionData.settings?.time_limit || null,
            require_approval: sessionData.settings?.require_approval || false,
            password: sessionData.settings?.password || null,
          },
          current_state: [],
        })
        .select()
        .single();

      if (error) {
        log.error('Failed to create session', toStandardError(error), {
          metadata: {
            service: 'sessions.service',
            method: 'createSession',
            boardId: sessionData.board_id,
          },
        });
        return createServiceError(error.message);
      }

      const validationResult = bingoSessionSchema.safeParse(data);
      if (!validationResult.success) {
        log.error('Created session validation failed', validationResult.error, {
          metadata: { service: 'sessions.service', method: 'createSession' },
        });
        return createServiceError('Invalid session data format');
      }

      return createServiceSuccess(validationResult.data);
    } catch (error) {
      log.error(
        'Unexpected error creating session',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'sessions.service',
            method: 'createSession',
            sessionData,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Join a session
   */
  async joinSession(
    joinData: JoinSessionData
  ): Promise<ServiceResponse<SessionPlayer>> {
    try {
      const supabase = createClient();

      // Step 1: Validate session status
      const { data: session, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select('status, settings')
        .eq('id', joinData.session_id)
        .single();

      if (sessionError || !session) {
        return createServiceError('Session not found');
      }
      if (session.status !== 'waiting') {
        return createServiceError('Session is not accepting new players');
      }

      // Step 2: Check for existing player
      const { count: existingPlayer, error: playerCheckError } = await supabase
        .from('bingo_session_players')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', joinData.session_id)
        .eq('user_id', joinData.user_id);

      if (playerCheckError) throw toStandardError(playerCheckError);
      if (existingPlayer && existingPlayer > 0) {
        return createServiceError('Player already in session');
      }

      // Step 3: Check color availability
      const { count: colorTaken, error: colorCheckError } = await supabase
        .from('bingo_session_players')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', joinData.session_id)
        .eq('color', joinData.color);

      if (colorCheckError) throw toStandardError(colorCheckError);
      if (colorTaken && colorTaken > 0) {
        return createServiceError('Color already taken');
      }

      // Step 4: Add player to session
      const { data: newPlayer, error: insertError } = await supabase
        .from('bingo_session_players')
        .insert({
          session_id: joinData.session_id,
          user_id: joinData.user_id,
          display_name: joinData.display_name,
          color: joinData.color,
          team: joinData.team ?? null,
        })
        .select()
        .single();

      if (insertError) {
        log.error('Error adding player to session', insertError, {
          metadata: {
            service: 'sessions.service',
            method: 'joinSession',
            ...joinData,
          },
        });
        return createServiceError('Failed to join session');
      }

      return createServiceSuccess(newPlayer);
    } catch (error) {
      log.error(
        'Unexpected error joining session',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'sessions.service',
            method: 'joinSession',
            ...joinData,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Join a session by code
   */
  async joinSessionByCode(
    sessionCode: string,
    userId: string,
    playerData: {
      display_name: string;
      color: string;
      team?: number | null;
      password?: string;
    }
  ): Promise<{
    session: BingoSession | null;
    player: SessionPlayer | null;
    sessionId?: string;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      // Find session by code
      const { data: session, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select('*')
        .eq('session_code', sessionCode.toUpperCase())
        .single();

      if (sessionError || !session) {
        return { session: null, player: null, error: 'Session not found' };
      }

      if (session.status !== 'waiting') {
        return {
          session: null,
          player: null,
          error: 'Session is no longer accepting players',
        };
      }

      // Check password if session is password protected
      const sessionPassword = session.settings?.password;
      if (sessionPassword && sessionPassword.trim()) {
        if (
          !playerData.password ||
          playerData.password.trim() !== sessionPassword.trim()
        ) {
          return { session: null, player: null, error: 'Incorrect password' };
        }
      }

      // Check if user already in session
      const { data: existingPlayer } = await supabase
        .from('bingo_session_players')
        .select('*')
        .eq('session_id', session.id)
        .eq('user_id', userId)
        .single();

      if (existingPlayer) {
        return {
          session,
          player: existingPlayer,
          sessionId: session.id,
          error: undefined,
        };
      }

      // Check max players
      const { count: playerCount } = await supabase
        .from('bingo_session_players')
        .select('*', { count: 'exact' })
        .eq('session_id', session.id);

      const maxPlayers = session.settings?.max_players || 4;
      if ((playerCount || 0) >= maxPlayers) {
        return { session: null, player: null, error: 'Session is full' };
      }

      // Add player to session
      const { data: newPlayer, error: playerError } = await supabase
        .from('bingo_session_players')
        .insert({
          session_id: session.id,
          user_id: userId,
          display_name: playerData.display_name,
          color: playerData.color,
          team: playerData.team ?? null,
          score: 0,
          is_host: false,
          is_ready: false,
          joined_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (playerError) {
        return { session: null, player: null, error: playerError.message };
      }

      return {
        session,
        player: newPlayer,
        sessionId: session.id,
        error: undefined,
      };
    } catch (error) {
      return {
        session: null,
        player: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to join session by code',
      };
    }
  },

  /**
   * Leave a session
   */
  async leaveSession(
    sessionId: string,
    userId: string
  ): Promise<ServiceResponse<void>> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('bingo_session_players')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (error) {
        log.error('Failed to leave session', toStandardError(error), {
          metadata: {
            service: 'sessions.service',
            method: 'leaveSession',
            sessionId,
            userId,
          },
        });
        return createServiceError(error.message);
      }
      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Unexpected error leaving session',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'sessions.service',
            method: 'leaveSession',
            sessionId,
            userId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Update session status
   */
  async updateSessionStatus(
    sessionId: string,
    status: SessionStatus
  ): Promise<{ session: BingoSession | null; error?: string }> {
    try {
      const supabase = createClient();
      const updateData: Partial<Tables<'bingo_sessions'>> = {
        status,
      };

      if (status === 'active') {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'completed' || status === 'cancelled') {
        updateData.ended_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('bingo_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        return { session: null, error: error.message };
      }

      return { session: data };
    } catch (error) {
      return {
        session: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update session status',
      };
    }
  },

  /**
   * Get session players
   */
  async getSessionPlayers(
    sessionId: string
  ): Promise<ServiceResponse<SessionPlayer[]>> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_session_players')
        .select('*')
        .eq('session_id', sessionId);

      if (error) {
        log.error('Failed to get session players', toStandardError(error), {
          metadata: {
            service: 'sessions.service',
            method: 'getSessionPlayers',
            sessionId,
          },
        });
        return createServiceError(error.message);
      }
      return createServiceSuccess(data || []);
    } catch (error) {
      log.error(
        'Unexpected error getting session players',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'sessions.service',
            method: 'getSessionPlayers',
            sessionId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Update player ready status
   */
  async updatePlayerReady(
    sessionId: string,
    userId: string,
    isReady: boolean
  ): Promise<{ player: SessionPlayer | null; error?: string }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_session_players')
        .update({
          is_ready: isReady,
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return { player: null, error: error.message };
      }

      return { player: data };
    } catch (error) {
      return {
        player: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update player ready status',
      };
    }
  },

  /**
   * Update player details (display name, color, team)
   */
  async updatePlayer(
    sessionId: string,
    userId: string,
    updates: {
      display_name?: string;
      color?: string;
      team?: number | null;
    }
  ): Promise<ServiceResponse<SessionPlayer>> {
    if (
      updates.display_name &&
      (updates.display_name.length < 3 || updates.display_name.length > 20)
    ) {
      return createServiceError(
        'Display name must be between 3 and 20 characters'
      );
    }

    try {
      const supabase = createClient();

      if (updates.color) {
        const { count: colorTaken, error: colorCheckError } = await supabase
          .from('bingo_session_players')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .eq('color', updates.color)
          .not('user_id', 'eq', userId);

        if (colorCheckError) throw toStandardError(colorCheckError);
        if (colorTaken && colorTaken > 0) {
          return createServiceError('Color already taken');
        }
      }

      const { data, error } = await supabase
        .from('bingo_session_players')
        .update(updates)
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        log.error('Failed to update player', toStandardError(error), {
          metadata: {
            service: 'sessions.service',
            method: 'updatePlayer',
            sessionId,
            userId,
            updates,
          },
        });
        return createServiceError(error.message);
      }
      return createServiceSuccess(data);
    } catch (error) {
      log.error(
        'Unexpected error updating player',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'sessions.service',
            method: 'updatePlayer',
            sessionId,
            userId,
            updates,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Check if session exists and get status
   */
  async getSessionStatus(
    sessionId: string
  ): Promise<{ status: SessionStatus | null; error?: string }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_sessions')
        .select('status')
        .eq('id', sessionId)
        .single();

      if (error) {
        return { status: null, error: error.message };
      }

      return { status: data.status };
    } catch (error) {
      return {
        status: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get session status',
      };
    }
  },

  /**
   * Check if player exists in session
   */
  async checkPlayerExists(
    sessionId: string,
    userId: string
  ): Promise<{ exists: boolean; error?: string }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_session_players')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found
        return { exists: false, error: error.message };
      }

      return { exists: !!data };
    } catch (error) {
      return {
        exists: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check player existence',
      };
    }
  },

  /**
   * Check if color is available in session
   */
  async checkColorAvailable(
    sessionId: string,
    color: string,
    excludeUserId?: string
  ): Promise<{ available: boolean; error?: string }> {
    try {
      const supabase = createClient();
      let query = supabase
        .from('bingo_session_players')
        .select('color')
        .eq('session_id', sessionId)
        .eq('color', color);

      if (excludeUserId) {
        query = query.neq('user_id', excludeUserId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found
        return { available: false, error: error.message };
      }

      return { available: !data };
    } catch (error) {
      return {
        available: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check color availability',
      };
    }
  },

  /**
   * Get sessions by board ID with optional status filter
   */
  async getSessionsByBoardId(
    boardId: string,
    status?: SessionStatus
  ): Promise<ServiceResponse<BingoSession[]>> {
    try {
      const supabase = createClient();
      let query = supabase
        .from('bingo_sessions')
        .select('*')
        .eq('board_id', boardId);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        log.error(
          'Failed to get sessions by board ID',
          toStandardError(error),
          {
            metadata: {
              service: 'sessions.service',
              method: 'getSessionsByBoardId',
              boardId,
              status,
            },
          }
        );
        return createServiceError(error.message);
      }
      return createServiceSuccess(data || []);
    } catch (error) {
      log.error(
        'Unexpected error getting sessions by board ID',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'sessions.service',
            method: 'getSessionsByBoardId',
            boardId,
            status,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Start a session (host only)
   */
  async startSession(
    sessionId: string,
    hostId: string
  ): Promise<{ session: BingoSession | null; error?: string }> {
    try {
      const supabase = createClient();

      // Verify host
      const { data: session, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select('host_id, status')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        return { session: null, error: 'Session not found' };
      }

      if (session.host_id !== hostId) {
        return { session: null, error: 'Only the host can start the session' };
      }

      if (session.status !== 'waiting') {
        return { session: null, error: 'Session is not in waiting state' };
      }

      // Check player count
      const { count: playerCount } = await supabase
        .from('bingo_session_players')
        .select('*', { count: 'exact' })
        .eq('session_id', sessionId);

      if ((playerCount || 0) < 2) {
        return { session: null, error: 'Need at least 2 players to start' };
      }

      // Update session status
      return this.updateSessionStatus(sessionId, 'active');
    } catch (error) {
      return {
        session: null,
        error:
          error instanceof Error ? error.message : 'Failed to start session',
      };
    }
  },

  /**
   * Update session (for PATCH endpoint)
   */
  async updateSession(
    sessionId: string,
    updates: {
      current_state?: CompositeTypes<'board_cell'>[] | null;
      winner_id?: string | null;
      status?: SessionStatus;
    }
  ): Promise<{ session: BingoSession | null; error?: string }> {
    try {
      const supabase = createClient();

      const updateData: Partial<BingoSession> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (updates.status === 'completed') {
        updateData.ended_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('bingo_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        return { session: null, error: error.message };
      }

      return { session: data };
    } catch (error) {
      return {
        session: null,
        error:
          error instanceof Error ? error.message : 'Failed to update session',
      };
    }
  },

  /**
   * Join session by ID (direct join without session code)
   */
  async joinSessionById(
    sessionId: string,
    userId: string,
    playerData: {
      display_name: string;
      color: string;
      team?: number | null;
    }
  ): Promise<
    ServiceResponse<{ session: BingoSession; player: SessionPlayer }>
  > {
    try {
      const supabase = createClient();
      // Check if session exists and is accepting players
      const { data: session, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select('*')
        .eq('id', sessionId)
        .in('status', ['waiting', 'active'])
        .single();

      if (sessionError || !session) {
        return createServiceError('Session not found or has already started.');
      }

      // Check if player is already in the session
      const { count: existingPlayer, error: playerCheckError } = await supabase
        .from('bingo_session_players')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (playerCheckError) {
        throw toStandardError(playerCheckError);
      }

      if (existingPlayer && existingPlayer > 0) {
        return createServiceError('Already in session');
      }

      // Add player to the session
      const { data: newPlayer, error: insertError } = await supabase
        .from('bingo_session_players')
        .insert({
          session_id: sessionId,
          user_id: userId,
          display_name: playerData.display_name,
          color: playerData.color,
          team: playerData.team,
        })
        .select()
        .single();

      if (insertError) {
        log.error('Failed to join session', insertError, {
          metadata: {
            service: 'sessions.service',
            method: 'joinSessionById',
            sessionId,
            userId,
          },
        });
        return createServiceError('Failed to add player to session');
      }

      if (!newPlayer) {
        return createServiceError('Failed to create player record');
      }

      return createServiceSuccess({ session, player: newPlayer });
    } catch (error) {
      log.error(
        'Unexpected error joining session',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'sessions.service',
            method: 'joinSessionById',
            sessionId,
            userId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Update board state with optimistic locking
   */
  async updateBoardState(
    sessionId: string,
    boardState: CompositeTypes<'board_cell'>[],
    currentVersion: number
  ): Promise<ServiceResponse<BingoSession>> {
    try {
      const supabase = createClient();

      // First check current version for optimistic locking
      const { data: currentSession, error: checkError } = await supabase
        .from('bingo_sessions')
        .select('version, current_state')
        .eq('id', sessionId)
        .single();

      if (checkError) {
        log.error('Failed to check session version', checkError, {
          metadata: {
            service: 'sessions.service',
            method: 'updateBoardState',
            sessionId,
          },
        });
        return createServiceError(checkError.message);
      }

      if (!currentSession) {
        return createServiceError('Session not found');
      }

      // Check for version conflict
      if (currentSession.version !== currentVersion) {
        return createServiceError(
          'Version conflict - session has been updated by another player'
        );
      }

      // Update with new version
      const newVersion = currentVersion + 1;
      const { data, error } = await supabase
        .from('bingo_sessions')
        .update({
          current_state: boardState,
          version: newVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('version', currentVersion) // Ensure atomic update
        .select()
        .single();

      if (error) {
        log.error('Failed to update board state', toStandardError(error), {
          metadata: {
            service: 'sessions.service',
            method: 'updateBoardState',
            sessionId,
          },
        });
        return createServiceError(error.message);
      }

      if (!data) {
        return createServiceError(
          'Version conflict - session has been updated by another player'
        );
      }

      const validationResult = bingoSessionSchema.safeParse(data);
      if (!validationResult.success) {
        log.error('Updated session validation failed', validationResult.error, {
          metadata: {
            service: 'sessions.service',
            method: 'updateBoardState',
            sessionId,
          },
        });
        return createServiceError('Invalid session data format');
      }

      return createServiceSuccess(validationResult.data);
    } catch (error) {
      log.error(
        'Unexpected error updating board state',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'sessions.service',
            method: 'updateBoardState',
            sessionId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<ServiceResponse<void>> {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('bingo_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        log.error('Failed to delete session', toStandardError(error), {
          metadata: {
            service: 'sessions.service',
            method: 'deleteSession',
            sessionId,
          },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(undefined);
    } catch (error) {
      log.error(
        'Unexpected error deleting session',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'sessions.service',
            method: 'deleteSession',
            sessionId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },
};
