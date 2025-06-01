'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BingoCard as BingoCardType } from '@/types';
import { Edit, ChevronDown, GripVertical, Plus, Hash } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useDraggable } from '@dnd-kit/core';
import { 
  cardVariants,
  getDifficultyStyles,
  typography,
  animations,
  buttonVariants,
} from './design-system';

interface BingoCardProps {
  card: BingoCardType;
  onSelect?: (card: BingoCardType) => void;
  onEdit?: (card: BingoCardType) => void;
}

export function BingoCardPreview({ card, onSelect, onEdit }: BingoCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: card.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "w-full",
        animations.transition.default,
        isDragging && "opacity-50 scale-95"
      )}
    >
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="w-full"
      >
        <CollapsibleTrigger asChild>
          <Card
            className={cn(
              cardVariants({ variant: 'interactive' }),
              "group w-full",
              isOpen && "rounded-b-none border-b-0 border-cyan-500/60"
            )}
          >
            <CardContent className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  {...listeners}
                  {...attributes}
                  className={cn(
                    "shrink-0 p-1 rounded",
                    "text-gray-500 hover:text-cyan-400",
                    "hover:bg-gray-700/50",
                    "cursor-grab active:cursor-grabbing",
                    animations.transition.fast
                  )}
                  onClick={e => e.stopPropagation()}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <span className={cn(
                  typography.body.normal,
                  "truncate text-gray-100"
                )}>
                  {card.title}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge 
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    getDifficultyStyles(card.difficulty)
                  )}
                >
                  {card.difficulty}
                </Badge>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-gray-500",
                    animations.transition.default,
                    isOpen && "rotate-180"
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <Card className={cn(
            cardVariants({ variant: 'default' }),
            "rounded-t-none border-t-0 border-cyan-500/60"
          )}>
            <CardContent className="p-4 space-y-3">
              {/* Description */}
              {card.description && (
                <div className="space-y-1">
                  <label className={cn(typography.label, "text-gray-500")}>
                    Description
                  </label>
                  <p className={cn(typography.body.small, "text-gray-300")}>
                    {card.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {card.tags && card.tags.length > 0 && (
                <div className="space-y-1">
                  <label className={cn(typography.label, "text-gray-500")}>
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {card.tags.map((tag, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-xs border-gray-600 text-gray-400"
                      >
                        <Hash className="w-3 h-3 mr-1" />
                        {tag}
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
                {card.is_public && (
                  <span>🌍 Public</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {onSelect && (
                  <Button
                    onClick={() => onSelect(card)}
                    className={cn(buttonVariants({ variant: 'primary', size: 'sm' }))}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add to Grid
                  </Button>
                )}
                {onEdit && (
                  <Button
                    onClick={() => onEdit(card)}
                    className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
                  >
                    <Edit className="w-4 h-4 mr-1" />
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
}

// Create new card placeholder component
export function CreateCardPlaceholder({ onClick }: { onClick: () => void }) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        cardVariants({ variant: 'ghost' }),
        "border-2 border-dashed border-gray-600/40",
        "hover:border-cyan-500/40 hover:bg-gray-800/40",
        "cursor-pointer group",
        animations.transition.default
      )}
    >
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <div className={cn(
          "w-12 h-12 rounded-full mb-3",
          "bg-cyan-500/20 group-hover:bg-cyan-500/30",
          "flex items-center justify-center",
          animations.transition.default
        )}>
          <Plus className="w-6 h-6 text-cyan-400" />
        </div>
        <p className={cn(typography.body.normal, "text-gray-400 group-hover:text-gray-300")}>
          Create New Card
        </p>
        <p className={cn(typography.caption, "mt-1")}>
          Click to add a custom card
        </p>
      </CardContent>
    </Card>
  );
}

// TODO: Ensure BingoCard type from database includes all necessary fields
// TODO: Add optimistic updates for card voting when Supabase schema supports it
// TODO: Consider adding card preview tooltips for better UX