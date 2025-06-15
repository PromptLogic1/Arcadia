'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { PlusCircle, Grid } from '@/components/ui/Icons';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { DIFFICULTY_OPTIONS } from '@/types';
import { default as BoardCard } from './BoardCard';
import { CreateBoardForm } from './CreateBoardForm';
import { NeonText } from '@/components/ui/NeonText';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBingoBoardsHub } from '../hooks/useBingoBoardsHub';
import { useBingoBoardsVirtualization } from '../hooks/useBingoBoardsVirtualization';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import type { VirtualItem } from '@tanstack/react-virtual';
import {
  Constants as _Constants,
  type GameCategory as _GameCategory,
  type Tables,
} from '@/types';

// Use the database type directly to avoid conflicts
type _BingoBoard = Tables<'bingo_boards'>;

const BingoBoardsHub = React.memo(function BingoBoardsHub() {
  const {
    boards,
    isCreateFormOpen,
    filterSelections,
    handleFilterChange,
    setIsCreateFormOpen,
    handleCreateBoard,
    isLoading,
    isFetching,
    hasMore,
    goToNextPage,
  } = useBingoBoardsHub();

  // Local state for search input to provide immediate feedback
  const [searchValue, setSearchValue] = useState(filterSelections.search);

  // Debounced search handler - only updates filters after user stops typing
  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      handleFilterChange('search', value);
    },
    300 // 300ms delay
  );

  // Update local search value when filters change externally
  useEffect(() => {
    setSearchValue(filterSelections.search);
  }, [filterSelections.search]);

  // Handle search input changes
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value); // Update local state immediately for UI responsiveness
      debouncedSearch(value); // Debounce the actual filter update
    },
    [debouncedSearch]
  );

  // Setup virtualization
  const { containerRef, virtualizer } = useBingoBoardsVirtualization({
    boards,
  });

  // Memoize virtual container styles
  const virtualContainerStyle = useMemo(
    () => ({
      height: `${virtualizer.getTotalSize()}px`,
      width: '100%',
      position: 'relative' as const,
    }),
    [virtualizer]
  );

  const loadMoreStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
    }),
    []
  );

  // Sort options for the select
  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'rating', label: 'Highest Rated' },
  ];

  return (
    <div className="space-y-6">
      {/* Simple Filter Bar */}
      <div className="bg-card flex flex-wrap gap-4 rounded-lg border p-4">
        <div className="min-w-[200px] flex-1">
          <Input
            placeholder="Search boards..."
            value={searchValue}
            onChange={handleSearchChange}
          />
        </div>

        <Select
          value={filterSelections.difficulty}
          onValueChange={value => handleFilterChange('difficulty', value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulties</SelectItem>
            {DIFFICULTY_OPTIONS.map(difficulty => (
              <SelectItem key={difficulty.value} value={difficulty.value}>
                {difficulty.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterSelections.sort}
          onValueChange={value => handleFilterChange('sort', value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">
          <NeonText>Your Bingo Boards</NeonText>
        </h3>
        <Button
          onClick={() => setIsCreateFormOpen(true)}
          className="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Board
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Boards List - Virtualized */}
      {!isLoading && boards.length > 0 && (
        <div ref={containerRef} className="h-[calc(100vh-300px)] overflow-auto">
          <div style={virtualContainerStyle}>
            {virtualizer.getVirtualItems().map((virtualItem: VirtualItem) => {
              const board = boards[virtualItem.index];
              if (!board) return null;

              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <BoardCard board={board} />
                </div>
              );
            })}

            {/* Load More - positioned after virtual items */}
            {hasMore && (
              <div className="p-4 text-center" style={loadMoreStyle}>
                <Button
                  variant="secondary"
                  onClick={goToNextPage}
                  disabled={isFetching}
                >
                  Load More Boards
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && boards.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-600 p-12 text-center">
          <Grid className="mb-4 h-12 w-12 text-gray-500" />
          <h3 className="mb-2 text-xl font-semibold text-gray-300">
            No boards found
          </h3>
          <p className="mb-6 max-w-sm text-gray-500">
            {filterSelections.search || filterSelections.difficulty !== 'all'
              ? 'Try adjusting your filters or search term'
              : 'Create your first bingo board to get started'}
          </p>
          {filterSelections.search === '' &&
            filterSelections.difficulty === 'all' && (
              <Button
                onClick={() => setIsCreateFormOpen(true)}
                className="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Your First Board
              </Button>
            )}
        </div>
      )}

      {/* Refreshing Indicator */}
      {isFetching && !isLoading && (
        <div className="flex items-center justify-center py-2">
          <LoadingSpinner size="sm" color="primary" />
          <span className="ml-2 text-sm text-gray-400">Refreshing...</span>
        </div>
      )}

      <CreateBoardForm
        isOpen={isCreateFormOpen}
        onOpenChange={setIsCreateFormOpen}
        createBoardAction={handleCreateBoard}
      />
    </div>
  );
});

export default BingoBoardsHub;
