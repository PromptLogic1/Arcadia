'use client'

import React from 'react'
import { Plus, Minus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useSession } from '../../hooks/useSession'
import { ColorPicker } from '@/components/ui/color-picker'
import { playerColors } from '../../types/constants'

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
  const { session, loading, error, createSession, joinSession } = useSession(boardId)

  const handleAddPlayer = async () => {
    try {
      if (!session) {
        // Create new session if none exists
        await createSession(
          `Player 1`,
          playerColors[0].color,
          teamMode ? 0 : undefined
        )
      } else if (session.players) {
        // Join existing session
        const playerCount = session.players.length
        const colorIndex = playerCount % playerColors.length
        const playerColor = playerColors[colorIndex]?.color || playerColors[0].color

        await joinSession(
          session.id,
          `Player ${playerCount + 1}`,
          playerColor,
          teamMode ? playerCount % 2 : undefined
        )
      }
    } catch (err) {
      console.error('Error adding player:', err)
    }
  }

  const handleUpdatePlayer = async (
    sessionId: string,
    playerName: string,
    color: string,
    team?: number
  ) => {
    try {
      const response = await fetch('/api/bingo/sessions/players', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          playerName,
          color,
          team
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update player')
      }
    } catch (err) {
      console.error('Error updating player:', err)
    }
  }

  const handleRemovePlayer = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/bingo/sessions/players?sessionId=${sessionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to remove player')
      }
    } catch (err) {
      console.error('Error removing player:', err)
    }
  }

  if (loading) {
    return <div className="text-center text-gray-400">Loading players...</div>
  }

  if (error) {
    return <div className="text-center text-red-400">Error: {error}</div>
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
        {session?.players?.map((player, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-2 rounded-md bg-gray-700/30 border border-cyan-500/20"
          >
            <Input
              value={player.name}
              onChange={(e) => handleUpdatePlayer(
                session.id,
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
                session.id,
                player.name,
                color,
                teamMode ? index % 2 : undefined
              )}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleRemovePlayer(session.id)}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        onClick={handleAddPlayer}
        disabled={!isOwner || (session?.players?.length ?? 0) >= 8}
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