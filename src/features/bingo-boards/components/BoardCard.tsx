'use client';

import React, { useState, useCallback, useMemo } from 'react';
import type { Tables } from '@/types';

// Use database type to match what service returns
type BingoBoard = Tables<'bingo_boards'>;
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Edit3, Play, Users, Activity } from '@/components/ui/Icons';
import { notifications } from '@/lib/notifications';
import { BaseErrorBoundary } from '@/components/error-boundaries';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';
import { getDifficultyColorClasses, TAG_COLORS } from '@/src/config/theme';
import { sanitizeBoardContent } from '@/lib/sanitization';

interface BoardCardProps {
  board: BingoBoard;
}

const BoardCard: React.FC<BoardCardProps> = ({ board }) => {
  const router = useRouter();
  const [isHosting, setIsHosting] = useState(false);

  // Use stable values based on board ID to ensure consistency across renders
  const stats = useMemo(() => {
    // Use board ID to generate consistent pseudo-random values
    const seed = board.id
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return {
      participants: (seed % 100) + 1,
      completionRate: seed % 101,
    };
  }, [board.id]);

  const handlePlayBoard = useCallback(async () => {
    setIsHosting(true);
    try {
      // Navigate to play area with board pre-selected
      const searchParams = new URLSearchParams({
        boardId: board.id,
        host: 'true',
      });
      router.push(`/play-area?${searchParams.toString()}`);
    } catch (error) {
      logger.error(
        'Failed to navigate to play area',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'BoardCard',
          boardId: board.id,
        }
      );
      notifications.error('Failed to start session');
    } finally {
      setIsHosting(false);
    }
  }, [board.id, router]);

  return (
    <BaseErrorBoundary level="component">
      <Card
        variant="primary"
        className="group border-cyan-500/50 bg-gray-900/95 backdrop-blur-sm transition-all duration-300 contain-layout hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-500/20"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="line-clamp-2 min-h-[3.5rem] text-lg font-bold text-cyan-100 transition-colors group-hover:text-cyan-300">
                {sanitizeBoardContent(board.title)}
              </CardTitle>
              <CardDescription className="mt-1 line-clamp-2 text-sm text-gray-300">
                {sanitizeBoardContent(
                  board.description || 'No description provided'
                )}
              </CardDescription>
            </div>
            {board.is_public && (
              <div className="mt-0.5 flex-shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex h-8 w-8 cursor-help items-center justify-center rounded-full border border-yellow-500/50 bg-yellow-500/20 shadow-lg shadow-yellow-500/20">
                        <svg
                          className="h-4 w-4 text-yellow-300"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1s.4-1 1-1h12c.6 0 1 .4 1 1z" />
                        </svg>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Public Board - Visible to all players</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Board Metadata */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="cyber"
              className={cn(
                'font-semibold shadow-lg',
                getDifficultyColorClasses(board.difficulty)
              )}
            >
              {board.difficulty}
            </Badge>
            <Badge
              variant="cyber"
              className={cn(TAG_COLORS.size, 'font-medium')}
            >
              <svg
                className="mr-1.5 h-3.5 w-3.5 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z" />
              </svg>
              {board.size || 5}×{board.size || 5}
            </Badge>
            {board.game_type && board.game_type !== 'All Games' && (
              <Badge
                variant="cyber"
                className={cn(TAG_COLORS.game, 'font-medium')}
              >
                {board.game_type}
              </Badge>
            )}
          </div>

          {/* Stats - Streamlined single line */}
          <div className="flex items-center gap-4 text-sm text-gray-300">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-gray-400" />
              <span>{stats.participants} players</span>
            </div>
            <span className="text-gray-600">•</span>
            <div className="flex items-center gap-1.5">
              {stats.completionRate === 0 ? (
                <>
                  <Activity className="h-4 w-4 text-gray-400" />
                  <span>Not started</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4 flex-shrink-0 text-emerald-400"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  <span>{stats.completionRate}% complete</span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons - Edit primary, Play secondary but prominent */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="primary"
              size="sm"
              asChild
              className="mr-2 flex-1 border border-gray-600 bg-gray-700/50 font-medium text-white transition-all hover:border-gray-500 hover:bg-gray-700"
            >
              <Link href={`/challenge-hub/${board.id}`}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Board
              </Link>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handlePlayBoard}
              disabled={isHosting}
              className="relative h-9 w-9 border-0 bg-gradient-to-r from-cyan-500 to-purple-500 p-0 text-white shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50"
            >
              {isHosting ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              ) : (
                <Play className="h-5 w-5" />
              )}
              <span className="sr-only">
                {isHosting ? 'Starting...' : 'Play Board'}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </BaseErrorBoundary>
  );
};

export default React.memo(BoardCard);
