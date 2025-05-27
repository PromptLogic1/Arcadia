'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'
import type { QueueEntry, UseSessionQueue } from '../types/sessionqueue.types'
import { QUEUE_CONSTANTS } from '../types/sessionqueue.constants'
import { PLAYER_CONSTANTS } from '../types/playermanagement.constants'

export const useSessionQueue = (sessionId: string): UseSessionQueue => {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const supabase = createClientComponentClient<Database>()

  // Move fetchQueueEntries before the useEffect
  const fetchQueueEntries = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('bingo_session_queue')
        .select('*')
        .eq('session_id', sessionId)
        .order('requested_at', { ascending: true })

      if (fetchError) throw fetchError
      if (data) setQueueEntries(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch queue entries'))
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
          setQueueEntries(prev => [...prev, payload.new as QueueEntry])
        } else if (payload.eventType === 'UPDATE') {
          setQueueEntries(prev => 
            prev.map(entry => 
              entry.id === payload.new.id ? { ...entry, ...payload.new } : entry
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
  const updateQueueEntry = useCallback(async (entryId: string, updates: Partial<QueueEntry>) => {
    try {
      setIsProcessing(true)
      const { error: updateError } = await supabase
        .from('bingo_session_queue')
        .update(updates)
        .eq('id', entryId)

      if (updateError) throw updateError

      // Queue processing is handled by database trigger
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update queue entry'))
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
      setError(err instanceof Error ? err : new Error('Failed to remove from queue'))
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
        .in('status', ['approved', 'rejected'])

      if (cleanupError) throw cleanupError
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to cleanup queue'))
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

  // Update the addToQueue function to include user_id
  const addToQueue = useCallback(async (player: { name: string; color: string; team?: number }) => {
    try {
      setIsProcessing(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error: addError } = await supabase
        .from('bingo_session_queue')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          player_name: player.name,
          color: player.color,
          team: player.team ?? null,
          status: 'pending',
          requested_at: new Date().toISOString()
        })

      if (addError) throw addError
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add to queue'))
      throw err
    } finally {
      setIsProcessing(false)
    }
  }, [sessionId, supabase])

  const checkQueueStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bingo_session_queue')
        .select('status')
        .eq('session_id', sessionId)
        .eq('status', 'pending')
        .single()

      if (error) throw error
      return !!data
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to check queue status'))
      return false
    }
  }, [sessionId, supabase])

  // Add processQueue implementation
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
        const { data: playerCount } = await supabase
          .from('bingo_session_players')
          .select('count')
          .eq('session_id', sessionId)
          .single()

        if ((playerCount?.count || 0) >= PLAYER_CONSTANTS.LIMITS.MAX_PLAYERS) {
          await updateQueueEntry(entry.id, { 
            status: 'rejected',
            processed_at: new Date().toISOString()
          })
          continue
        }

        // Check if color is available
        const { data: colorCheck } = await supabase
          .from('bingo_session_players')
          .select()
          .eq('session_id', sessionId)
          .eq('color', entry.color)
          .single()

        if (colorCheck) {
          await updateQueueEntry(entry.id, { 
            status: 'rejected',
            processed_at: new Date().toISOString()
          })
          continue
        }

        // Add player to session
        const { error: playerError } = await supabase
          .from('bingo_session_players')
          .insert({
            session_id: sessionId,
            user_id: entry.user_id,
            player_name: entry.player_name,
            color: entry.color,
            team: entry.team,
            joined_at: new Date().toISOString()
          })

        if (playerError) {
          await updateQueueEntry(entry.id, { 
            status: 'rejected',
            processed_at: new Date().toISOString()
          })
          continue
        }

        await updateQueueEntry(entry.id, { 
          status: 'approved',
          processed_at: new Date().toISOString()
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to process queue'))
      throw err
    } finally {
      setIsProcessing(false)
    }
  }, [sessionId, supabase, updateQueueEntry])

  return {
    queueEntries,
    isProcessing,
    error,
    updateQueueEntry,
    removeFromQueue,
    cleanupQueue,
    addToQueue,
    checkQueueStatus,
    processQueue
  }
} 