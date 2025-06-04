'use client';

import { useCallback } from 'react';
import { useDiscussionsQuery, useCreateDiscussionMutation, useCreateCommentMutation, useUpvoteDiscussionMutation } from '@/hooks/queries/useCommunityQueries';
import { useCommunityState } from '@/lib/stores/community-store';
import { useAuth } from '@/lib/stores/auth-store';
import type { DiscussionWithAuthor as Discussion, CommentWithAuthor as Comment, CreateDiscussionFormData, CreateCommentFormData } from '@/features/community/types/types';

// Re-export types for other hooks
export type { Discussion, Comment };

export interface UseDiscussionsReturn {
  discussions: Discussion[];
  error: Error | null;
  isLoading: boolean;
  addDiscussion: (discussionData: CreateDiscussionFormData) => Promise<Discussion>;
  addComment: (discussionId: number, commentData: CreateCommentFormData) => Promise<Comment>;
  upvoteDiscussion: (discussionId: number) => Promise<void>;
}

export function useDiscussions(): UseDiscussionsReturn {
  const { authUser } = useAuth();
  const { filters } = useCommunityState();
  
  // Use TanStack Query for data fetching
  const { 
    data: discussionsData, 
    isLoading, 
    error: queryError 
  } = useDiscussionsQuery({
    ...filters,
    challengeType: filters.challengeType ?? undefined,
  });
  
  const createDiscussionMutation = useCreateDiscussionMutation();
  const createCommentMutation = useCreateCommentMutation();
  const upvoteDiscussionMutation = useUpvoteDiscussionMutation();

  const addDiscussion = useCallback(async (discussionData: CreateDiscussionFormData): Promise<Discussion> => {
    if (!authUser?.id) {
      throw new Error('Must be authenticated to create discussion');
    }

    const result = await createDiscussionMutation.mutateAsync({
      ...discussionData,
      author_id: authUser.id,
    });

    if (result.error) {
      throw new Error(result.error);
    }

    if (!result.discussion) {
      throw new Error('Failed to create discussion');
    }

    return result.discussion;
  }, [authUser?.id, createDiscussionMutation]);

  const addComment = useCallback(async (discussionId: number, commentData: CreateCommentFormData): Promise<Comment> => {
    if (!authUser?.id) {
      throw new Error('Must be authenticated to create comment');
    }

    const result = await createCommentMutation.mutateAsync({
      ...commentData,
      author_id: authUser.id,
      discussion_id: discussionId.toString(), // Service expects string
    });

    if (result.error) {
      throw new Error(result.error);
    }

    if (!result.comment) {
      throw new Error('Failed to create comment');
    }

    return result.comment;
  }, [authUser?.id, createCommentMutation]);

  const upvoteDiscussion = useCallback(async (discussionId: number): Promise<void> => {
    const result = await upvoteDiscussionMutation.mutateAsync(discussionId.toString());
    
    if (result.error) {
      throw new Error(result.error);
    }
  }, [upvoteDiscussionMutation]);

  return {
    discussions: discussionsData?.discussions || [],
    error: queryError || createDiscussionMutation.error || createCommentMutation.error || upvoteDiscussionMutation.error || null,
    isLoading: isLoading || createDiscussionMutation.isPending || createCommentMutation.isPending || upvoteDiscussionMutation.isPending,
    addDiscussion,
    addComment,
    upvoteDiscussion,
  };
}