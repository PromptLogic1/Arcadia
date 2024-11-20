import { createContext, useContext, useReducer, useEffect, useMemo } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'
import type { Player, BoardCell } from '../types/types'
import { SessionService } from '../services/session.service'

interface SessionState {
  id: string
  status: 'initializing' | 'active' | 'paused' | 'completed'
  players: Player[]
  currentPlayer: Player | null
  boardState: BoardCell[]
  version: number
  error: Error | null
  isLoading: boolean
}

type SessionAction =
  | { type: 'INITIALIZE'; payload: { id: string; players: Player[]; boardState: BoardCell[] } }
  | { type: 'UPDATE_STATE'; payload: { boardState: BoardCell[]; version: number } }
  | { type: 'UPDATE_PLAYERS'; payload: Player[] }
  | { type: 'SET_CURRENT_PLAYER'; payload: Player }
  | { type: 'SET_STATUS'; payload: SessionState['status'] }
  | { type: 'SET_ERROR'; payload: Error }
  | { type: 'SET_LOADING'; payload: boolean }

const initialState: SessionState = {
  id: '',
  status: 'initializing',
  players: [],
  currentPlayer: null,
  boardState: [],
  version: 0,
  error: null,
  isLoading: false
}

const SessionContext = createContext<{
  state: SessionState
  dispatch: React.Dispatch<SessionAction>
} | null>(null)

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        id: action.payload.id,
        players: action.payload.players,
        boardState: action.payload.boardState,
        status: 'active'
      }
    case 'UPDATE_STATE':
      return {
        ...state,
        boardState: action.payload.boardState,
        version: action.payload.version
      }
    case 'UPDATE_PLAYERS':
      return {
        ...state,
        players: action.payload
      }
    case 'SET_CURRENT_PLAYER':
      return {
        ...state,
        currentPlayer: action.payload
      }
    case 'SET_STATUS':
      return {
        ...state,
        status: action.payload
      }
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      }
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      }
    default:
      return state
  }
}

interface SessionPayload {
  current_state: BoardCell[];
  version: number;
  [key: string]: unknown;
}

export function SessionProvider({ 
  children,
  boardId 
}: { 
  children: React.ReactNode
  boardId: string 
}) {
  const [state, dispatch] = useReducer(sessionReducer, initialState)
  const supabase = createClientComponentClient<Database>()
  const sessionService = useMemo(() => new SessionService(boardId), [boardId])

  useEffect(() => {
    if (!state.id && boardId) {
      // Initialize session logic here
      // This could involve checking for existing session or creating new one
    }
  }, [boardId, state.id])

  useEffect(() => {
    const channel = supabase.channel(`session:${state.id}`)

    if (state.id) {
      channel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'bingo_sessions',
          filter: `id=eq.${state.id}`
        }, (payload) => {
          if (payload.new) {
            const newState = payload.new as SessionPayload
            dispatch({
              type: 'UPDATE_STATE',
              payload: {
                boardState: newState.current_state,
                version: newState.version
              }
            })
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'bingo_session_players',
          filter: `session_id=eq.${state.id}`
        }, (payload) => {
          if (payload.new) {
            const event = sessionService.handlePlayerSync([payload.new as Player])
            if (event.data && typeof event.data === 'object' && 'players' in event.data) {
              dispatch({ 
                type: 'UPDATE_PLAYERS', 
                payload: [...state.players, ...(event.data.players as Player[])]
              })
            }
          }
        })
        .subscribe()
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [state.id, supabase, sessionService, state.players])

  return (
    <SessionContext.Provider value={{ state, dispatch }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSessionContext() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider')
  }
  return context
} 