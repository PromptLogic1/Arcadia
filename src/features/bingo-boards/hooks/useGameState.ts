import { useGameModern } from './useSessionGameModern';
import type { BoardCell } from '../types/types';
import type { GameSettings } from '../types/game-settings.types';
import type { Player } from '../../../services/session-state.service';

interface GameStateReturn {
  boardState: BoardCell[];
  players: Player[]; // Note: This will be empty as game state is local, session players are handled separately
  settings: GameSettings;
  currentPlayer: number; // Represents the index of the current player in the `players` array. Access `Player.id` (string) via `players[currentPlayer]?.id`.
  winner: number | null; // Represents the index of the winning player in the `players` array. Access `Player.id` (string) via `players[winner]?.id` if winner is not null.
  isRunning: boolean;
  updateBoard: (newBoard: BoardCell[]) => void;
  updatePlayers: (newPlayers: Player[]) => void; // Legacy compatibility - does nothing
  updateSettings: (newSettings: Partial<GameSettings>) => void;
  setCurrentPlayer: (index: number) => void;
  setWinner: (winner: number | null) => void;
  setRunning: (isRunning: boolean) => void;
  resetGame: () => void;
  lastUpdate: number;
  version: number;
}

/**
 * Legacy compatibility hook for useGameState.
 * Uses the new modern architecture under the hood.
 * 
 * @deprecated Use useGameModern() or useSessionGameModern() instead for new code.
 */
export function useGameState(): GameStateReturn {
  const { game, updateSettings, setCurrentPlayer, setWinner, setRunning, resetGame } = useGameModern();

  return {
    boardState: [], // Game state doesn't manage board state anymore - that's handled by session
    players: [], // Game state doesn't manage players - that's handled by session
    settings: game.settings,
    currentPlayer: game.currentPlayer,
    winner: game.winner,
    isRunning: game.isRunning,
    lastUpdate: game.lastUpdate,
    version: game.version,
    updateBoard: () => {}, // Legacy compatibility - does nothing
    updatePlayers: () => {}, // Legacy compatibility - does nothing
    updateSettings,
    setCurrentPlayer,
    setWinner,
    setRunning,
    resetGame,
  };
}
