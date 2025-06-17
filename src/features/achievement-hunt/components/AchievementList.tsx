'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Trophy, Lock, Check } from '@/components/ui/Icons';
import type {
  Achievement,
  AchievementCategory,
} from '../services/achievement.service';

interface AchievementListProps {
  categories: AchievementCategory[];
  onAchievementClick?: (achievement: Achievement) => void;
}

export function AchievementList({
  categories,
  onAchievementClick,
}: AchievementListProps) {
  const totalPoints = categories
    .flatMap(c => c.achievements)
    .filter(a => a.unlocked)
    .reduce((sum, a) => sum + a.points, 0);

  const totalPossiblePoints = categories
    .flatMap(c => c.achievements)
    .reduce((sum, a) => sum + a.points, 0);

  const completionPercentage = Math.round(
    (totalPoints / totalPossiblePoints) * 100
  );

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card className="border-gray-700 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              Achievement Progress
            </span>
            <span className="text-2xl font-bold text-cyan-400">
              {totalPoints} / {totalPossiblePoints}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={completionPercentage} className="h-3" />
          <p className="mt-2 text-center text-sm text-gray-400">
            {completionPercentage}% Complete
          </p>
        </CardContent>
      </Card>

      {/* Achievement Categories */}
      {categories.map(category => (
        <Card key={category.name} className="border-gray-700 bg-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{category.icon}</span>
              {category.name}
              <Badge
                variant="cyber"
                className="ml-auto bg-gray-700 text-gray-300"
              >
                {category.achievements.filter(a => a.unlocked).length} /{' '}
                {category.achievements.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {category.achievements.map(achievement => (
                <div
                  key={achievement.id}
                  className={`group relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                    achievement.unlocked
                      ? 'border-cyan-500/50 bg-cyan-900/20 hover:bg-cyan-900/30'
                      : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                  } `}
                  onClick={() => onAchievementClick?.(achievement)}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl ${
                        achievement.unlocked
                          ? 'bg-cyan-500/20'
                          : 'bg-gray-700/50'
                      } `}
                    >
                      {achievement.icon || '🏆'}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <h3
                        className={`font-semibold ${
                          achievement.unlocked
                            ? 'text-cyan-300'
                            : 'text-gray-300'
                        } `}
                      >
                        {achievement.name}
                      </h3>
                      <p
                        className={`mt-1 text-sm ${
                          achievement.unlocked
                            ? 'text-gray-300'
                            : 'text-gray-500'
                        } `}
                      >
                        {achievement.description}
                      </p>

                      {/* Progress */}
                      {!achievement.unlocked &&
                        achievement.progress !== undefined &&
                        achievement.maxProgress !== undefined && (
                          <div className="mt-2">
                            <Progress
                              value={
                                (achievement.progress /
                                  achievement.maxProgress) *
                                100
                              }
                              className="h-2"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              {achievement.progress} / {achievement.maxProgress}
                            </p>
                          </div>
                        )}

                      {/* Unlock date */}
                      {achievement.unlocked && achievement.unlockedAt && (
                        <p className="mt-1 text-xs text-gray-500">
                          Unlocked{' '}
                          {new Date(
                            achievement.unlockedAt
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Points */}
                    <Badge
                      variant="cyber"
                      className={` ${
                        achievement.unlocked
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-gray-700 text-gray-400'
                      } `}
                    >
                      {achievement.points}
                    </Badge>
                  </div>

                  {/* Status Icon */}
                  <div className="absolute top-2 right-2">
                    {achievement.unlocked ? (
                      <Check className="h-5 w-5 text-green-400" />
                    ) : (
                      <Lock className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
