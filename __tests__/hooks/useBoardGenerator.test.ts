import { renderHook, act } from '@testing-library/react'
import { useBoardGenerator } from '@/components/challenges/bingo-board/hooks/useBoardGenerator'
import type { BoardCell } from '@/components/challenges/bingo-board/types/types'
import { GENERATOR_CONFIG } from '@/components/challenges/bingo-board/types/generator.constants'

describe('useBoardGenerator', () => {
  const mockGame = "World of Warcraft"

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))

      expect(result.current.settings).toEqual({
        boardSize: 5,
        difficulty: {
          easy: 3,
          normal: 2,
          hard: 1
        },
        tags: new Set(),
        timeLimit: 300
      })
    })

    it('should initialize with empty stats', () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))

      expect(result.current.stats).toEqual({
        generationTime: 0,
        attempts: 0,
        balanceScore: 0
      })
    })
  })

  describe('board generation', () => {
    it('should generate a quick board with correct size', async () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))
      
      let board: BoardCell[] = []
      await act(async () => {
        board = await result.current.generateBoard('quick')
      })

      expect(board.length).toBe(result.current.settings.boardSize ** 2)
      expect(board[0]).toHaveProperty('text')
      expect(board[0]).toHaveProperty('cellId')
    })

    it('should generate a custom board with difficulty distribution', async () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))
      
      let board: BoardCell[] = []
      await act(async () => {
        board = await result.current.generateBoard('custom')
      })

      expect(board.length).toBe(result.current.settings.boardSize ** 2)
      expect(result.current.stats.attempts).toBeGreaterThan(0)
      expect(result.current.stats.balanceScore).toBeGreaterThan(0)
    })

    it('should respect MAX_ATTEMPTS limit', async () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))
      
      await act(async () => {
        try {
          await result.current.generateBoard('custom')
        } catch (error) {
          expect(result.current.stats.attempts).toBeLessThanOrEqual(
            GENERATOR_CONFIG.LIMITS.MAX_ATTEMPTS
          )
        }
      })
    })
  })

  describe('tag management', () => {
    it('should toggle tags correctly', () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))
      
      act(() => {
        result.current.toggleTag('test-tag')
      })
      expect(result.current.settings.tags.has('test-tag')).toBe(true)

      act(() => {
        result.current.toggleTag('test-tag')
      })
      expect(result.current.settings.tags.has('test-tag')).toBe(false)
    })

    it('should respect MAX_TAGS limit', () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))
      
      // Add max number of tags
      for (let i = 0; i < GENERATOR_CONFIG.LIMITS.MAX_TAGS + 1; i++) {
        act(() => {
          result.current.toggleTag(`tag-${i}`)
        })
      }

      expect(result.current.settings.tags.size).toBeLessThanOrEqual(
        GENERATOR_CONFIG.LIMITS.MAX_TAGS
      )
    })
  })

  describe('balance control', () => {
    it('should check board balance correctly', async () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))
      
      let board: BoardCell[] = []
      await act(async () => {
        board = await result.current.generateBoard('custom')
      })

      const isBalanced = result.current.checkBalance(board)
      expect(typeof isBalanced).toBe('boolean')
    })

    it('should optimize board placement', async () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))
      
      let board: BoardCell[] = []
      await act(async () => {
        board = await result.current.generateBoard('quick')
      })

      const optimizedBoard = result.current.optimizeBoard(board)
      expect(optimizedBoard.length).toBe(board.length)
      expect(optimizedBoard).not.toEqual(board)
    })
  })

  describe('settings management', () => {
    it('should update settings correctly', () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))
      
      act(() => {
        result.current.updateSettings({
          boardSize: 4,
          timeLimit: 600
        })
      })

      expect(result.current.settings.boardSize).toBe(4)
      expect(result.current.settings.timeLimit).toBe(600)
    })

    it('should validate board size updates', () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))
      
      act(() => {
        result.current.updateSettings({ boardSize: 6 }) // Max size
      })
      expect(result.current.settings.boardSize).toBe(6)

      act(() => {
        result.current.updateSettings({ boardSize: 3 }) // Min size
      })
      expect(result.current.settings.boardSize).toBe(3)
    })
  })
}) 