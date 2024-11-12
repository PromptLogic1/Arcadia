import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'
import type { BoardCell } from '../components/shared/types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface UseGameStateProps {
  sessionId: string
}

interface GameState {
  currentState: BoardCell[]
  currentPlayer: number
  lastUpdate: string
  version: number
}

type BingoSession = Database['public']['Tables']['bingo_sessions']['Row'] & {
  version: number
  updated_at: string
}

type SessionResponse = {
  current_state: BoardCell[]
  updated_at: string
  version: number
}

export const useGameState = ({ sessionId }: UseGameStateProps) => {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [stateVersion, setStateVersion] = useState(0)
  const [pendingUpdates, setPendingUpdates] = useState<{[key: string]: BoardCell}>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const supabase = createClientComponentClient<Database>()

  // Fetch initial state
  useEffect(() => {
    const fetchGameState = async () => {
      const { data: session } = await supabase
        .from('bingo_sessions')
        .select('current_state, updated_at, version')
        .eq('id', sessionId)
        .single() as { data: SessionResponse | null }

      if (session) {
        setGameState({
          currentState: session.current_state,
          currentPlayer: 0,
          lastUpdate: session.updated_at,
          version: session.version
        })
      }
    }

    fetchGameState()
  }, [sessionId, supabase, stateVersion])

  // Set up real-time subscription for state updates
  useEffect(() => {
    const channel = supabase
      .channel(`game_state_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bingo_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload: RealtimePostgresChangesPayload<BingoSession>) => {
          if (payload.new && 'current_state' in payload.new) {
            const newState = payload.new.current_state as BoardCell[]
            const newVersion = payload.new.version
            const lastUpdate = payload.new.updated_at

            // Only update if the new state is newer than our current state
            if (!gameState || newVersion > gameState.version) {
              setGameState(prev => ({
                ...prev!,
                currentState: newState,
                version: newVersion,
                lastUpdate
              }))
              setStateVersion(newVersion)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase, gameState])

  // Handle state updates with optimistic updates and conflict resolution
  const updateGameState = useCallback(async (
    updates: { index: number; cell: Partial<BoardCell> }[]
  ) => {
    if (!gameState || isProcessing) return

    setIsProcessing(true)
    const newPendingUpdates = { ...pendingUpdates }

    try {
      // Apply optimistic updates locally
      const updatedState = [...gameState.currentState]
      updates.forEach(({ index, cell }) => {
        if (updatedState[index]) {
          updatedState[index] = { ...updatedState[index], ...cell }
          newPendingUpdates[index] = updatedState[index]
        }
      })

      // Update local state immediately
      setGameState(prev => ({
        ...prev!,
        currentState: updatedState,
        version: prev!.version + 1
      }))
      setPendingUpdates(newPendingUpdates)

      // Send update to server
      const { data: latestState, error } = await supabase
        .from('bingo_sessions')
        .update({
          current_state: updatedState,
          version: gameState.version + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select('current_state, version, updated_at')
        .single() as { data: SessionResponse | null, error: unknown }

      if (error || !latestState) {
        // If update fails, fetch latest state from server
        const { data: serverState } = await supabase
          .from('bingo_sessions')
          .select('current_state, version, updated_at')
          .eq('id', sessionId)
          .single() as { data: SessionResponse | null }

        if (serverState) {
          // Merge pending updates with latest server state
          const mergedState = mergeStates(
            serverState.current_state,
            newPendingUpdates
          )

          setGameState({
            currentState: mergedState,
            currentPlayer: gameState.currentPlayer,
            lastUpdate: serverState.updated_at,
            version: serverState.version
          })
        }
      }
    } finally {
      setIsProcessing(false)
      setPendingUpdates({})
    }
  }, [gameState, isProcessing, pendingUpdates, sessionId, supabase])

  // Helper function to merge states
  const mergeStates = (
    serverState: BoardCell[],
    pendingUpdates: {[key: string]: BoardCell}
  ): BoardCell[] => {
    const mergedState = [...serverState]
    Object.entries(pendingUpdates).forEach(([index, cell]) => {
      const idx = parseInt(index)
      if (!isNaN(idx) && idx >= 0 && idx < mergedState.length && mergedState[idx]) {
        mergedState[idx] = {
          ...mergedState[idx],
          ...cell,
          // Merge arrays to prevent duplicates
          colors: Array.from(new Set([
            ...(mergedState[idx]?.colors || []),
            ...(cell.colors || [])
          ])),
          completedBy: Array.from(new Set([
            ...(mergedState[idx]?.completedBy || []),
            ...(cell.completedBy || [])
          ]))
        }
      }
    })
    return mergedState
  }

  return {
    gameState,
    updateGameState,
    isProcessing
  }
} 