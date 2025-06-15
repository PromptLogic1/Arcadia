'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { BingoCard as BingoCardType } from '@/types';
import { DIFFICULTY_STYLES } from '@/types';
import { ThumbsUp, ChevronDown, User } from '@/components/ui/Icons';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/Collapsible';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';

interface BingoCardPublicProps {
  card: BingoCardType;
  onSelect?: (card: BingoCardType) => void;
  onVote?: (card: BingoCardType) => void;
}

export const BingoCardPublic = React.memo(
  ({ card, onSelect, onVote }: BingoCardPublicProps) => {
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
                    variant="cyber"
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs',
                      DIFFICULTY_STYLES[card.difficulty]
                    )}
                  >
                    {card.difficulty}
                  </Badge>
                  <Badge
                    variant="cyber"
                    className="border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                  >
                    {card.votes || 0} votes
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
                {/* Creator Info */}
                <div className="mb-3 flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-cyan-500/10 text-cyan-400">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-400">
                    Created by Community
                  </span>
                </div>

                <div className="w-full">
                  <span className="block text-xs font-medium text-cyan-400">
                    Title:
                  </span>
                  <p
                    className="line-clamp-3 text-sm break-words text-gray-300"
                    style={{ wordBreak: 'break-word' }}
                  >
                    {card.title}
                  </p>
                </div>

                {card.description && (
                  <div className="w-full">
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

                <div className="grid grid-cols-2 gap-2">
                  <div className="overflow-hidden">
                    <span className="block text-xs font-medium text-cyan-400">
                      Game:
                    </span>
                    <p className="text-sm text-gray-300">{card.game_type}</p>
                  </div>

                  <div className="overflow-hidden">
                    <span className="block text-xs font-medium text-cyan-400">
                      Difficulty:
                    </span>
                    <p className="text-sm text-gray-300 capitalize">
                      {card.difficulty}
                    </p>
                  </div>
                </div>

                {card.tags && card.tags.length > 0 && (
                  <div className="w-full">
                    <span className="block text-xs font-medium text-cyan-400">
                      Tags:
                    </span>
                    <p className="text-sm break-words text-gray-300">
                      {card.tags.join(', ')}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 border-t border-gray-700 pt-2">
                <Button
                  size="sm"
                  onClick={() => onSelect?.(card)}
                  className="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
                >
                  Use Card
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onVote?.(card)}
                  className="gap-1"
                >
                  <ThumbsUp className="h-3 w-3" />
                  Vote
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for performance
    return (
      prevProps.card.id === nextProps.card.id &&
      prevProps.card.title === nextProps.card.title &&
      prevProps.card.votes === nextProps.card.votes &&
      prevProps.card.updated_at === nextProps.card.updated_at
    );
  }
);

BingoCardPublic.displayName = 'BingoCardPublic';
