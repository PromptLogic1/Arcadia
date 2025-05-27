import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { BingoBoard, GameCategory, DifficultyLevel } from './types'

interface BingoBoardsState {
  // State
  boards: BingoBoard[]
  currentBoard: BingoBoard | null
  userBoards: BingoBoard[]
  publicBoards: BingoBoard[]
  loading: boolean
  error: string | null
  filters: {
    gameType: GameCategory | null
    difficulty: DifficultyLevel | null
    tags: string[]
    searchTerm: string
  }

  // Actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setBoards: (boards: BingoBoard[]) => void
  setCurrentBoard: (board: BingoBoard | null) => void
  setUserBoards: (boards: BingoBoard[]) => void
  setPublicBoards: (boards: BingoBoard[]) => void
  addBoard: (board: BingoBoard) => void
  updateBoard: (id: string, updates: Partial<BingoBoard>) => void
  removeBoard: (id: string) => void
  setFilters: (filters: Partial<BingoBoardsState['filters']>) => void
  clearFilters: () => void
}

export const useBingoBoardsStore = create<BingoBoardsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      boards: [],
      currentBoard: null,
      userBoards: [],
      publicBoards: [],
      loading: false,
      error: null,
      filters: {
        gameType: null,
        difficulty: null,
        tags: [],
        searchTerm: '',
      },

      // Actions
      setLoading: (loading) =>
        set({ loading }, false, 'bingoBoards/setLoading'),

      setError: (error) =>
        set({ error }, false, 'bingoBoards/setError'),

      setBoards: (boards) =>
        set({ boards, error: null }, false, 'bingoBoards/setBoards'),

      setCurrentBoard: (currentBoard) =>
        set({ currentBoard }, false, 'bingoBoards/setCurrentBoard'),

      setUserBoards: (userBoards) =>
        set({ userBoards }, false, 'bingoBoards/setUserBoards'),

      setPublicBoards: (publicBoards) =>
        set({ publicBoards }, false, 'bingoBoards/setPublicBoards'),

      addBoard: (board) => {
        const { boards, userBoards } = get()
        set(
          {
            boards: [...boards, board],
            userBoards: [...userBoards, board],
          },
          false,
          'bingoBoards/addBoard'
        )
      },

      updateBoard: (id, updates) => {
        const { boards, userBoards, publicBoards, currentBoard } = get()
        
        const updateBoards = (boardList: BingoBoard[]) =>
          boardList.map((board) =>
            board.id === id ? { ...board, ...updates } : board
          )

        set(
          {
            boards: updateBoards(boards),
            userBoards: updateBoards(userBoards),
            publicBoards: updateBoards(publicBoards),
            currentBoard:
              currentBoard?.id === id
                ? { ...currentBoard, ...updates }
                : currentBoard,
          },
          false,
          'bingoBoards/updateBoard'
        )
      },

      removeBoard: (id) => {
        const { boards, userBoards, publicBoards, currentBoard } = get()
        
        const filterBoards = (boardList: BingoBoard[]) =>
          boardList.filter((board) => board.id !== id)

        set(
          {
            boards: filterBoards(boards),
            userBoards: filterBoards(userBoards),
            publicBoards: filterBoards(publicBoards),
            currentBoard: currentBoard?.id === id ? null : currentBoard,
          },
          false,
          'bingoBoards/removeBoard'
        )
      },

      setFilters: (newFilters) => {
        const { filters } = get()
        set(
          { filters: { ...filters, ...newFilters } },
          false,
          'bingoBoards/setFilters'
        )
      },

      clearFilters: () =>
        set(
          {
            filters: {
              gameType: null,
              difficulty: null,
              tags: [],
              searchTerm: '',
            },
          },
          false,
          'bingoBoards/clearFilters'
        ),
    }),
    {
      name: 'bingo-boards-store',
    }
  )
)

// Selectors
export const useBingoBoards = () => useBingoBoardsStore((state) => ({
  boards: state.boards,
  currentBoard: state.currentBoard,
  userBoards: state.userBoards,
  publicBoards: state.publicBoards,
  loading: state.loading,
  error: state.error,
  filters: state.filters,
}))

export const useBingoBoardsActions = () => useBingoBoardsStore((state) => ({
  setLoading: state.setLoading,
  setError: state.setError,
  setBoards: state.setBoards,
  setCurrentBoard: state.setCurrentBoard,
  setUserBoards: state.setUserBoards,
  setPublicBoards: state.setPublicBoards,
  addBoard: state.addBoard,
  updateBoard: state.updateBoard,
  removeBoard: state.removeBoard,
  setFilters: state.setFilters,
  clearFilters: state.clearFilters,
})) 