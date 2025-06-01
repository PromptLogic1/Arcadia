import React from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BingoCard, Difficulty } from '@/types';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { 
  cardVariants, 
  getDifficultyStyles, 
  componentStyles,
  layout,
  typography,
  animations,
  spacing,
} from './design-system';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
      <div className={cn(
        "min-h-[400px] flex items-center justify-center rounded-lg",
        componentStyles.gridCell.empty
      )}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={cn(
      "mx-auto rounded-xl p-6",
      "bg-gradient-to-br from-gray-900/50 via-gray-800/30 to-gray-900/50",
      "border border-cyan-500/20",
      "shadow-xl shadow-cyan-500/5",
      layout.grid.maxWidth
    )}>
      <div 
        className={cn(
          "grid grid-cols-5",
          layout.grid.gap,
          "place-items-center"
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
 */
function GridCard({ card, index, gridSize, onClick, onRemove }: GridCardProps) {
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

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Determine card variant and state
  const cardState = isDragging ? 'dragging' : isOver ? 'dragOver' : isEmpty ? 'empty' : 'default';
  const cardVariant = isEmpty ? 'droppable' : 'draggable';

  return (
    <TooltipProvider>
      <div
        ref={setNodeRef}
        style={style}
        {...(!isEmpty ? attributes : {})}
        data-over={isOver}
        className={cn(
          "relative aspect-square",
          layout.grid.cardSize,
          cardVariants({ 
            variant: cardVariant, 
            state: cardState,
            size: 'sm' 
          }),
          !isEmpty && isTemplate && componentStyles.gridCell.template,
          !isEmpty && !isTemplate && componentStyles.gridCell.custom,
          animations.transition.default
        )}
        onClick={isEmpty ? onClick : undefined}
        {...(!isEmpty ? listeners : { onClick })}
      >
        {/* Grid Position Indicator */}
        <div className={cn(
          "absolute -top-2 -left-2 z-20",
          "rounded-full px-2 py-0.5",
          "bg-gray-900/90 border border-gray-700/50",
          typography.mono,
          "text-gray-500"
        )}>
          {gridPosition}
        </div>

        {/* Remove Button */}
        {!isEmpty && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "absolute -top-2 -right-2 z-20",
                  "w-6 h-6 rounded-full",
                  "bg-red-500/20 border border-red-500/50",
                  "flex items-center justify-center",
                  "text-red-400 hover:text-red-300",
                  "hover:bg-red-500/30 hover:border-red-500",
                  animations.transition.fast,
                  "group"
                )}
                onClick={e => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <X className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Remove card
            </TooltipContent>
          </Tooltip>
        )}

        {/* Card Content */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <div className={cn(
              "w-12 h-12 rounded-full mb-3",
              "bg-gray-700/30 flex items-center justify-center"
            )}>
              <Sparkles className="w-6 h-6 text-gray-500" />
            </div>
            <p className={cn(typography.body.small, "text-gray-500")}>
              Drop card here
            </p>
            <p className={cn(typography.caption, "mt-1")}>
              or click to select
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full p-3">
            {/* Difficulty Badge */}
            <div className="flex justify-between items-start mb-2">
              <Badge 
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  getDifficultyStyles(card.difficulty)
                )}
              >
                {card.difficulty}
              </Badge>
              {isTemplate && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-400/50 text-blue-300">
                  Template
                </Badge>
              )}
            </div>

            {/* Card Title */}
            <h4 className={cn(
              typography.body.normal,
              "font-medium text-gray-100 mb-2",
              "line-clamp-2"
            )}>
              {card.title}
            </h4>

            {/* Card Description */}
            {card.description && (
              <p className={cn(
                typography.body.small,
                "text-gray-400 line-clamp-2"
              )}>
                {card.description}
              </p>
            )}

            {/* Tags */}
            {card.tags && card.tags.length > 0 && (
              <div className="mt-auto pt-2 flex flex-wrap gap-1">
                {card.tags.slice(0, 2).map((tag, i) => (
                  <span 
                    key={i}
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded",
                      "bg-gray-700/50 text-gray-400"
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
              <div className={cn(
                "absolute inset-0 rounded-lg",
                "bg-gradient-to-t from-gray-900/90 via-transparent to-transparent",
                "opacity-0 group-hover:opacity-100",
                "flex items-end justify-center p-3",
                "pointer-events-none",
                animations.transition.default
              )}>
                <p className={cn(
                  typography.caption,
                  "text-cyan-300"
                )}>
                  Click to edit • Drag to move
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// Re-export for backward compatibility
export { GridCard };