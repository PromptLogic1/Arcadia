'use client';

import React, { useState } from 'react';
import type { Tables } from '@/types';

// Use database type to match what service returns
type BingoBoard = Tables<'bingo_boards'>;
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Edit3 } from 'lucide-react';
import {
  GiPlayButton,
  GiCrossedSwords,
  GiUpgrade,
  GiImperialCrown,
} from 'react-icons/gi';
import { BiGridAlt } from 'react-icons/bi';
import { notifications } from '@/lib/notifications';
import type { Difficulty } from '@/types';
import { BaseErrorBoundary } from '@/components/error-boundaries';
import { logger } from '@/lib/logger';

interface BoardCardProps {
  board: BingoBoard;
}

const BoardCard: React.FC<BoardCardProps> = ({ board }) => {
  const router = useRouter();
  const [isHosting, setIsHosting] = useState(false);

  // Dummy data for participants and completion rate, replace with actual data
  const participants = Math.floor(Math.random() * 100);
  const completionRate = Math.floor(Math.random() * 100);

  const getDifficultyColor = (difficulty: Difficulty) => {
    const colors: Record<Difficulty, string> = {
      beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
      easy: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      hard: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      expert: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return (
      colors[difficulty] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    );
  };

  const handlePlayBoard = async () => {
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
  };

  return (
    <BaseErrorBoundary level="component">
      <Card variant="cyber" glow="subtle" className="group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="neon-glow-cyan truncate text-lg font-semibold text-cyan-100">
                {board.title}
              </CardTitle>
              <CardDescription className="mt-1 line-clamp-2 text-sm text-cyan-300/70">
                {board.description || 'No description provided'}
              </CardDescription>
            </div>
            {board.is_public && (
              <GiImperialCrown className="ml-2 h-4 w-4 flex-shrink-0 text-yellow-400 drop-shadow-lg" />
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Board Metadata */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={getDifficultyColor(board.difficulty)}
            >
              {board.difficulty}
            </Badge>
            <Badge
              variant="outline"
              className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
            >
              <BiGridAlt className="mr-1 h-3 w-3" />
              {board.size || 5}×{board.size || 5}
            </Badge>
            {board.game_type && board.game_type !== 'All Games' && (
              <Badge
                variant="outline"
                className="border-purple-500/50 bg-purple-500/10 text-purple-400"
              >
                {board.game_type}
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-cyan-300/70">
            <div className="flex items-center gap-1">
              <GiCrossedSwords className="h-4 w-4 text-cyan-400" />
              <span>{participants} players</span>
            </div>
            <div className="flex items-center gap-1">
              <GiUpgrade className="h-4 w-4 text-cyan-400" />
              <span>{completionRate}% completed</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="cyber-outline"
              size="sm"
              asChild
              className="flex-1"
            >
              <Link href={`/challenge-hub/${board.id}`}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Board
              </Link>
            </Button>

            <Button
              variant="cyber"
              size="sm"
              onClick={handlePlayBoard}
              disabled={isHosting}
              className="flex-1"
            >
              <GiPlayButton className="mr-2 h-4 w-4" />
              {isHosting ? 'Starting...' : 'Play Board'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </BaseErrorBoundary>
  );
};

export default BoardCard;
