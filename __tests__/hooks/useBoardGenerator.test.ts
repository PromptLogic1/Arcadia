import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useBoardGenerator } from '@/components/challenges/bingo-board/hooks/useBoardGenerator'
import { GENERATOR_CONFIG } from '@/components/challenges/bingo-board/types/generator.constants'
import type { BoardCell } from '@/components/challenges/bingo-board/types/types'
import type { Tag } from '@/components/challenges/bingo-board/types/tagsystem.types'
import type { GeneratorSettings, GeneratorStats } from '@/components/challenges/bingo-board/types/generator.types'

describe('useBoardGenerator', () => {
  const mockGame = 'World of Warcraft'

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))
      
      // Test all default settings
      expect(result.current.settings).toBeDefined()
      expect(result.current.settings.boardSize).toBe(5)
      expect(result.current.settings.timeLimit).toBe(300)
      expect(result.current.settings.tags).toBeInstanceOf(Set)
      expect(result.current.settings.tags.size).toBe(0)
      expect(result.current.settings.difficulty).toEqual({
        easy: 3,
        normal: 2,
        hard: 1
      })
    })

    it('should initialize stats with default values', () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))
      
      const expectedStats: GeneratorStats = {
        generationTime: 0,
        attempts: 0,
        balanceScore: 0
      }
      expect(result.current.stats).toEqual(expectedStats)
    })
  })

  describe('Settings Management', () => {
    it('should update settings correctly', () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))

      const newSettings: Partial<GeneratorSettings> = {
        boardSize: 4,
        timeLimit: 600,
        difficulty: { easy: 4, normal: 2, hard: 0 }
      }

      act(() => {
        result.current.updateSettings(newSettings)
      })

      expect(result.current.settings.boardSize).toBe(4)
      expect(result.current.settings.timeLimit).toBe(600)
      expect(result.current.settings.difficulty).toEqual(newSettings.difficulty)
    })

    it('should enforce board size limits', () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))

      // Test upper limit
      act(() => {
        const oversizedUpdate: Partial<GeneratorSettings> = {
          boardSize: 6 as 3 | 4 | 5 | 6
        }
        result.current.updateSettings(oversizedUpdate)
      })
      expect(result.current.settings.boardSize).toBe(6)

      // Test lower limit
      act(() => {
        const undersizedUpdate: Partial<GeneratorSettings> = {
          boardSize: 3 as 3 | 4 | 5 | 6
        }
        result.current.updateSettings(undersizedUpdate)
      })
      expect(result.current.settings.boardSize).toBe(3)
    })
  })

  describe('Tag Management', () => {
    it('should toggle tags correctly', () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))

      // Add tag
      act(() => {
        result.current.toggleTag('tag1')
      })
      expect(result.current.settings.tags.has('tag1')).toBe(true)

      // Remove tag
      act(() => {
        result.current.toggleTag('tag1')
      })
      expect(result.current.settings.tags.has('tag1')).toBe(false)
    })

    it('should respect maximum tag limit', () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))

      // Add more than maximum allowed tags
      for (let i = 0; i < GENERATOR_CONFIG.LIMITS.MAX_TAGS + 2; i++) {
        act(() => {
          result.current.toggleTag(`tag${i}`)
        })
      }

      expect(result.current.settings.tags.size).toBe(GENERATOR_CONFIG.LIMITS.MAX_TAGS)
    })

    it('should validate tags correctly', () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))
      
      const validTags: Tag[] = [
        {
          id: 'tag1',
          name: 'Tag 1',
          type: 'core',
          category: {
            id: 'gameplay',
            name: 'primaryCategory',
            isRequired: true,
            allowMultiple: false,
            validForGames: ['all']
          },
          status: 'active',
          description: 'Test tag 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          usageCount: 0,
          votes: 0,
          createdBy: 'system'
        },
        {
          id: 'tag2',
          name: 'Tag 2',
          type: 'community',
          category: {
            id: 'gameplay',
            name: 'primaryCategory',
            isRequired: true,
            allowMultiple: false,
            validForGames: ['all']
          },
          status: 'active',
          description: 'Test tag 2',
          createdAt: new Date(),
          updatedAt: new Date(),
          usageCount: 0,
          votes: 0,
          createdBy: 'system'
        }
      ]

      const isValid = result.current.validateTags(validTags)
      expect(isValid).toBe(true)
    })
  })

  describe('Board Generation', () => {
    it('should generate a quick board successfully', async () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))
      
      let generatedBoard: BoardCell[] | undefined
      await act(async () => {
        generatedBoard = await result.current.generateBoard('quick')
      })

      expect(generatedBoard).toBeDefined()
      expect(generatedBoard).toHaveLength(result.current.settings.boardSize ** 2)
      expect(result.current.stats.attempts).toBeGreaterThan(0)
      expect(result.current.stats.generationTime).toBeGreaterThan(0)
    })

    it('should generate a custom board successfully', async () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))
      
      let generatedBoard: BoardCell[] | undefined
      await act(async () => {
        generatedBoard = await result.current.generateBoard('custom')
      })

      expect(generatedBoard).toBeDefined()
      expect(generatedBoard).toHaveLength(result.current.settings.boardSize ** 2)
      expect(result.current.stats.attempts).toBeGreaterThan(0)
      expect(result.current.stats.generationTime).toBeGreaterThan(0)
    })

    it('should handle generation failures', async () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))
      
      // Set impossible settings to force failure
      act(() => {
        result.current.updateSettings({
          difficulty: { easy: 0, normal: 0, hard: 0 }
        })
      })

      await expect(result.current.generateBoard('quick')).rejects.toThrow()
    })
  })

  describe('Balance Checking', () => {
    it('should validate board balance', () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))
      const mockBoard = Array(25).fill({ 
        id: '1', 
        difficulty: 'normal',
        tags: ['tag1', 'tag2']
      })

      const isBalanced = result.current.checkBalance(mockBoard)
      expect(typeof isBalanced).toBe('boolean')
    })

    it('should optimize board placement', () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))
      const mockBoard = Array(25).fill({ 
        id: '1', 
        difficulty: 'normal',
        tags: ['tag1', 'tag2']
      })

      const optimizedBoard = result.current.optimizeBoard(mockBoard)
      expect(optimizedBoard).toHaveLength(mockBoard.length)
      expect(optimizedBoard).not.toBe(mockBoard) // Should return a new array
    })

    it('should handle balance optimization failures gracefully', () => {
      const { result } = renderHook(() => useBoardGenerator(mockGame))
      const invalidBoard = Array(25).fill(null)

      const optimizedBoard = result.current.optimizeBoard(invalidBoard)
      expect(optimizedBoard).toBe(invalidBoard) // Should return original board on failure
    })
  })
})

