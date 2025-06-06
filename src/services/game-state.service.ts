import { createClient } from '@/lib/supabase';
import type { BoardCell, GameResult } from '@/types';
import type { Tables } from '@/types/database-generated';

// Type for session_stats view results
type SessionStatsRow = Tables<'session_stats'>;

export interface MarkCellData {
  cell_position: number;
  user_id: string;
  action: 'mark' | 'unmark';
  version: number;
}

export interface CompleteGameData {
  winner_id: string;
  winning_patterns: string[];
  final_score: number;
}

export const gameStateService = {
  async getSessionState(
    sessionId: string
  ): Promise<{ session: SessionStatsRow | null; error?: string }> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('session_stats')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      return { session: data };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load session';
      return { session: null, error: message };
    }
  },

  async startSession(
    sessionId: string,
    hostId: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    try {
      // Verify host
      const { data: session, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select('host_id, status')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        throw new Error('Session not found');
      }

      if (session.host_id !== hostId) {
        throw new Error('Only the host can start the session');
      }

      if (session.status !== 'waiting') {
        throw new Error('Session is not in waiting state');
      }

      // Check player count
      const { count: playerCount } = await supabase
        .from('bingo_session_players')
        .select('*', { count: 'exact' })
        .eq('session_id', sessionId);

      if ((playerCount || 0) < 2) {
        throw new Error('Need at least 2 players to start');
      }

      // Update session status
      const { error: updateError } = await supabase
        .from('bingo_sessions')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to start session';
      return { success: false, error: message };
    }
  },

  async markCell(
    sessionId: string,
    data: MarkCellData
  ): Promise<{
    boardState: BoardCell[] | null;
    version: number;
    error?: string;
  }> {
    const supabase = createClient();

    try {
      // Start transaction-like operation
      const { data: session, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select('current_state, version, status')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        throw new Error('Session not found');
      }

      if (session.status !== 'active') {
        throw new Error('Session not active');
      }

      if (session.version !== data.version) {
        throw new Error('VERSION_CONFLICT');
      }

      // Update board state
      const currentState = (session.current_state as BoardCell[]) || [];
      const newState = [...currentState];

      const existingCell = newState[data.cell_position];
      if (existingCell) {
        if (data.action === 'mark') {
          newState[data.cell_position] = {
            text: existingCell.text,
            colors: existingCell.colors,
            completed_by: existingCell.completed_by,
            blocked: existingCell.blocked,
            is_marked: true,
            cell_id: existingCell.cell_id,
            version: existingCell.version,
            last_updated: Date.now(),
            last_modified_by: data.user_id,
          };
        } else {
          newState[data.cell_position] = {
            text: existingCell.text,
            colors: existingCell.colors,
            completed_by: existingCell.completed_by,
            blocked: existingCell.blocked,
            is_marked: false,
            cell_id: existingCell.cell_id,
            version: existingCell.version,
            last_updated: Date.now(),
            last_modified_by: data.user_id,
          };
        }
      }

      // Update session
      const { data: updatedSession, error: updateError } = await supabase
        .from('bingo_sessions')
        .update({
          current_state: newState,
          version: data.version + 1,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Log the event
      await supabase.from('bingo_session_events').insert({
        session_id: sessionId,
        user_id: data.user_id,
        event_type: data.action === 'mark' ? 'cell_marked' : 'cell_unmarked',
        event_data: { cell_position: data.cell_position, timestamp: Date.now() },
        cell_position: data.cell_position,
        timestamp: Date.now(),
      });

      return {
        boardState: updatedSession.current_state as BoardCell[],
        version: updatedSession.version || 0,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to mark cell';
      return { boardState: null, version: 0, error: message };
    }
  },

  async completeGame(
    sessionId: string,
    data: CompleteGameData
  ): Promise<{ 
    success: boolean; 
    winner?: {
      id: string;
      patterns: string[];
      score: number;
      timeToWin: number;
    };
    error?: string;
  }> {
    const supabase = createClient();

    try {
      // Verify session exists and is active
      const { data: session, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select('status, started_at')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        throw new Error('Session not found');
      }

      if (session.status !== 'active') {
        throw new Error('Session is not active');
      }

      // Calculate time to win
      const timeToWin = session.started_at
        ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
        : 0;

      // Update session status
      const { error: updateError } = await supabase
        .from('bingo_sessions')
        .update({
          status: 'completed',
          winner_id: data.winner_id,
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Log the winning event
      const eventData = {
        patterns: data.winning_patterns,
        final_score: data.final_score,
        time_to_win: timeToWin,
      };

      await supabase.from('bingo_session_events').insert({
        session_id: sessionId,
        user_id: data.winner_id,
        event_type: 'game_won',
        event_data: eventData,
        timestamp: Date.now(),
      });

      // Create game result entry for the winner
      await supabase.from('game_results').insert({
        session_id: sessionId,
        user_id: data.winner_id,
        placement: 1,
        final_score: data.final_score,
        time_to_win: timeToWin,
        patterns_achieved: data.winning_patterns,
      });

      return { 
        success: true,
        winner: {
          id: data.winner_id,
          patterns: data.winning_patterns,
          score: data.final_score,
          timeToWin,
        }
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to complete game';
      return { success: false, error: message };
    }
  },

  async getGameResults(
    sessionId: string
  ): Promise<{ results: GameResult[] | null; error?: string }> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('game_results')
        .select(
          `
          *,
          user:users!user_id(id, username, avatar_url)
        `
        )
        .eq('session_id', sessionId)
        .order('placement', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { results: (data as GameResult[]) || [] };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load game results';
      return { results: null, error: message };
    }
  },

  async getBoardState(sessionId: string): Promise<{
    boardState: BoardCell[] | null;
    version: number;
    error?: string;
  }> {
    const supabase = createClient();

    try {
      const { data: session, error } = await supabase
        .from('bingo_sessions')
        .select('current_state, version')
        .eq('id', sessionId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!session) {
        throw new Error('Session not found');
      }

      return {
        boardState: (session.current_state as BoardCell[]) || [],
        version: session.version || 0,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get board state';
      return { boardState: null, version: 0, error: message };
    }
  },
};
