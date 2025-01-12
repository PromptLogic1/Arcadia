'use client'

import React from 'react'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ThumbsUp, 
  Tag,
  Gamepad2
} from 'lucide-react'
import { cn } from "@/lib/utils"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip"
import { BingoCard as BingoCardType } from '@/src/store/types/bingocard.types'
import { DIFFICULTY_STYLES } from '@/src/store/types/game.types'

interface BingoCardProps {
  card: BingoCardType
  onClick?: () => void
}

export function BingoCard({ card, onClick }: BingoCardProps) {
  return (
    <Card 
      className={cn(
        "bg-gradient-to-br from-gray-800/95 to-gray-800/75",
        "border-2 border-cyan-500/20 hover:border-cyan-500/40",
        "transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10",
        "cursor-pointer group hover:translate-y-[-2px]",
        "overflow-hidden"
      )}
      onClick={onClick}
    >
      <CardHeader className="py-3 px-4">
        <CardTitle className={cn(
          "text-lg font-bold",
          "text-cyan-300/90 group-hover:text-cyan-300",
          "transition-all duration-300"
        )}>
          {card.card_content}
        </CardTitle>
        {card.card_explanation && (
          <CardDescription className={cn(
            "text-sm text-cyan-300/70 group-hover:text-cyan-300/90",
            "transition-colors duration-300",
            "line-clamp-2 break-words"
          )}>
            {card.card_explanation}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className={cn(
        "flex flex-wrap gap-2",
        "py-3 px-4",
        "border-t border-cyan-500/20 group-hover:border-cyan-500/30",
        "bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent"
      )}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center group/stat">
                <div className={cn(
                  "p-1.5 rounded-full bg-cyan-500/5",
                  "group-hover/stat:bg-cyan-500/10 transition-colors duration-300"
                )}>
                  <Gamepad2 className="h-4 w-4 text-cyan-400/70 group-hover/stat:text-cyan-400" />
                </div>
                <span className="text-sm text-cyan-300/70 group-hover/stat:text-cyan-300 ml-2 font-medium">
                  {card.game_category}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Game Category</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center group/stat">
                <div className={cn(
                  "p-1.5 rounded-full bg-cyan-500/5",
                  "group-hover/stat:bg-cyan-500/10 transition-colors duration-300"
                )}>
                  <ThumbsUp className="h-4 w-4 text-cyan-400/70 group-hover/stat:text-cyan-400" />
                </div>
                <span className="text-sm text-cyan-300/70 group-hover/stat:text-cyan-300 ml-2 font-medium">
                  {card.votes}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Total votes</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Badge 
          variant="outline"
          className={cn(
            "px-2 py-0.5 rounded-full font-medium transition-all duration-300",
            "text-sm whitespace-nowrap",
            DIFFICULTY_STYLES[card.card_difficulty]
          )}
        >
          {card.card_difficulty}
        </Badge>

        {card.card_tags && card.card_tags.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center group/stat">
                  <div className={cn(
                    "p-1.5 rounded-full bg-cyan-500/5",
                    "group-hover/stat:bg-cyan-500/10 transition-colors duration-300"
                  )}>
                    <Tag className="h-4 w-4 text-cyan-400/70 group-hover/stat:text-cyan-400" />
                  </div>
                  <span className="text-sm text-cyan-300/70 group-hover/stat:text-cyan-300 ml-2 font-medium">
                    {card.card_tags.length}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>{card.card_tags.join(', ')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  )
} 