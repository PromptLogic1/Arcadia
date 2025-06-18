import { describe, expect, it } from '@jest/globals';
import type { Database } from '@/types/database.types';

type UserStats = Database['public']['Tables']['user_statistics']['Row'];
type GameResult = Database['public']['Tables']['game_results']['Row'];

/**
 * Statistics Calculator Tests
 * 
 * Tests business logic for calculating user statistics from game results
 * and aggregated statistics.
 */

interface CalculateStatsInput {
  userStats?: Partial<UserStats> | null;
  gameResults?: Partial<GameResult>[] | null;
  activityCount?: number;
}

interface CalculatedStats {
  totalGames: number;
  gamesWon: number;
  winRate: number;
  totalScore: number;
  averageScore: number;
  streakCount: number;
  rank: string;
  badgeCount: number;
}

// Business logic extracted from userService.getUserStats
function calculateUserStatistics(input: CalculateStatsInput): CalculatedStats {
  const { userStats, gameResults, activityCount = 0 } = input;

  let totalGames, gamesWon, winRate, totalScore, averageScore, streakCount;

  if (userStats) {
    // Use aggregated statistics
    totalGames = userStats.total_games || 0;
    gamesWon = userStats.games_won || 0;
    winRate = totalGames > 0 ? (gamesWon / totalGames) * 100 : 0;
    totalScore = userStats.total_score || 0;
    averageScore = userStats.average_score || 0;
    streakCount = userStats.current_win_streak || 0;
  } else {
    // Calculate from individual game results
    totalGames = gameResults?.length || 0;
    gamesWon = gameResults?.filter(game => game.placement === 1).length || 0;
    winRate = totalGames > 0 ? (gamesWon / totalGames) * 100 : 0;
    totalScore = gameResults?.reduce((sum, game) => sum + (game.final_score || 0), 0) || 0;
    averageScore = totalGames > 0 ? totalScore / totalGames : 0;

    // Calculate current streak (simplified)
    const recentGames = gameResults?.slice(-10) || [];
    streakCount = 0;
    for (let i = recentGames.length - 1; i >= 0; i--) {
      const game = recentGames[i];
      if (game && game.placement === 1) {
        streakCount++;
      } else {
        break;
      }
    }
  }

  // Determine rank based on win rate and games played
  // The logic cascades - if you have enough games for a tier but not enough win rate,
  // you still get the previous tier if you qualify for it
  let rank = 'Beginner';
  if (totalGames >= 50 && winRate >= 80) {
    rank = 'Master';
  } else if (totalGames >= 25 && winRate >= 70) {
    rank = 'Expert';
  } else if (totalGames >= 10 && winRate >= 60) {
    rank = 'Advanced';
  } else if (totalGames >= 5 && winRate >= 50) {
    rank = 'Intermediate';
  }

  return {
    totalGames,
    gamesWon,
    winRate: Math.round(winRate * 100) / 100,
    totalScore,
    averageScore: Math.round(averageScore * 100) / 100,
    streakCount,
    rank,
    badgeCount: activityCount,
  };
}

describe('Statistics Calculator', () => {
  describe('Using Aggregated Statistics', () => {
    it('should calculate stats from user_statistics table', () => {
      const userStats: Partial<UserStats> = {
        total_games: 50,
        games_won: 35,
        total_score: 2500,
        average_score: 50,
        current_win_streak: 5,
      };

      const result = calculateUserStatistics({ userStats });

      expect(result).toEqual({
        totalGames: 50,
        gamesWon: 35,
        winRate: 70,
        totalScore: 2500,
        averageScore: 50,
        streakCount: 5,
        rank: 'Expert',
        badgeCount: 0,
      });
    });

    it('should handle zero games played', () => {
      const userStats: Partial<UserStats> = {
        total_games: 0,
        games_won: 0,
        total_score: 0,
        average_score: 0,
        current_win_streak: 0,
      };

      const result = calculateUserStatistics({ userStats });

      expect(result).toEqual({
        totalGames: 0,
        gamesWon: 0,
        winRate: 0,
        totalScore: 0,
        averageScore: 0,
        streakCount: 0,
        rank: 'Beginner',
        badgeCount: 0,
      });
    });

    it('should handle perfect win rate', () => {
      const userStats: Partial<UserStats> = {
        total_games: 100,
        games_won: 100,
        total_score: 10000,
        average_score: 100,
        current_win_streak: 100,
      };

      const result = calculateUserStatistics({ userStats });

      expect(result).toEqual({
        totalGames: 100,
        gamesWon: 100,
        winRate: 100,
        totalScore: 10000,
        averageScore: 100,
        streakCount: 100,
        rank: 'Master',
        badgeCount: 0,
      });
    });
  });

  describe('Calculating from Game Results', () => {
    it('should calculate stats from individual game results', () => {
      const gameResults: Partial<GameResult>[] = [
        { placement: 1, final_score: 100 },
        { placement: 2, final_score: 80 },
        { placement: 1, final_score: 120 },
        { placement: 3, final_score: 60 },
        { placement: 1, final_score: 110 },
      ];

      const result = calculateUserStatistics({ gameResults });

      expect(result).toEqual({
        totalGames: 5,
        gamesWon: 3,
        winRate: 60,
        totalScore: 470,
        averageScore: 94,
        streakCount: 1, // Only the last win counts as current streak
        rank: 'Intermediate',
        badgeCount: 0,
      });
    });

    it('should calculate win streak correctly', () => {
      const gameResults: Partial<GameResult>[] = [
        { placement: 2, final_score: 80 },
        { placement: 1, final_score: 100 },
        { placement: 1, final_score: 110 },
        { placement: 1, final_score: 120 },
        { placement: 1, final_score: 130 },
      ];

      const result = calculateUserStatistics({ gameResults });

      expect(result).toEqual({
        totalGames: 5,
        gamesWon: 4,
        winRate: 80,
        totalScore: 540,
        averageScore: 108,
        streakCount: 4, // Last 4 games were wins
        rank: 'Intermediate',
        badgeCount: 0,
      });
    });

    it('should handle broken streak', () => {
      const gameResults: Partial<GameResult>[] = [
        { placement: 1, final_score: 100 },
        { placement: 1, final_score: 110 },
        { placement: 2, final_score: 90 }, // Streak broken here
        { placement: 1, final_score: 120 },
        { placement: 1, final_score: 130 },
      ];

      const result = calculateUserStatistics({ gameResults });

      expect(result).toEqual({
        totalGames: 5,
        gamesWon: 4,
        winRate: 80,
        totalScore: 550,
        averageScore: 110,
        streakCount: 2, // Only last 2 consecutive wins
        rank: 'Intermediate',
        badgeCount: 0,
      });
    });

    it('should handle empty game results', () => {
      const result = calculateUserStatistics({ gameResults: [] });

      expect(result).toEqual({
        totalGames: 0,
        gamesWon: 0,
        winRate: 0,
        totalScore: 0,
        averageScore: 0,
        streakCount: 0,
        rank: 'Beginner',
        badgeCount: 0,
      });
    });

    it('should handle games with missing scores', () => {
      const gameResults: Partial<GameResult>[] = [
        { placement: 1, final_score: 100 },
        { placement: 2, final_score: null as unknown as number },
        { placement: 1, final_score: undefined },
        { placement: 1, final_score: 120 },
      ];

      const result = calculateUserStatistics({ gameResults });

      expect(result).toEqual({
        totalGames: 4,
        gamesWon: 3,
        winRate: 75,
        totalScore: 220, // Only counts non-null scores
        averageScore: 55,
        streakCount: 2,
        rank: 'Beginner', // Not enough games for higher rank
        badgeCount: 0,
      });
    });
  });

  describe('Rank Calculation', () => {
    const rankTestCases = [
      { totalGames: 0, winRate: 0, expectedRank: 'Beginner' },
      { totalGames: 3, winRate: 100, expectedRank: 'Beginner' },
      { totalGames: 10, winRate: 50, expectedRank: 'Intermediate' }, // 5 wins out of 10 = 50%
      { totalGames: 10, winRate: 40, expectedRank: 'Beginner' }, // 4 wins out of 10 = 40%
      { totalGames: 10, winRate: 60, expectedRank: 'Advanced' }, // 6 wins out of 10 = 60%
      { totalGames: 10, winRate: 50, expectedRank: 'Intermediate' }, // 5 wins out of 10 = 50%
      { totalGames: 25, winRate: 72, expectedRank: 'Expert' }, // 18 wins out of 25 = 72%
      { totalGames: 25, winRate: 64, expectedRank: 'Advanced' }, // 16 wins out of 25 = 64%  
      { totalGames: 50, winRate: 80, expectedRank: 'Master' }, // 40 wins out of 50 = 80%
      { totalGames: 50, winRate: 72, expectedRank: 'Expert' }, // 36 wins out of 50 = 72%
      { totalGames: 100, winRate: 90, expectedRank: 'Master' }, // 90 wins out of 100 = 90%
    ];

    rankTestCases.forEach(({ totalGames, winRate, expectedRank }) => {
      it(`should assign ${expectedRank} rank for ${totalGames} games with ${winRate}% win rate`, () => {
        const gamesWon = Math.round((totalGames * winRate) / 100);
        const userStats: Partial<UserStats> = {
          total_games: totalGames,
          games_won: gamesWon,
          total_score: totalGames * 100,
          average_score: 100,
          current_win_streak: 0,
        };

        const result = calculateUserStatistics({ userStats });

        expect(result.rank).toBe(expectedRank);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null user stats and game results', () => {
      const result = calculateUserStatistics({
        userStats: null,
        gameResults: null,
      });

      expect(result).toEqual({
        totalGames: 0,
        gamesWon: 0,
        winRate: 0,
        totalScore: 0,
        averageScore: 0,
        streakCount: 0,
        rank: 'Beginner',
        badgeCount: 0,
      });
    });

    it('should include badge count from activities', () => {
      const userStats: Partial<UserStats> = {
        total_games: 10,
        games_won: 6,
        total_score: 600,
        average_score: 60,
        current_win_streak: 2,
      };

      const result = calculateUserStatistics({ userStats, activityCount: 5 });

      expect(result.badgeCount).toBe(5);
    });

    it('should round percentages and averages correctly', () => {
      const userStats: Partial<UserStats> = {
        total_games: 3,
        games_won: 2,
        total_score: 100,
        average_score: 33.333333,
        current_win_streak: 1,
      };

      const result = calculateUserStatistics({ userStats });

      expect(result.winRate).toBe(66.67); // Rounded to 2 decimals
      expect(result.averageScore).toBe(33.33); // Rounded to 2 decimals
    });

    it('should handle very large numbers', () => {
      const userStats: Partial<UserStats> = {
        total_games: 10000,
        games_won: 8500,
        total_score: 1000000,
        average_score: 100,
        current_win_streak: 150,
      };

      const result = calculateUserStatistics({ userStats });

      expect(result).toEqual({
        totalGames: 10000,
        gamesWon: 8500,
        winRate: 85,
        totalScore: 1000000,
        averageScore: 100,
        streakCount: 150,
        rank: 'Master',
        badgeCount: 0,
      });
    });
  });

  describe('Performance with Large Datasets', () => {
    it('should efficiently calculate stats from 1000 game results', () => {
      const gameResults: Partial<GameResult>[] = Array.from({ length: 1000 }, (_, i) => ({
        placement: i % 3 === 0 ? 1 : 2,
        final_score: 50 + Math.floor(Math.random() * 100),
      }));

      const startTime = performance.now();
      const result = calculateUserStatistics({ gameResults });
      const endTime = performance.now();

      // Should complete within reasonable time (< 10ms)
      expect(endTime - startTime).toBeLessThan(10);

      // Verify calculation is correct
      expect(result.totalGames).toBe(1000);
      expect(result.gamesWon).toBeGreaterThan(300); // ~333 wins expected
      expect(result.gamesWon).toBeLessThan(400);
    });

    it('should only consider last 10 games for streak calculation', () => {
      // Create 100 wins followed by 10 losses
      const gameResults: Partial<GameResult>[] = [
        ...Array.from({ length: 100 }, () => ({ placement: 1, final_score: 100 })),
        ...Array.from({ length: 10 }, () => ({ placement: 2, final_score: 80 })),
      ];

      const result = calculateUserStatistics({ gameResults });

      expect(result.streakCount).toBe(0); // No wins in last 10 games
    });
  });
});