import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'

interface UseGameStateProps {
  sessionId: string
}

export const useGameState = ({ sessionId }: UseGameStateProps) => {
  const [gameState, setGameState] = useState<Database['public']['Tables']['bingo_sessions']['Row'] | null>(null)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const channel = supabase
      .channel(`game_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bingo_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.new) {
            setGameState(payload.new as Database['public']['Tables']['bingo_sessions']['Row'])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase])

  const updateGameState = async (updates: Partial<Database['public']['Tables']['bingo_sessions']['Row']>) => {
    const { error } = await supabase
      .from('bingo_sessions')
      .update(updates)
      .eq('id', sessionId)

    if (error) throw error
  }

  return {
    gameState,
    updateGameState
  }
} 