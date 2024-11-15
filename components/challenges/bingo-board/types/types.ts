export const GAMES = [
  "All Games",
  "World of Warcraft",
  "Fortnite",
  "Minecraft",
  "Among Us",
  "Apex Legends",
  "League of Legends",
  "Overwatch",
  "Call of Duty: Warzone",
  "Valorant",
] as const

export type Game = (typeof GAMES)[number]

export interface ColorOption {
  name: string
  color: string
  hoverColor: string
}

export interface Player {
  id: string
  name: string
  color: string
  hoverColor: string
  team: number
}

export interface BoardCell {
  text: string
  colors: string[]
  completedBy: string[]
  blocked: boolean
  isMarked: boolean
  cellId: string
  version?: number
  lastUpdated?: number
  lastModifiedBy?: string
  conflictResolution?: {
    timestamp: number
    resolvedBy: string
    originalValue: string
  }
}

export interface WinConditions {
  line: boolean
  majority: boolean
}

export interface Board {
  id: number
  name: string
  players: number
  size: number
  timeLeft: number
  votes: number
  game: Game
  createdAt: Date | string
  votedBy: Set<string> | string[] // Allow both Set and array for serialization
  bookmarked: boolean
  creator: string
  avatar: string
  winConditions: WinConditions
  difficulty: 'beginner' | 'easy' | 'medium' | 'hard' | 'expert'
  clonedFrom?: number  // Reference to original board if this is a clone
  isPublic: boolean    // Whether this board appears in "All Boards"
}

export interface BingoBoardDetailProps {
  board: Board
  onBookmark: () => void
  onClose: () => void
}

export interface BoardCardProps {
  board: Board
  section: 'bookmarked' | 'all'
  onVote: (boardId: number, userId: string) => void
  onBookmark: (boardId: number) => void
  onSelect: (board: Board, section: string) => void
}

export function isSet(value: Set<string> | string[]): value is Set<string> {
  return value instanceof Set
}

export interface GameState {
  currentState: BoardCell[]
  version: number
  lastUpdate: string
}

export interface QueueEntry {
  id: string
  sessionId: string
  userId: string
  playerName: string
  color: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
  error?: string
}