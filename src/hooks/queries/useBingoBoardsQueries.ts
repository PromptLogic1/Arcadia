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
  type UpdateBoardData 
} from '../../services/bingo-boards.service';
import { notifications } from '@/lib/notifications';
import { queryKeys } from './index';

export function useBoardQuery(boardId?: string) {
  return useQuery({
    queryKey: queryKeys.bingoBoards.byId(boardId || ''),
    queryFn: () => bingoBoardsService.getBoardById(boardId || ''),
    enabled: !!boardId,
    staleTime: 2 * 60 * 1000,
    select: (data) => data.board,
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
    placeholderData: (previousData) => previousData, // For smooth pagination
    select: (data) => {
      if (data?.error) {
        console.error('Query error:', data.error);
        return { boards: [], totalCount: 0, hasMore: false };
      }
      return data?.response || { boards: [], totalCount: 0, hasMore: false };
    },
  });
}

export function usePublicBoardsQuery(filters: BoardFilters = {}, page = 1, limit = 20) {
  return useQuery({
    queryKey: queryKeys.bingoBoards.public(filters, page),
    queryFn: () => bingoBoardsService.getPublicBoards(filters, page, limit),
    staleTime: 1 * 60 * 1000,
    select: (data) => {
      if (data?.error) {
        console.error('Query error:', data.error);
        return { boards: [], totalCount: 0, hasMore: false };
      }
      return data?.response || { boards: [], totalCount: 0, hasMore: false };
    },
  });
}

export function useCreateBoardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBoardData) => bingoBoardsService.createBoard(data),
    onSuccess: (response) => {
      if (response.error) {
        notifications.error(response.error);
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
    mutationFn: ({ boardId, updates, currentVersion }: { 
      boardId: string; 
      updates: UpdateBoardData; 
      currentVersion?: number 
    }) => bingoBoardsService.updateBoard(boardId, updates, currentVersion),
    onSuccess: (response, variables) => {
      if (response.error) {
        notifications.error(response.error);
        return;
      }
      notifications.success('Board updated successfully!');
      
      // Invalidate specific board and list queries
      queryClient.invalidateQueries({ queryKey: ['bingoBoards', 'byId', variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ['bingoBoards'] });
    },
  });
}

export function useDeleteBoardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (boardId: string) => bingoBoardsService.deleteBoard(boardId),
    onSuccess: (response, boardId) => {
      if (response.error) {
        notifications.error(response.error);
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
    mutationFn: ({ boardId, userId, newTitle }: { 
      boardId: string; 
      userId: string; 
      newTitle?: string 
    }) => bingoBoardsService.cloneBoard(boardId, userId, newTitle),
    onSuccess: (response) => {
      if (response.error) {
        notifications.error(response.error);
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
      if (response.error) {
        notifications.error(response.error);
        return;
      }
      
      // Update the specific board in cache
      queryClient.invalidateQueries({ queryKey: ['bingoBoards', 'byId', boardId] });
      queryClient.invalidateQueries({ queryKey: ['bingoBoards'] });
    },
  });
}