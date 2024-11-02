import React from 'react'
import { motion } from 'framer-motion'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Clock, Users, Settings } from 'lucide-react'
import { PlayerManagement } from './PlayerManagement'
import { TimerControls } from './TimerControls'
import { GameSettings } from './GameSettings'
import type { Player } from '../shared/types'

interface GameControlsProps {
  players: Player[]
  teamNames: [string, string]
  teamColors: [string, string]
  teamMode: boolean
  time: number
  isTimerRunning: boolean
  boardSize: number
  soundEnabled: boolean
  lockout: boolean
  winConditions: {
    line: boolean
    majority: boolean
  }
  isOwner: boolean
  onUpdatePlayer: (index: number, name: string, color: string, team?: number) => void
  onAddPlayer: () => void
  onRemovePlayer: (index: number) => void
  onUpdateTeamName: (index: number, name: string) => void
  onUpdateTeamColor: (index: number, color: string) => void
  onTimeChange: (timeString: string) => void
  onTimerToggle: () => void
  onBoardSizeChange: (size: number) => void
  onSoundToggle: (enabled: boolean) => void
  onTeamModeToggle: (enabled: boolean) => void
  onLockoutToggle: (enabled: boolean) => void
  onWinConditionsChange: (conditions: { line: boolean; majority: boolean }) => void
  onStartBoard: () => void
  onResetBoard: () => void
  formatTime: (seconds: number) => string
}

export const GameControls: React.FC<GameControlsProps> = ({
  players,
  teamNames,
  teamColors,
  teamMode,
  time,
  isTimerRunning,
  boardSize,
  soundEnabled,
  lockout,
  winConditions,
  isOwner,
  onUpdatePlayer,
  onAddPlayer,
  onRemovePlayer,
  onUpdateTeamName,
  onUpdateTeamColor,
  onTimeChange,
  onTimerToggle,
  onBoardSizeChange,
  onSoundToggle,
  onTeamModeToggle,
  onLockoutToggle,
  onWinConditionsChange,
  onStartBoard,
  onResetBoard,
  formatTime,
}) => {
  return (
    <motion.div
      className="w-full h-full"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="h-full bg-gray-800 border-2 border-cyan-500 flex flex-col">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-cyan-400">Game Controls</CardTitle>
          <CardDescription className="text-cyan-300">
            Manage players, settings, and game rules
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 flex-grow overflow-y-auto">
          <section>
            <h3 className="text-xl font-semibold text-cyan-400 flex items-center mb-4">
              <Users className="mr-2 h-5 w-5" />
              Players
            </h3>
            <PlayerManagement
              players={players}
              teamNames={teamNames}
              teamColors={teamColors}
              teamMode={teamMode}
              isOwner={isOwner}
              onUpdatePlayer={onUpdatePlayer}
              onAddPlayer={onAddPlayer}
              onRemovePlayer={onRemovePlayer}
              onUpdateTeamName={onUpdateTeamName}
              onUpdateTeamColor={onUpdateTeamColor}
            />
          </section>

          <section>
            <h3 className="text-xl font-semibold text-cyan-400 flex items-center mb-4">
              <Clock className="mr-2 h-5 w-5" />
              Timer
            </h3>
            <TimerControls
              time={time}
              isTimerRunning={isTimerRunning}
              isOwner={isOwner}
              formatTime={formatTime}
              onTimeChange={onTimeChange}
              onTimerToggle={onTimerToggle}
            />
          </section>

          <section>
            <h3 className="text-xl font-semibold text-cyan-400 flex items-center mb-4">
              <Settings className="mr-2 h-5 w-5" />
              Settings
            </h3>
            <GameSettings
              boardSize={boardSize}
              soundEnabled={soundEnabled}
              teamMode={teamMode}
              lockout={lockout}
              winConditions={winConditions}
              isOwner={isOwner}
              onBoardSizeChange={onBoardSizeChange}
              onSoundToggle={onSoundToggle}
              onTeamModeToggle={onTeamModeToggle}
              onLockoutToggle={onLockoutToggle}
              onWinConditionsChange={onWinConditionsChange}
              onStartBoard={onStartBoard}
              onResetBoard={onResetBoard}
            />
          </section>
        </CardContent>
      </Card>
    </motion.div>
  )
}