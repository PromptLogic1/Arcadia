/**
 * Session State Service
 *
 * Pure functions for session state management.
 * Extends the game-state service with session lifecycle operations.
 */

import { createClient } from '@/lib/supabase';
import { safeRealtimeManager } from '@/lib/realtime-manager';
import { logger } from '@/lib/logger';
import type { BingoSession, BoardCell, SessionStats } from '@/types';
import type { Tables } from '@/types/database-generated';

// Type for session_stats view results
type SessionStatsRow = Tables<'session_stats'>;

export interface Player {
  id: string;
  display_name: string;
  avatar_url?: string;
  joined_at: string;
  is_active: boolean;
  color: string;
  is_host?: boolean;
  is_ready?: boolean;
  score?: number;
  position?: number;
}

export interface SessionState {
  id: string;
  isActive: boolean;
  isPaused: boolean;
  isFinished: boolean;
  startTime: number | null;
  endTime: number | null;
  currentPlayer: Player | null;
  players: Player[];
  boardState: BoardCell[];
  version: number;
}

export interface SessionStateCreateData {
  board_id: string;
  host_id: string;
  settings?: {
    max_players?: number;
    auto_start?: boolean;
    time_limit?: number;
  };
}

export interface SessionStateJoinData {
  session_id: string;
  player_id: string;
  display_name: string;
  avatar_url?: string;
}

export const sessionStateService = {
  /**
   * Initialize or join a session
   */
  async initializeSession(
    boardId: string,
    player: Player
  ): Promise<{
    session: SessionStatsRow | null;
    isNewSession: boolean;
    error?: string;
  }> {
    const supabase = createClient();

    try {
      // First check if an active session exists for this board
      const { data: existingSession, error: findError } = await supabase
        .from('session_stats')
        .select('*')
        .eq('board_id', boardId)
        .eq('status', 'waiting')
        .single();

      if (findError && findError.code !== 'PGRST116') {
        // PGRST116 = no rows found
        return { session: null, isNewSession: false, error: findError.message };
      }

      if (existingSession) {
        // Join existing session
        if (!existingSession.id) {
          return {
            session: null,
            isNewSession: false,
            error: 'Invalid session ID',
          };
        }

        const { error: joinError } = await supabase
          .from('bingo_session_players')
          .insert([
            {
              session_id: existingSession.id,
              user_id: player.id,
              display_name: player.display_name,
              avatar_url: player.avatar_url || null,
              color: player.color,
            },
          ]);

        if (joinError) {
          return {
            session: null,
            isNewSession: false,
            error: joinError.message,
          };
        }

        return {
          session: existingSession,
          isNewSession: false,
        };
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('bingo_sessions')
          .insert([
            {
              board_id: boardId,
              host_id: player.id,
              session_code: sessionStateService.generateSessionCode(),
              status: 'waiting',
              settings: {
                max_players: 4,
                auto_start: false,
                time_limit: null,
                allow_spectators: false,
                require_approval: false,
                password: null,
              },
            },
          ])
          .select()
          .single();

        if (createError) {
          return {
            session: null,
            isNewSession: true,
            error: createError.message,
          };
        }

        // Add host as first player
        if (!newSession.id) {
          return {
            session: null,
            isNewSession: true,
            error: 'Failed to create session with valid ID',
          };
        }

        const { error: hostJoinError } = await supabase
          .from('bingo_session_players')
          .insert([
            {
              session_id: newSession.id,
              user_id: player.id,
              display_name: player.display_name,
              avatar_url: player.avatar_url || null,
              color: player.color,
              is_host: true,
            },
          ]);

        if (hostJoinError) {
          return {
            session: null,
            isNewSession: true,
            error: hostJoinError.message,
          };
        }

        // Fetch the full session from session_stats view
        const { data: fullSession } = await supabase
          .from('session_stats')
          .select('*')
          .eq('id', newSession.id)
          .single();

        if (!fullSession) {
          return {
            session: null,
            isNewSession: true,
            error: 'Failed to fetch created session details',
          };
        }

        return {
          session: fullSession,
          isNewSession: true,
        };
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to initialize session';
      return { session: null, isNewSession: false, error: message };
    }
  },

  /**
   * Get session players
   */
  async getSessionPlayers(
    sessionId: string
  ): Promise<{ players: Player[]; error?: string }> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('bingo_session_players')
        .select('*')
        .eq('session_id', sessionId)
        .is('left_at', null)
        .order('joined_at', { ascending: true });

      if (error) {
        return { players: [], error: error.message };
      }

      const players: Player[] = (data || [])
        .filter(
          player =>
            player.user_id &&
            player.display_name &&
            player.joined_at &&
            player.color
        )
        .map(player => ({
          id: player.user_id as string,
          display_name: player.display_name as string,
          avatar_url: player.avatar_url || undefined,
          joined_at: player.joined_at as string,
          is_active: player.is_ready ?? true,
          color: player.color as string,
          is_host: player.is_host ?? false,
          is_ready: player.is_ready ?? true,
          score: player.score ?? 0,
          position: player.position ?? undefined,
        }));

      return { players };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to get session players';
      return { players: [], error: message };
    }
  },

  /**
   * Leave session
   */
  async leaveSession(
    sessionId: string,
    playerId: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('bingo_session_players')
        .update({ left_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('user_id', playerId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to leave session';
      return { success: false, error: message };
    }
  },

  /**
   * Subscribe to session state changes
   */
  subscribeToSession(
    sessionId: string,
    onStateChange: (data: {
      session: SessionStatsRow;
      players: Player[];
    }) => void
  ): () => void {
    const channelName = `session:${sessionId}`;
    
    // Subscribe to session changes
    const unsubscribeSession = safeRealtimeManager.subscribe(
      `${channelName}_sessions`,
      {
        event: '*',
        schema: 'public',
        table: 'bingo_sessions',
        filter: `id=eq.${sessionId}`,
        onUpdate: async () => {
          // Fetch updated session data
          const supabase = createClient();
          const { data: session } = await supabase
            .from('session_stats')
            .select('*')
            .eq('id', sessionId)
            .single();

          const { players } = await sessionStateService.getSessionPlayers(sessionId);

          if (session) {
            onStateChange({
              session: session,
              players,
            });
          }
        },
        onError: (error: Error) => {
          logger.error('Session subscription error', error, {
            metadata: { sessionId }
          });
        }
      }
    );
    
    // Subscribe to player changes
    const unsubscribePlayers = safeRealtimeManager.subscribe(
      `${channelName}_players`,
      {
        event: '*',
        schema: 'public',
        table: 'bingo_session_players',
        filter: `session_id=eq.${sessionId}`,
        onUpdate: async () => {
          // Fetch updated players
          const { players } = await sessionStateService.getSessionPlayers(sessionId);
          const supabase = createClient();
          const { data: session } = await supabase
            .from('session_stats')
            .select('*')
            .eq('id', sessionId)
            .single();

          if (session) {
            onStateChange({
              session: session,
              players,
            });
          }
        },
        onError: (error: Error) => {
          logger.error('Player subscription error', error, {
            metadata: { sessionId }
          });
        }
      }
    );

    return () => {
      unsubscribeSession();
      unsubscribePlayers();
    };
  },

  /**
   * Generate a unique session code
   */
  generateSessionCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Transform session state for UI
   */
  transformSessionState(
    session: BingoSession | SessionStats,
    players: Player[],
    boardState: BoardCell[]
  ): SessionState | null {
    if (!session.id) {
      return null;
    }

    return {
      id: session.id,
      isActive: session.status === 'active',
      isPaused: false, // Note: 'paused' status not in current schema
      isFinished: session.status === 'completed',
      startTime: session.started_at
        ? new Date(session.started_at).getTime()
        : null,
      endTime:
        'ended_at' in session && session.ended_at
          ? new Date(session.ended_at).getTime()
          : null,
      currentPlayer: players[0] || null,
      players,
      boardState,
      version: ('version' in session ? session.version : null) || 0,
    };
  },
};
