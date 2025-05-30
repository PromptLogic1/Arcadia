import { useState, useCallback, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import type { Discussion, Event } from '@/lib/stores/community-store';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface CommunityFilters {
  searchQuery: string;
  selectedGame: string;
  selectedChallenge: string;
  sortBy: 'newest' | 'hot';
}

export interface UseCommunityFiltersOptions {
  discussions: Discussion[];
  events: Event[];
}

export interface UseCommunityFiltersReturn {
  // Filter state
  filters: CommunityFilters;

  // Debounced search
  debouncedSearchQuery: string;

  // Filter setters
  setSearchQuery: (query: string) => void;
  setSelectedGame: (game: string) => void;
  setSelectedChallenge: (challenge: string) => void;
  setSortBy: (sort: 'newest' | 'hot') => void;

  // Filtered results
  filteredDiscussions: Discussion[];
  filteredEvents: Event[];

  // Reset filters
  clearFilters: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_FILTERS: CommunityFilters = {
  searchQuery: '',
  selectedGame: 'All Games',
  selectedChallenge: 'All Challenges',
  sortBy: 'newest',
};

// =============================================================================
// FILTER UTILITIES
// =============================================================================

/**
 * Check if a discussion matches search criteria
 */
const matchesSearchQuery = (
  discussion: Discussion,
  searchQuery: string
): boolean => {
  if (!searchQuery) return true;

  const query = searchQuery.toLowerCase();
  return (
    discussion.title.toLowerCase().includes(query) ||
    discussion.content.toLowerCase().includes(query) ||
    discussion.game.toLowerCase().includes(query) ||
    (discussion.tags?.some(tag => tag.toLowerCase().includes(query)) ?? false)
  );
};

/**
 * Check if an event matches search criteria
 */
const matchesEventSearchQuery = (
  event: Event,
  searchQuery: string
): boolean => {
  if (!searchQuery) return true;

  const query = searchQuery.toLowerCase();
  return (
    event.title.toLowerCase().includes(query) ||
    event.description.toLowerCase().includes(query) ||
    event.tags.some(tag => tag.toLowerCase().includes(query))
  );
};

/**
 * Sort discussions based on criteria
 */
const sortDiscussions = (
  discussions: Discussion[],
  sortBy: 'newest' | 'hot'
): Discussion[] => {
  return [...discussions].sort((a, b) => {
    if (sortBy === 'newest') {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    } else {
      const aUpvotes = a.upvotes || 0;
      const bUpvotes = b.upvotes || 0;
      return bUpvotes - aUpvotes;
    }
  });
};

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Custom hook for managing community filters and search functionality
 *
 * Handles:
 * - Search query with debouncing
 * - Game and challenge type filtering
 * - Sorting by newest/hot
 * - Filtered results computation
 *
 * @param options - Discussions and events data
 * @returns Filter state and filtered results
 */
export function useCommunityFilters({
  discussions,
  events,
}: UseCommunityFiltersOptions): UseCommunityFiltersReturn {
  // State management
  const [filters, setFilters] = useState<CommunityFilters>(DEFAULT_FILTERS);

  // Debounced search for performance
  const debouncedSearchQuery = useDebounce(filters.searchQuery, 300);

  // Filter setters with useCallback for performance
  const setSearchQuery = useCallback((searchQuery: string) => {
    setFilters(prev => ({ ...prev, searchQuery }));
  }, []);

  const setSelectedGame = useCallback((selectedGame: string) => {
    setFilters(prev => ({ ...prev, selectedGame }));
  }, []);

  const setSelectedChallenge = useCallback((selectedChallenge: string) => {
    setFilters(prev => ({ ...prev, selectedChallenge }));
  }, []);

  const setSortBy = useCallback((sortBy: 'newest' | 'hot') => {
    setFilters(prev => ({ ...prev, sortBy }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Filtered discussions with memoization for performance
  const filteredDiscussions = useMemo(() => {
    let result = discussions.filter(discussion => {
      // Search query filter
      if (!matchesSearchQuery(discussion, debouncedSearchQuery)) {
        return false;
      }

      // Game filter
      if (
        filters.selectedGame !== 'All Games' &&
        discussion.game !== filters.selectedGame
      ) {
        return false;
      }

      // Challenge type filter
      if (
        filters.selectedChallenge !== 'All Challenges' &&
        discussion.challenge_type !== filters.selectedChallenge
      ) {
        return false;
      }

      return true;
    });

    // Apply sorting
    result = sortDiscussions(result, filters.sortBy);

    return result;
  }, [
    discussions,
    debouncedSearchQuery,
    filters.selectedGame,
    filters.selectedChallenge,
    filters.sortBy,
  ]);

  // Filtered events with memoization
  const filteredEvents = useMemo(() => {
    return events.filter(event =>
      matchesEventSearchQuery(event, debouncedSearchQuery)
    );
  }, [events, debouncedSearchQuery]);

  return {
    filters,
    debouncedSearchQuery,
    setSearchQuery,
    setSelectedGame,
    setSelectedChallenge,
    setSortBy,
    filteredDiscussions,
    filteredEvents,
    clearFilters,
  };
}
