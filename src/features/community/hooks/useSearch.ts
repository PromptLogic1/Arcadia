'use client';

import { useState, useMemo, useCallback, useTransition } from 'react';
import type { Discussion, Event } from '@/lib/stores/community-store';
import { useDebounce } from '@/hooks/useDebounce';

interface UseSearchReturn<T> {
  filteredItems: T[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: 'newest' | 'hot';
  setSortBy: (sort: 'newest' | 'hot') => void;
  selectedGame: string;
  setSelectedGame: (game: string) => void;
  selectedChallenge: string;
  setSelectedChallenge: (challenge: string) => void;
  isSearching: boolean;
}

export function useSearch<T extends Discussion | Event>(
  items: readonly T[],
  searchKeys: (keyof T)[]
): UseSearchReturn<T> {
  const [searchQuery, setSearchQueryRaw] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'hot'>('newest');
  const [selectedGame, setSelectedGame] = useState('All Games');
  const [selectedChallenge, setSelectedChallenge] = useState('All Challenges');
  const [isPending, startTransition] = useTransition();

  // Debounce search query to prevent too many re-renders
  const debouncedSearch = useDebounce(searchQuery, 300);

  const setSearchQuery = useCallback((query: string) => {
    startTransition(() => {
      setSearchQueryRaw(query);
    });
  }, []);

  const filteredItems = useMemo(() => {
    // Create search index for better performance
    const searchIndex = new Map<T, string>();

    return items
      .filter(item => {
        // Get or create search string for item
        let searchString = searchIndex.get(item);
        if (!searchString) {
          searchString = searchKeys
            .map(key => {
              const value = item[key];
              return typeof value === 'string' ? value.toLowerCase() : '';
            })
            .join(' ');
          searchIndex.set(item, searchString);
        }

        const matchesSearch =
          !debouncedSearch ||
          searchString.includes(debouncedSearch.toLowerCase());

        const matchesGame =
          selectedGame === 'All Games' || item.game === selectedGame;
        const matchesChallenge =
          selectedChallenge === 'All Challenges' ||
          ('challenge_type' in item &&
            (item as Discussion).challenge_type === selectedChallenge);

        return matchesSearch && matchesGame && matchesChallenge;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          const aDateStr = 'date' in a ? a.date : a.created_at;
          const bDateStr = 'date' in b ? b.date : b.created_at;
          // Ensure valid date strings or fallback to epoch for consistent sorting
          const aTime = aDateStr ? new Date(aDateStr).getTime() : 0;
          const bTime = bDateStr ? new Date(bDateStr).getTime() : 0;
          // Handle NaN cases explicitly if new Date() results in Invalid Date
          const validATime = isNaN(aTime) ? 0 : aTime;
          const validBTime = isNaN(bTime) ? 0 : bTime;
          return validBTime - validATime; // newest first
        }
        // For 'hot' sort, ensure upvotes exist or default to 0
        const aUpvotes =
          'upvotes' in a && typeof a.upvotes === 'number' ? a.upvotes : 0;
        const bUpvotes =
          'upvotes' in b && typeof b.upvotes === 'number' ? b.upvotes : 0;
        return bUpvotes - aUpvotes; // most upvotes first
      });
  }, [
    items,
    debouncedSearch,
    selectedGame,
    selectedChallenge,
    sortBy,
    searchKeys,
  ]);

  return {
    filteredItems,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    selectedGame,
    setSelectedGame,
    selectedChallenge,
    setSelectedChallenge,
    isSearching: isPending,
  };
}
