'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lock, Play, Pause, RotateCcw, Grid3x3, Volume2 } from 'lucide-react';
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
  return (
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
              <Grid3x3 className="mr-2 h-4 w-4 text-cyan-400" />
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
              disabled={!isOwner || isRunning || (settings.team_mode ?? false)}
            />
          </div>
        </div>

        {/* Win Conditions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              !isRunning &&
              isOwner &&
              onSettingsChangeAction({
                win_conditions: {
                  line: !(settings.win_conditions?.line ?? false),
                  majority: settings.win_conditions?.majority ?? null,
                  diagonal: settings.win_conditions?.diagonal ?? null,
                  corners: settings.win_conditions?.corners ?? null,
                },
              })
            }
            className={cn(
              'flex h-9 flex-1 items-center justify-between px-3',
              'rounded-md transition-all duration-200',
              'hover:bg-gray-700/30',
              'focus:outline-none focus:ring-2 focus:ring-cyan-500/50',
              settings.win_conditions?.line
                ? 'bg-cyan-500/10'
                : 'bg-gray-900/50'
            )}
            disabled={!isOwner || isRunning}
          >
            <span className="text-sm text-cyan-200">Line Victory</span>
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                settings.win_conditions?.line ? 'bg-cyan-400' : 'bg-gray-600'
              )}
            />
          </button>

          <button
            onClick={() =>
              !isRunning &&
              isOwner &&
              onSettingsChangeAction({
                win_conditions: {
                  line: settings.win_conditions?.line ?? null,
                  majority: !(settings.win_conditions?.majority ?? false),
                  diagonal: settings.win_conditions?.diagonal ?? null,
                  corners: settings.win_conditions?.corners ?? null,
                },
              })
            }
            className={cn(
              'flex h-9 flex-1 items-center justify-between px-3',
              'rounded-md transition-all duration-200',
              'hover:bg-gray-700/30',
              'focus:outline-none focus:ring-2 focus:ring-cyan-500/50',
              settings.win_conditions?.majority
                ? 'bg-cyan-500/10'
                : 'bg-gray-900/50'
            )}
            disabled={!isOwner || isRunning}
          >
            <span className="text-sm text-cyan-200">Majority Rule</span>
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                settings.win_conditions?.majority
                  ? 'bg-cyan-400'
                  : 'bg-gray-600'
              )}
            />
          </button>

          <button
            onClick={() =>
              !isRunning &&
              isOwner &&
              onSettingsChangeAction({
                win_conditions: {
                  line: settings.win_conditions?.line ?? null,
                  majority: settings.win_conditions?.majority ?? null,
                  diagonal: !(settings.win_conditions?.diagonal ?? false),
                  corners: settings.win_conditions?.corners ?? null,
                },
              })
            }
            className={cn(
              'flex h-9 flex-1 items-center justify-between px-3',
              'rounded-md transition-all duration-200',
              'hover:bg-gray-700/30',
              'focus:outline-none focus:ring-2 focus:ring-cyan-500/50',
              settings.win_conditions?.diagonal
                ? 'bg-cyan-500/10'
                : 'bg-gray-900/50'
            )}
            disabled={!isOwner || isRunning}
          >
            <span className="text-sm text-cyan-200">Diagonal</span>
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                settings.win_conditions?.diagonal
                  ? 'bg-cyan-400'
                  : 'bg-gray-600'
              )}
            />
          </button>

          <button
            onClick={() =>
              !isRunning &&
              isOwner &&
              onSettingsChangeAction({
                win_conditions: {
                  line: settings.win_conditions?.line ?? null,
                  majority: settings.win_conditions?.majority ?? null,
                  diagonal: settings.win_conditions?.diagonal ?? null,
                  corners: !(settings.win_conditions?.corners ?? false),
                },
              })
            }
            className={cn(
              'flex h-9 flex-1 items-center justify-between px-3',
              'rounded-md transition-all duration-200',
              'hover:bg-gray-700/30',
              'focus:outline-none focus:ring-2 focus:ring-cyan-500/50',
              settings.win_conditions?.corners
                ? 'bg-cyan-500/10'
                : 'bg-gray-900/50'
            )}
            disabled={!isOwner || isRunning}
          >
            <span className="text-sm text-cyan-200">Corners</span>
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                settings.win_conditions?.corners ? 'bg-cyan-400' : 'bg-gray-600'
              )}
            />
          </button>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={onResetGameAction}
          disabled={!isOwner || isRunning}
          variant="outline"
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
  );
};
