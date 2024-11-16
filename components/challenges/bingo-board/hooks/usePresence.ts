'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { PresenceState } from '../types/presence.types'
import { PRESENCE_CONSTANTS } from '../types/presence.constants'
import type { Database } from '@/types/database.types'
import type { RealtimePresenceState } from '@supabase/supabase-js'

interface PresenceStateWithRef extends PresenceState {
  presence_ref: string
}

// Helper function to convert presence state
const convertPresence = (presence: PresenceStateWithRef): PresenceState => ({
  user_id: presence.user_id,
  online_at: presence.online_at,
  last_seen_at: presence.last_seen_at,
  status: presence.status
})

export const usePresence = (boardId: string) => {
  const [presenceState, setPresenceState] = useState<Record<string, PresenceState>>({})
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClientComponentClient<Database>()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const updatePresence = useCallback(async (status: PresenceState['status']) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !channelRef.current) return

      await channelRef.current.track({
        user_id: user.id,
        online_at: Date.now(),
        last_seen_at: Date.now(),
        status
      })
    } catch (err) {
      console.error('Error updating presence:', err)
    }
  }, [supabase])

  const handleVisibilityChange = useCallback(() => {
    const status = document.hidden ? PRESENCE_CONSTANTS.STATUS.AWAY : PRESENCE_CONSTANTS.STATUS.ONLINE
    void updatePresence(status)
  }, [updatePresence])

  const setupPresence = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const channel = supabase.channel(`${PRESENCE_CONSTANTS.CHANNEL_PREFIX}${boardId}`)
      channelRef.current = channel

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<PresenceStateWithRef>()
          const typedState = Object.entries(state as RealtimePresenceState<PresenceStateWithRef>).reduce((acc, [key, value]) => {
            if (Array.isArray(value) && value[0]) {
              acc[key] = convertPresence(value[0])
            }
            return acc
          }, {} as Record<string, PresenceState>)
          setPresenceState(typedState)
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (newPresences?.[0]) {
            const presence = newPresences[0] as PresenceStateWithRef
            setPresenceState(prev => ({
              ...prev,
              [key]: convertPresence(presence)
            }))
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          setPresenceState(prev => {
            const newState = { ...prev }
            delete newState[key]
            return newState
          })
        })

      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await updatePresence(PRESENCE_CONSTANTS.STATUS.ONLINE)
        }
      })

      document.addEventListener('visibilitychange', handleVisibilityChange)

      const heartbeatInterval = setInterval(() => {
        updatePresence(document.hidden ? PRESENCE_CONSTANTS.STATUS.AWAY : PRESENCE_CONSTANTS.STATUS.ONLINE)
      }, PRESENCE_CONSTANTS.HEARTBEAT_INTERVAL)

      return () => {
        clearInterval(heartbeatInterval)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        supabase.removeChannel(channel)
        channelRef.current = null
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to track presence'))
    }
  }, [boardId, supabase, updatePresence, handleVisibilityChange])

  useEffect(() => {
    const cleanup = setupPresence()
    return () => {
      cleanup?.then(fn => fn?.())
    }
  }, [setupPresence])

  return {
    presenceState,
    error,
    getOnlineUsers: useCallback(() => 
      Object.values(presenceState).filter(p => p.status === PRESENCE_CONSTANTS.STATUS.ONLINE),
    [presenceState])
  }
} 