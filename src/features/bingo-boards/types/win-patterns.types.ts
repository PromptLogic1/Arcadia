export type WinPatternType = 
  | 'single-line'      // Any row, column, or diagonal
  | 'double-line'      // Two lines
  | 'four-corners'     // Four corner cells
  | 'full-house'       // All cells
  | 'letter-t'         // T shape
  | 'letter-x'         // X shape
  | 'custom';          // Custom patterns

export interface WinPattern {
  type: WinPatternType;
  name: string;
  positions: number[];  // Cell positions that form the pattern
  points: number;       // Points awarded for this pattern
}

export interface WinDetectionResult {
  hasWin: boolean;
  patterns: WinPattern[];
  winningCells: number[];
  totalPoints: number;
}

export interface GameCompletion {
  winnerId: string;
  winnerName: string;
  patterns: WinPattern[];
  finalScore: number;
  timeElapsed: number;
  placement: number;
}