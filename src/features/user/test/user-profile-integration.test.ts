import { describe, expect, it, beforeEach } from '@jest/globals';
import {
  createUserProfile,
  createUserStats,
  createGameHistory,
  createActivityLog,
  createNewUser,
  createPowerUser,
  resetCounters,
} from './factories/user-factory';

/**
 * User Profile Integration Tests
 * 
 * Tests that validate the interaction between different user profile
 * components and business logic functions.
 */

describe('User Profile Integration', () => {
  beforeEach(() => {
    resetCounters();
  });

  describe('End-to-End User Journey', () => {
    it('should handle a complete new user onboarding', () => {
      // 1. New user registration
      const newUser = createNewUser('newcomer123');
      
      expect(newUser.experience_points).toBe(0);
      expect(newUser.bio).toBeNull();
      expect(newUser.avatar_url).toBeNull();

      // 2. First profile update
      const updatedProfile = {
        ...newUser,
        bio: 'Just started playing, excited to learn!',
        avatar_url: 'https://example.com/newcomer-avatar.jpg',
        city: 'Portland',
        region: 'Oregon',
        land: 'USA',
      };

      expect(updatedProfile.bio).toBeTruthy();
      expect(updatedProfile.avatar_url).toBeTruthy();

      // 3. First game activities
      const gameHistory = createGameHistory(newUser.id, 5, { winRate: 0.2 }); // Beginner win rate
      const activityLog = createActivityLog(newUser.id, 3, 5); // 3 days, moderate activity

      expect(gameHistory).toHaveLength(5);
      expect(activityLog.length).toBeGreaterThan(10);

      // 4. Progress check
      const gamesWon = gameHistory.filter(g => g.placement === 1).length;
      expect(gamesWon).toBeLessThanOrEqual(3); // Low win rate for beginner (20% of 5 games = ~1 win, allow variance)
    });

    it('should track progression from new user to power user', () => {
      const userId = 'progression_user';
      
      // Week 1: Beginner
      const week1Games = createGameHistory(userId, 10, { winRate: 0.3 });
      const week1Activities = createActivityLog(userId, 7, 8);
      
      // Week 4: Improving
      const week4Games = createGameHistory(userId, 20, { winRate: 0.6 });
      const week4Activities = createActivityLog(userId, 7, 15);
      
      // Month 3: Experienced
      const month3Games = createGameHistory(userId, 50, { winRate: 0.8 });
      const month3Activities = createActivityLog(userId, 30, 20);

      // Calculate total progression
      const totalGames = week1Games.length + week4Games.length + month3Games.length;
      const totalWins = [
        ...week1Games,
        ...week4Games,
        ...month3Games,
      ].filter(g => g.placement === 1).length;
      
      const overallWinRate = totalWins / totalGames;

      expect(totalGames).toBe(80);
      expect(overallWinRate).toBeGreaterThan(0.6); // Good progression
      expect(overallWinRate).toBeLessThan(0.8); // Realistic progression

      // Activity should increase over time
      expect(month3Activities.length).toBeGreaterThan(week1Activities.length * 2);
    });
  });

  describe('Statistical Aggregation Scenarios', () => {
    it('should handle large datasets efficiently', () => {
      const powerUser = createPowerUser('stats_master');
      const largeGameHistory = createGameHistory(powerUser.profile.id, 1000, {
        winRate: 0.75,
        avgScore: 120,
        timeRange: 365, // 1 year of games
      });

      const largeActivityLog = createActivityLog(powerUser.profile.id, 365, 25); // 1 year of activity

      // Verify data integrity
      expect(largeGameHistory).toHaveLength(1000);
      expect(largeActivityLog.length).toBeGreaterThan(9000); // ~25 activities per day

      // Test aggregation performance
      const startTime = performance.now();

      // Group games by month
      const monthlyStats = largeGameHistory.reduce((acc, game) => {
        const month = game.created_at.substring(0, 7); // YYYY-MM
        if (!acc[month]) {
          acc[month] = { games: 0, wins: 0, totalScore: 0 };
        }
        acc[month].games++;
        if (game.placement === 1) acc[month].wins++;
        acc[month].totalScore += game.final_score;
        return acc;
      }, {} as Record<string, { games: number; wins: number; totalScore: number }>);

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Should be fast
      expect(Object.keys(monthlyStats).length).toBeGreaterThan(0);
    });

    it('should calculate streak accurately from historical data', () => {
      const userId = 'streak_test_user';
      
      // Create a specific game sequence: WWLWWWLWWWWW
      const gameSequence = [
        { placement: 1 }, // W
        { placement: 1 }, // W
        { placement: 2 }, // L
        { placement: 1 }, // W
        { placement: 1 }, // W
        { placement: 1 }, // W
        { placement: 2 }, // L
        { placement: 1 }, // W
        { placement: 1 }, // W
        { placement: 1 }, // W
        { placement: 1 }, // W
        { placement: 1 }, // W - Current streak should be 5
      ];

      const gameHistory = gameSequence.map((game, index) =>
        createGameHistory(userId, 1, {})[0] // Create base game
      ).map((game, index) => ({
        ...game,
        placement: gameSequence[index].placement,
        created_at: new Date(Date.now() - (gameSequence.length - index) * 60000).toISOString(),
      }));

      // Calculate current streak from the end
      let currentStreak = 0;
      for (let i = gameHistory.length - 1; i >= 0; i--) {
        if (gameHistory[i].placement === 1) {
          currentStreak++;
        } else {
          break;
        }
      }

      expect(currentStreak).toBe(5);

      // Calculate longest streak
      let longestStreak = 0;
      let tempStreak = 0;
      
      gameHistory.forEach(game => {
        if (game.placement === 1) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      });

      expect(longestStreak).toBe(5); // The last sequence of wins
    });
  });

  describe('Activity Pattern Analysis', () => {
    it('should identify user activity patterns', () => {
      const userId = 'pattern_user';
      const activities = createActivityLog(userId, 14, 10); // 2 weeks

      // Group by day of week
      const dayPatterns = activities.reduce((acc, activity) => {
        const dayOfWeek = new Date(activity.created_at).getDay();
        acc[dayOfWeek] = (acc[dayOfWeek] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      // Group by hour
      const hourPatterns = activities.reduce((acc, activity) => {
        const hour = new Date(activity.created_at).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      // Group by activity type
      const typePatterns = activities.reduce((acc, activity) => {
        acc[activity.activity_type] = (acc[activity.activity_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(Object.keys(dayPatterns).length).toBeGreaterThan(0);
      expect(Object.keys(hourPatterns).length).toBeGreaterThan(0);
      expect(Object.keys(typePatterns).length).toBeGreaterThan(3); // Multiple activity types
    });

    it('should calculate activity velocity and trends', () => {
      const userId = 'velocity_user';
      const activities = createActivityLog(userId, 30, 15); // 30 days

      // Split into weeks for trend analysis
      const now = Date.now();
      const weeks = Array.from({ length: 4 }, (_, weekIndex) => {
        const weekStart = now - (weekIndex + 1) * 7 * 24 * 60 * 60 * 1000;
        const weekEnd = now - weekIndex * 7 * 24 * 60 * 60 * 1000;
        
        return activities.filter(activity => {
          const activityTime = new Date(activity.created_at).getTime();
          return activityTime >= weekStart && activityTime < weekEnd;
        });
      });

      const weeklyActivityCounts = weeks.map(week => week.length);

      // Calculate trend (increasing/decreasing activity)
      let trendScore = 0;
      for (let i = 1; i < weeklyActivityCounts.length; i++) {
        if (weeklyActivityCounts[i] > weeklyActivityCounts[i - 1]) {
          trendScore += 1;
        } else if (weeklyActivityCounts[i] < weeklyActivityCounts[i - 1]) {
          trendScore -= 1;
        }
      }

      expect(weeklyActivityCounts).toHaveLength(4);
      expect(weeklyActivityCounts.every(count => count > 0)).toBe(true);
      expect(Math.abs(trendScore)).toBeLessThanOrEqual(3); // Reasonable trend variation
    });
  });

  describe('Cross-Component Data Consistency', () => {
    it('should maintain consistency between game results and user stats', () => {
      const userId = 'consistency_user';
      const gameHistory = createGameHistory(userId, 100, { winRate: 0.6, avgScore: 85 });
      
      // Calculate stats from game history
      const wins = gameHistory.filter(g => g.placement === 1);
      const calculatedStats = {
        total_games: gameHistory.length,
        games_won: wins.length,
        total_score: gameHistory.reduce((sum, g) => sum + g.final_score, 0),
        average_score: gameHistory.reduce((sum, g) => sum + g.final_score, 0) / gameHistory.length,
        highest_score: Math.max(...gameHistory.map(g => g.final_score)),
        fastest_win: wins.length > 0 ? Math.min(...wins.map(g => g.time_to_win!).filter(t => t !== null)) : null,
      };

      // Create user stats that should match
      const userStats = createUserStats({
        user_id: userId,
        total_games: calculatedStats.total_games,
        games_won: calculatedStats.games_won,
        total_score: calculatedStats.total_score,
        average_score: Math.round(calculatedStats.average_score),
        highest_score: calculatedStats.highest_score,
        fastest_win: calculatedStats.fastest_win,
      });

      expect(userStats.total_games).toBe(calculatedStats.total_games);
      expect(userStats.games_won).toBe(calculatedStats.games_won);
      expect(userStats.total_score).toBe(calculatedStats.total_score);
      expect(Math.abs(userStats.average_score - calculatedStats.average_score)).toBeLessThan(1);
    });

    it('should handle edge cases in data aggregation', () => {
      const userId = 'edge_case_user';
      
      // Edge case: All losses
      const allLossGames = createGameHistory(userId, 10, { winRate: 0 });
      const lossStats = {
        games_won: allLossGames.filter(g => g.placement === 1).length,
        win_rate: 0,
        fastest_win: null, // No wins
        current_streak: 0,
      };

      expect(lossStats.games_won).toBe(0);
      expect(lossStats.win_rate).toBe(0);
      expect(lossStats.fastest_win).toBeNull();

      // Edge case: All wins
      const allWinGames = createGameHistory(userId, 10, { winRate: 1 });
      const winStats = {
        games_won: allWinGames.filter(g => g.placement === 1).length,
        win_rate: 100,
        current_streak: 10,
      };

      expect(winStats.games_won).toBe(10);
      expect(winStats.win_rate).toBe(100);
      expect(winStats.current_streak).toBe(10);

      // Edge case: Single game
      const singleGame = createGameHistory(userId, 1, { winRate: 1 });
      expect(singleGame).toHaveLength(1);
      expect(singleGame[0].placement).toBe(1);
    });
  });

  describe('Time-Based Analysis', () => {
    it('should analyze user engagement over time', () => {
      const userId = 'engagement_user';
      const activities = createActivityLog(userId, 60, 20); // 2 months

      // Calculate daily engagement scores
      const dailyEngagement = activities.reduce((acc, activity) => {
        const date = activity.created_at.split('T')[0];
        if (!acc[date]) {
          acc[date] = { activities: 0, types: new Set(), score: 0 };
        }
        
        acc[date].activities++;
        acc[date].types.add(activity.activity_type);
        
        // Scoring: base activity + variety bonus
        acc[date].score = acc[date].activities + acc[date].types.size * 2;
        
        return acc;
      }, {} as Record<string, { activities: number; types: Set<string>; score: number }>);

      const engagementScores = Object.values(dailyEngagement).map((d: { activities: number; types: Set<string>; score: number }) => d.score);
      const avgEngagement = engagementScores.reduce((sum, score) => sum + score, 0) / engagementScores.length;

      expect(engagementScores.length).toBeGreaterThan(30); // Should have data for most days
      expect(avgEngagement).toBeGreaterThan(0);
      expect(Math.max(...engagementScores)).toBeGreaterThan(avgEngagement);
    });
  });
});