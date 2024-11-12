import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { BoardCell } from '../components/shared/types'
import type { Database } from '@/types/database.types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

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
  isProcessing: boolean
}

type BingoSession = Database['public']['Tables']['bingo_sessions']['Update'] & {
  current_player?: number
  version?: number
  last_update?: string
}

type BingoSessionResponse = Database['public']['Tables']['bingo_sessions']['Row'] & {
  current_player?: number
  version?: number
  last_update?: string
}

export function useGameState({ sessionId, currentState: initialState }: UseGameStateProps): GameStateHookReturn {
  const [gameState, setGameState] = useState<GameState | null>(initialState || null)
  const [isProcessing, setIsProcessing] = useState(false)
  const supabase = createClientComponentClient<Database>()

  // Realtime subscription setup
  useEffect(() => {
    const channel = supabase.channel(`game_state_${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bingo_sessions',
        filter: `id=eq.${sessionId}`
      }, (payload: RealtimePostgresChangesPayload<BingoSessionResponse>) => {
        if (payload.new && 'current_state' in payload.new && payload.new.current_state) {
          setGameState({
            currentState: payload.new.current_state,
            currentPlayer: payload.new.current_player ?? 1,
            version: payload.new.version ?? 1,
            lastUpdate: payload.new.last_update ?? new Date().toISOString()
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase])

  const updateGameState = useCallback(async (updates: { index: number; cell: Partial<BoardCell> }[]) => {
    if (!gameState || isProcessing) return

    setIsProcessing(true)
    try {
      // Apply updates to current state
      const newState = {
        ...gameState,
        currentState: [...gameState.currentState],
        version: gameState.version + 1,
        lastUpdate: new Date().toISOString()
      }

      updates.forEach(({ index, cell }) => {
        const currentCell = newState.currentState[index]
        if (!currentCell) return

        newState.currentState[index] = {
          ...currentCell,
          ...cell,
          text: cell.text ?? currentCell.text,
          cellId: cell.cellId ?? currentCell.cellId,
          isMarked: cell.isMarked ?? currentCell.isMarked
        }
      })

      // Convert to database format
      const dbUpdate: BingoSession = {
        current_state: newState.currentState,
        current_player: newState.currentPlayer,
        version: newState.version,
        last_update: newState.lastUpdate
      }

      // Update database
      const { data, error } = await supabase
        .from('bingo_sessions')
        .update(dbUpdate)
        .eq('id', sessionId)
        .single()

      if (error) throw error

      // Update local state
      if (data) {
        const typedData = data as BingoSessionResponse
        setGameState({
          currentState: typedData.current_state,
          currentPlayer: typedData.current_player ?? gameState.currentPlayer,
          version: typedData.version ?? gameState.version + 1,
          lastUpdate: typedData.last_update ?? newState.lastUpdate
        })
      }
    } catch (error) {
      console.error('Failed to update game state:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [gameState, isProcessing, sessionId, supabase])

  return {
    gameState,
    updateGameState,
    isProcessing
  }
} 