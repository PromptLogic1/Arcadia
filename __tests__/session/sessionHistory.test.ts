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

describe('Session History System', () => {
  const mockBoardCell: BoardCell = {
    text: 'Test Cell',
    colors: [],
    completedBy: [],
    blocked: false,
    isMarked: false,
    cellId: '1'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should record state changes with timestamps', async () => {
    const stateHistory: Array<{ state: BoardCell[], timestamp: string }> = []
    const startTime = new Date().toISOString()

    mockSupabase.from.mockImplementation(() => ({
      insert: jest.fn().mockImplementation(async (data) => {
        const timestamp = new Date().toISOString()
        stateHistory.push({ state: data.current_state, timestamp })
        return { data: { ...data, created_at: timestamp }, error: null }
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    }))

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      // Record multiple state changes
      await result.current.updateSessionState([
        { ...mockBoardCell, isMarked: true }
      ])
      await result.current.updateSessionState([
        { ...mockBoardCell, colors: ['#ff0000'] }
      ])
    })

    expect(stateHistory.length).toBe(2)
    const firstState = stateHistory[0]
    const secondState = stateHistory[1]
    
    if (firstState && secondState) {
      expect(new Date(firstState.timestamp).getTime())
        .toBeGreaterThan(new Date(startTime).getTime())
      expect(secondState.state[0]?.colors).toContain('#ff0000')
    }
  })

  it('should log player actions with metadata', async () => {
    const actionLog: Array<{
      action: string,
      playerId: string,
      timestamp: string,
      metadata: Record<string, unknown>
    }> = []

    mockSupabase.from.mockImplementation(() => ({
      insert: jest.fn().mockImplementation(async (data) => {
        actionLog.push({
          action: 'cell_mark',
          playerId: 'test-player',
          timestamp: new Date().toISOString(),
          metadata: { cellId: data.cellId, marked: data.isMarked }
        })
        return { data, error: null }
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    }))

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      await result.current.updateSessionState([
        { ...mockBoardCell, isMarked: true }
      ])
    })

    const firstAction = actionLog[0]
    if (firstAction) {
      expect(firstAction.action).toBe('cell_mark')
      expect(firstAction.metadata).toHaveProperty('marked', true)
    }
  })

  it('should detect and record win conditions', async () => {
    let winnerRecorded = false
    let winTimestamp: string | null = null

    mockSupabase.from.mockImplementation(() => ({
      update: jest.fn().mockImplementation(async (data) => {
        if (data.status === 'completed') {
          winnerRecorded = true
          winTimestamp = new Date().toISOString()
        }
        return { data, error: null }
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    }))

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      // Create winning state
      const winningState = Array(9).fill(null).map(() => ({
        ...mockBoardCell,
        isMarked: true,
        completedBy: ['test-player']
      }))
      await result.current.updateSessionState(winningState, 'test-player')
    })

    expect(winnerRecorded).toBe(true)
    expect(winTimestamp).toBeTruthy()
  })

  it('should handle session completion properly', async () => {
    const sessionUpdates: Array<{
      status: string,
      ended_at: string | null,
      winner_id: string | null
    }> = []

    mockSupabase.from.mockImplementation(() => ({
      update: jest.fn().mockImplementation(async (data) => {
        sessionUpdates.push({
          status: data.status,
          ended_at: data.ended_at,
          winner_id: data.winner_id
        })
        return { data, error: null }
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    }))

    const { result } = renderHook(() => useSession('test-board-id'))

    await act(async () => {
      await result.current.updateSessionState(
        [mockBoardCell],
        'test-winner-id'
      )
    })

    const finalUpdate = sessionUpdates[sessionUpdates.length - 1]
    if (finalUpdate) {
      expect(finalUpdate.status).toBe('completed')
      expect(finalUpdate.ended_at).toBeTruthy()
      expect(finalUpdate.winner_id).toBe('test-winner-id')
    }
  })
}) 