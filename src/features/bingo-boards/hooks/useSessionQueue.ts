'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { 
  Database,
  BingoSessionQueue,
  BingoSessionQueueInsert,
  BingoSessionQueueUpdate,
  QueueStatus
} from '@/types'

// =============================================================================
// APPLICATION TYPES (Built on database types)
// =============================================================================

interface PlayerQueueData {
  playerName: string
  color: string
  team?: number
}

interface QueueState {
  entries: BingoSessionQueue[]
  isProcessing: boolean
  processingEntryId: string | null
  error: string | null
  lastUpdated: number
}

interface QueueStats {
  totalEntries: number
  pendingEntries: number
  processingEntries: number
  completedEntries: number
  failedEntries: number
  averageProcessingTime: number
  queueWaitTime: number
}

interface UseSessionQueueReturn {
  queueState: QueueState
  queueEntries: BingoSessionQueue[] // For backward compatibility
  stats: QueueStats
  isLoading: boolean
  error: string | null
  addPlayerToQueue: (playerData: PlayerQueueData) => Promise<string | null>
  removePlayerFromQueue: (entryId: string) => Promise<boolean>
  processQueueEntry: (entryId: string) => Promise<boolean>
  updateQueueEntry: (entryId: string, updates: BingoSessionQueueUpdate) => Promise<void> // Added for backward compatibility
  clearSessionQueue: (sessionId: string) => Promise<void>
  getPlayerQueuePosition: (userId: string, sessionId: string) => number
  isPlayerInQueue: (userId: string, sessionId: string) => boolean
  getQueueEntries: (sessionId: string) => BingoSessionQueue[]
  subscribeToQueue: (sessionId: string) => void
  unsubscribeFromQueue: () => void
}

// =============================================================================
// CONSTANTS
// =============================================================================

const QUEUE_CONSTANTS = {
  LIMITS: {
    MAX_WAIT_TIME: 5 * 60 * 1000, // 5 minutes
    CLEANUP_INTERVAL: 60 * 1000, // 1 minute
  }
} as const

const PLAYER_CONSTANTS = {
  LIMITS: {
    MAX_PLAYERS: 12,
  }
} as const

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export const useSessionQueue = (sessionId: string): UseSessionQueueReturn => {
  const [queueEntries, setQueueEntries] = useState<BingoSessionQueue[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClientComponentClient<Database>()

  // Fetch queue entries
  const fetchQueueEntries = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('bingo_session_queue')
        .select('*')
        .eq('session_id', sessionId)
        .order('requested_at', { ascending: true })

      if (fetchError) throw fetchError
      setQueueEntries(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch queue entries')
    }
  }, [sessionId, supabase])

  // Subscribe to queue updates
  useEffect(() => {
    if (!sessionId) return

    const channel = supabase.channel(`queue:${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bingo_session_queue',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newEntry = payload.new as BingoSessionQueue
          setQueueEntries(prev => [...prev, newEntry])
        } else if (payload.eventType === 'UPDATE') {
          const updatedEntry = payload.new as BingoSessionQueue
          setQueueEntries(prev => 
            prev.map(entry => 
              entry.id === updatedEntry.id ? updatedEntry : entry
            )
          )
        } else if (payload.eventType === 'DELETE') {
          setQueueEntries(prev => 
            prev.filter(entry => entry.id !== payload.old.id)
          )
        }
      })
      .subscribe()

    // Initial fetch
    fetchQueueEntries()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase, fetchQueueEntries])

  // Update queue entry
  const updateQueueEntry = useCallback(async (entryId: string, updates: BingoSessionQueueUpdate) => {
    try {
      setIsProcessing(true)
      
      const { error: updateError } = await supabase
        .from('bingo_session_queue')
        .update(updates)
        .eq('id', entryId)

      if (updateError) throw updateError
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update queue entry')
      throw err
    } finally {
      setIsProcessing(false)
    }
  }, [supabase])

  // Remove from queue
  const removeFromQueue = useCallback(async (entryId: string) => {
    try {
      setIsProcessing(true)
      const { error: deleteError } = await supabase
        .from('bingo_session_queue')
        .delete()
        .eq('id', entryId)

      if (deleteError) throw deleteError
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove from queue')
      throw err
    } finally {
      setIsProcessing(false)
    }
  }, [supabase])

  // Cleanup expired entries
  const cleanupQueue = useCallback(async () => {
    try {
      setIsProcessing(true)
      const cutoffTime = new Date(Date.now() - QUEUE_CONSTANTS.LIMITS.MAX_WAIT_TIME)
      
      const { error: cleanupError } = await supabase
        .from('bingo_session_queue')
        .delete()
        .lt('requested_at', cutoffTime.toISOString())
        .in('status', ['approved', 'rejected'] as QueueStatus[])

      if (cleanupError) throw cleanupError
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cleanup queue')
      throw err
    } finally {
      setIsProcessing(false)
    }
  }, [supabase])

  // Auto cleanup
  useEffect(() => {
    const cleanup = setInterval(cleanupQueue, QUEUE_CONSTANTS.LIMITS.CLEANUP_INTERVAL)
    return () => clearInterval(cleanup)
  }, [cleanupQueue])

  // Add to queue
  const addToQueue = useCallback(async (player: PlayerQueueData) => {
    try {
      setIsProcessing(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const queueEntry: BingoSessionQueueInsert = {
        session_id: sessionId,
        user_id: user.id,
        player_name: player.playerName,
        color: player.color,
        team: player.team ?? null,
        status: 'pending',
        requested_at: new Date().toISOString()
      }

      const { error: addError } = await supabase
        .from('bingo_session_queue')
        .insert(queueEntry)

      if (addError) throw addError
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to queue')
      throw err
    } finally {
      setIsProcessing(false)
    }
  }, [sessionId, supabase])

  // Process queue
  const processQueue = useCallback(async () => {
    try {
      setIsProcessing(true)
      const { data: pendingEntries } = await supabase
        .from('bingo_session_queue')
        .select('*')
        .eq('session_id', sessionId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: true })

      if (!pendingEntries?.length) return

      // Process each entry
      for (const entry of pendingEntries) {
        // Check player count
        const { count: playerCount } = await supabase
          .from('bingo_session_players')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', sessionId)

        if ((playerCount || 0) >= PLAYER_CONSTANTS.LIMITS.MAX_PLAYERS) {
          await updateQueueEntry(entry.id, { 
            status: 'failed',
            processed_at: new Date().toISOString()
          })
          continue
        }

        // Check if color is available
        const { data: colorCheck } = await supabase
          .from('bingo_session_players')
          .select('id')
          .eq('session_id', sessionId)
          .eq('color', entry.color)
          .single()

        if (colorCheck) {
          await updateQueueEntry(entry.id, { 
            status: 'failed',
            processed_at: new Date().toISOString()
          })
          continue
        }

        // Add player to session
        const { error: playerError } = await supabase
          .from('bingo_session_players')
          .insert({
            session_id: sessionId,
            user_id: entry.user_id || '',
            player_name: entry.player_name,
            color: entry.color,
            team: entry.team,
            joined_at: new Date().toISOString()
          })

        if (playerError) {
          await updateQueueEntry(entry.id, { 
            status: 'failed',
            processed_at: new Date().toISOString()
          })
          continue
        }

        await updateQueueEntry(entry.id, { 
          status: 'completed',
          processed_at: new Date().toISOString()
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process queue')
      throw err
    } finally {
      setIsProcessing(false)
    }
  }, [sessionId, supabase, updateQueueEntry])

  // Calculate stats
  const stats: QueueStats = {
    totalEntries: queueEntries.length,
    pendingEntries: queueEntries.filter(e => e.status === 'pending').length,
    processingEntries: queueEntries.filter(e => e.status === 'processing').length,
    completedEntries: queueEntries.filter(e => e.status === 'completed').length,
    failedEntries: queueEntries.filter(e => e.status === 'failed').length,
    averageProcessingTime: 0, // TODO: Calculate based on processed_at - requested_at
    queueWaitTime: 0 // TODO: Calculate based on oldest pending entry
  }

  return {
    queueState: {
      entries: queueEntries,
      isProcessing,
      processingEntryId: null,
      error,
      lastUpdated: Date.now()
    },
    queueEntries, // For backward compatibility
    stats,
    isLoading: isProcessing,
    error,
    addPlayerToQueue: async (playerData: PlayerQueueData) => {
      await addToQueue(playerData)
      return null
    },
    removePlayerFromQueue: async (entryId: string) => {
      await removeFromQueue(entryId)
      return true
    },
    processQueueEntry: async (entryId: string) => {
      await updateQueueEntry(entryId, { status: 'processing' })
      return true
    },
    updateQueueEntry, // Added for backward compatibility
    clearSessionQueue: async () => {
      await cleanupQueue()
    },
    getPlayerQueuePosition: (userId: string, sessionId: string) => {
      const entry = queueEntries.find(e => e.user_id === userId && e.session_id === sessionId)
      return entry ? queueEntries.indexOf(entry) + 1 : -1
    },
    isPlayerInQueue: (userId: string, sessionId: string) => {
      return queueEntries.some(e => e.user_id === userId && e.session_id === sessionId)
    },
    getQueueEntries: (sessionId: string) => {
      return queueEntries.filter(e => e.session_id === sessionId)
    },
    subscribeToQueue: () => {
      // Already handled in useEffect
    },
    unsubscribeFromQueue: () => {
      // Already handled in useEffect cleanup
    }
  }
} 