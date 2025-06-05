'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, ChevronDown, Heart } from 'lucide-react';
import { CardWrapper } from './shared/CardWrapper';
import type { Discussion, Comment } from '@/lib/stores/community-store';
import { format } from 'date-fns';
import { BaseErrorBoundary } from '@/components/error-boundaries';

interface DiscussionCardProps {
  discussion: Discussion;
  comments?: Comment[];
  isExpanded: boolean;
  onToggle: () => void;
  onUpvote: (id: number) => void;
  onComment: (
    discussionId: number,
    comment: Omit<Comment, 'id' | 'created_at' | 'updated_at'>
  ) => void;
}

const DiscussionCard = React.memo(
  ({
    discussion,
    comments = [],
    isExpanded,
    onToggle,
    onUpvote,
    onComment,
  }: DiscussionCardProps) => {
    const [isUpvoted, setIsUpvoted] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [localUpvotes, setLocalUpvotes] = useState(discussion.upvotes || 0);

    const discussionComments = comments.filter(
      c => c.discussion_id === discussion.id
    );

    const handleUpvote = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsUpvoted(prev => !prev);
        setLocalUpvotes(prev => (isUpvoted ? prev - 1 : prev + 1));
        onUpvote(discussion.id);
      },
      [isUpvoted, onUpvote, discussion.id]
    );

    const handleComment = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!newComment.trim()) return;

        onComment(discussion.id, {
          content: newComment.trim(),
          author_id: 'current_user', // In real app, get from auth
          discussion_id: discussion.id,
          upvotes: 0,
        });

        setNewComment('');
      },
      [newComment, onComment, discussion.id]
    );

    const handleCommentChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNewComment(e.target.value);
      },
      []
    );

    return (
      <BaseErrorBoundary level="component">
        <CardWrapper className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-fuchsia-500/10">
          <div className="relative" onClick={onToggle}>
          <CardHeader className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 p-5">
            <div className="flex items-start space-x-4">
              <div className="relative flex-shrink-0">
                <Avatar className="h-12 w-12 ring-2 ring-cyan-500/50">
                  <AvatarImage src="/avatars/default.jpg" alt="User" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-gray-800 bg-green-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="mb-1 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-xl leading-tight font-bold text-transparent">
                  {discussion.title}
                </h2>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <span className="font-medium text-gray-300">User</span>
                  <span className="text-gray-600">•</span>
                  <time className="text-gray-500">
                    {discussion.created_at
                      ? format(new Date(discussion.created_at), 'MMM d, yyyy')
                      : 'Unknown date'}
                  </time>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge
                  variant="outline"
                  className="border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10 px-3 py-1 text-cyan-400"
                >
                  {discussion.game}
                </Badge>
                {discussion.challenge_type && (
                  <Badge
                    variant="outline"
                    className="border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 px-3 py-1 text-fuchsia-400"
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

          <CardContent className="bg-gradient-to-b from-gray-800/30 to-gray-900/30 px-5 py-4">
            <p className="mb-4 line-clamp-2 text-base leading-relaxed text-gray-300">
              {discussion.content}
            </p>
            {discussion.tags && discussion.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {discussion.tags.map(tag => (
                  <button
                    key={tag}
                    className="rounded-full border border-cyan-500/20 bg-gray-800/50 px-3 py-1.5 text-sm font-medium text-cyan-400 transition-colors hover:bg-gray-700/50"
                    onClick={e => e.stopPropagation()}
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
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-6 bg-gradient-to-b from-gray-800/30 to-gray-900/30 px-6 py-5">
                  <div className="prose prose-invert max-w-none">
                    <p className="text-base leading-relaxed text-gray-200">
                      {discussion.content}
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center space-x-2 text-lg font-semibold">
                        <span className="bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
                          Comments
                        </span>
                        <span className="text-base text-gray-400">
                          ({discussionComments.length})
                        </span>
                      </h4>
                    </div>

                    <div className="space-y-4">
                      {discussionComments.map(comment => (
                        <div
                          key={comment.id}
                          className="rounded-lg border border-gray-700/30 bg-gray-800/30 p-4 transition-colors hover:border-cyan-500/20"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="mb-2 flex items-center space-x-3">
                            <Avatar className="h-8 w-8 ring-2 ring-cyan-500/20">
                              <AvatarImage
                                src="/avatars/default.jpg"
                                alt="User"
                              />
                              <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium text-gray-200">
                                User
                              </span>
                              <p className="text-xs text-gray-400">
                                {comment.created_at
                                  ? format(
                                      new Date(comment.created_at),
                                      'MMM d, yyyy'
                                    )
                                  : 'Unknown date'}
                              </p>
                            </div>
                          </div>
                          <p className="pl-11 leading-relaxed text-gray-300">
                            {comment.content}
                          </p>
                        </div>
                      ))}

                      <div
                        className="space-y-3"
                        onClick={e => e.stopPropagation()}
                      >
                        <Textarea
                          placeholder="What are your thoughts on this discussion?"
                          value={newComment}
                          onChange={handleCommentChange}
                          className="min-h-[120px] resize-none border-gray-700/50 bg-gray-800/50 text-base focus:border-cyan-500"
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={handleComment}
                            className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-6 py-2 text-base font-medium hover:from-cyan-600 hover:to-fuchsia-600"
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

          <CardFooter className="flex justify-between bg-gradient-to-r from-gray-800/30 to-gray-900/30 p-4">
            <div
              className={`flex cursor-pointer items-center space-x-2 rounded-full px-3 py-1.5 transition-all ${
                isUpvoted
                  ? 'bg-red-400/10 text-red-400'
                  : 'text-gray-400 hover:bg-red-400/10 hover:text-red-400'
              }`}
              onClick={handleUpvote}
            >
              <Heart
                className={`h-5 w-5 ${isUpvoted ? 'fill-current' : ''} transition-transform ${isUpvoted ? 'scale-110' : 'scale-100'}`}
              />
              <span className="font-medium">{localUpvotes}</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1.5 text-gray-400">
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium">{discussionComments.length}</span>
            </div>
          </CardFooter>
        </div>
      </CardWrapper>
      </BaseErrorBoundary>
    );
  }
);

DiscussionCard.displayName = 'DiscussionCard';

export default DiscussionCard;
