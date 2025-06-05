import { useEffect, useState, useCallback, useRef } from 'react';
import {
  useCommunity,
  useCommunityActions,
  type Discussion as StoreDiscussion,
  type Event,
} from '@/lib/stores/community-store';
import { MOCK_EVENTS } from '@/features/community/constants';
import {
  useDiscussions,
  type Discussion,
  type Comment,
} from './useDiscussions';

// =============================================================================
// TYPES
// =============================================================================

export interface UseCommunityDataReturn {
  discussions: Discussion[];
  comments: Comment[];
  events: Event[];
  selectedDiscussion: StoreDiscussion | null;
  loading: boolean;
  error: string | null;

  isDiscussionsLoading: boolean;
  isEventsLoading: boolean;
  isInitialLoad: boolean;

  handleCreateDiscussion: (
    formData: CreateDiscussionFormData
  ) => Promise<Discussion>;
  handleUpvote: (discussionId: number) => Promise<void>;
  handleComment: (
    discussionId: number,
    commentData: CommentFormData
  ) => Promise<Comment>;
  setSelectedDiscussion: (discussion: StoreDiscussion | null) => void;
}

export interface CreateDiscussionFormData {
  title: string;
  content: string;
  game: string;
  challenge_type?: string | null;
  tags?: string[] | null;
}

export interface CommentFormData {
  content: string;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Custom hook for managing community data and interactions
 *
 * Handles:
 * - Data initialization from store
 * - Loading states management
 * - Discussion creation, upvoting, commenting
 * - Mock data setup for development
 *
 * @returns Community data and interaction handlers
 */
export function useCommunityData(): UseCommunityDataReturn {
  // Zustand store integration for UI state like selectedDiscussion and for Events (mocked)
  const { selectedDiscussion: storeSelectedDiscussion, events: storeEvents } =
    useCommunity();
  const { setEvents, setSelectedDiscussion: setStoreSelectedDiscussion } =
    useCommunityActions();

  // Real data fetching for discussions and comments via useDiscussions
  const {
    discussions: realDiscussions,
    error: discussionsError,
    isLoading: isRealDiscussionsLoading,
    addDiscussion: realAddDiscussion,
    addComment: realAddComment,
    upvoteDiscussion: realUpvoteDiscussion,
  } = useDiscussions();

  // Combine comments from all discussions from useDiscussions
  const allComments = realDiscussions.flatMap(_d => []);

  // Loading states
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Ref to track timeout for cleanup
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, []);

  // Initialize mock event data (discussions are now from useDiscussions)
  useEffect(() => {
    if (storeEvents.length === 0) {
      setEvents([...MOCK_EVENTS]);
    }
  }, [storeEvents.length, setEvents]);

  // Simulate API loading for events and initial page perception
  useEffect(() => {
    // Skip if discussions are still loading
    if (isRealDiscussionsLoading) {
      return;
    }

    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    loadingTimeoutRef.current = setTimeout(() => {
      loadingTimeoutRef.current = null;
      setIsInitialLoad(false);
      setIsEventsLoading(false);
    }, 1000);

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [isRealDiscussionsLoading]);

  const handleCreateDiscussion = useCallback(
    async (formData: CreateDiscussionFormData) => {
      return realAddDiscussion({
        ...formData,
        challenge_type: formData.challenge_type || undefined,
        tags: formData.tags || undefined,
      });
    },
    [realAddDiscussion]
  );

  const handleUpvote = useCallback(
    async (discussionId: number) => {
      await realUpvoteDiscussion(discussionId);
    },
    [realUpvoteDiscussion]
  );

  const handleComment = useCallback(
    async (discussionId: number, commentData: CommentFormData) => {
      return realAddComment(discussionId, {
        ...commentData,
        discussion_id: discussionId.toString(),
      });
    },
    [realAddComment]
  );

  const combinedError = discussionsError ? discussionsError.message : null;

  return {
    discussions: realDiscussions,
    comments: allComments,
    events: storeEvents,
    selectedDiscussion: storeSelectedDiscussion,
    loading: isRealDiscussionsLoading || isEventsLoading,
    error: combinedError,

    isDiscussionsLoading: isRealDiscussionsLoading,
    isEventsLoading,
    isInitialLoad: isInitialLoad && isRealDiscussionsLoading,

    handleCreateDiscussion,
    handleUpvote,
    handleComment,
    setSelectedDiscussion: setStoreSelectedDiscussion,
  };
}
