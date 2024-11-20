'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Player } from '../types/types'
import type { PlayerEvent } from '../types/playermanagement.types'
import { PLAYER_CONSTANTS } from '../types/playermanagement.constants'
import { useSession } from './useSession'
import { useGameAnalytics } from './useGameAnalytics'
import { useGameSettings } from './useGameSettings'
import { usePresence } from './usePresence'

export interface UsePlayerManagementReturn {
  players: Player[]
  teamNames: [string, string]
  teamColors: [string, string]
  currentPlayer: number
  addPlayer: () => void
  removePlayer: (index: number) => void
  updatePlayerInfo: (index: number, name: string, color: string, team?: number) => void
  switchTeam: (playerId: string, newTeam: number) => void
  updateTeamName: (index: number, name: string) => void
  updateTeamColor: (index: number, color: string) => void
  balanceTeams: () => void
  validateTeamSize: () => boolean
}

export const usePlayerManagement = (boardId: string): UsePlayerManagementReturn => {
  // States
  const [players, setPlayers] = useState<Player[]>(() => {
    // Initialize with 2 players by default
    return [
      {
        id: `player-${Date.now()}`,
        name: 'Player 1',
        color: PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS[0],
        hoverColor: `hover:${PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS[0].replace('bg-', '')}`,
        team: 0
      },
      {
        id: `player-${Date.now() + 1}`,
        name: 'Player 2',
        color: PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS[1],
        hoverColor: `hover:${PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS[1].replace('bg-', '')}`,
        team: 1
      }
    ]
  })
  const [teamNames, setTeamNames] = useState<[string, string]>(PLAYER_CONSTANTS.TEAMS.DEFAULT_NAMES)
  const [teamColors, setTeamColors] = useState<[string, string]>(PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS)
  const [_currentPlayer, _setCurrentPlayer] = useState<number>(0)

  // Hook Integration
  const { updateStats: _updateStats, trackMove } = useGameAnalytics()
  const { settings } = useGameSettings(boardId)
  const session = useSession({ 
    boardId, 
    _game: 'All Games', 
    initialPlayers: players 
  }) as { updateSessionPlayers?: (players: Player[]) => Promise<void> }
  const { presenceState } = usePresence(boardId)

  // Event Emitter
  const emitPlayerEvent = useCallback((event: PlayerEvent) => {
    try {
      const customEvent = new CustomEvent('playerManagement', {
        detail: event,
        bubbles: true
      })
      window.dispatchEvent(customEvent)
      
      if (event.type === 'teamChange') {
        trackMove(event.playerId, 'team_switch', event.newTeam)
      }
    } catch (error) {
      console.error('Error emitting player event:', error)
    }
  }, [trackMove])

  // Helper Functions
  const getTeamSizes = useCallback((currentPlayers: Player[]): Record<number, number> => {
    return currentPlayers.reduce((acc, p) => {
      acc[p.team] = (acc[p.team] || 0) + 1
      return acc
    }, {} as Record<number, number>)
  }, [])

  const checkTeamSize = useCallback((team: number, currentPlayers: Player[]): boolean => {
    const teamSizes = getTeamSizes(currentPlayers)
    return (teamSizes[team] || 0) < PLAYER_CONSTANTS.LIMITS.MAX_TEAM_SIZE
  }, [getTeamSizes])

  // Core Functions
  const addPlayer = useCallback(() => {
    if (players.length >= PLAYER_CONSTANTS.LIMITS.MAX_PLAYERS) {
      return
    }

    const playerCount = players.length
    const colorIndex = playerCount % PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS.length
    const defaultColor = PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS[colorIndex] || PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS[0]
    
    const newPlayer: Player = {
      id: `player-${Date.now()}`,
      name: `Player ${playerCount + 1}`,
      color: defaultColor,
      hoverColor: `hover:${defaultColor.replace('bg-', '')}`,
      team: settings.teamMode ? playerCount % 2 : 0
    }

    setPlayers(prev => [...prev, newPlayer])
    emitPlayerEvent({
      type: PLAYER_CONSTANTS.EVENTS.PLAYER_JOIN,
      player: newPlayer
    })
  }, [players.length, settings.teamMode, emitPlayerEvent])

  const removePlayer = useCallback((index: number): void => {
    setPlayers(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updatePlayerInfo = useCallback((
    index: number, 
    name: string, 
    color: string, 
    team?: number
  ): void => {
    setPlayers(prev => {
      const newPlayers = [...prev]
      const currentPlayer = newPlayers[index]
      
      if (currentPlayer) {
        const validName = name.trim() || currentPlayer.name
        const isDuplicate = newPlayers.some((p, i) => i !== index && p.name === validName)
        
        newPlayers[index] = {
          ...currentPlayer,
          name: isDuplicate ? `${validName} (${index + 1})` : validName,
          color,
          ...(team !== undefined && checkTeamSize(team, newPlayers) && { team })
        }
      }
      
      return newPlayers
    })
  }, [checkTeamSize])

  const switchTeam = useCallback((playerId: string, newTeam: number): void => {
    if (!settings.teamMode) return

    setPlayers(prev => {
      if (!checkTeamSize(newTeam, prev)) return prev

      const newPlayers = prev.map(player => {
        if (player.id === playerId) {
          const newColor = teamColors[newTeam]
          return {
            ...player,
            team: newTeam,
            color: newColor || player.color
          }
        }
        return player
      })

      emitPlayerEvent({
        type: PLAYER_CONSTANTS.EVENTS.TEAM_CHANGE,
        playerId,
        newTeam
      })

      return newPlayers
    })
  }, [settings.teamMode, teamColors, emitPlayerEvent, checkTeamSize])

  const balanceTeams = useCallback((): void => {
    setPlayers(prev => {
      // First, ensure we don't exceed max players per team
      const maxPlayersPerTeam = PLAYER_CONSTANTS.LIMITS.MAX_TEAM_SIZE
      
      // Sort players by ID to ensure consistent balancing
      const allPlayers = [...prev].sort((a, b) => a.id.localeCompare(b.id))
      
      // Split players into teams while respecting max size
      const team0Players = []
      const team1Players = []
      
      for (const player of allPlayers) {
        if (team0Players.length < maxPlayersPerTeam && 
            (team1Players.length >= maxPlayersPerTeam || team0Players.length <= team1Players.length)) {
          team0Players.push({ ...player, team: 0, color: teamColors[0] || player.color })
        } else if (team1Players.length < maxPlayersPerTeam) {
          team1Players.push({ ...player, team: 1, color: teamColors[1] || player.color })
        }
        // If both teams are full, player is not assigned
      }

      // Combine teams
      return [...team0Players, ...team1Players]
    })
  }, [teamColors])

  // Sync with session
  useEffect(() => {
    if (session.updateSessionPlayers) {
      session.updateSessionPlayers(players).catch(console.error)
    }
  }, [players, session])

  // Sync with presence
  useEffect(() => {
    const onlinePlayers = Object.values(presenceState).map(presence => presence.user_id)
    setPlayers(prev => prev.map(player => ({
      ...player,
      isOnline: onlinePlayers.includes(player.id)
    })))
  }, [presenceState])

  // Initialize with default state if needed
  useEffect(() => {
    if (players.length === 0) {
      const defaultPlayer = {
        id: `player-${Date.now()}`,
        name: 'Player 1',
        color: PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS[0],
        hoverColor: 'hover:bg-cyan-600',
        team: 0
      }
      setPlayers([defaultPlayer])
    }
  }, [players.length])

  return {
    players,
    teamNames,
    teamColors,
    currentPlayer: _currentPlayer,
    addPlayer,
    removePlayer,
    updatePlayerInfo,
    switchTeam,
    updateTeamName: useCallback((index: number, name: string) => {
      setTeamNames(prev => {
        const newNames = [...prev] as [string, string]
        newNames[index] = name
        return newNames
      })
    }, []),
    updateTeamColor: useCallback((index: number, color: string) => {
      setTeamColors(prev => {
        const newColors = [...prev] as [string, string]
        newColors[index] = color
        return newColors
      })
      
      setPlayers(prev =>
        prev.map(player =>
          player.team === index
            ? { ...player, color }
            : player
        )
      )
    }, []),
    balanceTeams,
    validateTeamSize: useCallback(() => {
      const teamSizes = getTeamSizes(players)
      return Math.abs((teamSizes[0] || 0) - (teamSizes[1] || 0)) <= 1
    }, [players, getTeamSizes])
  }
}