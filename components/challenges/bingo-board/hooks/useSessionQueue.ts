'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'
import type { QueueEntry, UseSessionQueue } from '../types/sessionqueue.types'
import { QUEUE_CONSTANTS } from '../types/sessionqueue.constants'
import { useSession } from './useSession'
import { usePlayerManagement } from './usePlayerManagement'
import { useGameSettings } from './useGameSettings'
import type { Player } from '../types/types'
import { GAME_SETTINGS } from '../types/gamesettings.constants'

export const useSessionQueue = (sessionId: string): UseSessionQueue => {
  // States
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Hooks
  const supabase = createClientComponentClient<Database>()
  const { settings } = useGameSettings(sessionId)
  const { players } = usePlayerManagement(sessionId)
  const { isActive, addPlayer } = useSession({ boardId: sessionId, _game: 'All Games' })

  // Refs für zirkuläre Abhängigkeiten
  const processQueueRef = useRef<() => Promise<void>>()
  const cleanupQueueRef = useRef<() => Promise<void>>()

  // Helpers
  const validateQueueSize = useCallback((): boolean => {
    return queueEntries.length < QUEUE_CONSTANTS.LIMITS.MAX_QUEUE_SIZE
  }, [queueEntries.length])

  const updateQueueEntry = useCallback(async (entryId: string, updates: Partial<QueueEntry>) => {
    const { error } = await supabase
      .from('bingo_session_queue')
      .update(updates)
      .eq('id', entryId)

    if (error) throw error

    setQueueEntries(prev => prev.map(entry =>
      entry.id === entryId ? { ...entry, ...updates } : entry
    ))
  }, [supabase])

  // Declare processQueue
  processQueueRef.current = async () => {
    if (!isActive || isProcessing) return
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

        const newPlayer: Player = {
          id: entry.userId,
          name: entry.playerName,
          color: entry.color,
          team: players.length % 2,
          hoverColor: `hover:${entry.color}`
        }

        await addPlayer(newPlayer)

        await updateQueueEntry(entry.id, {
          status: QUEUE_CONSTANTS.STATUS.APPROVED
        })
      }

      await cleanupQueueRef.current?.()
    } catch (error) {
      setError(error as Error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Declare cleanupQueue
  cleanupQueueRef.current = async () => {
    setIsProcessing(true)
    try {
      const cutoffTime = new Date(Date.now() - QUEUE_CONSTANTS.LIMITS.MAX_WAIT_TIME)
      
      await supabase
        .from('bingo_session_queue')
        .delete()
        .or(`status.eq.${QUEUE_CONSTANTS.STATUS.APPROVED},status.eq.${QUEUE_CONSTANTS.STATUS.REJECTED}`)
        .lt('requested_at', cutoffTime.toISOString())

      await processQueueRef.current?.()
    } catch (error) {
      setError(error as Error)
    } finally {
      setIsProcessing(false)
    }
  }

  const addToQueue = useCallback(async (player: Pick<Player, 'name' | 'color'>) => {
    setIsProcessing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (!validateQueueSize()) {
        throw new Error(QUEUE_CONSTANTS.ERRORS.QUEUE_FULL)
      }

      const { data: entry, error } = await supabase
        .from('bingo_session_queue')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          player_name: player.name,
          color: player.color,
          team: players.length % 2,
          status: QUEUE_CONSTANTS.STATUS.PENDING,
          requested_at: new Date().toISOString()
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
          position: queueEntries.length
        }
        setQueueEntries(prev => [...prev, queueEntry])
      }
    } catch (error) {
      setError(error as Error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [sessionId, supabase, validateQueueSize, players.length, queueEntries.length])

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

  const updateQueuePosition = useCallback(async (entryId: string, newPosition: number) => {
    setIsProcessing(true)
    try {
      if (newPosition < 0 || newPosition >= queueEntries.length) {
        throw new Error(QUEUE_CONSTANTS.ERRORS.INVALID_POSITION)
      }

      const entry = queueEntries.find(e => e.id === entryId)
      if (!entry) return

      setQueueEntries(prev => {
        const newEntries = prev.filter(e => e.id !== entryId)
        newEntries.splice(newPosition, 0, entry)
        return newEntries
      })
    } catch (error) {
      setError(error as Error)
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

  // Cleanup interval mit Ref
  useEffect(() => {
    const interval = setInterval(() => {
      cleanupQueueRef.current?.().catch(console.error)
    }, QUEUE_CONSTANTS.LIMITS.CLEANUP_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  return {
    queueEntries,
    isProcessing,
    error,
    addToQueue,
    removeFromQueue,
    processQueue: processQueueRef.current ?? (async () => {}),
    updateQueuePosition,
    checkQueueStatus,
    validateQueueSize,
    cleanupQueue: cleanupQueueRef.current ?? (async () => {})
  }
} 