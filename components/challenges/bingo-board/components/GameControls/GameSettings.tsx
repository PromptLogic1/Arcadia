'use client'

import React from 'react'
import { Lock, Volume2, VolumeX, Play, Pause, RotateCcw, Save, Trophy } from 'lucide-react'
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
import { useLayout } from '../../hooks/useLayout'

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
  onTimerToggle: () => void
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
  onTimerToggle,
}) => {
  const { getResponsiveSpacing } = useLayout()
  const spacing = getResponsiveSpacing(16)

  const handleWinConditionChange = (type: 'line' | 'majority') => {
    onWinConditionsChange({
      ...winConditions,
      [type]: !winConditions[type]
    })
  }

  const handleStartPause = () => {
    if (!isOwner) return
    
    if (isTimerRunning) {
      onTimerToggle()
    } else {
      onStartBoard()
    }
  }

  return (
    <div className="space-y-3" style={{ gap: spacing.gap }}>
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={boardSize.toString()}
          onValueChange={(value) => onBoardSizeChange(Number(value))}
          disabled={!isOwner || isTimerRunning}
        >
          <SelectTrigger 
            className={cn(
              "w-full h-8 text-sm",
              "bg-gray-700/50 border-cyan-500/30 text-cyan-100",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <SelectValue placeholder={`${boardSize}x${boardSize}`} />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-cyan-500/30">
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

        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-700/50 rounded-md border border-cyan-500/30">
          {soundEnabled ? (
            <Volume2 className="h-4 w-4 text-cyan-400" />
          ) : (
            <VolumeX className="h-4 w-4 text-cyan-400" />
          )}
          <Switch
            checked={soundEnabled}
            onCheckedChange={onSoundToggle}
            disabled={!isOwner || isTimerRunning}
            className="data-[state=checked]:bg-cyan-500"
          />
        </div>
      </div>

      <Separator className="bg-cyan-500/20" />

      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 bg-gray-700/50 rounded-md border border-cyan-500/30">
          <Label className="text-sm text-cyan-200">Team Mode</Label>
          <Switch
            checked={teamMode}
            onCheckedChange={onTeamModeToggle}
            disabled={!isOwner || isTimerRunning}
            className="data-[state=checked]:bg-cyan-500"
          />
        </div>

        <div className="flex items-center justify-between p-2 bg-gray-700/50 rounded-md border border-cyan-500/30">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-cyan-400" />
            <Label className="text-sm text-cyan-200">Lockout</Label>
          </div>
          <Switch
            checked={lockout}
            onCheckedChange={onLockoutToggle}
            disabled={!isOwner || isTimerRunning}
            className="data-[state=checked]:bg-cyan-500"
          />
        </div>
      </div>

      <div className="p-2 bg-gray-700/50 rounded-md border border-cyan-500/30">
        <div className="flex items-center mb-2">
          <Trophy className="h-4 w-4 text-cyan-400 mr-2" />
          <Label className="text-sm text-cyan-200">Win Conditions</Label>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={winConditions.line}
              onCheckedChange={() => handleWinConditionChange('line')}
              disabled={!isOwner || isTimerRunning}
              className="data-[state=checked]:bg-cyan-500"
            />
            <Label className="text-xs text-cyan-200">Line</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={winConditions.majority}
              onCheckedChange={() => handleWinConditionChange('majority')}
              disabled={!isOwner || isTimerRunning}
              className="data-[state=checked]:bg-cyan-500"
            />
            <Label className="text-xs text-cyan-200">Majority</Label>
          </div>
        </div>
      </div>

      <Separator className="bg-cyan-500/20" />

      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={onResetBoard}
          disabled={!isOwner || isTimerRunning}
          variant="outline"
          className="h-8 text-sm border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="h-8 text-sm bg-transparent border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
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

      <Button
        onClick={handleStartPause}
        disabled={!isOwner}
        className={cn(
          "w-full h-10 text-base font-medium",
          "border transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isTimerRunning
            ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
            : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30"
        )}
      >
        <div className="flex items-center justify-center gap-2">
          {isTimerRunning ? (
            <>
              <Pause className="h-5 w-5" />
              <span>Pause Board</span>
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              <span>Start Board</span>
            </>
          )}
        </div>
      </Button>

      {!isOwner && (
        <p className="text-xs text-gray-400 text-center">
          Only the board owner can start or pause the game
        </p>
      )}
    </div>
  )
}