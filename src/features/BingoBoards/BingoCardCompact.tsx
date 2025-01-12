'use client'

import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BingoCard as BingoCardType } from '@/src/store/types/bingocard.types'
import { DIFFICULTY_STYLES } from '@/src/store/types/game.types'
import { Tag, Edit, ChevronDown } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface BingoCardCompactProps {
  card: BingoCardType
  onSelect?: (card: BingoCardType) => void
  onEdit?: (card: BingoCardType) => void
}

export function BingoCardCompact({ card, onSelect, onEdit }: BingoCardCompactProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="w-[300px] min-w-[300px] max-w-[300px]">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="w-[300px] min-w-[300px] max-w-[300px] bg-gray-900/30 rounded-lg"
        style={{ width: '300px' }}
      >
        <CollapsibleTrigger asChild>
          <Card 
            className={cn(
              "bg-gradient-to-br from-gray-800/95 to-gray-800/75",
              "border border-cyan-500/20 hover:border-cyan-500/40",
              "transition-all duration-300 cursor-pointer group",
              "w-[300px] min-w-[300px] max-w-[300px]",
              isOpen && "border-b-0 rounded-b-none border-cyan-500/60"
            )}
          >
            <CardContent className="p-2 flex items-center justify-between">
              <span className="text-sm text-cyan-300/90 truncate mr-2 flex-1">
                {card.card_content}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Badge 
                  variant="outline"
                  className={cn(
                    "px-2 py-0.5 text-xs rounded-full",
                    DIFFICULTY_STYLES[card.card_difficulty]
                  )}
                >
                  {card.card_difficulty}
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

        <CollapsibleContent className="w-[300px] min-w-[300px] max-w-[300px]">
          <div className="border-x border-b border-cyan-500/20 rounded-b-lg w-[300px] min-w-[300px] max-w-[300px] p-3">
            <div className="space-y-2 mb-4">
              <div className="w-full max-w-[270px]">
                <span className="text-xs text-cyan-400 font-medium block">Content:</span>
                <p className="text-sm text-gray-300 break-words line-clamp-3">
                  {card.card_content}
                </p>
              </div>

              {card.card_explanation && (
                <div className="w-full max-w-[270px]">
                  <span className="text-xs text-cyan-400 font-medium block">Explanation:</span>
                  <p className="text-sm text-gray-300 break-words line-clamp-3 overflow-hidden">
                    {card.card_explanation}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 w-[270px]">
                <div className="overflow-hidden">
                  <span className="text-xs text-cyan-400 font-medium block">Type:</span>
                  <p className="text-sm text-gray-300 capitalize truncate">
                    {card.card_type}
                  </p>
                </div>

                <div className="overflow-hidden">
                  <span className="text-xs text-cyan-400 font-medium block">Game:</span>
                  <p className="text-sm text-gray-300 truncate">
                    {card.game_category}
                  </p>
                </div>

                <div className="overflow-hidden">
                  <span className="text-xs text-cyan-400 font-medium block">Difficulty:</span>
                  <p className="text-sm text-gray-300 capitalize truncate">
                    {card.card_difficulty}
                  </p>
                </div>

                <div className="overflow-hidden">
                  <span className="text-xs text-cyan-400 font-medium block">Votes:</span>
                  <p className="text-sm text-gray-300 truncate">{card.votes}</p>
                </div>
              </div>

              {card.card_tags && card.card_tags.length > 0 && (
                <div className="w-full">
                  <span className="text-xs text-cyan-400 font-medium block">Tags:</span>
                  <p className="text-sm text-gray-300 truncate w-[270px]">
                    {card.card_tags.join(', ')}
                  </p>
                </div>
              )}

              <div className="w-full">
                <span className="text-xs text-cyan-400 font-medium block">Created:</span>
                <p className="text-sm text-gray-400 truncate w-[270px]">
                  {new Date(card.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-700">
              <Button
                size="sm"
                onClick={() => onSelect?.(card)}
                className="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
              >
                Select
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
  )
} 