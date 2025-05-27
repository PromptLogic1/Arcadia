import type { ReactNode } from 'react'
import type { Tables } from '@/types/database.types'

// Database types
export type Comment = Tables<'comments'>
export type Discussion = Tables<'discussions'>

// Extended types for UI components
export interface CommentWithAuthor extends Comment {
  author?: {
    username: string
    avatar_url?: string
  }
}

export interface DiscussionWithAuthor extends Discussion {
  author?: {
    username: string
    avatar_url?: string
  }
  comment_count?: number
}

// Event types (not in database yet - could be added later)
export interface Event {
  readonly id: number
  readonly title: string
  readonly date: Date
  readonly game: string
  readonly participants: number
  readonly prize: string
  readonly description: string
  readonly tags: readonly string[]
}

// Component prop types
export interface CardWrapperProps {
  readonly children: ReactNode
  readonly onClick?: () => void
  readonly className?: string
  readonly hoverAccentColor?: 'cyan' | 'fuchsia' | 'lime'
}

export interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: ReactNode
  readonly className?: string
  readonly variant?: 'default' | 'outline' | 'ghost'
}

// Form types for creating discussions/comments
export interface CreateDiscussionFormData {
  title: string
  content: string
  game: string
  challenge_type?: string
  tags?: string[]
}

export interface CreateCommentFormData {
  content: string
  discussion_id: number
}

// Filter and sort types
export interface DiscussionFilters {
  game?: string
  challenge_type?: string
  tags?: string[]
  author_id?: string
}

export type DiscussionSortBy = 'newest' | 'oldest' | 'most_upvoted' | 'most_comments' 