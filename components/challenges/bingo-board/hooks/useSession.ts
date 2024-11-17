'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'
import type { BoardCell, Game as _Game, Player } from '../types/types'
import type { 
  BaseSessionEvent,
  PlayerEvent,
  CellUpdateEvent,
  StateEvent,
  ConnectionEvent,
  UseSessionProps,
  UseSessionReturn
} from '../types/session.types'
import { usePresence } from './usePresence'
import { SessionService } from '../services/session.service'
import { SESSION_CONSTANTS } from '../types/session.constants'

export const useSession = ({
  boardId,
  _game,
  initialPlayers = [],
  onSessionEnd
}: UseSessionProps): UseSessionReturn => {
  // Initialize state immediately
  const [sessionState, setSessionState] = useState({
    isActive: false,
    isPaused: false,
    isFinished: false,
    startTime: null as number | null,
    endTime: null as number | null
  });

  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [board, setBoard] = useState<BoardCell[]>([]);
  const [stateVersion, setStateVersion] = useState<number>(0);
  const [error, setError] = useState<Error | null>(null);

  // Initialize refs
  const lastReceivedVersion = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Initialize services
  const supabase = createClientComponentClient<Database>();
  const _sessionService = new SessionService();
  const { getOnlineUsers } = usePresence(boardId);

  // Error Handling
  const handleError = useCallback((error: Error) => {
    console.error('Session error:', error)
    setError(error)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Add emitSessionEvent function before other event handlers
  const emitSessionEvent = useCallback(async (event: BaseSessionEvent) => {
    try {
      await supabase
        .from('bingo_session_events')
        .insert({
          board_id: boardId,
          event_type: event.type,
          data: event,
          timestamp: event.timestamp,
          version: stateVersion + 1
        })
        .single()

      // Update state version after successful event emission
      setStateVersion(prev => prev + 1)
    } catch (error) {
      handleError(error as Error)
    }
  }, [boardId, supabase, stateVersion, handleError])

  // Event Handlers
  const handlePlayerEvent = useCallback((event: PlayerEvent) => {
    if (event.type === 'playerJoin') {
      setPlayers(prev => {
        if (prev.some(p => p.id === event.playerId)) {
          return prev
        }
        const newPlayer = {
          id: event.playerId,
          name: event.playerData.name,
          color: event.playerData.color,
          hoverColor: `hover:${event.playerData.color.replace('bg-', '')}`,
          team: event.playerData.team ?? 0
        }
        return [...prev, newPlayer]
      })
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

  const handleStateEvent = useCallback((event: StateEvent) => {
    if (event.state && Array.isArray(event.state)) {
      if (!event.version || event.version > lastReceivedVersion.current) {
        setBoard(event.state)
        if (event.version) {
          setStateVersion(event.version)
          lastReceivedVersion.current = event.version
        }
        setTimeout(() => {
          setBoard(event.state)
        }, 0)
      }
    }
  }, [])

  const handleConnectionEvent = useCallback((event: ConnectionEvent) => {
    if (event.type === 'timeout') {
      setSessionState(prev => ({ ...prev, isPaused: true }))
    }
  }, [])

  // Create an event handler that uses all the event handlers
  const handleEvent = useCallback((event: BaseSessionEvent) => {
    try {
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
      }
    } catch (error) {
      handleError(error as Error)
    }
  }, [handlePlayerEvent, handleCellUpdate, handleStateEvent, handleConnectionEvent, handleError])

  // Add event subscription
  useEffect(() => {
    const channel = supabase.channel(`session:${boardId}`)
      .on('broadcast', { event: 'session_event' }, ({ payload }) => {
        if (payload && typeof payload === 'object' && 'type' in payload) {
          handleEvent(payload as BaseSessionEvent)
          // Ensure state updates are processed
          setTimeout(() => {
            handleEvent(payload as BaseSessionEvent)
          }, 50)
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [boardId, supabase, handleEvent])

  // Session Controls
  const startSession = useCallback(async () => {
    try {
      const startTime = Date.now()
      await supabase
        .from('bingo_boards')
        .update({ 
          status: 'active',
          start_time: startTime
        })
        .eq('id', boardId)
        .single()

      setSessionState(prev => ({
        ...prev,
        isActive: true,
        startTime
      }))

      await emitSessionEvent({
        type: 'start',
        timestamp: startTime,
        sessionId: boardId
      })
    } catch (error) {
      handleError(error as Error)
    }
  }, [boardId, supabase, handleError, emitSessionEvent])

  const pauseSession = useCallback(async () => {
    try {
      await supabase
        .from('bingo_boards')
        .update({ status: 'paused' })
        .eq('id', boardId)
        .single()

      setSessionState(prev => ({ ...prev, isPaused: true }))
      await emitSessionEvent({
        type: 'pause',
        timestamp: Date.now(),
        sessionId: boardId
      })
    } catch (error) {
      handleError(error as Error)
    }
  }, [boardId, supabase, handleError, emitSessionEvent])

  const resumeSession = useCallback(async () => {
    try {
      await supabase
        .from('bingo_boards')
        .update({ status: 'active' })
        .eq('id', boardId)
        .single()

      setSessionState(prev => ({ ...prev, isPaused: false }))
      await emitSessionEvent({
        type: 'resume',
        timestamp: Date.now(),
        sessionId: boardId
      })
    } catch (error) {
      handleError(error as Error)
    }
  }, [boardId, supabase, handleError, emitSessionEvent])

  const endSession = useCallback(async () => {
    try {
      await supabase
        .from('bingo_boards')
        .update({ 
          status: 'completed',
          end_time: Date.now()
        })
        .eq('id', boardId)
        .single()

      setSessionState(prev => ({
        ...prev,
        isFinished: true,
        endTime: Date.now()
      }))

      await emitSessionEvent({
        type: 'end',
        timestamp: Date.now(),
        sessionId: boardId
      })

      onSessionEnd?.()
    } catch (error) {
      handleError(error as Error)
    }
  }, [boardId, supabase, handleError, onSessionEnd, emitSessionEvent])

  const updateCell = useCallback(async (cellId: string, updates: Partial<BoardCell>) => {
    try {
      await supabase
        .from('bingo_session_cells')
        .update({
          ...updates,
          version: stateVersion + 1,
          lastUpdated: Date.now()
        })
        .eq('id', cellId)
        .single()

      setBoard(prev => prev.map(cell => 
        cell.cellId === cellId 
          ? { ...cell, ...updates }
          : cell
      ))

      setStateVersion(prev => prev + 1)
    } catch (error) {
      handleError(error as Error)
    }
  }, [supabase, stateVersion, handleError])

  const reconnect = useCallback(async () => {
    const attemptReconnect = async (attempt: number): Promise<void> => {
      try {
        const { data, error } = await supabase
          .from('bingo_boards')
          .select('board_state, version')
          .eq('id', boardId)
          .single()

        if (error) {
          if (attempt < SESSION_CONSTANTS.RECONNECT.MAX_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, SESSION_CONSTANTS.RECONNECT.DELAY))
            return attemptReconnect(attempt + 1)
          }
          throw error
        }

        if (data?.board_state) {
          setBoard(data.board_state)
          setStateVersion(data.version ?? 0)
        }
      } catch (error) {
        if (attempt < SESSION_CONSTANTS.RECONNECT.MAX_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, SESSION_CONSTANTS.RECONNECT.DELAY))
          return attemptReconnect(attempt + 1)
        }
        handleError(error as Error)
      }
    }

    await attemptReconnect(1)
  }, [boardId, supabase, handleError])

  // Cleanup
  useEffect(() => {
    const currentChannel = channelRef.current
    const currentTimeout = reconnectTimeoutRef.current

    return () => {
      if (currentChannel) {
        supabase.removeChannel(currentChannel)
      }
      if (currentTimeout) {
        clearTimeout(currentTimeout)
      }
    }
  }, [supabase])

  // Add/update the timeout effect
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (sessionState.isActive && !sessionState.isPaused) {
      timeoutId = setTimeout(() => {
        setSessionState(prev => ({
          ...prev,
          isPaused: true
        }));
        pauseSession();
      }, 5 * 60 * 1000); // 5 minutes
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [sessionState.isActive, sessionState.isPaused, pauseSession]);

  return {
    // Session States
    isActive: sessionState.isActive,
    isPaused: sessionState.isPaused,
    isFinished: sessionState.isFinished,
    
    // Player Management
    players,
    currentPlayer: players[0] || null,
    
    // Session Controls
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    
    // Game State
    board,
    updateCell,
    
    // Stats & Info
    sessionTime: sessionState.startTime 
      ? Date.now() - sessionState.startTime 
      : 0,
    playerCount: players.length,
    completionRate: board.length 
      ? Math.round((board.filter(cell => cell.isMarked).length / board.length) * 100)
      : 0,
    
    // Presence
    onlineUsers: getOnlineUsers().map(presence => ({
      id: presence.user_id,
      name: presence.user_id,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      team: 0
    })),
    stateVersion,
    reconnect,
    error,
    clearError
  }
}
