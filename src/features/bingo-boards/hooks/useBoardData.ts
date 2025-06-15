/**
 * Focused hook for board data only
 * Part of the refactored useBingoBoardEdit split
 */

import { useMemo } from 'react';
import { useBoardEditDataQuery } from '@/hooks/queries/useBingoBoardEditQueries';
import type { BingoBoardDomain } from '@/types/domains/bingo';

// Memoized selector to prevent object recreation
const selectBoardOnly = (response: any) =>
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
    board: boardData as BingoBoardDomain | null,
    isLoading,
    error,
  };
}

// Separate hook for board cards data
const selectCardsOnly = (response: any) =>
  response?.success ? response.data?.cards : [];

export function useBoardCards(boardId: string) {
  const { data: cards = [] } = useBoardEditDataQuery(boardId, {
    select: selectCardsOnly,
  });

  return { cards };
}
