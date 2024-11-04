import { useState, useCallback, useMemo } from 'react'
import { Player } from '../components/shared/types'
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
    colorPalette[0].color,
    colorPalette[1].color,
  ])
  const [currentPlayer, setCurrentPlayer] = useState<number>(0)

  const updatePlayerInfo = useCallback(
    (index: number, name: string, color: string, team?: number): void => {
      setPlayers((prevPlayers) => {
        const newPlayers = [...prevPlayers]
        newPlayers[index] = {
          ...newPlayers[index],
          name,
          color,
          ...(team !== undefined && { team }),
        }
        return newPlayers
      })
    },
    []
  )

  const addPlayer = useCallback((): void => {
    if (players.length < 4) {
      const newPlayer: Player = {
        ...colorPalette[players.length % colorPalette.length],
        name: `Player ${players.length + 1}`,
        team: players.length % 2,
        hoverColor: colorPalette[players.length % colorPalette.length].hoverColor,
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
          team: player.team || 0,
          color: teamColors[player.team || 0], // Use team color when enabling team mode
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