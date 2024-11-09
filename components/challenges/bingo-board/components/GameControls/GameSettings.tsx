import React from 'react'
import { Lock, Volume2, VolumeX, Play, Pause, RotateCcw, Save, Trophy, Users } from 'lucide-react'
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
  isTimerRunning: boolean
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
  isTimerRunning,
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="filter-game" className="text-cyan-300 text-sm font-medium">Board Size:</Label>
          <Select value={boardSize.toString()} onValueChange={(value) => onBoardSizeChange(Number(value))}>
            <SelectTrigger 
              className={cn(
                "w-full h-9 text-sm",
                "bg-gray-800/80 border-cyan-500/30 text-cyan-100",
                "hover:bg-gray-800/90 hover:border-cyan-500/50",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <SelectValue placeholder={`${boardSize}x${boardSize}`} />
            </SelectTrigger>
            <SelectContent className="bg-gray-800/95 border-cyan-500/30 backdrop-blur-sm">
              {[3, 4, 5, 6].map((size) => (
                <SelectItem 
                  key={size} 
                  value={size.toString()} 
                  className="text-cyan-100 hover:bg-cyan-500/20 cursor-pointer"
                >
                  {size}x{size} Board
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-cyan-300 text-sm font-medium">Sound:</Label>
          <div className="flex items-center justify-between p-2 h-9 bg-gray-800/80 rounded-md border border-cyan-500/30
            hover:bg-gray-800/90 hover:border-cyan-500/50 transition-all duration-200">
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-cyan-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-cyan-400" />
            )}
            <Switch
              checked={soundEnabled}
              onCheckedChange={onSoundToggle}
              disabled={!isOwner}
              className="data-[state=checked]:bg-cyan-500"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 bg-gray-800/80 rounded-lg border border-cyan-500/30 p-3
        hover:bg-gray-800/90 hover:border-cyan-500/50 transition-all duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-cyan-500/10">
              <Users className="h-4 w-4 text-cyan-400" />
            </div>
            <Label className="text-sm text-cyan-300 font-medium">Team Mode</Label>
          </div>
          <Switch
            checked={teamMode}
            onCheckedChange={onTeamModeToggle}
            disabled={!isOwner}
            className="data-[state=checked]:bg-cyan-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-cyan-500/10">
              <Lock className="h-4 w-4 text-cyan-400" />
            </div>
            <Label className="text-sm text-cyan-300 font-medium">Lockout</Label>
          </div>
          <Switch
            checked={lockout}
            onCheckedChange={onLockoutToggle}
            disabled={!isOwner}
            className="data-[state=checked]:bg-cyan-500"
          />
        </div>
      </div>

      <div className="space-y-3 bg-gray-800/80 rounded-lg border border-cyan-500/30 p-3
        hover:bg-gray-800/90 hover:border-cyan-500/50 transition-all duration-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-full bg-cyan-500/10">
            <Trophy className="h-4 w-4 text-cyan-400" />
          </div>
          <Label className="text-sm text-cyan-300 font-medium">Win Conditions</Label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-2 bg-gray-900/50 rounded-md">
            <Label className="text-sm text-cyan-200">Line</Label>
            <Switch
              checked={winConditions.line}
              onCheckedChange={() => handleWinConditionChange('line')}
              disabled={!isOwner}
              className="data-[state=checked]:bg-cyan-500"
            />
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-900/50 rounded-md">
            <Label className="text-sm text-cyan-200">Majority</Label>
            <Switch
              checked={winConditions.majority}
              onCheckedChange={() => handleWinConditionChange('majority')}
              disabled={!isOwner}
              className="data-[state=checked]:bg-cyan-500"
            />
          </div>
        </div>
      </div>

      <Separator className="bg-cyan-500/20" />

      <div className="space-y-3">
        <Button
          onClick={onStartBoard}
          disabled={!isOwner}
          className={cn(
            "w-full h-12 text-base font-medium",
            "rounded-lg shadow-lg backdrop-blur-sm",
            "transition-all duration-300",
            isTimerRunning
              ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
              : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border-cyan-500/30",
            "border-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "hover:scale-[1.02] active:scale-[0.98]"
          )}
        >
          {isTimerRunning ? (
            <>
              <Pause className="mr-2 h-5 w-5" />
              Pause Board
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Start Board
            </>
          )}
        </Button>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={onResetBoard}
            disabled={!isOwner}
            variant="outline"
            className="h-10 text-sm border-2 border-cyan-500/30 text-cyan-400 
              hover:bg-cyan-500/10 transition-all duration-200
              hover:border-cyan-500/50"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="h-10 text-sm bg-transparent border-2 border-cyan-500/30 
                    text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50
                    transition-all duration-200"
                  onClick={() => {}}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </TooltipTrigger>
              <TooltipContent>Coming soon!</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}