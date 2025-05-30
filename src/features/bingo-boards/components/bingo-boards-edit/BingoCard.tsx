'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BingoCard as BingoCardType } from '@/types';
import { DIFFICULTY_STYLES } from '@/types';
import { Edit, ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface BingoCardProps {
  card: BingoCardType;
  onSelect?: (card: BingoCardType) => void;
  onEdit?: (card: BingoCardType) => void;
}

export function BingoCardPreview({ card, onSelect, onEdit }: BingoCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="w-full rounded-lg bg-gray-900/30"
      >
        <CollapsibleTrigger asChild>
          <Card
            className={cn(
              'bg-gradient-to-br from-gray-800/95 to-gray-800/75',
              'border border-cyan-500/20 hover:border-cyan-500/40',
              'group w-full cursor-pointer transition-all duration-300',
              isOpen && 'rounded-b-none border-b-0 border-cyan-500/60'
            )}
          >
            <CardContent className="flex items-center justify-between p-2">
              <span
                className="mr-2 flex-1 truncate text-sm text-cyan-300/90"
                style={{ wordBreak: 'break-word' }}
              >
                {card.title}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    DIFFICULTY_STYLES[card.difficulty]
                  )}
                >
                  {card.difficulty}
                </Badge>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-cyan-400/70 transition-transform duration-200',
                    isOpen && 'rotate-180 transform'
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="rounded-b-lg border-x border-b border-cyan-500/20 p-3">
            <div className="mb-4 space-y-2">
              <div className="w-full">
                <span className="block text-xs font-medium text-cyan-400">
                  Title:
                </span>
                <p
                  className="overflow-break-word line-clamp-3 break-words text-sm text-gray-300"
                  style={{ wordBreak: 'break-word' }}
                >
                  {card.title}
                </p>
              </div>

              {card.description && (
                <div className="w-full max-w-[270px]">
                  <span className="block text-xs font-medium text-cyan-400">
                    Description:
                  </span>
                  <p
                    className="line-clamp-3 text-sm text-gray-300"
                    style={{ wordBreak: 'break-word' }}
                  >
                    {card.description}
                  </p>
                </div>
              )}

              <div className="grid w-[270px] grid-cols-2 gap-2">
                <div className="overflow-hidden">
                  <span className="block text-xs font-medium text-cyan-400">
                    Game:
                  </span>
                  <p className="break-words text-sm text-gray-300">
                    {card.game_type}
                  </p>
                </div>

                <div className="overflow-hidden">
                  <span className="block text-xs font-medium text-cyan-400">
                    Difficulty:
                  </span>
                  <p className="truncate text-sm capitalize text-gray-300">
                    {card.difficulty}
                  </p>
                </div>

                <div className="overflow-hidden">
                  <span className="block text-xs font-medium text-cyan-400">
                    Votes:
                  </span>
                  <p className="truncate text-sm text-gray-300">
                    {card.votes || 0}
                  </p>
                </div>

                <div className="overflow-hidden">
                  <span className="block text-xs font-medium text-cyan-400">
                    Public:
                  </span>
                  <p className="truncate text-sm text-gray-300">
                    {card.is_public ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>

              {card.tags && card.tags.length > 0 && (
                <div className="w-full">
                  <span className="block text-xs font-medium text-cyan-400">
                    Tags:
                  </span>
                  <p className="break-words text-sm text-gray-300">
                    {card.tags.join(', ')}
                  </p>
                </div>
              )}

              <div className="w-full">
                <span className="block text-xs font-medium text-cyan-400">
                  Created:
                </span>
                <p className="w-[270px] truncate text-sm text-gray-400">
                  {card.created_at
                    ? new Date(card.created_at).toLocaleDateString()
                    : 'Unknown'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 border-t border-gray-700 pt-2">
              <Button
                size="sm"
                onClick={() => onSelect?.(card)}
                className="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
              >
                Use Card
              </Button>
              {card.id && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit?.(card)}
                  className="gap-1"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
