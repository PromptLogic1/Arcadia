/**
 * Advanced Bingo Engine Tests
 *
 * Focuses on complex game logic scenarios, performance optimizations,
 * and edge cases in the bingo game engine integration.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { WinDetectionService } from '../services/win-detection.service';
import { ScoringService } from '../services/scoring.service';
import type {
  BoardCell,
  GameState,
  WinPattern,
  WinDetectionResult,
} from '../types';

// Advanced Bingo Engine with additional complexity
class AdvancedBingoEngine {
  private winDetector: WinDetectionService;
  private scoringService: ScoringService;
  private boardSize: number;
  private gameHistory: GameHistoryEntry[] = [];
  private streakTracker: Map<string, number> = new Map();

  constructor(boardSize = 5) {
    this.winDetector = new WinDetectionService(boardSize);
    this.scoringService = new ScoringService();
    this.boardSize = boardSize;
  }

  processAdvancedMove(
    gameState: GameState,
    move: AdvancedMove
  ): AdvancedMoveResult {
    const startTime = performance.now();

    try {
      // Validate move
      const validation = this.validateAdvancedMove(gameState, move);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.reason!,
          processingTime: performance.now() - startTime,
        };
      }

      // Apply move with transaction-like behavior
      const { newState, rollback } = this.applyMoveWithRollback(
        gameState,
        move
      );

      try {
        // Detect wins
        const winResult = this.winDetector.detectWin(newState.currentState);

        // Calculate advanced scoring
        const scoreResult = this.calculateAdvancedScore(
          winResult,
          move,
          this.getPlayerHistory(move.playerId)
        );

        // Update streak tracking
        this.updateStreakTracking(move.playerId, winResult.hasWin);

        // Record history
        this.recordGameHistory({
          move,
          timestamp: Date.now(),
          winDetected: winResult.hasWin,
          score: scoreResult.totalScore,
          patterns: winResult.patterns,
        });

        return {
          success: true,
          newState,
          winDetected: winResult.hasWin,
          winPatterns: winResult.patterns,
          score: scoreResult,
          streakCount: this.streakTracker.get(move.playerId) || 0,
          processingTime: performance.now() - startTime,
        };
      } catch (error) {
        // Rollback on error
        rollback();
        throw error;
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: performance.now() - startTime,
      };
    }
  }

  analyzeGamePerformance(): GamePerformanceAnalysis {
    const totalMoves = this.gameHistory.length;
    const winMoves = this.gameHistory.filter(h => h.winDetected).length;
    const averageProcessingTime =
      this.gameHistory.reduce((sum, h) => sum + (h.timestamp || 0), 0) /
      totalMoves;

    const patternFrequency = new Map<string, number>();
    this.gameHistory.forEach(h => {
      h.patterns?.forEach(p => {
        patternFrequency.set(p.name, (patternFrequency.get(p.name) || 0) + 1);
      });
    });

    const playerPerformance = new Map<string, PlayerPerformance>();
    this.gameHistory.forEach(h => {
      const playerId = h.move.playerId;
      if (!playerPerformance.has(playerId)) {
        playerPerformance.set(playerId, {
          totalMoves: 0,
          wins: 0,
          averageScore: 0,
          streak: this.streakTracker.get(playerId) || 0,
        });
      }

      const stats = playerPerformance.get(playerId)!;
      stats.totalMoves++;
      if (h.winDetected) stats.wins++;
      stats.averageScore =
        (stats.averageScore + (h.score || 0)) / stats.totalMoves;
    });

    return {
      totalMoves,
      winRate: winMoves / totalMoves,
      averageProcessingTime,
      patternFrequency: Object.fromEntries(patternFrequency),
      playerPerformance: Object.fromEntries(playerPerformance),
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  simulateComplexGameScenario(scenario: GameScenario): ScenarioResult {
    const startTime = performance.now();
    let gameState = this.createGameState(scenario.boardSize);
    const results: AdvancedMoveResult[] = [];

    for (const move of scenario.moves) {
      const result = this.processAdvancedMove(gameState, move);
      results.push(result);

      if (result.success && result.newState) {
        gameState = result.newState;
      }

      if (result.winDetected) {
        break; // Game ends on first win
      }
    }

    const endTime = performance.now();
    const winnerIndex = results.findIndex(r => r.winDetected);
    const winner =
      winnerIndex !== -1
        ? (scenario.moves[winnerIndex]?.playerId ?? null)
        : null;

    return {
      totalTime: endTime - startTime,
      moves: results,
      winner,
      finalState: gameState,
      performance: this.analyzeGamePerformance(),
    };
  }

  private validateAdvancedMove(
    gameState: GameState,
    move: AdvancedMove
  ): { valid: boolean; reason?: string } {
    // Enhanced validation logic
    const cell = gameState.currentState[move.cellPosition];

    if (!cell) {
      return { valid: false, reason: 'Invalid cell position' };
    }

    if (cell.blocked) {
      return { valid: false, reason: 'Cell is blocked' };
    }

    if (move.action === 'mark' && cell.is_marked) {
      return { valid: false, reason: 'Cell already marked' };
    }

    if (move.action === 'unmark' && !cell.is_marked) {
      return { valid: false, reason: 'Cell not marked' };
    }

    // Check player-specific rules
    if (move.playerModifiers?.maxMarksPerTurn) {
      const playerMoves = this.getRecentMoves(move.playerId, 1);
      if (playerMoves.length >= move.playerModifiers.maxMarksPerTurn) {
        return { valid: false, reason: 'Exceeded marks per turn limit' };
      }
    }

    return { valid: true };
  }

  private applyMoveWithRollback(
    gameState: GameState,
    move: AdvancedMove
  ): { newState: GameState; rollback: () => void } {
    const cellAtPosition = gameState.currentState[move.cellPosition];
    if (!cellAtPosition) {
      throw new Error(`Invalid cell position: ${move.cellPosition}`);
    }
    const originalCell = { ...cellAtPosition };
    const newState = {
      ...gameState,
      currentState: [...gameState.currentState],
      version: gameState.version + 1,
      lastUpdate: new Date().toISOString(),
      activePlayer: move.playerId,
    };

    const cell = newState.currentState[move.cellPosition];

    if (!cell) {
      throw new Error(`Invalid cell position: ${move.cellPosition}`);
    }

    if (move.action === 'mark') {
      cell.is_marked = true;
      cell.completed_by = [...(cell.completed_by || []), move.playerId];
      cell.last_modified_by = move.playerId;
    } else {
      cell.is_marked = false;
      cell.completed_by = (cell.completed_by || []).filter(
        id => id !== move.playerId
      );
      cell.last_modified_by = move.playerId;
    }

    cell.last_updated = Date.now();
    cell.version = (cell.version || 0) + 1;

    // Apply special modifiers
    // Note: bonusPoints would typically be stored in game state metadata,
    // not directly on the cell. For testing purposes, we'll track this separately.

    const rollback = () => {
      newState.currentState[move.cellPosition] = originalCell;
    };

    return { newState, rollback };
  }

  private calculateAdvancedScore(
    winResult: WinDetectionResult,
    move: AdvancedMove,
    playerHistory: GameHistoryEntry[]
  ): AdvancedScore {
    if (!winResult.hasWin) {
      return {
        baseScore: 0,
        bonuses: {},
        penalties: {},
        totalScore: 0,
        multiplier: 1,
      };
    }

    const baseScoreCalc = this.scoringService.calculateScore(
      winResult.patterns,
      120, // 2 minutes default
      true,
      0
    );

    const bonuses: Record<string, number> = {};
    const penalties: Record<string, number> = {};
    let multiplier = baseScoreCalc.speedMultiplier || 1;

    // Streak bonus
    const currentStreak = this.streakTracker.get(move.playerId) || 0;
    if (currentStreak > 0) {
      bonuses.streakBonus = currentStreak * 25;
      multiplier += currentStreak * 0.1;
    }

    // Difficulty bonus based on move count
    const moveCount = playerHistory.length;
    if (moveCount <= 10) {
      bonuses.efficiencyBonus = (11 - moveCount) * 10;
    }

    // Pattern complexity bonus
    const complexPatterns = winResult.patterns.filter(
      (p: WinPattern) => p.type === 'letter-x' || p.type === 'letter-t'
    );
    if (complexPatterns.length > 0) {
      bonuses.complexityBonus = complexPatterns.length * 50;
    }

    // Apply modifiers
    if (move.playerModifiers?.scoreMultiplier) {
      multiplier *= move.playerModifiers.scoreMultiplier;
    }

    const totalScore = Math.floor(
      (baseScoreCalc.totalScore +
        Object.values(bonuses).reduce((a, b) => a + b, 0) -
        Object.values(penalties).reduce((a, b) => a + b, 0)) *
        multiplier
    );

    return {
      baseScore: baseScoreCalc.totalScore,
      bonuses,
      penalties,
      totalScore,
      multiplier,
    };
  }

  private updateStreakTracking(playerId: string, won: boolean): void {
    if (won) {
      this.streakTracker.set(
        playerId,
        (this.streakTracker.get(playerId) || 0) + 1
      );
    } else {
      this.streakTracker.set(playerId, 0);
    }
  }

  private recordGameHistory(entry: GameHistoryEntry): void {
    this.gameHistory.push(entry);

    // Keep only last 1000 entries to prevent memory bloat
    if (this.gameHistory.length > 1000) {
      this.gameHistory = this.gameHistory.slice(-1000);
    }
  }

  private getPlayerHistory(playerId: string): GameHistoryEntry[] {
    return this.gameHistory.filter(h => h.move.playerId === playerId);
  }

  private getRecentMoves(playerId: string, turns: number): GameHistoryEntry[] {
    return this.getPlayerHistory(playerId).slice(-turns);
  }

  private createGameState(size: number): GameState {
    const cells: BoardCell[] = Array.from({ length: size * size }, (_, i) => ({
      text: `Cell ${i}`,
      colors: null,
      completed_by: [],
      blocked: false,
      is_marked: false,
      cell_id: `cell-${i}`,
      version: 1,
      last_updated: Date.now(),
      last_modified_by: null,
    }));

    return {
      currentState: cells,
      version: 1,
      lastUpdate: new Date().toISOString(),
    };
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage in bytes
    const historySize = this.gameHistory.length * 200; // ~200 bytes per entry
    const stateSize = this.boardSize * this.boardSize * 100; // ~100 bytes per cell
    const trackerSize = this.streakTracker.size * 50; // ~50 bytes per player

    return historySize + stateSize + trackerSize;
  }
}

// Type definitions for advanced engine
interface AdvancedMove {
  cellPosition: number;
  playerId: string;
  action: 'mark' | 'unmark';
  timestamp?: number;
  playerModifiers?: {
    scoreMultiplier?: number;
    maxMarksPerTurn?: number;
  };
  cellModifiers?: {
    points?: number;
    temporary?: boolean;
  };
}

interface AdvancedMoveResult {
  success: boolean;
  newState?: GameState;
  winDetected?: boolean;
  winPatterns?: WinPattern[];
  score?: AdvancedScore;
  streakCount?: number;
  error?: string;
  processingTime: number;
}

interface AdvancedScore {
  baseScore: number;
  bonuses: Record<string, number>;
  penalties: Record<string, number>;
  totalScore: number;
  multiplier: number;
}

interface GameHistoryEntry {
  move: AdvancedMove;
  timestamp: number;
  winDetected: boolean;
  score: number;
  patterns?: WinPattern[];
}

interface GamePerformanceAnalysis {
  totalMoves: number;
  winRate: number;
  averageProcessingTime: number;
  patternFrequency: Record<string, number>;
  playerPerformance: Record<string, PlayerPerformance>;
  memoryUsage: number;
}

interface PlayerPerformance {
  totalMoves: number;
  wins: number;
  averageScore: number;
  streak: number;
}

interface GameScenario {
  boardSize: number;
  moves: AdvancedMove[];
  expectedWinner?: string;
  maxTime?: number;
}

interface ScenarioResult {
  totalTime: number;
  moves: AdvancedMoveResult[];
  winner: string | null;
  finalState: GameState;
  performance: GamePerformanceAnalysis;
}

describe('Advanced Bingo Engine Tests', () => {
  let engine: AdvancedBingoEngine;

  beforeEach(() => {
    engine = new AdvancedBingoEngine(5);
  });

  describe('Complex Game Logic', () => {
    test('should handle player streak tracking correctly', () => {
      const gameState = engine['createGameState'](5);
      const player1 = 'player-streak-test';

      // Simulate multiple wins for streak building
      const moves = [
        { cellPosition: 0, playerId: player1, action: 'mark' as const },
        { cellPosition: 1, playerId: player1, action: 'mark' as const },
        { cellPosition: 2, playerId: player1, action: 'mark' as const },
        { cellPosition: 3, playerId: player1, action: 'mark' as const },
        { cellPosition: 4, playerId: player1, action: 'mark' as const }, // Should trigger win
      ];

      let currentState = gameState;
      let lastResult: AdvancedMoveResult | null = null;

      for (const move of moves) {
        const result = engine.processAdvancedMove(currentState, move);
        expect(result.success).toBe(true);

        if (result.newState) {
          currentState = result.newState;
        }
        lastResult = result;
      }

      expect(lastResult?.winDetected).toBe(true);
      expect(lastResult?.streakCount).toBe(1);
      expect(lastResult?.score?.bonuses.streakBonus).toBeUndefined(); // First win, no streak bonus yet
    });

    test('should apply complex scoring modifiers', () => {
      const gameState = engine['createGameState'](5);
      const player1 = 'player-modifier-test';

      // Set up a win with modifiers
      const setupMoves = [
        { cellPosition: 0, playerId: player1, action: 'mark' as const },
        { cellPosition: 1, playerId: player1, action: 'mark' as const },
        { cellPosition: 2, playerId: player1, action: 'mark' as const },
        { cellPosition: 3, playerId: player1, action: 'mark' as const },
      ];

      let currentState = gameState;
      for (const move of setupMoves) {
        const result = engine.processAdvancedMove(currentState, move);
        currentState = result.newState!;
      }

      // Final move with modifiers
      const finalMove: AdvancedMove = {
        cellPosition: 4,
        playerId: player1,
        action: 'mark',
        playerModifiers: {
          scoreMultiplier: 1.5,
        },
        cellModifiers: {
          points: 100,
        },
      };

      const result = engine.processAdvancedMove(currentState, finalMove);

      expect(result.success).toBe(true);
      expect(result.winDetected).toBe(true);
      expect(result.score?.multiplier).toBe(1.5);
      expect(result.score?.totalScore).toBeGreaterThan(150); // Base score with multiplier
    });

    test('should handle move validation with complex rules', () => {
      const gameState = engine['createGameState'](5);
      const player1 = 'player-validation-test';

      // Test max marks per turn
      const restrictedMove: AdvancedMove = {
        cellPosition: 0,
        playerId: player1,
        action: 'mark',
        playerModifiers: {
          maxMarksPerTurn: 1,
        },
      };

      // First move should succeed
      const result1 = engine.processAdvancedMove(gameState, restrictedMove);
      expect(result1.success).toBe(true);

      // Second move should fail due to turn limit
      const result2 = engine.processAdvancedMove(result1.newState!, {
        ...restrictedMove,
        cellPosition: 1,
      });
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Exceeded marks per turn limit');
    });

    test('should handle rollback on processing errors', () => {
      const gameState = engine['createGameState'](5);
      const player1 = 'player-rollback-test';

      // Mock the win detector to throw an error
      jest
        .spyOn(engine['winDetector'], 'detectWin')
        .mockImplementationOnce(() => {
          throw new Error('Win detection failed');
        });

      const move: AdvancedMove = {
        cellPosition: 12,
        playerId: player1,
        action: 'mark',
      };

      const result = engine.processAdvancedMove(gameState, move);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Win detection failed');

      // Processing time should still be recorded even on error
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe('Performance Analysis', () => {
    test('should track and analyze game performance metrics', () => {
      const gameState = engine['createGameState'](5);
      const players = ['player1', 'player2', 'player3'];

      // Simulate a series of moves
      const moves: AdvancedMove[] = [];
      for (let i = 0; i < 25; i++) {
        moves.push({
          cellPosition: i,
          playerId: players[i % players.length]!,
          action: 'mark',
          timestamp: Date.now() + i * 100,
        });
      }

      let currentState = gameState;
      for (const move of moves) {
        const result = engine.processAdvancedMove(currentState, move);
        if (result.newState) {
          currentState = result.newState;
        }
        if (result.winDetected) break;
      }

      const performance = engine.analyzeGamePerformance();

      expect(performance.totalMoves).toBeGreaterThan(0);
      expect(performance.winRate).toBeGreaterThanOrEqual(0);
      expect(performance.averageProcessingTime).toBeGreaterThan(0);
      expect(Object.keys(performance.playerPerformance)).toContain('player1');
      expect(performance.memoryUsage).toBeGreaterThan(0);
    });

    test('should maintain memory efficiency with history limits', () => {
      const gameState = engine['createGameState'](5);

      // Generate many moves to test memory management
      for (let i = 0; i < 1200; i++) {
        // More than the 1000 limit
        const move: AdvancedMove = {
          cellPosition: i % 25,
          playerId: `player-${i % 10}`,
          action: 'mark',
        };

        engine.processAdvancedMove(gameState, move);
      }

      const performance = engine.analyzeGamePerformance();
      expect(performance.totalMoves).toBeLessThanOrEqual(1000);
      expect(performance.memoryUsage).toBeLessThan(500000); // Should stay under 500KB
    });
  });

  describe('Complex Game Scenarios', () => {
    test('should simulate competitive multiplayer scenario', () => {
      const scenario: GameScenario = {
        boardSize: 5,
        moves: [
          // Player 1 goes for top row
          { cellPosition: 0, playerId: 'player1', action: 'mark' },
          { cellPosition: 1, playerId: 'player1', action: 'mark' },
          // Player 2 goes for left column
          { cellPosition: 0, playerId: 'player2', action: 'mark' }, // Overlap!
          { cellPosition: 5, playerId: 'player2', action: 'mark' },
          // Continue the race
          { cellPosition: 2, playerId: 'player1', action: 'mark' },
          { cellPosition: 10, playerId: 'player2', action: 'mark' },
          { cellPosition: 3, playerId: 'player1', action: 'mark' },
          { cellPosition: 15, playerId: 'player2', action: 'mark' },
          { cellPosition: 4, playerId: 'player1', action: 'mark' }, // Should win!
        ],
        expectedWinner: 'player1',
      };

      const result = engine.simulateComplexGameScenario(scenario);

      expect(result.winner).toBe('player1');
      expect(result.totalTime).toBeLessThan(100); // Should be fast
      expect(result.moves.some(m => m.winDetected)).toBe(true);
      expect(result.performance?.playerPerformance?.['player1']?.wins).toBe(1);
    });

    test('should handle diagonal race scenario', () => {
      const scenario: GameScenario = {
        boardSize: 5,
        moves: [
          // Both players go for different diagonals
          { cellPosition: 0, playerId: 'diagonal1', action: 'mark' }, // TL-BR diagonal
          { cellPosition: 4, playerId: 'diagonal2', action: 'mark' }, // TR-BL diagonal
          { cellPosition: 6, playerId: 'diagonal1', action: 'mark' },
          { cellPosition: 8, playerId: 'diagonal2', action: 'mark' },
          { cellPosition: 12, playerId: 'diagonal1', action: 'mark' }, // Center (both diagonals!)
          { cellPosition: 16, playerId: 'diagonal2', action: 'mark' },
          { cellPosition: 18, playerId: 'diagonal1', action: 'mark' },
          { cellPosition: 20, playerId: 'diagonal2', action: 'mark' },
          { cellPosition: 24, playerId: 'diagonal1', action: 'mark' }, // Should complete TL-BR
        ],
        expectedWinner: 'diagonal1',
      };

      const result = engine.simulateComplexGameScenario(scenario);

      expect(result.winner).toMatch(/diagonal[12]/); // Either player could win
      const winningMove = result.moves.find(m => m.winDetected);
      expect(winningMove?.winPatterns?.[0]?.type).toBe('single-line');
      expect(winningMove?.winPatterns?.[0]?.name).toMatch(/Diagonal/);
    });

    test('should handle complex pattern formation scenario', () => {
      const scenario: GameScenario = {
        boardSize: 5,
        moves: [
          // Player sets up for Letter X pattern (both diagonals)
          { cellPosition: 0, playerId: 'xplayer', action: 'mark' }, // TL
          { cellPosition: 4, playerId: 'xplayer', action: 'mark' }, // TR
          { cellPosition: 6, playerId: 'xplayer', action: 'mark' }, // Diagonal 1
          { cellPosition: 8, playerId: 'xplayer', action: 'mark' }, // Diagonal 2
          { cellPosition: 12, playerId: 'xplayer', action: 'mark' }, // Center
          { cellPosition: 16, playerId: 'xplayer', action: 'mark' }, // Diagonal 2
          { cellPosition: 18, playerId: 'xplayer', action: 'mark' }, // Diagonal 1
          { cellPosition: 20, playerId: 'xplayer', action: 'mark' }, // BL
          { cellPosition: 24, playerId: 'xplayer', action: 'mark' }, // BR - completes X
        ],
        expectedWinner: 'xplayer',
      };

      const result = engine.simulateComplexGameScenario(scenario);

      expect(result.winner).toBe('xplayer');
      const winningMove = result.moves.find(m => m.winDetected);
      expect(winningMove?.winPatterns?.length).toBeGreaterThanOrEqual(1); // Should detect at least one pattern
    });

    test('should handle unmark and recovery scenario', () => {
      const scenario: GameScenario = {
        boardSize: 5,
        moves: [
          // Player 1 builds towards a win
          { cellPosition: 0, playerId: 'player1', action: 'mark' },
          { cellPosition: 1, playerId: 'player1', action: 'mark' },
          { cellPosition: 2, playerId: 'player1', action: 'mark' },
          { cellPosition: 3, playerId: 'player1', action: 'mark' },
          // Player 2 sabotages by unmarking
          { cellPosition: 1, playerId: 'player1', action: 'unmark' },
          // Player 1 recovers and completes a different pattern
          { cellPosition: 5, playerId: 'player1', action: 'mark' }, // Start column
          { cellPosition: 10, playerId: 'player1', action: 'mark' },
          { cellPosition: 15, playerId: 'player1', action: 'mark' },
          { cellPosition: 20, playerId: 'player1', action: 'mark' }, // Complete column
        ],
        expectedWinner: 'player1',
      };

      const result = engine.simulateComplexGameScenario(scenario);

      expect(result.winner).toBe('player1');
      const finalMove = result.moves[result.moves.length - 1];
      expect(finalMove?.winDetected).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle extremely rapid moves', () => {
      const gameState = engine['createGameState'](3); // Smaller board for faster completion
      const rapidMoves: AdvancedMove[] = Array.from({ length: 9 }, (_, i) => ({
        cellPosition: i,
        playerId: 'speed-player',
        action: 'mark',
        timestamp: Date.now() + i, // 1ms apart
      }));

      const startTime = performance.now();
      let currentState = gameState;

      for (const move of rapidMoves) {
        const result = engine.processAdvancedMove(currentState, move);
        if (result.newState) {
          currentState = result.newState;
        }
        if (result.winDetected) break;
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50); // Should handle rapid moves efficiently
    });

    test('should handle invalid move sequences gracefully', () => {
      const gameState = engine['createGameState'](5);

      const invalidMoves: AdvancedMove[] = [
        { cellPosition: -1, playerId: 'player1', action: 'mark' }, // Invalid position
        { cellPosition: 25, playerId: 'player1', action: 'mark' }, // Out of bounds
        { cellPosition: 0, playerId: 'player1', action: 'unmark' }, // Unmark non-marked cell
      ];

      for (const move of invalidMoves) {
        const result = engine.processAdvancedMove(gameState, move);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    test('should maintain performance under memory pressure', () => {
      const gameState = engine['createGameState'](7); // Larger board

      // Simulate memory pressure with large move history
      for (let round = 0; round < 5; round++) {
        for (let i = 0; i < 49; i++) {
          const move: AdvancedMove = {
            cellPosition: i,
            playerId: `player-${i % 7}`,
            action: i % 2 === 0 ? 'mark' : 'unmark',
            cellModifiers: {
              points: Math.floor(Math.random() * 100),
            },
          };

          const startTime = performance.now();
          engine.processAdvancedMove(gameState, move);
          const endTime = performance.now();

          // Each move should still process quickly
          expect(endTime - startTime).toBeLessThan(10);
        }
      }

      const performanceAnalysis = engine.analyzeGamePerformance();
      expect(performanceAnalysis.memoryUsage).toBeLessThan(1000000); // Under 1MB
    });
  });
});
