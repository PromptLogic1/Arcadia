import React from 'react'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ThumbsUp, 
  Users, 
  Grid as GridIcon, 
  Clock, 
  Bookmark, 
  BookmarkCheck,
  Copy 
} from 'lucide-react'
import { isSet } from "../../types/types"
import type { Board } from "../../types/types"
import { cn } from "@/lib/utils"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip"
import { useLayout } from '../../hooks/useLayout'

interface BoardCardProps {
  board: Board
  section: 'bookmarked' | 'all'
  onVote: (boardId: number, userId: string) => void
  onBookmark: (boardId: number) => void
  onSelect: (board: Board, section: string) => void
  onSaveAsCopy: (boardId: number) => void
}

export const BoardCard: React.FC<BoardCardProps> = ({
  board,
  section,
  onVote,
  onBookmark,
  onSelect,
  onSaveAsCopy,
}) => {
  const { getFluidTypography, getResponsiveSpacing } = useLayout()
  const typography = getFluidTypography(14, 16)
  const spacing = getResponsiveSpacing(16)

  const hasVoted = (userId: string) => {
    return isSet(board.votedBy) 
      ? board.votedBy.has(userId)
      : board.votedBy.includes(userId)
  }

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onSelect(board, section)
  }

  return (
    <Card 
      className={cn(
        "bg-gradient-to-br from-gray-800/95 to-gray-800/75",
        "border-2 border-cyan-500/20 hover:border-cyan-500/40",
        "transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10",
        "cursor-pointer group hover:translate-y-[-2px]"
      )}
      onClick={handleCardClick}
      style={{ gap: spacing.gap }}
    >
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 px-5">
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <Avatar className={cn(
            "h-12 w-12 ring-2 ring-cyan-500/20",
            "group-hover:ring-cyan-500/40 transition-all duration-300",
            "shadow-lg shadow-cyan-500/5"
          )}>
            <AvatarImage src={board.avatar} alt={board.creator} />
            <AvatarFallback className="bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 text-cyan-400 font-bold">
              {board.creator[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className={cn(
              "text-2xl font-bold text-transparent bg-clip-text",
              "bg-gradient-to-r from-cyan-300 to-fuchsia-400",
              "group-hover:from-cyan-200 group-hover:to-fuchsia-300",
              "transition-all duration-300"
            )} style={typography}>
              {board.name}
            </CardTitle>
            <CardDescription className={cn(
              "text-sm text-cyan-300/70 group-hover:text-cyan-300/90",
              "transition-colors duration-300 flex items-center gap-2"
            )}>
              <span>Created by</span>
              <span className="font-medium text-cyan-300/90 group-hover:text-cyan-300">
                {board.creator}
              </span>
            </CardDescription>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2 mt-4 sm:mt-0">
          <Badge 
            variant="secondary" 
            className={cn(
              "px-3 py-1 rounded-full font-medium transition-all duration-300",
              "shadow-sm",
              {
                'bg-green-500/10 text-green-300 border border-green-500/20 group-hover:border-green-500/40 group-hover:bg-green-500/20': board.difficulty === 'beginner',
                'bg-blue-500/10 text-blue-300 border border-blue-500/20 group-hover:border-blue-500/40 group-hover:bg-blue-500/20': board.difficulty === 'easy',
                'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 group-hover:border-yellow-500/40 group-hover:bg-yellow-500/20': board.difficulty === 'medium',
                'bg-orange-500/10 text-orange-300 border border-orange-500/20 group-hover:border-orange-500/40 group-hover:bg-orange-500/20': board.difficulty === 'hard',
                'bg-red-500/10 text-red-300 border border-red-500/20 group-hover:border-red-500/40 group-hover:bg-red-500/20': board.difficulty === 'expert',
              }
            )}
          >
            {board.difficulty}
          </Badge>
          <Badge 
            variant="secondary" 
            className={cn(
              "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20",
              "group-hover:border-cyan-500/40 group-hover:bg-cyan-500/20",
              "px-3 py-1 rounded-full font-medium transition-all duration-300",
              "shadow-sm"
            )}
          >
            {board.game}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className={cn(
        "flex flex-col sm:flex-row justify-between items-start sm:items-center",
        "py-4 px-5 border-t border-cyan-500/10",
        "group-hover:border-cyan-500/20 transition-colors duration-300",
        "bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent"
      )}>
        <div className="flex flex-wrap gap-4 sm:gap-8 mb-4 sm:mb-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center group/stat">
                  <div className={cn(
                    "p-1.5 rounded-full bg-cyan-500/5",
                    "group-hover/stat:bg-cyan-500/10 transition-colors duration-300"
                  )}>
                    <Users className="h-4 w-4 text-cyan-400/70 group-hover/stat:text-cyan-400" />
                  </div>
                  <span className="text-sm text-cyan-300/70 group-hover/stat:text-cyan-300 ml-2 font-medium">
                    {board.players}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Number of players</TooltipContent>
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
                    <GridIcon className="h-4 w-4 text-cyan-400/70 group-hover/stat:text-cyan-400" />
                  </div>
                  <span className="text-sm text-cyan-300/70 group-hover/stat:text-cyan-300 ml-2 font-medium">
                    {board.size}×{board.size}
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
                    <Clock className="h-4 w-4 text-cyan-400/70 group-hover/stat:text-cyan-400" />
                  </div>
                  <span className="text-sm text-cyan-300/70 group-hover/stat:text-cyan-300 ml-2 font-medium">
                    {Math.floor(board.timeLeft / 60)}:{(board.timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Time limit</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={(e) => {
                    e.stopPropagation()
                    onVote(board.id, "user123")
                  }} 
                  size="sm"
                  className={cn(
                    "h-9 px-4 rounded-full transition-all duration-300",
                    "shadow-sm font-medium flex-1 sm:flex-none",
                    hasVoted("user123")
                      ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30"
                      : "bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/20"
                  )}
                >
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  {board.votes}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {hasVoted("user123") ? "Remove vote" : "Vote for this board"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={(e) => {
                    e.stopPropagation()
                    onBookmark(board.id)
                  }} 
                  variant="ghost" 
                  size="sm"
                  className={cn(
                    "text-cyan-300/80 hover:text-cyan-300 h-9 w-9 p-0 rounded-full",
                    "bg-cyan-500/5 hover:bg-cyan-500/10 transition-all duration-300"
                  )}
                >
                  {board.bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {board.bookmarked ? "Remove from bookmarks" : "Add to bookmarks"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {board.isPublic && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      onSaveAsCopy(board.id)
                    }}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-cyan-300/80 hover:text-cyan-300 h-9 w-9 p-0 rounded-full",
                      "bg-cyan-500/5 hover:bg-cyan-500/10 transition-all duration-300"
                    )}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save as personal copy</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardContent>
    </Card>
  )
}