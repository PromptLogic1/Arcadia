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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Search,
  Shuffle,
  Star,
  TrendingUp,
  Clock,
  Package2,
  Sparkles,
  RefreshCw,
  Layers,
  Plus,
  Check,
  X,
} from 'lucide-react';

import { BoardCollections } from './BoardCollections';

// Types
import type { BingoCard, GameCategory, Difficulty } from '@/types';
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

// Types
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
  game_type: GameCategory;
  difficulty: Difficulty;
  board_state: BoardStateCell[] | null;
}

export interface CardLibraryFilters {
  search: string;
  difficulty: Difficulty | 'all';
  sortBy: 'newest' | 'popular' | 'trending';
  gameType?: GameCategory;
}

interface CardLibraryProps {
  gameType: GameCategory;
  onCardSelect: (card: BingoCard) => void;
  onShuffle: (cards: BingoCard[]) => Promise<void>;
  onUseCollection?: (cards: BingoCard[]) => Promise<void>;
  onBulkAddCards?: (cards: BingoCard[]) => Promise<void>;
  gridSize: number;
}

/**
 * Card Library Component
 * Replaces templates with a searchable public card library system
 */
export function CardLibrary({
  gameType,
  onCardSelect,
  onShuffle,
  onUseCollection,
  onBulkAddCards,
  gridSize,
}: CardLibraryProps) {
  const [publicCards, setPublicCards] = useState<BingoCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<CardLibraryFilters>({
    search: '',
    difficulty: 'all',
    sortBy: 'popular',
    gameType,
  });

  // Load public cards based on filters
  const loadPublicCards = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('bingo_cards')
        .select('*')
        .eq('is_public', true)
        .eq('game_type', gameType);

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
        case 'trending':
          // For trending, we could implement a more complex algorithm
          // For now, we'll use a combination of votes and recent activity
          query = query.order('votes', { ascending: false });
          break;
      }

      const { data, error } = await query.limit(100);

      if (error) {
        throw error;
      }
      
      setPublicCards(data || []);
    } catch (error) {
      console.error('Failed to load public cards:', error);
      notifications.error('Failed to load public cards');
    } finally {
      setLoading(false);
    }
  }, [gameType, filters]);

  // Handle shuffle functionality
  const handleShuffle = useCallback(async () => {
    if (publicCards.length === 0) {
      notifications.error('No public cards available for shuffling');
      return;
    }

    setShuffling(true);
    try {
      const totalCells = gridSize * gridSize;

      // Filter cards based on current difficulty if set
      let availableCards = publicCards;
      if (filters.difficulty !== 'all') {
        availableCards = publicCards.filter(
          card => card.difficulty === filters.difficulty
        );
      }

      if (availableCards.length === 0) {
        notifications.error('No cards available with the selected difficulty');
        return;
      }

      // Shuffle and select random cards
      const shuffledCards = [...availableCards].sort(() => Math.random() - 0.5);
      const selectedCards = shuffledCards.slice(0, totalCells);

      // If we don't have enough cards, duplicate some
      while (selectedCards.length < totalCells) {
        const remainingNeeded = totalCells - selectedCards.length;
        const additionalCards = shuffledCards.slice(0, remainingNeeded);
        selectedCards.push(...additionalCards);
      }

      await onShuffle(selectedCards);
      notifications.success(
        `Generated random board with ${selectedCards.length} cards!`
      );
    } catch (error) {
      console.error('Failed to shuffle cards:', error);
      notifications.error('Failed to generate random board');
    } finally {
      setShuffling(false);
    }
  }, [publicCards, filters.difficulty, gridSize, onShuffle]);

  // Handle using a board collection
  const handleUseCollection = useCallback(
    async (collection: BoardCollection) => {
      if (!onUseCollection) return;

      try {
        // Extract cards from board_state
        const supabase = createClient();
        const boardState = collection.board_state || [];

        // Get all card IDs from the board state
        const cardIds = boardState
          .map(cell => cell.cell_id)
          .filter(
            (id): id is string =>
              id !== undefined &&
              id !== null &&
              !id.startsWith('temp-') &&
              !id.startsWith('cell-')
          );

        if (cardIds.length === 0) {
          // If no cards, create cards from text content
          const cards: BingoCard[] = boardState
            .filter(cell => cell.text && cell.text.trim())
            .map((cell, index: number) => ({
              id: `temp-${Date.now()}-${index}`,
              title: cell.text || '',
              description: null,
              difficulty: collection.difficulty,
              game_type: collection.game_type,
              tags: null,
              creator_id: collection.creator_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_public: false,
              votes: 0,
            }));

          await onUseCollection(cards);
          notifications.success(
            `Applied collection "${collection.title}" with ${cards.length} cards!`
          );
          return;
        }

        // Fetch the actual cards
        const { data: cards, error } = await supabase
          .from('bingo_cards')
          .select('*')
          .in('id', cardIds);

        if (error) {
          throw error;
        }
        
        await onUseCollection(cards || []);
        notifications.success(
          `Applied collection "${collection.title}" with ${cards?.length || 0} cards!`
        );
      } catch (error) {
        console.error('Failed to use collection:', error);
        notifications.error('Failed to apply collection');
      }
    },
    [onUseCollection]
  );

  // Handle shuffle from collections
  const handleShuffleFromCollections = useCallback(
    async (collections: BoardCollection[]) => {
      try {
        const allCards: BingoCard[] = [];
        const supabase = createClient();

        for (const collection of collections) {
          const boardState = collection.board_state || [];
          const cardIds = boardState
            .map(cell => cell.cell_id)
            .filter(
              (id): id is string =>
                id !== undefined &&
                id !== null &&
                !id.startsWith('temp-') &&
                !id.startsWith('cell-')
            );

          if (cardIds.length > 0) {
            const { data: cards, error } = await supabase
              .from('bingo_cards')
              .select('*')
              .in('id', cardIds);

            if (!error && cards) {
              allCards.push(...(cards as BingoCard[]));
            }
          }

          // Also add text-based cards
          const textCards = boardState
            .filter(cell => cell.text && cell.text.trim() && !cell.cell_id)
            .map((cell, index: number) => ({
              id: `temp-${Date.now()}-${index}-${collection.id}`,
              title: cell.text || '',
              description: null,
              difficulty: collection.difficulty,
              game_type: collection.game_type,
              tags: null,
              creator_id: collection.creator_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_public: false,
              votes: 0,
            }));

          allCards.push(...textCards);
        }

        // Shuffle and use the cards
        const shuffledCards = [...allCards].sort(() => Math.random() - 0.5);
        await onShuffle(shuffledCards);
        notifications.success(
          `Shuffled ${allCards.length} cards from ${collections.length} collections!`
        );
      } catch (error) {
        console.error('Failed to shuffle from collections:', error);
        notifications.error('Failed to shuffle from collections');
      }
    },
    [onShuffle]
  );

  // Bulk selection handlers
  const toggleBulkMode = useCallback(() => {
    setBulkMode(prev => !prev);
    setSelectedCards(new Set());
  }, []);

  const toggleCardSelection = useCallback((cardId: string) => {
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  }, []);

  const selectAllCards = useCallback(() => {
    const allCardIds = publicCards.map(card => card.id);
    setSelectedCards(new Set(allCardIds));
  }, [publicCards]);

  const clearSelection = useCallback(() => {
    setSelectedCards(new Set());
  }, []);

  const handleBulkAdd = useCallback(async () => {
    if (!onBulkAddCards || selectedCards.size === 0) return;

    const cardsToAdd = publicCards.filter(card => selectedCards.has(card.id));

    if (cardsToAdd.length < COLLECTION_LIMITS.MIN_CARDS) {
      notifications.error(
        `Collections must have at least ${COLLECTION_LIMITS.MIN_CARDS} cards`
      );
      return;
    }

    if (cardsToAdd.length > COLLECTION_LIMITS.MAX_CARDS) {
      notifications.error(
        `Collections cannot exceed ${COLLECTION_LIMITS.MAX_CARDS} cards`
      );
      return;
    }

    try {
      await onBulkAddCards(cardsToAdd);
      notifications.success(
        `Added ${cardsToAdd.length} cards to your collection!`
      );
      setBulkMode(false);
      setSelectedCards(new Set());
    } catch (error) {
      console.error('Failed to add cards:', error);
      notifications.error('Failed to add selected cards');
    }
  }, [onBulkAddCards, selectedCards, publicCards]);

  // Update filters
  const updateFilter = useCallback(
    (key: keyof CardLibraryFilters, value: string) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  // Load cards when filters change
  useEffect(() => {
    loadPublicCards();
  }, [loadPublicCards]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-700/50 p-4">
        <div className="mb-4 flex items-center gap-2">
          <Package2 className="h-5 w-5 text-cyan-400" />
          <h3 className={cn(typography.heading.h4, 'text-gray-100')}>
            Card Library
          </h3>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="cards" className="flex flex-1 flex-col">
        <div className="px-4 pt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cards" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Individual Cards
            </TabsTrigger>
            <TabsTrigger value="collections" className="gap-2">
              <Layers className="h-4 w-4" />
              Board Collections
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Individual Cards Tab */}
        <TabsContent value="cards" className="m-0 flex flex-1 flex-col">
          <div className="space-y-4 border-b border-gray-700/50 p-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {publicCards.length} cards
                {bulkMode &&
                  selectedCards.size > 0 &&
                  ` • ${selectedCards.size} selected`}
              </Badge>

              {/* Bulk Operations Toggle */}
              <Button
                size="sm"
                variant={bulkMode ? 'default' : 'outline'}
                onClick={toggleBulkMode}
                className="gap-2"
              >
                {bulkMode ? (
                  <>
                    <X className="h-4 w-4" />
                    Exit Bulk
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Bulk Select
                  </>
                )}
              </Button>
            </div>

            {/* Bulk Actions Bar */}
            {bulkMode && (
              <div className="space-y-3 rounded-lg border border-gray-700/50 bg-gray-800/50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={selectAllCards}
                      disabled={publicCards.length === 0}
                      className="gap-2"
                    >
                      <Check className="h-3 w-3" />
                      Select All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearSelection}
                      disabled={selectedCards.size === 0}
                      className="gap-2"
                    >
                      <X className="h-3 w-3" />
                      Clear
                    </Button>
                  </div>

                  <Badge variant="secondary" className="text-xs">
                    {selectedCards.size} / {publicCards.length} selected
                  </Badge>
                </div>

                {/* Collection Validation */}
                {selectedCards.size > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      {selectedCards.size < COLLECTION_LIMITS.MIN_CARDS && (
                        <span className="text-red-400">
                          Need at least {COLLECTION_LIMITS.MIN_CARDS} cards
                          (minimum collection size)
                        </span>
                      )}
                      {selectedCards.size >= COLLECTION_LIMITS.MIN_CARDS &&
                        selectedCards.size <= COLLECTION_LIMITS.MAX_CARDS && (
                          <span className="text-green-400">
                            Valid collection size
                          </span>
                        )}
                      {selectedCards.size > COLLECTION_LIMITS.MAX_CARDS && (
                        <span className="text-red-400">
                          Too many cards (maximum {COLLECTION_LIMITS.MAX_CARDS})
                        </span>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={handleBulkAdd}
                      disabled={
                        selectedCards.size < COLLECTION_LIMITS.MIN_CARDS ||
                        selectedCards.size > COLLECTION_LIMITS.MAX_CARDS ||
                        !onBulkAddCards
                      }
                      className={cn(
                        buttonVariants({ variant: 'primary', size: 'sm' }),
                        'gap-2'
                      )}
                    >
                      <Plus className="h-3 w-3" />
                      Add {selectedCards.size} Cards
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                value={filters.search}
                onChange={e => updateFilter('search', e.target.value)}
                placeholder="Search cards..."
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
                  updateFilter(
                    'sortBy',
                    value as 'newest' | 'popular' | 'trending'
                  )
                }
              >
                <SelectTrigger className="w-32 border-gray-700 bg-gray-800/50">
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
                onClick={loadPublicCards}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw
                  className={cn('h-4 w-4', loading && 'animate-spin')}
                />
                Refresh
              </Button>
            </div>

            {/* Shuffle Button */}
            <Button
              onClick={handleShuffle}
              disabled={shuffling || publicCards.length === 0}
              className={cn(
                buttonVariants({ variant: 'primary' }),
                'w-full gap-2'
              )}
            >
              {shuffling ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Shuffle className="h-4 w-4" />
              )}
              {shuffling
                ? 'Generating...'
                : `Shuffle Random Board (${gridSize}x${gridSize})`}
            </Button>
          </div>

          {/* Cards List */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : publicCards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-800/50">
                    <Package2 className="h-10 w-10 text-gray-600" />
                  </div>
                  <p
                    className={cn(typography.body.normal, 'mb-2 text-gray-400')}
                  >
                    No public cards found
                  </p>
                  <p className={cn(typography.caption, 'text-gray-500')}>
                    Try adjusting your search or filters
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {publicCards.map(card => (
                    <LibraryCard
                      key={card.id}
                      card={card}
                      onSelect={() => onCardSelect(card)}
                      bulkMode={bulkMode}
                      isSelected={selectedCards.has(card.id)}
                      onToggleSelection={() => toggleCardSelection(card.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Board Collections Tab */}
        <TabsContent value="collections" className="m-0 flex-1">
          <BoardCollections
            gameType={gameType}
            onUseCollection={handleUseCollection}
            onShuffleFromCollections={handleShuffleFromCollections}
            gridSize={gridSize}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Individual library card component
interface LibraryCardProps {
  card: BingoCard;
  onSelect: () => void;
  bulkMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

const LibraryCard = React.memo(function LibraryCard({
  card,
  onSelect,
  bulkMode,
  isSelected,
  onToggleSelection,
}: LibraryCardProps) {
  const handleClick = useCallback(() => {
    if (bulkMode && onToggleSelection) {
      onToggleSelection();
    } else {
      onSelect();
    }
  }, [bulkMode, onToggleSelection, onSelect]);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection?.();
  }, [onToggleSelection]);

  return (
    <div
      className={cn(
        cardVariants({ variant: 'interactive', size: 'sm' }),
        'group cursor-pointer p-3 transition-all duration-200',
        bulkMode && isSelected
          ? 'border-cyan-500 bg-cyan-500/10'
          : 'hover:border-cyan-500/50'
      )}
      onClick={handleClick}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {bulkMode && (
            <Checkbox
              checked={isSelected}
              onClick={handleCheckboxClick}
              className="mr-2"
            />
          )}
          <Badge
            className={cn(
              'px-2 py-0.5 text-xs',
              getDifficultyStyles(card.difficulty)
            )}
          >
            {card.difficulty}
          </Badge>
          {card.votes && card.votes > 0 && (
            <div className="flex items-center gap-1 text-yellow-400">
              <Star className="h-3 w-3 fill-current" />
              <span className="text-xs">{card.votes}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {bulkMode && isSelected && (
            <Check className="h-4 w-4 text-cyan-400" />
          )}
          <Sparkles className="h-4 w-4 text-gray-500 transition-colors group-hover:text-cyan-400" />
        </div>
      </div>

      <h4
        className={cn(
          typography.body.normal,
          'mb-1 line-clamp-1 font-medium text-gray-100'
        )}
      >
        {card.title}
      </h4>

      {card.description && (
        <p
          className={cn(
            typography.body.small,
            'mb-2 line-clamp-2 text-gray-400'
          )}
        >
          {card.description}
        </p>
      )}

      {card.tags && card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.tags.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="rounded bg-gray-700/50 px-1.5 py-0.5 text-xs text-gray-400"
            >
              {tag}
            </span>
          ))}
          {card.tags.length > 3 && (
            <span className="text-xs text-gray-500">
              +{card.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
