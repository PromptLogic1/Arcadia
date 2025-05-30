'use client';

import React, { useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { GameSettings } from './GameSettings';
import { PlayerManagement } from './PlayerManagement';
import { TimerControls } from './TimerControls';
import { useGameState } from '../../hooks/useGameState';
import { cn } from '@/lib/utils';
import { Gamepad2, Users2, Timer, AlertCircle } from 'lucide-react';
import type { Player } from '../../types/types';
import type { GameSettings as GameSettingsType } from '../../types/game-settings.types';
import { useTransition } from 'react';

interface GameControlsProps {
  className?: string;
  isOwner?: boolean;
  onAddPlayer?: (player: Player) => void;
  onRemovePlayer?: (playerId: string) => void;
  onSettingsChange?: (settings: Partial<GameSettingsType>) => void;
  onReset?: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  className,
  isOwner = false,
  onAddPlayer,
  onRemovePlayer,
  onSettingsChange,
  onReset,
}) => {
  const {
    settings,
    isRunning,
    players,
    updateSettings,
    setRunning,
    resetGame,
    updatePlayers,
  } = useGameState();

  const [_isPending, startTransition] = useTransition();

  const handleSettingsChange = useCallback(
    async (settings: Partial<GameSettingsType>) => {
      startTransition(async () => {
        updateSettings(settings);
        onSettingsChange?.(settings);
      });
    },
    [updateSettings, onSettingsChange]
  );

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Status Bar */}
      {(isRunning || !isOwner) && (
        <div className="flex items-center justify-between rounded-lg border border-cyan-500/20 bg-gray-800/95 px-4 py-2">
          {!isOwner && (
            <div className="flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-amber-400">Viewer Mode</span>
            </div>
          )}
          {isRunning && (
            <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1">
              <span className="text-xs text-emerald-400">Game in Progress</span>
            </div>
          )}
        </div>
      )}

      {/* Main Controls Container */}
      <Card
        className={cn(
          'flex-1 bg-gray-800/95 backdrop-blur-sm',
          'border-cyan-500/20 shadow-lg',
          'transition-all duration-300',
          className
        )}
      >
        <CardContent className="space-y-4 p-4">
          {/* Timer Section */}
          <section className="rounded-lg bg-gray-900/50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-400">
                  Game Timer
                </span>
              </div>
            </div>
            <TimerControls
              isOwner={isOwner}
              isRunning={isRunning}
              timeLimit={(settings.timeLimit || 3600) * 1000}
              onTimerToggle={() => setRunning(!isRunning)}
            />
          </section>

          {/* Game Settings Section */}
          <section className="rounded-lg bg-gray-900/50 p-3">
            <div className="mb-3 flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-400">
                Game Settings
              </span>
            </div>
            <GameSettings
              isOwner={isOwner}
              isRunning={isRunning}
              settings={settings}
              onSettingsChangeAction={handleSettingsChange}
              onStartGameAction={async () =>
                startTransition(() => setRunning(true))
              }
              onResetGameAction={async () =>
                startTransition(() => {
                  resetGame();
                  onReset?.();
                })
              }
            />
          </section>

          {/* Player Management Section */}
          <section className="rounded-lg bg-gray-900/50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users2 className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-400">
                  Players
                </span>
              </div>
              {Boolean(settings.team_mode) && (
                <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-xs text-cyan-400">
                  Team Mode
                </span>
              )}
            </div>
            <PlayerManagement
              isOwner={isOwner}
              players={players}
              teamMode={Boolean(settings.team_mode)}
              onPlayersChange={newPlayers => {
                updatePlayers(newPlayers);
                const addedPlayers = newPlayers.filter(
                  p => !players.find(op => op.id === p.id)
                );
                const removedPlayers = players.filter(
                  p => !newPlayers.find(np => np.id === p.id)
                );

                addedPlayers.forEach(player => onAddPlayer?.(player));
                removedPlayers.forEach(player => onRemovePlayer?.(player.id));
              }}
            />
          </section>
        </CardContent>
      </Card>
    </div>
  );
};
