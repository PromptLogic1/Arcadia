/**
 * Session Join Service
 *
 * Pure functions for session joining operations.
 * No state management - only data fetching and mutations.
 */

import { createClient } from '@/lib/supabase';
import type { Tables } from '@/types/database-generated';

// Use types directly from database-generated (no duplicate exports)
type BingoSession = Tables<'bingo_sessions'>;
type BingoSessionPlayer = Tables<'bingo_session_players'>;

export interface SessionJoinDetails {
  session: BingoSession;
  currentPlayerCount: number;
  canJoin: boolean;
  reason?: string;
}

export interface SessionJoinData {
  sessionId: string;
  playerName: string;
  selectedColor: string;
  teamName?: string;
}

export const sessionJoinService = {
  /**
   * Get session details for joining
   */
  async getSessionJoinDetails(sessionId: string): Promise<{
    details: SessionJoinDetails | null;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      // Get session with board settings
      const { data: sessionData, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select(
          `
          *,
          bingo_boards!inner(
            settings,
            title,
            description,
            game_type,
            difficulty
          )
        `
        )
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        return {
          details: null,
          error:
            sessionError.code === 'PGRST116'
              ? 'Session not found'
              : sessionError.message,
        };
      }

      if (!sessionData) {
        return { details: null, error: 'Session not found' };
      }

      // Check if session is joinable
      if (sessionData.status !== 'waiting' && sessionData.status !== 'active') {
        return {
          details: null,
          error: `Session is ${sessionData.status}. Cannot join at this time.`,
        };
      }

      // Get current player count
      const { count: playerCount, error: countError } = await supabase
        .from('bingo_session_players')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId);

      if (countError) {
        return { details: null, error: 'Failed to check player count' };
      }

      const currentPlayerCount = playerCount || 0;
      const maxPlayers = sessionData.settings?.max_players || 4;
      const canJoin = currentPlayerCount < maxPlayers;

      const details: SessionJoinDetails = {
        session: sessionData as BingoSession,
        currentPlayerCount,
        canJoin,
        reason: canJoin ? undefined : 'Session is full',
      };

      return { details };
    } catch (error) {
      return {
        details: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get session details',
      };
    }
  },

  /**
   * Join a session
   */
  async joinSession(data: SessionJoinData): Promise<{
    player: BingoSessionPlayer | null;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return { player: null, error: 'Must be authenticated to join session' };
      }

      // Check if user is already in the session
      const { data: existingPlayer } = await supabase
        .from('bingo_session_players')
        .select('*')
        .eq('session_id', data.sessionId)
        .eq('user_id', user.id)
        .single();

      if (existingPlayer) {
        return {
          player: existingPlayer as BingoSessionPlayer,
          error: 'You are already in this session',
        };
      }

      // Verify session is still joinable
      const { details } = await this.getSessionJoinDetails(data.sessionId);
      if (!details?.canJoin) {
        return {
          player: null,
          error: details?.reason || 'Cannot join session',
        };
      }

      // Join the session
      const { data: newPlayer, error: joinError } = await supabase
        .from('bingo_session_players')
        .insert({
          session_id: data.sessionId,
          user_id: user.id,
          display_name: data.playerName,
          color: data.selectedColor,
          team: data.teamName ? 1 : null, // Simple team assignment
          joined_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (joinError) {
        return {
          player: null,
          error: joinError.message,
        };
      }

      return { player: newPlayer as BingoSessionPlayer };
    } catch (error) {
      return {
        player: null,
        error:
          error instanceof Error ? error.message : 'Failed to join session',
      };
    }
  },

  /**
   * Check if user is already in session
   */
  async checkUserInSession(sessionId: string): Promise<{
    isInSession: boolean;
    player?: BingoSessionPlayer;
    error?: string;
  }> {
    try {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return { isInSession: false, error: 'Not authenticated' };
      }

      // Check if user is in session
      const { data: player, error } = await supabase
        .from('bingo_session_players')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        return { isInSession: false, error: error.message };
      }

      return {
        isInSession: !!player,
        player: player as BingoSessionPlayer | undefined,
      };
    } catch (error) {
      return {
        isInSession: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check session status',
      };
    }
  },

  /**
   * Get available player colors for session
   */
  async getAvailableColors(sessionId: string): Promise<{
    availableColors: string[];
    usedColors: string[];
    error?: string;
  }> {
    try {
      const supabase = createClient();

      // Get all players in session
      const { data: players, error } = await supabase
        .from('bingo_session_players')
        .select('color')
        .eq('session_id', sessionId);

      if (error) {
        return {
          availableColors: [],
          usedColors: [],
          error: error.message,
        };
      }

      const usedColors = players?.map(p => p.color).filter(Boolean) || [];

      // Default available colors (you can import this from constants)
      const allColors = [
        '#06b6d4',
        '#8b5cf6',
        '#ec4899',
        '#10b981',
        '#f59e0b',
        '#ef4444',
        '#eab308',
        '#6366f1',
        '#14b8a6',
        '#f43f5e',
        '#84cc16',
        '#0ea5e9',
      ];

      const availableColors = allColors.filter(
        color => !usedColors.includes(color)
      );

      return { availableColors, usedColors };
    } catch (error) {
      return {
        availableColors: [],
        usedColors: [],
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get available colors',
      };
    }
  },
};
