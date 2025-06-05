/**
 * Generator Panel Hook - Modern Implementation
 *
 * Uses the established Zustand + TanStack Query pattern:
 * - Zustand store for UI state (settings, selected categories, etc.)
 * - TanStack Query for server operations (generate, reshuffle)
 * - Service layer for pure API functions
 */

import { useCallback, useEffect, useRef } from 'react';
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
import type { Enums } from '@/types/database-generated';

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
  const { isLoading, error, cardsForSelection } = useBingoGenerator();
  const {
    setSelectedCategories,
    setDifficulty,
    setMinVotes,
    setCardPoolSize,
    setGameCategory,
    setCardSource,
    setCardsForSelection,
    setError,
    setIsLoading,
  } = useBingoGeneratorActions();

  // Auth for user ID
  const { authUser } = useAuth();

  // TanStack Query mutations
  const generateMutation = useGenerateBoardMutation();
  const reshuffleMutation = useReshuffleCardsMutation();

  // Abort controller for cancelling async operations
  const abortControllerRef = useRef<AbortController | null>(null);

  // Mount tracking
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cancel any pending operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Update game category when it changes
  useEffect(() => {
    setGameCategory(gameCategory);
  }, [gameCategory, setGameCategory]);

  // Update card source based on props
  useEffect(() => {
    const cardSource =
      usePublicCards && usePrivateCards
        ? 'publicprivate'
        : usePublicCards
          ? 'public'
          : 'private';
    setCardSource(cardSource);
  }, [usePublicCards, usePrivateCards, setCardSource]);

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

  // Generate board - uses TanStack Query mutation with cancellation
  const generateBoard = useCallback(async () => {
    // Cancel any previous operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    
    try {
      abortControllerRef.current = abortController;

      setError(null);

      if (!gameCategory) {
        throw new Error('Game category is required');
      }

      // Check if cancelled before proceeding
      if (abortController.signal.aborted) {
        return;
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

      // Check if cancelled or unmounted after async operation
      if (abortController.signal.aborted || !isMountedRef.current) {
        return;
      }

      // Store the generated cards
      setCardsForSelection(result.cards);

      notifications.success('Board generated successfully!', {
        description: `Generated ${result.cards.length} cards from ${result.totalAvailable} available`,
      });
    } catch (error) {
      // Don't show error if operation was cancelled
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Failed to generate board';
      if (isMountedRef.current) {
        setError(message);
        notifications.error('Board generation failed', {
          description: message,
        });
      }
    } finally {
      // Clear the abort controller if it's the current one
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [
    gameCategory,
    gridSize,
    settings,
    authUser?.id,
    generateMutation,
    setCardsForSelection,
    setError,
  ]);

  // Reshuffle board - uses TanStack Query mutation with cancellation
  const reshuffleBoard = useCallback(
    async (gridSize: number) => {
      // Cancel any previous operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      const abortController = new AbortController();
      
      try {
        abortControllerRef.current = abortController;

        setError(null);

        if (cardsForSelection.length === 0) {
          throw new Error('No cards available to reshuffle');
        }

        // Check if cancelled before proceeding
        if (abortController.signal.aborted) {
          return;
        }

        const result = await reshuffleMutation.mutateAsync({
          cards: cardsForSelection,
          gridSize,
        });

        // Check if cancelled or unmounted after async operation
        if (abortController.signal.aborted || !isMountedRef.current) {
          return;
        }

        // Update the cards with reshuffled order
        setCardsForSelection(result);

        notifications.success('Cards reshuffled!');
      } catch (error) {
        // Don't show error if operation was cancelled
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Failed to reshuffle cards';
        if (isMountedRef.current) {
          setError(message);
          notifications.error('Reshuffle failed', {
            description: message,
          });
        }
      } finally {
        // Clear the abort controller if it's the current one
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [cardsForSelection, reshuffleMutation, setCardsForSelection, setError]
  );

  // Update loading state based on mutations
  useEffect(() => {
    const loading = generateMutation.isPending || reshuffleMutation.isPending;
    setIsLoading(loading);
  }, [generateMutation.isPending, reshuffleMutation.isPending, setIsLoading]);

  return {
    // State
    isLoading:
      isLoading || generateMutation.isPending || reshuffleMutation.isPending,
    error,
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
