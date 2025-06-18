import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import type { Tables } from '@/types/database.types';

// Achievement types using database schema
type Achievement = Tables<'user_achievements'> & {
  metadata: {
    category: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    progress: number;
    max_progress: number;
    icon: string;
  };
};

interface AchievementProgress {
  achievement_id: string;
  progress: number;
  max_progress: number;
}

interface AchievementUnlockResult {
  success: boolean;
  achievement?: Achievement;
  error?: string;
  isDuplicate?: boolean;
}

interface AchievementCondition {
  type: 'game_win' | 'speedrun_time' | 'streak' | 'play_count' | 'score_threshold';
  value: number;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
}

// Achievement calculation engine
export class AchievementEngine {
  private achievements: Map<string, Achievement>;
  private userProgress: Map<string, AchievementProgress>;
  private unlockQueue: Achievement[] = [];
  private lastUnlockTime = 0;
  private unlockThrottleMs = 500;

  constructor(achievements: Achievement[]) {
    this.achievements = new Map(achievements.map(a => [a.achievement_name, a]));
    this.userProgress = new Map();
  }

  // Check if achievement should be unlocked based on trigger data
  checkAchievementTrigger(
    achievementName: string,
    triggerData: Record<string, any>
  ): boolean {
    const achievement = this.achievements.get(achievementName);
    if (!achievement) return false;

    // Already unlocked
    if (achievement.unlocked_at) return false;

    // Check conditions based on achievement type
    switch (achievement.achievement_type) {
      case 'gameplay':
        return this.checkGameplayCondition(achievement, triggerData);
      case 'speedrun':
        return this.checkSpeedrunCondition(achievement, triggerData);
      case 'streak':
        return this.checkStreakCondition(achievement, triggerData);
      default:
        return false;
    }
  }

  private checkGameplayCondition(achievement: Achievement, data: Record<string, any>): boolean {
    switch (achievement.achievement_name) {
      case 'first_win':
        return data.game_won === true;
      case 'winning_streak_3':
        return data.consecutive_wins >= 3;
      case 'play_10_games':
        return data.games_played >= 10;
      default:
        return false;
    }
  }

  private checkSpeedrunCondition(achievement: Achievement, data: Record<string, any>): boolean {
    const timeSeconds = data.timeSeconds || Infinity;
    
    switch (achievement.achievement_name) {
      case 'speedrun_master':
        return timeSeconds < 30;
      case 'speedrun_expert':
        return timeSeconds < 60;
      case 'speedrun_beginner':
        return timeSeconds < 120;
      default:
        return false;
    }
  }

  private checkStreakCondition(achievement: Achievement, data: Record<string, any>): boolean {
    const currentStreak = data.current_streak || 0;
    const metadata = achievement.metadata;
    
    return currentStreak >= (metadata.max_progress || 1);
  }

  // Update achievement progress
  updateProgress(achievementName: string, progress: number): AchievementProgress | null {
    const achievement = this.achievements.get(achievementName);
    if (!achievement || achievement.unlocked_at) return null;

    const currentProgress = this.userProgress.get(achievementName) || {
      achievement_id: achievementName,
      progress: 0,
      max_progress: achievement.metadata.max_progress
    };

    const newProgress = Math.min(progress, currentProgress.max_progress);
    const updatedProgress = { ...currentProgress, progress: newProgress };
    
    this.userProgress.set(achievementName, updatedProgress);

    // Check if achievement is now complete
    if (newProgress >= currentProgress.max_progress) {
      this.unlockAchievement(achievementName);
    }

    return updatedProgress;
  }

  // Unlock achievement with duplicate prevention
  unlockAchievement(achievementName: string): AchievementUnlockResult {
    const achievement = this.achievements.get(achievementName);
    if (!achievement) {
      return { success: false, error: 'Achievement not found' };
    }

    // Prevent duplicate unlocks
    if (achievement.unlocked_at) {
      return { success: false, error: 'Achievement already unlocked', isDuplicate: true };
    }

    // Throttle rapid unlocks
    const now = Date.now();
    if (now - this.lastUnlockTime < this.unlockThrottleMs) {
      this.unlockQueue.push(achievement);
      return { success: true, achievement };
    }

    // Update achievement
    achievement.unlocked_at = new Date().toISOString();
    this.lastUnlockTime = now;

    return { success: true, achievement };
  }

  // Process queued unlocks
  processUnlockQueue(): Achievement[] {
    const processed = [...this.unlockQueue];
    this.unlockQueue = [];
    
    processed.forEach(achievement => {
      if (!achievement.unlocked_at) {
        achievement.unlocked_at = new Date().toISOString();
      }
    });

    return processed;
  }

  // Validate achievement conditions for anti-cheat
  validateAchievementConditions(
    achievementName: string,
    data: Record<string, any>
  ): { valid: boolean; reason?: string } {
    const achievement = this.achievements.get(achievementName);
    if (!achievement) {
      return { valid: false, reason: 'Achievement not found' };
    }

    // Validate based on achievement type
    if (achievement.achievement_type === 'speedrun') {
      const timeSeconds = data.timeSeconds;
      
      // Check for impossible times
      if (timeSeconds < 10 && achievementName === 'speedrun_expert') {
        return { valid: false, reason: 'Time too fast to be legitimate' };
      }
      
      // Check for missing session data
      if (!data.session_id || !data.game_completed) {
        return { valid: false, reason: 'Missing required game session data' };
      }
    }

    if (achievement.achievement_type === 'gameplay') {
      // Validate game completion
      if (achievementName.includes('win') && !data.game_completed) {
        return { valid: false, reason: 'Game not completed' };
      }
    }

    return { valid: true };
  }

  // Get achievement statistics
  getStatistics(): {
    total: number;
    unlocked: number;
    points: number;
    completion: number;
    byRarity: Record<string, number>;
    byCategory: Record<string, number>;
  } {
    const achievements = Array.from(this.achievements.values());
    const unlocked = achievements.filter(a => a.unlocked_at);
    const unlockedCount = unlocked.length;
    const totalPoints = unlocked.reduce((sum, a) => sum + (a.points ?? 0), 0);

    const byRarity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    unlocked.forEach(a => {
      byRarity[a.metadata.rarity] = (byRarity[a.metadata.rarity] || 0) + 1;
      byCategory[a.metadata.category] = (byCategory[a.metadata.category] || 0) + 1;
    });

    return {
      total: achievements.length,
      unlocked: unlockedCount,
      points: totalPoints,
      completion: (unlockedCount / achievements.length) * 100,
      byRarity,
      byCategory
    };
  }

  // Filter achievements
  filterAchievements(filters: {
    category?: string;
    rarity?: string;
    unlocked?: boolean;
    search?: string;
  }): Achievement[] {
    let filtered = Array.from(this.achievements.values());

    if (filters.category) {
      filtered = filtered.filter(a => a.metadata.category === filters.category);
    }

    if (filters.rarity) {
      filtered = filtered.filter(a => a.metadata.rarity === filters.rarity);
    }

    if (filters.unlocked !== undefined) {
      filtered = filtered.filter(a => (a.unlocked_at !== null) === filters.unlocked);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(a =>
        a.achievement_name.toLowerCase().includes(searchLower) ||
        (a.description ?? '').toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  // Sort achievements
  sortAchievements(achievements: Achievement[], sortBy: 'points' | 'rarity' | 'progress' | 'name'): Achievement[] {
    const sorted = [...achievements];

    switch (sortBy) {
      case 'points':
        return sorted.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
      
      case 'rarity':
        const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
        return sorted.sort((a, b) => 
          (rarityOrder[b.metadata.rarity] || 0) - (rarityOrder[a.metadata.rarity] || 0)
        );
      
      case 'progress':
        return sorted.sort((a, b) => {
          const progressA = this.userProgress.get(a.achievement_name);
          const progressB = this.userProgress.get(b.achievement_name);
          const percentA = progressA ? progressA.progress / progressA.max_progress : 0;
          const percentB = progressB ? progressB.progress / progressB.max_progress : 0;
          return percentB - percentA;
        });
      
      case 'name':
        return sorted.sort((a, b) => a.achievement_name.localeCompare(b.achievement_name));
      
      default:
        return sorted;
    }
  }
}

describe('Achievement Engine', () => {
  let engine: AchievementEngine;
  let mockAchievements: Achievement[];

  beforeEach(() => {
    mockAchievements = [
      {
        id: 'ach-1',
        user_id: 'user-1',
        achievement_name: 'first_win',
        achievement_type: 'gameplay',
        description: 'Win your first game',
        points: 50,
        unlocked_at: null,
        created_at: new Date().toISOString(),
        metadata: {
          category: 'gameplay',
          rarity: 'common',
          progress: 0,
          max_progress: 1,
          icon: '🏆'
        }
      },
      {
        id: 'ach-2',
        user_id: 'user-1',
        achievement_name: 'winning_streak_3',
        achievement_type: 'streak',
        description: 'Win 3 games in a row',
        points: 150,
        unlocked_at: null,
        created_at: new Date().toISOString(),
        metadata: {
          category: 'gameplay',
          rarity: 'uncommon',
          progress: 0,
          max_progress: 3,
          icon: '🔥'
        }
      },
      {
        id: 'ach-3',
        user_id: 'user-1',
        achievement_name: 'speedrun_master',
        achievement_type: 'speedrun',
        description: 'Complete a speedrun under 30 seconds',
        points: 300,
        unlocked_at: null,
        created_at: new Date().toISOString(),
        metadata: {
          category: 'speedrun',
          rarity: 'rare',
          progress: 0,
          max_progress: 1,
          icon: '⚡'
        }
      },
      {
        id: 'ach-4',
        user_id: 'user-1',
        achievement_name: 'speedrun_expert',
        achievement_type: 'speedrun',
        description: 'Complete a speedrun under 60 seconds',
        points: 200,
        unlocked_at: null,
        created_at: new Date().toISOString(),
        metadata: {
          category: 'speedrun',
          rarity: 'uncommon',
          progress: 0,
          max_progress: 1,
          icon: '🚀'
        }
      }
    ];

    engine = new AchievementEngine(mockAchievements);
  });

  describe('Achievement Triggers', () => {
    test('should trigger first win achievement', () => {
      const shouldTrigger = engine.checkAchievementTrigger('first_win', {
        game_won: true,
        game_completed: true
      });
      expect(shouldTrigger).toBe(true);
    });

    test('should not trigger achievement with wrong conditions', () => {
      const shouldTrigger = engine.checkAchievementTrigger('first_win', {
        game_won: false,
        game_completed: true
      });
      expect(shouldTrigger).toBe(false);
    });

    test('should trigger speedrun achievement with valid time', () => {
      const shouldTrigger = engine.checkAchievementTrigger('speedrun_master', {
        timeSeconds: 25,
        game_completed: true
      });
      expect(shouldTrigger).toBe(true);
    });

    test('should not trigger speedrun achievement with slow time', () => {
      const shouldTrigger = engine.checkAchievementTrigger('speedrun_master', {
        timeSeconds: 35,
        game_completed: true
      });
      expect(shouldTrigger).toBe(false);
    });

    test('should not trigger already unlocked achievement', () => {
      engine.unlockAchievement('first_win');
      const shouldTrigger = engine.checkAchievementTrigger('first_win', {
        game_won: true
      });
      expect(shouldTrigger).toBe(false);
    });
  });

  describe('Progress Tracking', () => {
    test('should update achievement progress', () => {
      const progress = engine.updateProgress('winning_streak_3', 1);
      expect(progress).toEqual({
        achievement_id: 'winning_streak_3',
        progress: 1,
        max_progress: 3
      });
    });

    test('should cap progress at max value', () => {
      const progress = engine.updateProgress('winning_streak_3', 5);
      expect(progress?.progress).toBe(3);
    });

    test('should unlock achievement when progress completes', () => {
      const progress = engine.updateProgress('winning_streak_3', 3);
      expect(progress?.progress).toBe(3);
      
      // Check if achievement was unlocked
      const achievement = engine['achievements'].get('winning_streak_3');
      expect(achievement?.unlocked_at).toBeTruthy();
    });

    test('should not update progress for unlocked achievement', () => {
      engine.unlockAchievement('first_win');
      const progress = engine.updateProgress('first_win', 1);
      expect(progress).toBeNull();
    });
  });

  describe('Unlock Prevention', () => {
    test('should prevent duplicate unlocks', () => {
      const first = engine.unlockAchievement('first_win');
      expect(first.success).toBe(true);

      const second = engine.unlockAchievement('first_win');
      expect(second.success).toBe(false);
      expect(second.isDuplicate).toBe(true);
    });

    test('should throttle rapid unlocks', () => {
      jest.useFakeTimers();
      
      const unlock1 = engine.unlockAchievement('first_win');
      expect(unlock1.success).toBe(true);

      // Try to unlock another immediately
      const unlock2 = engine.unlockAchievement('speedrun_master');
      expect(unlock2.success).toBe(true);
      
      // Should be queued
      expect(engine['unlockQueue']).toHaveLength(1);

      jest.runAllTimers();
      jest.useRealTimers();
    });

    test('should process unlock queue', () => {
      jest.useFakeTimers();
      
      engine.unlockAchievement('first_win');
      engine.unlockAchievement('speedrun_master'); // Will be queued

      const processed = engine.processUnlockQueue();
      expect(processed).toHaveLength(1);
      expect(processed[0]?.achievement_name).toBe('speedrun_master');
      expect(processed[0]?.unlocked_at).toBeTruthy();

      jest.useRealTimers();
    });
  });

  describe('Validation and Anti-Cheat', () => {
    test('should validate legitimate speedrun time', () => {
      const validation = engine.validateAchievementConditions('speedrun_master', {
        timeSeconds: 25,
        session_id: 'session-123',
        game_completed: true
      });
      expect(validation.valid).toBe(true);
    });

    test('should reject impossible speedrun time', () => {
      const validation = engine.validateAchievementConditions('speedrun_expert', {
        timeSeconds: 5,
        session_id: 'session-123',
        game_completed: true
      });
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('too fast');
    });

    test('should require session data for speedruns', () => {
      const validation = engine.validateAchievementConditions('speedrun_master', {
        timeSeconds: 25,
        game_completed: true
      });
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('session data');
    });

    test('should require game completion for win achievements', () => {
      const validation = engine.validateAchievementConditions('first_win', {
        game_won: true,
        game_completed: false
      });
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('not completed');
    });
  });

  describe('Statistics', () => {
    test('should calculate achievement statistics', () => {
      engine.unlockAchievement('first_win');
      engine.unlockAchievement('speedrun_master');
      
      // Process any queued unlocks due to throttling
      engine.processUnlockQueue();

      const stats = engine.getStatistics();
      expect(stats).toEqual({
        total: 4,
        unlocked: 2,
        points: 350,
        completion: 50,
        byRarity: {
          common: 1,
          rare: 1
        },
        byCategory: {
          gameplay: 1,
          speedrun: 1
        }
      });
    });

    test('should handle empty statistics', () => {
      const stats = engine.getStatistics();
      expect(stats).toEqual({
        total: 4,
        unlocked: 0,
        points: 0,
        completion: 0,
        byRarity: {},
        byCategory: {}
      });
    });
  });

  describe('Filtering and Sorting', () => {
    test('should filter by category', () => {
      const filtered = engine.filterAchievements({ category: 'speedrun' });
      expect(filtered).toHaveLength(2);
      expect(filtered.some(a => a.achievement_name === 'speedrun_master')).toBe(true);
      expect(filtered.some(a => a.achievement_name === 'speedrun_expert')).toBe(true);
    });

    test('should filter by unlock status', () => {
      engine.unlockAchievement('first_win');
      
      const unlocked = engine.filterAchievements({ unlocked: true });
      expect(unlocked).toHaveLength(1);
      
      const locked = engine.filterAchievements({ unlocked: false });
      expect(locked).toHaveLength(3);
    });

    test('should filter by search term', () => {
      const filtered = engine.filterAchievements({ search: 'speedrun' });
      expect(filtered).toHaveLength(2);
      expect(filtered.some(a => a.achievement_name === 'speedrun_master')).toBe(true);
      expect(filtered.some(a => a.achievement_name === 'speedrun_expert')).toBe(true);
    });

    test('should sort by points', () => {
      const sorted = engine.sortAchievements(mockAchievements, 'points');
      expect(sorted[0]?.points).toBe(300);
      expect(sorted[1]?.points).toBe(200);
      expect(sorted[2]?.points).toBe(150);
      expect(sorted[3]?.points).toBe(50);
    });

    test('should sort by rarity', () => {
      const sorted = engine.sortAchievements(mockAchievements, 'rarity');
      expect(sorted[0]?.metadata.rarity).toBe('rare');
      expect(sorted[1]?.metadata.rarity).toBe('uncommon');
      expect(sorted[2]?.metadata.rarity).toBe('uncommon');
      expect(sorted[3]?.metadata.rarity).toBe('common');
    });
  });

  describe('Performance', () => {
    test('should handle large achievement sets efficiently', () => {
      // Create 1000 achievements
      const largeSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `ach-${i}`,
        user_id: 'user-1',
        achievement_name: `achievement_${i}`,
        achievement_type: ['gameplay', 'speedrun', 'streak'][i % 3] ?? 'gameplay',
        description: `Achievement ${i}`,
        points: (i % 5 + 1) * 50,
        unlocked_at: i % 10 === 0 ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        metadata: {
          category: ['gameplay', 'speedrun', 'social'][i % 3] ?? 'gameplay',
          rarity: (['common', 'uncommon', 'rare', 'epic', 'legendary'][i % 5] ?? 'common') as any,
          progress: 0,
          max_progress: i % 5 + 1,
          icon: '🏆'
        }
      }));

      const largeEngine = new AchievementEngine(largeSet);
      
      const startTime = performance.now();
      
      // Filter and sort
      const filtered = largeEngine.filterAchievements({ 
        category: 'speedrun',
        unlocked: false 
      });
      const sorted = largeEngine.sortAchievements(filtered, 'points');
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
      expect(sorted.length).toBeGreaterThan(0);
    });
  });
});