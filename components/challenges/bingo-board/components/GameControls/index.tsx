'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { GameSettings } from './GameSettings'
import { PlayerManagement } from './PlayerManagement'
import { TimerControls } from './TimerControls'
import { useGameState } from '../../hooks/useGameState'
import { cn } from '@/lib/utils'
import { Gamepad2, Users2, Timer, AlertCircle } from 'lucide-react'
import type { Player } from '../../types/types'
import type { GameSettings as GameSettingsType } from '../../types/gamesettings.types'

interface GameControlsProps {
  className?: string
  isOwner?: boolean
  onAddPlayer?: (player: Player) => void
  onRemovePlayer?: (playerId: string) => void
  onSettingsChange?: (settings: Partial<GameSettingsType>) => void
  onReset?: () => void
}

export const GameControls: React.FC<GameControlsProps> = ({
  className,
  isOwner = false,
  onAddPlayer,
  onRemovePlayer,
  onSettingsChange,
  onReset
}) => {
  const {
    settings,
    isRunning,
    players,
    updateSettings,
    setRunning,
    resetGame,
    updatePlayers
  } = useGameState()

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Status Bar */}
      {(isRunning || !isOwner) && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/95 rounded-lg border border-cyan-500/20">
          {!isOwner && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 rounded-full">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-amber-400">Viewer Mode</span>
            </div>
          )}
          {isRunning && (
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full">
              <span className="text-xs text-emerald-400">Game in Progress</span>
            </div>
          )}
        </div>
      )}

      {/* Main Controls Container */}
      <Card className={cn(
        "flex-1 bg-gray-800/95 backdrop-blur-sm",
        "border-cyan-500/20 shadow-lg",
        "transition-all duration-300",
        className
      )}>
        <CardContent className="p-4 space-y-4">
          {/* Timer Section */}
          <section className="bg-gray-900/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-400">Game Timer</span>
              </div>
            </div>
            <TimerControls
              isOwner={isOwner}
              isRunning={isRunning}
              timeLimit={settings.timeLimit}
              onTimerToggle={() => setRunning(!isRunning)}
            />
          </section>

          {/* Game Settings Section */}
          <section className="bg-gray-900/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3">
              <Gamepad2 className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-400">Game Settings</span>
            </div>
            <GameSettings
              isOwner={isOwner}
              isRunning={isRunning}
              settings={settings}
              onSettingsChange={(newSettings) => {
                updateSettings(newSettings)
                onSettingsChange?.(newSettings)
              }}
              onStartGame={() => setRunning(true)}
              onResetGame={() => {
                resetGame()
                onReset?.()
              }}
            />
          </section>

          {/* Player Management Section */}
          <section className="bg-gray-900/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users2 className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-400">Players</span>
              </div>
              {settings.teamMode && (
                <span className="text-xs px-2 py-1 bg-cyan-500/10 rounded-full text-cyan-400">
                  Team Mode
                </span>
              )}
            </div>
            <PlayerManagement
              isOwner={isOwner}
              players={players}
              teamMode={settings.teamMode}
              onPlayersChange={(newPlayers) => {
                updatePlayers(newPlayers)
                const addedPlayers = newPlayers.filter(p => !players.find(op => op.id === p.id))
                const removedPlayers = players.filter(p => !newPlayers.find(np => np.id === p.id))
                
                addedPlayers.forEach(player => onAddPlayer?.(player))
                removedPlayers.forEach(player => onRemovePlayer?.(player.id))
              }}
            />
          </section>
        </CardContent>
      </Card>
    </div>
  )
}