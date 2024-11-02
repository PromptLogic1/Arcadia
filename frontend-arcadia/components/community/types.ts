import { ReactNode } from 'react'

export interface Discussion {
  id: number
  author: string
  avatar: string
  title: string
  game: string
  challengeType: string | null
  comments: number
  upvotes: number
  content: string
  date: string
  tags: readonly string[]
  commentList?: Comment[]
}

export interface Event {
  id: number
  title: string
  date: Date
  game: string
  participants: number
  prize: string
  description: string
  tags: readonly string[]
}

export interface CardWrapperProps {
  children: ReactNode
  onClick: () => void
  className?: string
  hoverAccentColor?: 'cyan' | 'fuchsia' | 'lime'
}

export interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  className?: string
}

export interface Comment {
  id: number
  author: string
  avatar: string
  content: string
  date: string
  upvotes: number
} 