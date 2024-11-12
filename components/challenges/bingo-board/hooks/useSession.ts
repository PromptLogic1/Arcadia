import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'
import type { BoardCell, Player } from '../components/shared/types'

interface SessionState {
  id: string
  boardId: string
  status: 'active' | 'completed' | 'cancelled'
  currentState: BoardCell[]
  winnerId: string | null
  players: Player[]
}

export const useSession = (boardId: string) => {
  const [session, setSession] = useState<SessionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClientComponentClient<Database>()

  const fetchSession = useCallback(async () => {
    try {
      const { data: sessions, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select(`
          *,
          players:bingo_session_players(
            session_id,
            user_id,
            player_name,
            color,
            team
          )
        `)
        .eq('board_id', boardId)
        .eq('status', 'active')
        .single()

      if (sessionError) throw sessionError

      if (sessions) {
        setSession({
          id: sessions.id,
          boardId: sessions.board_id,
          status: sessions.status,
          currentState: sessions.current_state,
          winnerId: sessions.winner_id,
          players: sessions.players.map(player => ({
            id: `${player.user_id}-${player.session_id}`,
            name: player.player_name,
            color: player.color,
            team: player.team ?? 0,
            hoverColor: player.color
          }))
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch session')
    } finally {
      setLoading(false)
    }
  }, [boardId, supabase])

  const createSession = useCallback(async (
    playerName: string,
    color: string,
    team?: number
  ) => {
    try {
      const { data: existingSessions } = await supabase
        .from('bingo_sessions')
        .select('id')
        .eq('board_id', boardId)
        .eq('status', 'active')
        .single()

      if (existingSessions?.id) {
        throw new Error('An active session already exists for this board')
      }

      const response = await fetch('/api/bingo/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId,
          playerName,
          color,
          team
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create session')
      }

      const data = await response.json()
      await fetchSession()
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
      throw err
    }
  }, [boardId, supabase, fetchSession])

  const joinSession = useCallback(async (
    sessionId: string,
    playerName: string,
    color: string,
    team?: number
  ) => {
    try {
      const { data: players } = await supabase
        .from('bingo_session_players')
        .select('user_id')
        .eq('session_id', sessionId)

      if (players && players.length >= 8) {
        throw new Error('Session is full')
      }

      const response = await fetch('/api/bingo/sessions/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          playerName,
          color,
          team
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to join session')
      }

      await fetchSession()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join session')
      throw err
    }
  }, [supabase, fetchSession])

  const updateSessionState = useCallback(async (
    currentState: BoardCell[],
    winnerId?: string | null
  ) => {
    if (!session) return

    try {
      const response = await fetch('/api/bingo/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          currentState,
          winnerId,
          status: winnerId ? 'completed' : 'active'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update session')
      }

      await fetchSession()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session')
      throw err
    }
  }, [session, fetchSession])

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`session_${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bingo_sessions',
          filter: `board_id=eq.${boardId}`
        },
        () => {
          fetchSession()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bingo_session_players',
          filter: `session_id=eq.${session?.id}`
        },
        () => {
          fetchSession()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [boardId, session?.id, supabase, fetchSession])

  // Initial fetch
  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  return {
    session,
    loading,
    error,
    createSession,
    joinSession,
    updateSessionState
  }
} 