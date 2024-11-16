import type { BoardCell, Player } from './types'
import { BINGO_GAME_CONSTANTS } from './bingogame.constants'

export type GamePhase = typeof BINGO_GAME_CONSTANTS.GAME_PHASES[keyof typeof BINGO_GAME_CONSTANTS.GAME_PHASES]

export type LastMove = {
  position: number
  row: number
  col: number
  playerId: string
} | null

export type MarkedFields = {
  total: number
  byPlayer: Record<string, number>
}

export type GameError = {
  type: typeof BINGO_GAME_CONSTANTS.ERROR_TYPES[keyof typeof BINGO_GAME_CONSTANTS.ERROR_TYPES]
  message: string
  recoverable: boolean
}

export type BeforeMoveEvent = {
  position: number
  playerId: string
  isValid: boolean
  reason?: string
}

export type AfterMoveEvent = {
  move: LastMove
  markedFields: MarkedFields
  nextPlayer: string
}

export type GameEndEvent = {
  winner: string | -1
  reason: 'line' | 'majority' | 'tie'
  winningLine?: number[]
}

export interface UseBingoGameProps {
  initialSize: number
  players: Player[]
}

export interface UseBingoGameReturn {
  // States
  boardState: BoardCell[]
  setBoardState: (state: BoardCell[]) => void
  winner: number | null
  setWinner: (winner: number | null) => void
  boardSize: number
  setBoardSize: (size: number) => void
  winConditions: {
    line: boolean
    majority: boolean
  }
  setWinConditions: (conditions: { line: boolean; majority: boolean }) => void
  blockingState: {
    isBlockingMode: boolean
    playerWithBlock: number | null
    earnedFromCell: number | null
  }
  setBlockingState: (state: {
    isBlockingMode: boolean
    playerWithBlock: number | null
    earnedFromCell: number | null
  }) => void

  // Core Functions
  generateBoard: () => void
  resetBoard: () => void
  handleCellChange: (index: number, value: string) => void
  handleCellClick: (index: number) => void
  checkWinningCondition: (players: Player[], timeExpired?: boolean) => boolean
  updateBoardState: (index: number, updates: Partial<BoardCell>) => void
}
