import type { BoardCell, GamePlayer } from './index';

// Game Phase Types
export type GamePhase = 'waiting' | 'active' | 'paused' | 'ended';

// Last Move Type
export interface LastMove {
  playerId: string;
  position: number;
  timestamp: number;
  cellContent: string;
}

// Marked Fields Type
export interface MarkedFields {
  total: number;
  byPlayer: Record<string, number>;
}

// Game Error Type
export interface GameError {
  type: string;
  message: string;
  recoverable: boolean;
}

// Event Types for Game Flow
export interface BeforeMoveEvent {
  playerId: string;
  position: number;
  cellContent: string;
  timestamp: number;
  canProceed: boolean;
}

export interface AfterMoveEvent {
  move: LastMove;
  markedFields: MarkedFields;
  completedLines: number;
  gamePhase: GamePhase;
}

export interface GameEndEvent {
  winner: string | null; // null for draws, -1 for time expiry
  reason: 'bingo' | 'majority' | 'timeout' | 'disconnect';
  finalState: BoardCell[];
  stats: {
    duration: number;
    totalMoves: number;
    players: GamePlayer[];
  };
}

// Game Statistics
export interface GameStats {
  startTime: number;
  endTime?: number;
  totalMoves: number;
  playerMoves: Record<string, number>;
  completedLines: number;
  winner?: string | null;
  gamePhase: GamePhase;
}

// Performance Metrics
export interface PerformanceMetrics {
  renderTime: number;
  updateTime: number;
  memoryUsage: number;
  fps: number;
}

// Bingo Session Type for Game
export interface BingoSession {
  id: string;
  boardId: string;
  players: GamePlayer[];
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  winner?: string | null;
}
