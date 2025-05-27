'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Clock, Play, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GAME_SETTINGS } from '../../types/gamesettings.constants'

interface TimerControlsProps {
  isOwner: boolean
  isRunning: boolean
  timeLimit: number
  onTimerToggle: () => void
  onTimeChange?: (time: number) => void
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  isOwner,
  isRunning,
  timeLimit,
  onTimerToggle,
  onTimeChange
}) => {
  const timeInMinutes = Math.floor(timeLimit / 60000)

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Timer Display */}
      <div className="flex-1 flex items-center gap-3 px-3 py-2 bg-gray-900/50 rounded-lg">
        <Clock className="h-4 w-4 text-cyan-400" />
        <span className="font-mono text-lg font-medium text-cyan-400">
          {formatTime(timeLimit)}
        </span>
      </div>

      {/* Timer Controls */}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={timeInMinutes}
          onChange={(e) => {
            const newTime = Math.max(
              GAME_SETTINGS.TIME_LIMITS.MIN_TIME / 60000,
              Math.min(
                parseInt(e.target.value) || 0,
                GAME_SETTINGS.TIME_LIMITS.MAX_TIME / 60000
              )
            )
            onTimeChange?.(newTime * 60000)
          }}
          disabled={!isOwner || isRunning}
          className="w-16 h-9 text-center"
          min={GAME_SETTINGS.TIME_LIMITS.MIN_TIME / 60000}
          max={GAME_SETTINGS.TIME_LIMITS.MAX_TIME / 60000}
        />

        <Button
          onClick={onTimerToggle}
          disabled={!isOwner}
          variant="outline"
          size="sm"
          className={cn(
            "h-9 px-3",
            isRunning 
              ? "bg-red-500/10 hover:bg-red-500/20 text-red-400"
              : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
          )}
        >
          {isRunning ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}