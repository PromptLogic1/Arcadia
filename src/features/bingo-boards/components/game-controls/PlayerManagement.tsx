'use client';

import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { UserPlus, UserMinus, User, Users2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GamePlayer } from '../../types';
import { PLAYER_CONSTANTS } from '../../types/player-management.constants';
import { useSession } from '../../hooks/useSession';
import { useSessionQueue } from '../../hooks/useSessionQueue';

interface PlayerManagementProps {
  isOwner: boolean;
  players: GamePlayer[];
  teamMode: boolean;
  onPlayersChange: (players: GamePlayer[]) => void;
  sessionId?: string;
}

export const PlayerManagement: React.FC<PlayerManagementProps> = ({
  isOwner,
  players,
  teamMode,
  onPlayersChange,
  sessionId = '',
}) => {
  // States (now managed by modern hook)
  // Removed local state - using queue.showInviteDialog, queue.showQueueDialog, queue.inviteLink

  // Hooks
  const session = useSession({
    boardId: sessionId,
    sessionId: sessionId,
    _game: 'All Games',
  });
  const queue = useSessionQueue(sessionId);

  // Generate invite link (now using modern hook)
  const handleGenerateInviteLink = useCallback(() => {
    queue.generateInviteLink();
  }, [queue]);

  // Copy invite link (now using modern hook)
  const handleCopyInviteLink = useCallback(() => {
    queue.copyInviteLink();
  }, [queue]);

  return (
    <div className="space-y-4">
      {/* Header with Player Count and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-400">
            Players ({players.length}/{PLAYER_CONSTANTS.LIMITS.MAX_PLAYERS})
          </span>
          {teamMode && (
            <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-300">
              Team Mode
            </Badge>
          )}
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <Button
              onClick={handleGenerateInviteLink}
              variant="outline"
              size="sm"
              disabled={queue.isGeneratingLink}
              className={cn(
                'h-8 px-3',
                'bg-cyan-500/10 hover:bg-cyan-500/20',
                'border-cyan-500/20 hover:border-cyan-500/40',
                'text-cyan-400'
              )}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {queue.isGeneratingLink ? 'Generating...' : 'Invite Players'}
            </Button>
            <Button
              onClick={() => queue.setShowQueueDialog(true)}
              variant="outline"
              size="sm"
              className={cn(
                'h-8 px-3',
                'bg-cyan-500/10 hover:bg-cyan-500/20',
                'border-cyan-500/20 hover:border-cyan-500/40',
                'text-cyan-400'
              )}
            >
              <Users2 className="mr-2 h-4 w-4" />
              View Queue ({queue.queueEntries.length})
            </Button>
          </div>
        )}
      </div>

      {/* Player List */}
      <div className="grid grid-cols-1 gap-3">
        {players.map((player, index) => (
          <div
            key={player.id}
            className={cn(
              'flex flex-col gap-2 p-3',
              'rounded-lg bg-gray-900/50',
              'border border-cyan-500/20',
              'transition-all duration-200',
              'hover:border-cyan-500/30',
              'group'
            )}
          >
            {/* Player Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {index === 0 && <Crown className="h-4 w-4 text-yellow-400" />}
                <span
                  className={cn(
                    'text-xs font-medium',
                    player.color.replace('bg-', 'text-')
                  )}
                >
                  Player {index + 1}
                </span>
              </div>
              {isOwner && index !== 0 && (
                <Button
                  onClick={() =>
                    onPlayersChange(players.filter(p => p.id !== player.id))
                  }
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-6 w-6 p-0',
                    'opacity-0 group-hover:opacity-100',
                    'hover:bg-red-500/10 hover:text-red-400',
                    'transition-all duration-200'
                  )}
                >
                  <UserMinus className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Player Info */}
            <div className="flex items-center gap-3">
              <Avatar
                className={cn(
                  'h-8 w-8 shrink-0 border-2',
                  'transition-colors duration-200'
                )}
                style={{
                  borderColor: `rgb(var(--${player.color.replace('bg-', '')}))`,
                }}
              >
                <AvatarImage src={player.avatarUrl} alt={player.name} />
                <AvatarFallback className="bg-gray-900/50">
                  <User className="h-4 w-4 text-gray-400" />
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-1 items-center gap-2">
                <Input
                  value={player.name}
                  onChange={e => {
                    const newPlayers = [...players];
                    newPlayers[index] = { ...player, name: e.target.value };
                    onPlayersChange(newPlayers);
                  }}
                  disabled={
                    !isOwner &&
                    player.id !== session.sessionState.currentPlayer?.id
                  }
                  className={cn(
                    'h-8 bg-gray-800/50 text-sm',
                    'border-gray-700/50 focus:border-cyan-500/50',
                    player.hoverColor,
                    'transition-colors duration-200'
                  )}
                  maxLength={20}
                />

                {/* Color Selection */}
                <Select
                  value={player.color}
                  onValueChange={color => {
                    const newPlayers = [...players];
                    newPlayers[index] = {
                      ...player,
                      color,
                      hoverColor: `hover:${color.replace('bg-', '')}`,
                    };
                    onPlayersChange(newPlayers);
                  }}
                  disabled={
                    !isOwner &&
                    player.id !== session.sessionState.currentPlayer?.id
                  }
                >
                  <SelectTrigger
                    className={cn(
                      'h-8 w-[100px]',
                      'border-gray-700/50 bg-gray-800/50',
                      'focus:border-cyan-500/50',
                      'transition-colors duration-200'
                    )}
                  >
                    <div className={cn('h-4 w-4 rounded-full', player.color)} />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAYER_CONSTANTS.TEAMS.DEFAULT_COLORS.map(color => (
                      <SelectItem
                        key={color}
                        value={color}
                        className={cn(
                          'flex items-center gap-2',
                          'cursor-pointer',
                          'hover:bg-gray-800/50',
                          'transition-colors duration-200'
                        )}
                      >
                        <div className={cn('h-4 w-4 rounded-full', color)} />
                        <span>{color.split('-')[1]}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Team Selection for Team Mode */}
            {teamMode && (
              <Select
                value={player.team.toString()}
                onValueChange={team => {
                  const newPlayers = [...players];
                  newPlayers[index] = { ...player, team: parseInt(team) };
                  onPlayersChange(newPlayers);
                }}
                disabled={
                  !isOwner &&
                  player.id !== session.sessionState.currentPlayer?.id
                }
              >
                <SelectTrigger
                  className={cn(
                    'h-8',
                    'border-gray-700/50 bg-gray-800/50',
                    'focus:border-cyan-500/50',
                    'transition-colors duration-200'
                  )}
                >
                  <span className="text-xs">Team {player.team + 1}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Team 1</SelectItem>
                  <SelectItem value="1">Team 2</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
      </div>

      {/* Invite Dialog */}
      <AlertDialog
        open={queue.showInviteDialog}
        onOpenChange={queue.setShowInviteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invite Players</AlertDialogTitle>
            <AlertDialogDescription>
              Share this link with players you want to invite:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <Input value={queue.inviteLink} readOnly />
            <Button
              onClick={handleCopyInviteLink}
              disabled={queue.isCopyingLink}
            >
              {queue.isCopyingLink ? 'Copying...' : 'Copy'}
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Queue Dialog */}
      <AlertDialog
        open={queue.showQueueDialog}
        onOpenChange={queue.setShowQueueDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Player Queue</AlertDialogTitle>
            <AlertDialogDescription>
              Players waiting to join:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            {queue.waitingEntries.map(entry => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg bg-gray-800/50 p-3"
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{entry.player_name || 'Unknown Player'}</span>
                  <div className={cn('h-3 w-3 rounded-full', entry.color)} />
                </div>
                {isOwner && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => queue.acceptPlayer(entry.id)}
                      size="sm"
                      variant="default"
                      disabled={queue.isAcceptingPlayer}
                    >
                      Accept
                    </Button>
                    <Button
                      onClick={() => queue.rejectPlayer(entry.id)}
                      size="sm"
                      variant="destructive"
                      disabled={queue.isRejectingPlayer}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {queue.waitingEntries.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">
                No players in queue
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

PlayerManagement.displayName = 'PlayerManagement';
