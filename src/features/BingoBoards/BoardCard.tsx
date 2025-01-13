'use client'

import React from 'react'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ThumbsUp, 
  Grid as GridIcon,
  User
} from 'lucide-react'
import { cn } from "@/lib/utils"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip"
import { BingoBoard } from '@/src/store/types/bingoboard.types'
import { DIFFICULTY_STYLES } from '@/src/store/types/game.types'
import Link from 'next/link'

interface BoardCardProps {
  board: BingoBoard
  onClick?: () => void
}

export function BoardCard({ board, onClick }: BoardCardProps) {
  return (
    <Link href={`/challengehub/${board.id}/edit`}>
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
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 px-5">
          <div className="flex items-center space-x-4 w-full">
            <Avatar className={cn(
              "h-12 w-12 ring-2 ring-cyan-500/20 shrink-0",
              "group-hover:ring-cyan-500/40 transition-all duration-300",
              "shadow-lg shadow-cyan-500/5"
            )}>
              <AvatarImage src={board.creator_id} alt="Creator" />
              <AvatarFallback className="bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 text-cyan-400 font-bold">
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            
            <div className="min-w-0 flex-1">
              <CardTitle className={cn(
                "text-2xl font-bold",
                "text-cyan-300/90 group-hover:text-cyan-300",
                "transition-all duration-300",
                "break-words"
              )}>
                {board.board_title}
              </CardTitle>
              {board.board_description && (
                <CardDescription className={cn(
                  "text-sm text-cyan-300/70 group-hover:text-cyan-300/90",
                  "transition-colors duration-300",
                  "line-clamp-2 break-words"
                )}>
                  {board.board_description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className={cn(
          "flex flex-wrap gap-4 sm:gap-8",
          "py-4 px-5",
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
                    <GridIcon className="h-4 w-4 text-cyan-400/70 group-hover/stat:text-cyan-400 shrink-0" />
                  </div>
                  <span className="text-sm text-cyan-300/70 group-hover/stat:text-cyan-300 ml-2 font-medium truncate">
                    {board.board_size}×{board.board_size}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Board size</TooltipContent>
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
                    <ThumbsUp className="h-4 w-4 text-cyan-400/70 group-hover/stat:text-cyan-400 shrink-0" />
                  </div>
                  <span className="text-sm text-cyan-300/70 group-hover/stat:text-cyan-300 ml-2 font-medium truncate">
                    {board.votes || 0}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Total votes</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Badge 
            variant="outline"
            className={cn(
              "px-3 py-1 rounded-full font-medium transition-all duration-300",
              "shadow-sm whitespace-nowrap overflow-hidden text-ellipsis",
              DIFFICULTY_STYLES[board.board_difficulty]
            )}
          >
            {board.board_difficulty}
          </Badge>

          <Badge 
            variant="outline"
            className={cn(
              "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20",
              "group-hover:border-cyan-500/40 group-hover:bg-cyan-500/20",
              "px-3 py-1 rounded-full font-medium transition-all duration-300",
              "shadow-sm whitespace-nowrap overflow-hidden text-ellipsis"
            )}
          >
            {board.board_game_type}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  )
}