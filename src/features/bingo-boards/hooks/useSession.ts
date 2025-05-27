'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'
import type { BoardCell, Game, Player } from '../types/types'

interface UseSessionProps {
  boardId: string
  _game: Game
  initialPlayers?: Player[]
  onSessionEnd?: () => void
}

type SessionPayload = {
  version: number;
  [key: string]: unknown;
}

export const useSession = ({ boardId, _game, initialPlayers = [], onSessionEnd }: UseSessionProps) => {
  // Core states
  const [sessionState, setSessionState] = useState({
    id: '',
    isActive: false,
    isPaused: false,
    isFinished: false,
    startTime: null as number | null,
    endTime: null as number | null,
    currentPlayer: null as Player | null,
    players: initialPlayers,
    boardState: [] as BoardCell[],
    version: 0
  })

  const supabase = createClientComponentClient<Database>()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Initialize or join session
  const initializeSession = useCallback(async (player: Player) => {
    try {
      // First check if session exists
      if (boardId) {
        const { data: existingSession } = await supabase
          .from('bingo_sessions')
          .select(`
            *,
            players:bingo_session_players(*)
          `)
          .eq('board_id', boardId)
          .eq('status', 'active')
          .single()

        if (existingSession) {
          // Join existing session
          const response = await fetch('/api/bingo/sessions/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: existingSession.id,
              playerName: player.name,
              color: player.color,
              team: player.team
            })
          })

          if (!response.ok) {
            throw new Error('Failed to join session')
          }

          const data = await response.json()
          return data
        }
      }

      // Create new session if none exists
      const response = await fetch('/api/bingo/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId,
          playerName: player.name,
          color: player.color,
          team: player.team
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Session initialization error:', error)
      throw error
    }
  }, [boardId, supabase])

  // Subscribe to session updates
  const subscribeToSession = useCallback((sessionId: string) => {
    const channel = supabase.channel(`session:${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bingo_sessions',
        filter: `id=eq.${sessionId}`
      }, (payload) => {
        if (payload.new) {
          setSessionState(prev => ({
            ...prev,
            ...payload.new,
            version: (payload.new as SessionPayload).version
          }))
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bingo_session_players',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        if (payload.new) {
          setSessionState(prev => ({
            ...prev,
            players: [...prev.players, payload.new as Player]
          }))
        }
      })
      .subscribe()

    channelRef.current = channel
    return channel
  }, [supabase])

  // Session control methods
  const startSession = useCallback(async () => {
    if (!sessionState.id) return

    await supabase
      .from('bingo_sessions')
      .update({
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', sessionState.id)

    setSessionState(prev => ({
      ...prev,
      isActive: true,
      startTime: Date.now()
    }))
  }, [sessionState.id, supabase])

  const pauseSession = useCallback(async () => {
    if (!sessionState.id) return

    await supabase
      .from('bingo_sessions')
      .update({
        status: 'cancelled'
      })
      .eq('id', sessionState.id)

    setSessionState(prev => ({
      ...prev,
      isPaused: true
    }))
  }, [sessionState.id, supabase])

  const endSession = useCallback(async () => {
    if (!sessionState.id) return

    await supabase
      .from('bingo_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionState.id)

    setSessionState(prev => ({
      ...prev,
      isFinished: true,
      endTime: Date.now()
    }))

    onSessionEnd?.()
  }, [sessionState.id, supabase, onSessionEnd])

  // Update board state
  const updateBoardState = useCallback(async (newState: BoardCell[]) => {
    if (!sessionState.id) return

    await supabase
      .from('bingo_sessions')
      .update({
        current_state: newState,
        version: sessionState.version + 1
      })
      .eq('id', sessionState.id)

    setSessionState(prev => ({
      ...prev,
      boardState: newState,
      version: prev.version + 1
    }))
  }, [sessionState.id, sessionState.version, supabase])

  // Use subscribeToSession in useEffect
  useEffect(() => {
    if (sessionState.id) {
      const channel = subscribeToSession(sessionState.id)
      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [sessionState.id, subscribeToSession, supabase])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [supabase])

  return {
    // Session state
    sessionId: sessionState.id,
    isActive: sessionState.isActive,
    isPaused: sessionState.isPaused,
    isFinished: sessionState.isFinished,
    currentPlayer: sessionState.currentPlayer,
    players: sessionState.players,
    boardState: sessionState.boardState,
    version: sessionState.version,

    // Session methods
    initializeSession,
    startSession,
    pauseSession,
    endSession,
    updateBoardState,

    // Time info
    startTime: sessionState.startTime,
    endTime: sessionState.endTime
  }
}
