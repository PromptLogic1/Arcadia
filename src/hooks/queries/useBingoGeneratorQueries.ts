/**
 * Bingo Generator Query Hooks
 *
 * TanStack Query hooks for board generation operations.
 * These hooks manage server state for the generator feature.
 */

import { useMutation } from '@tanstack/react-query';
import {
  bingoGeneratorService,
  type GenerateBoardParams,
} from '@/src/services/bingo-generator.service';
import type { BingoCard } from '@/types';
import { logger } from '@/lib/logger';
import { toError } from '@/lib/error-guards';

/**
 * Hook for generating a new bingo board
 */
export function useGenerateBoardMutation() {
  return useMutation({
    mutationKey: ['generate-board'],
    mutationFn: async (params: GenerateBoardParams) => {
      // Validate parameters first
      const validationError =
        bingoGeneratorService.validateGenerationParams(params);
      if (validationError) {
        throw new Error(validationError);
      }

      const result = await bingoGeneratorService.generateBoard(params);

      if (!result.success || !result.data) {
        throw new Error(
          result.error || 'No data returned from board generation'
        );
      }

      return result.data;
    },
    onError: error => {
      logger.error('Board generation failed', toError(error), {
        component: 'useGenerateBoardMutation',
      });
    },
    onSuccess: data => {
      logger.info('Board generated successfully', {
        metadata: {
          component: 'useGenerateBoardMutation',
          cardsGenerated: data.cards.length,
          totalAvailable: data.totalAvailable,
        },
      });
    },
  });
}

/**
 * Hook for reshuffling cards
 */
export function useReshuffleCardsMutation() {
  return useMutation({
    mutationKey: ['reshuffle-cards'],
    mutationFn: async ({
      cards,
      gridSize,
    }: {
      cards: BingoCard[];
      gridSize: number;
    }) => {
      const result = await bingoGeneratorService.reshuffleCards(
        cards,
        gridSize
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'No data returned from reshuffle');
      }

      return result.data;
    },
    onError: error => {
      logger.error('Card reshuffle failed', toError(error), {
        component: 'useReshuffleCardsMutation',
      });
    },
    onSuccess: data => {
      logger.info('Cards reshuffled successfully', {
        metadata: {
          component: 'useReshuffleCardsMutation',
          cardCount: data.length,
        },
      });
    },
  });
}
