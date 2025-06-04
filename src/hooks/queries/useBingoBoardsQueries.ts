/**
 * Bingo Boards React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bingoBoardsService, type BoardFilters } from '../../services/bingo-boards.service';
import { notifications } from '@/lib/notifications';
import { queryKeys } from './index';

export function useBoardQuery(boardId?: string) {
  return useQuery({
    queryKey: queryKeys.bingoBoards.byId(boardId!),
    queryFn: () => bingoBoardsService.getBoardById(boardId!),
    enabled: !!boardId,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePublicBoardsQuery(filters: BoardFilters = {}, page = 1, limit = 20) {
  return useQuery({
    queryKey: queryKeys.bingoBoards.public(filters, page),
    queryFn: () => bingoBoardsService.getPublicBoards(filters, page, limit),
    staleTime: 1 * 60 * 1000,
  });
}

export function useCreateBoardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bingoBoardsService.createBoard,
    onSuccess: (response) => {
      if (response.error) {
        notifications.error(response.error);
        return;
      }
      notifications.success('Board created successfully!');
      queryClient.invalidateQueries({ queryKey: queryKeys.bingoBoards.all() });
    },
  });
}