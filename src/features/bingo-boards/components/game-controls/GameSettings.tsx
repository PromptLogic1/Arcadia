'use client';

import React, { useState } from 'react';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import {
  Lock,
  Play,
  Pause,
  RotateCcw,
  Grid3X3,
  Volume2,
} from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import type { BoardSettings } from '@/types';

export interface GameSettingsProps {
  isOwner: boolean;
  isRunning: boolean;
  settings: BoardSettings;
  boardSize?: number;
  onSettingsChangeAction: (settings: Partial<BoardSettings>) => Promise<void>;
  onBoardSizeChange?: (size: number) => Promise<void>;
  onStartGameAction: () => Promise<void>;
  onResetGameAction: () => Promise<void>;
}

export const GameSettings: React.FC<GameSettingsProps> = ({
  isOwner,
  isRunning,
  settings,
  boardSize = 5,
  onSettingsChangeAction,
  onBoardSizeChange,
  onStartGameAction,
  onResetGameAction,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState<string | null>(null);

  const handleResetClick = () => {
    if (isOwner && !isRunning) {
      setShowResetConfirm(true);
    }
  };

  const handleResetConfirm = async () => {
    await onResetGameAction();
    setShowResetConfirm(false);
  };

  const handleWinConditionChange = async (
    conditionType: string,
    newValue: boolean
  ) => {
    setUpdatingSettings(conditionType);
    try {
      await onSettingsChangeAction({
        win_conditions: {
          line:
            conditionType === 'line'
              ? newValue
              : (settings.win_conditions?.line ?? null),
          majority:
            conditionType === 'majority'
              ? newValue
              : (settings.win_conditions?.majority ?? null),
          diagonal:
            conditionType === 'diagonal'
              ? newValue
              : (settings.win_conditions?.diagonal ?? null),
          corners:
            conditionType === 'corners'
              ? newValue
              : (settings.win_conditions?.corners ?? null),
        },
      });
    } finally {
      setUpdatingSettings(null);
    }
  };

  return (
    <>
      <div className="space-y-3">
        {/* Core Settings */}
        <div className="grid gap-2">
          {/* Board Size & Sound */}
          <div className="flex items-center gap-2">
            <Select
              value={boardSize.toString()}
              onValueChange={async value => {
                if (onBoardSizeChange) {
                  await onBoardSizeChange(parseInt(value));
                }
              }}
              disabled={!isOwner || isRunning}
            >
              <SelectTrigger className="h-9 flex-1 bg-gray-900/50">
                <Grid3X3 className="mr-2 h-4 w-4 text-cyan-400" />
                <SelectValue placeholder="Board Size" />
              </SelectTrigger>
              <SelectContent className="border border-cyan-500/20 bg-gray-800">
                {[3, 4, 5, 6].map(size => (
                  <SelectItem
                    key={size}
                    value={size.toString()}
                    className="hover:bg-cyan-500/10 focus:bg-cyan-500/20"
                  >
                    {size}x{size} Board
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex h-9 items-center gap-2 rounded-md bg-gray-900/50 px-3">
              <Volume2 className="h-4 w-4 text-cyan-400" />
              <Switch
                checked={settings.sound_enabled ?? false}
                onCheckedChange={checked =>
                  onSettingsChangeAction({ sound_enabled: checked })
                }
                disabled={!isOwner}
              />
            </div>
          </div>

          {/* Game Mode Settings */}
          <div className="flex items-center gap-2">
            <div className="flex h-9 flex-1 items-center justify-between rounded-md bg-gray-900/50 px-3">
              <Label className="text-sm text-cyan-200">Team Mode</Label>
              <Switch
                checked={settings.team_mode ?? false}
                onCheckedChange={checked =>
                  onSettingsChangeAction({ team_mode: checked })
                }
                disabled={!isOwner || isRunning}
              />
            </div>

            <div className="flex h-9 flex-1 items-center justify-between rounded-md bg-gray-900/50 px-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-cyan-400" />
                <Label className="text-sm text-cyan-200">Lockout</Label>
              </div>
              <Switch
                checked={settings.lockout ?? false}
                onCheckedChange={checked =>
                  onSettingsChangeAction({ lockout: checked })
                }
                disabled={
                  !isOwner || isRunning || (settings.team_mode ?? false)
                }
              />
            </div>
          </div>

          {/* Win Conditions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                !isRunning &&
                isOwner &&
                !updatingSettings &&
                handleWinConditionChange(
                  'line',
                  !(settings.win_conditions?.line ?? false)
                )
              }
              className={cn(
                'flex h-9 flex-1 items-center justify-between px-3',
                'rounded-md transition-all duration-200',
                'hover:bg-gray-700/30',
                'focus:ring-2 focus:ring-cyan-500/50 focus:outline-none',
                settings.win_conditions?.line
                  ? 'bg-cyan-500/10'
                  : 'bg-gray-900/50',
                updatingSettings === 'line' && 'cursor-wait opacity-50'
              )}
              disabled={!isOwner || isRunning || updatingSettings !== null}
            >
              <span className="text-sm text-cyan-200">Line Victory</span>
              {updatingSettings === 'line' ? (
                <div className="h-2 w-2 animate-spin rounded-full border border-cyan-400 border-t-transparent" />
              ) : (
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    settings.win_conditions?.line
                      ? 'bg-cyan-400'
                      : 'bg-gray-600'
                  )}
                />
              )}
            </button>

            <button
              onClick={() =>
                !isRunning &&
                isOwner &&
                !updatingSettings &&
                handleWinConditionChange(
                  'majority',
                  !(settings.win_conditions?.majority ?? false)
                )
              }
              className={cn(
                'flex h-9 flex-1 items-center justify-between px-3',
                'rounded-md transition-all duration-200',
                'hover:bg-gray-700/30',
                'focus:ring-2 focus:ring-cyan-500/50 focus:outline-none',
                settings.win_conditions?.majority
                  ? 'bg-cyan-500/10'
                  : 'bg-gray-900/50',
                updatingSettings === 'majority' && 'cursor-wait opacity-50'
              )}
              disabled={!isOwner || isRunning || updatingSettings !== null}
            >
              <span className="text-sm text-cyan-200">Majority Rule</span>
              {updatingSettings === 'majority' ? (
                <div className="h-2 w-2 animate-spin rounded-full border border-cyan-400 border-t-transparent" />
              ) : (
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    settings.win_conditions?.majority
                      ? 'bg-cyan-400'
                      : 'bg-gray-600'
                  )}
                />
              )}
            </button>

            <button
              onClick={() =>
                !isRunning &&
                isOwner &&
                !updatingSettings &&
                handleWinConditionChange(
                  'diagonal',
                  !(settings.win_conditions?.diagonal ?? false)
                )
              }
              className={cn(
                'flex h-9 flex-1 items-center justify-between px-3',
                'rounded-md transition-all duration-200',
                'hover:bg-gray-700/30',
                'focus:ring-2 focus:ring-cyan-500/50 focus:outline-none',
                settings.win_conditions?.diagonal
                  ? 'bg-cyan-500/10'
                  : 'bg-gray-900/50',
                updatingSettings === 'diagonal' && 'cursor-wait opacity-50'
              )}
              disabled={!isOwner || isRunning || updatingSettings !== null}
            >
              <span className="text-sm text-cyan-200">Diagonal</span>
              {updatingSettings === 'diagonal' ? (
                <div className="h-2 w-2 animate-spin rounded-full border border-cyan-400 border-t-transparent" />
              ) : (
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    settings.win_conditions?.diagonal
                      ? 'bg-cyan-400'
                      : 'bg-gray-600'
                  )}
                />
              )}
            </button>

            <button
              onClick={() =>
                !isRunning &&
                isOwner &&
                !updatingSettings &&
                handleWinConditionChange(
                  'corners',
                  !(settings.win_conditions?.corners ?? false)
                )
              }
              className={cn(
                'flex h-9 flex-1 items-center justify-between px-3',
                'rounded-md transition-all duration-200',
                'hover:bg-gray-700/30',
                'focus:ring-2 focus:ring-cyan-500/50 focus:outline-none',
                settings.win_conditions?.corners
                  ? 'bg-cyan-500/10'
                  : 'bg-gray-900/50',
                updatingSettings === 'corners' && 'cursor-wait opacity-50'
              )}
              disabled={!isOwner || isRunning || updatingSettings !== null}
            >
              <span className="text-sm text-cyan-200">Corners</span>
              {updatingSettings === 'corners' ? (
                <div className="h-2 w-2 animate-spin rounded-full border border-cyan-400 border-t-transparent" />
              ) : (
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    settings.win_conditions?.corners
                      ? 'bg-cyan-400'
                      : 'bg-gray-600'
                  )}
                />
              )}
            </button>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleResetClick}
            disabled={!isOwner || isRunning}
            variant="secondary"
            className={cn(
              'h-9',
              'bg-gray-900/50 hover:bg-gray-800',
              'border-cyan-500/20 hover:border-cyan-500/40'
            )}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button
            onClick={onStartGameAction}
            disabled={!isOwner}
            className={cn(
              'h-9',
              isRunning
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            )}
          >
            {isRunning ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="border-cyan-500/20 bg-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-cyan-100">
              Reset Game?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will clear all progress and reset the game to its initial
              state. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetConfirm}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Reset Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
