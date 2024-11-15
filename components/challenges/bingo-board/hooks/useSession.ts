'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'
import type { BoardCell, Game, Player } from '../types/types'
import { SESSION_CONSTANTS as _SESSION_CONSTANTS } from '../types/session.constants'
import type { 
  BaseSessionEvent,
  PlayerEvent,
  CellUpdateEvent,
  StateEvent,
  ConnectionEvent,
  SessionEvent as ImportedSessionEvent,
  SessionEventType 
} from '../types/events'
import type { PresenceState } from '../types/presence.types'
import { usePresence } from './usePresence'
import type { SessionCell } from '../types/session.types'

// Session States
interface SessionState {
  isActive: boolean
  isPaused: boolean
  isFinished: boolean
  startTime: number | null
  endTime: number | null
}

// Session Events
interface LocalSessionEvent extends BaseSessionEvent {
  type: 'start' | 'pause' | 'resume' | 'end' | 'playerJoin' | 'playerLeave' | 'cellUpdate'
  timestamp: number
  sessionId: string
  playerId?: string
  data?: unknown
  version?: number
}

interface UseSessionProps {
  boardId: string
  _game: Game
  initialPlayers?: Player[]
  onSessionEnd?: () => void
}

interface UseSession {
  // Session States
  isActive: boolean
  isPaused: boolean
  isFinished: boolean
  
  // Player Management
  players: Player[]
  currentPlayer: Player | null
  addPlayer: (player: Player) => Promise<void>
  removePlayer: (playerId: string) => Promise<void>
  
  // Session Controls
  startSession: () => Promise<void>
  pauseSession: () => Promise<void>
  resumeSession: () => Promise<void>
  endSession: () => Promise<void>
  
  // Game State
  board: BoardCell[]
  updateCell: (cellId: string, updates: Partial<BoardCell>) => Promise<void>
  
  // Stats & Info
  sessionTime: number
  playerCount: number
  completionRate: number
  
  // Presence
  onlineUsers: Player[]
  stateVersion: number
  reconnect: () => void
  error: Error | null
  clearError: () => void
}

type BoardStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'

// Add version to session type
type _SessionWithVersion = Omit<Database['public']['Tables']['bingo_sessions']['Row'], 'id'> & {
  version?: number
  bingo_session_events?: Array<{
    id: string
    event_type: string
    player_id?: string
    data: unknown
    timestamp: number
    version?: number
  }>
}

// Add type conversion helper
const convertDatabaseEventToSessionEvent = (
  dbEvent: Database['public']['Tables']['bingo_session_events']['Row'],
  currentBoardId: string
): ImportedSessionEvent => {
  const { event_type, player_id, data, timestamp, version } = dbEvent
  return {
    type: event_type as SessionEventType,
    sessionId: currentBoardId,
    timestamp,
    version,
    ...(data as Omit<ImportedSessionEvent, 'type' | 'sessionId' | 'timestamp' | 'version'>)
  }
}

export const useSession = ({
  boardId,
  _game,
  initialPlayers = [],
  onSessionEnd
}: UseSessionProps): UseSession => {
  // States
  const [sessionState, setSessionState] = useState<SessionState>({
    isActive: false,
    isPaused: false,
    isFinished: false,
    startTime: null,
    endTime: null
  })

  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [_currentPlayer, _setCurrentPlayer] = useState<Player | null>(null)
  const [board, setBoard] = useState<BoardCell[]>([])
  const [_sessionTime, _setSessionTime] = useState(0)
  const [stateVersion, setStateVersion] = useState<number>(0)

  // Supabase Client
  const supabase = createClientComponentClient<Database>()

  // Add error state
  const [error, setError] = useState<Error | null>(null)

  // Add error handling
  const handleError = useCallback((error: Error) => {
    setError(error)
    console.error('Session error:', error)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Event handlers
  const handleBaseEvent = useCallback((event: LocalSessionEvent) => {
    switch (event.type) {
      case 'start':
        setSessionState(prev => ({ ...prev, isActive: true, startTime: event.timestamp }))
        break
      case 'pause':
        setSessionState(prev => ({ ...prev, isPaused: true }))
        break
      case 'resume':
        setSessionState(prev => ({ ...prev, isPaused: false }))
        break
      case 'end':
        setSessionState(prev => ({ 
          ...prev, 
          isFinished: true, 
          endTime: event.timestamp 
        }))
        break
    }
  }, [])

  const handlePlayerEvent = useCallback((event: PlayerEvent) => {
    if (event.type === 'playerJoin') {
      setPlayers(prev => [...prev, {
        id: event.playerId,
        name: event.playerData.name,
        color: event.playerData.color,
        team: event.playerData.team ?? 0,
        hoverColor: event.playerData.color.replace('500', '600')
      }])
    } else {
      setPlayers(prev => prev.filter(p => p.id !== event.playerId))
    }
  }, [])

  const handleCellUpdate = useCallback((event: CellUpdateEvent) => {
    setBoard(prev => prev.map(cell => 
      cell.cellId === event.cellId 
        ? { ...cell, ...event.updates }
        : cell
    ))
  }, [])

  // Declare mergeState first
  const mergeState = useCallback((newState: BoardCell[], version: number) => {
    if (version < lastReceivedVersion.current) {
      // Ignore outdated updates
      return
    }

    setBoard(prevState => {
      const mergedState = prevState.map((cell, index) => {
        const newCell = newState[index]
        if (!newCell) return cell

        // Merge cell states based on timestamp
        if (newCell.lastUpdated && (!cell.lastUpdated || newCell.lastUpdated > cell.lastUpdated)) {
          return newCell
        }
        return cell
      })

      lastReceivedVersion.current = version
      return mergedState
    })
  }, [])

  // Move emitSessionEvent before it's used
  const emitSessionEvent = useCallback(async (event: Omit<LocalSessionEvent, 'sessionId'>) => {
    try {
      const fullEvent: LocalSessionEvent = {
        ...event,
        sessionId: boardId
      }
      
      const { error: emitError } = await supabase
        .from('bingo_session_events')
        .insert({
          board_id: boardId,
          event_type: fullEvent.type,
          player_id: 'playerId' in fullEvent ? fullEvent.playerId : undefined,
          data: fullEvent,
          timestamp: fullEvent.timestamp,
          version: 'version' in fullEvent ? fullEvent.version : undefined
        })

      if (emitError) throw emitError
    } catch (error) {
      handleError(error as Error)
    }
  }, [boardId, supabase, handleError])

  // Then declare pauseSession and other functions that use emitSessionEvent
  const pauseSession = useCallback(async () => {
    try {
      await supabase
        .from('bingo_boards')
        .update({ status: 'paused' })
        .eq('id', boardId)

      setSessionState(prev => ({
        ...prev,
        isPaused: true
      }))

      emitSessionEvent({
        type: 'pause',
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Error pausing session:', error)
    }
  }, [boardId, supabase, emitSessionEvent])

  // Then define event handlers that use mergeState and pauseSession
  const handleStateEvent = useCallback((event: StateEvent) => {
    if (event.type === 'conflict') {
      if (event.conflictResolution?.winner === 'server') {
        setBoard(event.state)
      }
    } else {
      mergeState(event.state, event.version ?? 0)
    }
  }, [mergeState])

  const handleConnectionEvent = useCallback((event: ConnectionEvent) => {
    if (event.type === 'timeout') {
      pauseSession()
    }
  }, [pauseSession])

  // Then define handleEvent
  const handleEvent = useCallback((event: ImportedSessionEvent | LocalSessionEvent) => {
    try {
      if ('type' in event) {
        switch (event.type) {
          case 'playerJoin':
          case 'playerLeave':
            handlePlayerEvent(event as PlayerEvent)
            break
          case 'cellUpdate':
            handleCellUpdate(event as CellUpdateEvent)
            break
          case 'stateSync':
          case 'conflict':
            handleStateEvent(event as StateEvent)
            break
          case 'reconnect':
          case 'timeout':
            handleConnectionEvent(event as ConnectionEvent)
            break
          default:
            if (isLocalSessionEvent(event)) {
              handleBaseEvent(event)
            }
        }
      }
    } catch (error) {
      handleError(error as Error)
    }
  }, [handleBaseEvent, handleCellUpdate, handleConnectionEvent, handlePlayerEvent, handleStateEvent, handleError])

  // Move recoverState after handleEvent
  const recoverState = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('bingo_sessions')
        .select(`
          *,
          bingo_session_events:bingo_session_events(
            id,
            board_id,
            event_type,
            player_id,
            data,
            timestamp,
            version,
            created_at,
            updated_at
          )
        `)
        .eq('id', boardId)
        .single()

      if (fetchError) throw fetchError

      const typedData = data as unknown as _SessionWithVersion

      // Replay events in order
      if (typedData.bingo_session_events) {
        typedData.bingo_session_events.forEach((event) => {
          try {
            handleEvent(convertDatabaseEventToSessionEvent(event as Database['public']['Tables']['bingo_session_events']['Row'], boardId))
          } catch (eventError) {
            console.warn('Error replaying event:', eventError)
          }
        })
      }

      // Update state version
      setStateVersion(typedData.version ?? 0)
    } catch (error) {
      handleError(error as Error)
    }
  }, [boardId, supabase, handleEvent, setStateVersion, handleError])

  // Player Management
  const addPlayer = useCallback(async (player: Player) => {
    try {
      await supabase
        .from('bingo_session_players')
        .insert({
          session_id: boardId,
          user_id: player.id,
          player_name: player.name,
          color: player.color,
          team: player.team,
          joined_at: new Date().toISOString()
        })

      setPlayers(prev => [...prev, player])
      emitSessionEvent({
        type: 'playerJoin',
        playerId: player.id,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Error adding player:', error)
    }
  }, [boardId, supabase, emitSessionEvent])

  const removePlayer = useCallback(async (playerId: string) => {
    try {
      const { error } = await supabase
        .from('bingo_session_players')
        .delete()
        .eq('board_id', boardId)
        .eq('player_id', playerId)

      if (error) throw error

      setPlayers(prev => prev.filter(p => p.id !== playerId))
      emitSessionEvent({
        type: 'playerLeave',
        playerId,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Error removing player:', error)
    }
  }, [boardId, supabase, emitSessionEvent])

  // Session Controls
  const startSession = useCallback(async () => {
    try {
      const startTime = Date.now()
      await supabase
        .from('bingo_boards')
        .update({ 
          status: 'active' as BoardStatus,
          start_time: startTime
        })
        .eq('id', boardId)

      setSessionState(prev => ({
        ...prev,
        isActive: true,
        startTime
      }))

      emitSessionEvent({
        type: 'start',
        timestamp: startTime
      })
    } catch (error) {
      console.error('Error starting session:', error)
    }
  }, [boardId, supabase, emitSessionEvent])

  const resumeSession = useCallback(async () => {
    try {
      await supabase
        .from('bingo_boards')
        .update({ status: 'active' })
        .eq('id', boardId)

      setSessionState(prev => ({
        ...prev,
        isPaused: false
      }))

      emitSessionEvent({
        type: 'resume',
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Error resuming session:', error)
    }
  }, [boardId, supabase, emitSessionEvent])

  const endSession = useCallback(async () => {
    try {
      const endTime = Date.now()
      await supabase
        .from('bingo_boards')
        .update({ 
          status: 'completed',
          end_time: endTime
        })
        .eq('id', boardId)

      setSessionState(prev => ({
        ...prev,
        isFinished: true,
        endTime
      }))

      emitSessionEvent({
        type: 'end',
        timestamp: endTime
      })

      onSessionEnd?.()
    } catch (error) {
      console.error('Error ending session:', error)
    }
  }, [boardId, supabase, emitSessionEvent, onSessionEnd])

  // Game State Management
  const updateCell = useCallback(async (
    cellId: string, 
    updates: Partial<SessionCell>
  ) => {
    try {
      const newVersion = stateVersion + 1
      setStateVersion(newVersion)

      const { error } = await supabase
        .from('bingo_session_cells')
        .update({
          ...updates,
          version: newVersion,
          lastUpdated: Date.now()
        })
        .eq('id', cellId)

      if (error) throw error

      setBoard(prev => prev.map(cell => 
        cell.cellId === cellId 
          ? { ...cell, ...updates, version: newVersion, lastUpdated: Date.now() }
          : cell
      ))

      emitSessionEvent({
        type: 'cellUpdate',
        playerId: _currentPlayer?.id,
        data: { cellId, updates, version: newVersion },
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Error updating cell:', error)
    }
  }, [supabase, _currentPlayer, emitSessionEvent, stateVersion, setStateVersion])

  // Realtime Updates
  const lastReceivedVersion = useRef<number>(0)

  // Move reconnection logic outside useEffect
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 1000

  const handleDisconnect = useCallback(async () => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      handleError(new Error('Max reconnection attempts reached'))
      return
    }

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        await recoverState()
        reconnectAttemptsRef.current = 0
      } catch (error) {
        console.error('Reconnection failed:', error)
        reconnectAttemptsRef.current++
        handleDisconnect()
      }
    }, RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current))
  }, [recoverState, handleError])

  // Add timeout handling
  useEffect(() => {
    const INACTIVE_TIMEOUT = 5 * 60 * 1000 // 5 minutes
    let inactivityTimeout: NodeJS.Timeout

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimeout)
      inactivityTimeout = setTimeout(() => {
        if (sessionState.isActive && !sessionState.isPaused) {
          pauseSession()
        }
      }, INACTIVE_TIMEOUT)
    }

    if (sessionState.isActive && !sessionState.isPaused) {
      resetInactivityTimer()
    }

    return () => {
      clearTimeout(inactivityTimeout)
    }
  }, [sessionState, pauseSession])

  // Fix onlineUsers type
  const { presenceState: _presenceState, getOnlineUsers } = usePresence(boardId)

  const mapPresenceToPlayers = useCallback((presence: PresenceState[]): Player[] => {
    return presence.map(p => ({
      id: p.user_id,
      name: p.user_id, // Or fetch from players list
      color: 'bg-blue-500', // Default color
      hoverColor: 'hover:bg-blue-600',
      team: 0
    }))
  }, [])

  // Add completionRate calculation
  const completionRate = useMemo(() => {
    const markedCells = board.filter(cell => cell.isMarked).length
    return markedCells / board.length * 100
  }, [board])

  // Add type guard
  const isLocalSessionEvent = (event: ImportedSessionEvent): event is LocalSessionEvent => {
    const localTypes = ['start', 'pause', 'resume', 'end', 'playerJoin', 'playerLeave', 'cellUpdate']
    return localTypes.includes(event.type)
  }

  return {
    // Session States
    isActive: sessionState.isActive,
    isPaused: sessionState.isPaused,
    isFinished: sessionState.isFinished,
    
    // Player Management
    players,
    currentPlayer: _currentPlayer,
    addPlayer,
    removePlayer,
    
    // Session Controls
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    
    // Game State
    board,
    updateCell,
    
    // Stats & Info
    sessionTime: _sessionTime,
    playerCount: players.length,
    completionRate,
    
    // Presence
    onlineUsers: mapPresenceToPlayers(getOnlineUsers()),
    stateVersion,
    reconnect: handleDisconnect,
    error,
    clearError
  }
}
