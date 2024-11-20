import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { usePlayerManagement } from '@/components/challenges/bingo-board/hooks/usePlayerManagement'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { PLAYER_CONSTANTS } from '@/components/challenges/bingo-board/types/playermanagement.constants'

// Mock hooks
jest.mock('@/components/challenges/bingo-board/hooks/useGameSettings', () => ({
  useGameSettings: jest.fn().mockReturnValue({
    settings: {
      teamMode: true,
      lockout: true,
      maxPlayerLimit: 8,
      minPlayers: 2,
      defaultPlayerLimit: 4
    },
    loading: false,
    error: null
  })
}))

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

// Mock updateSessionPlayers
const mockUpdateSessionPlayers = jest.fn().mockResolvedValue(undefined)
jest.mock('@/components/challenges/bingo-board/hooks/useSession', () => ({
  useSession: () => ({
    updateSessionPlayers: mockUpdateSessionPlayers,
    players: [],
    loading: false,
    error: null
  })
}))

// Mock window.dispatchEvent
const mockDispatchEvent = jest.fn()
window.dispatchEvent = mockDispatchEvent

describe('usePlayerManagement', () => {
  const mockBoardId = 'test-board'
  let mockSupabase: ReturnType<typeof mockSupabaseClient>

  // Helper function to wait for state updates
  const waitForNextTick = () => act(() => Promise.resolve())

  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase = mockSupabaseClient()
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
    mockDispatchEvent.mockClear()
  })

  it('should initialize with empty players array', () => {
    const { result } = renderHook(() => usePlayerManagement(mockBoardId))
    expect(result.current.players).toEqual([])
    expect(result.current.teamNames).toEqual(PLAYER_CONSTANTS.TEAMS.DEFAULT_NAMES)
    expect(result.current.teamColors).toEqual(PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS)
  })

  it('should add player correctly', async () => {
    const { result } = renderHook(() => usePlayerManagement(mockBoardId))
    
    await act(async () => {
      await result.current.addPlayer()
      await waitForNextTick()
    })

    expect(result.current.players).toHaveLength(1)
    expect(result.current.players[0]?.name).toBe('Player 1')
  })

  it('should balance teams correctly', async () => {
    const { result } = renderHook(() => usePlayerManagement(mockBoardId))

    await act(async () => {
      // Add three players
      for (let i = 0; i < 3; i++) {
        await result.current.addPlayer()
        await waitForNextTick()
      }

      // Put them all in team 0
      for (const player of result.current.players) {
        await result.current.switchTeam(player.id, 0)
        await waitForNextTick()
      }

      // Balance teams
      await result.current.balanceTeams()
      await waitForNextTick()
    })

    const team0Count = result.current.players.filter(p => p.team === 0).length
    const team1Count = result.current.players.filter(p => p.team === 1).length
    expect(Math.abs(team0Count - team1Count)).toBeLessThanOrEqual(1)
  })

  it('should handle duplicate player names', async () => {
    const { result } = renderHook(() => usePlayerManagement(mockBoardId))
    
    await act(async () => {
      await result.current.addPlayer()
      await result.current.updatePlayerInfo(0, 'Same Name', 'bg-blue-500')
      await result.current.addPlayer()
      await result.current.updatePlayerInfo(1, 'Same Name', 'bg-red-500')
      await waitForNextTick()
    })

    const players = result.current.players
    expect(players[0]?.name).not.toBe(players[1]?.name)
  })

  it('should maintain team balance when adding players', async () => {
    const { result } = renderHook(() => usePlayerManagement(mockBoardId))
    
    await act(async () => {
      // Add players one at a time
      for (let i = 0; i < 4; i++) {
        await result.current.addPlayer()
        await waitForNextTick()
      }

      await result.current.balanceTeams()
      await waitForNextTick()
    })

    const team0Count = result.current.players.filter(p => p.team === 0).length
    const team1Count = result.current.players.filter(p => p.team === 1).length
    expect(Math.abs(team0Count - team1Count)).toBeLessThanOrEqual(1)
  })

  it('should validate team size limits', async () => {
    const { result } = renderHook(() => usePlayerManagement(mockBoardId))
    
    await act(async () => {
      // Add max players for team 0
      for (let i = 0; i < PLAYER_CONSTANTS.LIMITS.MAX_TEAM_SIZE; i++) {
        await result.current.addPlayer()
        const players = result.current.players
        const lastPlayer = players[players.length - 1]
        if (lastPlayer) {
          await result.current.switchTeam(lastPlayer.id, 0)
        }
        await waitForNextTick()
      }
    })

    const team0Count = result.current.players.filter(p => p.team === 0).length
    expect(team0Count).toBeLessThanOrEqual(PLAYER_CONSTANTS.LIMITS.MAX_TEAM_SIZE)
  })

  it('should emit player events correctly', async () => {
    const { result } = renderHook(() => usePlayerManagement(mockBoardId))
    
    await act(async () => {
      await result.current.addPlayer()
      await waitForNextTick()
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

  it('should sync with session when players change', async () => {
    const { result } = renderHook(() => usePlayerManagement(mockBoardId))
    
    await act(async () => {
      await result.current.addPlayer()
      await waitForNextTick()
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

