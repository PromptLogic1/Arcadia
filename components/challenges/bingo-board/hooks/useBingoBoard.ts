import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'
import type { BoardCell } from '../types/types'

interface UseBingoBoardProps {
  boardId: string
}

type PostgresChangesPayload = {
  schema: string
  table: string
  commit_timestamp: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Database['public']['Tables']['bingo_boards']['Row']
  old: Database['public']['Tables']['bingo_boards']['Row'] | null
}

// Hilfsfunktionen für Validierung und Fehlerbehandlung
const isTemporaryError = (error: Error) => {
  const temporaryErrors = ['timeout', 'network', 'connection']
  return temporaryErrors.some(e => error.message.toLowerCase().includes(e))
}

export const useBingoBoard = ({ boardId }: UseBingoBoardProps) => {
  const [board, setBoard] = useState<Database['public']['Tables']['bingo_boards']['Row'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Singleton Supabase Client
  const supabase = useMemo(() => createClientComponentClient<Database>(), [])

  // Validierung mit Fehler-Feedback
  const validateBoardState = useCallback((state: unknown): state is BoardCell[] => {
    if (!Array.isArray(state)) {
      setError('Invalid board state: not an array')
      return false
    }
    
    // Erlaube leeres Array als validen State
    if (state.length === 0) {
      return true
    }

    const isValid = state.every(cell => (
      cell &&
      typeof cell === 'object' &&
      typeof cell.text === 'string' &&
      Array.isArray(cell.colors) &&
      Array.isArray(cell.completedBy) &&
      typeof cell.blocked === 'boolean' &&
      typeof cell.isMarked === 'boolean' &&
      typeof cell.cellId === 'string'
    ))

    if (!isValid) {
      setError('Invalid board state: corrupt data')
    }
    return isValid
  }, [])

  // Fetch board data mit Retry-Logik
  const fetchBoard = useCallback(async (attempt = 1) => {
    const maxAttempts = 3
    const retryDelay = 100

    try {
      const { data, error: fetchError } = await supabase
        .from('bingo_boards')
        .select(`
          *,
          creator:creator_id(
            username,
            avatar_url
          )
        `)
        .eq('id', boardId)
        .single()

      if (fetchError) {
        setLoading(false)
        setError('Network error')
        throw fetchError
      }

      if (!data || !validateBoardState(data.board_state)) {
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
          return fetchBoard(attempt + 1)
        }
        setLoading(false)
        throw new Error('Invalid board data received')
      }

      setBoard(data)
      setError(null)
      setLoading(false)
    } catch (err) {
      if (attempt < maxAttempts && isTemporaryError(err as Error)) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
        return fetchBoard(attempt + 1)
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch board')
      setLoading(false)
    }
  }, [boardId, supabase, validateBoardState])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  // Update board state mit optimistischem Update und Merge-Logik
  const updateBoardState = useCallback(async (newState: BoardCell[]) => {
    if (!validateBoardState(newState)) {
      const errorMsg = 'Invalid board state'
      setError(errorMsg)
      throw new Error(errorMsg)
    }

    // Deep copy des aktuellen Boards für Rollback
    const previousBoard = board ? JSON.parse(JSON.stringify(board)) : null
    
    try {
      // Optimistisches Update mit Merge-Logik
      setBoard(prev => {
        if (!prev) return null
        return {
          ...prev,
          board_state: newState
        }
      })

      const { error: updateError } = await supabase
        .from('bingo_boards')
        .update({ board_state: newState })
        .eq('id', boardId)

      if (updateError) {
        // Vollständiger Rollback zum vorherigen State
        if (previousBoard) {
          setBoard(previousBoard)
        }
        const errorMsg = 'Failed to update board'
        setError(errorMsg)
        throw new Error(errorMsg)
      }

      setError(null)
      return Promise.resolve()
    } catch (err) {
      // Vollständiger Rollback zum vorherigen State
      if (previousBoard) {
        setBoard(previousBoard)
      }
      const errorMsg = 'Failed to update board'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [board, boardId, supabase, validateBoardState])

  // Request Bundling für Updates
  const updateQueue = useMemo(() => {
    let timeout: NodeJS.Timeout
    let currentState: BoardCell[] | null = null
    let pendingUpdates = 0

    return {
      add: async (newState: BoardCell[]) => {
        return new Promise<void>((resolve, reject) => {
          currentState = newState
          pendingUpdates++
          clearTimeout(timeout)
          
          timeout = setTimeout(async () => {
            if (currentState) {
              try {
                await updateBoardState(currentState)
                resolve()
              } catch (error) {
                reject(error)
              } finally {
                pendingUpdates--
                currentState = null
              }
            } else {
              resolve()
            }
          }, 50)
        })
      },
      clear: () => {
        clearTimeout(timeout)
        currentState = null
        pendingUpdates = 0
      },
      getPendingUpdates: () => pendingUpdates
    }
  }, [updateBoardState])

  // Update board settings
  const updateBoardSettings = async (settings: Partial<Database['public']['Tables']['bingo_boards']['Row']>) => {
    try {
      const { error: updateError } = await supabase
        .from('bingo_boards')
        .update(settings)
        .eq('id', boardId)

      if (updateError) {
        const errorMsg = 'Failed to update settings'
        setError(errorMsg)
        throw new Error(errorMsg)
      }
      return Promise.resolve()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings')
      return Promise.reject(err)
    }
  }

  // Realtime subscriptions mit Merge-Logik
  useEffect(() => {
    let reconnectAttempts = 0
    const maxReconnectAttempts = 3
    const reconnectDelay = 1000

    const channel = supabase
      .channel(`board_${boardId}`)
      .on<PostgresChangesPayload>(
        'postgres_changes' as 'system',
        {
          event: '*',
          schema: 'public',
          table: 'bingo_boards',
          filter: `id=eq.${boardId}`
        },
        payload => {
          if (payload.new && validateBoardState(payload.new.board_state)) {
            setBoard(prev => {
              if (!prev) return payload.new
              return {
                ...payload.new,
                board_state: payload.new.board_state.map((cell: BoardCell, i: number) => ({
                  ...cell,
                  colors: [...new Set([
                    ...(prev.board_state[i]?.colors || []),
                    ...cell.colors
                  ])]
                }))
              }
            })
          }
        }
      )
      .on('system' as const, 'disconnect', () => {
        const tryReconnect = () => {
          if (reconnectAttempts >= maxReconnectAttempts) return
          reconnectAttempts++
          
          setTimeout(() => {
            channel.subscribe((status: string) => {
              if (status === 'SUBSCRIBED') {
                reconnectAttempts = 0
              } else {
                tryReconnect()
              }
            })
          }, reconnectDelay * reconnectAttempts)
        }
        
        tryReconnect()
      })
      .subscribe()

    return () => {
      updateQueue.clear()
      supabase.removeChannel(channel)
    }
  }, [boardId, supabase, updateQueue, validateBoardState])

  return {
    board,
    loading,
    error,
    updateBoardState: updateQueue.add,
    updateBoardSettings
  }
} 