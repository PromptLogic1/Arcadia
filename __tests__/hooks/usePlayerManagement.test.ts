import { renderHook, act } from '@testing-library/react'
import { usePlayerManagement } from '@/components/challenges/bingo-board/hooks/usePlayerManagement'

describe('usePlayerManagement Hook', () => {
  it('should initialize with default players', () => {
    const { result } = renderHook(() => usePlayerManagement())
    expect(result.current.players).toHaveLength(4)
  })

  it('should add players up to limit', () => {
    const { result } = renderHook(() => usePlayerManagement())
    const initialCount = result.current.players.length

    act(() => {
      result.current.addPlayer()
    })

    expect(result.current.players).toHaveLength(Math.min(initialCount + 1, 4))
  })

  it('should update player information', () => {
    const { result } = renderHook(() => usePlayerManagement())

    act(() => {
      result.current.updatePlayerInfo(0, 'New Name', '#00ff00', 2)
    })

    const player = result.current.players[0]
    if (player) {
      expect(player.name).toBe('New Name')
      expect(player.color).toBe('#00ff00')
      expect(player.team).toBe(2)
    }
  })

  it('should remove players correctly', () => {
    const { result } = renderHook(() => usePlayerManagement())
    const initialCount = result.current.players.length

    act(() => {
      result.current.removePlayer(0)
    })

    expect(result.current.players).toHaveLength(initialCount - 1)
  })

  it('should handle team management', () => {
    const { result } = renderHook(() => usePlayerManagement())

    act(() => {
      result.current.updatePlayerInfo(0, 'Player 1', '#ff0000', 1)
      result.current.updatePlayerInfo(1, 'Player 2', '#00ff00', 1)
    })

    expect(result.current.teamNames[1]).toBeDefined()
    const teamOnePlayers = result.current.players.filter(p => p.team === 1)
    expect(teamOnePlayers.length).toBeGreaterThan(0)
  })

  it('should update team names', () => {
    const { result } = renderHook(() => usePlayerManagement())

    act(() => {
      result.current.addPlayer()
      result.current.updatePlayerInfo(0, 'Player 1', '#ff0000', 1)
      result.current.updateTeamName(1, 'New Team Name')
    })

    expect(result.current.teamNames[1]).toBe('New Team Name')
  })

  it('should update team colors', () => {
    const { result } = renderHook(() => usePlayerManagement())

    act(() => {
      result.current.addPlayer()
      result.current.updatePlayerInfo(0, 'Player 1', '#ff0000', 1)
      result.current.updateTeamColor(1, '#0000ff')
    })

    expect(result.current.teamColors[1]).toBe('#0000ff')
  })

  it('should enforce player limit', () => {
    const { result } = renderHook(() => usePlayerManagement())

    act(() => {
      // Try to add more than the limit
      for (let i = 0; i < 9; i++) {
        result.current.addPlayer()
      }
    })

    // Should be limited to 4 players
    expect(result.current.players).toHaveLength(4)
    expect(result.current.players.length).toBeLessThanOrEqual(4)
  })
}) 