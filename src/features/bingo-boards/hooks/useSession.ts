'use client';

import { useCallback } from 'react';
import { useSessionState } from '@/hooks/queries/useSessionStateQueries';
import { useMarkCellMutation, useCompleteGameMutation } from '@/hooks/queries/useGameStateQueries';
import { useAuth } from '@/lib/stores/auth-store';
import { logger } from '@/lib/logger';
import type { Player, SessionState } from '../../../services/session-state.service';
import type { GameCategory } from '../types/types';
import { PLAYER_COLORS } from '@/types';

interface UseSessionProps {
  boardId: string;
  sessionId?: string;
  _game: GameCategory;
  onSessionEnd?: () => void;
}

interface UseSessionReturn {
  sessionState: SessionState;
  isLoading: boolean;
  error: Error | null;
  initializeSession: () => Promise<void>;
  joinSession: () => Promise<void>;
  leaveSession: () => Promise<void>;
  markCell: (position: number) => Promise<void>;
  completeGame: (winnerId: string, patterns: string[], score: number) => Promise<void>;
}

export const useSession = ({
  boardId,
  sessionId = '',
  _game,
  onSessionEnd,
}: UseSessionProps): UseSessionReturn => {
  const { authUser } = useAuth();
  
  // Core session state using TanStack Query
  const {
    sessionState,
    isLoading: sessionLoading,
    error: sessionError,
    initializeSession: initSession,
    leaveSession: leave,
  } = useSessionState(sessionId, boardId);

  // Game state mutations
  const markCellMutation = useMarkCellMutation(sessionId);
  const completeGameMutation = useCompleteGameMutation();

  // Initialize or create session
  const initializeSession = useCallback(async () => {
    if (!authUser?.id) {
      throw new Error('Must be authenticated to join session');
    }

    const player: Player = {
      id: authUser.id,
      display_name: authUser.email || 'Anonymous',
      avatar_url: undefined,
      joined_at: new Date().toISOString(),
      is_active: true,
      color: PLAYER_COLORS[0].color, // Default to first color
    };

    await initSession(player);
  }, [authUser, initSession]);

  // Join existing session (alias for initialize)
  const joinSession = useCallback(async () => {
    await initializeSession();
  }, [initializeSession]);

  // Leave session
  const leaveSession = useCallback(async () => {
    if (!authUser?.id || !sessionId) {
      return;
    }

    try {
      await leave(authUser.id);
      onSessionEnd?.();
    } catch (error) {
      logger.error('Failed to leave session', error as Error, {
        sessionId,
        userId: authUser.id,
      });
    }
  }, [authUser?.id, sessionId, leave, onSessionEnd]);

  // Mark cell with optimistic updates
  const markCell = useCallback(async (position: number) => {
    if (!authUser?.id || !sessionId) {
      throw new Error('Must be authenticated and in session to mark cells');
    }

    try {
      await markCellMutation.mutateAsync({
        cell_position: position,
        user_id: authUser.id,
        action: 'mark',
        version: sessionState.version,
      });
    } catch (error) {
      logger.error('Failed to mark cell', error as Error);
      throw error;
    }
  }, [authUser?.id, sessionId, sessionState.version, markCellMutation]);

  // Complete game
  const completeGame = useCallback(async (
    winnerId: string, 
    patterns: string[], 
    score: number
  ) => {
    if (!sessionId) {
      throw new Error('No active session');
    }

    try {
      await completeGameMutation.mutateAsync({
        sessionId,
        data: {
          winner_id: winnerId,
          winning_patterns: patterns,
          final_score: score,
        },
      });

      onSessionEnd?.();
    } catch (error) {
      logger.error('Failed to complete game', error as Error);
      throw error;
    }
  }, [sessionId, completeGameMutation, onSessionEnd]);

  return {
    sessionState,
    isLoading: sessionLoading || markCellMutation.isPending || completeGameMutation.isPending,
    error: sessionError || markCellMutation.error || completeGameMutation.error,
    initializeSession,
    joinSession,
    leaveSession,
    markCell,
    completeGame,
  };
};