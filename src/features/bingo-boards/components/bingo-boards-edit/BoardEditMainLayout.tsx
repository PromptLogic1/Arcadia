import React, { lazy, Suspense } from 'react';
import { Card } from '@/components/ui/Card';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

// Components - Dynamic import for heavy BingoGrid component
const BingoGrid = lazy(() =>
  import('./BingoGrid').then(module => ({ default: module.BingoGrid }))
);

// Design System
import { cardVariants, getDifficultyStyles } from './design-system';

// Types
import type { BingoCard } from '@/types';

interface BoardEditMainLayoutProps {
  // View state
  activeView: 'grid' | 'list';
  showCardPanel: boolean;

  // Grid data
  gridCards: BingoCard[];
  gridSize: number;
  isLoading: boolean;

  // Handlers
  onCardClick: (card: BingoCard, index: number) => void;
  onRemoveCard: (index: number) => void;
}

/**
 * Main layout component for the board editor
 * Handles the primary content area with grid/list view
 */
export function BoardEditMainLayout({
  activeView,
  showCardPanel,
  gridCards,
  gridSize,
  isLoading,
  onCardClick,
  onRemoveCard,
}: BoardEditMainLayoutProps) {
  return (
    <div
      className={cn(
        'transition-all duration-300',
        !showCardPanel && 'lg:col-span-2'
      )}
    >
      {activeView === 'grid' ? (
        <Suspense
          fallback={
            <Card className={cardVariants({ variant: 'default' })}>
              <div className="grid grid-cols-3 gap-4 p-6 sm:grid-cols-4 md:grid-cols-5">
                {Array.from({ length: gridSize * gridSize }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            </Card>
          }
        >
          <BingoGrid
            gridCards={gridCards}
            gridSize={gridSize}
            isLoading={isLoading}
            onCardClick={onCardClick}
            onRemoveCard={onRemoveCard}
          />
        </Suspense>
      ) : (
        <Card className={cardVariants({ variant: 'default' })}>
          {/* Improved scrolling with proper viewport height calculation */}
          <ScrollArea className="h-[calc(100vh-300px)] max-h-[800px] min-h-[400px] p-6">
            <div className="space-y-2">
              {gridCards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-800/50">
                    <GridIcon className="h-10 w-10 text-gray-600" />
                  </div>
                  <p className="mb-2 text-gray-400">No cards in the grid yet</p>
                  <p className="text-sm text-gray-500">
                    Add cards from the library or create custom ones
                  </p>
                </div>
              ) : (
                gridCards.map(
                  (card, index) =>
                    card.id &&
                    card.title.trim() && (
                      <div
                        key={`list-${index}-${card.id}`}
                        className="cursor-pointer rounded-lg border border-transparent bg-gray-800/50 p-4 transition-all duration-200 hover:border-cyan-500/30 hover:bg-gray-800/70"
                        onClick={() => onCardClick(card, index)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex items-center gap-2">
                              <h4 className="truncate font-medium text-gray-100">
                                {card.title}
                              </h4>
                              <Badge
                                className={cn(
                                  'flex-shrink-0 px-2 py-0.5 text-xs',
                                  getDifficultyStyles(card.difficulty)
                                )}
                              >
                                {card.difficulty}
                              </Badge>
                            </div>
                            {card.description && (
                              <p className="line-clamp-2 text-sm text-gray-400">
                                {card.description}
                              </p>
                            )}
                            {card.tags && card.tags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {card.tags
                                  .slice(0, 3)
                                  .map((tag: string, i: number) => (
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
                          <div className="ml-4 flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              Position {index + 1}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                )
              )}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}

// Simple Grid icon component for empty state
function GridIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  );
}
