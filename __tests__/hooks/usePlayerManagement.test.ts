import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { usePlayerManagement } from '@/components/challenges/bingo-board/hooks/usePlayerManagement'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { PLAYER_CONSTANTS } from '@/components/challenges/bingo-board/types/playermanagement.constants'
import type { UsePlayerManagement } from '@/components/challenges/bingo-board/types/playermanagement.types'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

describe('usePlayerManagement', () => {
  const mockSupabase = {
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn()
    }))
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  const addPlayerAndAssert = async (result: { current: UsePlayerManagement }) => {
    await act(async () => {
      result.current.addPlayer()
    })
    
    // Verify player was added
    expect(result.current.players).toHaveLength(1)
    const player = result.current.players[0]
    if (!player) throw new Error('Player was not added')
    return player
  }

  it('should initialize with empty players array', () => {
    const { result } = renderHook(() => usePlayerManagement('test-board'))
    expect(result.current.players).toEqual([])
    expect(result.current.teamNames).toEqual(PLAYER_CONSTANTS.TEAMS.DEFAULT_NAMES)
    expect(result.current.teamColors).toEqual(PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS)
  })

  it('should add player correctly', async () => {
    const { result } = renderHook(() => usePlayerManagement('test-board'))
    const player = await addPlayerAndAssert(result)
    expect(player.name).toBe('Player 1')
  })

  it('should remove player correctly', async () => {
    const { result } = renderHook(() => usePlayerManagement('test-board'))
    await addPlayerAndAssert(result)

    await act(async () => {
      result.current.removePlayer(0)
    })

    expect(result.current.players).toHaveLength(0)
  })

  it('should update player info correctly', async () => {
    const { result } = renderHook(() => usePlayerManagement('test-board'))
    await addPlayerAndAssert(result)

    await act(async () => {
      result.current.updatePlayerInfo(0, 'New Name', 'bg-red-500')
    })

    const player = result.current.players[0]
    if (!player) throw new Error('Player not found')
    
    expect(player.name).toBe('New Name')
    expect(player.color).toBe('bg-red-500')
  })

  it('should switch team correctly', async () => {
    const { result } = renderHook(() => usePlayerManagement('test-board'))
    const player = await addPlayerAndAssert(result)

    await act(async () => {
      result.current.switchTeam(player.id, 1)
    })

    const updatedPlayer = result.current.players[0]
    if (!updatedPlayer) throw new Error('Player not found')
    expect(updatedPlayer.team).toBe(1)
  })

  it('should balance teams correctly', async () => {
    const { result } = renderHook(() => usePlayerManagement('test-board'))

    // Add three players and put them all in team 0
    await act(async () => {
      for (let i = 0; i < 3; i++) {
        result.current.addPlayer()
      }

      const players = result.current.players
      players.forEach(player => {
        if (player) {
          result.current.switchTeam(player.id, 0)
        }
      })
      
      result.current.balanceTeams()
    })

    const team0Count = result.current.players.filter(p => p.team === 0).length
    const team1Count = result.current.players.filter(p => p.team === 1).length
    expect(Math.abs(team0Count - team1Count)).toBeLessThanOrEqual(1)
  })

  // Additional test cases
  it('should handle duplicate player names', async () => {
    const { result } = renderHook(() => usePlayerManagement('test-board'))
    
    await act(async () => {
      result.current.addPlayer()
      result.current.updatePlayerInfo(0, 'Same Name', 'bg-blue-500')
      result.current.addPlayer()
      result.current.updatePlayerInfo(1, 'Same Name', 'bg-red-500')
    })

    const players = result.current.players
    expect(players[0]?.name).not.toBe(players[1]?.name)
  })

  it('should maintain team balance when adding players', async () => {
    const { result } = renderHook(() => usePlayerManagement('test-board'))
    
    await act(async () => {
      for (let i = 0; i < 4; i++) {
        result.current.addPlayer()
      }
    })

    const team0Count = result.current.players.filter(p => p.team === 0).length
    const team1Count = result.current.players.filter(p => p.team === 1).length
    expect(Math.abs(team0Count - team1Count)).toBeLessThanOrEqual(1)
  })

  it('should validate team size limits', async () => {
    const { result } = renderHook(() => usePlayerManagement('test-board'))
    
    await act(async () => {
      // Try to add more players than allowed
      for (let i = 0; i < PLAYER_CONSTANTS.LIMITS.MAX_TEAM_SIZE * 2 + 1; i++) {
        result.current.addPlayer()
      }
    })

    const team0Count = result.current.players.filter(p => p.team === 0).length
    const team1Count = result.current.players.filter(p => p.team === 1).length

    expect(team0Count).toBeLessThanOrEqual(PLAYER_CONSTANTS.LIMITS.MAX_TEAM_SIZE)
    expect(team1Count).toBeLessThanOrEqual(PLAYER_CONSTANTS.LIMITS.MAX_TEAM_SIZE)
  })
})

