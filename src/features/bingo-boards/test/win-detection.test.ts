import { describe, test, expect, beforeEach } from 'vitest';
import { WinDetectionService } from '../services/win-detection.service';
import type { BoardCell, WinPattern } from '../types';

describe('WinDetectionService', () => {
  let winDetector: WinDetectionService;

  beforeEach(() => {
    winDetector = new WinDetectionService(5); // Default 5x5 board
  });

  // Helper function to create a board state
  function createBoardState(markedPositions: number[], size = 25): BoardCell[] {
    return Array.from({ length: size }, (_, index) => ({
      text: `Cell ${index}`,
      colors: null,
      completed_by: null,
      blocked: false,
      is_marked: markedPositions.includes(index),
      cell_id: `cell-${index}`,
      version: 1,
      last_updated: Date.now(),
      last_modified_by: null,
      isMarked: markedPositions.includes(index),
    }));
  }

  describe('Horizontal Line Detection', () => {
    test('should detect first row win', () => {
      const boardState = createBoardState([0, 1, 2, 3, 4]);
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(true);
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0]).toMatchObject({
        type: 'single-line',
        name: 'Row 1',
        positions: [0, 1, 2, 3, 4],
        points: 100,
      });
      expect(result.winningCells).toEqual([0, 1, 2, 3, 4]);
      expect(result.totalPoints).toBe(100);
    });

    test('should detect middle row win', () => {
      const boardState = createBoardState([10, 11, 12, 13, 14]);
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(true);
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0]).toMatchObject({
        type: 'single-line',
        name: 'Row 3',
        positions: [10, 11, 12, 13, 14],
        points: 100,
      });
    });

    test('should detect last row win', () => {
      const boardState = createBoardState([20, 21, 22, 23, 24]);
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(true);
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0]).toMatchObject({
        type: 'single-line',
        name: 'Row 5',
        positions: [20, 21, 22, 23, 24],
        points: 100,
      });
    });

    test('should not detect incomplete horizontal line', () => {
      const boardState = createBoardState([0, 1, 2, 3]); // Missing position 4
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(false);
      expect(result.patterns).toHaveLength(0);
      expect(result.totalPoints).toBe(0);
    });
  });

  describe('Vertical Line Detection', () => {
    test('should detect first column win', () => {
      const boardState = createBoardState([0, 5, 10, 15, 20]);
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(true);
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0]).toMatchObject({
        type: 'single-line',
        name: 'Column 1',
        positions: [0, 5, 10, 15, 20],
        points: 100,
      });
    });

    test('should detect middle column win', () => {
      const boardState = createBoardState([2, 7, 12, 17, 22]);
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(true);
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0]).toMatchObject({
        type: 'single-line',
        name: 'Column 3',
        positions: [2, 7, 12, 17, 22],
        points: 100,
      });
    });

    test('should detect last column win', () => {
      const boardState = createBoardState([4, 9, 14, 19, 24]);
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(true);
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0]).toMatchObject({
        type: 'single-line',
        name: 'Column 5',
        positions: [4, 9, 14, 19, 24],
        points: 100,
      });
    });
  });

  describe('Diagonal Line Detection', () => {
    test('should detect top-left to bottom-right diagonal', () => {
      const boardState = createBoardState([0, 6, 12, 18, 24]);
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(true);
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0]).toMatchObject({
        type: 'single-line',
        name: 'Diagonal (↘)',
        positions: [0, 6, 12, 18, 24],
        points: 150,
      });
      expect(result.totalPoints).toBe(150);
    });

    test('should detect top-right to bottom-left diagonal', () => {
      const boardState = createBoardState([4, 8, 12, 16, 20]);
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(true);
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0]).toMatchObject({
        type: 'single-line',
        name: 'Diagonal (↙)',
        positions: [4, 8, 12, 16, 20],
        points: 150,
      });
      expect(result.totalPoints).toBe(150);
    });

    test('should not detect incomplete diagonal', () => {
      const boardState = createBoardState([0, 6, 12, 18]); // Missing position 24
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(false);
      expect(result.patterns).toHaveLength(0);
    });
  });

  describe('Four Corners Detection', () => {
    test('should detect four corners win', () => {
      const boardState = createBoardState([0, 4, 20, 24]);
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(true);
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0]).toMatchObject({
        type: 'four-corners',
        name: 'Four Corners',
        positions: [0, 4, 20, 24],
        points: 200,
      });
      expect(result.totalPoints).toBe(200);
    });

    test('should not detect incomplete four corners', () => {
      const boardState = createBoardState([0, 4, 20]); // Missing bottom-right corner
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(false);
      expect(result.patterns).toHaveLength(0);
    });
  });

  describe('Full House Detection', () => {
    test('should detect full house win', () => {
      const allPositions = Array.from({ length: 25 }, (_, i) => i);
      const boardState = createBoardState(allPositions);
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(true);
      expect(result.patterns).toHaveLength(12); // 5 rows + 5 columns + 2 diagonals + 1 four corners + 1 full house = 14, but full house supersedes others
      
      const fullHousePattern = result.patterns.find(p => p.type === 'full-house');
      expect(fullHousePattern).toMatchObject({
        type: 'full-house',
        name: 'Full House',
        positions: allPositions,
        points: 500,
      });
    });

    test('should not detect almost full house', () => {
      const almostAll = Array.from({ length: 24 }, (_, i) => i);
      const boardState = createBoardState(almostAll);
      const result = winDetector.detectWin(boardState);

      // Should detect other patterns but not full house
      expect(result.hasWin).toBe(true);
      const fullHousePattern = result.patterns.find(p => p.type === 'full-house');
      expect(fullHousePattern).toBeUndefined();
    });
  });

  describe('Special Pattern Detection', () => {
    test('should detect Letter T pattern', () => {
      const tPattern = [
        0, 1, 2, 3, 4, // Top row
        7, 12, 17, 22  // Middle column (excluding cell 2 to avoid duplicate)
      ];
      const boardState = createBoardState(tPattern);
      const result = winDetector.checkLetterT(boardState.map((_, i) => i).filter(i => boardState[i]?.isMarked));

      expect(result).toMatchObject({
        type: 'letter-t',
        name: 'Letter T',
        positions: expect.arrayContaining([0, 1, 2, 3, 4, 7, 12, 17, 22]),
        points: 300,
      });
    });

    test('should detect Letter X pattern', () => {
      const xPattern = [
        0, 6, 12, 18, 24, // Main diagonal
        4, 8, 16, 20       // Anti-diagonal (12 is shared)
      ];
      const boardState = createBoardState(xPattern);
      const result = winDetector.checkLetterX(boardState.map((_, i) => i).filter(i => boardState[i]?.isMarked));

      expect(result).toMatchObject({
        type: 'letter-x',
        name: 'Letter X',
        positions: expect.arrayContaining([0, 4, 6, 8, 12, 16, 18, 20, 24]),
        points: 350,
      });
    });
  });

  describe('Multiple Pattern Detection', () => {
    test('should detect multiple patterns simultaneously', () => {
      // Mark cells for both a row and a column
      const boardState = createBoardState([
        0, 1, 2, 3, 4,  // Row 1
        0, 5, 10, 15, 20 // Column 1 (0 is shared)
      ]);
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(true);
      expect(result.patterns).toHaveLength(2);
      expect(result.patterns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Row 1', points: 100 }),
          expect.objectContaining({ name: 'Column 1', points: 100 }),
        ])
      );
      expect(result.totalPoints).toBe(200);
      expect(result.winningCells.sort()).toEqual([0, 1, 2, 3, 4, 5, 10, 15, 20]);
    });

    test('should detect crossed diagonals (X pattern)', () => {
      const boardState = createBoardState([
        0, 6, 12, 18, 24, // Main diagonal
        4, 8, 16, 20       // Anti-diagonal
      ]);
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(true);
      expect(result.patterns).toHaveLength(2);
      expect(result.totalPoints).toBe(300); // 150 + 150
    });
  });

  describe('Different Board Sizes', () => {
    test('should work with 3x3 board', () => {
      const winDetector3x3 = new WinDetectionService(3);
      const boardState = createBoardState([0, 1, 2], 9); // First row
      const result = winDetector3x3.detectWin(boardState);

      expect(result.hasWin).toBe(true);
      expect(result.patterns[0]).toMatchObject({
        type: 'single-line',
        name: 'Row 1',
        positions: [0, 1, 2],
        points: 100,
      });
    });

    test('should work with 4x4 board', () => {
      const winDetector4x4 = new WinDetectionService(4);
      const boardState = createBoardState([0, 5, 10, 15], 16); // First column
      const result = winDetector4x4.detectWin(boardState);

      expect(result.hasWin).toBe(true);
      expect(result.patterns[0]).toMatchObject({
        type: 'single-line',
        name: 'Column 1',
        positions: [0, 4, 8, 12],
        points: 100,
      });
    });

    test('should work with 6x6 board', () => {
      const winDetector6x6 = new WinDetectionService(6);
      const boardState = createBoardState([0, 7, 14, 21, 28, 35], 36); // Main diagonal
      const result = winDetector6x6.detectWin(boardState);

      expect(result.hasWin).toBe(true);
      expect(result.patterns[0]).toMatchObject({
        type: 'single-line',
        name: 'Diagonal (↘)',
        positions: [0, 7, 14, 21, 28, 35],
        points: 150,
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty board', () => {
      const boardState = createBoardState([]);
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(false);
      expect(result.patterns).toHaveLength(0);
      expect(result.winningCells).toHaveLength(0);
      expect(result.totalPoints).toBe(0);
    });

    test('should handle board with no marked cells', () => {
      const boardState = createBoardState([]);
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(false);
      expect(result.patterns).toHaveLength(0);
    });

    test('should handle board with only one marked cell', () => {
      const boardState = createBoardState([12]); // Center cell only
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(false);
      expect(result.patterns).toHaveLength(0);
    });

    test('should deduplicate winning cells in overlapping patterns', () => {
      // Create a plus pattern (overlapping at center)
      const boardState = createBoardState([
        10, 11, 12, 13, 14, // Middle row
        2, 7, 17, 22        // Middle column (12 is shared)
      ]);
      const result = winDetector.detectWin(boardState);

      expect(result.hasWin).toBe(true);
      expect(result.patterns).toHaveLength(2);
      expect(result.winningCells.sort()).toEqual([2, 7, 10, 11, 12, 13, 14, 17, 22]);
      expect(result.winningCells).toHaveLength(9); // Not 10, because 12 is deduplicated
    });
  });

  describe('Performance', () => {
    test('should detect wins quickly for large boards', () => {
      const largeDetector = new WinDetectionService(10);
      const markedPositions = Array.from({ length: 10 }, (_, i) => i); // First row
      const boardState = createBoardState(markedPositions, 100);

      const startTime = performance.now();
      const result = largeDetector.detectWin(boardState);
      const endTime = performance.now();

      expect(result.hasWin).toBe(true);
      expect(endTime - startTime).toBeLessThan(10); // Should complete in under 10ms
    });

    test('should handle complex pattern detection efficiently', () => {
      // Mark many cells to trigger multiple pattern checks
      const complexPattern = [
        0, 1, 2, 3, 4,     // Row 1
        0, 5, 10, 15, 20,  // Column 1
        0, 6, 12, 18, 24,  // Main diagonal
        4, 8, 12, 16, 20   // Anti-diagonal
      ];
      const boardState = createBoardState([...new Set(complexPattern)]);

      const startTime = performance.now();
      const result = winDetector.detectWin(boardState);
      const endTime = performance.now();

      expect(result.hasWin).toBe(true);
      expect(result.patterns.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(10); // Should complete in under 10ms
    });
  });
});