'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'
import type { BoardCell } from '../types/types'
import type { UseBingoBoardProps, UseBingoBoardReturn } from '../types/bingoboard.types'
import { BOARD_CONSTANTS, ERROR_MESSAGES } from '../types/bingoboard.constants'

type BingoBoardRow = Database['public']['Tables']['bingo_boards']['Row']
type PostgresChangesPayload = {
  schema: string
  table: string
  commit_timestamp: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: BingoBoardRow
  old: BingoBoardRow | null
}

// Hilfsfunktionen für Validierung und Fehlerbehandlung
const isTemporaryError = (error: Error) => {
  const temporaryErrors = ['timeout', 'network', 'connection']
  return temporaryErrors.some(e => error.message.toLowerCase().includes(e))
}

export const useBingoBoard = ({ boardId }: UseBingoBoardProps): UseBingoBoardReturn => {
  // States
  const [board, setBoard] = useState<BingoBoardRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  // Singleton Supabase Client
  const supabase = useMemo(() => createClientComponentClient<Database>(), [])

  // Validierung mit Fehler-Feedback
  const validateBoardState = useCallback((state: unknown): state is BoardCell[] => {
    if (!Array.isArray(state)) {
      setError(new Error(ERROR_MESSAGES.INVALID_BOARD))
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
      setError(new Error(ERROR_MESSAGES.INVALID_BOARD))
    }
    return isValid
  }, [])

  // Fetch board data mit Retry-Logik
  const fetchBoard = useCallback(async (attempt = 1) => {
    const maxAttempts = BOARD_CONSTANTS.UPDATE.MAX_RETRIES
    const retryDelay = BOARD_CONSTANTS.UPDATE.RETRY_DELAY

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
        setError(new Error(ERROR_MESSAGES.NETWORK_ERROR))
        throw fetchError
      }

      if (!data || !validateBoardState(data.board_state)) {
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
          return fetchBoard(attempt + 1)
        }
        setLoading(false)
        throw new Error(ERROR_MESSAGES.INVALID_BOARD)
      }

      setBoard(data)
      setError(null)
      setLoading(false)
    } catch (err) {
      if (attempt < maxAttempts && isTemporaryError(err as Error)) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
        return fetchBoard(attempt + 1)
      }
      setError(err instanceof Error ? err : new Error(ERROR_MESSAGES.SYNC_FAILED))
      setLoading(false)
    }
  }, [boardId, supabase, validateBoardState])

  // Update board state mit optimistischem Update und Merge-Logik
  const updateBoardState = useCallback(async (newState: BoardCell[]) => {
    if (!validateBoardState(newState)) {
      const errorMsg = ERROR_MESSAGES.INVALID_BOARD
      setError(new Error(errorMsg))
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
        const errorMsg = ERROR_MESSAGES.UPDATE_FAILED
        setError(new Error(errorMsg))
        throw new Error(errorMsg)
      }

      setError(null)
      return Promise.resolve()
    } catch (err) {
      // Vollständiger Rollback zum vorherigen State
      if (previousBoard) {
        setBoard(previousBoard)
      }
      const errorMsg = ERROR_MESSAGES.UPDATE_FAILED
      setError(new Error(errorMsg))
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
          }, BOARD_CONSTANTS.UPDATE.BATCH_DELAY)
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
        const errorMsg = ERROR_MESSAGES.UPDATE_FAILED
        setError(new Error(errorMsg))
        throw new Error(errorMsg)
      }
      return Promise.resolve()
    } catch (err) {
      setError(err instanceof Error ? err : new Error(ERROR_MESSAGES.UPDATE_FAILED))
      return Promise.reject(err)
    }
  }

  // Realtime subscriptions mit Merge-Logik
  useEffect(() => {
    let reconnectAttempts = 0
    const maxReconnectAttempts = BOARD_CONSTANTS.SYNC.RECONNECT_ATTEMPTS
    const reconnectDelay = BOARD_CONSTANTS.SYNC.RECONNECT_DELAY

    const channel = supabase
      .channel(`board_${boardId}`)
      .on<PostgresChangesPayload>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bingo_boards',
          filter: `id=eq.${boardId}`
        },
        payload => {
          if (payload.eventType === 'UPDATE' && payload.new && validateBoardState(payload.new.board_state)) {
            setBoard(prev => {
              if (!prev) return payload.new
              
              const updatedBoard: BingoBoardRow = {
                ...payload.new,
                board_state: payload.new.board_state.map((cell: BoardCell, i: number) => ({
                  ...cell,
                  colors: [...new Set([
                    ...(prev.board_state[i]?.colors || []),
                    ...cell.colors
                  ])]
                }))
              }
              
              return updatedBoard
            })
          }
        }
      )
      .on('system', 'disconnect', () => {
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