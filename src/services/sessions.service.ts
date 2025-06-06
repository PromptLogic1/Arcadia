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
    error?: string 
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
          error: 'Session is no longer accepting players' 
        };
      }

      // Check password if session is password protected
      const sessionPassword = session.settings?.password;
      if (sessionPassword && sessionPassword.trim()) {
        if (!playerData.password || playerData.password.trim() !== sessionPassword.trim()) {
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
        return { session, player: existingPlayer, sessionId: session.id, error: undefined };
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

      return { session, player: newPlayer, sessionId: session.id, error: undefined };
    } catch (error) {
      return {
        session: null,
        player: null,
        error:
          error instanceof Error ? error.message : 'Failed to join session by code',
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
  ): Promise<{ player: SessionPlayer | null; error?: string }> {
    try {
      const supabase = createClient();

      // Validate display name if provided
      if (updates.display_name !== undefined) {
        if (updates.display_name.length < 3 || updates.display_name.length > 20) {
          return { player: null, error: 'Display name must be between 3 and 20 characters' };
        }
      }

      // Check if color is already taken by another player
      if (updates.color) {
        const { data: colorCheck } = await supabase
          .from('bingo_session_players')
          .select('user_id')
          .eq('session_id', sessionId)
          .eq('color', updates.color)
          .neq('user_id', userId)
          .single();

        if (colorCheck) {
          return { player: null, error: 'Color already taken' };
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
        return { player: null, error: error.message };
      }

      return { player: data };
    } catch (error) {
      return {
        player: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update player',
      };
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

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
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

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
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
  ): Promise<{ sessions: BingoSession[]; error?: string }> {
    try {
      const supabase = createClient();
      let query = supabase
        .from('bingo_sessions')
        .select('*')
        .eq('board_id', boardId);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.order('created_at', {
        ascending: false,
      });

      if (error) {
        return { sessions: [], error: error.message };
      }

      return { sessions: (data || []) as BingoSession[] };
    } catch (error) {
      return {
        sessions: [],
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch sessions by board ID',
      };
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
  ): Promise<{
    session: BingoSession | null;
    player: SessionPlayer | null;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      // Check if session exists and is accepting players
      const { data: session, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        return { session: null, player: null, error: 'Session not found' };
      }

      if (session.status !== 'waiting') {
        return { session: null, player: null, error: 'Session is not accepting new players' };
      }

      // Check if player is already in session
      const { data: existingPlayer } = await supabase
        .from('bingo_session_players')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .single();

      if (existingPlayer) {
        return { session, player: existingPlayer, error: 'Already in session' };
      }

      // Check max players
      const { count: playerCount } = await supabase
        .from('bingo_session_players')
        .select('*', { count: 'exact' })
        .eq('session_id', sessionId);

      const maxPlayers = session.settings?.max_players || 4;
      if ((playerCount || 0) >= maxPlayers) {
        return { session: null, player: null, error: 'Session is full' };
      }

      // Add player to session
      const { data: newPlayer, error: playerError } = await supabase
        .from('bingo_session_players')
        .insert({
          session_id: sessionId,
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

      return { session, player: newPlayer, error: undefined };
    } catch (error) {
      return {
        session: null,
        player: null,
        error:
          error instanceof Error ? error.message : 'Failed to join session',
      };
    }
  },
};
