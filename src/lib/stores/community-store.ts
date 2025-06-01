import { createWithEqualityFn } from 'zustand/traditional';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import type { Tables } from '@/types/database-generated';

// Use the actual database-generated types
export type Discussion = Tables<'discussions'>;
export type Comment = Tables<'comments'>;

export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  game: string;
  prize: string;
  participants: number;
  maxParticipants: number;
  tags: string[];
  created_at: string | null;
  updated_at: string | null;
}

interface CommunityState {
  // State
  discussions: Discussion[];
  comments: Comment[];
  events: Event[];
  selectedDiscussion: Discussion | null;
  loading: boolean;
  error: string | null;
  filters: {
    game: string | null;
    challengeType: string | null;
    tags: string[];
    searchTerm: string;
  };

  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDiscussions: (discussions: Discussion[]) => void;
  setComments: (comments: Comment[]) => void;
  setEvents: (events: Event[]) => void;
  setSelectedDiscussion: (discussion: Discussion | null) => void;
  addDiscussion: (discussion: Discussion) => void;
  updateDiscussion: (id: number, updates: Partial<Discussion>) => void;
  removeDiscussion: (id: number) => void;
  addComment: (comment: Comment) => void;
  updateComment: (id: number, updates: Partial<Comment>) => void;
  removeComment: (id: number) => void;
  upvoteDiscussion: (id: number) => void;
  upvoteComment: (id: number) => void;
  setFilters: (filters: Partial<CommunityState['filters']>) => void;
  clearFilters: () => void;
}

export const useCommunityStore = createWithEqualityFn<CommunityState>()(
  devtools(
    (set, get) => ({
      // Initial state
      discussions: [],
      comments: [],
      events: [],
      selectedDiscussion: null,
      loading: false,
      error: null,
      filters: {
        game: null,
        challengeType: null,
        tags: [],
        searchTerm: '',
      },

      // Actions
      setLoading: loading => set({ loading }, false, 'community/setLoading'),

      setError: error => set({ error }, false, 'community/setError'),

      setDiscussions: discussions =>
        set({ discussions, error: null }, false, 'community/setDiscussions'),

      setComments: comments =>
        set({ comments }, false, 'community/setComments'),

      setEvents: events => set({ events }, false, 'community/setEvents'),

      setSelectedDiscussion: selectedDiscussion =>
        set({ selectedDiscussion }, false, 'community/setSelectedDiscussion'),

      addDiscussion: discussion => {
        const { discussions } = get();
        set(
          { discussions: [discussion, ...discussions] },
          false,
          'community/addDiscussion'
        );
      },

      updateDiscussion: (id, updates) => {
        const { discussions, selectedDiscussion } = get();
        set(
          {
            discussions: discussions.map(discussion =>
              discussion.id === id ? { ...discussion, ...updates } : discussion
            ),
            selectedDiscussion:
              selectedDiscussion?.id === id
                ? { ...selectedDiscussion, ...updates }
                : selectedDiscussion,
          },
          false,
          'community/updateDiscussion'
        );
      },

      removeDiscussion: id => {
        const { discussions, selectedDiscussion } = get();
        set(
          {
            discussions: discussions.filter(discussion => discussion.id !== id),
            selectedDiscussion:
              selectedDiscussion?.id === id ? null : selectedDiscussion,
          },
          false,
          'community/removeDiscussion'
        );
      },

      addComment: comment => {
        const { comments } = get();
        set(
          { comments: [comment, ...comments] },
          false,
          'community/addComment'
        );
      },

      updateComment: (id, updates) => {
        const { comments } = get();
        set(
          {
            comments: comments.map(comment =>
              comment.id === id ? { ...comment, ...updates } : comment
            ),
          },
          false,
          'community/updateComment'
        );
      },

      removeComment: id => {
        const { comments } = get();
        set(
          { comments: comments.filter(comment => comment.id !== id) },
          false,
          'community/removeComment'
        );
      },

      upvoteDiscussion: id => {
        const { discussions } = get();
        set(
          {
            discussions: discussions.map(discussion =>
              discussion.id === id
                ? { ...discussion, upvotes: (discussion.upvotes || 0) + 1 }
                : discussion
            ),
          },
          false,
          'community/upvoteDiscussion'
        );
      },

      upvoteComment: id => {
        const { comments } = get();
        set(
          {
            comments: comments.map(comment =>
              comment.id === id
                ? { ...comment, upvotes: (comment.upvotes || 0) + 1 }
                : comment
            ),
          },
          false,
          'community/upvoteComment'
        );
      },

      setFilters: newFilters => {
        const { filters } = get();
        set(
          { filters: { ...filters, ...newFilters } },
          false,
          'community/setFilters'
        );
      },

      clearFilters: () =>
        set(
          {
            filters: {
              game: null,
              challengeType: null,
              tags: [],
              searchTerm: '',
            },
          },
          false,
          'community/clearFilters'
        ),
    }),
    {
      name: 'community-store',
    }
  )
);

// Selectors
export const useCommunity = () =>
  useCommunityStore(
    useShallow(state => ({
      discussions: state.discussions,
      comments: state.comments,
      events: state.events,
      selectedDiscussion: state.selectedDiscussion,
      loading: state.loading,
      error: state.error,
      filters: state.filters,
    }))
  );

export const useCommunityActions = () =>
  useCommunityStore(
    useShallow(state => ({
      setLoading: state.setLoading,
      setError: state.setError,
      setDiscussions: state.setDiscussions,
      setComments: state.setComments,
      setEvents: state.setEvents,
      setSelectedDiscussion: state.setSelectedDiscussion,
      addDiscussion: state.addDiscussion,
      updateDiscussion: state.updateDiscussion,
      removeDiscussion: state.removeDiscussion,
      addComment: state.addComment,
      updateComment: state.updateComment,
      removeComment: state.removeComment,
      upvoteDiscussion: state.upvoteDiscussion,
      upvoteComment: state.upvoteComment,
      setFilters: state.setFilters,
      clearFilters: state.clearFilters,
    }))
  );
