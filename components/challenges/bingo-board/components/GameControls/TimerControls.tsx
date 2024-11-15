import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Play, Pause } from 'lucide-react'
import { useLayout } from '../../hooks/useLayout'

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
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false)
  const [hours, setHours] = useState(Math.floor(time / 3600))
  const [minutes, setMinutes] = useState(Math.floor((time % 3600) / 60))
  const [seconds, setSeconds] = useState(time % 60)

  const { getResponsiveSpacing } = useLayout()
  const spacing = getResponsiveSpacing(16)

  const handleTimeSubmit = () => {
    const validHours = Math.max(0, Math.min(99, hours))
    const validMinutes = Math.max(0, Math.min(59, minutes))
    const validSeconds = Math.max(0, Math.min(59, seconds))
    
    const totalSeconds = validHours * 3600 + validMinutes * 60 + validSeconds
    onTimeChange(totalSeconds.toString())
    setIsTimeDialogOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (isOwner) {
        onTimerToggle()
      }
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: number) => void,
    max: number
  ) => {
    const value = parseInt(e.target.value)
    if (!isNaN(value) && value >= 0 && value <= max) {
      setter(value)
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: spacing.gap }}>
      <div className="bg-gray-800/90 rounded-lg p-3 border border-cyan-500/30">
        <div className="flex items-center justify-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (isOwner) {
                      setHours(Math.floor(time / 3600))
                      setMinutes(Math.floor((time % 3600) / 60))
                      setSeconds(time % 60)
                      setIsTimeDialogOpen(true)
                    }
                  }}
                  disabled={!isOwner || isTimerRunning}
                  className={cn(
                    "font-mono text-2xl sm:text-3xl tracking-wider",
                    "bg-transparent hover:bg-cyan-500/10",
                    "text-cyan-400 disabled:text-cyan-400/70",
                    "border-none disabled:opacity-80",
                    "transition-all duration-200 px-3 h-12"
                  )}
                >
                  {formatTime(time)}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-800 border border-cyan-500/30">
                {isOwner 
                  ? isTimerRunning 
                    ? "Stop timer to edit" 
                    : "Click to set timer"
                  : "Only the owner can set the timer"
                }
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {isOwner && (
            <Button
              onClick={onTimerToggle}
              onKeyDown={handleKeyDown}
              disabled={time === 0}
              className={cn(
                "h-12 w-12 rounded-full",
                "transition-all duration-200",
                isTimerRunning 
                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30" 
                  : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30",
                "disabled:opacity-50"
              )}
            >
              {isTimerRunning ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
        <DialogContent className="bg-gray-800/95 border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-cyan-400">
              Set Timer
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Hours', value: hours, setter: setHours, max: 99 },
              { label: 'Minutes', value: minutes, setter: setMinutes, max: 59 },
              { label: 'Seconds', value: seconds, setter: setSeconds, max: 59 },
            ].map((field) => (
              <div key={field.label} className="space-y-1">
                <Input
                  type="number"
                  min={0}
                  max={field.max}
                  value={field.value}
                  onChange={(e) => handleInputChange(e, field.setter, field.max)}
                  className="bg-gray-700/50 border-cyan-500/30 text-cyan-100 h-8
                    focus:ring-cyan-500 focus:border-cyan-500 text-center"
                />
                <span className="text-xs text-cyan-400 block text-center">
                  {field.label}
                </span>
              </div>
            ))}
          </div>
          <Button
            onClick={handleTimeSubmit}
            className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 
              text-cyan-400 border border-cyan-500/30
              transition-all duration-200 h-8"
          >
            Set Time
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}