/**
 * @jest-environment node
 */

/**
 * Enhanced Bingo Game Logic Tests
 * 
 * Focus on testing complex game logic scenarios without heavy mocking.
 * Tests real win detection, scoring, and game state logic.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { WinDetectionService } from '@/features/bingo-boards/services/win-detection.service';
import { ScoringService } from '@/features/bingo-boards/services/scoring.service';
import { bingoGeneratorService } from '../bingo-generator.service';
import type { BoardCell } from '@/types/domains/bingo';
import type { WinPattern } from '@/features/bingo-boards/types/win-patterns.types';

// Helper functions for creating test data
function createBoardCell(index: number, marked = false): BoardCell {
  return {
    text: `Cell ${index}`,
    colors: null,
    completed_by: marked ? ['player-1'] : null,
    blocked: false,
    is_marked: marked,
    cell_id: `cell-${index}`,
    version: 1,
    last_updated: Date.now(),
    last_modified_by: marked ? 'player-1' : null,
  };
}

function createBoardState(size: number, markedPositions: number[] = []): BoardCell[] {
  return Array.from({ length: size * size }, (_, i) =>
    createBoardCell(i, markedPositions.includes(i))
  );
}

// Complex game logic engine for testing
class GameLogicEngine {
  private winDetector: WinDetectionService;
  private scorer: ScoringService;
  private boardSize: number;

  constructor(boardSize = 5) {
    this.winDetector = new WinDetectionService(boardSize);
    this.scorer = new ScoringService();
    this.boardSize = boardSize;
  }

  simulateGame(scenario: GameScenario): GameResult {
    let boardState = createBoardState(this.boardSize);
    const moveResults: MoveResult[] = [];
    let gameEnded = false;
    let winner: string | null = null;

    for (const move of scenario.moves) {
      if (gameEnded) break;

      const result = this.processMove(boardState, move);
      moveResults.push(result);

      if (result.winDetected) {
        gameEnded = true;
        winner = move.playerId;
        break;
      }

      // Update board state
      boardState = result.newBoardState;
    }

    return {
      moves: moveResults,
      winner,
      finalBoardState: boardState,
      gameEnded,
    };
  }

  private processMove(boardState: BoardCell[], move: GameMove): MoveResult {
    const newBoardState = [...boardState];
    const cell = newBoardState[move.position];

    if (!cell) {
      throw new Error(`Invalid cell position: ${move.position}`);
    }

    // Apply move
    if (move.action === 'mark') {
      cell.is_marked = true;
      cell.completed_by = [...(cell.completed_by || []), move.playerId];
      cell.last_modified_by = move.playerId;
    } else if (move.action === 'unmark') {
      cell.is_marked = false;
      cell.completed_by = (cell.completed_by || []).filter(id => id !== move.playerId);
      cell.last_modified_by = move.playerId;
    }

    cell.last_updated = Date.now();
    cell.version = (cell.version || 0) + 1;

    // Check for wins
    const winResult = this.winDetector.detectWin(newBoardState);
    
    // Calculate score if win detected
    let score: any = null;
    if (winResult.hasWin) {
      score = this.scorer.calculateScore(
        winResult.patterns,
        120, // 2 minutes
        true, // first to win
        0 // no penalties
      );
    }

    return {
      move,
      newBoardState,
      winDetected: winResult.hasWin,
      winPatterns: winResult.patterns,
      score,
      totalPoints: winResult.totalPoints,
    };
  }

  analyzePatternComplexity(patterns: WinPattern[]): PatternComplexity {
    const complexity = {
      simpleLines: 0,
      diagonals: 0,
      specialPatterns: 0,
      totalScore: 0,
      maxSinglePatternScore: 0,
    };

    for (const pattern of patterns) {
      complexity.totalScore += pattern.points;
      complexity.maxSinglePatternScore = Math.max(
        complexity.maxSinglePatternScore,
        pattern.points
      );

      if (pattern.type === 'single-line' && pattern.name.includes('Row')) {
        complexity.simpleLines++;
      } else if (pattern.type === 'single-line' && pattern.name.includes('Column')) {
        complexity.simpleLines++;
      } else if (pattern.type === 'single-line' && pattern.name.includes('Diagonal')) {
        complexity.diagonals++;
      } else {
        complexity.specialPatterns++;
      }
    }

    return complexity;
  }
}

// Type definitions
interface GameMove {
  position: number;
  playerId: string;
  action: 'mark' | 'unmark';
}

interface GameScenario {
  moves: GameMove[];
  description: string;
}

interface MoveResult {
  move: GameMove;
  newBoardState: BoardCell[];
  winDetected: boolean;
  winPatterns: WinPattern[];
  score: any;
  totalPoints: number;
}

interface GameResult {
  moves: MoveResult[];
  winner: string | null;
  finalBoardState: BoardCell[];
  gameEnded: boolean;
}

interface PatternComplexity {
  simpleLines: number;
  diagonals: number;
  specialPatterns: number;
  totalScore: number;
  maxSinglePatternScore: number;
}

describe('Enhanced Bingo Game Logic Tests', () => {
  let gameEngine: GameLogicEngine;

  beforeEach(() => {
    gameEngine = new GameLogicEngine(5);
  });

  describe('Complex Win Detection Scenarios', () => {
    test('should detect multiple simultaneous wins correctly', () => {
      const winDetector = new WinDetectionService(5);
      
      // Create board state with both a row and column win
      const boardState = createBoardState(5, [
        0, 1, 2, 3, 4,  // First row
        0, 5, 10, 15, 20 // First column (0 is shared)
      ]);

      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(true);
      expect(result.patterns.length).toBeGreaterThanOrEqual(2);
      
      const rowPattern = result.patterns.find(p => p.name === 'Row 1');
      const columnPattern = result.patterns.find(p => p.name === 'Column 1');
      
      expect(rowPattern).toBeTruthy();
      expect(columnPattern).toBeTruthy();
      expect(result.totalPoints).toBe(200); // 100 + 100
    });

    test('should handle complex overlapping diagonal wins', () => {
      const winDetector = new WinDetectionService(5);
      
      // Create X pattern (both diagonals)
      const xPositions = [0, 4, 6, 8, 12, 16, 18, 20, 24];
      const boardState = createBoardState(5, xPositions);

      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(true);
      expect(result.patterns.length).toBeGreaterThanOrEqual(2);
      
      const diagonal1 = result.patterns.find(p => p.name === 'Diagonal (↘)');
      const diagonal2 = result.patterns.find(p => p.name === 'Diagonal (↙)');
      
      expect(diagonal1).toBeTruthy();
      expect(diagonal2).toBeTruthy();
      expect(result.totalPoints).toBe(500); // 150 + 150 + 200 (four corners)
    });

    test('should correctly identify special pattern Letter T', () => {
      const winDetector = new WinDetectionService(5);
      
      // T pattern: top row + middle column
      const tPositions = [0, 1, 2, 3, 4, 7, 12, 17, 22];
      
      const tPattern = winDetector.checkLetterT(tPositions);
      
      expect(tPattern).toBeTruthy();
      expect(tPattern!.type).toBe('letter-t');
      expect(tPattern!.name).toBe('Letter T');
      expect(tPattern!.points).toBe(300);
    });

    test('should handle performance for large board sizes', () => {
      const largeWinDetector = new WinDetectionService(10);
      const largeBoardState = createBoardState(10, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

      const startTime = performance.now();
      const result = largeWinDetector.detectWin(largeBoardState);
      const endTime = performance.now();

      expect(result.hasWin).toBe(true);
      expect(endTime - startTime).toBeLessThan(10); // Should be fast even for large boards
    });
  });

  describe('Complex Game Scenarios', () => {
    test('should simulate competitive race scenario', () => {
      const scenario: GameScenario = {
        description: 'Two players racing for different patterns',
        moves: [
          // Player 1 going for top row
          { position: 0, playerId: 'player1', action: 'mark' },
          { position: 1, playerId: 'player1', action: 'mark' },
          // Player 2 going for left column  
          { position: 0, playerId: 'player2', action: 'mark' }, // Shared cell
          { position: 5, playerId: 'player2', action: 'mark' },
          // Continue race
          { position: 2, playerId: 'player1', action: 'mark' },
          { position: 10, playerId: 'player2', action: 'mark' },
          { position: 3, playerId: 'player1', action: 'mark' },
          { position: 15, playerId: 'player2', action: 'mark' },
          { position: 4, playerId: 'player1', action: 'mark' }, // Should win!
        ],
      };

      const result = gameEngine.simulateGame(scenario);

      expect(result.gameEnded).toBe(true);
      expect(result.winner).toBe('player1');
      expect(result.moves.some(m => m.winDetected)).toBe(true);
      
      const winningMove = result.moves.find(m => m.winDetected);
      expect(winningMove?.winPatterns[0]?.name).toBe('Row 1');
    });

    test('should handle complex unmark and recovery scenario', () => {
      const scenario: GameScenario = {
        description: 'Player builds pattern, gets disrupted, then recovers',
        moves: [
          // Build towards row win
          { position: 0, playerId: 'player1', action: 'mark' },
          { position: 1, playerId: 'player1', action: 'mark' },
          { position: 2, playerId: 'player1', action: 'mark' },
          { position: 3, playerId: 'player1', action: 'mark' },
          // Self-unmark (mistake)
          { position: 2, playerId: 'player1', action: 'unmark' },
          // Recovery with diagonal
          { position: 6, playerId: 'player1', action: 'mark' },
          { position: 12, playerId: 'player1', action: 'mark' },
          { position: 18, playerId: 'player1', action: 'mark' },
          { position: 24, playerId: 'player1', action: 'mark' }, // Complete diagonal
        ],
      };

      const result = gameEngine.simulateGame(scenario);

      expect(result.gameEnded).toBe(true);
      expect(result.winner).toBe('player1');
      
      const winningMove = result.moves.find(m => m.winDetected);
      expect(winningMove?.winPatterns[0]?.name).toBe('Diagonal (↘)');
    });

    test('should handle multiple player overlapping marks', () => {
      const scenario: GameScenario = {
        description: 'Multiple players marking the same cells',
        moves: [
          // Multiple players mark same position
          { position: 12, playerId: 'player1', action: 'mark' },
          { position: 12, playerId: 'player2', action: 'mark' },
          { position: 12, playerId: 'player3', action: 'mark' },
          // Player 1 continues pattern
          { position: 0, playerId: 'player1', action: 'mark' },
          { position: 6, playerId: 'player1', action: 'mark' },
          { position: 18, playerId: 'player1', action: 'mark' },
          { position: 24, playerId: 'player1', action: 'mark' }, // Complete diagonal
        ],
      };

      const result = gameEngine.simulateGame(scenario);

      expect(result.gameEnded).toBe(true);
      expect(result.winner).toBe('player1');
      
      // Check that center cell has multiple completers
      const centerCell = result.finalBoardState[12];
      expect(centerCell?.completed_by).toContain('player1');
      expect(centerCell?.completed_by).toContain('player2');
      expect(centerCell?.completed_by).toContain('player3');
    });
  });

  describe('Advanced Scoring Logic', () => {
    test('should calculate complex pattern scoring correctly', () => {
      const winDetector = new WinDetectionService(5);
      const scorer = new ScoringService();
      
      // Create full house scenario
      const allPositions = Array.from({ length: 25 }, (_, i) => i);
      const boardState = createBoardState(5, allPositions);
      
      const winResult = winDetector.detectWin(boardState);
      const score = scorer.calculateScore(
        winResult.patterns,
        60, // 1 minute (fast completion)
        true, // first to win
        0 // no penalties
      );

      expect(winResult.hasWin).toBe(true);
      expect(winResult.patterns.length).toBeGreaterThan(10); // Many patterns
      expect(score.totalScore).toBeGreaterThan(500); // High score for full house
      expect(score).toBeDefined(); // Should have score object
    });

    test('should analyze pattern complexity correctly', () => {
      const winDetector = new WinDetectionService(5);
      
      // Create complex overlapping patterns
      const complexPositions = [
        0, 1, 2, 3, 4,    // Row 1
        0, 5, 10, 15, 20, // Column 1  
        0, 6, 12, 18, 24  // Diagonal
      ];
      const uniquePositions = [...new Set(complexPositions)];
      const boardState = createBoardState(5, uniquePositions);
      
      const winResult = winDetector.detectWin(boardState);
      const complexity = gameEngine.analyzePatternComplexity(winResult.patterns);

      expect(complexity.simpleLines).toBeGreaterThanOrEqual(2); // Row + Column
      expect(complexity.diagonals).toBeGreaterThanOrEqual(1); // Diagonal
      expect(complexity.totalScore).toBeGreaterThan(300);
    });

    test('should handle edge case of minimal win patterns', () => {
      const winDetector = new WinDetectionService(5);
      const scorer = new ScoringService();
      
      // Just a simple row win
      const minimalPositions = [0, 1, 2, 3, 4];
      const boardState = createBoardState(5, minimalPositions);
      
      const winResult = winDetector.detectWin(boardState);
      const score = scorer.calculateScore(
        winResult.patterns,
        300, // 5 minutes (slow completion)
        false, // not first to win
        10 // some penalties
      );

      expect(winResult.hasWin).toBe(true);
      expect(winResult.patterns.length).toBe(1);
      expect(winResult.totalPoints).toBe(100);
      expect(score.totalScore).toBeLessThanOrEqual(100); // Penalties may be applied
    });
  });

  describe('Game Logic Validation', () => {
    test('should validate parameter constraints correctly', () => {
      // Test grid size validation
      expect(bingoGeneratorService.validateGenerationParams({
        gameCategory: 'Valorant',
        difficulty: 'medium' as any,
        cardPoolSize: 'Medium' as const,
        minVotes: 0,
        selectedCategories: [],
        cardSource: 'public' as const,
        gridSize: 8, // Too small
      })).toBe('Grid size must be between 9 and 49');

      expect(bingoGeneratorService.validateGenerationParams({
        gameCategory: 'Valorant',
        difficulty: 'medium' as any,
        cardPoolSize: 'Medium' as const,
        minVotes: 0,
        selectedCategories: [],
        cardSource: 'public' as const,
        gridSize: 50, // Too large
      })).toBe('Grid size must be between 9 and 49');

      // Test valid parameters
      expect(bingoGeneratorService.validateGenerationParams({
        gameCategory: 'Valorant',
        difficulty: 'medium' as any,
        cardPoolSize: 'Medium' as const,
        minVotes: 0,
        selectedCategories: [],
        cardSource: 'public' as const,
        gridSize: 25, // Valid
      })).toBeNull();
    });

    test('should handle different board sizes consistently', () => {
      // Test 3x3 board
      const small = new WinDetectionService(3);
      const smallBoard = createBoardState(3, [0, 1, 2]); // Top row
      const smallResult = small.detectWin(smallBoard);
      
      expect(smallResult.hasWin).toBe(true);
      expect(smallResult.patterns[0]?.positions).toEqual([0, 1, 2]);

      // Test 7x7 board
      const large = new WinDetectionService(7);
      const largeBoard = createBoardState(7, [0, 7, 14, 21, 28, 35, 42]); // Left column
      const largeResult = large.detectWin(largeBoard);
      
      expect(largeResult.hasWin).toBe(true);
      expect(largeResult.patterns[0]?.positions).toEqual([0, 7, 14, 21, 28, 35, 42]);
    });

    test('should maintain performance under stress conditions', () => {
      const stressEngine = new GameLogicEngine(7);
      
      // Create large game with many moves
      const stressMoves: GameMove[] = [];
      for (let i = 0; i < 100; i++) {
        stressMoves.push({
          position: i % 49,
          playerId: `player${i % 5}`,
          action: i % 3 === 0 ? 'unmark' : 'mark',
        });
      }

      const stressScenario: GameScenario = {
        description: 'High-frequency move stress test',
        moves: stressMoves,
      };

      const startTime = performance.now();
      const result = stressEngine.simulateGame(stressScenario);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
      expect(result.moves.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed board states gracefully', () => {
      const winDetector = new WinDetectionService(5);
      
      // Create board with some invalid cells
      const malformedBoard = Array.from({ length: 25 }, (_, i) => {
        if (i % 7 === 0) {
          return { ...createBoardCell(i), text: null } as any;
        }
        return createBoardCell(i, i < 5);
      });

      expect(() => {
        const result = winDetector.detectWin(malformedBoard);
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    test('should handle empty and sparse boards', () => {
      const winDetector = new WinDetectionService(5);
      
      // Empty board
      const emptyBoard = createBoardState(5, []);
      const emptyResult = winDetector.detectWin(emptyBoard);
      
      expect(emptyResult.hasWin).toBe(false);
      expect(emptyResult.patterns).toHaveLength(0);
      expect(emptyResult.totalPoints).toBe(0);

      // Sparse board (only one cell marked)
      const sparseBoard = createBoardState(5, [12]);
      const sparseResult = winDetector.detectWin(sparseBoard);
      
      expect(sparseResult.hasWin).toBe(false);
      expect(sparseResult.patterns).toHaveLength(0);
    });

    test('should validate win patterns against actual board state', () => {
      const winDetector = new WinDetectionService(5);
      
      // Test that patterns match actual marked cells
      const positions = [0, 6, 12, 18, 24]; // Diagonal
      const boardState = createBoardState(5, positions);
      const result = winDetector.detectWin(boardState);
      
      expect(result.hasWin).toBe(true);
      expect(result.patterns[0]?.positions).toEqual(positions);
      
      // Verify all pattern positions are actually marked
      const firstPattern = result.patterns[0];
      if (firstPattern) {
        for (const pos of firstPattern.positions) {
          expect(boardState[pos]?.is_marked).toBe(true);
        }
      }
    });
  });
});