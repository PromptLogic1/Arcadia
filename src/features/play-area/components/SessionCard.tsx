'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Users,
  Clock,
  Play,
  Crown,
  Eye,
  Grid3X3,
  Calendar,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { BaseErrorBoundary } from '@/components/error-boundaries';

// Types
import type { BingoSession } from '../../../services/sessions.service';

interface SessionCardProps {
  session: BingoSession & {
    current_player_count?: number;
    max_players?: number;
    board?: {
      title?: string;
      description?: string;
      difficulty?: string;
      size?: number;
      game_type?: string;
    };
    host?: {
      display_name?: string;
      user?: {
        avatar_url?: string;
      };
    };
  };
  onJoin: () => void;
  currentUserId?: string;
  className?: string;
}

const DIFFICULTY_COLORS = {
  beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  easy: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  hard: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  expert: 'bg-red-500/20 text-red-400 border-red-500/30',
} as const;

const STATUS_COLORS = {
  waiting: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  completed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
} as const;

type StatusColorKey = keyof typeof STATUS_COLORS;

/**
 * Session Card Component
 * Displays session information in a card format with join functionality
 */
export function SessionCard({
  session,
  onJoin,
  currentUserId,
  className,
}: SessionCardProps) {
  const isHost = session.host_id === currentUserId;
  const currentCount = session.current_player_count || 0;
  const maxCount = session.max_players || session.settings?.max_players || 8;
  const isFull = currentCount >= maxCount;
  const canJoin = !isHost && !isFull && session.status === 'waiting';

  const difficultyColor = session.board?.difficulty && session.board.difficulty in DIFFICULTY_COLORS
    ? DIFFICULTY_COLORS[session.board.difficulty as keyof typeof DIFFICULTY_COLORS]
    : 'bg-gray-500/20 text-gray-400 border-gray-500/30';

  const statusColor =
    session.status && session.status in STATUS_COLORS
      ? STATUS_COLORS[session.status as StatusColorKey]
      : 'bg-gray-500/20 text-gray-400 border-gray-500/30';

  const createdAt = session.created_at ? new Date(session.created_at) : null;
  const timeAgo = createdAt
    ? formatDistanceToNow(createdAt, { addSuffix: true })
    : 'Unknown';

  return (
    <BaseErrorBoundary level="component">
      <Card
        className={cn(
          'border-gray-700 bg-gray-800/50 transition-all duration-200 hover:border-cyan-500/50',
          'hover:shadow-lg hover:shadow-cyan-500/10',
          className
        )}
      >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="mb-2 truncate text-lg text-gray-100">
              {session.board?.title || 'Untitled Board'}
            </CardTitle>

            <div className="mb-3 flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={cn('text-xs', difficultyColor)}
              >
                {session.board?.difficulty || 'Unknown'}
              </Badge>

              <Badge variant="outline" className={cn('text-xs', statusColor)}>
                {session.status === 'waiting'
                  ? 'Waiting for Players'
                  : session.status === 'active'
                    ? 'In Progress'
                    : session.status || 'Unknown'}
              </Badge>

              <Badge
                variant="outline"
                className="border-gray-600 text-xs text-gray-300"
              >
                <Grid3X3 className="mr-1 h-3 w-3" />
                {session.board?.size || 5}×{session.board?.size || 5}
              </Badge>
            </div>

            {session.board?.description && (
              <p className="mb-3 line-clamp-2 text-sm text-gray-400">
                {session.board.description}
              </p>
            )}
          </div>

          <div className="ml-4 flex flex-col items-end gap-2">
            {isHost && (
              <Badge
                variant="outline"
                className="border-purple-500/30 bg-purple-500/20 text-xs text-purple-400"
              >
                <Crown className="mr-1 h-3 w-3" />
                Host
              </Badge>
            )}

            <div className="text-right">
              <div className="mb-1 flex items-center text-sm text-gray-400">
                <Users className="mr-1 h-4 w-4" />
                <span
                  className={cn(
                    'font-medium',
                    isFull ? 'text-red-400' : 'text-gray-300'
                  )}
                >
                  {currentCount}/{maxCount}
                </span>
              </div>

              {session.status === 'active' && (
                <div className="flex items-center text-sm text-green-400">
                  <Activity className="mr-1 h-4 w-4" />
                  Live
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between">
          {/* Host Information */}
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.host?.user?.avatar_url} />
              <AvatarFallback className="bg-gray-700 text-xs text-gray-300">
                {session.host?.display_name?.[0]?.toUpperCase() || 'H'}
              </AvatarFallback>
            </Avatar>

            <div>
              <p className="text-sm font-medium text-gray-200">
                {session.host?.display_name || 'Unknown Host'}
              </p>
              <div className="flex items-center text-xs text-gray-400">
                <Calendar className="mr-1 h-3 w-3" />
                {timeAgo}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {session.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                disabled
              >
                <Eye className="mr-1 h-4 w-4" />
                Spectate
              </Button>
            )}

            {canJoin && (
              <Button
                onClick={onJoin}
                size="sm"
                className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600"
              >
                <Play className="mr-1 h-4 w-4" />
                Join Game
              </Button>
            )}

            {isHost && (
              <Button
                onClick={onJoin}
                size="sm"
                variant="outline"
                className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
              >
                <Crown className="mr-1 h-4 w-4" />
                Manage
              </Button>
            )}

            {isFull && !isHost && (
              <Button
                disabled
                size="sm"
                variant="outline"
                className="border-gray-600 text-gray-500"
              >
                <Users className="mr-1 h-4 w-4" />
                Full
              </Button>
            )}
          </div>
        </div>

        {/* Game Category */}
        {session.board?.game_type &&
          session.board.game_type !== 'All Games' && (
            <div className="mt-3 border-t border-gray-700 pt-3">
              <div className="flex items-center text-sm text-gray-400">
                <span className="mr-2 font-medium text-gray-300">Game:</span>
                {session.board.game_type}
              </div>
            </div>
          )}

        {/* Session Settings Summary */}
        {session.settings && (
          <div className="mt-3 border-t border-gray-700 pt-3">
            <div className="flex flex-wrap gap-4 text-xs text-gray-400">
              {session.settings.time_limit && (
                <div className="flex items-center">
                  <Clock className="mr-1 h-3 w-3" />
                  {Math.floor(session.settings.time_limit / 60)}min limit
                </div>
              )}

              {session.settings.allow_spectators && (
                <div className="flex items-center">
                  <Eye className="mr-1 h-3 w-3" />
                  Spectators allowed
                </div>
              )}

              {session.settings.require_approval && (
                <div className="flex items-center text-yellow-400">
                  <Crown className="mr-1 h-3 w-3" />
                  Host approval required
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </BaseErrorBoundary>
  );
}
