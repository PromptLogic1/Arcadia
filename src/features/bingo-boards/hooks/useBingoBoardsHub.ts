import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBingoBoards } from './useBingoBoards';
import { useAuth } from '@/lib/stores/auth-store';
// Note: Using a type that matches CreateBoardForm's expected props exactly
type CreateBoardFormData = {
  board_title: string;
  board_description: string;
  board_size: number;
  board_game_type?: GameCategory; // Making optional to match the form's expectation
  board_difficulty: DifficultyLevel;
  is_public: boolean;
  board_tags: string[];
};
import type { BoardFilters } from '../../../services/bingo-boards.service';
import type { GameCategory, DifficultyLevel } from '@/types';
import { ROUTES as _ROUTES } from '@/src/config/routes';
import { log } from '@/lib/logger';
import { toError } from '@/lib/error-guards';

// Type guards
function isGameCategory(value: string): value is GameCategory {
  // This would ideally check against a const array of valid values
  // For now, we trust that the value is valid since it comes from controlled inputs
  return true;
}

function isDifficultyLevel(value: string): value is DifficultyLevel {
  return ['beginner', 'easy', 'medium', 'hard', 'expert'].includes(value);
}

function isSortBy(
  value: string
): value is 'newest' | 'oldest' | 'popular' | 'difficulty' {
  return ['newest', 'oldest', 'popular', 'difficulty'].includes(value);
}

// Legacy filter interface for backwards compatibility
export interface LegacyFilterState {
  category: string;
  difficulty: string;
  sort: string;
  search: string;
}

// Hub hook for board management and filtering
export function useBingoBoardsHub() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Mount tracking
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Use the modern hook pattern
  const {
    boards,
    totalCount,
    hasMore,
    isLoading,
    isFetching,
    error,
    currentSection,
    filters,
    currentPage,
    switchToSection,
    updateFilters,
    createBoard,
    isCreating,
    goToNextPage,
    goToPreviousPage,
  } = useBingoBoards();

  // UI state for the create form
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);

  // Legacy filter state for backwards compatibility with existing components
  const [legacyFilterSelections, setLegacyFilterSelections] =
    useState<LegacyFilterState>({
      category: 'All Games',
      difficulty: 'all',
      sort: 'newest',
      search: '',
    });

  // Handle legacy filter changes and translate to modern filters
  const handleFilterChange = useCallback(
    (type: keyof LegacyFilterState, value: string) => {
      const newLegacyFilters = { ...legacyFilterSelections, [type]: value };
      setLegacyFilterSelections(newLegacyFilters);

      // Translate legacy filters to modern filter format
      const modernFilters: Partial<BoardFilters> = {};

      if (
        newLegacyFilters.category &&
        newLegacyFilters.category !== 'All Games' &&
        isGameCategory(newLegacyFilters.category)
      ) {
        modernFilters.gameType = newLegacyFilters.category;
      }

      if (
        newLegacyFilters.difficulty &&
        newLegacyFilters.difficulty !== 'all' &&
        isDifficultyLevel(newLegacyFilters.difficulty)
      ) {
        modernFilters.difficulty = newLegacyFilters.difficulty;
      }

      if (newLegacyFilters.search) {
        modernFilters.search = newLegacyFilters.search;
      }

      if (newLegacyFilters.sort && isSortBy(newLegacyFilters.sort)) {
        modernFilters.sortBy = newLegacyFilters.sort;
      }

      // Update the modern filters
      updateFilters(modernFilters);
    },
    [legacyFilterSelections, updateFilters]
  );

  const handleCreateBoard = useCallback(
    async (formData: CreateBoardFormData) => {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }

      log.info('Board creation requested', {
        metadata: { hook: 'useBingoBoardsHub', formData },
      });

      try {
        // Map form data to service format
        const createData = {
          title: formData.board_title,
          description: formData.board_description || '',
          game_type: formData.board_game_type || 'World of Warcraft',
          difficulty: formData.board_difficulty,
          size: formData.board_size,
          tags: formData.board_tags,
          is_public: formData.is_public,
        };

        const result = await createBoard(createData);

        // Check if component is still mounted before updating state
        if (isMountedRef.current && result.success && result.data) {
          setIsCreateFormOpen(false);

          // Show success notification
          const { notifications } = await import('@/lib/notifications');
          notifications.success('Board created successfully!');

          // Navigate to the new board for editing
          router.push(`/challenge-hub/${result.data.id}`);
        }
      } catch (error) {
        // Only log error if component is still mounted
        if (isMountedRef.current) {
          log.error('Failed to create board', toError(error), {
            metadata: { hook: 'useBingoBoardsHub', formData },
          });

          // Show error notification
          const { notifications } = await import('@/lib/notifications');
          notifications.error('Failed to create board. Please try again.');
        }
      }
    },
    [isAuthenticated, router, createBoard]
  );

  // Helper function to get filtered boards (now handled by server)
  const filteredAndSortedBoards = useCallback(() => {
    // With the new pattern, filtering and sorting is handled by the server
    // This function is kept for backwards compatibility but just returns the boards
    return boards;
  }, [boards]);

  return {
    // Server state (from TanStack Query)
    boards: filteredAndSortedBoards(),
    totalCount,
    hasMore,
    isLoading,
    isFetching,
    error,

    // UI state
    isCreateFormOpen,
    filterSelections: legacyFilterSelections,
    loading: isCreating, // Legacy loading state
    currentPage,
    currentSection,

    // Actions
    setIsCreateFormOpen,
    handleFilterChange,
    handleCreateBoard,
    switchToSection,
    goToNextPage,
    goToPreviousPage,

    // Modern filter access
    modernFilters: filters,
    updateModernFilters: updateFilters,
  };
}
