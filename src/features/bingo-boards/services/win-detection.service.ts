import type { BoardCell } from '../types';
import type {
  WinPattern,
  WinDetectionResult,
} from '../types/win-patterns.types';

export class WinDetectionService {
  private boardSize: number;

  constructor(size = 5) {
    this.boardSize = size;
  }

  detectWin(boardState: BoardCell[]): WinDetectionResult {
    const markedPositions = boardState
      .map((cell, index) => (cell.isMarked ? index : -1))
      .filter(pos => pos !== -1);

    const detectedPatterns: WinPattern[] = [];

    // Check all possible patterns
    const rowPatterns = this.getRowPatterns(markedPositions);
    const columnPatterns = this.getColumnPatterns(markedPositions);
    const diagonalPatterns = this.getDiagonalPatterns(markedPositions);
    const fourCornersPattern = this.checkFourCorners(markedPositions);
    const fullHousePattern = this.checkFullHouse(
      markedPositions,
      boardState.length
    );

    detectedPatterns.push(
      ...rowPatterns,
      ...columnPatterns,
      ...diagonalPatterns
    );

    if (fourCornersPattern) {
      detectedPatterns.push(fourCornersPattern);
    }

    if (fullHousePattern) {
      detectedPatterns.push(fullHousePattern);
    }

    // Calculate unique winning cells
    const winningCells = [
      ...new Set(detectedPatterns.flatMap(p => p.positions)),
    ];

    return {
      hasWin: detectedPatterns.length > 0,
      patterns: detectedPatterns,
      winningCells,
      totalPoints: detectedPatterns.reduce((sum, p) => sum + p.points, 0),
    };
  }

  private getRowPatterns(marked: number[]): WinPattern[] {
    const patterns: WinPattern[] = [];

    for (let row = 0; row < this.boardSize; row++) {
      const rowStart = row * this.boardSize;
      const rowPositions = Array.from(
        { length: this.boardSize },
        (_, i) => rowStart + i
      );

      if (rowPositions.every(pos => marked.includes(pos))) {
        patterns.push({
          type: 'single-line',
          name: `Row ${row + 1}`,
          positions: rowPositions,
          points: 100,
        });
      }
    }

    return patterns;
  }

  private getColumnPatterns(marked: number[]): WinPattern[] {
    const patterns: WinPattern[] = [];

    for (let col = 0; col < this.boardSize; col++) {
      const colPositions = Array.from(
        { length: this.boardSize },
        (_, i) => col + i * this.boardSize
      );

      if (colPositions.every(pos => marked.includes(pos))) {
        patterns.push({
          type: 'single-line',
          name: `Column ${col + 1}`,
          positions: colPositions,
          points: 100,
        });
      }
    }

    return patterns;
  }

  private getDiagonalPatterns(marked: number[]): WinPattern[] {
    const patterns: WinPattern[] = [];

    // Top-left to bottom-right
    const diagonal1 = Array.from(
      { length: this.boardSize },
      (_, i) => i * (this.boardSize + 1)
    );

    if (diagonal1.every(pos => marked.includes(pos))) {
      patterns.push({
        type: 'single-line',
        name: 'Diagonal (↘)',
        positions: diagonal1,
        points: 150,
      });
    }

    // Top-right to bottom-left
    const diagonal2 = Array.from(
      { length: this.boardSize },
      (_, i) => (i + 1) * (this.boardSize - 1)
    );

    if (diagonal2.every(pos => marked.includes(pos))) {
      patterns.push({
        type: 'single-line',
        name: 'Diagonal (↙)',
        positions: diagonal2,
        points: 150,
      });
    }

    return patterns;
  }

  private checkFourCorners(marked: number[]): WinPattern | null {
    const corners = [
      0, // Top-left
      this.boardSize - 1, // Top-right
      this.boardSize * (this.boardSize - 1), // Bottom-left
      this.boardSize * this.boardSize - 1, // Bottom-right
    ];

    if (corners.every(pos => marked.includes(pos))) {
      return {
        type: 'four-corners',
        name: 'Four Corners',
        positions: corners,
        points: 200,
      };
    }

    return null;
  }

  private checkFullHouse(
    marked: number[],
    totalCells: number
  ): WinPattern | null {
    if (marked.length === totalCells) {
      return {
        type: 'full-house',
        name: 'Full House',
        positions: Array.from({ length: totalCells }, (_, i) => i),
        points: 500,
      };
    }

    return null;
  }

  // Additional pattern checks for special shapes
  checkLetterT(marked: number[]): WinPattern | null {
    // T-shape pattern (top row + middle column)
    const tPattern = [
      // Top row
      ...Array.from({ length: this.boardSize }, (_, i) => i),
      // Middle column (excluding top cell to avoid duplicate)
      ...Array.from(
        { length: this.boardSize - 1 },
        (_, i) => Math.floor(this.boardSize / 2) + (i + 1) * this.boardSize
      ),
    ];

    if (tPattern.every(pos => marked.includes(pos))) {
      return {
        type: 'letter-t',
        name: 'Letter T',
        positions: tPattern,
        points: 300,
      };
    }

    return null;
  }

  checkLetterX(marked: number[]): WinPattern | null {
    // X-shape pattern (both diagonals)
    const diagonal1 = Array.from(
      { length: this.boardSize },
      (_, i) => i * (this.boardSize + 1)
    );

    const diagonal2 = Array.from(
      { length: this.boardSize },
      (_, i) => (i + 1) * (this.boardSize - 1)
    );

    const xPattern = [...new Set([...diagonal1, ...diagonal2])];

    if (xPattern.every(pos => marked.includes(pos))) {
      return {
        type: 'letter-x',
        name: 'Letter X',
        positions: xPattern,
        points: 350,
      };
    }

    return null;
  }
}
