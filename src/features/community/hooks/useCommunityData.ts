import { useCallback } from 'react';
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
  ) => Promise<void>;
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

  // Initialize mock event data lazily
  // This is acceptable since events will be replaced with real API calls later
  const eventsData = storeEvents.length === 0 ? MOCK_EVENTS : storeEvents;
  if (storeEvents.length === 0 && eventsData.length > 0) {
    // Set events in the next tick to avoid updating state during render
    Promise.resolve().then(() => setEvents([...MOCK_EVENTS]));
  }

  // Events are mocked, so we don't have real loading state
  // This is acceptable since events will be replaced with real API calls later
  const isEventsLoading = false;
  const isInitialLoad = isRealDiscussionsLoading;

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
      await realAddComment(discussionId, {
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
    events: eventsData,
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
