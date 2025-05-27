// =============================================================================
// BINGO BOARD SPECIFIC TYPES
// =============================================================================
// Re-export from main types for compatibility

// Just re-export everything from the main types file for now
export * from './index'
import type { BingoBoard } from './index'

// Additional hook-specific interfaces
export interface UseBingoBoardProps {
  boardId: string
  userId?: string
  enableRealtime?: boolean
}

export interface UseBingoBoardReturn {
  board: BingoBoard | null
  loading: boolean
  error: string | null
  updateBoard: (updates: Partial<BingoBoard>) => Promise<void>
  deleteBoard: () => Promise<void>
  duplicateBoard: () => Promise<BingoBoard>
  refreshBoard: () => Promise<void>
}

// Re-export constants
export * from './constants' 