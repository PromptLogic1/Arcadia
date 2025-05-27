// Import and re-export types from the community store to ensure consistency
import type { Discussion, Comment } from '@/src/lib/stores/community-store'
export type { Discussion, Comment } from '@/src/lib/stores/community-store'

// Additional UI-specific types that extend the base types
export interface DiscussionWithAuthor extends Discussion {
  author?: {
    username: string
    avatar_url?: string
  }
  comment_count?: number
}

export interface CommentWithAuthor extends Comment {
  author?: {
    username: string
    avatar_url?: string
  }
}

// Form types for creating discussions/comments
export interface CreateDiscussionFormData {
  title: string
  content: string
  game: string
  challenge_type?: string | null
  tags?: string[] | null
}

export interface CreateCommentFormData {
  content: string
  discussion_id: number
} 