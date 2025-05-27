import { useGameContext } from '../context/BingoGameContext'
import type { BoardCell, Player } from '../types/types'
import type { GameSettings } from '../types/gamesettings.types'

interface GameStateReturn {
  boardState: BoardCell[]
  players: Player[]
  settings: GameSettings
  currentPlayer: number
  winner: number | null
  isRunning: boolean
  updateBoard: (newBoard: BoardCell[]) => void
  updatePlayers: (newPlayers: Player[]) => void
  updateSettings: (newSettings: Partial<GameSettings>) => void
  setCurrentPlayer: (index: number) => void
  setWinner: (winner: number | null) => void
  setRunning: (isRunning: boolean) => void
  resetGame: () => void
  lastUpdate: number
  version: number
}

export function useGameState(): GameStateReturn {
  const context = useGameContext()
  if (!context) {
    throw new Error('useGameState must be used within a GameProvider')
  }

  const { state, dispatch } = context

  return {
    ...state,
    updateBoard: (newBoard) => dispatch({ type: 'UPDATE_BOARD', payload: newBoard }),
    updatePlayers: (newPlayers) => dispatch({ type: 'UPDATE_PLAYERS', payload: newPlayers }),
    updateSettings: (newSettings) => dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings }),
    setCurrentPlayer: (index) => dispatch({ type: 'SET_CURRENT_PLAYER', payload: index }),
    setWinner: (winner) => dispatch({ type: 'SET_WINNER', payload: winner }),
    setRunning: (isRunning) => dispatch({ type: 'SET_RUNNING', payload: isRunning }),
    resetGame: () => dispatch({ type: 'RESET_STATE' })
  }
} 