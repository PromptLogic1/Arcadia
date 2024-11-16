import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useSessionQueue } from '@/components/challenges/bingo-board/hooks/useSessionQueue'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { QueueEntry } from '@/components/challenges/bingo-board/types/sessionqueue.types'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

describe('useSessionQueue', () => {
  const mockSessionId = 'test-session-id'
  const mockUser = { id: 'test-user', email: 'test@example.com' }
  
  const mockSupabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
    },
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      delete: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockResolvedValue({ data: null, error: null })
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should initialize with empty queue', () => {
    const { result } = renderHook(() => useSessionQueue(mockSessionId))
    expect(result.current.queueEntries).toEqual([])
    expect(result.current.isProcessing).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should add player to queue', async () => {
    const { result } = renderHook(() => useSessionQueue(mockSessionId))
    const mockPlayer = { name: 'Test Player', color: 'bg-blue-500' }

    mockSupabase.from().insert.mockResolvedValueOnce({
      data: {
        id: 'queue-1',
        session_id: mockSessionId,
        user_id: mockUser.id,
        player_name: mockPlayer.name,
        color: mockPlayer.color,
        status: 'pending',
        requested_at: expect.any(String)
      },
      error: null
    })

    await act(async () => {
      await result.current.addToQueue(mockPlayer)
    })

    const firstEntry = result.current.queueEntries[0]
    expect(result.current.queueEntries).toHaveLength(1)
    expect(firstEntry?.playerName).toBe(mockPlayer.name)
  })

  it('should remove player from queue', async () => {
    const { result } = renderHook(() => useSessionQueue(mockSessionId))
    const mockEntry: QueueEntry = {
      id: 'queue-1',
      sessionId: mockSessionId,
      userId: mockUser.id,
      playerName: 'Test Player',
      color: 'bg-blue-500',
      status: 'pending',
      requestedAt: new Date().toISOString(),
      position: 0
    }

    // First add the entry
    await act(async () => {
      result.current.queueEntries = [mockEntry]
    })

    await act(async () => {
      await result.current.removeFromQueue(mockEntry.id)
    })

    expect(result.current.queueEntries).toHaveLength(0)
  })

  it('should process queue entries', async () => {
    const { result } = renderHook(() => useSessionQueue(mockSessionId))
    const mockEntries: QueueEntry[] = [
      {
        id: 'queue-1',
        sessionId: mockSessionId,
        userId: mockUser.id,
        playerName: 'Test Player 1',
        color: 'bg-blue-500',
        status: 'pending',
        requestedAt: new Date().toISOString(),
        position: 0
      },
      {
        id: 'queue-2',
        sessionId: mockSessionId,
        userId: 'user-2',
        playerName: 'Test Player 2',
        color: 'bg-red-500',
        status: 'pending',
        requestedAt: new Date().toISOString(),
        position: 1
      }
    ]

    await act(async () => {
      result.current.queueEntries = mockEntries
      await result.current.processQueue()
    })

    expect(mockSupabase.from().update).toHaveBeenCalled()
  })

  it('should handle queue position updates', async () => {
    const { result } = renderHook(() => useSessionQueue(mockSessionId))
    const mockEntry: QueueEntry = {
      id: 'queue-1',
      sessionId: mockSessionId,
      userId: mockUser.id,
      playerName: 'Test Player',
      color: 'bg-blue-500',
      status: 'pending',
      requestedAt: new Date().toISOString(),
      position: 0
    }

    await act(async () => {
      result.current.queueEntries = [mockEntry]
      await result.current.updateQueuePosition(mockEntry.id, 1)
    })

    const updatedEntry = result.current.queueEntries[0]
    expect(updatedEntry?.position).toBe(1)
  })

  it('should validate queue size', () => {
    const { result } = renderHook(() => useSessionQueue(mockSessionId))
    
    expect(result.current.validateQueueSize()).toBe(true)

    // Add max number of entries
    act(() => {
      result.current.queueEntries = Array(8).fill(null).map((_, i) => ({
        id: `queue-${i}`,
        sessionId: mockSessionId,
        userId: `user-${i}`,
        playerName: `Test Player ${i}`,
        color: 'bg-blue-500',
        status: 'pending',
        requestedAt: new Date().toISOString(),
        position: i
      }))
    })

    expect(result.current.validateQueueSize()).toBe(false)
  })

  it('should cleanup expired queue entries', async () => {
    const { result } = renderHook(() => useSessionQueue(mockSessionId))
    const oldDate = new Date()
    oldDate.setMinutes(oldDate.getMinutes() - 10)

    const mockEntries: QueueEntry[] = [
      {
        id: 'queue-1',
        sessionId: mockSessionId,
        userId: mockUser.id,
        playerName: 'Test Player',
        color: 'bg-blue-500',
        status: 'approved',
        requestedAt: oldDate.toISOString(),
        position: 0
      }
    ]

    await act(async () => {
      result.current.queueEntries = mockEntries
      await result.current.cleanupQueue()
    })

    expect(mockSupabase.from().delete).toHaveBeenCalled()
  })

  it('should handle errors gracefully', async () => {
    const { result } = renderHook(() => useSessionQueue(mockSessionId))
    const mockPlayer = { name: 'Test Player', color: 'bg-blue-500' }

    mockSupabase.from().insert.mockRejectedValueOnce(new Error('Insert failed'))

    await act(async () => {
      try {
        await result.current.addToQueue(mockPlayer)
      } catch (error) {
        // Error should be caught
      }
    })

    expect(result.current.error).toBeTruthy()
  })

  it('should handle queue priority ordering', async () => {
    const { result } = renderHook(() => useSessionQueue(mockSessionId))
    const mockEntries: QueueEntry[] = [
      {
        id: 'queue-1',
        sessionId: mockSessionId,
        userId: mockUser.id,
        playerName: 'VIP Player',
        color: 'bg-blue-500',
        status: 'pending',
        requestedAt: new Date().toISOString(),
        position: 0,
        priority: 'high'
      },
      {
        id: 'queue-2',
        sessionId: mockSessionId,
        userId: 'user-2',
        playerName: 'Regular Player',
        color: 'bg-red-500',
        status: 'pending',
        requestedAt: new Date().toISOString(),
        position: 1,
        priority: 'normal'
      }
    ]

    await act(async () => {
      result.current.queueEntries = mockEntries
      await result.current.processQueue()
    })

    expect(mockSupabase.from().update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved'
      }),
      expect.objectContaining({
        id: 'queue-1'
      })
    )
  })

  it('should handle concurrent queue operations', async () => {
    const { result } = renderHook(() => useSessionQueue(mockSessionId))
    
    // Simulate concurrent add operations
    const operations = [
      result.current.addToQueue({ name: 'Player 1', color: 'bg-blue-500' }),
      result.current.addToQueue({ name: 'Player 2', color: 'bg-red-500' }),
      result.current.addToQueue({ name: 'Player 3', color: 'bg-green-500' })
    ]

    await act(async () => {
      await Promise.all(operations)
    })

    // Should maintain order and handle concurrency
    expect(result.current.queueEntries.map(e => e.position)).toEqual([0, 1, 2])
  })

  it('should persist queue state', async () => {
    const { result, rerender } = renderHook(() => useSessionQueue(mockSessionId))
    
    const mockEntry: QueueEntry = {
      id: 'queue-1',
      sessionId: mockSessionId,
      userId: mockUser.id,
      playerName: 'Test Player',
      color: 'bg-blue-500',
      status: 'pending',
      requestedAt: new Date().toISOString(),
      position: 0
    }

    await act(async () => {
      result.current.queueEntries = [mockEntry]
    })

    // Simulate component rerender
    rerender()

    expect(result.current.queueEntries).toHaveLength(1)
    expect(result.current.queueEntries[0]?.id).toBe(mockEntry.id)
  })

  it('should enforce maximum queue size', async () => {
    const { result } = renderHook(() => useSessionQueue(mockSessionId))
    
    // Fill queue to maximum
    await act(async () => {
      for (let i = 0; i < 8; i++) {
        await result.current.addToQueue({
          name: `Player ${i}`,
          color: 'bg-blue-500'
        })
      }
    })

    // Attempt to add one more player
    await act(async () => {
      try {
        await result.current.addToQueue({
          name: 'Extra Player',
          color: 'bg-red-500'
        })
      } catch (error) {
        expect(error).toBeTruthy()
      }
    })

    expect(result.current.queueEntries).toHaveLength(8)
  })

  it('should handle queue entry expiration', async () => {
    jest.useFakeTimers()
    const { result } = renderHook(() => useSessionQueue(mockSessionId))
    
    const oldDate = new Date()
    oldDate.setMinutes(oldDate.getMinutes() - 6) // Older than 5 minutes

    const mockEntry: QueueEntry = {
      id: 'queue-1',
      sessionId: mockSessionId,
      userId: mockUser.id,
      playerName: 'Test Player',
      color: 'bg-blue-500',
      status: 'pending',
      requestedAt: oldDate.toISOString(),
      position: 0
    }

    await act(async () => {
      result.current.queueEntries = [mockEntry]
      jest.advanceTimersByTime(5 * 60 * 1000 + 1000) // 5 minutes + 1 second
      await result.current.cleanupQueue()
    })

    expect(result.current.queueEntries).toHaveLength(0)
    jest.useRealTimers()
  })

  it('should handle queue state recovery', async () => {
    const { result } = renderHook(() => useSessionQueue(mockSessionId))
    
    mockSupabase.from().select.mockResolvedValueOnce({
      data: [{
        id: 'queue-1',
        session_id: mockSessionId,
        user_id: mockUser.id,
        player_name: 'Test Player',
        color: 'bg-blue-500',
        status: 'pending',
        requested_at: new Date().toISOString()
      }],
      error: null
    })

    await act(async () => {
      await result.current.reconnect()
    })

    expect(result.current.queueEntries).toHaveLength(1)
  })

  it('should handle queue entry updates', async () => {
    const { result } = renderHook(() => useSessionQueue(mockSessionId))
    
    const mockEntry: QueueEntry = {
      id: 'queue-1',
      sessionId: mockSessionId,
      userId: mockUser.id,
      playerName: 'Test Player',
      color: 'bg-blue-500',
      status: 'pending',
      requestedAt: new Date().toISOString(),
      position: 0
    }

    await act(async () => {
      result.current.queueEntries = [mockEntry]
      await result.current.updateQueueEntry(mockEntry.id, {
        status: 'approved',
        position: 1
      })
    })

    const updatedEntry = result.current.queueEntries[0]
    expect(updatedEntry?.status).toBe('approved')
    expect(updatedEntry?.position).toBe(1)
  })

  it('should emit queue events', () => {
    const dispatchEvent = jest.spyOn(window, 'dispatchEvent')
    const { result } = renderHook(() => useSessionQueue(mockSessionId))
    
    act(() => {
      result.current.addToQueue({
        name: 'Test Player',
        color: 'bg-blue-500'
      })
    })

    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'queueUpdate'
      })
    )
  })
})

