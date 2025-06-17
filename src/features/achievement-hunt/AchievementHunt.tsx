'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AchievementList } from './components/AchievementList';
import { AchievementTracker } from './components/AchievementTracker';
import { achievementService } from './services/achievement.service';
import { useAuth } from '@/lib/stores/auth-store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Trophy, Target, User } from '@/components/ui/Icons';
import { Card, CardContent } from '@/components/ui/Card';
import { notifications } from '@/lib/notifications';
import type { Achievement } from './services/achievement.service';

export function AchievementHunt() {
  const { authUser, isAuthenticated } = useAuth();
  const [_selectedAchievement, setSelectedAchievement] =
    useState<Achievement | null>(null);

  // Fetch achievement categories
  const {
    data: categories,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['achievements', 'categories', authUser?.id],
    queryFn: () => {
      if (!authUser?.id) throw new Error('User ID is required');
      return achievementService.getAchievementCategories(authUser.id);
    },
    enabled: !!authUser?.id,
    staleTime: 60 * 1000, // 1 minute
    select: res => (res.success ? res.data : []),
  });

  const handleAchievementClick = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    if (!achievement.unlocked) {
      notifications.info(
        `${achievement.name}: ${achievement.description}${
          achievement.progress !== undefined &&
          achievement.maxProgress !== undefined
            ? ` - Progress: ${achievement.progress}/${achievement.maxProgress}`
            : ''
        }`
      );
    }
  };

  const handleAchievementUnlocked = () => {
    // Refetch achievements when a new one is unlocked
    refetch();
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <Card className="max-w-md border-gray-700 bg-gray-800/50">
          <CardContent className="pt-6 text-center">
            <User className="mx-auto mb-4 h-12 w-12 text-gray-600" />
            <h2 className="mb-2 text-xl font-bold text-gray-100">
              Sign In Required
            </h2>
            <p className="text-gray-400">
              Sign in to track and unlock achievements as you play!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="space-y-2 text-center">
          <LoadingSpinner className="mx-auto h-8 w-8" />
          <p className="text-gray-400">Loading achievements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-3xl font-bold text-transparent">
          Achievement Hunt
        </h2>
        <p className="mt-2 text-gray-300">
          Complete challenges and unlock achievements to earn points and
          bragging rights!
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-gray-700 bg-gray-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-gray-100">
                  {categories
                    ?.flatMap(c => c.achievements)
                    .filter(a => a.unlocked).length || 0}
                </p>
                <p className="text-sm text-gray-400">Unlocked</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-700 bg-gray-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-cyan-400" />
              <div>
                <p className="text-2xl font-bold text-gray-100">
                  {categories?.flatMap(c => c.achievements).length || 0}
                </p>
                <p className="text-sm text-gray-400">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-700 bg-gray-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
                <span className="text-lg font-bold">P</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-100">
                  {categories
                    ?.flatMap(c => c.achievements)
                    .filter(a => a.unlocked)
                    .reduce((sum, a) => sum + a.points, 0) || 0}
                </p>
                <p className="text-sm text-gray-400">Points</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievement List */}
      {categories && (
        <AchievementList
          categories={categories}
          onAchievementClick={handleAchievementClick}
        />
      )}

      {/* Achievement Tracker (for notifications) */}
      <AchievementTracker
        userId={authUser?.id || null}
        onAchievementUnlocked={handleAchievementUnlocked}
      />
    </div>
  );
}
