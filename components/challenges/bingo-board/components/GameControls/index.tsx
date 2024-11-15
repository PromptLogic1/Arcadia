import React, { useState } from 'react'
import { BingoLayout, BingoSection } from '../layout/BingoLayout'
import { 
  Clock, 
  Users, 
  Settings, 
  ChevronDown 
} from 'lucide-react'
import { PlayerManagement } from './PlayerManagement'
import { TimerControls } from './TimerControls'
import { GameSettings } from './GameSettings'
import type { Player } from '../../types/types'
import { cn } from '@/lib/utils'
import { useLayout } from '../../hooks/useLayout'

interface GameControlsProps {
  boardId: string
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
  boardId,
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
  onStartBoard,
  ...props
}) => {
  const [sectionsOpen, setSectionsOpen] = useState({
    players: true,
    settings: true
  })

  const { isCollapsed, getResponsiveSpacing } = useLayout()
  const spacing = getResponsiveSpacing(16)

  // Props objects for child components
  const playerManagementProps = {
    boardId,
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
    onStartBoard,
    onResetBoard: props.onResetBoard,
    onTimerToggle: props.onTimerToggle,
  }

  const CollapsibleSection = ({ 
    id, 
    title, 
    icon, 
    children, 
    summary 
  }: { 
    id: 'players' | 'settings'
    title: string
    icon: React.ReactNode
    children: React.ReactNode
    summary: string
  }) => (
    <div className="relative">
      <button
        onClick={() => setSectionsOpen(prev => ({ ...prev, [id]: !prev[id] }))}
        className="w-full text-left focus:outline-none"
      >
        <BingoSection 
          title={title} 
          icon={icon}
          variant="compact"
          className={cn(
            "bg-gradient-to-br from-gray-800/80 to-gray-800/40",
            "hover:bg-gray-800/60 transition-colors duration-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-cyan-300">{summary}</span>
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-cyan-400 transform transition-transform duration-200",
                sectionsOpen[id] && "rotate-180"
              )} 
            />
          </div>
        </BingoSection>
      </button>
      <div 
        className={cn(
          "grid transition-[grid-template-rows] duration-200",
          sectionsOpen[id] ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="pt-2">
            <div className="p-3 bg-gray-800/50 rounded-lg border border-cyan-500/20">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <BingoLayout
      title="Game Controls"
      description="Manage players, settings, and game rules"
      delay={0.4}
      direction="right"
      contentClassName={cn(
        "flex flex-col",
        isCollapsed ? "gap-2" : "gap-3",
        "overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent"
      )}
      fullHeight
      variant="compact"
    >
      <div className="grid grid-cols-1 auto-rows-min" style={{ gap: spacing.gap }}>
        {/* Timer Section */}
        <BingoSection 
          title="Timer" 
          icon={<Clock className="h-4 w-4" />}
          variant="compact"
          className="bg-gradient-to-br from-gray-800/80 to-gray-800/40"
        >
          <TimerControls {...timerControlsProps} />
        </BingoSection>

        {/* Players Section */}
        <CollapsibleSection
          id="players"
          title="Players"
          icon={<Users className="h-4 w-4" />}
          summary={`${players.length} Players`}
        >
          <PlayerManagement {...playerManagementProps} />
        </CollapsibleSection>

        {/* Settings Section */}
        <CollapsibleSection
          id="settings"
          title="Settings"
          icon={<Settings className="h-4 w-4" />}
          summary="Game Configuration"
        >
          <GameSettings {...gameSettingsProps} />
        </CollapsibleSection>
      </div>
    </BingoLayout>
  )
}