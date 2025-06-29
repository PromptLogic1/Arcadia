'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  GamePlayer,
  UsePlayerManagementProps,
  UsePlayerManagementReturn,
  JoinSessionForm,
} from '@/types/domains/bingo';
import { PLAYER_COLORS } from '@/types';
// Removed useGameAnalytics import - replaced with simple stub
import { useGameSettings } from './useGameSettings';
import { usePresence } from './usePresence';
import { log } from '@/lib/logger';
import { toError } from '@/lib/error-guards';

type PlayerEvent = {
  type: string;
  player?: GamePlayer;
  playerId?: string;
  newTeam?: number;
};

const PLAYER_CONSTANTS = {
  LIMITS: {
    MAX_PLAYERS: 12,
    MAX_TEAM_SIZE: 6,
  },
  TEAMS: {
    DEFAULT_NAMES: ['Team 1', 'Team 2'] as const,
    DEFAULT_COLORS: ['#06b6d4', '#8b5cf6'] as const,
  },
  EVENTS: {
    PLAYER_JOIN: 'player_join',
    TEAM_CHANGE: 'team_change',
  },
} as const;

export const usePlayerManagement = ({
  sessionId,
}: UsePlayerManagementProps): UsePlayerManagementReturn => {
  // Mount tracking
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // States
  const [players, setPlayers] = useState<GamePlayer[]>(() => {
    // Initialize with 2 players by default
    return [
      {
        id: `player-${Date.now()}`,
        user_id: `user-${Date.now()}`,
        session_id: sessionId,
        display_name: 'Player 1',
        color: PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS[0],
        team: 0,
        avatar_url: null,
        is_host: false,
        is_ready: false,
        position: null,
        score: null,
        joined_at: new Date().toISOString(),
        left_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: `player-${Date.now() + 1}`,
        user_id: `user-${Date.now() + 1}`,
        session_id: sessionId,
        display_name: 'Player 2',
        color: PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS[1],
        team: 1,
        avatar_url: null,
        is_host: false,
        is_ready: false,
        position: null,
        score: null,
        joined_at: new Date().toISOString(),
        left_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  });
  const [_currentPlayer, _setCurrentPlayer] = useState<GamePlayer | null>(null);
  const [_loading, _setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Analytics stub - replaced complex useGameAnalytics
  const trackMove = useCallback(
    (_playerId: string, _moveType: string, _position: number) => {
      // TODO: Implement analytics when needed
    },
    []
  );
  const { settings } = useGameSettings(sessionId);
  const { presenceState } = usePresence(sessionId);

  // Refs to prevent stale closures
  const trackMoveRef = useRef(trackMove);
  const playersRef = useRef(players);
  const settingsRef = useRef(settings);

  // Update refs when dependencies change
  useEffect(() => {
    trackMoveRef.current = trackMove;
  }, [trackMove]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Event Emitter - Stable callback that uses refs
  const emitPlayerEvent = useCallback((event: PlayerEvent) => {
    try {
      const customEvent = new CustomEvent('playerManagement', {
        detail: event,
        bubbles: true,
      });
      window.dispatchEvent(customEvent);

      if (
        event.type === 'team_change' &&
        event.playerId &&
        event.newTeam !== undefined
      ) {
        trackMoveRef.current(event.playerId, 'team_switch', event.newTeam);
      }
    } catch (error) {
      log.error('Error emitting player event', toError(error), {
        metadata: { hook: 'usePlayerManagement', event },
      });
    }
  }, []); // Empty deps since we use refs for all external values

  // Helper Functions
  const getTeamSizes = useCallback(
    (currentPlayers: GamePlayer[]): Record<number, number> => {
      return currentPlayers.reduce<Record<number, number>>((acc, p) => {
        const teamNumber = p.team || 0;
        acc[teamNumber] = (acc[teamNumber] || 0) + 1;
        return acc;
      }, {});
    },
    []
  );

  const checkTeamSize = useCallback(
    (team: number, currentPlayers: GamePlayer[]): boolean => {
      const teamSizes = getTeamSizes(currentPlayers);
      return (teamSizes[team] || 0) < PLAYER_CONSTANTS.LIMITS.MAX_TEAM_SIZE;
    },
    [getTeamSizes]
  );

  // Core Functions - Match interface signatures
  const addPlayer = useCallback(
    async (player: JoinSessionForm): Promise<void> => {
      try {
        if (isMountedRef.current) {
          _setLoading(true);
        }

        const currentPlayers = playersRef.current;
        if (currentPlayers.length >= PLAYER_CONSTANTS.LIMITS.MAX_PLAYERS) {
          throw new Error('Maximum players reached');
        }

        const playerCount = currentPlayers.length;
        const colorIndex = playerCount % PLAYER_COLORS.length;
        const defaultColor =
          PLAYER_COLORS[colorIndex]?.color || PLAYER_COLORS[0].color;

        const currentSettings = settingsRef.current;
        const newPlayer: GamePlayer = {
          id: `player-${Date.now()}`,
          user_id: `user-${Date.now()}`,
          session_id: sessionId,
          display_name: player.display_name || `Player ${playerCount + 1}`,
          color: player.color || defaultColor,
          team: currentSettings?.team_mode ? playerCount % 2 : player.team || 0,
          avatar_url: player.avatar_url || null,
          is_host: false,
          is_ready: false,
          position: null,
          score: null,
          joined_at: new Date().toISOString(),
          left_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (isMountedRef.current) {
          setPlayers(prev => [...prev, newPlayer]);
          emitPlayerEvent({
            type: PLAYER_CONSTANTS.EVENTS.PLAYER_JOIN,
            player: newPlayer,
          });
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(toError(err));
        }
        throw err;
      } finally {
        if (isMountedRef.current) {
          _setLoading(false);
        }
      }
    },
    [emitPlayerEvent, sessionId] // Removed players.length and settings dependencies
  );

  const removePlayer = useCallback(async (playerId: string): Promise<void> => {
    try {
      if (isMountedRef.current) {
        _setLoading(true);
        setPlayers(prev => prev.filter(p => p.user_id !== playerId));
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(toError(err));
      }
      throw err;
    } finally {
      if (isMountedRef.current) {
        _setLoading(false);
      }
    }
  }, []);

  const updatePlayer = useCallback(
    async (playerId: string, updates: Partial<GamePlayer>): Promise<void> => {
      try {
        if (isMountedRef.current) {
          _setLoading(true);
          setPlayers(prev =>
            prev.map(player =>
              player.user_id === playerId
                ? {
                    ...player,
                    ...updates,
                    updated_at: new Date().toISOString(),
                  }
                : player
            )
          );
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(toError(err));
        }
        throw err;
      } finally {
        if (isMountedRef.current) {
          _setLoading(false);
        }
      }
    },
    []
  );

  const _switchTeam = useCallback(
    (playerId: string, newTeam: number): void => {
      const currentSettings = settingsRef.current;
      if (!currentSettings?.team_mode) return;

      setPlayers(prev => {
        if (!checkTeamSize(newTeam, prev)) return prev;

        const newPlayers = prev.map(player => {
          if (player.user_id === playerId) {
            return {
              ...player,
              team: newTeam,
              updated_at: new Date().toISOString(),
            };
          }
          return player;
        });

        // Use queueMicrotask instead of setTimeout for better performance
        queueMicrotask(() => {
          emitPlayerEvent({
            type: PLAYER_CONSTANTS.EVENTS.TEAM_CHANGE,
            playerId,
            newTeam,
          });
        });

        return newPlayers;
      });
    },
    [checkTeamSize, emitPlayerEvent]
  );

  // Sync with presence
  useEffect(() => {
    const onlinePlayers = Object.values(presenceState).map(
      presence => presence.userId || presence.user_id || ''
    );
    setPlayers(prev =>
      prev.map(player => ({
        ...player,
        isOnline: onlinePlayers.includes(player.user_id),
      }))
    );
  }, [presenceState]);

  // Initialize with default state if needed
  useEffect(() => {
    if (players.length === 0) {
      const defaultPlayer: GamePlayer = {
        id: `player-${Date.now()}`,
        user_id: `user-${Date.now()}`,
        session_id: sessionId,
        display_name: 'Player 1',
        color: PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS[0],
        team: 0,
        avatar_url: null,
        is_host: false,
        is_ready: false,
        position: null,
        score: null,
        joined_at: new Date().toISOString(),
        left_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setPlayers([defaultPlayer]);
    }
  }, [players.length, sessionId]); // This dependency is OK for initialization

  return {
    players,
    currentPlayer: _currentPlayer,
    loading: _loading,
    error,
    addPlayer,
    removePlayer,
    updatePlayer,
  };
};
