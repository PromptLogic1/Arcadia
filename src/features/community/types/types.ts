import type { ReactNode } from 'react';
import type { Tables } from '@/types/database-generated';

// Database types
export type Comment = Tables<'comments'>;
export type Discussion = Tables<'discussions'>;

// Extended types for UI components
export interface CommentWithAuthor extends Comment {
  author?: {
    username: string;
    avatar_url?: string | null;
  };
}

export interface DiscussionWithAuthor extends Discussion {
  author?: {
    username: string;
    avatar_url?: string | null;
  };
  comment_count?: number;
}

// Event types (not in database yet - could be added later)
export interface Event {
  readonly id: number;
  readonly title: string;
  readonly date: string;
  readonly game: string;
  participants: number;
  maxParticipants?: number;
  readonly prize: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly created_at?: string;
  readonly updated_at?: string;
}

// Component prop types
export interface CardWrapperProps {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly className?: string;
}

// Form types for creating discussions/comments
export interface CreateDiscussionFormData {
  title: string;
  content: string;
  game: string;
  challenge_type?: string;
  tags?: string[];
}

export interface CreateCommentFormData {
  content: string;
  discussion_id?: string;
}

// Filter and sort types
export interface DiscussionFilters {
  game?: string | null;
  challengeType?: string | null;
  tags?: string[];
  searchTerm?: string;
}

export type DiscussionSortBy =
  | 'newest'
  | 'oldest'
  | 'most_upvoted'
  | 'most_comments';
