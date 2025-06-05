import React from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BingoCard } from '@/types';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import {
  cardVariants,
  getDifficultyStyles,
  componentStyles,
  layout,
  typography,
  animations,
} from './design-system';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BingoGridProps {
  gridCards: BingoCard[];
  gridSize: number;
  isLoading: boolean;
  onCardClick: (card: BingoCard, index: number) => void;
  onRemoveCard: (index: number) => void;
}

/**
 * Bingo grid display component
 * Renders the interactive grid of bingo cards with editing capabilities
 */
export function BingoGrid({
  gridCards,
  gridSize,
  isLoading,
  onCardClick,
  onRemoveCard,
}: BingoGridProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          'flex min-h-[400px] items-center justify-center rounded-lg',
          componentStyles.gridCell.empty
        )}
      >
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'mx-auto rounded-xl p-6',
        'bg-gradient-to-br from-gray-900/50 via-gray-800/30 to-gray-900/50',
        'border border-cyan-500/20',
        'shadow-xl shadow-cyan-500/5',
        layout.grid.maxWidth
      )}
    >
      <div
        className={cn(
          'grid grid-cols-5',
          layout.grid.gap,
          'place-items-center'
        )}
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        }}
      >
        {gridCards.map((card, index) => (
          <GridCard
            key={`grid-${index}-${card.id || 'empty'}`}
            card={card}
            index={index}
            gridSize={gridSize}
            onClick={() => onCardClick(card, index)}
            onRemove={() => onRemoveCard(index)}
          />
        ))}
      </div>
    </div>
  );
}

interface GridCardProps {
  card: BingoCard;
  index: number;
  gridSize: number;
  onClick: () => void;
  onRemove: () => void;
}

/**
 * Individual card component within the grid
 * Handles card display, position indicator, and remove functionality
 * Optimized with React.memo for better performance during frequent updates
 */
const GridCard = React.memo(
  function GridCard({
    card,
    index,
    gridSize,
    onClick,
    onRemove,
  }: GridCardProps) {
    const gridPosition = `${Math.floor(index / gridSize) + 1}-${(index % gridSize) + 1}`;
    const isEmpty = !card.id;
    const isTemplate = card.title && !card.creator_id?.startsWith('user-');

    // Droppable functionality (for accepting cards)
    const { isOver, setNodeRef: setDropRef } = useDroppable({
      id: `grid-${index}`,
    });

    // Draggable functionality (for populated cards)
    const {
      attributes,
      listeners,
      setNodeRef: setDragRef,
      transform,
      isDragging,
    } = useDraggable({
      id: `grid-${index}`,
      disabled: isEmpty,
    });

    // Combine refs for cards that can be both dragged and dropped
    const setNodeRef = (node: HTMLElement | null) => {
      setDropRef(node);
      if (!isEmpty) {
        setDragRef(node);
      }
    };

    const style = transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
      : undefined;

    // Determine card variant and state
    const cardState = isDragging
      ? 'dragging'
      : isOver
        ? 'dragOver'
        : isEmpty
          ? 'empty'
          : 'default';
    const cardVariant = isEmpty ? 'droppable' : 'draggable';

    return (
      <TooltipProvider>
        <div
          ref={setNodeRef}
          style={style}
          {...(!isEmpty ? attributes : {})}
          data-over={isOver}
          className={cn(
            'relative aspect-square cursor-pointer',
            layout.grid.cardSize,
            cardVariants({
              variant: cardVariant,
              state: cardState,
              size: 'sm',
            }),
            !isEmpty && isTemplate && componentStyles.gridCell.template,
            !isEmpty && !isTemplate && componentStyles.gridCell.custom,
            animations.transition.default
          )}
          onClick={onClick}
          {...(!isEmpty ? listeners : {})}
        >
          {/* Grid Position Indicator */}
          <div
            className={cn(
              'absolute -top-2 -left-2 z-20',
              'rounded-full px-2 py-0.5',
              'border border-gray-700/50 bg-gray-900/90',
              typography.mono,
              'text-gray-500'
            )}
          >
            {gridPosition}
          </div>

          {/* Remove Button */}
          {!isEmpty && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    'absolute -top-2 -right-2 z-20',
                    'h-6 w-6 rounded-full',
                    'border border-red-500/50 bg-red-500/20',
                    'flex items-center justify-center',
                    'text-red-400 hover:text-red-300',
                    'hover:border-red-500 hover:bg-red-500/30',
                    animations.transition.fast,
                    'group'
                  )}
                  onClick={e => {
                    e.stopPropagation();
                    onRemove();
                  }}
                >
                  <X className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Remove card
              </TooltipContent>
            </Tooltip>
          )}

          {/* Card Content */}
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
              <div
                className={cn(
                  'mb-3 h-12 w-12 rounded-full',
                  'flex items-center justify-center bg-gray-700/30'
                )}
              >
                <Sparkles className="h-6 w-6 text-gray-500" />
              </div>
              <p className={cn(typography.body.small, 'text-gray-500')}>
                Drop card here
              </p>
              <p className={cn(typography.caption, 'mt-1')}>
                or click to select
              </p>
            </div>
          ) : (
            <div className="flex h-full flex-col p-3">
              {/* Difficulty Badge */}
              <div className="mb-2 flex items-start justify-between">
                <Badge
                  className={cn(
                    'px-1.5 py-0 text-[10px]',
                    getDifficultyStyles(card.difficulty)
                  )}
                >
                  {card.difficulty}
                </Badge>
                {isTemplate && (
                  <Badge
                    variant="outline"
                    className="border-blue-400/50 px-1.5 py-0 text-[10px] text-blue-300"
                  >
                    Template
                  </Badge>
                )}
              </div>

              {/* Card Title */}
              <h4
                className={cn(
                  typography.body.normal,
                  'mb-2 font-medium text-gray-100',
                  'line-clamp-2'
                )}
              >
                {card.title}
              </h4>

              {/* Card Description */}
              {card.description && (
                <p
                  className={cn(
                    typography.body.small,
                    'line-clamp-2 text-gray-400'
                  )}
                >
                  {card.description}
                </p>
              )}

              {/* Tags */}
              {card.tags && card.tags.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-1 pt-2">
                  {card.tags.slice(0, 2).map((tag: string, i: number) => (
                    <span
                      key={i}
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px]',
                        'bg-gray-700/50 text-gray-400'
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                  {card.tags.length > 2 && (
                    <span className="text-[10px] text-gray-500">
                      +{card.tags.length - 2}
                    </span>
                  )}
                </div>
              )}

              {/* Hover Action Hint */}
              {!isEmpty && (
                <div
                  className={cn(
                    'absolute inset-0 rounded-lg',
                    'bg-gradient-to-t from-gray-900/90 via-transparent to-transparent',
                    'opacity-0 group-hover:opacity-100',
                    'flex items-end justify-center p-3',
                    'pointer-events-none',
                    animations.transition.default
                  )}
                >
                  <p className={cn(typography.caption, 'text-cyan-300')}>
                    Click to edit • Drag to move
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </TooltipProvider>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for optimal performance
    return (
      prevProps.card.id === nextProps.card.id &&
      prevProps.index === nextProps.index &&
      prevProps.gridSize === nextProps.gridSize &&
      prevProps.card.title === nextProps.card.title &&
      prevProps.card.difficulty === nextProps.card.difficulty &&
      prevProps.card.description === nextProps.card.description &&
      JSON.stringify(prevProps.card.tags) ===
        JSON.stringify(nextProps.card.tags)
    );
  }
);

// Re-export for backward compatibility
export { GridCard };
