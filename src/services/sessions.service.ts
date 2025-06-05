/**
 * Bingo Sessions Service
 *
 * Pure functions for multiplayer bingo session operations.
 * No state management - only data fetching and mutations.
 */

import { createClient } from '@/lib/supabase';
import type { Tables, Enums, CompositeTypes } from '@/types/database-generated';

// Use database types
export type BingoSession = Tables<'bingo_sessions'>;
export type SessionPlayer = Tables<'bingo_session_players'>;
export type SessionSettings = CompositeTypes<'session_settings'>;
export type SessionStatus = Enums<'session_status'>;
export type GameCategory = Enums<'game_category'>;

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
  ): Promise<{ session: BingoSession | null; error?: string }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        return { session: null, error: error.message };
      }

      return { session: data as BingoSession };
    } catch (error) {
      return {
        session: null,
        error:
          error instanceof Error ? error.message : 'Failed to fetch session',
      };
    }
  },

  /**
   * Get session by code
   */
  async getSessionByCode(
    sessionCode: string
  ): Promise<{ session: BingoSession | null; error?: string }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_sessions')
        .select('*')
        .eq('session_code', sessionCode)
        .single();

      if (error) {
        return { session: null, error: error.message };
      }

      return { session: data as BingoSession };
    } catch (error) {
      return {
        session: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch session by code',
      };
    }
  },

  /**
   * Get public/active sessions with filtering
   */
  async getActiveSessions(
    filters: SessionFilters = {},
    page = 1,
    limit = 20
  ): Promise<{ sessions: BingoSession[]; totalCount: number; error?: string }> {
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
        return {
          sessions: [],
          totalCount: 0,
          error: error.message,
        };
      }

      return {
        sessions: (data || []) as BingoSession[],
        totalCount: count || 0,
      };
    } catch (error) {
      return {
        sessions: [],
        totalCount: 0,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch active sessions',
      };
    }
  },

  /**
   * Create a new session
   */
  async createSession(
    sessionData: CreateSessionData
  ): Promise<{ session: BingoSession | null; error?: string }> {
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
        return { session: null, error: error.message };
      }

      return { session: data as BingoSession };
    } catch (error) {
      return {
        session: null,
        error:
          error instanceof Error ? error.message : 'Failed to create session',
      };
    }
  },

  /**
   * Join a session
   */
  async joinSession(
    joinData: JoinSessionData
  ): Promise<{ player: SessionPlayer | null; error?: string }> {
    try {
      const supabase = createClient();

      // First verify session exists and is joinable
      const { data: session, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select('*')
        .eq('id', joinData.session_id)
        .single();

      if (sessionError || !session) {
        return { player: null, error: 'Session not found' };
      }

      if (session.status !== 'waiting') {
        return { player: null, error: 'Session is not accepting new players' };
      }

      // Check password if required
      if (
        session.settings?.password &&
        session.settings.password !== joinData.password
      ) {
        return { player: null, error: 'Invalid session password' };
      }

      // Check if user is already in session
      const { data: existingPlayer } = await supabase
        .from('bingo_session_players')
        .select('id')
        .eq('session_id', joinData.session_id)
        .eq('user_id', joinData.user_id)
        .single();

      if (existingPlayer) {
        return { player: null, error: 'Already in session' };
      }

      // Add player to session
      const { data, error } = await supabase
        .from('bingo_session_players')
        .insert({
          session_id: joinData.session_id,
          user_id: joinData.user_id,
          display_name: joinData.display_name,
          color: joinData.color,
          team: joinData.team || null,
          score: 0,
          is_ready: false,
        })
        .select()
        .single();

      if (error) {
        return { player: null, error: error.message };
      }

      return { player: data as SessionPlayer };
    } catch (error) {
      return {
        player: null,
        error:
          error instanceof Error ? error.message : 'Failed to join session',
      };
    }
  },

  /**
   * Leave a session
   */
  async leaveSession(
    sessionId: string,
    userId: string
  ): Promise<{ error?: string }> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('bingo_session_players')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : 'Failed to leave session',
      };
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
  ): Promise<{ players: SessionPlayer[]; error?: string }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bingo_session_players')
        .select('*')
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true });

      if (error) {
        return { players: [], error: error.message };
      }

      return { players: (data || []) as SessionPlayer[] };
    } catch (error) {
      return {
        players: [],
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch session players',
      };
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
};
