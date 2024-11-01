import React from 'react'
import { Clock } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface TimerControlsProps {
  time: number
  isTimerRunning: boolean
  isOwner: boolean
  formatTime: (seconds: number) => string
  onTimeChange: (time: string) => void
  onTimerToggle: () => void
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  time,
  isTimerRunning,
  isOwner,
  formatTime,
  onTimeChange,
  onTimerToggle,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold text-cyan-400 flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          Time
        </Label>
        <div className="relative">
          <Input
            type="time"
            value={formatTime(time)}
            onChange={(e) => onTimeChange(e.target.value)}
            className="w-32 text-right bg-transparent border-none text-white"
            step="1"
            aria-label="Set game time"
          />
        </div>
      </div>

      {isOwner && (
        <Button
          className={`w-full ${
            isTimerRunning
              ? 'bg-fuchsia-600 hover:bg-fuchsia-700'
              : 'bg-cyan-600 hover:bg-cyan-700'
          } text-white text-lg font-semibold transition-colors duration-200`}
          onClick={onTimerToggle}
          aria-label={isTimerRunning ? 'Pause Timer' : 'Start Timer'}
        >
          <Clock className="mr-2 h-5 w-5" />
          {isTimerRunning ? 'Pause Timer' : 'Start Timer'}
        </Button>
      )}
    </div>
  )
}