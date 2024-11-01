import React from 'react'
import { Users } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Player } from '../shared/types'
import { colorPalette } from '../shared/constants'
import { PlusCircle, X } from 'lucide-react'

interface PlayerManagementProps {
  players: Player[]
  teamNames: [string, string]
  teamColors: [string, string]
  teamMode: boolean
  isOwner: boolean
  onUpdatePlayer: (index: number, name: string, color: string, team?: number) => void
  onAddPlayer: () => void
  onRemovePlayer: (index: number) => void
  onUpdateTeamName: (index: number, name: string) => void
  onUpdateTeamColor: (index: number, color: string) => void
}

export const PlayerManagement: React.FC<PlayerManagementProps> = ({
  players,
  teamNames,
  teamColors,
  teamMode,
  isOwner,
  onUpdatePlayer,
  onAddPlayer,
  onRemovePlayer,
  onUpdateTeamName,
  onUpdateTeamColor,
}) => {
  return (
    <div className="space-y-2">
      <Label className="text-lg font-semibold text-cyan-400 flex items-center">
        <Users className="mr-2 h-5 w-5" />
        {teamMode ? 'Teams' : 'Players'}
      </Label>

      {teamMode && (
        <div className="space-y-2">
          {teamNames.map((name, index) => (
            <div key={index} className="flex items-center space-x-2 bg-gray-700 p-2 rounded-md">
              <Input
                value={name}
                onChange={(e) => onUpdateTeamName(index, e.target.value)}
                className="text-sm text-white bg-transparent border-none focus:ring-2 focus:ring-cyan-500"
                aria-label={`Edit team ${index + 1} name`}
              />
              <div
                className={`w-4 h-4 rounded-full ${teamColors[index]}`}
                aria-label={`Team ${index + 1} color`}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {players.map((player, i) => (
          <Popover key={i}>
            <PopoverTrigger asChild>
              <Button
                className={`w-12 h-12 ${player.color} rounded-full text-white font-bold text-lg relative transition-transform duration-200 ease-in-out hover:scale-110`}
                aria-label={`Edit ${player.name}`}
              >
                {player.name.charAt(0)}
                {isOwner && (
                  <button
                    className="absolute -top-1 -right-1 bg-gray-700 rounded-full p-1 hover:bg-gray-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemovePlayer(i)
                    }}
                    aria-label={`Remove ${player.name}`}
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-gray-800 border-2 border-cyan-500">
              <div className="space-y-4">
                <h4 className="font-medium text-lg text-cyan-400">
                  Edit {teamMode ? 'Team' : 'Player'}
                </h4>
                <div className="space-y-2">
                  <Label htmlFor={`name-${i}`} className="text-cyan-200">
                    Name
                  </Label>
                  <Input
                    id={`name-${i}`}
                    value={player.name}
                    onChange={(e) => onUpdatePlayer(i, e.target.value, player.color, player.team)}
                    maxLength={20}
                    className="bg-gray-700 border-cyan-500 text-white"
                  />
                </div>

                {teamMode && (
                  <div className="space-y-2">
                    <Label className="text-cyan-200">Team</Label>
                    <Select
                      value={player.team.toString()}
                      onValueChange={(value) => 
                        onUpdatePlayer(i, player.name, teamColors[parseInt(value)], parseInt(value))
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-cyan-500 text-white">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-cyan-500 text-cyan-100">
                        <SelectItem value="0">Team 1</SelectItem>
                        <SelectItem value="1">Team 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-cyan-200">Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {colorPalette.map((color) => (
                      <Button
                        key={color.color}
                        className={`w-8 h-8 ${color.color} ${color.hoverColor} rounded-full transition-transform duration-200 ease-in-out hover:scale-110`}
                        onClick={() => {
                          if (teamMode) {
                            onUpdateTeamColor(player.team, color.color)
                          } else {
                            onUpdatePlayer(i, player.name, color.color, player.team)
                          }
                        }}
                        disabled={
                          teamMode &&
                          teamColors.includes(color.color) &&
                          teamColors.indexOf(color.color) !== player.team
                        }
                        aria-label={`Select ${color.name} color`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ))}

        {players.length < 4 && isOwner && (
          <Button
            className="w-12 h-12 bg-gray-600 hover:bg-gray-500 rounded-full transition-transform duration-200 ease-in-out hover:scale-110"
            onClick={onAddPlayer}
            aria-label="Add Player"
          >
            <PlusCircle className="h-6 w-6" />
            <span className="sr-only">Add Player</span>
          </Button>
        )}
      </div>
    </div>
  )
}