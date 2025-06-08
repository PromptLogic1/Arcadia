/**
 * Generator Panel Hook - Modern Implementation
 *
 * Uses the established Zustand + TanStack Query pattern:
 * - Zustand store for UI state (settings, selected categories, etc.)
 * - TanStack Query for server operations (generate, reshuffle)
 * - Service layer for pure API functions
 */

import { useCallback } from 'react';
import type { GameCategory } from '@/types';
import {
  useBingoGeneratorSettings,
  useBingoGeneratorActions,
  useBingoGenerator,
} from '@/lib/stores/bingo-generator-store';
import {
  useGenerateBoardMutation,
  useReshuffleCardsMutation,
} from '@/hooks/queries/useBingoGeneratorQueries';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';
import { useAuth } from '@/lib/stores/auth-store';
import type { CardCategory } from '../types/generator.types';
import type { Enums } from '@/types/database.types';

type DifficultyLevel = Enums<'difficulty_level'>;
type GeneratorDifficulty = DifficultyLevel;

interface UseGeneratorPanel {
  // State from Zustand
  isLoading: boolean;
  error: string | null;
  selectedCategories: CardCategory[];
  difficulty: GeneratorDifficulty;
  minVotes: number;
  poolSize: 'Small' | 'Medium' | 'Large';

  // Actions
  handleCategoriesChange: (selectedCategories: CardCategory[]) => void;
  handleDifficultyChange: (difficulty: GeneratorDifficulty) => void;
  handleMinVotesChange: (votes: number) => void;
  handlePoolSizeChange: (size: 'Small' | 'Medium' | 'Large') => void;
  generateBoard: () => Promise<void>;
  reshuffleBoard: (gridSize: number) => Promise<void>;
}

export function useGeneratorPanel(
  gameCategory: GameCategory,
  gridSize: number,
  usePublicCards: boolean,
  usePrivateCards: boolean
): UseGeneratorPanel {
  // Zustand store
  const settings = useBingoGeneratorSettings();
  const { cardsForSelection } = useBingoGenerator();
  const {
    setSelectedCategories,
    setDifficulty,
    setMinVotes,
    setCardPoolSize,
    setGameCategory,
    setCardSource,
    setCardsForSelection,
  } = useBingoGeneratorActions();

  // Auth for user ID
  const { authUser } = useAuth();

  // TanStack Query mutations
  const generateMutation = useGenerateBoardMutation();
  const reshuffleMutation = useReshuffleCardsMutation();

  // Update game category and card source in store when props change
  // These are synchronous updates to UI state, not data fetching
  if (settings.gameCategory !== gameCategory) {
    setGameCategory(gameCategory);
  }

  const cardSource =
    usePublicCards && usePrivateCards
      ? 'publicprivate'
      : usePublicCards
        ? 'public'
        : 'private';

  if (settings.cardSource !== cardSource) {
    setCardSource(cardSource);
  }

  // Handlers - these just update Zustand state
  const handleCategoriesChange = useCallback(
    (categories: CardCategory[]) => {
      setSelectedCategories(categories);
      logger.info('Selected Categories updated', {
        metadata: {
          component: 'useGeneratorPanel',
          categories,
        },
      });
    },
    [setSelectedCategories]
  );

  const handleDifficultyChange = useCallback(
    (diff: GeneratorDifficulty) => {
      setDifficulty(diff);
    },
    [setDifficulty]
  );

  const handleMinVotesChange = useCallback(
    (votes: number) => {
      setMinVotes(votes);
    },
    [setMinVotes]
  );

  const handlePoolSizeChange = useCallback(
    (size: 'Small' | 'Medium' | 'Large') => {
      setCardPoolSize(size);
    },
    [setCardPoolSize]
  );

  // Generate board - uses TanStack Query mutation
  const generateBoard = useCallback(async () => {
    try {
      if (!gameCategory) {
        throw new Error('Game category is required');
      }

      const result = await generateMutation.mutateAsync({
        gameCategory,
        difficulty: settings.difficulty,
        cardPoolSize: settings.cardPoolSize,
        minVotes: settings.minVotes,
        selectedCategories: settings.selectedCategories,
        cardSource: settings.cardSource,
        gridSize,
        userId: authUser?.id,
      });

      // Store the generated cards
      setCardsForSelection(result.cards);

      notifications.success('Board generated successfully!', {
        description: `Generated ${result.cards.length} cards from ${result.totalAvailable} available`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate board';
      notifications.error('Board generation failed', {
        description: message,
      });
    }
  }, [
    gameCategory,
    gridSize,
    settings,
    authUser?.id,
    generateMutation,
    setCardsForSelection,
  ]);

  // Reshuffle board - uses TanStack Query mutation
  const reshuffleBoard = useCallback(
    async (gridSize: number) => {
      try {
        if (cardsForSelection.length === 0) {
          throw new Error('No cards available to reshuffle');
        }

        const result = await reshuffleMutation.mutateAsync({
          cards: cardsForSelection,
          gridSize,
        });

        // Update the cards with reshuffled order
        setCardsForSelection(result);

        notifications.success('Cards reshuffled!');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to reshuffle cards';
        notifications.error('Reshuffle failed', {
          description: message,
        });
      }
    },
    [cardsForSelection, reshuffleMutation, setCardsForSelection]
  );

  // Compute loading and error states from mutations
  const isLoading = generateMutation.isPending || reshuffleMutation.isPending;
  const error = generateMutation.error || reshuffleMutation.error;

  return {
    // State
    isLoading,
    error:
      error instanceof Error ? error.message : error ? String(error) : null,
    selectedCategories: settings.selectedCategories,
    difficulty: settings.difficulty,
    minVotes: settings.minVotes,
    poolSize: settings.cardPoolSize,

    // Actions
    handleCategoriesChange,
    handleDifficultyChange,
    handleMinVotesChange,
    handlePoolSizeChange,
    generateBoard,
    reshuffleBoard,
  };
}
