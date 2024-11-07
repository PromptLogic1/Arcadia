import React from 'react'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThumbsUp, Bookmark, BookmarkCheck, Users, Grid, Clock } from 'lucide-react'
import type { Board } from "../shared/types"

interface BoardCardProps {
  board: Board
  section: 'bookmarked' | 'all'
  onVote: (boardId: number, userId: string) => void
  onBookmark: (boardId: number) => void
  onSelect: (board: Board, section: string) => void
}

export const BoardCard: React.FC<BoardCardProps> = ({
  board,
  section,
  onVote,
  onBookmark,
  onSelect,
}) => (
  <Card 
    className="bg-gray-800 border-2 border-cyan-500 hover:border-fuchsia-500 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20 cursor-pointer"
    onClick={() => onSelect(board, section)}
  >
    <CardHeader className="flex flex-row items-center justify-between py-2">
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={board.avatar} alt={board.creator} />
          <AvatarFallback>{board.creator[0]}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
            {board.name}
          </CardTitle>
          <CardDescription className="text-sm text-cyan-300">Created by {board.creator}</CardDescription>
        </div>
      </div>
      <Badge variant="secondary" className="bg-cyan-500 text-white text-sm">{board.game}</Badge>
    </CardHeader>
    <CardContent className="flex justify-between items-center py-2">
      <div className="flex space-x-4">
        <div className="flex items-center">
          <Users className="h-4 w-4 text-cyan-400 mr-1" />
          <span className="text-sm text-cyan-100">{board.players}</span>
        </div>
        <div className="flex items-center">
          <Grid className="h-4 w-4 text-cyan-400 mr-1" />
          <span className="text-sm text-cyan-100">{board.size}x{board.size}</span>
        </div>
        <div className="flex items-center">
          <Clock className="h-4 w-4 text-cyan-400 mr-1" />
          <span className="text-sm text-cyan-100">
            {Math.floor(board.timeLeft / 60)}:{(board.timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button 
          onClick={(e) => {
            e.stopPropagation()
            onVote(board.id, "user123")
          }} 
          size="sm"
          className="bg-cyan-500 text-white hover:bg-cyan-600 h-8"
        >
          <ThumbsUp className="mr-1 h-3 w-3" />
          {board.votes}
        </Button>
        <Button 
          onClick={(e) => {
            e.stopPropagation()
            onBookmark(board.id)
          }} 
          variant="ghost" 
          size="sm"
          className="text-cyan-400 hover:text-cyan-300 h-8"
        >
          {board.bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </Button>
      </div>
    </CardContent>
  </Card>
)