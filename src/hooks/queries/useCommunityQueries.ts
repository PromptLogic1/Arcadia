/**
 * Community React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { communityService, type DiscussionFilters, type EventFilters } from '../../services/community.service';
import { notifications } from '@/lib/notifications';
import { queryKeys } from './index';

export function useDiscussionsQuery(filters: DiscussionFilters = {}, page = 1, limit = 20) {
  return useQuery({
    queryKey: queryKeys.community.discussions(filters, page),
    queryFn: () => communityService.getDiscussions(filters, page, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useDiscussionQuery(discussionId?: string) {
  return useQuery({
    queryKey: queryKeys.community.discussion(discussionId || ''),
    queryFn: () => communityService.getDiscussionById(discussionId || ''),
    enabled: !!discussionId,
    staleTime: 1 * 60 * 1000,
  });
}

export function useEventsQuery(filters: EventFilters = {}, page = 1, limit = 20) {
  return useQuery({
    queryKey: queryKeys.community.events(filters, page),
    queryFn: () => communityService.getEvents(filters, page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes for events
  });
}

export function useCreateDiscussionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communityService.createDiscussion,
    onSuccess: (response) => {
      if (response.error) {
        notifications.error(response.error);
        return;
      }
      notifications.success('Discussion created successfully!');
      queryClient.invalidateQueries({ queryKey: queryKeys.community.discussions() });
    },
  });
}

export function useCreateCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communityService.createComment,
    onSuccess: (response) => {
      if (response.error) {
        notifications.error(response.error);
        return;
      }
      notifications.success('Comment added successfully!');
      queryClient.invalidateQueries({ queryKey: queryKeys.community.discussions() });
    },
  });
}

export function useUpvoteDiscussionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communityService.upvoteDiscussion,
    onSuccess: (response) => {
      if (response.error) {
        notifications.error(response.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.community.discussions() });
    },
  });
}