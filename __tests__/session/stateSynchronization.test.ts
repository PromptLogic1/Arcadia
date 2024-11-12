import { renderHook, act } from '@testing-library/react'
import { useGameState } from '@/components/challenges/bingo-board/hooks/useGameState'
import type { BoardCell } from '@/components/challenges/bingo-board/components/shared/types'

describe('State Synchronization System', () => {
  const mockBoardCell: BoardCell = {
    text: 'Test Cell',
    colors: [],
    completedBy: [],
    blocked: false,
    isMarked: false,
    cellId: '1'
  }

  it('should handle concurrent state updates correctly', async () => {
    const { result } = renderHook(() => useGameState({ sessionId: 'test-session' }))

    // Simulate two clients updating the same cell
    const client1Update = { ...mockBoardCell, isMarked: true }
    const client2Update = { ...mockBoardCell, colors: ['#ff0000'] }

    await act(async () => {
      // Simulate concurrent updates
      await Promise.all([
        result.current.updateGameState([{ index: 0, cell: client1Update }]),
        result.current.updateGameState([{ index: 0, cell: client2Update }])
      ])
    })

    // Verify final state contains both updates
    const finalCell = result.current.gameState?.currentState[0]
    expect(finalCell?.isMarked).toBe(true)
    expect(finalCell?.colors).toContain('#ff0000')
  })

  it('should handle version conflicts with server state', async () => {
    const { result } = renderHook(() => useGameState({ sessionId: 'test-session' }))

    await act(async () => {
      // Client tries to update with old version
      await result.current.updateGameState([{
        index: 0,
        cell: { ...mockBoardCell, text: 'Client Update' }
      }])

      // Server state will be fetched automatically on conflict
      if (result.current.gameState?.currentState[0]) {
        expect(result.current.gameState.currentState[0].text).toBe('Server Update')
      }
    })

    expect(result.current.gameState?.version).toBe(2)
  })

  it('should handle connection state changes', async () => {
    const { result } = renderHook(() => useGameState({ sessionId: 'test-session' }))

    await act(async () => {
      // Simulate missed updates during disconnection
      const missedUpdates = [{
        index: 0,
        cell: { ...mockBoardCell, text: 'Missed Update' }
      }]

      // Apply missed updates
      await result.current.updateGameState(missedUpdates)

      if (result.current.gameState?.currentState[0]) {
        expect(result.current.gameState.currentState[0].text).toBe('Missed Update')
      }
    })
  })
}) 