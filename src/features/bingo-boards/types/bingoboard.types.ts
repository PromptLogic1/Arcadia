import type { BoardCell } from './types'
import type { Database } from '@/types/database.types'

export interface BingoBoardState {
  board: Database['public']['Tables']['bingo_boards']['Row'] | null
  loading: boolean
  error: Error | null
}

export interface BingoBoardResponse {
  data: Database['public']['Tables']['bingo_boards']['Row'] | null
  error: Error | null
}

export interface BoardUpdate {
  state: BoardCell[]
  version: number
  timestamp: number
}

export interface BoardConflict {
  clientState: BoardCell[]
  serverState: BoardCell[]
  timestamp: number
  resolution: 'client' | 'server'
}

export interface BoardValidationResult {
  isValid: boolean
  errors: string[]
}

export interface UseBingoBoardProps {
  boardId: string
}

export interface UseBingoBoardReturn {
  board: Database['public']['Tables']['bingo_boards']['Row'] | null
  loading: boolean
  error: Error | null
  updateBoardState: (newState: BoardCell[]) => Promise<void>
  updateBoardSettings: (settings: Partial<Database['public']['Tables']['bingo_boards']['Row']>) => Promise<void>
}
