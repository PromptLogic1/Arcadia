// Re-export Zustand bingo boards hooks for backward compatibility
export { useBingoBoards, useBingoBoardsActions } from '@/lib/stores';

// Export bingo board types
export type {
  BingoBoard,
  GameCategory,
  DifficultyLevel,
  BoardCell,
} from '@/lib/stores/types';
