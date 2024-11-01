import React from 'react'
import { Lock, Volume2, VolumeX, Play, RotateCcw, Save, Upload } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

export interface GameSettingsProps {
  boardSize: number
  soundEnabled: boolean
  teamMode: boolean
  lockout: boolean
  winConditions: {
    line: boolean
    majority: boolean
  }
  isOwner: boolean
  onBoardSizeChange: (size: number) => void
  onSoundToggle: (enabled: boolean) => void
  onTeamModeToggle: (enabled: boolean) => void
  onLockoutToggle: (enabled: boolean) => void
  onWinConditionsChange: (conditions: { line: boolean; majority: boolean }) => void
  onStartBoard: () => void
  onResetBoard: () => void
}

export const GameSettings: React.FC<GameSettingsProps> = ({
  boardSize,
  soundEnabled,
  teamMode,
  lockout,
  winConditions,
  isOwner,
  onBoardSizeChange,
  onSoundToggle,
  onTeamModeToggle,
  onLockoutToggle,
  onWinConditionsChange,
  onStartBoard,
  onResetBoard,
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-cyan-400">Game Settings</h3>
      
      {/* Board Size and Sound Settings */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label htmlFor="board-size" className="text-sm text-cyan-200 mb-2 block">
            Board Size
          </Label>
          <Select
            value={boardSize.toString()}
            onValueChange={(value) => onBoardSizeChange(Number(value))}
            disabled={!isOwner}
          >
            <SelectTrigger 
              className="w-full bg-gray-700 border-cyan-500 text-white"
              id="board-size"
            >
              <SelectValue placeholder={`${boardSize}x${boardSize}`} />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-cyan-500">
              {[3, 4, 5, 6].map((size) => (
                <SelectItem 
                  key={size} 
                  value={size.toString()} 
                  className="text-cyan-100 hover:bg-cyan-500/20"
                >
                  {size}x{size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm text-cyan-200 mb-2 block">Sound</Label>
          <div className="flex items-center space-x-2 h-10 bg-gray-700 rounded-md px-3 border border-cyan-500">
            <Switch
              checked={soundEnabled}
              onCheckedChange={onSoundToggle}
              disabled={!isOwner}
              className="data-[state=checked]:bg-cyan-500"
            />
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-cyan-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-cyan-400" />
            )}
          </div>
        </div>
      </div>

      <Separator className="bg-cyan-500/20" />

      {/* Game Mode Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-gray-700 rounded-md px-3 py-2 border border-cyan-500">
          <div className="flex items-center space-x-2">
            <Label className="text-sm text-cyan-200">Team Mode</Label>
          </div>
          <Switch
            checked={teamMode}
            onCheckedChange={onTeamModeToggle}
            disabled={!isOwner}
            className="data-[state=checked]:bg-cyan-500"
          />
        </div>

        <div className="flex items-center justify-between bg-gray-700 rounded-md px-3 py-2 border border-cyan-500">
          <div className="flex items-center space-x-2">
            <Lock className="h-4 w-4 text-cyan-400" />
            <Label className="text-sm text-cyan-200">Lockout</Label>
          </div>
          <Switch
            checked={lockout}
            onCheckedChange={onLockoutToggle}
            disabled={!isOwner}
            className="data-[state=checked]:bg-cyan-500"
          />
        </div>
      </div>

      <Separator className="bg-cyan-500/20" />

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={onStartBoard}
          disabled={!isOwner}
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
        >
          <Play className="mr-2 h-4 w-4" />
          Start Board
        </Button>
        <Button
          onClick={onResetBoard}
          disabled={!isOwner}
          variant="outline"
          className="w-full border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={() => alert('Save functionality coming soon!')}
          className="w-full bg-transparent border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
        >
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
        <Button
          onClick={() => alert('Load functionality coming soon!')}
          className="w-full bg-transparent border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
        >
          <Upload className="mr-2 h-4 w-4" />
          Load
        </Button>
      </div>
    </div>
  )
}