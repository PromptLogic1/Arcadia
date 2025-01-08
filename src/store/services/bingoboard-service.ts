import { supabase } from '@/lib/supabase_lib/supabase'
import { store } from '@/src/store'
import type { BingoBoard, CreateBingoBoardDTO, UpdateBingoBoardDTO } from '../types/bingoboard.types'
import { setBingoBoards, setSelectedBoard, setLoading, setError } from '../slices/bingoboardSlice'
import { serverLog } from '@/lib/logger'

class BingoBoardService {
  private supabase = supabase

  constructor() {
    if (!this.supabase) {
      console.error('Supabase client not properly initialized')
    }
  }

  async initializeBoards() {
    try {
      store.dispatch(setLoading(true))
      
      const authState = store.getState().auth
      if (!authState.userdata?.id) {
        throw new Error('User not authenticated')
      }

      const { data: boards, error } = await this.supabase
        .from('bingoboards')
        .select('*')
        .eq('creator_id', authState.userdata.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Update Redux store with boards
      store.dispatch(setBingoBoards(boards || []))
      return boards

    } catch (error) {
      console.error('Bingo boards initialization error:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to load boards'))
      return []
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async getBoardById(boardId: string): Promise<BingoBoard | null> {
    try {
      store.dispatch(setLoading(true))

      const { data: board, error } = await this.supabase
        .from('bingoboards')
        .select('*')
        .eq('id', boardId)
        .single()

      if (error) throw error

      if (board) {
        store.dispatch(setSelectedBoard(board))
      }

      return board
    } catch (error) {
      console.error('Error fetching board:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to fetch board'))
      return null
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async createBoard(boardData: CreateBingoBoardDTO): Promise<BingoBoard | null> {
    try {
      store.dispatch(setLoading(true))
      
      const authState = store.getState().auth
      if (!authState.userdata?.id) {
        throw new Error('User not authenticated')
      }

      await serverLog('Creating bingo board', { boardData })

      const { data: board, error } = await this.supabase
        .from('bingoboards')
        .insert([{ ...boardData, creator_id: authState.userdata.id }])
        .select()
        .single()

      if (error) throw error

      await serverLog('Bingo board created successfully', { boardId: board.id })
      
      // Refresh boards list
      await this.initializeBoards()
      
      return board
    } catch (error) {
      console.error('Error creating board:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to create board'))
      await serverLog('Error creating bingo board', { error })
      return null
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async updateBoard(boardId: string, updates: UpdateBingoBoardDTO): Promise<BingoBoard | null> {
    try {
      store.dispatch(setLoading(true))

      const { data: board, error } = await this.supabase
        .from('bingoboards')
        .update(updates)
        .eq('id', boardId)
        .select()
        .single()

      if (error) throw error

      // Refresh boards list
      await this.initializeBoards()
      
      return board
    } catch (error) {
      console.error('Error updating board:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to update board'))
      return null
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async deleteBoard(boardId: string): Promise<boolean> {
    try {
      store.dispatch(setLoading(true))

      const { error } = await this.supabase
        .from('bingoboards')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', boardId)

      if (error) throw error

      // Refresh boards list
      await this.initializeBoards()
      
      return true
    } catch (error) {
      console.error('Error deleting board:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to delete board'))
      return false
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async voteBoard(boardId: string): Promise<boolean> {
    try {
      store.dispatch(setLoading(true))

      const { data: board, error: fetchError } = await this.supabase
        .from('bingoboards')
        .select('votes')
        .eq('id', boardId)
        .single()

      if (fetchError) throw fetchError

      const { error: updateError } = await this.supabase
        .from('bingoboards')
        .update({ votes: (board.votes || 0) + 1 })
        .eq('id', boardId)

      if (updateError) throw updateError

      // Refresh boards list
      await this.initializeBoards()
      
      return true
    } catch (error) {
      console.error('Error voting for board:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to vote for board'))
      return false
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async cloneBoard(boardId: string): Promise<BingoBoard | null> {
    try {
      store.dispatch(setLoading(true))

      const authState = store.getState().auth
      if (!authState.userdata?.id) {
        throw new Error('User not authenticated')
      }

      // First get the original board
      const { data: originalBoard, error: fetchError } = await this.supabase
        .from('bingoboards')
        .select('*')
        .eq('id', boardId)
        .single()

      if (fetchError) throw fetchError

      // Create new board as a clone
      const { data: newBoard, error: createError } = await this.supabase
        .from('bingoboards')
        .insert([{
          ...originalBoard,
          id: undefined, // Let Supabase generate a new ID
          creator_id: authState.userdata.id,
          board_title: `Copy of ${originalBoard.board_title}`,
          cloned_from: boardId,
          votes: 0,
          created_at: undefined,
          updated_at: undefined
        }])
        .select()
        .single()

      if (createError) throw createError

      // Refresh boards list
      await this.initializeBoards()
      
      return newBoard
    } catch (error) {
      console.error('Error cloning board:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to clone board'))
      return null
    } finally {
      store.dispatch(setLoading(false))
    }
  }
}

export const bingoBoardService = new BingoBoardService() 