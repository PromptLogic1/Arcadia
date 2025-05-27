'use client'

import React, { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageCircle, ChevronDown, Heart } from "lucide-react"
import { CardWrapper } from "./shared/CardWrapper"
import type { Discussion, Comment } from "./types/types"
import { format } from 'date-fns'

interface DiscussionCardProps {
  discussion: Discussion
  comments?: Comment[]
  isExpanded: boolean
  onToggle: () => void
  onUpvote: (id: number) => void
  onComment: (discussionId: number, comment: Omit<Comment, 'id' | 'created_at' | 'updated_at'>) => void
}

const DiscussionCard = React.memo(({
  discussion,
  comments = [],
  isExpanded,
  onToggle,
  onUpvote,
  onComment
}: DiscussionCardProps) => {
  const [isUpvoted, setIsUpvoted] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [localUpvotes, setLocalUpvotes] = useState(discussion.upvotes || 0)

  const discussionComments = comments.filter(c => c.discussion_id === discussion.id)

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
      content: newComment.trim(),
      author_id: 'current_user', // In real app, get from auth
      discussion_id: discussion.id,
      upvotes: 0
    })
    
    setNewComment('')
  }, [newComment, onComment, discussion.id])

  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value)
  }, [])

  return (
    <CardWrapper 
      className="transition-all duration-300 hover:shadow-lg hover:shadow-fuchsia-500/10 cursor-pointer"
    >
      <div className="relative" onClick={onToggle}>
        <CardHeader className="p-5 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
          <div className="flex items-start space-x-4">
            <div className="relative flex-shrink-0">
              <Avatar className="h-12 w-12 ring-2 ring-cyan-500/50">
                <AvatarImage src="/avatars/default.jpg" alt="User" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold leading-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-1">
                {discussion.title}
              </h2>
              <div className="flex items-center text-sm text-gray-400 space-x-2">
                <span className="font-medium text-gray-300">User</span>
                <span className="text-gray-600">•</span>
                <time className="text-gray-500">
                  {discussion.created_at ? format(new Date(discussion.created_at), 'MMM d, yyyy') : 'Unknown date'}
                </time>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge 
                variant="outline" 
                className="bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10 border-cyan-500/20 text-cyan-400 px-3 py-1"
              >
                {discussion.game}
              </Badge>
              {discussion.challenge_type && (
                <Badge 
                  variant="outline" 
                  className="bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 border-fuchsia-500/20 text-fuchsia-400 px-3 py-1"
                >
                  {discussion.challenge_type}
                </Badge>
              )}
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </motion.div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-5 py-4 bg-gradient-to-b from-gray-800/30 to-gray-900/30">
          <p className="text-gray-300 text-base leading-relaxed line-clamp-2 mb-4">
            {discussion.content}
          </p>
          {discussion.tags && discussion.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {discussion.tags.map((tag) => (
                <button
                  key={tag} 
                  className="px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 text-cyan-400 border border-cyan-500/20 rounded-full text-sm font-medium transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
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
              <div className="px-6 py-5 space-y-6 bg-gradient-to-b from-gray-800/30 to-gray-900/30">
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-200 text-base leading-relaxed">
                    {discussion.content}
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold flex items-center space-x-2">
                      <span className="bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
                        Comments
                      </span>
                      <span className="text-gray-400 text-base">({discussionComments.length})</span>
                    </h4>
                  </div>
                  
                  <div className="space-y-4">
                    {discussionComments.map((comment) => (
                      <div 
                        key={comment.id}
                        className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30 hover:border-cyan-500/20 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <Avatar className="h-8 w-8 ring-2 ring-cyan-500/20">
                            <AvatarImage src="/avatars/default.jpg" alt="User" />
                            <AvatarFallback>U</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium text-gray-200">User</span>
                            <p className="text-xs text-gray-400">
                              {comment.created_at ? format(new Date(comment.created_at), 'MMM d, yyyy') : 'Unknown date'}
                            </p>
                          </div>
                        </div>
                        <p className="text-gray-300 pl-11 leading-relaxed">{comment.content}</p>
                      </div>
                    ))}
                    
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      <Textarea
                        placeholder="What are your thoughts on this discussion?"
                        value={newComment}
                        onChange={handleCommentChange}
                        className="bg-gray-800/50 border-gray-700/50 focus:border-cyan-500 min-h-[120px] resize-none text-base"
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleComment}
                          className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 px-6 py-2 text-base font-medium"
                          disabled={!newComment.trim()}
                        >
                          Post Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <CardFooter className="flex justify-between p-4 bg-gradient-to-r from-gray-800/30 to-gray-900/30">
          <div 
            className={`flex items-center space-x-2 cursor-pointer transition-all px-3 py-1.5 rounded-full
              ${isUpvoted 
                ? 'text-red-400 bg-red-400/10' 
                : 'text-gray-400 hover:text-red-400 hover:bg-red-400/10'
              }`}
            onClick={handleUpvote}
          >
            <Heart className={`h-5 w-5 ${isUpvoted ? 'fill-current' : ''} transition-transform ${isUpvoted ? 'scale-110' : 'scale-100'}`} />
            <span className="font-medium">{localUpvotes}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-400 px-3 py-1.5">
            <MessageCircle className="h-5 w-5" />
            <span className="font-medium">{discussionComments.length}</span>
          </div>
        </CardFooter>
      </div>
    </CardWrapper>
  )
})

DiscussionCard.displayName = 'DiscussionCard'

export default DiscussionCard