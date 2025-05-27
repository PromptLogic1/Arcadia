import React, { createContext, useContext, useReducer, useEffect } from 'react'
import type { BoardCell, Player } from '../types/types'
import type { GameSettings } from '../types/gamesettings.types'
import { DEFAULT_GAME_SETTINGS } from '../types/gamesettings.constants'
import { log } from '@/lib/logger'

// State Types
interface GameState {
  boardState: BoardCell[]
  players: Player[]
  settings: GameSettings
  currentPlayer: number
  winner: number | null
  isRunning: boolean
  lastUpdate: number
  version: number
}

// Action Types
type GameAction = 
  | { type: 'UPDATE_BOARD'; payload: BoardCell[] }
  | { type: 'UPDATE_PLAYERS'; payload: Player[] }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<GameSettings> }
  | { type: 'SET_CURRENT_PLAYER'; payload: number }
  | { type: 'SET_WINNER'; payload: number | null }
  | { type: 'SET_RUNNING'; payload: boolean }
  | { type: 'SYNC_STATE'; payload: Partial<GameState> }
  | { type: 'RESET_STATE' }

// Initial State
const initialState: GameState = {
  boardState: [],
  players: [],
  settings: DEFAULT_GAME_SETTINGS,
  currentPlayer: 0,
  winner: null,
  isRunning: false,
  lastUpdate: Date.now(),
  version: 0
}

// Reducer
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'UPDATE_BOARD':
      return {
        ...state,
        boardState: action.payload,
        lastUpdate: Date.now(),
        version: state.version + 1
      }
    case 'UPDATE_PLAYERS':
      return {
        ...state,
        players: action.payload,
        lastUpdate: Date.now()
      }
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
        lastUpdate: Date.now()
      }
    case 'SET_CURRENT_PLAYER':
      return {
        ...state,
        currentPlayer: action.payload,
        lastUpdate: Date.now()
      }
    case 'SET_WINNER':
      return {
        ...state,
        winner: action.payload,
        isRunning: false,
        lastUpdate: Date.now()
      }
    case 'SET_RUNNING':
      return {
        ...state,
        isRunning: action.payload,
        lastUpdate: Date.now()
      }
    case 'SYNC_STATE':
      return {
        ...state,
        ...action.payload,
        lastUpdate: Date.now(),
        version: state.version + 1
      }
    case 'RESET_STATE':
      return {
        ...initialState,
        lastUpdate: Date.now()
      }
    default:
      return state
  }
}

// Context
interface GameContextValue {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

const GameContext = createContext<GameContextValue | undefined>(undefined)

// Provider Component
interface GameProviderProps {
  children: React.ReactNode
  initialBoard?: BoardCell[]
  initialPlayers?: Player[]
  initialSettings?: Partial<GameSettings>
}

export function GameProvider({
  children,
  initialBoard = [],
  initialPlayers = [],
  initialSettings = {}
}: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, {
    ...initialState,
    boardState: initialBoard,
    players: initialPlayers,
    settings: { ...DEFAULT_GAME_SETTINGS, ...initialSettings }
  })

  // Persistence
  useEffect(() => {
    const savedState = localStorage.getItem('bingoGameState')
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        dispatch({ type: 'SYNC_STATE', payload: parsed })
      } catch (error) {
        log.error('Failed to restore game state', error as Error, { metadata: { contextName: 'BingoGameContext' } })
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('bingoGameState', JSON.stringify(state))
  }, [state])

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  )
}

// Custom Hook
export function useGameContext() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider')
  }
  return context
} 