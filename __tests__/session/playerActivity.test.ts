import { renderHook, act } from '@testing-library/react'
import { useSession } from '@/components/challenges/bingo-board/hooks/useSession'
import type { BoardCell } from '@/components/challenges/bingo-board/components/shared/types'

// Mock types
type MockFn = jest.Mock

// Mock Supabase client
const mockSupabase = {
  from: jest.fn() as MockFn,
  auth: {
    getUser: jest.fn() as MockFn
  },
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis() as MockFn,
    subscribe: jest.fn() as MockFn
  })) as MockFn,
  removeChannel: jest.fn() as MockFn
}

describe('Player Activity System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should track player connections', async () => {
    const connectionLog: Array<{
      playerId: string,
      status: 'connected' | 'disconnected',
      timestamp: string
    }> = []

    mockSupabase.from.mockImplementation(() => ({
      update: jest.fn().mockImplementation(async (data) => {
        connectionLog.push({
          playerId: data.user_id,
          status: 'connected',
          timestamp: new Date().toISOString()
        })
        return { data, error: null }
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    }))

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      await result.current.joinSession('test-session', 'Player 1', '#ff0000')
    })

    const firstLog = connectionLog[0]
    if (firstLog) {
      expect(firstLog.status).toBe('connected')
      expect(firstLog.playerId).toBeTruthy()
    }
  })

  it('should handle disconnections gracefully', async () => {
    const disconnectionHandled = jest.fn()
    let lastActiveTimestamp: string | null = null

    mockSupabase.from.mockImplementation(() => ({
      update: jest.fn().mockImplementation(async (data) => {
        if (data.status === 'disconnected') {
          disconnectionHandled()
          lastActiveTimestamp = data.last_active_at
        }
        return { data, error: null }
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    }))

    const { result, unmount } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      await result.current.joinSession('test-session', 'Player 1', '#ff0000')
    })

    unmount() // Simulate disconnection

    expect(disconnectionHandled).toHaveBeenCalled()
    expect(lastActiveTimestamp).toBeTruthy()
  })

  it('should handle reconnection process', async () => {
    const stateSync = jest.fn()
    const reconnectionLog: Array<{
      playerId: string,
      timestamp: string,
      syncedState: boolean
    }> = []

    mockSupabase.from.mockImplementation(() => ({
      update: jest.fn().mockImplementation(async (data) => {
        if (data.status === 'connected') {
          reconnectionLog.push({
            playerId: data.user_id,
            timestamp: new Date().toISOString(),
            syncedState: true
          })
          stateSync()
        }
        return { data, error: null }
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    }))

    const { result, rerender } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      await result.current.joinSession('test-session', 'Player 1', '#ff0000')
    })

    // Simulate reconnection
    rerender()

    expect(stateSync).toHaveBeenCalled()
    const firstReconnection = reconnectionLog[0]
    if (firstReconnection) {
      expect(firstReconnection.syncedState).toBe(true)
    }
  })

  it('should update last_active timestamp', async () => {
    const activityTimestamps: string[] = []

    mockSupabase.from.mockImplementation(() => ({
      update: jest.fn().mockImplementation(async (data) => {
        if (data.last_active_at) {
          activityTimestamps.push(data.last_active_at)
        }
        return { data, error: null }
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    }))

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      // Simulate multiple actions
      await result.current.joinSession('test-session', 'Player 1', '#ff0000')
      await result.current.updateSessionState([{ text: 'Update 1' } as BoardCell])
      await result.current.updateSessionState([{ text: 'Update 2' } as BoardCell])
    })

    expect(activityTimestamps.length).toBeGreaterThan(1)
    activityTimestamps.reduce((prev, curr) => {
      const prevDate = new Date(prev).getTime()
      const currDate = new Date(curr).getTime()
      expect(currDate).toBeGreaterThanOrEqual(prevDate)
      return curr
    })
  })
}) 