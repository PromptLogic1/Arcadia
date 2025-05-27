'use client'

import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { BingoCard as BingoCardType } from '@/types'
import { DIFFICULTY_STYLES } from '@/types'
import { ThumbsUp, ChevronDown, User } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface BingoCardPublicProps {
  card: BingoCardType
  onSelect?: (card: BingoCardType) => void
  onVote?: (card: BingoCardType) => void
}

export function BingoCardPublic({ card, onSelect, onVote }: BingoCardPublicProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="w-full">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="w-full bg-gray-900/30 rounded-lg"
      >
        <CollapsibleTrigger asChild>
          <Card 
            className={cn(
              "bg-gradient-to-br from-gray-800/95 to-gray-800/75",
              "border border-cyan-500/20 hover:border-cyan-500/40",
              "transition-all duration-300 cursor-pointer group w-full",
              isOpen && "border-b-0 rounded-b-none border-cyan-500/60"
            )}
          >
            <CardContent className="p-2 flex items-center justify-between">
              <span 
                className="text-sm text-cyan-300/90 truncate mr-2 flex-1" 
                style={{ wordBreak: 'break-word' }}
              >
                {card.title}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Badge 
                  variant="outline"
                  className={cn(
                    "px-2 py-0.5 text-xs rounded-full",
                    DIFFICULTY_STYLES[card.difficulty]
                  )}
                >
                  {card.difficulty}
                </Badge>
                <Badge 
                  variant="outline" 
                  className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                >
                  {card.votes || 0} votes
                </Badge>
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 text-cyan-400/70 transition-transform duration-200",
                    isOpen && "transform rotate-180"
                  )} 
                />
              </div>
            </CardContent>
          </Card>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-x border-b border-cyan-500/20 rounded-b-lg p-3">
            <div className="space-y-2 mb-4">
              {/* Creator Info */}
              <div className="flex items-center gap-2 mb-3">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-cyan-500/10 text-cyan-400">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-400">Created by Community</span>
              </div>

              <div className="w-full">
                <span className="text-xs text-cyan-400 font-medium block">Title:</span>
                <p 
                  className="text-sm text-gray-300 break-words line-clamp-3" 
                  style={{ wordBreak: 'break-word' }}
                >
                  {card.title}
                </p>
              </div>

              {card.description && (
                <div className="w-full">
                  <span className="text-xs text-cyan-400 font-medium block">Description:</span>
                  <p 
                    className="text-sm text-gray-300 line-clamp-3" 
                    style={{ wordBreak: 'break-word' }}
                  >
                    {card.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="overflow-hidden">
                  <span className="text-xs text-cyan-400 font-medium block">Game:</span>
                  <p className="text-sm text-gray-300">
                    {card.game_type}
                  </p>
                </div>

                <div className="overflow-hidden">
                  <span className="text-xs text-cyan-400 font-medium block">Difficulty:</span>
                  <p className="text-sm text-gray-300 capitalize">
                    {card.difficulty}
                  </p>
                </div>
              </div>

              {card.tags && card.tags.length > 0 && (
                <div className="w-full">
                  <span className="text-xs text-cyan-400 font-medium block">Tags:</span>
                  <p className="text-sm text-gray-300 break-words">
                    {card.tags.join(', ')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-700">
              <Button
                size="sm"
                onClick={() => onSelect?.(card)}
                className="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
              >
                Use Card
              </Button>
              <Button
                size="sm"
                variant="outline"
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
  )
}
