'use client'

import React from 'react'
import { Plus, Minus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useSession } from '../../hooks/useSession'
import { ColorPicker } from '@/components/ui/color-picker'
import { playerColors } from '../../types/constants'
import type { Player } from '../../types/types'
import { GAMES } from '../../types/types'

interface PlayerManagementProps {
  boardId: string
  isOwner: boolean
  teamMode: boolean
  teamNames: [string, string]
  teamColors: [string, string]
  onUpdateTeamName: (index: number, name: string) => void
  onUpdateTeamColor: (index: number, color: string) => void
}

export const PlayerManagement: React.FC<PlayerManagementProps> = ({
  boardId,
  isOwner,
  teamMode,
  teamNames,
  teamColors,
  onUpdateTeamName,
  onUpdateTeamColor,
}) => {
  const { 
    players,
    error,
    addPlayer,
    removePlayer,
    updateCell
  } = useSession({
    boardId,
    _game: GAMES[1],
    initialPlayers: []
  })

  const handleAddPlayer = async () => {
    try {
      if (!players.length) {
        await addPlayer({
          id: `player-${Date.now()}`,
          name: `Player 1`,
          color: playerColors[0].color,
          hoverColor: playerColors[0].hoverColor,
          team: teamMode ? 0 : 0
        })
      } else {
        const playerCount = players.length
        const colorIndex = playerCount % playerColors.length
        const playerColor = playerColors[colorIndex]?.color || playerColors[0].color
        const playerHoverColor = playerColors[colorIndex]?.hoverColor || playerColors[0].hoverColor

        await addPlayer({
          id: `player-${Date.now()}`,
          name: `Player ${playerCount + 1}`,
          color: playerColor,
          hoverColor: playerHoverColor,
          team: teamMode ? playerCount % 2 : 0
        })
      }
    } catch (err) {
      console.error('Error adding player:', err)
    }
  }

  const handleUpdatePlayer = async (
    playerId: string,
    playerName: string,
    color: string,
    _team?: number
  ) => {
    try {
      await updateCell(playerId, {
        text: playerName,
        colors: [color],
        completedBy: [],
        blocked: false,
        isMarked: false,
        cellId: playerId,
        lastModifiedBy: playerId,
        version: Date.now(),
        lastUpdated: Date.now()
      })
    } catch (err) {
      console.error('Error updating player:', err)
    }
  }

  if (error) {
    return <div className="text-center text-red-400">Error: {error.message}</div>
  }

  return (
    <div className="space-y-3">
      {teamMode && (
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map((teamIndex) => (
            <div
              key={teamIndex}
              className="space-y-2 p-2 rounded-md bg-gray-700/30 border border-cyan-500/20"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-400" />
                <Input
                  value={teamNames[teamIndex]}
                  onChange={(e) => onUpdateTeamName(teamIndex, e.target.value)}
                  className="h-7 text-sm bg-transparent"
                  placeholder={`Team ${teamIndex + 1}`}
                  disabled={!isOwner}
                />
              </div>
              <ColorPicker
                color={teamColors[teamIndex] || playerColors[0].color}
                onChange={(color: string) => onUpdateTeamColor(teamIndex, color)}
                disabled={!isOwner}
              />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {players.map((player: Player, index: number) => (
          <div
            key={player.id}
            className="flex items-center gap-2 p-2 rounded-md bg-gray-700/30 border border-cyan-500/20"
          >
            <Input
              value={player.name}
              onChange={(e) => handleUpdatePlayer(
                player.id,
                e.target.value,
                player.color,
                teamMode ? index % 2 : undefined
              )}
              className="h-7 text-sm bg-transparent"
              placeholder={`Player ${index + 1}`}
            />
            <ColorPicker
              color={player.color}
              onChange={(color: string) => handleUpdatePlayer(
                player.id,
                player.name,
                color,
                teamMode ? index % 2 : undefined
              )}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => removePlayer(player.id)}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        onClick={handleAddPlayer}
        disabled={!isOwner || players.length >= 8}
        className={cn(
          "w-full h-8 text-sm",
          "bg-cyan-500/20 hover:bg-cyan-500/30",
          "border border-cyan-500/30 text-cyan-400"
        )}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Player
      </Button>

      {!isOwner && (
        <p className="text-xs text-gray-400 text-center">
          Only the board owner can manage players
        </p>
      )}
    </div>
  )
}

PlayerManagement.displayName = 'PlayerManagement'