import React, { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageCircle, ChevronDown, Share2, Bookmark, Flag, Heart } from "lucide-react"
import { CardWrapper } from "./shared/CardWrapper"
import { Discussion, Comment } from "./types"
import { format } from 'date-fns'

interface DiscussionCardProps {
  discussion: Discussion
  isExpanded: boolean
  onToggle: () => void
  onUpvote: (id: number) => void
  onComment: (discussionId: number, comment: Omit<Comment, 'id' | 'date'>) => void
}

const CommentList = React.memo(({ comments }: { comments: Comment[] }) => (
  <div className="space-y-4">
    {comments.map((comment) => (
      <div 
        key={comment.id}
        className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30 hover:border-cyan-500/20 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center space-x-3 mb-2">
          <Avatar className="h-8 w-8 ring-2 ring-cyan-500/20">
            <AvatarImage src={comment.avatar} alt={comment.author} />
            <AvatarFallback>{comment.author[0]}</AvatarFallback>
          </Avatar>
          <div>
            <span className="font-medium text-gray-200">{comment.author}</span>
            <p className="text-xs text-gray-400">{format(new Date(comment.date), 'MMM d, yyyy')}</p>
          </div>
        </div>
        <p className="text-gray-300 pl-11 leading-relaxed">{comment.content}</p>
      </div>
    ))}
  </div>
))

CommentList.displayName = 'CommentList'

const CommentInput = React.memo(({ 
  value, 
  onChange, 
  onSubmit 
}: { 
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: (e: React.MouseEvent) => void
}) => (
  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
    <Textarea
      placeholder="Share your thoughts..."
      value={value}
      onChange={onChange}
      className="bg-gray-800/50 border-gray-700 focus:border-cyan-500 min-h-[100px] resize-none"
    />
    <div className="flex justify-end">
      <Button
        onClick={onSubmit}
        className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600"
        disabled={!value.trim()}
      >
        Post Comment
      </Button>
    </div>
  </div>
))

CommentInput.displayName = 'CommentInput'

const DiscussionActions = React.memo(({ 
  isUpvoted,
  isBookmarked,
  onUpvote,
  onBookmark,
  onShare,
  onReport
}: {
  isUpvoted: boolean
  isBookmarked: boolean
  onUpvote: (e: React.MouseEvent) => void
  onBookmark: (e: React.MouseEvent) => void
  onShare: (e: React.MouseEvent) => void
  onReport: (e: React.MouseEvent) => void
}) => (
  <div className="flex items-center space-x-4 text-sm border-t border-gray-700/50 pt-4 mt-4">
    <button
      onClick={onUpvote}
      className={`flex items-center space-x-1 transition-colors ${
        isUpvoted ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
      }`}
    >
      <Heart className={`h-5 w-5 ${isUpvoted ? 'fill-current' : ''}`} />
      <span>Like</span>
    </button>
    <button
      onClick={onBookmark}
      className={`flex items-center space-x-1 transition-colors ${
        isBookmarked ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'
      }`}
    >
      <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
      <span>Save</span>
    </button>
    <button
      onClick={onShare}
      className="flex items-center space-x-1 text-gray-400 hover:text-cyan-400 transition-colors"
    >
      <Share2 className="h-5 w-5" />
      <span>Share</span>
    </button>
    <button
      onClick={onReport}
      className="flex items-center space-x-1 text-gray-400 hover:text-red-400 transition-colors ml-auto"
    >
      <Flag className="h-5 w-5" />
      <span>Report</span>
    </button>
  </div>
))

DiscussionActions.displayName = 'DiscussionActions'

const DiscussionCard = React.memo(({
  discussion,
  isExpanded,
  onToggle,
  onUpvote,
  onComment
}: DiscussionCardProps) => {
  const [isUpvoted, setIsUpvoted] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [localUpvotes, setLocalUpvotes] = useState(discussion.upvotes)

  const handleUpvote = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsUpvoted(prev => !prev)
    setLocalUpvotes(prev => isUpvoted ? prev - 1 : prev + 1)
    onUpvote(discussion.id)
  }, [isUpvoted, onUpvote, discussion.id])

  const handleComment = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!newComment.trim()) return
    
    onComment(discussion.id, {
      author: 'Current User',
      avatar: '/avatars/default.jpg',
      content: newComment.trim(),
      upvotes: 0
    })
    
    setNewComment('')
  }, [newComment, onComment, discussion.id])

  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value)
  }, [])

  const handleBookmark = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsBookmarked(prev => !prev)
    // Hier könnte ein API-Call kommen um den Bookmark-Status zu speichern
  }, [])

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Implementiere Share-Funktionalität
  }, [])

  const handleReport = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Implementiere Report-Funktionalität
  }, [])

  return (
    <CardWrapper 
      onClick={onToggle}
      hoverAccentColor="fuchsia"
      className="transition-all duration-300 hover:shadow-lg hover:shadow-fuchsia-500/10"
    >
      <div className="relative">
        <CardHeader className="flex flex-row items-center justify-between p-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar className="ring-2 ring-cyan-500/50">
                <AvatarImage src={discussion.avatar} alt={discussion.author} />
                <AvatarFallback>{discussion.author[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800" />
            </div>
            <div>
              <h3 className="font-semibold text-lg bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {discussion.title}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>{discussion.author}</span>
                <span>•</span>
                <span>{format(new Date(discussion.date), 'MMM d, yyyy')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge 
              variant="outline" 
              className="bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10 border-cyan-500/20 text-cyan-400"
            >
              {discussion.game}
            </Badge>
            {discussion.challengeType && (
              <Badge 
                variant="outline" 
                className="bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 border-fuchsia-500/20 text-fuchsia-400"
              >
                {discussion.challengeType}
              </Badge>
            )}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </motion.div>
          </div>
        </CardHeader>

        <CardContent className="p-4 bg-gradient-to-b from-gray-800/30 to-gray-900/30">
          <p className="text-gray-300 line-clamp-2 leading-relaxed">{discussion.content}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {discussion.tags.map((tag) => (
              <Badge 
                key={tag} 
                variant="secondary" 
                className="bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-cyan-400 border-cyan-500/20"
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </CardContent>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 bg-gradient-to-b from-gray-800/30 to-gray-900/30">
                <div className="prose prose-invert max-w-none mb-6">
                  <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {discussion.content}
                  </p>
                </div>

                <DiscussionActions 
                  isUpvoted={isUpvoted}
                  isBookmarked={isBookmarked}
                  onUpvote={handleUpvote}
                  onBookmark={handleBookmark}
                  onShare={handleShare}
                  onReport={handleReport}
                />

                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-lg bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
                      Comments ({discussion.comments})
                    </h4>
                    <Badge variant="outline" className="text-gray-400">
                      Most Recent
                    </Badge>
                  </div>
                  <CommentList comments={discussion.commentList} />
                  <CommentInput 
                    value={newComment}
                    onChange={handleCommentChange}
                    onSubmit={handleComment}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <CardFooter className="flex justify-between p-4 bg-gradient-to-r from-gray-800/30 to-gray-900/30">
          <div 
            className={`flex items-center space-x-2 cursor-pointer transition-all px-3 py-1 rounded-full
              ${isUpvoted 
                ? 'text-red-400 bg-red-400/10' 
                : 'text-gray-400 hover:text-red-400 hover:bg-red-400/10'
              }`}
            onClick={handleUpvote}
          >
            <Heart className={`h-4 w-4 ${isUpvoted ? 'fill-current' : ''} transition-transform ${isUpvoted ? 'scale-110' : 'scale-100'}`} />
            <span>{localUpvotes}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-400 px-3 py-1">
            <MessageCircle className="h-4 w-4" />
            <span>{discussion.comments}</span>
          </div>
        </CardFooter>
      </div>
    </CardWrapper>
  )
})

DiscussionCard.displayName = 'DiscussionCard'

export default DiscussionCard