'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, db, handleSupabaseError } from '@/lib/supabase'
import type { 
  BingoBoard, 
  FilterState, 
  BoardSection,
  BoardCreator
} from '../types'
import { logger } from '@/lib/logger'

interface UseBingoBoardsOptions {
  initialSection?: BoardSection
  userId?: string
  enableRealtime?: boolean
}

interface UseBingoBoardsReturn {
  // State
  boards: BingoBoard[]
  loading: boolean
  error: string | null
  currentSection: BoardSection
  filterState: FilterState
  
  // Actions
  setCurrentSection: (section: BoardSection) => void
  setFilterState: (filters: Partial<FilterState>) => void
  refreshBoards: () => Promise<void>
  createBoard: (boardData: Partial<BingoBoard>) => Promise<BingoBoard>
  updateBoard: (boardId: string, updates: Partial<BingoBoard>) => Promise<void>
  deleteBoard: (boardId: string) => Promise<void>
  duplicateBoard: (boardId: string) => Promise<BingoBoard>
  toggleBookmark: (boardId: string) => Promise<void>
  voteOnBoard: (boardId: string, vote: 'up' | 'down') => Promise<void>
  
  // Computed
  filteredBoards: BingoBoard[]
  boardCount: number
  hasMore: boolean
  
  // Pagination
  loadMore: () => Promise<void>
  resetPagination: () => void
}

const DEFAULT_FILTER_STATE: FilterState = {
  category: 'All Games',
  difficulty: 'all',
  sort: 'newest',
  search: '',
  tags: [],
  isPublic: undefined
}

export const useBingoBoards = (options: UseBingoBoardsOptions = {}): UseBingoBoardsReturn => {
  const { 
    initialSection = 'all', 
    userId,
    enableRealtime = true 
  } = options
  
  // State
  const [boards, setBoards] = useState<BingoBoard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSection, setCurrentSection] = useState<BoardSection>(initialSection)
  const [filterState, setFilterStateInternal] = useState<FilterState>(DEFAULT_FILTER_STATE)
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 20,
    hasMore: true
  })

  // Error handling
  const handleError = useCallback((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    logger.error('Error in useBingoBoards hook', error as Error, { metadata: { hook: 'useBingoBoards', section: currentSection, filters: filterState } })
    setError(errorMessage)
  }, [currentSection, filterState])

  // Fetch boards based on current section and filters
  const fetchBoards = useCallback(async (reset = false) => {
    try {
      setLoading(true)
      setError(null)

      const currentOffset = reset ? 0 : pagination.offset
      let query = db.bingoBoards()
        .select(`
          *,
          creator:creator_id(
            username,
            avatar_url,
            id
          )
        `)

      // Apply section filters
      switch (currentSection) {
        case 'my-boards':
          if (userId) {
            query = query.eq('creator_id', userId)
          }
          break
        case 'bookmarked':
          // TODO: Join with bookmarks table when implemented
          break
        case 'all':
        default:
          query = query.eq('is_public', true)
          break
      }

      // Apply user filters
      if (filterState.category && filterState.category !== 'All Games') {
        query = query.eq('game_type', filterState.category)
      }

      if (filterState.difficulty && filterState.difficulty !== 'all') {
        query = query.eq('difficulty', filterState.difficulty)
      }

      if (filterState.search) {
        query = query.or(`title.ilike.%${filterState.search}%,description.ilike.%${filterState.search}%`)
      }

      if (filterState.isPublic !== undefined) {
        query = query.eq('is_public', filterState.isPublic)
      }

      // Apply sorting
      switch (filterState.sort) {
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        case 'oldest':
          query = query.order('created_at', { ascending: true })
          break
        case 'popular':
          query = query.order('votes', { ascending: false })
          break
        case 'difficulty':
          query = query.order('difficulty', { ascending: true })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      // Apply pagination
      query = query.range(currentOffset, currentOffset + pagination.limit - 1)

      const { data, error: fetchError } = await query

      if (fetchError) {
        handleSupabaseError(fetchError)
      }

      // Transform database results to BingoBoard format
      const transformedBoards: BingoBoard[] = (data || []).map(board => ({
        ...board,
        creator_id: board.creator_id,
        creator: board.creator as BoardCreator,
        created_at: board.created_at || new Date().toISOString(),
        updated_at: board.updated_at || new Date().toISOString(),
        description: board.description || '',
        version: board.version || 1
      }))
      
      if (reset) {
        setBoards(transformedBoards)
      } else {
        setBoards(prev => [...prev, ...transformedBoards])
      }

              setPagination(prev => ({
          ...prev,
          offset: currentOffset + transformedBoards.length,
          hasMore: transformedBoards.length === pagination.limit
        }))

    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }, [currentSection, filterState, pagination.offset, pagination.limit, userId, handleError])

  // Refresh boards (reset pagination)
  const refreshBoards = useCallback(async () => {
    setPagination(prev => ({ ...prev, offset: 0, hasMore: true }))
    await fetchBoards(true)
  }, [fetchBoards])

  // Load more boards
  const loadMore = useCallback(async () => {
    if (!pagination.hasMore || loading) return
    await fetchBoards(false)
  }, [fetchBoards, pagination.hasMore, loading])

  // Reset pagination
  const resetPagination = useCallback(() => {
    setPagination(prev => ({ ...prev, offset: 0, hasMore: true }))
  }, [])

  // Create new board
  const createBoard = useCallback(async (boardData: Partial<BingoBoard>): Promise<BingoBoard> => {
    try {
      const { data, error } = await db.bingoBoards()
        .insert({
          title: boardData.title || 'Untitled Board',
          creator_id: userId || '',
          size: boardData.size || 5,
          board_state: [],
          settings: {
            team_mode: false,
            lockout: false,
            sound_enabled: true,
            win_conditions: {
              line: true,
              majority: false,
              diagonal: false,
              corners: false
            }
          },
          status: 'draft',
          game_type: boardData.game_type || 'All Games',
          difficulty: boardData.difficulty || 'medium',
          is_public: boardData.is_public || false,
          cloned_from: boardData.cloned_from || null
        })
        .select()
        .single()

      if (error) {
        handleSupabaseError(error)
      }

      const newBoard = data as BingoBoard
      setBoards(prev => [newBoard, ...prev])
      return newBoard

    } catch (error) {
      handleError(error)
      throw error
    }
  }, [userId, handleError])

  // Update board
  const updateBoard = useCallback(async (boardId: string, updates: Partial<BingoBoard>) => {
    try {
      // Transform updates for database compatibility
      const dbUpdates = {
        ...updates,
        created_at: updates.created_at instanceof Date ? updates.created_at.toISOString() : updates.created_at,
        updated_at: updates.updated_at instanceof Date ? updates.updated_at.toISOString() : updates.updated_at
      }

      const { error } = await db.bingoBoards()
        .update(dbUpdates)
        .eq('id', boardId)

      if (error) {
        handleSupabaseError(error)
      }

      setBoards(prev => prev.map(board => 
        board.id === boardId ? { ...board, ...updates } : board
      ))

    } catch (error) {
      handleError(error)
      throw error
    }
  }, [handleError])

  // Delete board
  const deleteBoard = useCallback(async (boardId: string) => {
    try {
      const { error } = await db.bingoBoards()
        .delete()
        .eq('id', boardId)

      if (error) {
        handleSupabaseError(error)
      }

      setBoards(prev => prev.filter(board => board.id !== boardId))

    } catch (error) {
      handleError(error)
      throw error
    }
  }, [handleError])

  // Duplicate board
  const duplicateBoard = useCallback(async (boardId: string): Promise<BingoBoard> => {
    try {
      const originalBoard = boards.find(b => b.id === boardId)
      if (!originalBoard) {
        throw new Error('Board not found')
      }

      return await createBoard({
        ...originalBoard,
        title: `${originalBoard.title} (Copy)`,
        cloned_from: boardId,
        is_public: false
      })

    } catch (error) {
      handleError(error)
      throw error
    }
  }, [boards, createBoard, handleError])

  // Toggle bookmark
  const toggleBookmark = useCallback(async (boardId: string) => {
    try {
      // TODO: Implement bookmarks table and logic
      logger.info('Toggling bookmark for board', { metadata: { hook: 'useBingoBoards', boardId } })
    } catch (error) {
      handleError(error)
    }
  }, [handleError])

  // Vote on board
  const voteOnBoard = useCallback(async (boardId: string, vote: 'up' | 'down') => {
    try {
      // TODO: Implement voting system
      logger.info('Voting on board', { metadata: { hook: 'useBingoBoards', boardId, vote } })
    } catch (error) {
      handleError(error)
    }
  }, [handleError])

  // Set filter state with reset
  const setFilterState = useCallback((filters: Partial<FilterState>) => {
    setFilterStateInternal(prev => ({ ...prev, ...filters }))
    resetPagination()
  }, [resetPagination])

  // Computed values
  const filteredBoards = useMemo(() => {
    return boards // Filtering is done server-side
  }, [boards])

  const boardCount = useMemo(() => {
    return filteredBoards.length
  }, [filteredBoards])

  // Set current section with reset
  const setCurrentSectionWithReset = useCallback((section: BoardSection) => {
    setCurrentSection(section)
    resetPagination()
  }, [resetPagination])

  // Initial fetch and section changes
  useEffect(() => {
    refreshBoards()
  }, [refreshBoards])

  // Realtime subscription
  useEffect(() => {
    if (!enableRealtime) return

    const subscription = supabase
      .channel('bingo_boards_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bingo_boards'
      }, (payload) => {
        logger.debug('Realtime update received for bingo_boards', { metadata: { hook: 'useBingoBoards', payload } })
        // Handle realtime updates
        refreshBoards()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [enableRealtime, refreshBoards])

  return {
    // State
    boards: filteredBoards,
    loading,
    error,
    currentSection,
    filterState,
    
    // Actions
    setCurrentSection: setCurrentSectionWithReset,
    setFilterState,
    refreshBoards,
    createBoard,
    updateBoard,
    deleteBoard,
    duplicateBoard,
    toggleBookmark,
    voteOnBoard,
    
    // Computed
    filteredBoards,
    boardCount,
    hasMore: pagination.hasMore,
    
    // Pagination
    loadMore,
    resetPagination
  }
} 