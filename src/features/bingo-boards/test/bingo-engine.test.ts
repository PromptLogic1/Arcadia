import { describe, test, expect, beforeEach } from '@jest/globals';
import { WinDetectionService } from '../services/win-detection.service';
import { ScoringService } from '../services/scoring.service';
import type { BoardCell, GameState, WinPattern } from '../types';

// Mock game engine that combines win detection and scoring
class BingoEngine {
  constructor(
    private winDetector: WinDetectionService,
    private scoringService: ScoringService,
    private boardSize = 5
  ) {}

  processMove(
    gameState: GameState,
    cellPosition: number,
    playerId: string,
    action: 'mark' | 'unmark'
  ): {
    newState: GameState;
    winDetected: boolean;
    winPatterns?: WinPattern[];
    score?: number;
  } {
    const newCells = [...gameState.currentState];
    const cell = newCells[cellPosition];

    if (!cell) {
      throw new Error(`Invalid cell position: ${cellPosition}`);
    }

    if (action === 'mark') {
      cell.is_marked = true;
      cell.completed_by = [...(cell.completed_by ?? []), playerId];
      cell.last_modified_by = playerId;
    } else {
      cell.is_marked = false;
      cell.completed_by = (cell.completed_by ?? []).filter(
        id => id !== playerId
      );
      cell.last_modified_by = playerId;
    }

    cell.last_updated = Date.now();
    cell.version = (cell.version ?? 0) + 1;

    const newState: GameState = {
      currentState: newCells,
      version: gameState.version + 1,
      lastUpdate: new Date().toISOString(),
      activePlayer: playerId,
    };

    const winResult = this.winDetector.detectWin(newCells);

    if (winResult.hasWin) {
      const score = this.scoringService.calculateScore(
        winResult.patterns,
        120, // 2 minutes for test
        true,
        0
      );

      return {
        newState,
        winDetected: true,
        winPatterns: winResult.patterns,
        score: score.totalScore,
      };
    }

    return {
      newState,
      winDetected: false,
    };
  }

  validateGameState(state: GameState): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check board size
    const expectedCells = this.boardSize * this.boardSize;
    if (state.currentState.length !== expectedCells) {
      errors.push(
        `Invalid board size: expected ${expectedCells} cells, got ${state.currentState.length}`
      );
    }

    // Check for duplicate cell IDs
    const cellIds = state.currentState.map(c => c.cell_id).filter(Boolean);
    const uniqueIds = new Set(cellIds);
    if (cellIds.length !== uniqueIds.size) {
      errors.push('Duplicate cell IDs detected');
    }

    // Check version consistency
    if (state.version < 0) {
      errors.push('Invalid version number');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  canPlayerMark(
    gameState: GameState,
    cellPosition: number,
    playerId: string
  ): { allowed: boolean; reason?: string } {
    const cell = gameState.currentState[cellPosition];

    if (!cell) {
      return { allowed: false, reason: 'Invalid cell position' };
    }

    if (cell.blocked) {
      return { allowed: false, reason: 'Cell is blocked' };
    }

    if (cell.is_marked && cell.completed_by?.includes(playerId)) {
      return { allowed: false, reason: 'Cell already marked by this player' };
    }

    return { allowed: true };
  }
}

describe('BingoEngine', () => {
  let engine: BingoEngine;
  let winDetector: WinDetectionService;
  let scoringService: ScoringService;

  beforeEach(() => {
    winDetector = new WinDetectionService(5);
    scoringService = new ScoringService();
    engine = new BingoEngine(winDetector, scoringService);
  });

  function createInitialGameState(size = 25): GameState {
    const cells: BoardCell[] = Array.from(
      { length: size },
      (_, i) =>
        ({
          text: `Cell ${i}`,
          colors: null,
          completed_by: [],
          blocked: false,
          is_marked: false,
          cell_id: `cell-${i}`,
          version: 1,
          last_updated: Date.now(),
          last_modified_by: null,
        }) satisfies BoardCell
    );

    return {
      currentState: cells,
      version: 1,
      lastUpdate: new Date().toISOString(),
    };
  }

  describe('Move Processing', () => {
    test('should mark a cell correctly', () => {
      const gameState = createInitialGameState();
      const result = engine.processMove(gameState, 12, 'player1', 'mark');

      const cell = result.newState.currentState[12];
      expect(cell?.is_marked).toBe(true);
      expect(cell?.completed_by).toContain('player1');
      expect(cell?.last_modified_by).toBe('player1');
      expect(result.newState.version).toBe(2);
      expect(result.winDetected).toBe(false);
    });

    test('should unmark a cell correctly', () => {
      const gameState = createInitialGameState();
      // First mark the cell
      const marked = engine.processMove(gameState, 12, 'player1', 'mark');
      // Then unmark it
      const result = engine.processMove(
        marked.newState,
        12,
        'player1',
        'unmark'
      );

      const cell = result.newState.currentState[12];
      expect(cell?.is_marked).toBe(false);
      expect(cell?.completed_by).not.toContain('player1');
      expect(result.newState.version).toBe(3);
    });

    test('should handle multiple players marking different cells', () => {
      let gameState = createInitialGameState();

      // Player 1 marks cell 0
      const result1 = engine.processMove(gameState, 0, 'player1', 'mark');
      gameState = result1.newState;

      // Player 2 marks cell 1
      const result2 = engine.processMove(gameState, 1, 'player2', 'mark');
      gameState = result2.newState;

      // Player 3 marks cell 2
      const result3 = engine.processMove(gameState, 2, 'player3', 'mark');

      const cell0 = result3.newState.currentState[0];
      const cell1 = result3.newState.currentState[1];
      const cell2 = result3.newState.currentState[2];
      expect(cell0?.completed_by).toContain('player1');
      expect(cell1?.completed_by).toContain('player2');
      expect(cell2?.completed_by).toContain('player3');
      expect(result3.newState.version).toBe(4);
    });

    test('should detect win after completing a row', () => {
      let gameState = createInitialGameState();

      // Mark cells 0-3
      for (let i = 0; i < 4; i++) {
        const result = engine.processMove(gameState, i, 'player1', 'mark');
        gameState = result.newState;
        expect(result.winDetected).toBe(false);
      }

      // Mark cell 4 to complete the row
      const winResult = engine.processMove(gameState, 4, 'player1', 'mark');

      expect(winResult.winDetected).toBe(true);
      expect(winResult.winPatterns).toHaveLength(1);
      const firstPattern = winResult.winPatterns?.[0];
      expect(firstPattern?.name).toBe('Row 1');
      expect(winResult.score).toBeGreaterThan(0);
    });

    test('should throw error for invalid cell position', () => {
      const gameState = createInitialGameState();

      expect(() => {
        engine.processMove(gameState, 100, 'player1', 'mark');
      }).toThrow('Invalid cell position: 100');
    });
  });

  describe('Game State Validation', () => {
    test('should validate correct game state', () => {
      const gameState = createInitialGameState();
      const validation = engine.validateGameState(gameState);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect invalid board size', () => {
      const gameState = createInitialGameState(20); // Wrong size
      const validation = engine.validateGameState(gameState);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'Invalid board size: expected 25 cells, got 20'
      );
    });

    test('should detect duplicate cell IDs', () => {
      const gameState = createInitialGameState();
      const cellToModify = gameState.currentState[1];
      if (cellToModify) {
        cellToModify.cell_id = 'cell-0'; // Duplicate ID
      }

      const validation = engine.validateGameState(gameState);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Duplicate cell IDs detected');
    });

    test('should detect invalid version', () => {
      const gameState = createInitialGameState();
      gameState.version = -1;

      const validation = engine.validateGameState(gameState);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid version number');
    });
  });

  describe('Permission Checks', () => {
    test('should allow marking unmarked cell', () => {
      const gameState = createInitialGameState();
      const permission = engine.canPlayerMark(gameState, 12, 'player1');

      expect(permission.allowed).toBe(true);
      expect(permission.reason).toBeUndefined();
    });

    test('should prevent marking blocked cell', () => {
      const gameState = createInitialGameState();
      const cellToBlock = gameState.currentState[12];
      if (cellToBlock) {
        cellToBlock.blocked = true;
      }

      const permission = engine.canPlayerMark(gameState, 12, 'player1');

      expect(permission.allowed).toBe(false);
      expect(permission.reason).toBe('Cell is blocked');
    });

    test('should prevent marking already marked cell by same player', () => {
      const gameState = createInitialGameState();
      const cellToMark = gameState.currentState[12];
      if (cellToMark) {
        cellToMark.is_marked = true;
        cellToMark.completed_by = ['player1'];
      }

      const permission = engine.canPlayerMark(gameState, 12, 'player1');

      expect(permission.allowed).toBe(false);
      expect(permission.reason).toBe('Cell already marked by this player');
    });

    test('should handle invalid cell position', () => {
      const gameState = createInitialGameState();
      const permission = engine.canPlayerMark(gameState, 100, 'player1');

      expect(permission.allowed).toBe(false);
      expect(permission.reason).toBe('Invalid cell position');
    });
  });

  describe('Complex Game Scenarios', () => {
    test('should handle multiple simultaneous wins', () => {
      let gameState = createInitialGameState();

      // Set up board state one move away from both row and column win
      const setupMoves = [
        0,
        1,
        2,
        3, // Row 1 (missing 4)
        0,
        5,
        10,
        15, // Column 1 (missing 20, but 0 is shared)
      ];

      setupMoves.forEach(pos => {
        const result = engine.processMove(gameState, pos, 'player1', 'mark');
        gameState = result.newState;
      });

      // Complete both patterns with one move
      const result = engine.processMove(gameState, 20, 'player1', 'mark');
      gameState = result.newState;
      expect(result.winDetected).toBe(true);
      expect(result.winPatterns).toHaveLength(1); // Only column win

      // Now complete the row
      const rowWin = engine.processMove(gameState, 4, 'player1', 'mark');
      expect(rowWin.winDetected).toBe(true);
      expect(rowWin.winPatterns?.length).toBeGreaterThan(1); // Both row and column
    });

    test('should calculate correct score with bonuses', () => {
      const gameState = createInitialGameState();

      // Mock a quick diagonal win
      const diagonalPositions = [0, 6, 12, 18, 24];
      let currentState = gameState;

      diagonalPositions.forEach((pos, index) => {
        const isLast = index === diagonalPositions.length - 1;
        const result = engine.processMove(currentState, pos, 'player1', 'mark');
        currentState = result.newState;

        if (isLast) {
          expect(result.winDetected).toBe(true);
          expect(result.score).toBeGreaterThan(150); // Base diagonal score with bonuses
        }
      });
    });

    test('should maintain game state consistency through complex interactions', () => {
      let gameState = createInitialGameState();
      const moves = [
        { pos: 0, player: 'player1', action: 'mark' as const },
        { pos: 1, player: 'player2', action: 'mark' as const },
        { pos: 0, player: 'player2', action: 'mark' as const }, // Overlap
        { pos: 1, player: 'player1', action: 'unmark' as const },
        { pos: 2, player: 'player1', action: 'mark' as const },
      ];

      moves.forEach(move => {
        const result = engine.processMove(
          gameState,
          move.pos,
          move.player,
          move.action
        );
        gameState = result.newState;

        // Validate state after each move
        const validation = engine.validateGameState(gameState);
        expect(validation.valid).toBe(true);
      });

      // Check final state
      const finalCell0 = gameState.currentState[0];
      const finalCell1 = gameState.currentState[1];
      const finalCell2 = gameState.currentState[2];
      expect(finalCell0?.completed_by).toContain('player1');
      expect(finalCell0?.completed_by).toContain('player2');
      expect(finalCell1?.is_marked).toBe(false);
      expect(finalCell2?.completed_by).toContain('player1');
      expect(gameState.version).toBe(6);
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid consecutive moves', () => {
      const gameState = createInitialGameState();
      const startTime = performance.now();

      // Simulate 100 rapid moves
      let currentState = gameState;
      for (let i = 0; i < 100; i++) {
        const pos = i % 25;
        const player = `player${(i % 3) + 1}`;
        const action: 'mark' | 'unmark' = i % 4 === 0 ? 'unmark' : 'mark';

        const result = engine.processMove(currentState, pos, player, action);
        currentState = result.newState;
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should process 100 moves in under 100ms
      expect(currentState.version).toBe(101);
    });

    test('should handle all cells being marked (full house)', () => {
      let gameState = createInitialGameState();

      // Mark all cells
      for (let i = 0; i < 25; i++) {
        const result = engine.processMove(gameState, i, 'player1', 'mark');
        gameState = result.newState;

        if (i === 24) {
          expect(result.winDetected).toBe(true);
          const fullHouse = result.winPatterns?.find(
            p => p.type === 'full-house'
          );
          expect(fullHouse).toBeDefined();
          expect(fullHouse?.points).toBe(500);
        }
      }
    });
  });
});
