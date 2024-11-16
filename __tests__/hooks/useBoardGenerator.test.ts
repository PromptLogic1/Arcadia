import { renderHook, act } from '@testing-library/react'
import { useBoardGenerator } from '@/components/challenges/bingo-board/hooks/useBoardGenerator'
import type { BoardCell } from '@/components/challenges/bingo-board/types/types'
import type { Tag, TagCategory } from '@/components/challenges/bingo-board/types/tagsystem.types'

// Create mock service type
type MockBoardGeneratorService = {
  prepareCardPool: jest.Mock
  quickGenerate: jest.Mock
  customGenerate: jest.Mock
}

// Mock services
jest.mock('@/components/challenges/bingo-board/services/board-generator.service', () => {
  return {
    BoardGeneratorService: jest.fn().mockImplementation(() => ({
      prepareCardPool: jest.fn().mockResolvedValue([
        { text: 'Card 1', tier: 1, tags: ['tag1'] },
        { text: 'Card 2', tier: 2, tags: ['tag2'] }
      ]),
      quickGenerate: jest.fn().mockReturnValue([
        { text: 'Quick Card 1', colors: [], completedBy: [], blocked: false, isMarked: false, cellId: '1', lastUpdated: Date.now() },
        { text: 'Quick Card 2', colors: [], completedBy: [], blocked: false, isMarked: false, cellId: '2', lastUpdated: Date.now() }
      ] as BoardCell[]),
      customGenerate: jest.fn().mockReturnValue([
        { text: 'Custom Card 1', colors: [], completedBy: [], blocked: false, isMarked: false, cellId: '1', lastUpdated: Date.now() },
        { text: 'Custom Card 2', colors: [], completedBy: [], blocked: false, isMarked: false, cellId: '2', lastUpdated: Date.now() }
      ] as BoardCell[])
    }))
  }
})

jest.mock('@/components/challenges/bingo-board/services/balance.service', () => ({
  BalanceService: jest.fn().mockImplementation(() => ({
    checkLineBalance: jest.fn().mockReturnValue(true),
    checkBoardBalance: jest.fn().mockReturnValue(true)
  }))
}))

jest.mock('@/components/challenges/bingo-board/services/tag-validation.service', () => ({
  TagValidationService: jest.fn().mockImplementation(() => ({
    validateTag: jest.fn().mockReturnValue(true)
  }))
}))

describe('useBoardGenerator', () => {
  const mockBoard: BoardCell[] = Array(9).fill(null).map((_, i) => ({
    text: `Original Card ${i}`,
    colors: ['bg-gray-500'],
    completedBy: [],
    blocked: false,
    isMarked: false,
    cellId: `cell-${i}`,
    lastUpdated: Date.now()
  }))

  // Mock service instance
  let mockService: MockBoardGeneratorService

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Create default mock service with non-empty card pool
    mockService = {
      prepareCardPool: jest.fn().mockResolvedValue([
        { text: 'Card 1', tier: 1, tags: ['tag1'] },
        { text: 'Card 2', tier: 2, tags: ['tag2'] }
      ]),
      quickGenerate: jest.fn().mockReturnValue([
        { text: 'Quick Card 1', colors: [], completedBy: [], blocked: false, isMarked: false, cellId: '1', lastUpdated: Date.now() },
        { text: 'Quick Card 2', colors: [], completedBy: [], blocked: false, isMarked: false, cellId: '2', lastUpdated: Date.now() }
      ] as BoardCell[]),
      customGenerate: jest.fn().mockReturnValue([
        { text: 'Custom Card 1', colors: [], completedBy: [], blocked: false, isMarked: false, cellId: '1', lastUpdated: Date.now() },
        { text: 'Custom Card 2', colors: [], completedBy: [], blocked: false, isMarked: false, cellId: '2', lastUpdated: Date.now() }
      ] as BoardCell[])
    }
    
    // Update the mock implementation
    const mockModule = jest.requireMock('@/components/challenges/bingo-board/services/board-generator.service')
    mockModule.BoardGeneratorService.mockImplementation(() => mockService)
  })

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      const { result } = renderHook(() => useBoardGenerator('World of Warcraft'))
      
      expect(result.current.settings.boardSize).toBe(5)
      expect(result.current.settings.tags.size).toBe(0)
      expect(result.current.stats.attempts).toBe(0)
    })

    it('should validate initial settings', () => {
      const { result } = renderHook(() => useBoardGenerator('World of Warcraft'))
      
      expect(result.current.settings.boardSize).toBeGreaterThanOrEqual(3)
      expect(result.current.settings.boardSize).toBeLessThanOrEqual(6)
    })
  })

  describe('Board Generation', () => {
    it('should generate quick board successfully', async () => {
      const { result } = renderHook(() => useBoardGenerator('World of Warcraft'))
      
      await act(async () => {
        const board = await result.current.generateBoard('quick')
        expect(board).toBeDefined()
        if (board && board[0]) {
          expect(board.length).toBe(2)
          expect(board[0].text).toBe('Quick Card 1')
        } else {
          throw new Error('Board or first cell is undefined')
        }
      })
    })

    it('should generate custom board with specific settings', async () => {
      const { result } = renderHook(() => useBoardGenerator('World of Warcraft'))
      
      await act(async () => {
        await result.current.updateSettings({ boardSize: 4 })
        const board = await result.current.generateBoard('custom')
        expect(board).toBeDefined()
        if (board && board[0]) {
          expect(board[0].text).toBe('Custom Card 1')
        } else {
          throw new Error('Board or first cell is undefined')
        }
      })
    })

    it('should respect board size limits', async () => {
      const { result } = renderHook(() => useBoardGenerator('World of Warcraft'))
      
      await act(async () => {
        // First update should be processed immediately
        result.current.updateSettings({ boardSize: 4 })
      })

      // Check after state update is complete
      expect(result.current.settings.boardSize).toBe(4)

      await act(async () => {
        // Test upper limit with type assertion
        result.current.updateSettings({ boardSize: (6 as 3 | 4 | 5 | 6) })
      })
      expect(result.current.settings.boardSize).toBe(6) // Should be capped at 6
    })
  })

  describe('Tag Management', () => {
    it('should toggle tags correctly', () => {
      const { result } = renderHook(() => useBoardGenerator('World of Warcraft'))
      
      act(() => {
        result.current.toggleTag('tag1')
      })
      expect(result.current.settings.tags.has('tag1')).toBe(true)
      
      act(() => {
        result.current.toggleTag('tag1')
      })
      expect(result.current.settings.tags.has('tag1')).toBe(false)
    })

    it('should respect max tags limit', () => {
      const { result } = renderHook(() => useBoardGenerator('World of Warcraft'))
      
      // Add max number of tags
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.toggleTag(`tag${i}`)
        })
      }
      
      act(() => {
        result.current.toggleTag('extraTag')
      })
      expect(result.current.settings.tags.has('extraTag')).toBe(false)
    })

    it('should validate tags correctly', () => {
      const { result } = renderHook(() => useBoardGenerator('World of Warcraft'))
      
      const validTags: Tag[] = [{
        id: '1',
        name: 'valid',
        type: 'core',
        category: {
          id: 'cat1',
          name: 'difficulty' as TagCategory['name'],
          isRequired: true,
          allowMultiple: false,
          validForGames: ['all']
        },
        status: 'active',
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        votes: 0
      }]
      
      // Mock is set up to return true
      expect(result.current.validateTags(validTags)).toBe(true)
    })
  })

  describe('Balance Control', () => {
    it('should check board balance', () => {
      const { result } = renderHook(() => useBoardGenerator('World of Warcraft'))
      
      expect(result.current.checkBalance(mockBoard)).toBeDefined()
    })

    it('should optimize board layout', () => {
      const { result } = renderHook(() => useBoardGenerator('World of Warcraft'))
      
      const originalBoard = mockBoard.map((cell, i) => ({
        ...cell,
        text: `Original Card ${i}`
      }))
      
      const optimizedBoard = result.current.optimizeBoard(originalBoard)
      
      // Check that optimization made changes
      optimizedBoard.forEach((optimizedCell) => {
        // Extract the original card number from the optimized text
        const originalCardNumber = optimizedCell.text.match(/Original Card (\d+)/)?.[1]
        expect(originalCardNumber).toBeDefined()
        
        // Verify the optimized cell format
        expect(optimizedCell.text).toBe(`Optimized Original Card ${originalCardNumber}`)
        expect(optimizedCell.colors).toContain('bg-blue-500')
        expect(optimizedCell.cellId).toContain('optimized-')
        expect(optimizedCell.lastUpdated).toBeDefined()
        
        // Find the corresponding original cell
        const originalCell = originalBoard.find(cell => cell.text === `Original Card ${originalCardNumber}`)
        expect(originalCell).toBeDefined()
        if (originalCell) {
          expect(optimizedCell.blocked).toBe(!originalCell.blocked)
        }
      })

      // Verify that all cells were optimized
      expect(optimizedBoard.length).toBe(originalBoard.length)
      expect(optimizedBoard.every(cell => cell.text.startsWith('Optimized'))).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid generation mode', async () => {
      const { result } = renderHook(() => useBoardGenerator('World of Warcraft'))
      
      await act(async () => {
        // @ts-expect-error Testing invalid mode
        await expect(result.current.generateBoard('invalid'))
          .rejects
          .toThrow('Invalid generation mode')
      })
    })

    it('should handle empty card pool', async () => {
      // Override the mock for this specific test
      mockService.prepareCardPool.mockResolvedValueOnce([])
      
      const { result } = renderHook(() => useBoardGenerator('World of Warcraft'))
      
      await act(async () => {
        await expect(result.current.generateBoard('quick'))
          .rejects
          .toThrow('Card pool is empty')
      })
    })
  })
})

