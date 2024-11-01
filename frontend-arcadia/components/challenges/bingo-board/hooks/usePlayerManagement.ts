import { useState, useCallback, useMemo } from 'react'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Player, ColorOption } from '../components/shared/types'
import { colorPalette } from '../components/shared/constants'

export const usePlayerManagement = () => {
  // Initialize players with the first 4 colors from the palette
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
          name: name.slice(0, 20),
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
  }, [])

  const toggleTeamMode = useCallback((enabled: boolean): void => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((player, index) => ({
        ...player,
        name: enabled
          ? `${teamNames[index % 2]} Player ${Math.floor(index / 2) + 1}`
          : `Player ${index + 1}`,
        team: index % 2,
        color: enabled ? teamColors[index % 2] : colorPalette[index].color,
        hoverColor: enabled
          ? `hover:${teamColors[index % 2]}`
          : colorPalette[index].hoverColor,
      }))
    )
  }, [teamNames, teamColors])

  return {
    players,
    setPlayers,
    teamNames,
    setTeamNames,
    teamColors,
    setTeamColors,
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