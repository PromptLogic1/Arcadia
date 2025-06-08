/**
 * Community React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  communityService,
  type DiscussionFilters,
  type EventFilters,
} from '../../services/community.service';
import { notifications } from '@/lib/notifications';
import { queryKeys } from './index';

export function useDiscussionsQuery(
  filters: DiscussionFilters = {},
  page = 1,
  limit = 20
) {
  return useQuery({
    queryKey: queryKeys.community.discussions(filters, page),
    queryFn: () => communityService.getDiscussions(filters, page, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: data => data.data,
  });
}

export function useDiscussionQuery(discussionId?: string) {
  return useQuery({
    queryKey: queryKeys.community.discussion(discussionId || ''),
    queryFn: () => communityService.getDiscussionById(discussionId || ''),
    enabled: !!discussionId,
    staleTime: 1 * 60 * 1000,
    select: data => data.data,
  });
}

export function useEventsQuery(
  filters: EventFilters = {},
  page = 1,
  limit = 20
) {
  return useQuery({
    queryKey: queryKeys.community.events(filters, page),
    queryFn: () => communityService.getEvents(filters, page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes for events
    select: data => data.data,
  });
}

export function useCreateDiscussionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communityService.createDiscussion,
    onSuccess: response => {
      if (!response.success || !response.data) {
        notifications.error(response.error || 'Failed to create discussion');
        return;
      }
      notifications.success('Discussion created successfully!');
      queryClient.invalidateQueries({
        queryKey: queryKeys.community.discussions(),
      });
    },
  });
}

export function useCreateCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communityService.createComment,
    onSuccess: response => {
      if (!response.success || !response.data) {
        notifications.error(response.error || 'Failed to create comment');
        return;
      }
      notifications.success('Comment added successfully!');
      queryClient.invalidateQueries({
        queryKey: queryKeys.community.discussions(),
      });
    },
  });
}

export function useUpvoteDiscussionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communityService.upvoteDiscussion,
    onSuccess: response => {
      if (!response.success || !response.data) {
        notifications.error(response.error || 'Failed to upvote discussion');
        return;
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.community.discussions(),
      });
    },
  });
}
