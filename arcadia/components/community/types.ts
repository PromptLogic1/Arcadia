import { ReactNode } from 'react'

export interface Comment {
  readonly id: number
  readonly author: string
  readonly avatar: string
  readonly content: string
  readonly date: string
  readonly upvotes: number
}

export interface Discussion {
  readonly id: number
  readonly author: string
  readonly avatar: string
  readonly title: string
  readonly game: string
  readonly challengeType: string | null
  comments: number
  upvotes: number
  readonly content: string
  readonly date: string
  readonly tags: readonly string[]
  commentList: Comment[]
}

export interface Event {
  readonly id: number
  readonly title: string
  readonly date: Date
  readonly game: string
  participants: number
  readonly prize: string
  readonly description: string
  readonly tags: readonly string[]
}

export interface CardWrapperProps {
  readonly children: ReactNode
  readonly onClick: () => void
  readonly className?: string
  readonly hoverAccentColor?: 'cyan' | 'fuchsia' | 'lime'
}

export interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: ReactNode
  readonly className?: string
} 