import { useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'
import type { QueueEntry } from '../components/shared/types'

type DatabaseQueueEntry = Database['public']['Tables']['bingo_session_queue']['Row'] & {
  error?: string
}

const mapToQueueEntry = (entry: DatabaseQueueEntry): QueueEntry => ({
  id: entry.id,
  sessionId: entry.session_id,
  userId: entry.user_id,
  playerName: entry.player_name,
  color: entry.color,
  status: entry.status,
  requestedAt: entry.requested_at,
  error: entry.error
})

export const useSessionQueue = (_sessionId: string) => {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const supabase = createClientComponentClient<Database>()

  const addToQueue = useCallback(async (_request: {
    playerName: string
    color: string
  }) => {
    setIsProcessing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: entry, error } = await supabase
        .from('bingo_session_queue')
        .insert({
          session_id: _sessionId,
          user_id: user.id,
          player_name: _request.playerName,
          color: _request.color,
          status: 'pending',
          requested_at: new Date().toISOString(),
          team: null
        })
        .select()
        .single()

      if (error) throw error
      if (entry) {
        setQueueEntries(prev => [...prev, mapToQueueEntry(entry)])
      }
    } catch (error) {
      console.error('Error adding to queue:', error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [_sessionId, supabase])

  const processQueue = useCallback(async () => {
    setIsProcessing(true)
    try {
      const { data: entries } = await supabase
        .from('bingo_session_queue')
        .select()
        .eq('session_id', _sessionId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: true })

      if (entries?.length) {
        setQueueEntries(entries.map(mapToQueueEntry))
      }
    } catch (error) {
      console.error('Error processing queue:', error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [_sessionId, supabase])

  const cleanupQueue = useCallback(async () => {
    setIsProcessing(true)
    try {
      await supabase
        .from('bingo_session_queue')
        .delete()
        .eq('session_id', _sessionId)
        .neq('status', 'pending')

      await processQueue() // Refresh queue entries
    } catch (error) {
      console.error('Error cleaning up queue:', error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [_sessionId, supabase, processQueue])

  return {
    queueEntries,
    isProcessing,
    addToQueue,
    processQueue,
    cleanupQueue
  }
} 