import { useState, useCallback } from 'react';
import type { GameCategory, Difficulty as _Difficulty } from '@/types';
import type { Enums } from '@/types/database-generated';

// Type alias for clean usage
type DifficultyLevel = Enums<'difficulty_level'>;

// Create constants from enum types
const Constants = {
  public: {
    Enums: {
      difficulty_level: ['beginner', 'easy', 'medium', 'hard', 'expert'] as const,
    }
  }
} as const;
import {
  type GENERATOR_CONFIG,
  CARD_CATEGORIES,
  type CardCategory,
} from '../types/generator.types';
import { log } from '@/lib/logger';

type GeneratorDifficulty = DifficultyLevel;

interface GeneratorSettings {
  difficulty: GeneratorDifficulty;
  cardPoolSize: 'Small' | 'Medium' | 'Large';
  minVotes: number;
  selectedCategories: CardCategory[];
  gameCategory: GameCategory;
  cardSource: 'public' | 'private' | 'publicprivate';
}

interface UseGeneratorPanel {
  isLoading: boolean;
  error: string | null;
  selectedCategories: CardCategory[];
  difficulty: GeneratorDifficulty;
  minVotes: number;
  poolSize: keyof typeof GENERATOR_CONFIG.CARDPOOLSIZE_LIMITS;
  handleCategoriesChange: (selectedCategories: CardCategory[]) => void;
  handleDifficultyChange: (difficulty: GeneratorDifficulty) => void;
  handleMinVotesChange: (votes: number) => void;
  handlePoolSizeChange: (
    size: keyof typeof GENERATOR_CONFIG.CARDPOOLSIZE_LIMITS
  ) => void;
  generateBoard: () => Promise<void>;
  reshuffleBoard: (gridSize: number) => Promise<void>;
}

export function useGeneratorPanel(
  gameCategory: GameCategory,
  gridSize: number,
  usePublicCards: boolean,
  usePrivateCards: boolean
): UseGeneratorPanel {
  // Local state for generator settings
  const [selectedCategories, setSelectedCategories] = useState<CardCategory[]>([
    ...CARD_CATEGORIES,
  ]);
  const [difficulty, setDifficulty] = useState<GeneratorDifficulty>(
    Constants.public.Enums.difficulty_level[2]
  ); // Default to medium
  const [minVotes, setMinVotes] = useState(0);
  const [poolSize, setPoolSize] =
    useState<keyof typeof GENERATOR_CONFIG.CARDPOOLSIZE_LIMITS>('Medium');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handlers for settings changes
  const handleCategoriesChange = useCallback((categories: CardCategory[]) => {
    setSelectedCategories(categories);
    log.info('Selected Categories:', {
      metadata: { hook: 'useGeneratorPanel', categories: categories },
    });
  }, []);

  const handleDifficultyChange = useCallback((diff: GeneratorDifficulty) => {
    setDifficulty(diff);
  }, []);

  const handleMinVotesChange = useCallback((votes: number) => {
    setMinVotes(votes);
  }, []);

  const handlePoolSizeChange = useCallback(
    (size: keyof typeof GENERATOR_CONFIG.CARDPOOLSIZE_LIMITS) => {
      setPoolSize(size);
    },
    []
  );

  // Generate new board
  const generateBoard = async () => {
    try {
      setIsLoading(true);
      const settings: GeneratorSettings = {
        difficulty,
        cardPoolSize: poolSize,
        minVotes,
        selectedCategories,
        gameCategory,
        cardSource:
          usePublicCards && usePrivateCards
            ? 'publicprivate'
            : usePublicCards
              ? 'public'
              : 'private',
      };

      log.info('Generating board with settings:', {
        metadata: { hook: 'useGeneratorPanel', settings, gridSize },
      });
      // TODO: Implement bingo generator service
      throw new Error('Bingo generator service not yet implemented');
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to generate board'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Reshuffle existing board
  const reshuffleBoard = useCallback(async (gridSize: number) => {
    log.info('Reshuffling board with gridSize:', {
      metadata: { hook: 'useGeneratorPanel', gridSize },
    });
    // TODO: Implement bingo generator service
    throw new Error('Bingo generator service not yet implemented');
  }, []);

  return {
    isLoading,
    error,
    selectedCategories,
    difficulty,
    minVotes,
    poolSize,
    handleCategoriesChange,
    handleDifficultyChange,
    handleMinVotesChange,
    handlePoolSizeChange,
    generateBoard,
    reshuffleBoard,
  };
}
