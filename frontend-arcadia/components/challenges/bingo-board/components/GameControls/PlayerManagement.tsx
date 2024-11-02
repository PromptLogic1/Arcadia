import React from 'react'
import { X, PlusCircle } from 'lucide-react'
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
    <div className="space-y-3">
      {teamMode && (
        <div className="flex gap-2 mb-3">
          {teamNames.map((name, index) => (
            <Popover key={index}>
              <PopoverTrigger asChild>
                <div 
                  className={`flex-1 p-2 rounded-lg border border-cyan-500/20 
                    bg-gray-800/50 hover:bg-gray-800/80 transition-all cursor-pointer
                    group flex items-center gap-2`}
                >
                  <div
                    className={`w-3 h-3 rounded-full ${teamColors[index]} 
                      transition-transform group-hover:scale-110`}
                  />
                  <Input
                    value={name}
                    onChange={(e) => onUpdateTeamName(index, e.target.value)}
                    className="h-6 bg-transparent border-0 p-0 text-xs text-cyan-100 focus:ring-0"
                    placeholder={`Team ${index + 1}`}
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 bg-gray-800/95 backdrop-blur-sm border border-cyan-500/30">
                <div className="grid grid-cols-5 gap-1.5">
                  {colorPalette.map((color) => (
                    <Button
                      key={color.color}
                      className={`w-6 h-6 ${color.color} rounded-full 
                        transition-all duration-200 hover:scale-110
                        ${teamColors[index] === color.color ? 'ring-2 ring-cyan-400' : ''}`}
                      onClick={() => onUpdateTeamColor(index, color.color)}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {players.map((player, i) => (
          <Popover key={i}>
            <PopoverTrigger asChild>
              <div className="flex flex-col items-center gap-1.5">
                <Button
                  className={`w-12 h-12 ${player.color} rounded-full relative group
                    transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20`}
                  aria-label={`Edit ${player.name}`}
                >
                  <span className="text-lg font-bold">{player.name.charAt(0)}</span>
                  {isOwner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemovePlayer(i)
                      }}
                      className="absolute -top-1 -right-1 bg-gray-800/90 rounded-full p-1
                        opacity-0 group-hover:opacity-100 transition-opacity
                        hover:bg-red-500/20 border border-red-500/30"
                      aria-label={`Remove ${player.name}`}
                    >
                      <X className="h-3 w-3 text-red-400" />
                    </button>
                  )}
                </Button>
                <span className="text-xs text-cyan-300 truncate max-w-full">
                  {player.name}
                </span>
                {teamMode && (
                  <span className="text-[10px] text-cyan-400/60">
                    {teamNames[player.team]}
                  </span>
                )}
              </div>
            </PopoverTrigger>
            
            <PopoverContent className="w-64 bg-gray-800/95 backdrop-blur-sm border border-cyan-500/30">
              <div className="space-y-3 p-1">
                <div className="space-y-2">
                  <Label className="text-xs text-cyan-200">Name</Label>
                  <Input
                    value={player.name}
                    onChange={(e) => onUpdatePlayer(i, e.target.value, player.color, player.team)}
                    maxLength={20}
                    className="h-8 bg-gray-700/50 border-cyan-500/30 text-cyan-100 text-sm"
                  />
                </div>

                {teamMode && (
                  <div className="space-y-2">
                    <Label className="text-xs text-cyan-200">Team</Label>
                    <Select
                      value={player.team.toString()}
                      onValueChange={(value) => 
                        onUpdatePlayer(i, player.name, teamColors[parseInt(value)], parseInt(value))
                      }
                    >
                      <SelectTrigger className="h-8 bg-gray-700/50 border-cyan-500/30 text-cyan-100 text-sm">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-cyan-500/30">
                        {teamNames.map((name, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {!teamMode && (
                  <div className="space-y-2">
                    <Label className="text-xs text-cyan-200">Color</Label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {colorPalette.map((color) => (
                        <Button
                          key={color.color}
                          className={`w-6 h-6 ${color.color} rounded-full 
                            transition-all duration-200 hover:scale-110 
                            ${player.color === color.color ? 'ring-2 ring-cyan-400' : ''}`}
                          onClick={() => onUpdatePlayer(i, player.name, color.color, player.team)}
                          aria-label={`Select ${color.name} color`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        ))}

        {players.length < 4 && isOwner && (
          <div className="flex flex-col items-center gap-1.5">
            <Button
              onClick={onAddPlayer}
              className="w-12 h-12 bg-gray-700/50 hover:bg-gray-600/50 
                border border-dashed border-cyan-500/30 rounded-full
                transition-all duration-200 hover:scale-105
                hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20"
              aria-label="Add Player"
            >
              <PlusCircle className="h-6 w-6 text-cyan-400" />
            </Button>
            <span className="text-xs text-cyan-300">Add Player</span>
          </div>
        )}
      </div>
    </div>
  )
}