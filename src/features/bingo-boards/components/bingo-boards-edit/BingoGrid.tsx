import React from 'react';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DIFFICULTY_STYLES } from '@/types';
import { BOARD_EDIT_LAYOUT } from './constants';
import type { BingoCard, Difficulty } from '@/types';

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
          key={card.id || index}
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

  return (
    <Card
      className={cn(
        'aspect-square cursor-pointer bg-gray-800/50 p-2 transition-colors hover:bg-gray-800/70',
        'relative',
        `h-[${BOARD_EDIT_LAYOUT.GRID_CARD.HEIGHT}] w-[${BOARD_EDIT_LAYOUT.GRID_CARD.WIDTH}]`,
        isEmpty ? 'border-gray-600/20' : 'border-cyan-500/20'
      )}
      onClick={onClick}
    >
      {/* Grid Position Indicator */}
      <div className="absolute left-1 top-1 z-10 rounded bg-gray-900/50 px-1 font-mono text-xs text-gray-500">
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
  return (
    <div className="flex h-full flex-col items-center pt-6">
      {/* Difficulty indicator */}
      <div
        className={cn(
          'w-full border-b border-gray-700 pb-1 text-center text-xs',
          DIFFICULTY_STYLES[card.difficulty as Difficulty]
        )}
      >
        {card.difficulty}
      </div>

      {/* Card title */}
      <div
        className="overflow-break-word flex flex-1 items-center justify-center break-words px-1 text-center text-sm"
        style={{ wordBreak: 'break-word' }}
      >
        {card.title}
      </div>

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
