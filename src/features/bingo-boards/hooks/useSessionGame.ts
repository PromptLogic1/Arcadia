/**
 * Session Game Hook
 *
 * Replaces SessionContext and BingoGameContext with TanStack Query + Zustand architecture.
 * Combines session state management with game state management.
 */

import { useCallback, useEffect } from 'react';
import {
  useSessionWithPlayersQuery,
  useInitializeSessionMutation,
  useLeaveSessionMutation,
} from '@/hooks/queries/useSessionStateQueries';
import {
  useSessionsState,
  useSessionsActions,
} from '@/lib/stores/sessions-store';
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
  restoreGameState: () => void;
}

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

  // Get/Set game state from localStorage
  const getPersistedGameState = useCallback(() => {
    try {
      const saved = localStorage.getItem('bingoGameState');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      log.error('Failed to restore game state', error as Error, {
        metadata: { contextName: 'useSessionGameModern' },
      });
    }
    return {
      settings: DEFAULT_GAME_SETTINGS,
      currentPlayer: 0,
      winner: null,
      isRunning: false,
      lastUpdate: Date.now(),
      version: 0,
    };
  }, []);

  const persistGameState = useCallback((gameState: LocalGameState) => {
    try {
      localStorage.setItem('bingoGameState', JSON.stringify(gameState));
    } catch (error) {
      log.error('Failed to persist game state', error as Error);
    }
  }, []);

  // Initialize game state from localStorage
  const gameState = getPersistedGameState();

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
    currentPlayer: players?.find(p => p.is_host) || null,
    boardState: boardState || [],
    version: session?.version || 0,
    isLoading,
    error,
  };

  // Session actions
  const initializeSession = useCallback(
    async (player: Player) => {
      await initializeSessionMutation.mutateAsync({ boardId, player });
      if (session?.id) {
        setCurrentSessionId(session.id);
      }
    },
    [initializeSessionMutation, boardId, session?.id, setCurrentSessionId]
  );

  const leaveSession = useCallback(
    async (playerId: string) => {
      await leaveSessionMutation.mutateAsync({
        sessionId: session?.id || '',
        playerId,
      });
      setCurrentSessionId(null);
    },
    [leaveSessionMutation, session?.id, setCurrentSessionId]
  );

  // Game actions
  const updateBoard = useCallback(
    (_newBoardState: BoardCell[]) => {
      const newGameState = {
        ...gameState,
        lastUpdate: Date.now(),
        version: gameState.version + 1,
      };
      persistGameState(newGameState);
      // Note: Board state is managed by session, this is for local game state only
    },
    [gameState, persistGameState]
  );

  const updateSettings = useCallback(
    (settings: Partial<GameSettings>) => {
      const newGameState = {
        ...gameState,
        settings: { ...gameState.settings, ...settings },
        lastUpdate: Date.now(),
      };
      persistGameState(newGameState);
    },
    [gameState, persistGameState]
  );

  const setCurrentPlayer = useCallback(
    (playerIndex: number) => {
      const newGameState = {
        ...gameState,
        currentPlayer: playerIndex,
        lastUpdate: Date.now(),
      };
      persistGameState(newGameState);
    },
    [gameState, persistGameState]
  );

  const setWinner = useCallback(
    (playerIndex: number | null) => {
      const newGameState = {
        ...gameState,
        winner: playerIndex,
        isRunning: false,
        lastUpdate: Date.now(),
      };
      persistGameState(newGameState);
    },
    [gameState, persistGameState]
  );

  const setRunning = useCallback(
    (isRunning: boolean) => {
      const newGameState = {
        ...gameState,
        isRunning,
        lastUpdate: Date.now(),
      };
      persistGameState(newGameState);
    },
    [gameState, persistGameState]
  );

  const resetGame = useCallback(() => {
    const newGameState = {
      settings: DEFAULT_GAME_SETTINGS,
      currentPlayer: 0,
      winner: null,
      isRunning: false,
      lastUpdate: Date.now(),
      version: 0,
    };
    persistGameState(newGameState);
  }, [persistGameState]);

  const restoreGameState = useCallback(() => {
    return getPersistedGameState();
  }, [getPersistedGameState]);

  // Auto-persist on changes
  useEffect(() => {
    persistGameState(gameState);
  }, [gameState, persistGameState]);

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
    persistGameState: () => persistGameState(gameState),
    restoreGameState,
  };
}

/**
 * Hook for session-only state (when game state is not needed)
 */
export function useSessionModern(sessionId: string) {
  const { currentSessionId } = useSessionsState();
  const { setCurrentSessionId } = useSessionsActions();

  // Set the current session ID if provided and different
  useEffect(() => {
    if (sessionId && sessionId !== currentSessionId) {
      setCurrentSessionId(sessionId);
    }
  }, [sessionId, currentSessionId, setCurrentSessionId]);

  // Get the raw session and players data instead of the transformed sessionState
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
    currentPlayer: players?.find(p => p.is_host) || null,
    boardState: boardState || [],
    version: session?.version || 0,
    isLoading,
    error,
    // Properties needed by the PlayArea component
    board_id: session?.board_id || '',
    host_id: session?.host_id || '',
    session_code: session?.session_code || '',
    board_title:
      ((session as Record<string, unknown>)?.board_title as string) || '',
    difficulty:
      ((session as Record<string, unknown>)?.difficulty as string) || 'medium',
    game_type:
      ((session as Record<string, unknown>)?.game_type as string) || 'gaming',
    current_player_count: players?.length || 0,
    max_players: session?.settings?.max_players || 4,
    host_username:
      ((session as Record<string, unknown>)?.host_username as string) || '',
  };

  const initializeSession = useCallback(
    async (player: Player) => {
      await initializeMutation.mutateAsync({
        boardId: session?.board_id || '',
        player,
      });
      if (session?.id) {
        setCurrentSessionId(session.id);
      }
    },
    [initializeMutation, session?.board_id, session?.id, setCurrentSessionId]
  );

  const leaveSession = useCallback(
    async (playerId: string) => {
      await leaveMutation.mutateAsync({ sessionId, playerId });
      setCurrentSessionId(null);
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
  game: {
    settings: GameSettings;
    currentPlayer: number;
    winner: number | null;
    isRunning: boolean;
    lastUpdate: number;
    version: number;
  };
  updateSettings: (settings: Partial<GameSettings>) => void;
  setCurrentPlayer: (playerIndex: number) => void;
  setWinner: (playerIndex: number | null) => void;
  setRunning: (isRunning: boolean) => void;
  resetGame: () => void;
} {
  const getPersistedGameState = useCallback(() => {
    try {
      const saved = localStorage.getItem('bingoGameState');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      log.error('Failed to restore game state', error as Error);
    }
    return {
      settings: DEFAULT_GAME_SETTINGS,
      currentPlayer: 0,
      winner: null,
      isRunning: false,
      lastUpdate: Date.now(),
      version: 0,
    };
  }, []);

  const persistGameState = useCallback((gameState: LocalGameState) => {
    try {
      localStorage.setItem('bingoGameState', JSON.stringify(gameState));
    } catch (error) {
      log.error('Failed to persist game state', error as Error);
    }
  }, []);

  const gameState = getPersistedGameState();

  const updateSettings = useCallback(
    (settings: Partial<GameSettings>) => {
      const newGameState = {
        ...gameState,
        settings: { ...gameState.settings, ...settings },
        lastUpdate: Date.now(),
      };
      persistGameState(newGameState);
    },
    [gameState, persistGameState]
  );

  const setCurrentPlayer = useCallback(
    (playerIndex: number) => {
      const newGameState = {
        ...gameState,
        currentPlayer: playerIndex,
        lastUpdate: Date.now(),
      };
      persistGameState(newGameState);
    },
    [gameState, persistGameState]
  );

  const setWinner = useCallback(
    (playerIndex: number | null) => {
      const newGameState = {
        ...gameState,
        winner: playerIndex,
        isRunning: false,
        lastUpdate: Date.now(),
      };
      persistGameState(newGameState);
    },
    [gameState, persistGameState]
  );

  const setRunning = useCallback(
    (isRunning: boolean) => {
      const newGameState = {
        ...gameState,
        isRunning,
        lastUpdate: Date.now(),
      };
      persistGameState(newGameState);
    },
    [gameState, persistGameState]
  );

  const resetGame = useCallback(() => {
    const newGameState = {
      settings: DEFAULT_GAME_SETTINGS,
      currentPlayer: 0,
      winner: null,
      isRunning: false,
      lastUpdate: Date.now(),
      version: 0,
    };
    persistGameState(newGameState);
  }, [persistGameState]);

  return {
    game: gameState,
    updateSettings,
    setCurrentPlayer,
    setWinner,
    setRunning,
    resetGame,
  };
}
