import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { BoardCell } from '../components/shared/types'
import type { Database } from '@/types/database.types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useSession } from './useSession'

export interface UseGameStateProps {
  sessionId: string
  currentState?: GameState
}

export interface GameState {
  currentState: BoardCell[]
  currentPlayer: number
  version: number
  lastUpdate: string
}

export interface GameStateHookReturn {
  gameState: GameState | null
  updateGameState: (updates: { index: number; cell: Partial<BoardCell> }[]) => Promise<void>
}

export function useGameState({ sessionId, currentState: initialState }: UseGameStateProps): GameStateHookReturn {
  const [gameState, setGameState] = useState<GameState | null>(initialState || null)
  const { updateSessionState } = useSession(sessionId)
  const supabase = createClientComponentClient<Database>()

  // Realtime subscription setup
  useEffect(() => {
    const channel = supabase.channel(`game_state_${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bingo_sessions',
        filter: `id=eq.${sessionId}`
      }, (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['bingo_sessions']['Row']>) => {
        const newData = payload.new as Database['public']['Tables']['bingo_sessions']['Row']
        if (newData && newData.current_state) {
          setGameState(prev => ({
            currentState: newData.current_state,
            currentPlayer: 1,
            version: (prev?.version || 0) + 1,
            lastUpdate: newData.updated_at
          }))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase])

  const updateGameState = useCallback(async (updates: { index: number; cell: Partial<BoardCell> }[]) => {
    if (!gameState) return

    try {
      // Separate Updates für jeden Spieler
      const updatePromises = updates.map(async ({ index, cell }) => {
        const newState = {
          ...gameState,
          currentState: [...gameState.currentState],
          version: gameState.version + 1,
          lastUpdate: new Date().toISOString()
        }

        const currentCell = newState.currentState[index]
        if (!currentCell) return

        // Update einzelne Zelle mit korrekter Typisierung
        newState.currentState[index] = {
          ...currentCell,
          colors: currentCell.colors,
          completedBy: currentCell.completedBy,
          blocked: currentCell.blocked,
          text: cell.text ?? currentCell.text,
          cellId: cell.cellId ?? currentCell.cellId,
          isMarked: cell.isMarked ?? currentCell.isMarked
        }

        // Server-Update für diese spezifische Änderung
        const response = await updateSessionState(newState.currentState)
        
        // Lokales Update für diese Änderung
        setGameState({
          currentState: newState.currentState,
          currentPlayer: gameState.currentPlayer,
          version: newState.version,
          lastUpdate: newState.lastUpdate
        })

        return response
      })

      // Warte auf alle Updates
      await Promise.all(updatePromises)

    } catch (error) {
      console.error('Failed to update game state:', error)
      throw error
    }
  }, [gameState, updateSessionState])

  return {
    gameState,
    updateGameState
  }
}