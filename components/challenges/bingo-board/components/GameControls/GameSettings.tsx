'use client'

import React from 'react'
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
import { Lock, Play, Pause, RotateCcw, Grid3x3, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GameSettings as GameSettingsType } from '../../types/gamesettings.types'

export interface GameSettingsProps {
  isOwner: boolean
  isRunning: boolean
  settings: GameSettingsType
  onSettingsChangeAction: (settings: Partial<GameSettingsType>) => Promise<void>
  onStartGameAction: () => Promise<void>
  onResetGameAction: () => Promise<void>
}

export const GameSettings: React.FC<GameSettingsProps> = ({
  isOwner,
  isRunning,
  settings,
  onSettingsChangeAction,
  onStartGameAction,
  onResetGameAction
}) => {
  return (
    <div className="space-y-3">
      {/* Core Settings */}
      <div className="grid gap-2">
        {/* Board Size & Sound */}
        <div className="flex items-center gap-2">
          <Select
            value={settings.boardSize.toString()}
            onValueChange={async (value) => await onSettingsChangeAction({ boardSize: parseInt(value) })}
            disabled={!isOwner || isRunning}
          >
            <SelectTrigger className="flex-1 h-9 bg-gray-900/50">
              <Grid3x3 className="h-4 w-4 text-cyan-400 mr-2" />
              <SelectValue placeholder="Board Size" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border border-cyan-500/20">
              {[3, 4, 5, 6].map((size) => (
                <SelectItem 
                  key={size} 
                  value={size.toString()}
                  className="hover:bg-cyan-500/10 focus:bg-cyan-500/20"
                >
                  {size}x{size} Board
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 px-3 h-9 bg-gray-900/50 rounded-md">
            <Volume2 className="h-4 w-4 text-cyan-400" />
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => onSettingsChangeAction({ soundEnabled: checked })}
              disabled={!isOwner}
            />
          </div>
        </div>

        {/* Game Mode Settings */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center justify-between px-3 h-9 bg-gray-900/50 rounded-md">
            <Label className="text-sm text-cyan-200">Team Mode</Label>
            <Switch
              checked={settings.teamMode}
              onCheckedChange={(checked) => onSettingsChangeAction({ teamMode: checked })}
              disabled={!isOwner || isRunning}
            />
          </div>

          <div className="flex-1 flex items-center justify-between px-3 h-9 bg-gray-900/50 rounded-md">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-cyan-400" />
              <Label className="text-sm text-cyan-200">Lockout</Label>
            </div>
            <Switch
              checked={settings.lockout}
              onCheckedChange={(checked) => onSettingsChangeAction({ lockout: checked })}
              disabled={!isOwner || isRunning || settings.teamMode}
            />
          </div>
        </div>

        {/* Win Conditions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => !isRunning && isOwner && onSettingsChangeAction({ 
              winConditions: { ...settings.winConditions, line: !settings.winConditions.line } 
            })}
            className={cn(
              "flex-1 flex items-center justify-between px-3 h-9",
              "rounded-md transition-all duration-200",
              "hover:bg-gray-700/30",
              "focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
              settings.winConditions.line
                ? "bg-cyan-500/10"
                : "bg-gray-900/50"
            )}
            disabled={!isOwner || isRunning}
          >
            <span className="text-sm text-cyan-200">Line Victory</span>
            <div className={cn(
              "w-2 h-2 rounded-full",
              settings.winConditions.line
                ? "bg-cyan-400"
                : "bg-gray-600"
            )} />
          </button>

          <button
            onClick={() => !isRunning && isOwner && onSettingsChangeAction({ 
              winConditions: { ...settings.winConditions, majority: !settings.winConditions.majority } 
            })}
            className={cn(
              "flex-1 flex items-center justify-between px-3 h-9",
              "rounded-md transition-all duration-200",
              "hover:bg-gray-700/30",
              "focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
              settings.winConditions.majority
                ? "bg-cyan-500/10"
                : "bg-gray-900/50"
            )}
            disabled={!isOwner || isRunning}
          >
            <span className="text-sm text-cyan-200">Majority Rule</span>
            <div className={cn(
              "w-2 h-2 rounded-full",
              settings.winConditions.majority
                ? "bg-cyan-400"
                : "bg-gray-600"
            )} />
          </button>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={onResetGameAction}
          disabled={!isOwner || isRunning}
          variant="outline"
          className={cn(
            "h-9",
            "bg-gray-900/50 hover:bg-gray-800",
            "border-cyan-500/20 hover:border-cyan-500/40"
          )}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <Button
          onClick={onStartGameAction}
          disabled={!isOwner}
          className={cn(
            "h-9",
            isRunning
              ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
              : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400"
          )}
        >
          {isRunning ? (
            <>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Start
            </>
          )}
        </Button>
      </div>
    </div>
  )
}