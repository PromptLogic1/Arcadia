import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'
import type { BoardCell } from '../components/shared/types'

interface UseBingoBoardProps {
  boardId: string
}

export const useBingoBoard = ({ boardId }: UseBingoBoardProps) => {
  const [board, setBoard] = useState<Database['public']['Tables']['bingo_boards']['Row'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClientComponentClient<Database>()

  // Fetch board data
  useEffect(() => {
    const fetchBoard = async () => {
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

        if (fetchError) throw fetchError
        setBoard(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch board')
      } finally {
        setLoading(false)
      }
    }

    fetchBoard()
  }, [boardId, supabase])

  // Update board state
  const updateBoardState = async (newState: BoardCell[]) => {
    try {
      const { error: updateError } = await supabase
        .from('bingo_boards')
        .update({ board_state: newState })
        .eq('id', boardId)

      if (updateError) throw updateError
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update board')
    }
  }

  // Update board settings
  const updateBoardSettings = async (settings: Partial<Database['public']['Tables']['bingo_boards']['Row']>) => {
    try {
      const { error: updateError } = await supabase
        .from('bingo_boards')
        .update(settings)
        .eq('id', boardId)

      if (updateError) throw updateError
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings')
    }
  }

  // Subscribe to board changes
  useEffect(() => {
    const channel = supabase
      .channel(`board_${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bingo_boards',
          filter: `id=eq.${boardId}`
        },
        (payload) => {
          if (payload.new) {
            setBoard(payload.new as Database['public']['Tables']['bingo_boards']['Row'])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [boardId, supabase])

  return {
    board,
    loading,
    error,
    updateBoardState,
    updateBoardSettings
  }
} 