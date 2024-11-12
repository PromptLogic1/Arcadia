import { useState, useCallback, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'
import type { BoardCell } from '../components/shared/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Define the session status type to match database constraints
type DatabaseSessionStatus = 'active' | 'completed' | 'cancelled'
type UISessionStatus = 'disconnected' | 'connected'
type SessionStatus = DatabaseSessionStatus | UISessionStatus

interface SessionPlayer {
  id: string
  name: string
  color: string
  team: number
  hoverColor: string
}

interface SessionState {
  id: string
  boardId: string
  status: SessionStatus
  currentState: BoardCell[]
  players: SessionPlayer[]
  version: number
  lastUpdate: string
  lastActiveAt?: string
  winnerId?: string | null
  startedAt?: string
  endedAt?: string | null
}

// Define the database session type
type DatabaseSession = Database['public']['Tables']['bingo_sessions']['Row'] & {
  players: Array<{
    session_id: string
    user_id: string
    player_name: string
    color: string
    team: number | null
  }>
}

export const useSession = (boardId: string) => {
  const [session, setSession] = useState<SessionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [_channel, setChannel] = useState<RealtimeChannel | null>(null)
  
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
        const dbSession = sessions as DatabaseSession
        setSession({
          id: dbSession.id,
          boardId: dbSession.board_id,
          status: dbSession.status,
          currentState: dbSession.current_state,
          players: dbSession.players.map(player => ({
            id: `${player.user_id}-${player.session_id}`,
            name: player.player_name,
            color: player.color,
            team: player.team ?? 0,
            hoverColor: player.color
          })),
          version: 1,
          lastUpdate: dbSession.updated_at,
          lastActiveAt: dbSession.updated_at,
          winnerId: dbSession.winner_id,
          startedAt: dbSession.started_at,
          endedAt: dbSession.ended_at
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

      await fetchSession()
      return await response.json()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
      throw err
    }
  }, [boardId, fetchSession])

  const joinSession = useCallback(async (_sessionId: string, _playerName: string, _color: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('bingo_sessions')
        .update({
          status: 'active' as DatabaseSessionStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', _sessionId)
        .single()

      if (error) throw error

      // Add player to session
      await supabase
        .from('bingo_session_players')
        .insert({
          session_id: _sessionId,
          user_id: user.id,
          player_name: _playerName,
          color: _color,
          team: 1,
          joined_at: new Date().toISOString()
        })
        .single()

      await fetchSession()
      return data
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
          status: winnerId ? 'completed' as const : 'active' as const
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update session')
      }

      const updatedSession = await response.json()
      setSession(prev => prev ? {
        ...prev,
        ...updatedSession,
        currentState,
        status: winnerId ? 'completed' : prev.status,
        winnerId
      } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session')
      throw err
    }
  }, [session])

  useEffect(() => {
    fetchSession()

    // Set up realtime subscription
    const newChannel = supabase.channel(`session:${boardId}`)
    newChannel
      .on('presence', { event: 'sync' }, () => {
        fetchSession()
      })
      .subscribe()

    setChannel(newChannel)

    return () => {
      if (newChannel) {
        supabase.removeChannel(newChannel)
      }
    }
  }, [boardId, supabase, fetchSession])

  return {
    session,
    loading,
    error,
    createSession,
    joinSession,
    updateSessionState,
    fetchSession
  }
} 