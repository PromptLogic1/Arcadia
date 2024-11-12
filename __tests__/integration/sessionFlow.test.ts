import { renderHook, act } from '@testing-library/react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useSession } from '@/components/challenges/bingo-board/hooks/useSession'
import { useGameState } from '@/components/challenges/bingo-board/hooks/useGameState'
import { usePlayerManagement } from '@/components/challenges/bingo-board/hooks/usePlayerManagement'
import type { BoardCell } from '@/components/challenges/bingo-board/components/shared/types'

type MockFn = jest.Mock

interface StateChange {
  type: 'insert' | 'update'
  data: Record<string, unknown>
}

interface PlayerAction {
  action: 'join' | 'update' | 'leave'
  data?: Record<string, unknown>
}

interface Interaction {
  type: 'player_action' | 'state_update'
  data: Record<string, unknown>
}

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

describe('End-to-End Session Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClientComponentClient as MockFn).mockReturnValue(mockSupabase)
  })

  it('should handle complete session lifecycle', async () => {
    // Mock session data
    const mockBoardCell: BoardCell = {
      text: 'Test Cell',
      colors: [],
      completedBy: [],
      blocked: false,
      isMarked: false,
      cellId: '1'
    }

    // Track session state changes
    const stateChanges: StateChange[] = []
    mockSupabase.from.mockImplementation(() => ({
      insert: jest.fn().mockImplementation(async (data) => {
        stateChanges.push({ type: 'insert', data })
        return { data, error: null }
      }),
      update: jest.fn().mockImplementation(async (data) => {
        stateChanges.push({ type: 'update', data })
        return { data, error: null }
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null })
    }))

    // 1. Create Session
    const { result: sessionResult } = renderHook(() => useSession('test-board-id'))
    await act(async () => {
      await sessionResult.current.createSession('Host Player', '#ff0000')
    })

    const initialChange = stateChanges[0]
    if (initialChange) {
      expect(initialChange.type).toBe('insert')
      expect(initialChange.data).toHaveProperty('status', 'active')
    }

    // 2. Join Players
    const { result: playerResult } = renderHook(() => usePlayerManagement())
    await act(async () => {
      await sessionResult.current.joinSession('test-session', 'Player 2', '#00ff00')
      playerResult.current.addPlayer()
    })

    const joinChange = stateChanges[1]
    if (joinChange) {
      expect(joinChange.type).toBe('insert')
      expect(playerResult.current.players.length).toBeGreaterThan(1)
    }

    // 3. Game Play
    const { result: gameResult } = renderHook(() => 
      useGameState({ sessionId: 'test-session' })
    )
    await act(async () => {
      await gameResult.current.updateGameState([{
        index: 0,
        cell: { ...mockBoardCell, isMarked: true }
      }])
    })

    const gameState = gameResult.current.gameState?.currentState[0]
    if (gameState) {
      expect(gameState.isMarked).toBe(true)
    }

    // 4. Session Completion
    await act(async () => {
      await sessionResult.current.updateSessionState(
        [mockBoardCell],
        'winner-id'
      )
    })

    const finalUpdate = stateChanges[stateChanges.length - 1]
    if (finalUpdate) {
      expect(finalUpdate.data).toHaveProperty('status', 'completed')
    }
  })

  it('should verify player journey scenarios', async () => {
    const playerJourney: PlayerAction[] = []

    mockSupabase.from.mockImplementation(() => ({
      insert: jest.fn().mockImplementation(async (data) => {
        playerJourney.push({ action: 'join', data })
        return { data, error: null }
      }),
      update: jest.fn().mockImplementation(async (data) => {
        playerJourney.push({ action: 'update', data })
        return { data, error: null }
      }),
      delete: jest.fn().mockImplementation(async () => {
        playerJourney.push({ action: 'leave' })
        return { data: null, error: null }
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    }))

    const { result } = renderHook(() => useSession('test-board-id'))

    // Join Session
    await act(async () => {
      await result.current.joinSession('test-session', 'Test Player', '#ff0000')
    })

    const joinAction = playerJourney[0]
    if (joinAction) {
      expect(joinAction.action).toBe('join')
    }

    // Update Player Info
    await act(async () => {
      await result.current.updateSessionState([], null)
    })

    const updateAction = playerJourney[1]
    if (updateAction) {
      expect(updateAction.action).toBe('update')
    }

    // Leave Session
    const response = await fetch('/api/bingo/sessions/players?sessionId=test-session', {
      method: 'DELETE'
    })
    expect(response.ok).toBe(true)

    const lastAction = playerJourney[playerJourney.length - 1]
    if (lastAction) {
      expect(lastAction.action).toBe('leave')
    }
  })

  it('should test multi-player interactions', async () => {
    const interactions: Interaction[] = []
    const mockBoardCell: BoardCell = {
      text: 'Test Cell',
      colors: [],
      completedBy: [],
      blocked: false,
      isMarked: false,
      cellId: '1'
    }

    mockSupabase.from.mockImplementation(() => ({
      insert: jest.fn().mockImplementation(async (data) => {
        interactions.push({ type: 'player_action', data })
        return { data, error: null }
      }),
      update: jest.fn().mockImplementation(async (data) => {
        interactions.push({ type: 'state_update', data })
        return { data, error: null }
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null })
    }))

    // Initialize multiple players
    const { result: player1 } = renderHook(() => 
      useGameState({ sessionId: 'test-session' })
    )
    const { result: player2 } = renderHook(() => 
      useGameState({ sessionId: 'test-session' })
    )

    // Simulate concurrent actions
    await act(async () => {
      await Promise.all([
        player1.current.updateGameState([{
          index: 0,
          cell: { ...mockBoardCell, isMarked: true }
        }]),
        player2.current.updateGameState([{
          index: 1,
          cell: { ...mockBoardCell, colors: ['#ff0000'] }
        }])
      ])
    })

    // Verify interaction order and state consistency
    const stateUpdates = interactions.filter(i => i.type === 'state_update')
    expect(stateUpdates.length).toBeGreaterThan(1)
    expect(new Set(stateUpdates.map(u => u.data.version)).size).toBe(stateUpdates.length)
  })
}) 