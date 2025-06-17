'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  OptimizedAvatar as Avatar,
  OptimizedAvatarFallback as AvatarFallback,
  OptimizedAvatarImage as AvatarImage,
} from '@/components/ui/OptimizedAvatar';
import { Badge } from '@/components/ui/Badge';
import { Trophy, Clock, TrendingUp } from '@/components/ui/Icons';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { LeaderboardEntry } from '../services/speedrun.service';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  isLoading?: boolean;
  title?: string;
}

export function Leaderboard({
  entries,
  isLoading = false,
  title = 'Global Leaderboard',
}: LeaderboardProps) {
  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black';
      case 2:
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-black';
      case 3:
        return 'bg-gradient-to-r from-orange-600 to-orange-700 text-white';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank <= 3) {
      return <Trophy className="h-4 w-4" />;
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="border-gray-700 bg-gray-800/50">
        <CardContent className="flex min-h-[400px] items-center justify-center">
          <div className="space-y-2 text-center">
            <LoadingSpinner className="mx-auto h-8 w-8" />
            <p className="text-gray-400">Loading leaderboard...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-700 bg-gray-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            No speedrun records yet. Be the first!
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(entry => (
              <div
                key={entry.user_id}
                className="flex items-center gap-3 rounded-lg bg-gray-900/50 p-3 transition-colors hover:bg-gray-900/70"
              >
                {/* Rank */}
                <Badge
                  variant="cyber"
                  className={`min-w-[3rem] justify-center ${getRankColor(
                    entry.rank
                  )}`}
                >
                  <span className="flex items-center gap-1">
                    {getRankIcon(entry.rank)}#{entry.rank}
                  </span>
                </Badge>

                {/* Avatar */}
                <Avatar size="sm">
                  <AvatarImage
                    src={entry.avatar_url || undefined}
                    alt={`${entry.username}'s avatar`}
                  />
                  <AvatarFallback className="bg-gray-700 text-gray-300">
                    {entry.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* User Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-200">
                    {entry.username}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(entry.fastest_win)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3 w-3" />
                      {entry.total_wins} wins
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {Math.round(entry.win_rate * 100)}% WR
                    </span>
                  </div>
                </div>

                {/* Best Time */}
                <div className="text-right">
                  <p className="font-mono text-lg font-bold text-cyan-400">
                    {formatTime(entry.fastest_win)}
                  </p>
                  <p className="text-xs text-gray-500">Best Time</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
