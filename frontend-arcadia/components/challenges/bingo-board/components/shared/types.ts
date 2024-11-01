import { ReactNode } from 'react'

export interface ColorOption {
  name: string
  color: string
  hoverColor: string
}

export interface Player {
  name: string
  color: string
  hoverColor: string
  team: number
}

export interface BoardCell {
  text: string
  colors: string[]
}

export interface GameSettings {
  boardSize: number
  soundEnabled: boolean
  teamMode: boolean
  lockout: boolean
}

export interface WinConditions {
  line: boolean
  majority: boolean
}

export interface BingoBoardDetailProps {
  board: {
    readonly id: number
    readonly name: string
    readonly players: number
    readonly size: number
    readonly timeLeft: number
    readonly votes: number
    readonly game: string
    readonly createdAt: Date
    readonly votedBy: ReadonlySet<string>
    readonly bookmarked: boolean
  }
  onClose: () => void
  onBookmark: () => void
}

export interface NeonTextProps {
  children: ReactNode
  className?: string
}