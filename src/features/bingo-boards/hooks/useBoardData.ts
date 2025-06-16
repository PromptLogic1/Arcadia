/**
 * Focused hook for board data only
 * Part of the refactored useBingoBoardEdit split
 */

import { useMemo } from 'react';
import { useBoardEditDataQuery } from '@/hooks/queries/useBingoBoardEditQueries';
import type { BingoBoardDomain } from '@/types/domains/bingo';
import type { BingoCard } from '@/types';
import type { ServiceResponse } from '@/lib/service-types';

// Type for the board edit response
type BoardEditResponse = ServiceResponse<{
  board: BingoBoardDomain;
  cards: BingoCard[];
}>;

// Memoized selector to prevent object recreation
const selectBoardOnly = (response: BoardEditResponse) =>
  response?.success ? response.data?.board : null;

export function useBoardData(boardId: string) {
  const {
    data: boardData,
    isLoading,
    error: queryError,
  } = useBoardEditDataQuery(boardId, {
    select: selectBoardOnly, // Optimized selector
  });

  // Memoized error handling
  const error = useMemo(() => {
    if (queryError) return 'Failed to load board data';
    if (boardData === null && !isLoading) return 'Board not found';
    return null;
  }, [queryError, boardData, isLoading]);

  return {
    board: boardData,
    isLoading,
    error,
  };
}

// Separate hook for board cards data
const selectCardsOnly = (response: BoardEditResponse) =>
  response?.success ? response.data?.cards : [];

export function useBoardCards(boardId: string) {
  const { data: cards = [] } = useBoardEditDataQuery(boardId, {
    select: selectCardsOnly,
  });

  return { cards };
}
