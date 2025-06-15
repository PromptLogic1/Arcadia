'use client';

import React, { useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { GameSettings } from './GameSettings';
import { PlayerManagement } from './PlayerManagement';
import { TimerControls } from './TimerControls';
import { useGameModern } from '../../hooks/useSessionGame';
import { cn } from '@/lib/utils';
import { Gamepad2, Users2, Timer, AlertCircle } from '@/components/ui/Icons';
import type { GamePlayer } from '../../types';
import type { GameSettings as GameSettingsType } from '../../types/game-settings.types';
import { useTransition } from 'react';
import { RealtimeErrorBoundary } from '@/components/error-boundaries';

interface GameControlsProps {
  className?: string;
  isOwner?: boolean;
  onAddPlayer?: (player: GamePlayer) => void;
  onRemovePlayer?: (playerId: string) => void;
  onSettingsChange?: (settings: Partial<GameSettingsType>) => void;
  onReset?: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  className,
  isOwner = false,
  onAddPlayer,
  onRemovePlayer: _onRemovePlayer,
  onSettingsChange,
  onReset,
}) => {
  const { game, updateSettings, setRunning, resetGame } = useGameModern();
  const { settings, isRunning } = game;

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
            <RealtimeErrorBoundary componentName="TimerControls">
              <TimerControls
                isOwner={isOwner}
                isRunning={isRunning}
                timeLimit={(settings.timeLimit || 3600) * 1000}
                onTimerToggle={() => setRunning(!isRunning)}
              />
            </RealtimeErrorBoundary>
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
            <RealtimeErrorBoundary componentName="PlayerManagement">
              <PlayerManagement
                isOwner={isOwner}
                players={[]} // Game state no longer manages players - this is handled by session state
                teamMode={Boolean(settings.team_mode)}
                onPlayersChange={newPlayers => {
                  // Legacy compatibility - convert GamePlayer to Player if needed
                  newPlayers.forEach(player => onAddPlayer?.(player));
                }}
              />
            </RealtimeErrorBoundary>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};
