import React, { useCallback, useState, useEffect } from 'react';
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
  Search as _Search,
  Shuffle,
  Star,
  TrendingUp as _TrendingUp,
  Clock as _Clock,
  Package2,
  Sparkles as _Sparkles,
  RefreshCw,
  Layers as _Layers,
  Plus,
  Check as _Check,
  X,
} from 'lucide-react';

// Modern architecture imports
import { useCardLibrary } from '../../hooks/useCardLibrary';
import { useCardLibraryVirtualization } from '../../hooks/useCardLibraryVirtualization';

// Types
import type { BingoCard, GameCategory, Difficulty } from '@/types';
import type { VirtualItem } from '@tanstack/react-virtual';

// Design System
import {
  typography,
  buttonVariants,
  cardVariants,
  getDifficultyStyles,
} from './design-system';

interface CardLibraryProps {
  gameType: GameCategory;
  onCardSelect: (card: BingoCard) => void;
  onShuffle: (cards: BingoCard[]) => Promise<void>;
  onUseCollection?: (cards: BingoCard[]) => Promise<void>;
  onBulkAddCards?: (cards: BingoCard[]) => Promise<void>;
  gridSize: number;
}

/**
 * Modern Card Library Component
 * Uses TanStack Query + Zustand architecture
 */
export function CardLibrary({
  gameType,
  onCardSelect,
  onShuffle,
  onUseCollection,
  onBulkAddCards,
  gridSize,
}: CardLibraryProps) {
  // Use modern hook that combines TanStack Query + Zustand
  const {
    // Server state
    publicCards,
    totalCount,
    hasMore,
    featuredCollections,

    // Loading states
    isLoading,
    isShuffling,
    hasError,

    // UI state
    bulkMode,
    selectedCards,
    selectedCardsArray,
    activeTab,
    filters,
    currentPage,

    // Actions
    handleFilterChange,
    handlePageChange,
    handleCardToggle,
    setBulkMode,
    setActiveTab,
    clearSelectedCards,
    refetchCards,
    isCreatingBulkCards,
  } = useCardLibrary({ gameType });

  // Responsive columns calculation
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setColumns(1); // Mobile
      } else if (width < 1024) {
        setColumns(2); // Tablet
      } else {
        setColumns(3); // Desktop
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Setup virtualization for cards grid
  const { containerRef, virtualizer, getCardAtIndex } =
    useCardLibraryVirtualization({
      cards: publicCards,
      columns,
    });

  // Handle shuffle action
  const handleShuffleClick = useCallback(async () => {
    if (publicCards.length === 0) {
      return;
    }

    // Filter cards based on current difficulty if set
    let availableCards = publicCards;
    if (filters.difficulty !== 'all') {
      availableCards = publicCards.filter(
        card => card.difficulty === filters.difficulty
      );
    }

    if (availableCards.length === 0) {
      return;
    }

    // Shuffle and select random cards
    const shuffledCards = [...availableCards].sort(() => Math.random() - 0.5);
    const selectedCards = shuffledCards.slice(0, gridSize * gridSize);

    // If we don't have enough cards, duplicate some
    while (selectedCards.length < gridSize * gridSize) {
      const remainingNeeded = gridSize * gridSize - selectedCards.length;
      const additionalCards = shuffledCards.slice(0, remainingNeeded);
      selectedCards.push(...additionalCards);
    }

    await onShuffle(selectedCards);
  }, [publicCards, filters.difficulty, gridSize, onShuffle]);

  // Handle collection use
  const handleUseCollectionClick = useCallback(
    async (collectionCards: BingoCard[]) => {
      if (onUseCollection) {
        await onUseCollection(collectionCards);
      }
    },
    [onUseCollection]
  );

  // Handle bulk add
  const handleBulkAddClick = useCallback(async () => {
    if (selectedCardsArray.length > 0 && onBulkAddCards) {
      await onBulkAddCards(selectedCardsArray);
      clearSelectedCards();
      setBulkMode(false);
    }
  }, [selectedCardsArray, onBulkAddCards, clearSelectedCards, setBulkMode]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-700/50 p-4">
        <div className="mb-4 flex items-center gap-2">
          <h3 className={cn(typography.heading, 'text-cyan-100')}>
            Card Library
          </h3>
          <Badge
            variant="outline"
            className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
          >
            {totalCount} cards
          </Badge>

          {/* Bulk Operations Toggle */}
          <Button
            size="sm"
            variant={bulkMode ? 'default' : 'outline'}
            onClick={() => setBulkMode(!bulkMode)}
            className="ml-auto gap-2"
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

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[200px] flex-1">
            <Input
              placeholder="Search cards..."
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              className="border-gray-700 bg-gray-800/50"
            />
          </div>

          <Select
            value={filters.difficulty}
            onValueChange={value =>
              handleFilterChange('difficulty', value as Difficulty | 'all')
            }
          >
            <SelectTrigger className="w-[140px] border-gray-700 bg-gray-800/50">
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
              handleFilterChange(
                'sortBy',
                value as 'popular' | 'newest' | 'rating' | 'title'
              )
            }
          >
            <SelectTrigger className="w-[120px] border-gray-700 bg-gray-800/50">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleShuffleClick}
            disabled={isShuffling || publicCards.length === 0}
            className={cn(buttonVariants({ variant: 'primary' }), 'gap-2')}
          >
            {isShuffling ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Shuffle className="h-4 w-4" />
            )}
            Shuffle Board
          </Button>
        </div>

        {/* Bulk Actions */}
        {bulkMode && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3">
            <span className="text-sm text-cyan-300">
              {selectedCardsArray.length} cards selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={clearSelectedCards}>
                Clear
              </Button>
              <Button
                size="sm"
                onClick={handleBulkAddClick}
                disabled={
                  selectedCardsArray.length === 0 || isCreatingBulkCards
                }
              >
                {isCreatingBulkCards
                  ? 'Adding...'
                  : `Add ${selectedCardsArray.length} Cards`}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={value =>
            setActiveTab(value as 'library' | 'collections' | 'create')
          }
          className="flex h-full flex-col"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library">Card Library</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-4 flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : hasError ? (
              <div className="flex h-64 flex-col items-center justify-center text-gray-400">
                <p>Failed to load cards</p>
                <Button
                  variant="outline"
                  onClick={() => refetchCards()}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <div ref={containerRef} className="h-full overflow-auto">
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                    padding: '1rem',
                  }}
                >
                  {virtualizer
                    .getVirtualItems()
                    .map((virtualRow: VirtualItem) => {
                      return (
                        <div
                          key={virtualRow.key}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: '1rem',
                            right: '1rem',
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          <div
                            className="grid gap-3"
                            style={{
                              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                            }}
                          >
                            {Array.from({ length: columns }).map(
                              (_, colIndex) => {
                                const card = getCardAtIndex(
                                  virtualRow.index,
                                  colIndex
                                );
                                if (!card) return null;

                                return (
                                  <div
                                    key={card.id}
                                    className={cn(
                                      cardVariants({ variant: 'interactive' }),
                                      'cursor-pointer transition-all',
                                      selectedCards.has(card.id) &&
                                        'ring-2 ring-cyan-400'
                                    )}
                                    onClick={() => {
                                      if (bulkMode) {
                                        handleCardToggle(card.id);
                                      } else {
                                        onCardSelect(card);
                                      }
                                    }}
                                  >
                                    <div className="p-3">
                                      <div className="mb-2 flex items-start justify-between">
                                        <h4 className="line-clamp-2 text-sm font-medium text-cyan-100">
                                          {card.title}
                                        </h4>
                                        {bulkMode && (
                                          <Checkbox
                                            checked={selectedCards.has(card.id)}
                                            onChange={() =>
                                              handleCardToggle(card.id)
                                            }
                                            className="ml-2"
                                          />
                                        )}
                                      </div>

                                      {card.description && (
                                        <p className="mb-2 line-clamp-2 text-xs text-gray-400">
                                          {card.description}
                                        </p>
                                      )}

                                      <div className="flex items-center justify-between">
                                        <Badge
                                          variant="outline"
                                          className={getDifficultyStyles(
                                            card.difficulty
                                          )}
                                        >
                                          {card.difficulty}
                                        </Badge>
                                        <div className="flex items-center gap-1 text-xs text-gray-400">
                                          <Star className="h-3 w-3" />
                                          {card.votes || 0}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {/* Load More - positioned after virtual items */}
                  {hasMore && (
                    <div
                      className="p-4 text-center"
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                      }}
                    >
                      <Button
                        variant="outline"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={isLoading}
                      >
                        Load More
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="collections"
            className="mt-4 flex-1 overflow-hidden"
          >
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
                {featuredCollections.map((collection, index) => (
                  <div
                    key={index}
                    className={cn(cardVariants({ variant: 'default' }), 'p-4')}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-cyan-100">
                          {collection.name}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {collection.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleUseCollectionClick(collection.cards)
                        }
                        className={cn(buttonVariants({ variant: 'primary' }))}
                      >
                        Use Collection
                      </Button>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Package2 className="h-4 w-4" />
                        {collection.cardCount} cards
                      </div>
                      <Badge
                        variant="outline"
                        className={getDifficultyStyles(collection.difficulty)}
                      >
                        {collection.difficulty}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
