// Re-export Zustand bingo cards hooks for backward compatibility
export { useBingoCards, useBingoCardsActions } from '@/lib/stores';

// Export bingo card types
export type {
  BingoCard,
  GameCategory,
  DifficultyLevel,
} from '@/lib/stores/types';
