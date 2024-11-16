import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { usePlayerManagement } from '@/components/challenges/bingo-board/hooks/usePlayerManagement'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { PLAYER_CONSTANTS } from '@/components/challenges/bingo-board/types/playermanagement.constants'
import type { UsePlayerManagement } from '@/components/challenges/bingo-board/types/playermanagement.types'

// Mock hooks
jest.mock('@/components/challenges/bingo-board/hooks/useGameSettings', () => ({
  useGameSettings: jest.fn().mockReturnValue({
    settings: {
      teamMode: true,
      lockout: true,
      soundEnabled: true,
      winConditions: { line: true, majority: false },
      maxPlayerLimit: 8,
      minPlayers: 2,
      defaultPlayerLimit: 4,
      timeLimit: 300000,
      boardSize: 5,
      difficulty: 'medium'
    },
    loading: false,
    error: null
  })
}))

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

// Update mock for useSession to be a function that returns a mock
const mockUpdateSessionPlayers = jest.fn().mockResolvedValue(undefined)
jest.mock('@/components/challenges/bingo-board/hooks/useSession', () => ({
  useSession: () => ({
    updateSessionPlayers: mockUpdateSessionPlayers,
    players: [],
    loading: false,
    error: null
  })
}))

// Mock useGameAnalytics hook
jest.mock('@/components/challenges/bingo-board/hooks/useGameAnalytics', () => ({
  useGameAnalytics: jest.fn().mockReturnValue({
    updateStats: jest.fn(),
    trackMove: jest.fn(),
    gameStats: {
      moves: 0,
      duration: 0,
      winningPlayer: null,
      startTime: null,
      endTime: null,
      playerStats: {},
      performanceMetrics: {}
    }
  })
}))

// Mock usePresence hook
jest.mock('@/components/challenges/bingo-board/hooks/usePresence', () => ({
  usePresence: jest.fn().mockReturnValue({
    presenceState: {},
    error: null,
    getOnlineUsers: jest.fn().mockReturnValue([])
  })
}))

// Add mock for window.dispatchEvent
const mockDispatchEvent = jest.fn()
window.dispatchEvent = mockDispatchEvent

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
    mockDispatchEvent.mockClear()
  })

  afterEach(() => {
    jest.clearAllTimers()
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
      // Force a re-render to ensure state is updated
      result.current.updatePlayerInfo(0, player.name, player.color)
    })

    const updatedPlayer = result.current.players[0]
    if (!updatedPlayer) throw new Error('Player not found')
    expect(updatedPlayer.team).toBe(1)
  })

  it('should balance teams correctly', async () => {
    const { result } = renderHook(() => usePlayerManagement('test-board'))

    await act(async () => {
      // Add three players
      for (let i = 0; i < 3; i++) {
        result.current.addPlayer()
      }

      // Put them all in team 0
      result.current.players.forEach(player => {
        result.current.switchTeam(player.id, 0)
      })
      
      // Balance teams
      result.current.balanceTeams()
    })

    // Allow one tick for state updates
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    const team0Count = result.current.players.filter(p => p.team === 0).length
    const team1Count = result.current.players.filter(p => p.team === 1).length
    expect(Math.abs(team0Count - team1Count)).toBeLessThanOrEqual(1)
  })

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
      // Add players one at a time
      for (let i = 0; i < 4; i++) {
        result.current.addPlayer()
        // Wait for player to be added
        await new Promise(resolve => setTimeout(resolve, 0))
      }

      // Now balance the teams
      result.current.balanceTeams()
      // Wait for balance to complete
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    const team0Count = result.current.players.filter(p => p.team === 0).length
    const team1Count = result.current.players.filter(p => p.team === 1).length
    expect(Math.abs(team0Count - team1Count)).toBeLessThanOrEqual(1)
  })

  it('should validate team size limits', async () => {
    const { result } = renderHook(() => usePlayerManagement('test-board'))
    
    await act(async () => {
      // Add players one at a time and explicitly assign teams
      for (let i = 0; i < PLAYER_CONSTANTS.LIMITS.MAX_TEAM_SIZE; i++) {
        result.current.addPlayer()
        await new Promise(resolve => setTimeout(resolve, 0))
        
        // Get the latest player and assign to team 0
        const players = result.current.players
        const lastPlayer = players[players.length - 1]
        if (lastPlayer) {
          result.current.switchTeam(lastPlayer.id, 0)
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }

      // Add more players and assign to team 1
      for (let i = 0; i < PLAYER_CONSTANTS.LIMITS.MAX_TEAM_SIZE; i++) {
        result.current.addPlayer()
        await new Promise(resolve => setTimeout(resolve, 0))
        
        // Get the latest player and assign to team 1
        const players = result.current.players
        const lastPlayer = players[players.length - 1]
        if (lastPlayer) {
          result.current.switchTeam(lastPlayer.id, 1)
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }

      // Try to add one more player - should be rejected
      result.current.addPlayer()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Try to force balance - shouldn't change team sizes
      result.current.balanceTeams()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    // Get final team counts
    const team0Count = result.current.players.filter(p => p.team === 0).length
    const team1Count = result.current.players.filter(p => p.team === 1).length

    // Verify team sizes don't exceed limits
    expect(team0Count).toBeLessThanOrEqual(PLAYER_CONSTANTS.LIMITS.MAX_TEAM_SIZE)
    expect(team1Count).toBeLessThanOrEqual(PLAYER_CONSTANTS.LIMITS.MAX_TEAM_SIZE)
    
    // Verify total players don't exceed max allowed
    expect(result.current.players.length).toBeLessThanOrEqual(PLAYER_CONSTANTS.LIMITS.MAX_TEAM_SIZE * 2)
  })

  // Add test for event emission
  it('should emit player events correctly', async () => {
    const { result } = renderHook(() => usePlayerManagement('test-board'))
    
    await act(async () => {
      result.current.addPlayer()
    })

    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'playerManagement',
        detail: expect.objectContaining({
          type: PLAYER_CONSTANTS.EVENTS.PLAYER_JOIN
        })
      })
    )
  })

  // Add test for session integration
  it('should sync with session when players change', async () => {
    const { result } = renderHook(() => usePlayerManagement('test-board'))
    
    await act(async () => {
      result.current.addPlayer()
    })

    expect(mockUpdateSessionPlayers).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Player 1'
        })
      ])
    )
  })
})

