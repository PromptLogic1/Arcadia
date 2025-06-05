/**
 * Modern Bingo Boards Hook - TanStack Query + Zustand Pattern
 *
 * This hook replaces the old useBingoBoards.ts with the modern architecture:
 * - Server state managed by TanStack Query
 * - UI state managed by Zustand
 * - Clean separation of concerns
 */

import { useAuth } from '@/lib/stores/auth-store';
import type { BingoBoard } from '@/types';
import {
  useBoardsBySectionQuery,
  useCreateBoardMutation,
  useUpdateBoardMutation,
  useDeleteBoardMutation,
  useCloneBoardMutation,
  useVoteBoardMutation,
} from '@/hooks/queries/useBingoBoardsQueries';
import {
  useBingoBoardsState,
  useBingoBoardsActions,
  useBingoBoardsDialogs,
} from '@/lib/stores/bingo-boards-store';
import type {
  CreateBoardData,
  UpdateBoardData,
} from '../../../services/bingo-boards.service';

export function useBingoBoards() {
  const { authUser } = useAuth();

  // UI state from Zustand (no server data!)
  const {
    currentSection,
    currentPage,
    filters,
    selectedBoardId,
    viewMode,
    itemsPerPage,
  } = useBingoBoardsState();

  const {
    setCurrentSection,
    setCurrentPage,
    setFilters,
    clearFilters,
    setSelectedBoardId,
    setViewMode,
    setItemsPerPage,
    resetToDefaults,
  } = useBingoBoardsActions();

  const { showCreateDialog, showDeleteDialog, showCloneDialog } =
    useBingoBoardsDialogs();

  // Server state from TanStack Query
  const {
    data: boardsResponse,
    isLoading,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useBoardsBySectionQuery(
    currentSection,
    filters,
    currentPage,
    itemsPerPage,
    authUser?.id
  );

  // Mutations
  const createBoardMutation = useCreateBoardMutation();
  const updateBoardMutation = useUpdateBoardMutation();
  const deleteBoardMutation = useDeleteBoardMutation();
  const cloneBoardMutation = useCloneBoardMutation();
  const voteBoardMutation = useVoteBoardMutation();

  // Derived state - handle undefined and error states
  const boards: BingoBoard[] = boardsResponse?.boards || [];
  const totalCount = boardsResponse?.totalCount || 0;
  const hasMore = boardsResponse?.hasMore || false;
  const hasBoards = boards.length > 0;

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const canGoBack = currentPage > 1;
  const canGoForward = hasMore;

  // Actions
  const createBoard = async (boardData: CreateBoardData) => {
    return createBoardMutation.mutateAsync(boardData);
  };

  const updateBoard = async (
    boardId: string,
    updates: UpdateBoardData,
    currentVersion?: number
  ) => {
    return updateBoardMutation.mutateAsync({
      boardId,
      updates,
      currentVersion,
    });
  };

  const deleteBoard = async (boardId: string) => {
    return deleteBoardMutation.mutateAsync(boardId);
  };

  const cloneBoard = async (boardId: string, newTitle?: string) => {
    if (!authUser?.id) {
      throw new Error('Must be logged in to clone boards');
    }
    return cloneBoardMutation.mutateAsync({
      boardId,
      userId: authUser.id,
      newTitle,
    });
  };

  const voteBoard = async (boardId: string) => {
    return voteBoardMutation.mutateAsync(boardId);
  };

  // Navigation helpers
  const goToNextPage = () => {
    if (canGoForward) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (canGoBack) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Filter helpers
  const updateFilters = (newFilters: Partial<typeof filters>) => {
    setFilters(newFilters);
  };

  const resetFilters = () => {
    clearFilters();
  };

  // Section helpers
  const switchToSection = (section: typeof currentSection) => {
    setCurrentSection(section);
  };

  return {
    // Server state (from TanStack Query)
    boards,
    totalCount,
    hasMore,
    hasBoards,
    isLoading,
    isFetching,
    isPlaceholderData,
    error,
    refetch,

    // UI state (from Zustand)
    currentSection,
    currentPage,
    filters,
    selectedBoardId,
    viewMode,
    itemsPerPage,
    showCreateDialog,
    showDeleteDialog,
    showCloneDialog,

    // Pagination state
    totalPages,
    canGoBack,
    canGoForward,

    // UI actions
    setSelectedBoardId,
    setViewMode,
    setItemsPerPage,
    updateFilters,
    resetFilters,
    resetToDefaults,

    // Navigation actions
    switchToSection,
    goToNextPage,
    goToPreviousPage,
    goToPage,

    // Mutation actions
    createBoard,
    updateBoard,
    deleteBoard,
    cloneBoard,
    voteBoard,

    // Mutation states
    isCreating: createBoardMutation.isPending,
    isUpdating: updateBoardMutation.isPending,
    isDeleting: deleteBoardMutation.isPending,
    isCloning: cloneBoardMutation.isPending,
    isVoting: voteBoardMutation.isPending,

    // Any mutation is pending
    isMutating:
      createBoardMutation.isPending ||
      updateBoardMutation.isPending ||
      deleteBoardMutation.isPending ||
      cloneBoardMutation.isPending ||
      voteBoardMutation.isPending,
  };
}
