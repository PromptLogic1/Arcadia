'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Player } from '../types/types'
import type { PlayerValidationResult, UsePlayerManagement, PlayerEvent } from '../types/playermanagement.types'
import { PLAYER_CONSTANTS } from '../types/playermanagement.constants'
import { colorPalette } from '../types/constants'
import { useSession } from './useSession'
import { useGameAnalytics } from './useGameAnalytics'
import { useGameSettings } from './useGameSettings'
import { usePresence } from './usePresence'

export const usePlayerManagement = (boardId: string): UsePlayerManagement => {
  // States bleiben gleich, aber nutzen jetzt die Konstanten
  const [players, setPlayers] = useState<Player[]>([])
  const [teamNames, setTeamNames] = useState<[string, string]>(PLAYER_CONSTANTS.TEAMS.DEFAULT_NAMES)
  const [teamColors, setTeamColors] = useState<[string, string]>(PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS)
  const [currentPlayer, setCurrentPlayer] = useState<number>(0)

  // Hook Integration
  const { updateStats, trackMove } = useGameAnalytics()
  const { settings } = useGameSettings(boardId)
  const { updateSessionPlayers } = useSession({ 
    boardId, 
    _game: 'All Games', 
    initialPlayers: players 
  }) as { updateSessionPlayers?: (players: Player[]) => Promise<void> }
  const { presenceState } = usePresence(boardId)

  // Validierungsfunktion in useRef für Dependency-Stabilität
  const validatePlayerRef = useRef((name: string, team: number): PlayerValidationResult => {
    const errors: string[] = []

    if (name.length > PLAYER_CONSTANTS.LIMITS.MAX_NAME_LENGTH) {
      errors.push(`Name cannot exceed ${PLAYER_CONSTANTS.LIMITS.MAX_NAME_LENGTH} characters`)
    }

    const teamSize = players.filter(p => p.team === team).length
    if (teamSize >= PLAYER_CONSTANTS.LIMITS.MAX_TEAM_SIZE) {
      errors.push(`Team ${team + 1} is already full`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  })

  // getTeamSizes als stabile Referenz
  const getTeamSizes = useCallback((currentPlayers: Player[]): Record<number, number> => {
    return currentPlayers.reduce((acc, p) => {
      acc[p.team] = (acc[p.team] || 0) + 1
      return acc
    }, {} as Record<number, number>)
  }, [])

  // Event Emitter
  const emitPlayerEvent = useCallback((event: PlayerEvent) => {
    try {
      const customEvent = new CustomEvent('playerManagement', {
        detail: event,
        bubbles: true
      })
      window.dispatchEvent(customEvent)
      
      // Analytics tracking
      if (event.type === 'teamChange') {
        trackMove(event.playerId, 'team_switch', event.newTeam)
      }
    } catch (error) {
      console.error('Error emitting player event:', error)
    }
  }, [trackMove])

  // Sync mit Online Status
  useEffect(() => {
    const onlinePlayers = Object.values(presenceState).map(presence => presence.user_id)
    setPlayers(prev => prev.map(player => ({
      ...player,
      isOnline: onlinePlayers.includes(player.id)
    })))
  }, [presenceState])

  // Sync mit Session - Dependencies korrigiert
  useEffect(() => {
    const syncPlayers = async () => {
      if (players.length > 0 && updateSessionPlayers) {
        try {
          await updateSessionPlayers(players)
        } catch (error) {
          console.error('Failed to sync players with session:', error)
        }
      }
    }
    
    syncPlayers()
  }, [players, updateSessionPlayers])

  // Team Mode Sync - Dependencies korrigiert
  useEffect(() => {
    if (!settings.teamMode && players.some(p => p.team !== 0)) {
      const defaultColor = colorPalette[0]?.color || 'bg-cyan-500'
      setPlayers(prev => prev.map(player => ({
        ...player,
        team: 0,
        color: defaultColor
      })))
    }
  }, [settings.teamMode, players])

  const addPlayer = useCallback((): void => {
    if (players.length >= PLAYER_CONSTANTS.LIMITS.MAX_PLAYERS) return

    const paletteItem = colorPalette[players.length % colorPalette.length]
    if (!paletteItem) return

    const newPlayer: Player = {
      id: `player-${players.length + 1}`,
      name: `Player ${players.length + 1}`,
      color: paletteItem.color,
      hoverColor: paletteItem.hoverColor,
      team: players.length % PLAYER_CONSTANTS.TEAMS.MAX_TEAMS
    }

    const validation = validatePlayerRef.current(newPlayer.name, newPlayer.team)
    if (!validation.isValid) return

    setPlayers(prev => {
      const teamSizes = getTeamSizes(prev)
      const team0Size = teamSizes[0] ?? 0
      const team1Size = teamSizes[1] ?? 0
      
      if (Math.abs(team0Size - team1Size) > PLAYER_CONSTANTS.VALIDATION.MAX_TEAM_SIZE_DIFFERENCE) {
        newPlayer.team = team0Size > team1Size ? 1 : 0
      }
      
      const newPlayers = [...prev, newPlayer]
      
      emitPlayerEvent({
        type: PLAYER_CONSTANTS.EVENTS.PLAYER_JOIN,
        player: newPlayer
      })
      
      updateStats(newPlayers, {}, {})
      
      return newPlayers
    })
  }, [
    players.length, 
    getTeamSizes, 
    emitPlayerEvent, 
    updateStats
  ])

  const removePlayer = useCallback((index: number): void => {
    setPlayers(prev => {
      const newPlayers = prev.filter((_, i) => i !== index)
      
      // Aktualisiere currentPlayer wenn nötig
      if (currentPlayer >= newPlayers.length) {
        setCurrentPlayer(0)
      }
      
      return newPlayers
    })
  }, [currentPlayer])

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
        // Validiere Name
        const validName = name.trim() || currentPlayer.name
        
        // Prüfe auf Namens-Duplikate
        const isDuplicate = newPlayers.some((p, i) => 
          i !== index && p.name === validName
        )
        
        newPlayers[index] = {
          ...currentPlayer,
          name: isDuplicate ? `${validName} (${index + 1})` : validName,
          color,
          ...(team !== undefined && { team })
        }
      }
      
      return newPlayers
    })
  }, [])

  const switchTeam = useCallback((playerId: string, newTeam: number): void => {
    if (!settings.teamMode) return

    setPlayers(prev => {
      const playerIndex = prev.findIndex(p => p.id === playerId)
      if (playerIndex === -1) return prev

      const player = prev[playerIndex]
      if (!player) return prev

      const teamSizes = getTeamSizes(prev)
      if ((teamSizes[newTeam] || 0) >= PLAYER_CONSTANTS.LIMITS.MAX_TEAM_SIZE) return prev

      const newColor = teamColors[newTeam]
      if (!newColor) return prev

      const newPlayers = [...prev]
      newPlayers[playerIndex] = {
        id: player.id,
        name: player.name,
        color: newColor,
        hoverColor: player.hoverColor,
        team: newTeam
      }

      emitPlayerEvent({
        type: PLAYER_CONSTANTS.EVENTS.TEAM_CHANGE,
        playerId,
        newTeam
      })

      return newPlayers
    })
  }, [
    teamColors, 
    settings.teamMode, 
    emitPlayerEvent, 
    getTeamSizes
  ])

  // 2.2 Team-Management
  const updateTeamName = useCallback((index: number, name: string): void => {
    setTeamNames(prev => {
      const newNames = [...prev] as [string, string]
      newNames[index] = name
      return newNames
    })
  }, [])

  const updateTeamColor = useCallback((index: number, color: string): void => {
    setTeamColors(prev => {
      const newColors = [...prev] as [string, string]
      newColors[index] = color
      return newColors
    })
    
    // Update alle Spieler im Team mit der neuen Farbe
    setPlayers(prev =>
      prev.map(player =>
        player.team === index
          ? { ...player, color }
          : player
      )
    )
  }, [])

  const balanceTeams = useCallback((): void => {
    setPlayers(prev => {
      const teamSizes = getTeamSizes(prev)
      const team0Size = teamSizes[0] ?? 0
      const team1Size = teamSizes[1] ?? 0

      if (Math.abs(team0Size - team1Size) <= 1) {
        return prev // Teams sind bereits ausbalanciert
      }

      const biggerTeam = team0Size > team1Size ? 0 : 1
      const smallerTeam = biggerTeam === 0 ? 1 : 0
      const diff = Math.floor(Math.abs(team0Size - team1Size) / 2)

      const smallerTeamColor = teamColors[smallerTeam]
      if (!smallerTeamColor) return prev

      return prev.map((player, index) => {
        if (player.team === biggerTeam && index < diff) {
          return {
            ...player,
            team: smallerTeam,
            color: smallerTeamColor
          }
        }
        return player
      })
    })
  }, [teamColors, getTeamSizes])

  // 3. Validierung
  const validateTeamSize = useCallback((): boolean => {
    const teamSizes = players.reduce((acc, p) => {
      acc[p.team] = (acc[p.team] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    return Math.abs((teamSizes[0] || 0) - (teamSizes[1] || 0)) <= 1
  }, [players])

  return {
    players,
    teamNames,
    teamColors,
    currentPlayer,
    addPlayer,
    removePlayer,
    updatePlayerInfo,
    switchTeam,
    updateTeamName,
    updateTeamColor,
    balanceTeams,
    validateTeamSize
  }
}