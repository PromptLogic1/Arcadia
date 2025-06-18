import { describe, expect, it } from '@jest/globals';
import type { Database } from '@/types/database.types';

type UserStats = Database['public']['Tables']['user_statistics']['Row'];

/**
 * Badge Engine Tests
 * 
 * Tests the business logic for:
 * - Badge/achievement unlock conditions
 * - Progress tracking
 * - Achievement categories
 * - Special achievement triggers
 */

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  type: string;
  points: number;
  icon: string;
  condition: (stats: Partial<UserStats>) => boolean;
  progress?: (stats: Partial<UserStats>) => { current: number; max: number } | null;
}

// Badge definitions extracted from achievement.service.ts
const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_win',
    name: 'First Victory',
    description: 'Win your first game',
    type: 'game_win',
    points: 50,
    icon: '🏆',
    condition: (stats) => (stats.games_won || 0) > 0,
  },
  {
    id: 'speedrun_novice',
    name: 'Speedrun Novice',
    description: 'Complete a game in under 5 minutes',
    type: 'speedrun',
    points: 75,
    icon: '⚡',
    condition: (stats) => (stats.games_won || 0) > 0 && (stats.fastest_win || Infinity) < 300,
    progress: (stats) => stats.fastest_win && stats.fastest_win < 300 ? { current: 1, max: 1 } : null,
  },
  {
    id: 'speedrun_expert',
    name: 'Speedrun Expert',
    description: 'Complete a game in under 2 minutes',
    type: 'speedrun',
    points: 150,
    icon: '🚀',
    condition: (stats) => (stats.games_won || 0) > 0 && (stats.fastest_win || Infinity) < 120,
    progress: (stats) => stats.fastest_win && stats.fastest_win < 120 ? { current: 1, max: 1 } : null,
  },
  {
    id: 'winning_streak_3',
    name: 'On Fire',
    description: 'Win 3 games in a row',
    type: 'streak',
    points: 100,
    icon: '🔥',
    condition: (stats) => (stats.longest_win_streak || 0) >= 3,
    progress: (stats) => ({ current: stats.current_win_streak || 0, max: 3 }),
  },
  {
    id: 'winning_streak_5',
    name: 'Unstoppable',
    description: 'Win 5 games in a row',
    type: 'streak',
    points: 200,
    icon: '💪',
    condition: (stats) => (stats.longest_win_streak || 0) >= 5,
    progress: (stats) => ({ current: stats.current_win_streak || 0, max: 5 }),
  },
  {
    id: 'games_played_10',
    name: 'Regular Player',
    description: 'Play 10 games',
    type: 'milestone',
    points: 50,
    icon: '🎮',
    condition: (stats) => (stats.total_games || 0) >= 10,
    progress: (stats) => ({ current: stats.total_games || 0, max: 10 }),
  },
  {
    id: 'games_played_50',
    name: 'Dedicated Gamer',
    description: 'Play 50 games',
    type: 'milestone',
    points: 150,
    icon: '🎯',
    condition: (stats) => (stats.total_games || 0) >= 50,
    progress: (stats) => ({ current: stats.total_games || 0, max: 50 }),
  },
];

// Additional special badges that would require more complex conditions
const SPECIAL_BADGES: BadgeDefinition[] = [
  {
    id: 'perfect_game',
    name: 'Perfectionist',
    description: 'Win a game without any mistakes',
    type: 'special',
    points: 300,
    icon: '✨',
    condition: (_stats) => false, // Would need game-specific data
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Play with 10 different players',
    type: 'social',
    points: 100,
    icon: '🦋',
    condition: (_stats) => false, // Would need social interaction data
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Win a game after midnight',
    type: 'special',
    points: 75,
    icon: '🦉',
    condition: (_stats) => false, // Would need timestamp data
  },
];

function checkBadgeUnlocks(
  stats: Partial<UserStats>,
  unlockedBadges: Set<string>
): string[] {
  const newUnlocks: string[] = [];

  for (const badge of BADGE_DEFINITIONS) {
    if (!unlockedBadges.has(badge.name) && badge.condition(stats)) {
      newUnlocks.push(badge.name);
    }
  }

  return newUnlocks;
}

function getBadgeProgress(
  badgeId: string,
  stats: Partial<UserStats>
): { current: number; max: number } | null {
  const badge = BADGE_DEFINITIONS.find(b => b.id === badgeId);
  if (!badge || !badge.progress) return null;
  return badge.progress(stats);
}

function categorizeBadges(
  allBadges: BadgeDefinition[],
  unlockedBadges: Set<string>,
  stats: Partial<UserStats>
) {
  const categories: Record<string, { name: string; icon: string; badges: any[] }> = {
    game_win: { name: 'Victories', icon: '🏆', badges: [] },
    speedrun: { name: 'Speed Runs', icon: '⚡', badges: [] },
    streak: { name: 'Win Streaks', icon: '🔥', badges: [] },
    milestone: { name: 'Milestones', icon: '🎯', badges: [] },
    special: { name: 'Special', icon: '✨', badges: [] },
    social: { name: 'Social', icon: '🦋', badges: [] },
  };

  for (const badge of allBadges) {
    const unlocked = unlockedBadges.has(badge.name);
    const progress = badge.progress ? badge.progress(stats) : null;

    const category = categories[badge.type];
    if (category) {
      category.badges.push({
        ...badge,
        unlocked,
        progress,
      });
    }
  }

  return Object.values(categories).filter(cat => cat.badges.length > 0);
}

describe('Badge Engine', () => {
  describe('Badge Unlock Conditions', () => {
    it('should unlock first win badge', () => {
      const stats: Partial<UserStats> = { games_won: 1 };
      const unlocked = new Set<string>();
      
      const newUnlocks = checkBadgeUnlocks(stats, unlocked);
      
      expect(newUnlocks).toContain('First Victory');
      expect(newUnlocks).toHaveLength(1);
    });

    it('should not unlock already unlocked badges', () => {
      const stats: Partial<UserStats> = { games_won: 5 };
      const unlocked = new Set(['First Victory']);
      
      const newUnlocks = checkBadgeUnlocks(stats, unlocked);
      
      expect(newUnlocks).not.toContain('First Victory');
    });

    it('should unlock multiple badges at once', () => {
      const stats: Partial<UserStats> = {
        games_won: 1,
        total_games: 10,
        fastest_win: 250, // Under 5 minutes
      };
      const unlocked = new Set<string>();
      
      const newUnlocks = checkBadgeUnlocks(stats, unlocked);
      
      expect(newUnlocks).toContain('First Victory');
      expect(newUnlocks).toContain('Regular Player');
      expect(newUnlocks).toContain('Speedrun Novice');
      expect(newUnlocks).toHaveLength(3);
    });

    it('should unlock streak badges correctly', () => {
      const testCases = [
        { streak: 0, expected: [] },
        { streak: 1, expected: [] },
        { streak: 2, expected: [] },
        { streak: 3, expected: ['On Fire'] },
        { streak: 4, expected: ['On Fire'] },
        { streak: 5, expected: ['On Fire', 'Unstoppable'] },
        { streak: 10, expected: ['On Fire', 'Unstoppable'] },
      ];

      testCases.forEach(({ streak, expected }) => {
        const stats: Partial<UserStats> = { longest_win_streak: streak };
        const unlocked = new Set<string>();
        
        const newUnlocks = checkBadgeUnlocks(stats, unlocked);
        
        expect(newUnlocks).toEqual(expected);
      });
    });

    it('should unlock speedrun badges based on time', () => {
      const testCases = [
        { time: 600, expected: ['First Victory'] }, // 10 minutes - only first victory
        { time: 299, expected: ['First Victory', 'Speedrun Novice'] }, // Just under 5 minutes
        { time: 150, expected: ['First Victory', 'Speedrun Novice'] }, // 2.5 minutes
        { time: 119, expected: ['First Victory', 'Speedrun Novice', 'Speedrun Expert'] }, // Just under 2 minutes
        { time: 60, expected: ['First Victory', 'Speedrun Novice', 'Speedrun Expert'] }, // 1 minute
      ];

      testCases.forEach(({ time, expected }) => {
        const stats: Partial<UserStats> = { 
          fastest_win: time, 
          games_won: 1 // Need at least one win for speedrun badges
        };
        const unlocked = new Set<string>();
        
        const newUnlocks = checkBadgeUnlocks(stats, unlocked);
        
        expect(newUnlocks).toEqual(expected);
      });
    });

    it('should handle null/undefined stats gracefully', () => {
      const stats: Partial<UserStats> = {
        games_won: undefined,
        total_games: null,
        fastest_win: undefined,
        longest_win_streak: null,
      };
      const unlocked = new Set<string>();
      
      const newUnlocks = checkBadgeUnlocks(stats, unlocked);
      
      expect(newUnlocks).toHaveLength(0);
    });
  });

  describe('Badge Progress Tracking', () => {
    it('should track milestone progress', () => {
      const testCases = [
        { games: 0, badgeId: 'games_played_10', expected: { current: 0, max: 10 } },
        { games: 5, badgeId: 'games_played_10', expected: { current: 5, max: 10 } },
        { games: 10, badgeId: 'games_played_10', expected: { current: 10, max: 10 } },
        { games: 15, badgeId: 'games_played_10', expected: { current: 15, max: 10 } },
        { games: 25, badgeId: 'games_played_50', expected: { current: 25, max: 50 } },
        { games: 50, badgeId: 'games_played_50', expected: { current: 50, max: 50 } },
      ];

      testCases.forEach(({ games, badgeId, expected }) => {
        const stats: Partial<UserStats> = { total_games: games };
        const progress = getBadgeProgress(badgeId, stats);
        
        expect(progress).toEqual(expected);
      });
    });

    it('should track streak progress', () => {
      const testCases = [
        { streak: 0, badgeId: 'winning_streak_3', expected: { current: 0, max: 3 } },
        { streak: 2, badgeId: 'winning_streak_3', expected: { current: 2, max: 3 } },
        { streak: 3, badgeId: 'winning_streak_3', expected: { current: 3, max: 3 } },
        { streak: 4, badgeId: 'winning_streak_3', expected: { current: 4, max: 3 } },
        { streak: 4, badgeId: 'winning_streak_5', expected: { current: 4, max: 5 } },
        { streak: 5, badgeId: 'winning_streak_5', expected: { current: 5, max: 5 } },
      ];

      testCases.forEach(({ streak, badgeId, expected }) => {
        const stats: Partial<UserStats> = { current_win_streak: streak };
        const progress = getBadgeProgress(badgeId, stats);
        
        expect(progress).toEqual(expected);
      });
    });

    it('should track speedrun progress', () => {
      const testCases = [
        { time: 350, badgeId: 'speedrun_novice', expected: null }, // Not achieved
        { time: 250, badgeId: 'speedrun_novice', expected: { current: 1, max: 1 } }, // Achieved
        { time: 150, badgeId: 'speedrun_expert', expected: null }, // Not achieved
        { time: 100, badgeId: 'speedrun_expert', expected: { current: 1, max: 1 } }, // Achieved
      ];

      testCases.forEach(({ time, badgeId, expected }) => {
        const stats: Partial<UserStats> = { fastest_win: time };
        const progress = getBadgeProgress(badgeId, stats);
        
        expect(progress).toEqual(expected);
      });
    });

    it('should return null for badges without progress tracking', () => {
      const stats: Partial<UserStats> = { games_won: 1 };
      const progress = getBadgeProgress('first_win', stats);
      
      expect(progress).toBeNull();
    });

    it('should return null for unknown badge IDs', () => {
      const stats: Partial<UserStats> = { total_games: 5 };
      const progress = getBadgeProgress('unknown_badge', stats);
      
      expect(progress).toBeNull();
    });
  });

  describe('Badge Categories', () => {
    it('should categorize badges correctly', () => {
      const allBadges = [...BADGE_DEFINITIONS, ...SPECIAL_BADGES];
      const unlockedBadges = new Set(['First Victory', 'Regular Player']);
      const stats: Partial<UserStats> = {
        games_won: 5,
        total_games: 12,
        current_win_streak: 2,
      };

      const categories = categorizeBadges(allBadges, unlockedBadges, stats);

      expect(categories).toHaveLength(6); // All 6 categories with badges
      
      const victoriesCategory = categories.find(c => c.name === 'Victories');
      expect(victoriesCategory).toBeDefined();
      expect(victoriesCategory?.badges).toHaveLength(1);
      expect(victoriesCategory?.badges[0]?.unlocked).toBe(true);

      const milestonesCategory = categories.find(c => c.name === 'Milestones');
      expect(milestonesCategory).toBeDefined();
      expect(milestonesCategory?.badges).toHaveLength(2);
      expect(milestonesCategory?.badges[0].unlocked).toBe(true); // Regular Player
      expect(milestonesCategory?.badges[1].unlocked).toBe(false); // Dedicated Gamer
    });

    it('should include progress in categorized badges', () => {
      const stats: Partial<UserStats> = {
        total_games: 35,
        current_win_streak: 2,
      };
      const unlockedBadges = new Set<string>();

      const categories = categorizeBadges(BADGE_DEFINITIONS, unlockedBadges, stats);

      const milestonesCategory = categories.find(c => c.name === 'Milestones');
      const dedicatedGamerBadge = milestonesCategory?.badges.find(b => b.id === 'games_played_50');
      
      expect(dedicatedGamerBadge?.progress).toEqual({ current: 35, max: 50 });
    });

    it('should filter out empty categories', () => {
      const noBadges: BadgeDefinition[] = [];
      const unlockedBadges = new Set<string>();
      const stats: Partial<UserStats> = {};

      const categories = categorizeBadges(noBadges, unlockedBadges, stats);

      expect(categories).toHaveLength(0);
    });
  });

  describe('Edge Cases and Special Conditions', () => {
    it('should handle extreme statistics values', () => {
      const stats: Partial<UserStats> = {
        games_won: 999999,
        total_games: 999999,
        longest_win_streak: 999999,
        fastest_win: 1, // 1 second win
      };
      const unlocked = new Set<string>();

      const newUnlocks = checkBadgeUnlocks(stats, unlocked);

      // Should unlock all applicable badges
      expect(newUnlocks).toContain('First Victory');
      expect(newUnlocks).toContain('Regular Player');
      expect(newUnlocks).toContain('Dedicated Gamer');
      expect(newUnlocks).toContain('On Fire');
      expect(newUnlocks).toContain('Unstoppable');
      expect(newUnlocks).toContain('Speedrun Novice');
      expect(newUnlocks).toContain('Speedrun Expert');
    });

    it('should handle zero and negative values', () => {
      const stats: Partial<UserStats> = {
        games_won: 0,
        total_games: 0,
        longest_win_streak: 0,
        fastest_win: 0, // Impossible but should handle gracefully
      };
      const unlocked = new Set<string>();

      const newUnlocks = checkBadgeUnlocks(stats, unlocked);

      // Should not unlock speedrun badges if no games won
      // Even though 0 < threshold, speedrun requires actual wins
      expect(newUnlocks).toHaveLength(0);
    });

    it('should prioritize longest_win_streak over current_win_streak', () => {
      const stats: Partial<UserStats> = {
        current_win_streak: 2,
        longest_win_streak: 5,
      };
      const unlocked = new Set<string>();

      const newUnlocks = checkBadgeUnlocks(stats, unlocked);

      expect(newUnlocks).toContain('On Fire');
      expect(newUnlocks).toContain('Unstoppable');
    });

    it('should calculate badge points correctly', () => {
      const totalPoints = BADGE_DEFINITIONS.reduce((sum, badge) => sum + badge.points, 0);
      
      expect(totalPoints).toBe(775); // Sum of all defined badge points
    });

    it('should have unique badge IDs', () => {
      const ids = BADGE_DEFINITIONS.map(b => b.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have consistent icon usage', () => {
      const iconCounts = BADGE_DEFINITIONS.reduce((acc, badge) => {
        acc[badge.icon] = (acc[badge.icon] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Each icon should be used only once
      Object.values(iconCounts).forEach(count => {
        expect(count).toBe(1);
      });
    });
  });

  describe('Performance Tests', () => {
    it('should check all badges efficiently for many users', () => {
      const userCount = 1000;
      const users = Array.from({ length: userCount }, (_, i) => ({
        id: `user_${i}`,
        stats: {
          games_won: Math.floor(Math.random() * 100),
          total_games: Math.floor(Math.random() * 200),
          longest_win_streak: Math.floor(Math.random() * 10),
          fastest_win: Math.floor(Math.random() * 600),
        },
        unlockedBadges: new Set<string>(),
      }));

      const startTime = performance.now();
      
      users.forEach(user => {
        checkBadgeUnlocks(user.stats, user.unlockedBadges);
      });

      const endTime = performance.now();
      const timePerUser = (endTime - startTime) / userCount;

      // Should process each user in less than 0.1ms
      expect(timePerUser).toBeLessThan(0.1);
    });
  });
});