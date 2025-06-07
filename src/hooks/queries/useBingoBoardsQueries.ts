/**
 * Bingo Boards React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bingoBoardsService,
  type BoardFilters,
  type BoardSection,
  type BoardsQueryParams,
  type CreateBoardData,
  type UpdateBoardData,
} from '../../services/bingo-boards.service';
import type { BingoBoard } from '@/types';
import type { CompositeTypes } from '@/types/database-generated';
import type { ServiceResponse } from '@/lib/service-types';
import { notifications } from '@/lib/notifications';
import { queryKeys } from './index';

export function useBoardQuery(boardId?: string) {
  return useQuery({
    queryKey: queryKeys.bingoBoards.byId(boardId || ''),
    queryFn: () => bingoBoardsService.getBoardById(boardId || ''),
    enabled: !!boardId,
    staleTime: 2 * 60 * 1000,
    select: data => (data.success ? data.data : null),
  });
}

export function useBoardWithCreatorQuery(boardId?: string) {
  return useQuery({
    queryKey: ['bingoBoards', 'withCreator', boardId],
    queryFn: () => bingoBoardsService.getBoardWithCreator(boardId || ''),
    enabled: !!boardId,
    staleTime: 2 * 60 * 1000,
    select: data => (data.success ? data.data : null),
  });
}

/**
 * Main hook for getting boards by section with filters and pagination
 */
export function useBoardsBySectionQuery(
  section: BoardSection,
  filters: BoardFilters = {},
  page = 1,
  limit = 20,
  userId?: string
) {
  const params: BoardsQueryParams = { section, filters, page, limit, userId };

  return useQuery({
    queryKey: ['bingoBoards', 'section', section, filters, page, limit, userId],
    queryFn: () => bingoBoardsService.getBoardsBySection(params),
    staleTime: 1 * 60 * 1000,
    placeholderData: previousData => previousData, // For smooth pagination
    select: data => {
      if (!data.success) {
        return { boards: [], totalCount: 0, hasMore: false };
      }
      return data.data || { boards: [], totalCount: 0, hasMore: false };
    },
  });
}

export function usePublicBoardsQuery(
  filters: BoardFilters = {},
  page = 1,
  limit = 20
) {
  return useQuery({
    queryKey: queryKeys.bingoBoards.public(filters, page),
    queryFn: () => bingoBoardsService.getPublicBoards(filters, page, limit),
    staleTime: 1 * 60 * 1000,
    select: data => {
      if (!data.success) {
        return { boards: [], totalCount: 0, hasMore: false };
      }
      return data.data || { boards: [], totalCount: 0, hasMore: false };
    },
  });
}

export function useCreateBoardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBoardData) => bingoBoardsService.createBoard(data),
    onSuccess: response => {
      if (!response.success) {
        notifications.error(response.error || 'Failed to create board');
        return;
      }
      notifications.success('Board created successfully!');
      queryClient.invalidateQueries({ queryKey: ['bingoBoards'] });
    },
  });
}

export function useUpdateBoardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      boardId,
      updates,
      currentVersion,
    }: {
      boardId: string;
      updates: UpdateBoardData;
      currentVersion?: number;
    }) => bingoBoardsService.updateBoard(boardId, updates, currentVersion),
    onSuccess: (response, variables) => {
      if (!response.success) {
        notifications.error(response.error || 'Failed to update board');
        return;
      }
      notifications.success('Board updated successfully!');

      // Invalidate specific board and list queries
      queryClient.invalidateQueries({
        queryKey: ['bingoBoards', 'byId', variables.boardId],
      });
      queryClient.invalidateQueries({ queryKey: ['bingoBoards'] });
    },
  });
}

export function useDeleteBoardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (boardId: string) => bingoBoardsService.deleteBoard(boardId),
    onSuccess: (response, boardId) => {
      if (!response.success) {
        notifications.error(response.error || 'Failed to delete board');
        return;
      }
      notifications.success('Board deleted successfully!');

      // Remove from cache and invalidate list queries
      queryClient.removeQueries({ queryKey: ['bingoBoards', 'byId', boardId] });
      queryClient.invalidateQueries({ queryKey: ['bingoBoards'] });
    },
  });
}

export function useCloneBoardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      boardId,
      userId,
      newTitle,
    }: {
      boardId: string;
      userId: string;
      newTitle?: string;
    }) => bingoBoardsService.cloneBoard(boardId, userId, newTitle),
    onSuccess: response => {
      if (!response.success) {
        notifications.error(response.error || 'Failed to clone board');
        return;
      }
      notifications.success('Board cloned successfully!');
      queryClient.invalidateQueries({ queryKey: ['bingoBoards'] });
    },
  });
}

export function useVoteBoardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (boardId: string) => bingoBoardsService.voteBoard(boardId),
    onSuccess: (response, boardId) => {
      if (!response.success) {
        notifications.error(response.error || 'Failed to vote on board');
        return;
      }

      // Update the specific board in cache
      queryClient.invalidateQueries({
        queryKey: ['bingoBoards', 'byId', boardId],
      });
      queryClient.invalidateQueries({ queryKey: ['bingoBoards'] });
    },
  });
}

export function useUpdateBoardStateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      boardId,
      boardState,
      currentVersion,
    }: {
      boardId: string;
      boardState: CompositeTypes<'board_cell'>[];
      currentVersion?: number;
    }) =>
      bingoBoardsService.updateBoardState(boardId, boardState, currentVersion),
    onMutate: async ({ boardId, boardState }) => {
      // Cancel outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({
        queryKey: ['bingoBoards', 'byId', boardId],
      });

      // Snapshot the previous value
      const previousBoard = queryClient.getQueryData([
        'bingoBoards',
        'byId',
        boardId,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        ['bingoBoards', 'byId', boardId],
        (old: unknown) =>
          old
            ? { ...(old as Record<string, unknown>), board_state: boardState }
            : old
      );

      // Return a context object with the snapshotted value
      return { previousBoard };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(
        ['bingoBoards', 'byId', variables.boardId],
        context?.previousBoard
      );
      notifications.error(
        'Failed to update board. Changes have been reverted.'
      );
    },
    onSuccess: (response, variables) => {
      if (response.error) {
        notifications.error(response.error);
        // Invalidate to get fresh data from server
        queryClient.invalidateQueries({
          queryKey: ['bingoBoards', 'byId', variables.boardId],
        });
        return;
      }

      // Update the board data with server response
      queryClient.setQueryData(
        ['bingoBoards', 'byId', variables.boardId],
        response.data
      );
    },
  });
}

export function useUpdateBoardSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      boardId,
      settings,
      currentVersion,
    }: {
      boardId: string;
      settings: Partial<
        Pick<
          UpdateBoardData,
          'title' | 'description' | 'difficulty' | 'is_public'
        >
      >;
      currentVersion?: number;
    }) => bingoBoardsService.updateBoard(boardId, settings, currentVersion),
    onSuccess: (response: ServiceResponse<BingoBoard>, variables) => {
      if (!response.success || response.error) {
        notifications.error(
          response.error || 'Failed to update board settings'
        );
        return;
      }
      notifications.success('Board settings updated successfully!');

      // Invalidate specific board and list queries
      queryClient.invalidateQueries({
        queryKey: ['bingoBoards', 'byId', variables.boardId],
      });
      queryClient.invalidateQueries({ queryKey: ['bingoBoards'] });
    },
  });
}
