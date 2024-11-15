import { renderHook, act } from '@testing-library/react'
import { useSession } from '@/components/challenges/bingo-board/hooks/useSession'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

jest.mock('@supabase/auth-helpers-nextjs')

describe('useSession Error Handling and Recovery', () => {
  const mockBoardId = 'test-board'
  const mockSupabase = {
    from: jest.fn(),
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn()
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should handle and expose errors', async () => {
    const testError = new Error('Test error')
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockRejectedValue(testError)
    })

    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: 'World of Warcraft'
    }))

    // Trigger an error
    await act(async () => {
      await result.current.startSession()
    })

    expect(result.current.error).toBe(testError)
  })

  it('should clear errors', async () => {
    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: 'World of Warcraft'
    }))

    // Set an error and clear it
    await act(async () => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })

  it('should recover state after reconnection', async () => {
    const mockEvents = [
      {
        type: 'start',
        timestamp: Date.now(),
        version: 1
      },
      {
        type: 'cellUpdate',
        timestamp: Date.now() + 1000,
        version: 2,
        cellId: 'cell-1',
        updates: { isMarked: true }
      }
    ]

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: {
          version: 2,
          bingo_session_events: mockEvents
        },
        error: null
      })
    })

    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: 'World of Warcraft'
    }))

    // Trigger reconnection
    await act(async () => {
      await result.current.reconnect()
    })

    expect(result.current.stateVersion).toBe(2)
  })
})
