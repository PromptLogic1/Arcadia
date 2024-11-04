import React from 'react'
import { BingoLayout, BingoSection } from '../layout/BingoLayout'
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
  ...props
}) => {
  const playerManagementProps = {
    players,
    teamNames,
    teamColors,
    teamMode,
    isOwner,
    onUpdatePlayer: props.onUpdatePlayer,
    onAddPlayer: props.onAddPlayer,
    onRemovePlayer: props.onRemovePlayer,
    onUpdateTeamName: props.onUpdateTeamName,
    onUpdateTeamColor: props.onUpdateTeamColor,
  }

  const timerControlsProps = {
    time,
    isTimerRunning,
    isOwner,
    formatTime: props.formatTime,
    onTimeChange: props.onTimeChange,
    onTimerToggle: props.onTimerToggle,
  }

  const gameSettingsProps = {
    boardSize,
    soundEnabled,
    teamMode,
    lockout,
    winConditions,
    isOwner,
    isTimerRunning,
    onBoardSizeChange: props.onBoardSizeChange,
    onSoundToggle: props.onSoundToggle,
    onTeamModeToggle: props.onTeamModeToggle,
    onLockoutToggle: props.onLockoutToggle,
    onWinConditionsChange: props.onWinConditionsChange,
    onStartBoard: props.onStartBoard,
    onResetBoard: props.onResetBoard,
  }

  return (
    <BingoLayout
      title="Game Controls"
      description="Manage players, settings, and game rules"
      delay={0.4}
      direction="right"
      contentClassName="flex flex-col gap-3 overflow-y-auto"
      fullHeight
      variant="compact"
    >
      <div className="flex flex-col gap-3 min-h-0">
        <BingoSection 
          title="Players" 
          icon={<Users className="h-4 w-4" />}
          variant="compact"
          className="bg-gradient-to-br from-gray-800/80 to-gray-800/40"
        >
          <PlayerManagement {...playerManagementProps} />
        </BingoSection>

        <BingoSection 
          title="Timer" 
          icon={<Clock className="h-4 w-4" />}
          variant="compact"
          className="bg-gradient-to-br from-gray-800/80 to-gray-800/40"
        >
          <TimerControls {...timerControlsProps} />
        </BingoSection>

        <BingoSection 
          title="Settings" 
          icon={<Settings className="h-4 w-4" />}
          variant="compact"
          className="bg-gradient-to-br from-gray-800/80 to-gray-800/40"
        >
          <GameSettings {...gameSettingsProps} />
        </BingoSection>
      </div>
    </BingoLayout>
  )
}