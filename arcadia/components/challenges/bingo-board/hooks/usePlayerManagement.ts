import { useState, useCallback, useMemo } from 'react'
import type { Player } from '../components/shared/types'
import { colorPalette } from '../components/shared/constants'

export const usePlayerManagement = () => {
  const initialPlayers: Player[] = useMemo(
    () =>
      colorPalette.slice(0, 4).map((p, i) => ({
        ...p,
        name: `Player ${i + 1}`,
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
  const [currentPlayer, setCurrentPlayer] = useState<number>(0)

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

  const toggleTeamMode = useCallback((enabled: boolean): void => {
    if (enabled) {
      setPlayers((prevPlayers) =>
        prevPlayers.map((player) => ({
          ...player,
          team: player.team ?? 0,
          color: teamColors[player.team ?? 0] || teamColors[0],
          hoverColor: player.hoverColor
        }))
      )
    }
  }, [teamColors])

  return {
    players,
    setPlayers,
    teamNames,
    setTeamNames,
    teamColors,
    currentPlayer,
    setCurrentPlayer,
    updatePlayerInfo,
    addPlayer,
    removePlayer,
    updateTeamName,
    updateTeamColor,
    toggleTeamMode,
  }
}