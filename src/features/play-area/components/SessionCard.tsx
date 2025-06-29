'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  OptimizedAvatar as Avatar,
  OptimizedAvatarFallback as AvatarFallback,
} from '@/components/ui/OptimizedAvatar';
import {
  Users,
  Clock,
  Play,
  Crown,
  Grid3X3,
  Calendar,
  Activity,
  Eye,
} from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import { formatRelativeFallback } from '@/lib/date-utils-lazy';
import { BaseErrorBoundary } from '@/components/error-boundaries';

// Types
import type { SessionWithStats } from '../../../services/sessions.service';

interface SessionCardProps {
  session: SessionWithStats;
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
type DifficultyColorKey = keyof typeof DIFFICULTY_COLORS;

// Type guards for safe color mapping
function isValidDifficulty(value: unknown): value is DifficultyColorKey {
  return typeof value === 'string' && value in DIFFICULTY_COLORS;
}

function isValidStatus(value: unknown): value is StatusColorKey {
  return typeof value === 'string' && value in STATUS_COLORS;
}

/**
 * Session Card Component
 * Displays session information in a card format with join functionality
 */
const SessionCard = React.memo<SessionCardProps>(
  ({ session, onJoin, currentUserId, className }) => {
    const isHost = session.host_id === currentUserId;
    const currentCount = session.current_player_count || 0;
    const maxCount = session.max_players || session.settings?.max_players || 8;
    const isFull = currentCount >= maxCount;
    const canJoin = !isHost && !isFull && session.status === 'waiting';

    const difficultyColor = isValidDifficulty(session.board_difficulty)
      ? DIFFICULTY_COLORS[session.board_difficulty]
      : 'bg-gray-500/20 text-gray-400 border-gray-500/30';

    const statusColor = isValidStatus(session.status)
      ? STATUS_COLORS[session.status]
      : 'bg-gray-500/20 text-gray-400 border-gray-500/30';

    // Memoize date calculations to prevent recalculation on every render
    const timeAgo = React.useMemo(() => {
      const createdAt = session.created_at
        ? new Date(session.created_at)
        : null;
      return createdAt ? formatRelativeFallback(createdAt) : 'Unknown';
    }, [session.created_at]);

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
                  {session.board_title || 'Untitled Board'}
                </CardTitle>

                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge
                    variant="cyber"
                    className={cn('text-xs', difficultyColor)}
                  >
                    {session.board_difficulty || 'Unknown'}
                  </Badge>

                  <Badge variant="cyber" className={cn('text-xs', statusColor)}>
                    {session.status === 'waiting'
                      ? 'Waiting for Players'
                      : session.status === 'active'
                        ? 'In Progress'
                        : session.status || 'Unknown'}
                  </Badge>

                  <Badge
                    variant="cyber"
                    className="border-gray-600 text-xs text-gray-300"
                  >
                    <Grid3X3 className="mr-1 h-3 w-3" />
                    5×5
                  </Badge>
                </div>

                {/* Board description not available in session stats */}
              </div>

              <div className="ml-4 flex flex-col items-end gap-2">
                {isHost && (
                  <Badge
                    variant="cyber"
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
                <Avatar size="sm">
                  <AvatarFallback className="bg-gray-700 text-gray-300">
                    {session.host_username?.[0]?.toUpperCase() || 'H'}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <p className="text-sm font-medium text-gray-200">
                    {session.host_username || 'Unknown Host'}
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
                    variant="primary"
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
                    variant="primary"
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
                    variant="primary"
                    className="border-gray-600 text-gray-500"
                  >
                    <Users className="mr-1 h-4 w-4" />
                    Full
                  </Button>
                )}
              </div>
            </div>

            {/* Game Category */}
            {session.board_game_type &&
              session.board_game_type !== 'All Games' && (
                <div className="mt-3 border-t border-gray-700 pt-3">
                  <div className="flex items-center text-sm text-gray-400">
                    <span className="mr-2 font-medium text-gray-300">
                      Game:
                    </span>
                    {session.board_game_type}
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
);

SessionCard.displayName = 'SessionCard';

export { SessionCard };
