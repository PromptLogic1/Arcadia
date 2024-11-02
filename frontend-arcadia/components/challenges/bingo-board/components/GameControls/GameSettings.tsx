import React from 'react'
import { Lock, Volume2, VolumeX, Play, RotateCcw, Save, Upload, Grid, Trophy } from 'lucide-react'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

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
  const handleWinConditionChange = (type: 'line' | 'majority') => {
    onWinConditionsChange({
      ...winConditions,
      [type]: !winConditions[type]
    })
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-cyan-400 flex items-center">
        <Grid className="mr-2 h-5 w-5" /> Game Settings
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                <Select
                  value={boardSize.toString()}
                  onValueChange={(value) => onBoardSizeChange(Number(value))}
                  disabled={!isOwner}
                >
                  <SelectTrigger 
                    className={cn(
                      "w-full bg-gray-700 border-cyan-500 text-white",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
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
                        {size}x{size} Board
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {isOwner ? "Select board size" : "Only the owner can change board size"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex items-center space-x-2 bg-gray-700/50 rounded-md px-3 py-1.5 border border-cyan-500/30">
          {soundEnabled ? (
            <Volume2 className="h-4 w-4 text-cyan-400" />
          ) : (
            <VolumeX className="h-4 w-4 text-cyan-400" />
          )}
          <Switch
            checked={soundEnabled}
            onCheckedChange={onSoundToggle}
            disabled={!isOwner}
          />
        </div>
      </div>

      <Separator className="bg-cyan-500/20" />

      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between bg-gray-700 rounded-md px-4 py-2 border border-cyan-500">
            <Label className="text-sm text-cyan-200">Team Mode</Label>
            <Switch
              checked={teamMode}
              onCheckedChange={onTeamModeToggle}
              disabled={!isOwner}
              className="data-[state=checked]:bg-cyan-500"
            />
          </div>

          <div className="flex items-center justify-between bg-gray-700/50 rounded-md px-3 py-1.5 border border-cyan-500/30">
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-cyan-400" />
              <Label className="text-sm text-cyan-200">Lockout</Label>
            </div>
            <Switch
              checked={lockout}
              onCheckedChange={onLockoutToggle}
              disabled={!isOwner}
            />
          </div>
        </div>

        <div className="bg-gray-700 rounded-md p-4 border border-cyan-500">
          <div className="flex items-center mb-3">
            <Trophy className="h-4 w-4 text-cyan-400 mr-2" />
            <Label className="text-sm text-cyan-200">Win Conditions</Label>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={winConditions.line}
                onCheckedChange={() => handleWinConditionChange('line')}
                disabled={!isOwner}
                className="data-[state=checked]:bg-cyan-500"
              />
              <Label className="text-xs text-cyan-200">Line</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={winConditions.majority}
                onCheckedChange={() => handleWinConditionChange('majority')}
                disabled={!isOwner}
                className="data-[state=checked]:bg-cyan-500"
              />
              <Label className="text-xs text-cyan-200">Majority</Label>
            </div>
          </div>
        </div>
      </div>

      <Separator className="bg-cyan-500/20" />

      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={onStartBoard}
          disabled={!isOwner}
          className={cn(
            "w-full bg-cyan-500 hover:bg-cyan-600 text-white",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="w-full bg-transparent border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                onClick={() => {}}
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </TooltipTrigger>
            <TooltipContent>Coming soon!</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="w-full bg-transparent border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                onClick={() => {}}
              >
                <Upload className="mr-2 h-4 w-4" />
                Load
              </Button>
            </TooltipTrigger>
            <TooltipContent>Coming soon!</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}