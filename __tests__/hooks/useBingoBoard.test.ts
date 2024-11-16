import '@testing-library/jest-dom'
import { renderHook, act } from '@testing-library/react'
import { useBingoBoard } from '@/components/challenges/bingo-board/hooks/useBingoBoard'
import { generateMockBoardCell } from '../test-utils'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { BoardCell } from '@/components/challenges/bingo-board/types/types'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

// Update the mock type definition and setup
type MockSupabaseClient = {
  from: jest.Mock
  channel: jest.Mock
  removeChannel: jest.Mock
}

describe('useBingoBoard', () => {
  const mockBoardId = 'test-board-id'
  let mockSupabase: MockSupabaseClient
  let mockSingle: jest.Mock
  let _mockUpdate: jest.Mock
  let _mockEq: jest.Mock

  beforeEach(() => {
    // Create individual mock functions
    mockSingle = jest.fn()
    _mockUpdate = jest.fn()
    _mockEq = jest.fn()

    // Setup mock Supabase client with proper chaining
    const mockSelectChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: mockSingle
    }

    const mockUpdateChain = {
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ error: null })
      })
    }

    mockSupabase = {
      from: jest.fn().mockReturnValue({
        ...mockSelectChain,
        update: jest.fn().mockReturnValue(mockUpdateChain)
      }),
      channel: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn()
      }),
      removeChannel: jest.fn()
    } as unknown as MockSupabaseClient

    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useBingoBoard({ boardId: mockBoardId }))
    
    expect(result.current.loading).toBe(true)
    expect(result.current.board).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should fetch board data successfully', async () => {
    const mockBoardData = {
      id: mockBoardId,
      board_state: [generateMockBoardCell()],
      creator: {
        username: 'test-user',
        avatar_url: 'test-avatar'
      }
    }

    mockSingle.mockResolvedValueOnce({ data: mockBoardData, error: null })

    const { result } = renderHook(() => useBingoBoard({ boardId: mockBoardId }))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.board).toEqual(mockBoardData)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors', async () => {
    // Mock the error response
    mockSingle.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Network error' }
    })

    // Render the hook
    const { result } = renderHook(() => useBingoBoard({ boardId: mockBoardId }))

    // Initial state should be loading
    expect(result.current.loading).toBe(true)

    // Wait for all state updates to complete
    await act(async () => {
      // Wait for the initial fetch to complete and state updates to settle
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    // Verify the final state
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeTruthy()
    expect(result.current.board).toBeNull()
  })

  it('should update board state successfully', async () => {
    const mockBoardData = {
      id: mockBoardId,
      board_state: [generateMockBoardCell()],
      creator: {
        username: 'test-user',
        avatar_url: 'test-avatar'
      }
    }

    // Initial fetch
    mockSingle.mockResolvedValueOnce({ data: mockBoardData, error: null })
    // Update response
    mockSingle.mockResolvedValueOnce({ data: mockBoardData, error: null })

    const { result } = renderHook(() => useBingoBoard({ boardId: mockBoardId }))

    // Wait for initial fetch
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    const newBoardState = [generateMockBoardCell({ text: 'Updated Cell' })]

    // Perform update
    await act(async () => {
      await result.current.updateBoardState(newBoardState)
    })

    expect(result.current.board?.board_state).toEqual(newBoardState)
    expect(result.current.error).toBeNull()
  })

  it('should handle update errors with rollback', async () => {
    const initialBoardData = {
      id: mockBoardId,
      board_state: [generateMockBoardCell()],
      creator: {
        username: 'test-user',
        avatar_url: 'test-avatar'
      }
    }

    // Initial fetch
    mockSingle.mockResolvedValueOnce({ data: initialBoardData, error: null })
    
    // Mock update chain
    const mockUpdateChain = {
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ error: new Error('Update failed') })
      })
    }

    mockSupabase.from.mockReturnValue({
      ...mockSupabase.from(),
      update: jest.fn().mockReturnValue(mockUpdateChain)
    })

    const { result } = renderHook(() => useBingoBoard({ boardId: mockBoardId }))

    // Wait for initial fetch and state to settle
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    // Force React to flush all updates
    await act(async () => {})

    // Store initial state
    const initialState = result.current.board?.board_state
    expect(initialState).toBeDefined() // Ensure initial state is set
      
    const newBoardState = [generateMockBoardCell({ text: 'Updated Cell' })]

    // Attempt update
    await act(async () => {
      try {
        await result.current.updateBoardState(newBoardState)
      } catch (error) {
        // Expected error
      }
    })

    // Force React to flush all updates
    await act(async () => {})

    // Verify rollback
    expect(result.current.board?.board_state).toEqual(initialState)
    expect(result.current.error).toBeTruthy()
  })

  it('should validate board state correctly', async () => {
    const { result } = renderHook(() => useBingoBoard({ boardId: mockBoardId }))

    const invalidBoardState = [{ invalid: 'state' }] as unknown as Array<BoardCell>

    await act(async () => {
      try {
        await result.current.updateBoardState(invalidBoardState)
      } catch (error) {
        // Expected error
      }
    })

    expect(result.current.error).toBeTruthy()
  })

  it('should handle retry logic for failed fetches', async () => {
    mockSingle
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ 
        data: {
          id: mockBoardId,
          board_state: [generateMockBoardCell()]
        }, 
        error: null 
      })

    const { result } = renderHook(() => useBingoBoard({ boardId: mockBoardId }))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1500)) // Increase timeout for retry
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.board).toBeDefined()
  })

  it('should handle realtime updates correctly', async () => {
    const initialBoard = {
      id: mockBoardId,
      board_state: [generateMockBoardCell()]
    }

    mockSingle.mockResolvedValueOnce({ data: initialBoard, error: null })

    const { result } = renderHook(() => useBingoBoard({ boardId: mockBoardId }))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    // Update channel mock call
    const mockChannel = mockSupabase.channel('test')
    const mockOn = mockChannel.on as jest.Mock
    const channelCallback = mockOn.mock.calls[0]?.[2]
    
    if (!channelCallback) {
      throw new Error('Channel callback not found')
    }

    act(() => {
      channelCallback({
        eventType: 'UPDATE',
        new: {
          ...initialBoard,
          board_state: [generateMockBoardCell({ text: 'Updated via realtime' })]
        }
      })
    })

    const boardState = result.current.board?.board_state
    expect(boardState?.[0]?.text).toBe('Updated via realtime')
  })

  it('should handle batch updates correctly', async () => {
    const mockBoardData = {
      id: mockBoardId,
      board_state: [generateMockBoardCell()]
    }

    // Initial fetch
    mockSingle.mockResolvedValueOnce({ data: mockBoardData, error: null })

    const { result } = renderHook(() => useBingoBoard({ boardId: mockBoardId }))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    const updates = [
      generateMockBoardCell({ text: 'Update 1' }),
      generateMockBoardCell({ text: 'Update 2' }),
      generateMockBoardCell({ text: 'Final Update' })
    ]

    // Mock update responses
    for (const update of updates) {
      mockSingle.mockResolvedValueOnce({ 
        data: { ...mockBoardData, board_state: [update] }, 
        error: null 
      })
    }

    await act(async () => {
      for (const update of updates) {
        await result.current.updateBoardState([update])
      }
    })

    const fromMock = mockSupabase.from as jest.Mock
    expect(fromMock).toHaveBeenCalledWith('bingo_boards')
    expect(result.current.board?.board_state?.[0]?.text).toBe('Final Update')
  })
})

