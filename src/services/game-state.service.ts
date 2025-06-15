import { createClient } from '@/lib/supabase';
import type { BoardCell } from '@/types/domains/bingo';
import type { Tables, TablesUpdate } from '@/types/database.types';
import {
  createServiceError,
  createServiceSuccess,
  type ServiceResponse,
} from '@/lib/service-types';
import { getErrorMessage, isError } from '@/lib/error-guards';
import { log } from '@/lib/logger';
import { boardStateSchema } from '@/lib/validation/schemas/bingo';
import {
  transformBoardState,
  transformBoardCell,
} from '@/lib/validation/transforms';

// Type for bingo_session_players
type SessionPlayer = Tables<'bingo_session_players'>;

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
  players: SessionPlayer[];
}

export const gameStateService = {
  async getSessionState(
    sessionId: string
  ): Promise<ServiceResponse<Tables<'bingo_sessions'>>> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('bingo_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      if (!data) return createServiceError('Session not found');

      return createServiceSuccess(data);
    } catch (error) {
      log.error(
        'Error getting session state',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'gameStateService',
            method: 'getSessionState',
            sessionId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  async startSession(
    sessionId: string,
    hostId: string
  ): Promise<ServiceResponse<null>> {
    const supabase = createClient();

    try {
      // Verify host
      const { data: session, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select('host_id, status')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        return createServiceError('Session not found');
      }

      if (session.host_id !== hostId) {
        return createServiceError('Only the host can start the session');
      }

      if (session.status !== 'waiting') {
        return createServiceError('Session is not in waiting state');
      }

      // Check player count
      const { count: playerCount, error: countError } = await supabase
        .from('bingo_session_players')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId);

      if (countError) throw countError;

      if ((playerCount || 0) < 2) {
        return createServiceError('Need at least 2 players to start');
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
        throw updateError;
      }

      return createServiceSuccess(null);
    } catch (error) {
      log.error(
        'Error starting session',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'gameStateService',
            method: 'startSession',
            sessionId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  async markCell(
    sessionId: string,
    data: MarkCellData
  ): Promise<ServiceResponse<{ boardState: BoardCell[]; version: number }>> {
    const supabase = createClient();

    try {
      // Start transaction-like operation
      const { data: session, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select('current_state, version, status')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        return createServiceError('Session not found');
      }

      if (session.status !== 'active') {
        return createServiceError('Session not active');
      }

      if (session.version !== data.version) {
        return createServiceError('VERSION_CONFLICT');
      }

      // Update board state
      const parseResult = boardStateSchema.safeParse(session.current_state);
      if (!parseResult.success) {
        return createServiceError('Invalid board state in database');
      }
      const currentState = parseResult.data;
      const newState = [...currentState];

      const existingCell = newState[data.cell_position];
      if (existingCell) {
        const newCellData = transformBoardCell({
          ...existingCell,
          is_marked: data.action === 'mark',
          last_updated: Date.now(),
          last_modified_by: data.user_id,
        });
        newState[data.cell_position] = newCellData;
      }

      // Update session
      const { data: updatedSession, error: updateError } = await supabase
        .from('bingo_sessions')
        .update({
          current_state: transformBoardState(newState),
          version: data.version + 1,
        })
        .eq('id', sessionId)
        .select('current_state, version')
        .single();

      if (updateError) {
        throw updateError;
      }

      if (!updatedSession) {
        return createServiceError('Failed to update session');
      }

      // Log the event
      const { error: eventError } = await supabase
        .from('bingo_session_events')
        .insert({
          session_id: sessionId,
          user_id: data.user_id,
          event_type: data.action === 'mark' ? 'cell_marked' : 'cell_unmarked',
          event_data: {
            cell_position: data.cell_position,
          },
          cell_position: data.cell_position,
          timestamp: new Date().getTime(),
        });

      if (eventError) {
        log.warn('Failed to log cell marking event', {
          metadata: {
            error: eventError,
            sessionId,
            userId: data.user_id,
            cell_position: data.cell_position,
          },
        });
      }

      const updatedParseResult = boardStateSchema.safeParse(
        updatedSession.current_state
      );
      if (!updatedParseResult.success) {
        return createServiceError('Failed to parse updated board state');
      }

      return createServiceSuccess({
        boardState: transformBoardState(updatedParseResult.data),
        version: updatedSession.version ?? 0,
      });
    } catch (error) {
      log.error(
        'Error marking cell',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'gameStateService',
            method: 'markCell',
            sessionId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  async completeGame(
    sessionId: string,
    data: CompleteGameData
  ): Promise<ServiceResponse<null>> {
    const supabase = createClient();

    const { winner_id, final_score, winning_patterns, players } = data;

    try {
      // Verify session exists and is active
      const { data: session, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select('status, started_at, board_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        return createServiceError('Session not found');
      }

      if (session.status !== 'active') {
        return createServiceError('Session is not active');
      }

      const timeToWin = session.started_at
        ? Math.floor(
            (Date.now() - new Date(session.started_at).getTime()) / 1000
          )
        : 0;

      // 1. Update session to completed
      const { error: updateSessionError } = await supabase
        .from('bingo_sessions')
        .update({
          status: 'completed',
          winner_id,
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (updateSessionError) throw updateSessionError;

      // 2. Update stats for all players in the session
      for (const player of players) {
        const { data: currentStats, error: fetchStatsError } = await supabase
          .from('user_statistics')
          .select('*')
          .eq('user_id', player.user_id)
          .single();

        if (fetchStatsError && fetchStatsError.code !== 'PGRST116') {
          // Ignore 'not found'
          log.warn('Failed to fetch user stats', {
            metadata: {
              error: fetchStatsError,
              service: 'gameStateService',
              method: 'completeGame',
              userId: player.user_id,
            },
          });
          continue; // Skip to next player
        }

        const isWinner = player.user_id === winner_id;
        const newGamesCompleted = (currentStats?.games_completed || 0) + 1;
        const newGamesWon = (currentStats?.games_won || 0) + (isWinner ? 1 : 0);

        const statsUpdate: TablesUpdate<'user_statistics'> = {
          total_games: (currentStats?.total_games || 0) + 1,
          total_score: (currentStats?.total_score || 0) + (player.score || 0),
          games_completed: newGamesCompleted,
          games_won: newGamesWon,
          last_game_at: new Date().toISOString(),
          total_playtime: (currentStats?.total_playtime || 0) + timeToWin,
          highest_score: Math.max(
            currentStats?.highest_score || 0,
            player.score || 0
          ),
        };

        if (isWinner) {
          statsUpdate.current_win_streak =
            (currentStats?.current_win_streak || 0) + 1;
          statsUpdate.longest_win_streak = Math.max(
            statsUpdate.current_win_streak,
            currentStats?.longest_win_streak || 0
          );
          statsUpdate.fastest_win = Math.min(
            currentStats?.fastest_win || Infinity,
            timeToWin
          );
        } else {
          statsUpdate.current_win_streak = 0;
        }

        const { error: updateStatsError } = await supabase
          .from('user_statistics')
          .upsert(
            { ...statsUpdate, user_id: player.user_id },
            { onConflict: 'user_id' }
          );

        if (updateStatsError) {
          log.warn('Failed to update player stats', {
            metadata: {
              error: updateStatsError,
              service: 'gameStateService',
              method: 'completeGame',
              userId: player.user_id,
            },
          });
        }
      }

      // 3. Award achievement to winner
      const { error: achievementError } = await supabase
        .from('user_achievements')
        .insert({
          user_id: winner_id,
          achievement_type: 'game_win',
          achievement_name: 'Bingo Victor',
          points: 50,
          metadata: {
            sessionId,
            boardId: session.board_id,
            final_score,
            timeToWin,
            winning_patterns,
          },
        });

      if (achievementError) {
        log.warn('Failed to award win achievement', {
          metadata: {
            error: achievementError,
            service: 'gameStateService',
            method: 'completeGame',
            userId: winner_id,
          },
        });
      }

      return createServiceSuccess(null);
    } catch (error) {
      log.error(
        'Error completing game',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'gameStateService',
            method: 'completeGame',
            sessionId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  async getGameResults(
    sessionId: string
  ): Promise<ServiceResponse<SessionPlayer[]>> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('bingo_session_players')
        .select('*')
        .eq('session_id', sessionId)
        .order('score', { ascending: false });

      if (error) throw error;

      return createServiceSuccess(data || []);
    } catch (error) {
      log.error(
        'Error getting game results',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'gameStateService',
            method: 'getGameResults',
            sessionId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },

  async getBoardState(sessionId: string): Promise<
    ServiceResponse<{
      boardState: BoardCell[];
      version: number;
    }>
  > {
    const supabase = createClient();

    try {
      const { data: session, error } = await supabase
        .from('bingo_sessions')
        .select('current_state, version')
        .eq('id', sessionId)
        .single();

      if (error) {
        throw error;
      }

      if (!session) {
        return createServiceError('Session not found');
      }

      const parseResult = boardStateSchema.safeParse(session.current_state);
      if (!parseResult.success) {
        return createServiceError('Invalid board state in database');
      }

      return createServiceSuccess({
        boardState: transformBoardState(parseResult.data),
        version: session.version ?? 0,
      });
    } catch (error) {
      log.error(
        'Error getting board state',
        isError(error) ? error : new Error(String(error)),
        {
          metadata: {
            service: 'gameStateService',
            method: 'getBoardState',
            sessionId,
          },
        }
      );
      return createServiceError(getErrorMessage(error));
    }
  },
};
