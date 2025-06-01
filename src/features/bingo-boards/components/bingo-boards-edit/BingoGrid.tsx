import React from 'react';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DIFFICULTY_STYLES } from '@/types';
import { BOARD_EDIT_LAYOUT } from './constants';
import type { BingoCard, Difficulty } from '@/types';
import { useDroppable, useDraggable } from '@dnd-kit/core';

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
      <div className="min-h-[400px] items-center justify-center rounded-lg bg-gray-800/20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex flex-wrap gap-2 rounded-lg bg-gray-900/30 p-4"
      style={{
        maxWidth: `${gridSize * BOARD_EDIT_LAYOUT.GRID_SPACING}px`,
        justifyContent: 'center',
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
  const isTemplate = card.title && !card.creator_id?.startsWith('user-'); // Template cards have template IDs
  
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
    id: `grid-${index}`, // Use grid position as ID to avoid duplicate ID issues
    disabled: isEmpty, // Only allow dragging if card exists
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

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...(!isEmpty ? attributes : {})}
      className={cn(
        'group relative aspect-square p-2 transition-all duration-200',
        'flex flex-col justify-between',
        `h-[${BOARD_EDIT_LAYOUT.GRID_CARD.HEIGHT}] w-[${BOARD_EDIT_LAYOUT.GRID_CARD.WIDTH}]`,
        // Cursor styling
        isEmpty && 'cursor-pointer',
        !isEmpty && 'cursor-grab active:cursor-grabbing',
        // Background and border styling
        isEmpty && 'border-2 border-dashed border-gray-600/40 bg-gray-800/20',
        !isEmpty && isTemplate && 'border border-blue-400/30 bg-gradient-to-br from-blue-900/20 to-blue-800/10',
        !isEmpty && !isTemplate && 'border border-cyan-500/30 bg-gradient-to-br from-cyan-900/20 to-cyan-800/10',
        // Hover states
        isEmpty && 'hover:border-gray-500/60 hover:bg-gray-800/40',
        !isEmpty && !isDragging && 'hover:shadow-lg hover:scale-[1.02]',
        // Drag state
        isDragging && 'opacity-50 scale-95',
        // Drop state
        isOver && isEmpty && 'border-purple-500/80 bg-purple-500/20 border-solid',
        isOver && !isEmpty && 'border-purple-500/80 bg-purple-500/30 shadow-purple-500/20 shadow-lg',
      )}
      onClick={isEmpty ? onClick : undefined}
      {...(!isEmpty ? listeners : { onClick })}
    >
      {/* Grid Position Indicator */}
      <div className="absolute top-1 left-1 z-10 rounded bg-gray-900/50 px-1 font-mono text-xs text-gray-500">
        {gridPosition}
      </div>

      {/* Remove Button */}
      {!isEmpty && (
        <div
          className="absolute z-10 cursor-pointer rounded border border-red-500/20 bg-gray-900/50 px-1 font-mono text-xs text-red-400 hover:bg-red-500/20"
          style={{ top: '0.25rem', right: '0.5rem' }}
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="inline-block h-4 w-4" />
        </div>
      )}

      {/* Card Content */}
      {!isEmpty ? <CardContent card={card} /> : <EmptyCardPlaceholder />}
    </Card>
  );
}

/**
 * Content display for populated cards
 */
function CardContent({ card }: { card: BingoCard }) {
  const isTemplate = !card.creator_id?.startsWith('user-');
  
  return (
    <div className="flex h-full flex-col items-center pt-6">
      {/* Template indicator */}
      {isTemplate && (
        <div className="absolute top-1 right-1 z-10 rounded bg-blue-500/20 px-1 text-xs text-blue-300">
          Template
        </div>
      )}
      
      {/* Difficulty indicator */}
      <div
        className={cn(
          'w-full border-b border-gray-700 pb-1 text-center text-xs',
          DIFFICULTY_STYLES[card.difficulty as Difficulty],
          isTemplate && 'border-blue-400/30'
        )}
      >
        {card.difficulty}
      </div>

      {/* Card title */}
      <div
        className={cn(
          'overflow-break-word flex flex-1 items-center justify-center px-1 text-center text-sm break-words',
          isTemplate ? 'text-blue-200' : 'text-cyan-200'
        )}
        style={{ wordBreak: 'break-word' }}
      >
        {card.title}
      </div>
      
      {/* Description for templates */}
      {isTemplate && card.description && (
        <div className="mt-1 text-xs text-blue-300/70 text-center opacity-0 group-hover:opacity-100 transition-opacity">
          {card.description.length > 30 ? `${card.description.slice(0, 30)}...` : card.description}
        </div>
      )}

      {/* Tags */}
      <div className="w-full border-t border-gray-700 pt-1 text-center text-xs text-gray-400">
        {card.tags?.join(', ') || 'No tags'}
      </div>
    </div>
  );
}

/**
 * Placeholder for empty grid positions
 */
function EmptyCardPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center pt-6 text-center text-gray-400">
      Click Me for Card Creation
    </div>
  );
}
