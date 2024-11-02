import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-cyan-400">Timer Controls</h3>
      <div className="bg-gray-800/80 rounded-lg p-6 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors duration-200">
        <div className="flex items-center justify-center space-x-4">
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
                  disabled={!isOwner}
                  className={cn(
                    "font-mono text-4xl text-[#00FFFF] tracking-wider",
                    "bg-transparent hover:bg-cyan-500/10",
                    "disabled:opacity-50",
                    "transition-all duration-200"
                  )}
                >
                  {formatTime(time)}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isOwner ? "Click to set timer" : "Only the owner can set the timer"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            onClick={onTimerToggle}
            onKeyDown={handleKeyDown}
            disabled={!isOwner}
            className={cn(
              "px-8 py-2 text-xl font-semibold",
              "transition-colors duration-200",
              isTimerRunning 
                ? "bg-fuchsia-600 hover:bg-fuchsia-700" 
                : "bg-cyan-600 hover:bg-cyan-700",
              "text-white"
            )}
          >
            {isTimerRunning ? 'Pause' : 'Start'}
          </Button>
        </div>
      </div>
      <Separator className="bg-cyan-500/20" />

      <Dialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
        <DialogContent className="bg-gray-800/95 border-cyan-500/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-cyan-400">Set Timer</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Input
                type="number"
                min={0}
                max={99}
                value={hours}
                onChange={(e) => handleInputChange(e, setHours, 99)}
                className="bg-gray-700 border-cyan-500/20 text-cyan-100"
              />
              <span className="text-sm text-cyan-400 mt-1 block text-center">Hours</span>
            </div>
            <div>
              <Input
                type="number"
                min={0}
                max={59}
                value={minutes}
                onChange={(e) => handleInputChange(e, setMinutes, 59)}
                className="bg-gray-700 border-cyan-500/20 text-cyan-100"
              />
              <span className="text-sm text-cyan-400 mt-1 block text-center">Minutes</span>
            </div>
            <div>
              <Input
                type="number"
                min={0}
                max={59}
                value={seconds}
                onChange={(e) => handleInputChange(e, setSeconds, 59)}
                className="bg-gray-700 border-cyan-500/20 text-cyan-100"
              />
              <span className="text-sm text-cyan-400 mt-1 block text-center">Seconds</span>
            </div>
          </div>
          <Button
            onClick={handleTimeSubmit}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white mt-4"
          >
            Set Time
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}