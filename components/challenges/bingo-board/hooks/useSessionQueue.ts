'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'
import type { QueueEntry, UseSessionQueue } from '../types/sessionqueue.types'
import { QUEUE_CONSTANTS } from '../types/sessionqueue.constants'
import { useSession } from './useSession'
import { usePlayerManagement } from './usePlayerManagement'
import { useGameSettings } from './useGameSettings'
import type { Player } from '../types/types'
import { GAME_SETTINGS } from '../types/gamesettings.constants'

interface QueueEntryWithError extends QueueEntry {
  error?: string
}

const mapDatabaseToQueueEntry = (data: Database['public']['Tables']['bingo_session_queue']['Row']): QueueEntry => ({
  id: data.id,
  sessionId: data.session_id,
  userId: data.user_id,
  playerName: data.player_name,
  color: data.color,
  status: data.status,
  requestedAt: data.requested_at,
  position: 0,
  priority: 'normal'
})

export const useSessionQueue = (sessionId: string): UseSessionQueue => {
  // States
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Hooks
  const supabase = createClientComponentClient<Database>()
  const { settings } = useGameSettings(sessionId)
  const { players } = usePlayerManagement(sessionId)
  const session = useSession({ boardId: sessionId, _game: 'All Games' })

  // Validate queue size
  const validateQueueSize = useCallback(() => {
    return queueEntries.length < QUEUE_CONSTANTS.LIMITS.MAX_QUEUE_SIZE
  }, [queueEntries])

  // Update queue entry
  const updateQueueEntry = useCallback(async (entryId: string, updates: Partial<QueueEntryWithError>) => {
    try {
      const { error: updateError } = await supabase
        .from('bingo_session_queue')
        .update(updates)
        .eq('id', entryId)

      if (updateError) throw updateError

      setQueueEntries(prev => prev.map(entry =>
        entry.id === entryId ? { ...entry, ...updates } : entry
      ))
    } catch (err) {
      const error = err as Error
      setError(error)
      throw error
    }
  }, [supabase])

  // Define process queue
  const processQueue = useCallback(async () => {
    if (!session.isActive || isProcessing) return
    setIsProcessing(true)

    try {
      const pendingEntries = queueEntries.filter(
        entry => entry.status === QUEUE_CONSTANTS.STATUS.PENDING
      )

      const maxPlayers = settings.maxPlayerLimit ?? GAME_SETTINGS.PLAYER_LIMITS.MAX_PLAYER_LIMIT

      for (const entry of pendingEntries) {
        if (players.length >= maxPlayers) {
          await updateQueueEntry(entry.id, {
            status: QUEUE_CONSTANTS.STATUS.REJECTED,
            error: QUEUE_CONSTANTS.ERRORS.SESSION_FULL
          })
          continue
        }

        await supabase
          .from('bingo_session_players')
          .insert({
            session_id: sessionId,
            user_id: entry.userId,
            player_name: entry.playerName,
            color: entry.color,
            team: players.length % 2,
            joined_at: new Date().toISOString()
          })

        await updateQueueEntry(entry.id, {
          status: QUEUE_CONSTANTS.STATUS.APPROVED
        })
      }
    } catch (err) {
      const error = err as Error
      setError(error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [
    session.isActive,
    isProcessing,
    queueEntries,
    settings.maxPlayerLimit,
    players.length,
    supabase,
    sessionId,
    updateQueueEntry
  ])

  // Define cleanup queue
  const cleanupQueue = useCallback(async () => {
    setIsProcessing(true)
    try {
      const cutoffTime = new Date(Date.now() - QUEUE_CONSTANTS.LIMITS.MAX_WAIT_TIME)
      
      // Delete from database
      await supabase
        .from('bingo_session_queue')
        .delete()
        .in('status', [
          QUEUE_CONSTANTS.STATUS.APPROVED,
          QUEUE_CONSTANTS.STATUS.REJECTED
        ])
        .lt('requested_at', cutoffTime.toISOString())

      // Update local state to match database
      setQueueEntries(prev => prev.filter(entry => {
        const entryDate = new Date(entry.requestedAt)
        return (
          entry.status === QUEUE_CONSTANTS.STATUS.PENDING ||
          entryDate > cutoffTime
        )
      }))

      await processQueue()
    } catch (err) {
      const error = err as Error
      setError(error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [supabase, processQueue])

  // Add setQueueEntriesForTesting
  const setQueueEntriesForTesting = useCallback((entries: QueueEntry[]) => {
    if (process.env.NODE_ENV === 'test') {
      setQueueEntries(entries)
    }
  }, [])

  // Update state handling in async operations
  const addToQueue = useCallback(async (player: Pick<Player, 'name' | 'color'>) => {
    if (!validateQueueSize()) {
      const error = new Error(QUEUE_CONSTANTS.ERRORS.QUEUE_FULL)
      setError(error)
      throw error
    }

    setIsProcessing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: entry, error } = await supabase
        .from('bingo_session_queue')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          player_name: player.name,
          color: player.color,
          team: players.length % 2,
          status: QUEUE_CONSTANTS.STATUS.PENDING,
          requested_at: new Date().toISOString(),
          priority: 'normal' // Add default priority
        })
        .select()
        .single()

      if (error) throw error
      if (entry) {
        const queueEntry: QueueEntry = {
          id: entry.id,
          sessionId: entry.session_id,
          userId: entry.user_id,
          playerName: entry.player_name,
          color: entry.color,
          status: entry.status,
          requestedAt: entry.requested_at,
          position: queueEntries.length,
          priority: 'normal' // Add priority
        }
        setQueueEntries(prev => [...prev, queueEntry])
      }
    } catch (err) {
      const error = err as Error
      setError(error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [sessionId, supabase, players.length, queueEntries.length, validateQueueSize])

  const removeFromQueue = useCallback(async (entryId: string) => {
    setIsProcessing(true)
    try {
      await supabase
        .from('bingo_session_queue')
        .delete()
        .eq('id', entryId)

      setQueueEntries(prev => prev.filter(entry => entry.id !== entryId))
    } catch (error) {
      setError(error as Error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [supabase])

  // Update queue position with proper error handling
  const updateQueuePosition = useCallback(async (entryId: string, newPosition: number) => {
    setIsProcessing(true)
    try {
      if (newPosition < 0 || newPosition >= queueEntries.length) {
        const error = new Error(QUEUE_CONSTANTS.ERRORS.INVALID_POSITION)
        setError(error)
        throw error
      }

      const entry = queueEntries.find(e => e.id === entryId)
      if (!entry) {
        const error = new Error('Entry not found')
        setError(error)
        throw error
      }

      setQueueEntries(prev => {
        const newEntries = prev.filter(e => e.id !== entryId)
        newEntries.splice(newPosition, 0, entry)
        return newEntries
      })
    } catch (err) {
      const error = err as Error
      setError(error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [queueEntries])

  // Status Management
  const checkQueueStatus = useCallback(async () => {
    try {
      const { data: entries } = await supabase
        .from('bingo_session_queue')
        .select()
        .eq('session_id', sessionId)
        .eq('status', QUEUE_CONSTANTS.STATUS.PENDING)

      return (entries?.length ?? 0) > 0
    } catch (error) {
      setError(error as Error)
      return false
    }
  }, [sessionId, supabase])

  // Cleanup interval with proper dependencies
  useEffect(() => {
    let mounted = true
    const interval = setInterval(() => {
      if (mounted) {
        cleanupQueue().catch(console.error)
      }
    }, QUEUE_CONSTANTS.LIMITS.CLEANUP_INTERVAL)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [cleanupQueue])

  // Reconnect with proper error handling
  const reconnect = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bingo_session_queue')
        .select()
        .eq('session_id', sessionId)
        .order('requested_at', { ascending: true })

      if (error) {
        setError(error)
        throw error
      }

      if (data) {
        const mappedEntries = data.map((entry, index) => ({
          ...mapDatabaseToQueueEntry(entry),
          position: index
        }))
        setQueueEntries(mappedEntries)
      }
    } catch (err) {
      const error = err as Error
      setError(error)
      throw error
    }
  }, [sessionId, supabase])

  return {
    queueEntries,
    isProcessing,
    error,
    addToQueue,
    removeFromQueue,
    processQueue,
    updateQueuePosition,
    checkQueueStatus,
    validateQueueSize,
    cleanupQueue,
    reconnect,
    updateQueueEntry,
    setQueueEntriesForTesting
  }
} 