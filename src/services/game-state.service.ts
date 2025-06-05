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
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/bingo/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start session');
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
    try {
      const response = await fetch(
        `/api/bingo/sessions/${sessionId}/mark-cell`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          throw new Error('VERSION_CONFLICT');
        }
        throw new Error(errorData.error || 'Failed to mark cell');
      }

      const result = await response.json();
      return {
        boardState: result.current_state,
        version: result.version,
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
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `/api/bingo/sessions/${sessionId}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete game');
      }

      return { success: true };
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
    try {
      const response = await fetch(
        `/api/bingo/sessions/${sessionId}/board-state`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get board state');
      }

      const data = await response.json();
      return {
        boardState: data.current_state,
        version: data.version,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get board state';
      return { boardState: null, version: 0, error: message };
    }
  },
};
