import { supabase } from '@/lib/supabase_lib/supabase'
import { store } from '@/src/store'
import type { BingoBoard, CreateBingoBoardDTO } from '../types/bingoboard.types'
import { BOARD_SIZE_OPTIONS } from '../types/bingoboard.types'
import { setBingoBoards, setSelectedBoardId, setLoading, setError } from '../slices/bingoboardSlice'
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
        store.dispatch(setSelectedBoardId(board.id))
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

      // Debug log
      console.log('Input boardData:', boardData)

      const totalCells = boardData.board_size * boardData.board_size
      const initialBoardLayout = Array(totalCells).fill("")

      // Prepare board data
      const newBoard = {
        board_title: boardData.board_title,
        board_description: boardData.board_description || '',
        board_size: boardData.board_size,
        board_game_type: boardData.board_game_type,
        board_difficulty: boardData.board_difficulty,
        board_tags: boardData.board_tags || [],
        is_public: boardData.is_public,
        creator_id: authState.userdata.id,
        board_layoutbingocards: initialBoardLayout,
        votes: 0
      }

      console.log('Prepared newBoard:', newBoard)

      const { data, error } = await this.supabase
        .from('bingoboards')
        .insert([newBoard])
        .select()
        .single()

      if (error) {
        console.error('Detailed Supabase error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw new Error(`Database error: ${error.message}`)
      }

      if (!data) {
        throw new Error('No board data returned')
      }

      await this.initializeBoards()
      return data

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error creating board'
      console.error('Error creating board:', error)
      store.dispatch(setError(errorMessage))
      return null
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  public validateBoardConstraints(board: Partial<BingoBoard>): { isValid: boolean; error?: string } {
    // Title constraint: 3-50 characters
    if (board.board_title) {
      if (board.board_title.length < 3 || board.board_title.length > 50) {
        return {
          isValid: false,
          error: 'Title must be between 3 and 50 characters'
        }
      }
    }

    // Description constraint: 0-255 characters
    if (board.board_description && board.board_description.length > 255) {
      return {
        isValid: false,
        error: 'Description cannot exceed 255 characters'
      }
    }

    // Tags constraint: maximum 5 tags
    if (board.board_tags && board.board_tags.length > 5) {
      return {
        isValid: false,
        error: 'Maximum of 5 tags allowed'
      }
    }

    return { isValid: true }
  }

  async updateBoard(boardId: string, updates: BingoBoard): Promise<BingoBoard | null> {
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

  async updateBoardLayout(boardId: string, cardIds: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('bingo_boards')
        .update({ board_layoutbingocards: cardIds })
        .eq('id', boardId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating board layout:', error)
      throw error
    }
  }
}

export const bingoBoardService = new BingoBoardService() 