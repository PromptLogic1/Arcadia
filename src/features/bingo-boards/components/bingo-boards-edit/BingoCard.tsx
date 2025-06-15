'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { BingoCard as BingoCardType } from '@/types';
import {
  Edit,
  ChevronDown,
  GripVertical,
  Plus,
  Hash,
} from '@/components/ui/Icons';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/Collapsible';
import { useDraggable } from '@dnd-kit/core';
import {
  cardVariants,
  getDifficultyStyles,
  typography,
  animations,
  buttonVariants,
} from './design-system';
import { sanitizeCardContent, sanitizeDisplayName } from '@/lib/sanitization';

interface BingoCardProps {
  card: BingoCardType;
  onSelect?: (card: BingoCardType) => void;
  onEdit?: (card: BingoCardType) => void;
}

export const BingoCardPreview = React.memo<BingoCardProps>(
  ({ card, onSelect, onEdit }) => {
    const [isOpen, setIsOpen] = useState(false);

    const { attributes, listeners, setNodeRef, transform, isDragging } =
      useDraggable({
        id: card.id,
      });

    const style = transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
      : undefined;

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'w-full',
          animations.transition.default,
          isDragging && 'scale-95 opacity-50'
        )}
      >
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
          <CollapsibleTrigger asChild>
            <Card
              className={cn(
                cardVariants({ variant: 'interactive' }),
                'group w-full',
                isOpen && 'rounded-b-none border-b-0 border-cyan-500/60'
              )}
            >
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    {...listeners}
                    {...attributes}
                    className={cn(
                      'shrink-0 rounded p-1',
                      'text-gray-500 hover:text-cyan-400',
                      'hover:bg-gray-700/50',
                      'cursor-grab active:cursor-grabbing',
                      animations.transition.fast
                    )}
                    onClick={e => e.stopPropagation()}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <span
                    className={cn(
                      typography.body.normal,
                      'truncate text-gray-100'
                    )}
                  >
                    {sanitizeCardContent(card.title)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    className={cn(
                      'px-1.5 py-0 text-[10px]',
                      getDifficultyStyles(card.difficulty)
                    )}
                  >
                    {card.difficulty}
                  </Badge>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-gray-500',
                      animations.transition.default,
                      isOpen && 'rotate-180'
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </CollapsibleTrigger>

          <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
            <Card
              className={cn(
                cardVariants({ variant: 'default' }),
                'rounded-t-none border-t-0 border-cyan-500/60'
              )}
            >
              <CardContent className="space-y-3 p-4">
                {/* Description */}
                {card.description && (
                  <div className="space-y-1">
                    <label className={cn(typography.label, 'text-gray-500')}>
                      Description
                    </label>
                    <p className={cn(typography.body.small, 'text-gray-300')}>
                      {sanitizeCardContent(card.description)}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {card.tags && card.tags.length > 0 && (
                  <div className="space-y-1">
                    <label className={cn(typography.label, 'text-gray-500')}>
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {card.tags.map((tag: string, i: number) => (
                        <Badge
                          key={i}
                          variant="cyber"
                          className="border-gray-600 text-xs text-gray-400"
                        >
                          <Hash className="mr-1 h-3 w-3" />
                          {sanitizeDisplayName(tag)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {card.votes !== null && card.votes > 0 && (
                    <span>👍 {card.votes} votes</span>
                  )}
                  {card.is_public && <span>🌍 Public</span>}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {onSelect && (
                    <Button
                      onClick={() => onSelect(card)}
                      className={cn(
                        buttonVariants({ variant: 'primary', size: 'sm' })
                      )}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add to Grid
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      onClick={() => onEdit(card)}
                      className={cn(
                        buttonVariants({ variant: 'secondary', size: 'sm' })
                      )}
                    >
                      <Edit className="mr-1 h-4 w-4" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for optimal performance
    return (
      prevProps.card.id === nextProps.card.id &&
      prevProps.card.title === nextProps.card.title &&
      prevProps.card.description === nextProps.card.description &&
      prevProps.card.updated_at === nextProps.card.updated_at &&
      prevProps.card.votes === nextProps.card.votes &&
      prevProps.card.is_public === nextProps.card.is_public &&
      // Only check if both functions exist or both don't exist
      Boolean(prevProps.onSelect) === Boolean(nextProps.onSelect) &&
      Boolean(prevProps.onEdit) === Boolean(nextProps.onEdit)
    );
  }
);

BingoCardPreview.displayName = 'BingoCardPreview';

// Create new card placeholder component
export const CreateCardPlaceholder = React.memo<{ onClick: () => void }>(
  ({ onClick }) => {
    return (
      <Card
        onClick={onClick}
        className={cn(
          cardVariants({ variant: 'ghost' }),
          'border-2 border-dashed border-gray-600/40',
          'hover:border-cyan-500/40 hover:bg-gray-800/40',
          'group cursor-pointer',
          animations.transition.default
        )}
      >
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <div
            className={cn(
              'mb-3 h-12 w-12 rounded-full',
              'bg-cyan-500/20 group-hover:bg-cyan-500/30',
              'flex items-center justify-center',
              animations.transition.default
            )}
          >
            <Plus className="h-6 w-6 text-cyan-400" />
          </div>
          <p
            className={cn(
              typography.body.normal,
              'text-gray-400 group-hover:text-gray-300'
            )}
          >
            Create New Card
          </p>
          <p className={cn(typography.caption, 'mt-1')}>
            Click to add a custom card
          </p>
        </CardContent>
      </Card>
    );
  }
);

CreateCardPlaceholder.displayName = 'CreateCardPlaceholder';

// TODO: Ensure BingoCard type from database includes all necessary fields
// TODO: Add optimistic updates for card voting when Supabase schema supports it
// TODO: Consider adding card preview tooltips for better UX
