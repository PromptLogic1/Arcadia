import React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import {
  Search,
  Star,
  Clock,
  RefreshCw,
  Users,
  Grid3X3,
  Shuffle,
  Copy,
  Package2,
  TrendingUp,
} from '@/components/ui/Icons';

// Types
import type { GameCategory, Difficulty } from '@/types';
import { useBoardCollections } from '../../hooks/useBoardCollections';
import type {
  BoardCollection,
  BoardCollectionFilters,
} from '../../../../services/board-collections.service';

// Type guards
function isDifficultyOrAll(value: string): value is Difficulty | 'all' {
  return (
    value === 'all' ||
    value === 'beginner' ||
    value === 'easy' ||
    value === 'medium' ||
    value === 'hard' ||
    value === 'expert'
  );
}

function isSortByOption(
  value: string
): value is BoardCollectionFilters['sortBy'] {
  return (
    value === 'trending' ||
    value === 'newest' ||
    value === 'rating' ||
    value === 'usage'
  );
}

// Design System
import {
  typography,
  buttonVariants,
  cardVariants,
  getDifficultyStyles,
} from './design-system';

// Constants
import { COLLECTION_LIMITS } from './constants';

interface BoardCollectionsProps {
  gameType: GameCategory;
  onUseCollection: (collection: BoardCollection) => Promise<void>;
  onShuffleFromCollections: (collections: BoardCollection[]) => Promise<void>;
  gridSize: number;
}

/**
 * Board Collections Component
 * Displays public bingo boards that can be used as card collections/templates
 *
 * Now using the modern TanStack Query + Zustand architecture
 */
export function BoardCollections({
  gameType,
  onUseCollection,
  onShuffleFromCollections,
  gridSize,
}: BoardCollectionsProps) {
  // Use modern hook for state management
  const {
    collections,
    isLoading,
    error: _error,
    filters,
    isShuffling,
    updateFilter,
    refresh,
    shuffleFromCollections,
    collectionCount,
  } = useBoardCollections(gameType);

  // Handle shuffle with the provided callback
  const handleShuffleFromCollections = async () => {
    await shuffleFromCollections(onShuffleFromCollections);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header with Search and Filters */}
      <div className="space-y-4 border-b border-gray-700/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package2 className="h-5 w-5 text-cyan-400" />
            <h3 className={cn(typography.heading.h4, 'text-gray-100')}>
              Board Collections
            </h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {collectionCount} collections
          </Badge>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
            placeholder="Search board collections..."
            className="border-gray-700 bg-gray-800/50 pl-10 focus:border-cyan-500"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-2">
          <Select
            value={filters.difficulty}
            onValueChange={(value: string) => {
              if (isDifficultyOrAll(value)) {
                updateFilter('difficulty', value);
              }
            }}
          >
            <SelectTrigger className="w-32 border-gray-700 bg-gray-800/50">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sortBy}
            onValueChange={value => {
              if (isSortByOption(value)) {
                updateFilter('sortBy', value);
              }
            }}
          >
            <SelectTrigger className="w-36 border-gray-700 bg-gray-800/50">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">
                <div className="flex items-center gap-2">
                  <Star className="h-3 w-3" />
                  Popular
                </div>
              </SelectItem>
              <SelectItem value="newest">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Newest
                </div>
              </SelectItem>
              <SelectItem value="bookmarks">
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  Most Saved
                </div>
              </SelectItem>
              <SelectItem value="trending">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" />
                  Trending
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="secondary"
            onClick={refresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Shuffle Button */}
        <Button
          onClick={handleShuffleFromCollections}
          disabled={isShuffling || collections.length === 0}
          className={cn(buttonVariants({ variant: 'primary' }), 'w-full gap-2')}
        >
          {isShuffling ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Shuffle className="h-4 w-4" />
          )}
          {isShuffling
            ? 'Generating...'
            : `Shuffle from Collections (${gridSize}x${gridSize})`}
        </Button>
      </div>

      {/* Collections List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-800/50">
                <Package2 className="h-10 w-10 text-gray-600" />
              </div>
              <p className={cn(typography.body.normal, 'mb-2 text-gray-400')}>
                No board collections found
              </p>
              <p className={cn(typography.caption, 'text-gray-500')}>
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {collections.map(collection => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  onUse={() => onUseCollection(collection)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Individual collection card component
interface CollectionCardProps {
  collection: BoardCollection;
  onUse: () => void;
}

function CollectionCard({ collection, onUse }: CollectionCardProps) {
  // board_state is now properly typed as BoardCell[]
  const boardState = collection.board_state;
  const cardCount = boardState.length;
  const filledCards = boardState.filter(
    cell => cell.cell_id || cell.text
  ).length;
  const isValidCollectionSize =
    filledCards >= COLLECTION_LIMITS.MIN_CARDS &&
    filledCards <= COLLECTION_LIMITS.MAX_CARDS;

  return (
    <div
      className={cn(
        cardVariants({ variant: 'interactive', size: 'sm' }),
        'group p-4 transition-all duration-200 hover:border-cyan-500/50'
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              'px-2 py-0.5 text-xs',
              getDifficultyStyles(collection.difficulty)
            )}
          >
            {collection.difficulty}
          </Badge>
          <Badge variant="secondary" className="px-2 py-0.5 text-xs">
            <Grid3X3 className="mr-1 h-3 w-3" />
            {collection.size}x{collection.size}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {collection.votes && collection.votes > 0 && (
            <div className="flex items-center gap-1 text-yellow-400">
              <Star className="h-3 w-3 fill-current" />
              <span>{collection.votes}</span>
            </div>
          )}
          {collection.bookmarked_count && collection.bookmarked_count > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{collection.bookmarked_count}</span>
            </div>
          )}
        </div>
      </div>

      <h4
        className={cn(
          typography.body.normal,
          'mb-2 line-clamp-1 font-medium text-gray-100'
        )}
      >
        {collection.title}
      </h4>

      {collection.description && (
        <p
          className={cn(
            typography.body.small,
            'mb-3 line-clamp-2 text-gray-400'
          )}
        >
          {collection.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs">
          <span
            className={cn(
              'font-medium',
              isValidCollectionSize ? 'text-cyan-400' : 'text-red-400'
            )}
          >
            {filledCards}
          </span>
          <span className="text-gray-500"> / {cardCount} cards filled</span>
          {!isValidCollectionSize && (
            <div className="mt-1 text-xs text-red-400">
              {filledCards < COLLECTION_LIMITS.MIN_CARDS
                ? `Need ${COLLECTION_LIMITS.MIN_CARDS - filledCards} more cards`
                : `${filledCards - COLLECTION_LIMITS.MAX_CARDS} cards over limit`}
            </div>
          )}
        </div>

        <Button
          size="sm"
          onClick={onUse}
          disabled={!isValidCollectionSize}
          className={cn(
            buttonVariants({ variant: 'primary', size: 'sm' }),
            'gap-2 opacity-0 transition-opacity group-hover:opacity-100',
            !isValidCollectionSize && 'cursor-not-allowed opacity-50'
          )}
        >
          <Copy className="h-3 w-3" />
          Use Collection
        </Button>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1 w-full rounded-full bg-gray-700/50">
        <div
          className="h-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
          style={{
            width: `${cardCount > 0 ? (filledCards / cardCount) * 100 : 0}%`,
          }}
        />
      </div>
    </div>
  );
}
