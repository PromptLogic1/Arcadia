import { useState, useCallback, useMemo } from 'react'
import type { Player } from '../components/shared/types'
import { colorPalette } from '../components/shared/constants'

interface UsePlayerManagement {
  players: Player[]
  addPlayer: () => void
  removePlayer: (index: number) => void
  updatePlayerInfo: (index: number, name: string, color: string, team?: number) => void
  updateTeamName: (teamId: number, name: string) => void
  updateTeamColor: (teamId: number, color: string) => void
  teamNames: [string, string]
  teamColors: [string, string]
  currentPlayer: number
}

export const usePlayerManagement = (): UsePlayerManagement => {
  const initialPlayers: Player[] = useMemo(
    () =>
      colorPalette.slice(0, 4).map((p, i) => ({
        id: `player-${i + 1}`,
        name: `Player ${i + 1}`,
        color: p.color,
        hoverColor: p.hoverColor,
        team: i % 2,
      })),
    []
  )

  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [teamNames, setTeamNames] = useState<[string, string]>(['Team 1', 'Team 2'])
  const [teamColors, setTeamColors] = useState<[string, string]>([
    colorPalette[0]?.color || 'bg-cyan-500',
    colorPalette[1]?.color || 'bg-fuchsia-500',
  ])
  const [currentPlayer] = useState<number>(0)

  const updatePlayerInfo = useCallback(
    (index: number, name: string, color: string, team?: number): void => {
      setPlayers((prevPlayers) => {
        const newPlayers = [...prevPlayers]
        const currentPlayer = newPlayers[index]
        if (currentPlayer) {
          newPlayers[index] = {
            ...currentPlayer,
            name,
            color,
            ...(team !== undefined && { team }),
          }
        }
        return newPlayers
      })
    },
    []
  )

  const addPlayer = useCallback((): void => {
    if (players.length < 4) {
      const paletteItem = colorPalette[players.length % colorPalette.length]
      if (!paletteItem) return

      const newPlayer: Player = {
        id: `player-${players.length + 1}`,
        name: `Player ${players.length + 1}`,
        color: paletteItem.color,
        hoverColor: paletteItem.hoverColor,
        team: players.length % 2
      }
      setPlayers((prevPlayers) => [...prevPlayers, newPlayer])
    }
  }, [players.length])

  const removePlayer = useCallback((index: number): void => {
    setPlayers((prevPlayers) => prevPlayers.filter((_, i) => i !== index))
  }, [])

  const updateTeamName = useCallback((index: number, name: string): void => {
    setTeamNames((prevNames) => {
      const newNames = [...prevNames]
      newNames[index] = name
      return newNames as [string, string]
    })
  }, [])

  const updateTeamColor = useCallback((index: number, color: string): void => {
    setTeamColors((prevColors) => {
      const newColors = [...prevColors]
      newColors[index] = color
      return newColors as [string, string]
    })
    
    // Update all players in the team with the new color
    setPlayers((prevPlayers) =>
      prevPlayers.map((player) =>
        player.team === index
          ? { ...player, color }
          : player
      )
    )
  }, [])

  return {
    players,
    teamNames,
    teamColors,
    currentPlayer,
    updatePlayerInfo,
    addPlayer,
    removePlayer,
    updateTeamName,
    updateTeamColor,
  }
}