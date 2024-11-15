import { useCallback, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { RealtimePresenceState } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

interface PresenceState {
  user_id: string
  online_at: number
  last_seen_at: number
  status: 'online' | 'away' | 'offline'
}

// Add type guard
const isPresenceState = (value: unknown): value is PresenceState => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'user_id' in value &&
    'online_at' in value &&
    'last_seen_at' in value &&
    'status' in value
  )
}

// Add updatePresenceState function
const updatePresenceState = (
  setPresenceState: React.Dispatch<React.SetStateAction<Record<string, PresenceState>>>,
  key: string, 
  presence: PresenceState
) => {
  setPresenceState(prev => ({
    ...prev,
    [key]: presence
  }))
}

export const usePresence = (boardId: string) => {
  const [presenceState, setPresenceState] = useState<Record<string, PresenceState>>({})
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClientComponentClient<Database>()

  // Track user presence
  const trackPresence = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const channel = supabase.channel(`presence:${boardId}`)

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<PresenceState>()
          const typedState = Object.entries(state).reduce((acc, [key, value]) => {
            if (Array.isArray(value) && value[0] && isPresenceState(value[0])) {
              acc[key] = value[0]
            }
            return acc
          }, {} as Record<string, PresenceState>)
          setPresenceState(typedState)
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (newPresences[0] && isPresenceState(newPresences[0])) {
            updatePresenceState(setPresenceState, key, newPresences[0])
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          setPresenceState(prev => {
            const newState = { ...prev }
            delete newState[key]
            return newState
          })
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user_id: user.id,
              online_at: Date.now(),
              last_seen_at: Date.now(),
              status: 'online'
            })
          }
        })

      // Heartbeat to keep presence alive
      const heartbeat = setInterval(async () => {
        await channel.track({
          user_id: user.id,
          online_at: Date.now(),
          last_seen_at: Date.now(),
          status: document.hidden ? 'away' : 'online'
        })
      }, 30000)

      return () => {
        clearInterval(heartbeat)
        supabase.removeChannel(channel)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to track presence'))
    }
  }, [boardId, supabase])

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      trackPresence()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [trackPresence])

  // Initial setup
  useEffect(() => {
    const cleanup = trackPresence()
    return () => {
      cleanup?.then(fn => fn?.())
    }
  }, [trackPresence])

  return {
    presenceState,
    error,
    getOnlineUsers: useCallback(() => 
      Object.values(presenceState).filter(p => p.status === 'online'),
    [presenceState])
  }
} 