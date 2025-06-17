'use client';

import React, { useEffect, useState } from 'react';
import { notifications } from '@/lib/notifications';
import { Sparkles } from '@/components/ui/Icons';
// Animation library not available, using CSS transitions instead
import type { Achievement } from '../services/achievement.service';

interface AchievementTrackerProps {
  userId: string | null;
  onAchievementUnlocked?: (achievement: Achievement) => void;
}

export function AchievementTracker({
  userId,
  onAchievementUnlocked,
}: AchievementTrackerProps) {
  const [recentUnlocks, setRecentUnlocks] = useState<Achievement[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Check for new achievements every 30 seconds
    const checkAchievements = async () => {
      const { achievementService } = await import(
        '../services/achievement.service'
      );
      const result =
        await achievementService.checkAndUnlockAchievements(userId);

      if (result.success && result.data && result.data.length > 0) {
        // Fetch full achievement details for newly unlocked achievements
        const achievementsResult =
          await achievementService.getUserAchievements(userId);
        if (achievementsResult.success && achievementsResult.data) {
          const newlyUnlocked = achievementsResult.data.filter(
            a => result.data && result.data.includes(a.name) && a.unlocked
          );

          newlyUnlocked.forEach(achievement => {
            // Show notification
            notifications.success(`Achievement Unlocked: ${achievement.name}`);

            // Add to recent unlocks
            setRecentUnlocks(prev => [...prev, achievement]);

            // Call callback
            onAchievementUnlocked?.(achievement);

            // Remove from recent unlocks after 5 seconds
            setTimeout(() => {
              setRecentUnlocks(prev =>
                prev.filter(a => a.id !== achievement.id)
              );
            }, 5000);
          });
        }
      }
    };

    // Initial check
    checkAchievements();

    // Set up interval
    const interval = setInterval(checkAchievements, 30000);

    return () => clearInterval(interval);
  }, [userId, onAchievementUnlocked]);

  return (
    <>
      {recentUnlocks.map((achievement, index) => (
        <div
          key={achievement.id}
          className="animate-slide-in-right pointer-events-none fixed right-4 z-50"
          style={{
            bottom: `${80 + index * 100}px`,
            animationDelay: `${index * 100}ms`,
          }}
        >
          <div className="relative overflow-hidden rounded-lg border-2 border-yellow-400 bg-gray-900/95 p-4 shadow-2xl">
            {/* Background animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-amber-400/20 opacity-50" />

            {/* Sparkles */}
            <Sparkles className="absolute -top-2 -right-2 h-8 w-8 animate-pulse text-yellow-400" />

            {/* Content */}
            <div className="relative flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400/20 text-2xl">
                {achievement.icon || '🏆'}
              </div>
              <div>
                <p className="text-sm font-semibold text-yellow-400">
                  Achievement Unlocked!
                </p>
                <p className="font-bold text-white">{achievement.name}</p>
                <p className="text-sm text-gray-300">
                  +{achievement.points} points
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
