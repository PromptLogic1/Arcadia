import React, { useState, useRef, useEffect } from "react"
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Button } from "@/components/ui/button"
import { 
  Bold, Italic, Underline, List, ThumbsUp, MessageCircle, 
  Share, Clock
} from "lucide-react"
import { DialogWrapper } from "./shared/DialogWrapper"
import { Discussion, Comment } from "./types"
import { motion, AnimatePresence } from "framer-motion"

interface DiscussionViewProps {
  discussion: Discussion
  onClose: () => void
  onComment: (discussionId: number, comment: Omit<Comment, 'id' | 'date'>) => void
  onUpvote?: (discussionId: number) => void
}

const DiscussionView: React.FC<DiscussionViewProps> = ({ 
  discussion, 
  onClose, 
  onComment,
  onUpvote 
}) => {
  const [comment, setComment] = useState('')
  const [textFormat, setTextFormat] = useState<string[]>([])
  const [isUpvoted, setIsUpvoted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus comment input when pressing 'c'
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'c' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        commentInputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  const formatComment = (text: string): string => {
    let formattedText = text
    if (textFormat.includes('bold')) formattedText = `**${formattedText}**`
    if (textFormat.includes('italic')) formattedText = `*${formattedText}*`
    if (textFormat.includes('underline')) formattedText = `__${formattedText}__`
    if (textFormat.includes('list')) formattedText = `• ${formattedText}`
    return formattedText
  }

  const handleFormatText = (format: string) => {
    setTextFormat(prev => 
      prev.includes(format) 
        ? prev.filter(f => f !== format)
        : [...prev, format]
    )
  }

  const handleComment = async () => {
    if (!comment.trim()) return

    setIsSubmitting(true)
    try {
      const formattedComment = formatComment(comment.trim())
      const newComment: Omit<Comment, 'id' | 'date'> = {
        author: 'Current User',
        avatar: '/avatars/default.jpg',
        content: formattedComment,
        upvotes: 0
      }

      await onComment(discussion.id, newComment)
      setComment('')
      // Success feedback could be added here
    } catch (error) {
      // Error feedback could be added here
      console.error('Failed to post comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      // Success feedback could be added here
    } catch (err) {
      // Error feedback could be added here
      console.error('Failed to copy link:', err)
    }
  }

  const handleUpvote = () => {
    if (!isUpvoted && onUpvote) {
      setIsUpvoted(true)
      onUpvote(discussion.id)
      // Success feedback could be added here
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date)
  }

  return (
    <DialogWrapper isOpen={true} onClose={onClose}>
      <DialogHeader className="border-b border-gray-700/50 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <Avatar className="h-12 w-12 border-2 border-cyan-500/20 ring-2 ring-gray-700/50">
              <AvatarImage src={discussion.avatar} alt={discussion.author} />
              <AvatarFallback>{discussion.author[0]}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl font-bold leading-tight">
                {discussion.title}
              </DialogTitle>
              <div className="flex items-center space-x-2 mt-1">
                <DialogDescription className="text-cyan-400 font-medium">
                  {discussion.author}
                </DialogDescription>
                <span className="text-gray-500">•</span>
                <div className="flex items-center text-gray-400 text-sm" title={formatDate(discussion.date)}>
                  <Clock className="h-4 w-4 mr-1" />
                  <time dateTime={discussion.date}>
                    {formatDate(discussion.date)}
                  </time>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant="outline" 
              className="bg-gray-800 border-cyan-500/20 px-3 py-1"
            >
              {discussion.game}
            </Badge>
            {discussion.challengeType && (
              <Badge 
                variant="outline" 
                className="bg-gray-800 border-fuchsia-500/20 px-3 py-1"
              >
                {discussion.challengeType}
              </Badge>
            )}
          </div>
        </div>
      </DialogHeader>

      <ScrollArea className="mt-6 max-h-[60vh] pr-4">
        <div className="space-y-6">
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
              {discussion.content}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {discussion.tags.map((tag) => (
              <Badge 
                key={tag} 
                variant="secondary" 
                className="bg-gray-800/50 hover:bg-gray-700/50 transition-colors cursor-pointer"
              >
                #{tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-b border-gray-700/50 py-4">
            <div className="flex items-center space-x-6">
              <button 
                onClick={handleUpvote}
                disabled={isUpvoted}
                className={`
                  flex items-center space-x-2 transition-colors
                  ${isUpvoted 
                    ? 'text-cyan-400 cursor-default' 
                    : 'text-gray-400 hover:text-cyan-400'
                  }
                `}
                aria-label={isUpvoted ? "Already upvoted" : "Upvote discussion"}
              >
                <ThumbsUp className="h-5 w-5" />
                <span>{discussion.upvotes + (isUpvoted ? 1 : 0)}</span>
              </button>
              <div className="flex items-center space-x-2 text-gray-400">
                <MessageCircle className="h-5 w-5" />
                <span>{discussion.comments}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-cyan-400"
              onClick={handleShare}
              aria-label="Share discussion"
            >
              <Share className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Comments</h3>
              <span className="text-sm text-gray-400">
                Press &apos;c&apos; to comment
              </span>
            </div>
            
            <AnimatePresence>
              {discussion.commentList?.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-8 text-gray-400"
                >
                  <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
                  <p>No comments yet. Be the first to comment!</p>
                </motion.div>
              ) : (
                discussion.commentList?.map((comment, index) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                    className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30 hover:border-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar className="h-8 w-8 ring-2 ring-gray-700/50">
                        <AvatarImage src={comment.avatar} alt={comment.author} />
                        <AvatarFallback>{comment.author[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-200">{comment.author}</p>
                        <p className="text-sm text-gray-400">
                          {formatDate(comment.date)}
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-300 pl-11 whitespace-pre-wrap">{comment.content}</p>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </ScrollArea>

      <div className="mt-6 border-t border-gray-700/50 pt-4">
        <div className="flex items-center space-x-2 mb-2">
          <ToggleGroup 
            type="multiple" 
            value={textFormat} 
            className="bg-gray-800/50 rounded-md p-1 border border-gray-700"
            aria-label="Text formatting options"
          >
            <ToggleGroupItem 
              value="bold" 
              onClick={() => handleFormatText('bold')}
              className="data-[state=on]:bg-gray-700 data-[state=on]:text-cyan-400"
              aria-label="Bold"
            >
              <Bold className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="italic" 
              onClick={() => handleFormatText('italic')}
              className="data-[state=on]:bg-gray-700 data-[state=on]:text-cyan-400"
              aria-label="Italic"
            >
              <Italic className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="underline" 
              onClick={() => handleFormatText('underline')}
              className="data-[state=on]:bg-gray-700 data-[state=on]:text-cyan-400"
              aria-label="Underline"
            >
              <Underline className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="list" 
              onClick={() => handleFormatText('list')}
              className="data-[state=on]:bg-gray-700 data-[state=on]:text-cyan-400"
              aria-label="Bullet list"
            >
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <Textarea
          ref={commentInputRef}
          placeholder="Write a comment... (Press 'c' to focus)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              handleComment()
            }
          }}
          className="
            bg-gray-800/50 
            border-gray-700 
            hover:border-cyan-500/50
            focus:border-cyan-500 
            min-h-[100px]
            resize-none
            transition-colors
          "
          aria-label="Comment input"
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-gray-400">
            Press Ctrl + Enter to post
          </span>
          <Button 
            onClick={handleComment}
            disabled={!comment.trim() || isSubmitting}
            className="
              bg-gradient-to-r 
              from-cyan-500 
              to-fuchsia-500 
              hover:from-cyan-600 
              hover:to-fuchsia-600 
              text-white 
              disabled:opacity-50
              disabled:cursor-not-allowed
              transition-all
              min-w-[120px]
            "
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </div>
    </DialogWrapper>
  )
}

export default DiscussionView