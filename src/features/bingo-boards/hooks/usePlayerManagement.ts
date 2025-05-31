'use client';

import { useState, useCallback, useEffect } from 'react';
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
import { logger } from '@/src/lib/logger';

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
  // States
  const [players, setPlayers] = useState<GamePlayer[]>(() => {
    // Initialize with 2 players by default
    return [
      {
        user_id: `user-${Date.now()}`,
        session_id: sessionId,
        player_name: 'Player 1',
        color: PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS[0],
        team: 0,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        user_id: `user-${Date.now() + 1}`,
        session_id: sessionId,
        player_name: 'Player 2',
        color: PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS[1],
        team: 1,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  });
  const [_currentPlayer, _setCurrentPlayer] = useState<GamePlayer | null>(null);
  const [_loading, _setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Analytics stub - replaced complex useGameAnalytics
  const trackMove = useCallback((_playerId: string, _moveType: string, _position: number) => {
    // TODO: Implement analytics when needed
  }, []);
  const { settings } = useGameSettings(sessionId);
  const { presenceState } = usePresence(sessionId);

  // Event Emitter
  const emitPlayerEvent = useCallback(
    (event: PlayerEvent) => {
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
          trackMove(event.playerId, 'team_switch', event.newTeam);
        }
      } catch (error) {
        logger.error('Error emitting player event', error as Error, {
          metadata: { hook: 'usePlayerManagement', event },
        });
      }
    },
    [trackMove]
  );

  // Helper Functions
  const getTeamSizes = useCallback(
    (currentPlayers: GamePlayer[]): Record<number, number> => {
      return currentPlayers.reduce(
        (acc, p) => {
          acc[p.team || 0] = (acc[p.team || 0] || 0) + 1;
          return acc;
        },
        {} as Record<number, number>
      );
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
        _setLoading(true);

        if (players.length >= PLAYER_CONSTANTS.LIMITS.MAX_PLAYERS) {
          throw new Error('Maximum players reached');
        }

        const playerCount = players.length;
        const colorIndex = playerCount % PLAYER_COLORS.length;
        const defaultColor =
          PLAYER_COLORS[colorIndex]?.color || PLAYER_COLORS[0].color;

        const newPlayer: GamePlayer = {
          user_id: `user-${Date.now()}`,
          session_id: sessionId,
          player_name: player.player_name || `Player ${playerCount + 1}`,
          color: player.color || defaultColor,
          team: settings?.team_mode ? playerCount % 2 : player.team || 0,
          joined_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setPlayers(prev => [...prev, newPlayer]);
        emitPlayerEvent({
          type: PLAYER_CONSTANTS.EVENTS.PLAYER_JOIN,
          player: newPlayer,
        });
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        _setLoading(false);
      }
    },
    [players.length, settings?.team_mode, emitPlayerEvent, sessionId]
  );

  const removePlayer = useCallback(async (playerId: string): Promise<void> => {
    try {
      _setLoading(true);
      setPlayers(prev => prev.filter(p => p.user_id !== playerId));
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      _setLoading(false);
    }
  }, []);

  const updatePlayer = useCallback(
    async (playerId: string, updates: Partial<GamePlayer>): Promise<void> => {
      try {
        _setLoading(true);
        setPlayers(prev =>
          prev.map(player =>
            player.user_id === playerId
              ? { ...player, ...updates, updated_at: new Date().toISOString() }
              : player
          )
        );
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        _setLoading(false);
      }
    },
    []
  );

  const _switchTeam = useCallback(
    (playerId: string, newTeam: number): void => {
      if (!settings?.team_mode) return;

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

        emitPlayerEvent({
          type: PLAYER_CONSTANTS.EVENTS.TEAM_CHANGE,
          playerId,
          newTeam,
        });

        return newPlayers;
      });
    },
    [settings?.team_mode, emitPlayerEvent, checkTeamSize]
  );

  // Sync with presence
  useEffect(() => {
    const onlinePlayers = Object.values(presenceState).map(
      presence => presence.user_id
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
        user_id: `user-${Date.now()}`,
        session_id: sessionId,
        player_name: 'Player 1',
        color: PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS[0],
        team: 0,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setPlayers([defaultPlayer]);
    }
  }, [players.length, sessionId]);

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
