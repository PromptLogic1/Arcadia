import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useBingoBoard } from '@/components/challenges/bingo-board/hooks/useBingoBoard'
import { generateMockBoardCell } from '../utils/test-utils'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ERROR_MESSAGES } from '@/components/challenges/bingo-board/types/bingoboard.constants'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

// Mock useTransition
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useTransition: () => [false, (cb: () => void) => cb()]
}))

describe('useBingoBoard', () => {
  const mockBoardId = 'test-board-id'
  let mockSupabase: ReturnType<typeof mockSupabaseClient>

  // Helper function to wait for state updates
  const waitForNextTick = () => act(() => Promise.resolve())

  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase = mockSupabaseClient()
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should initialize with loading state', async () => {
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

    mockSupabase.from().select().eq().single.mockResolvedValueOnce({ 
      data: mockBoardData, 
      error: null 
    })

    const { result } = renderHook(() => useBingoBoard({ boardId: mockBoardId }))
    
    await waitForNextTick()

    expect(result.current.loading).toBe(false)
    expect(result.current.board).toEqual(mockBoardData)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors', async () => {
    mockSupabase.from().select().eq().single.mockRejectedValueOnce(
      new Error(ERROR_MESSAGES.NETWORK_ERROR)
    )

    const { result } = renderHook(() => useBingoBoard({ boardId: mockBoardId }))
    
    await waitForNextTick()

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

    mockSupabase.from().select().eq().single
      .mockResolvedValueOnce({ data: mockBoardData, error: null })
      .mockResolvedValueOnce({ data: mockBoardData, error: null })

    const { result } = renderHook(() => useBingoBoard({ boardId: mockBoardId }))
    
    await waitForNextTick()

    const newBoardState = [generateMockBoardCell({ text: 'Updated Cell' })]
    
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

    mockSupabase.from().select().eq().single
      .mockResolvedValueOnce({ data: initialBoardData, error: null })
      .mockRejectedValueOnce(new Error('Update failed'))

    const { result } = renderHook(() => useBingoBoard({ boardId: mockBoardId }))
    
    await waitForNextTick()

    const initialState = result.current.board?.board_state

    await act(async () => {
      try {
        await result.current.updateBoardState([generateMockBoardCell({ text: 'Failed Update' })])
      } catch (error) {
        // Expected error
      }
    })

    expect(result.current.board?.board_state).toEqual(initialState)
    expect(result.current.error).toBeTruthy()
  })

  it('should handle realtime updates correctly', async () => {
    const { result } = renderHook(() => useBingoBoard({ boardId: mockBoardId }))
    
    await waitForNextTick()

    const updatedCell = generateMockBoardCell({ text: 'Realtime Update' })

    await act(async () => {
      const channel = mockSupabase.channel()
      const onCallback = channel.on.mock.calls[0]?.[2]
      
      if (onCallback) {
        onCallback({
          payload: {
            board_state: [updatedCell]
          }
        })
      }
    })

    expect(result.current.board?.board_state?.[0]?.text).toBe('Realtime Update')
  })

  it('should cleanup on unmount', async () => {
    const { unmount } = renderHook(() => useBingoBoard({ boardId: mockBoardId }))
    
    await waitForNextTick()
    unmount()

    expect(mockSupabase.removeChannel).toHaveBeenCalled()
  })
})

// Helper function to create mock Supabase client
const mockSupabaseClient = () => ({
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn()
  })),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn()
  })),
  removeChannel: jest.fn()
})

