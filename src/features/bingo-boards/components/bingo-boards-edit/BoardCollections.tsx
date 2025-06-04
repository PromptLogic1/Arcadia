import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import {
  Search,
  Shuffle,
  Star,
  TrendingUp,
  Clock,
  Package2,
  RefreshCw,
  Copy,
  Users,
  Grid3X3,
} from 'lucide-react';

// Types
import type { GameCategory, Difficulty } from '@/types';
import { createClient } from '@/src/lib/supabase';
import { notifications } from '@/lib/notifications';

// Design System
import {
  typography,
  buttonVariants,
  cardVariants,
  getDifficultyStyles,
} from './design-system';

// Constants
import { COLLECTION_LIMITS } from './constants';

// Database types for bingo boards used as collections
interface BoardStateCell {
  cell_id?: string;
  text?: string;
  position?: number;
}

interface BoardCollection {
  id: string;
  title: string;
  description: string | null;
  creator_id: string | null;
  size: number | null;
  game_type: GameCategory;
  difficulty: Difficulty;
  is_public: boolean | null;
  votes: number | null;
  bookmarked_count: number | null;
  board_state: BoardStateCell[] | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BoardCollectionFilters {
  search: string;
  difficulty: Difficulty | 'all';
  sortBy: 'newest' | 'popular' | 'trending' | 'bookmarks';
  gameType?: GameCategory;
}

interface BoardCollectionsProps {
  gameType: GameCategory;
  onUseCollection: (collection: BoardCollection) => Promise<void>;
  onShuffleFromCollections: (collections: BoardCollection[]) => Promise<void>;
  gridSize: number;
}

/**
 * Board Collections Component
 * Displays public bingo boards that can be used as card collections/templates
 */
export function BoardCollections({
  gameType,
  onUseCollection,
  onShuffleFromCollections,
  gridSize,
}: BoardCollectionsProps) {
  const [collections, setCollections] = useState<BoardCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [filters, setFilters] = useState<BoardCollectionFilters>({
    search: '',
    difficulty: 'all',
    sortBy: 'popular',
    gameType,
  });

  // Load public board collections based on filters
  const loadCollections = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('bingo_boards')
        .select('*')
        .eq('is_public', true)
        .eq('game_type', gameType)
        .not('board_state', 'is', null); // Only boards with actual card content

      // Apply difficulty filter
      if (filters.difficulty !== 'all') {
        query = query.eq('difficulty', filters.difficulty);
      }

      // Apply search filter
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'popular':
          query = query.order('votes', { ascending: false });
          break;
        case 'bookmarks':
          query = query.order('bookmarked_count', { ascending: false });
          break;
        case 'trending':
          // For trending, combine votes and recent activity
          query = query.order('votes', { ascending: false });
          break;
      }

      const { data, error } = await query.limit(50);

      if (error) {
        throw error;
      }

      setCollections((data as BoardCollection[]) || []);
    } catch (error) {
      console.error('Failed to load board collections:', error);
      notifications.error('Failed to load board collections');
    } finally {
      setLoading(false);
    }
  }, [gameType, filters]);

  // Handle shuffle from multiple collections
  const handleShuffleFromCollections = useCallback(async () => {
    if (collections.length === 0) {
      notifications.error('No board collections available for shuffling');
      return;
    }

    setShuffling(true);
    try {
      // Filter collections based on current difficulty if set
      let availableCollections = collections;
      if (filters.difficulty !== 'all') {
        availableCollections = collections.filter(
          collection => collection.difficulty === filters.difficulty
        );
      }

      if (availableCollections.length === 0) {
        notifications.error(
          'No collections available with the selected difficulty'
        );
        return;
      }

      await onShuffleFromCollections(availableCollections);
    } catch (error) {
      console.error('Failed to shuffle from collections:', error);
      notifications.error('Failed to generate board from collections');
    } finally {
      setShuffling(false);
    }
  }, [collections, filters.difficulty, onShuffleFromCollections]);

  // Update filters
  const updateFilter = useCallback(
    (key: keyof BoardCollectionFilters, value: string) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  // Load collections when filters change
  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

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
          <Badge variant="outline" className="text-xs">
            {collections.length} collections
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
            onValueChange={value => updateFilter('difficulty', value)}
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
            onValueChange={value =>
              updateFilter('sortBy', value as BoardCollectionFilters['sortBy'])
            }
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
            variant="outline"
            onClick={loadCollections}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Shuffle Button */}
        <Button
          onClick={handleShuffleFromCollections}
          disabled={shuffling || collections.length === 0}
          className={cn(buttonVariants({ variant: 'primary' }), 'w-full gap-2')}
        >
          {shuffling ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Shuffle className="h-4 w-4" />
          )}
          {shuffling
            ? 'Generating...'
            : `Shuffle from Collections (${gridSize}x${gridSize})`}
        </Button>
      </div>

      {/* Collections List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {loading ? (
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
  const cardCount = collection.board_state?.length || 0;
  const filledCards =
    collection.board_state?.filter(cell => cell.cell_id || cell.text).length ||
    0;
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
          <Badge variant="outline" className="px-2 py-0.5 text-xs">
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
