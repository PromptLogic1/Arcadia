/**
 * Session Game Hook
 *
 * Replaces SessionContext and BingoGameContext with TanStack Query + Zustand architecture.
 * Combines session state management with game state management.
 */

import { useCallback } from 'react';
import {
  useSessionWithPlayersQuery,
  useInitializeSessionMutation,
  useLeaveSessionMutation,
} from '@/hooks/queries/useSessionStateQueries';
import {
  useSessionsState,
  useSessionsActions,
} from '@/lib/stores/sessions-store';
import { usePersistedState } from '@/hooks/usePersistedState';
import type { Player } from '../../../services/session-state.service';
import type { BoardCell } from '../types/types';
import type { GameSettings } from '../types/game-settings.types';
import { DEFAULT_GAME_SETTINGS } from '../types/game-settings.constants';
import { log } from '@/lib/logger';

interface LocalGameState {
  settings: GameSettings;
  currentPlayer: number;
  winner: number | null;
  isRunning: boolean;
  lastUpdate: number;
  version: number;
}

export interface SessionGameState {
  // Session data (from TanStack Query)
  session: {
    id: string;
    status: 'initializing' | 'active' | 'paused' | 'completed';
    players: Player[];
    currentPlayer: Player | null;
    boardState: BoardCell[];
    version: number;
    isLoading: boolean;
    error: Error | null;
  };

  // Game state (local + persisted)
  game: {
    settings: GameSettings;
    currentPlayer: number;
    winner: number | null;
    isRunning: boolean;
    lastUpdate: number;
    version: number;
  };

  // UI state (from Zustand)
  ui: {
    currentSessionId: string | null;
  };
}

export interface SessionGameActions {
  // Session actions
  initializeSession: (player: Player) => Promise<void>;
  leaveSession: (playerId: string) => Promise<void>;

  // Game actions
  updateBoard: (boardState: BoardCell[]) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  setCurrentPlayer: (playerIndex: number) => void;
  setWinner: (playerIndex: number | null) => void;
  setRunning: (isRunning: boolean) => void;
  resetGame: () => void;

  // Utility actions
  persistGameState: () => void;
  restoreGameState: () => LocalGameState;
}

const DEFAULT_GAME_STATE: LocalGameState = {
  settings: DEFAULT_GAME_SETTINGS,
  currentPlayer: 0,
  winner: null,
  isRunning: false,
  lastUpdate: Date.now(),
  version: 0,
};

/**
 * Hook that combines session management and game state
 */
export function useSessionGame(
  boardId: string
): SessionGameState & SessionGameActions {
  const { currentSessionId } = useSessionsState();
  const { setCurrentSessionId } = useSessionsActions();

  // Get session state from TanStack Query
  const { session, players, boardState, isLoading, error } =
    useSessionWithPlayersQuery(currentSessionId || '');

  const initializeSessionMutation = useInitializeSessionMutation();
  const leaveSessionMutation = useLeaveSessionMutation();

  // Use persisted state hook for game state
  const [gameState, setGameState] = usePersistedState<LocalGameState>(
    'bingoGameState',
    DEFAULT_GAME_STATE
  );

  // Transform session state to match the old context interface
  const transformedSessionState = {
    id: session?.id || '',
    status:
      session?.status === 'waiting'
        ? ('initializing' as const)
        : session?.status === 'active'
          ? ('active' as const)
          : session?.status === 'completed'
            ? ('completed' as const)
            : session?.status === 'cancelled'
              ? ('completed' as const)
              : ('initializing' as const),
    players: players || [],
    currentPlayer: (players || []).find(p => p.is_host) || null,
    boardState: boardState || [],
    version: session?.version || 0,
    isLoading,
    error: error
      ? typeof error === 'string'
        ? new Error(error)
        : error
      : null,
  };

  // Session actions
  const initializeSession = useCallback(
    async (player: Player) => {
      try {
        const result = await initializeSessionMutation.mutateAsync({
          boardId,
          player,
        });

        if (result.data?.session?.id) {
          setCurrentSessionId(result.data.session.id);
        }
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error('Failed to initialize session');
        log.error('Failed to initialize session', err, {
          metadata: { boardId, playerId: player.id },
        });
        throw err;
      }
    },
    [initializeSessionMutation, boardId, setCurrentSessionId]
  );

  const leaveSession = useCallback(
    async (playerId: string) => {
      try {
        await leaveSessionMutation.mutateAsync({
          sessionId: session?.id || '',
          playerId,
        });

        setCurrentSessionId(null);
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error('Failed to leave session');
        log.error('Failed to leave session', err, {
          metadata: { sessionId: session?.id, playerId },
        });
        throw err;
      }
    },
    [leaveSessionMutation, session?.id, setCurrentSessionId]
  );

  // Game actions
  const updateBoard = useCallback(
    (_newBoardState: BoardCell[]) => {
      setGameState(prevState => ({
        ...prevState,
        lastUpdate: Date.now(),
        version: prevState.version + 1,
      }));
      // Note: Board state is managed by session, this is for local game state only
    },
    [setGameState]
  );

  const updateSettings = useCallback(
    (settings: Partial<GameSettings>) => {
      setGameState(prevState => ({
        ...prevState,
        settings: { ...prevState.settings, ...settings },
        lastUpdate: Date.now(),
      }));
    },
    [setGameState]
  );

  const setCurrentPlayer = useCallback(
    (playerIndex: number) => {
      setGameState(prevState => ({
        ...prevState,
        currentPlayer: playerIndex,
        lastUpdate: Date.now(),
      }));
    },
    [setGameState]
  );

  const setWinner = useCallback(
    (playerIndex: number | null) => {
      setGameState(prevState => ({
        ...prevState,
        winner: playerIndex,
        isRunning: false,
        lastUpdate: Date.now(),
      }));
    },
    [setGameState]
  );

  const setRunning = useCallback(
    (isRunning: boolean) => {
      setGameState(prevState => ({
        ...prevState,
        isRunning,
        lastUpdate: Date.now(),
      }));
    },
    [setGameState]
  );

  const resetGame = useCallback(() => {
    setGameState(DEFAULT_GAME_STATE);
  }, [setGameState]);

  const persistGameState = useCallback(() => {
    // State is automatically persisted by usePersistedState
    log.debug('Game state persisted', { metadata: { gameState } });
  }, [gameState]);

  const restoreGameState = useCallback(() => {
    return gameState;
  }, [gameState]);

  return {
    // State
    session: transformedSessionState,
    game: gameState,
    ui: {
      currentSessionId,
    },

    // Session actions
    initializeSession,
    leaveSession,

    // Game actions
    updateBoard,
    updateSettings,
    setCurrentPlayer,
    setWinner,
    setRunning,
    resetGame,

    // Utility actions
    persistGameState,
    restoreGameState,
  };
}

/**
 * Hook for session-only state (when game state is not needed)
 */
export function useSessionModern(sessionId: string) {
  const { currentSessionId } = useSessionsState();
  const { setCurrentSessionId } = useSessionsActions();

  // Get the raw session and players data
  const { session, players, boardState, isLoading, error } =
    useSessionWithPlayersQuery(sessionId);
  const initializeMutation = useInitializeSessionMutation();
  const leaveMutation = useLeaveSessionMutation();

  const transformedSessionState = {
    id: session?.id || '',
    status:
      session?.status === 'waiting'
        ? ('waiting' as const)
        : session?.status === 'active'
          ? ('active' as const)
          : session?.status === 'completed'
            ? ('completed' as const)
            : session?.status === 'cancelled'
              ? ('cancelled' as const)
              : ('waiting' as const),
    players: players || [],
    currentPlayer: (players || []).find(p => p.is_host) || null,
    boardState: boardState || [],
    version: session?.version || 0,
    isLoading,
    error: error
      ? typeof error === 'string'
        ? new Error(error)
        : error
      : null,
    // Properties needed by the PlayArea component
    board_id: session?.board_id || '',
    host_id: session?.host_id || '',
    session_code: session?.session_code || '',
    // These properties come from session_stats view, not bingo_sessions table
    board_title: '',
    difficulty: 'medium',
    game_type: 'gaming',
    current_player_count: (players || []).length,
    max_players: session?.settings?.max_players || 4,
    host_username: '',
  };

  const initializeSession = useCallback(
    async (player: Player) => {
      try {
        await initializeMutation.mutateAsync({
          boardId: session?.board_id || '',
          player,
        });

        if (session?.id) {
          setCurrentSessionId(session.id);
        }
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error('Failed to initialize session');
        log.error('Failed to initialize session', err, {
          metadata: { boardId: session?.board_id, playerId: player.id },
        });
        throw err;
      }
    },
    [initializeMutation, session?.board_id, session?.id, setCurrentSessionId]
  );

  const leaveSession = useCallback(
    async (playerId: string) => {
      try {
        await leaveMutation.mutateAsync({ sessionId, playerId });
        setCurrentSessionId(null);
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error('Failed to leave session');
        log.error('Failed to leave session', err, {
          metadata: { sessionId, playerId },
        });
        throw err;
      }
    },
    [leaveMutation, sessionId, setCurrentSessionId]
  );

  return {
    session: transformedSessionState,
    ui: { currentSessionId },
    initializeSession,
    leaveSession,
  };
}

/**
 * Hook for game-only state (when session state is not needed)
 */
export function useGameModern(): {
  game: LocalGameState;
  updateSettings: (settings: Partial<GameSettings>) => void;
  setCurrentPlayer: (playerIndex: number) => void;
  setWinner: (playerIndex: number | null) => void;
  setRunning: (isRunning: boolean) => void;
  resetGame: () => void;
} {
  // Use persisted state hook for game state
  const [gameState, setGameState] = usePersistedState<LocalGameState>(
    'bingoGameState',
    DEFAULT_GAME_STATE
  );

  const updateSettings = useCallback(
    (settings: Partial<GameSettings>) => {
      setGameState(prevState => ({
        ...prevState,
        settings: { ...prevState.settings, ...settings },
        lastUpdate: Date.now(),
      }));
    },
    [setGameState]
  );

  const setCurrentPlayer = useCallback(
    (playerIndex: number) => {
      setGameState(prevState => ({
        ...prevState,
        currentPlayer: playerIndex,
        lastUpdate: Date.now(),
      }));
    },
    [setGameState]
  );

  const setWinner = useCallback(
    (playerIndex: number | null) => {
      setGameState(prevState => ({
        ...prevState,
        winner: playerIndex,
        isRunning: false,
        lastUpdate: Date.now(),
      }));
    },
    [setGameState]
  );

  const setRunning = useCallback(
    (isRunning: boolean) => {
      setGameState(prevState => ({
        ...prevState,
        isRunning,
        lastUpdate: Date.now(),
      }));
    },
    [setGameState]
  );

  const resetGame = useCallback(() => {
    setGameState(DEFAULT_GAME_STATE);
  }, [setGameState]);

  return {
    game: gameState,
    updateSettings,
    setCurrentPlayer,
    setWinner,
    setRunning,
    resetGame,
  };
}
