import { describe, expect, it, beforeEach } from '@jest/globals';
import type { ActivityType, ActivityData } from '@/features/user/types/activity';

/**
 * Activity Tracker Tests
 * 
 * Tests business logic for activity tracking, including:
 * - Activity description generation
 * - Points calculation
 * - Batch processing
 * - Time-series data handling
 */

// Business logic extracted from useActivityTracker hook
function generateActivityDescription(
  activityType: ActivityType,
  data?: ActivityData
): string {
  const defaultDescriptions: Record<ActivityType, string> = {
    login: 'User logged in',
    logout: 'User logged out',
    board_create: 'Created a new board',
    board_join: 'Joined a board',
    board_complete: 'Completed a board',
    submission_create: 'Created a new submission',
    discussion_create: 'Started a new discussion',
    comment_create: 'Posted a comment',
    achievement_unlock: 'Unlocked an achievement',
  };

  if (!data) {
    return defaultDescriptions[activityType] || `Performed activity: ${activityType}`;
  }

  switch (activityType) {
    case 'board_create':
      if ('board_title' in data && data.board_title) {
        return `Created a new board: ${data.board_title}`;
      }
      break;
    case 'board_join':
      if ('board_title' in data && data.board_title) {
        return `Joined a board: ${data.board_title}`;
      }
      break;
    case 'board_complete':
      if ('board_title' in data && data.board_title) {
        return `Completed a board: ${data.board_title}`;
      }
      break;
    case 'submission_create':
      if ('challenge_title' in data && data.challenge_title) {
        return `Created a submission: ${data.challenge_title}`;
      }
      break;
    case 'discussion_create':
      if ('title' in data && data.title) {
        return `Started a discussion: ${data.title}`;
      }
      break;
    case 'comment_create':
      if ('discussion_title' in data && data.discussion_title) {
        return `Commented on: ${data.discussion_title}`;
      }
      break;
    case 'achievement_unlock':
      if ('achievement_name' in data && data.achievement_name) {
        return `Unlocked achievement: ${data.achievement_name}`;
      }
      break;
  }

  return defaultDescriptions[activityType] || `Performed activity: ${activityType}`;
}

function calculatePointsEarned(
  activityType: ActivityType,
  data?: ActivityData
): number {
  const basePoints: Record<ActivityType, number> = {
    login: 1,
    logout: 0,
    board_create: 10,
    board_join: 5,
    board_complete: 20,
    submission_create: 15,
    discussion_create: 10,
    comment_create: 3,
    achievement_unlock: 50,
  };

  let points = basePoints[activityType] || 0;

  if (!data) {
    return points;
  }

  // Bonus points based on difficulty for board activities only
  if ('difficulty' in data && data.difficulty && 
      (activityType === 'board_create' || activityType === 'board_join' || activityType === 'board_complete')) {
    if (data.difficulty === 'hard') {
      points *= 1.5;
    } else if (data.difficulty === 'expert') {
      points *= 2;
    }
  }

  return Math.round(points);
}

describe('Activity Tracker', () => {
  describe('Activity Description Generation', () => {
    it('should generate default descriptions without data', () => {
      const activities: ActivityType[] = [
        'login',
        'logout',
        'board_create',
        'board_join',
        'board_complete',
        'submission_create',
        'discussion_create',
        'comment_create',
        'achievement_unlock',
      ];

      const expectedDescriptions = [
        'User logged in',
        'User logged out',
        'Created a new board',
        'Joined a board',
        'Completed a board',
        'Created a new submission',
        'Started a new discussion',
        'Posted a comment',
        'Unlocked an achievement',
      ];

      activities.forEach((activity, index) => {
        expect(generateActivityDescription(activity)).toBe(expectedDescriptions[index]);
      });
    });

    it('should generate detailed descriptions with data', () => {
      const testCases = [
        {
          type: 'board_create' as ActivityType,
          data: { board_title: 'Epic Adventure Board' },
          expected: 'Created a new board: Epic Adventure Board',
        },
        {
          type: 'board_join' as ActivityType,
          data: { board_title: 'Mystery Challenge' },
          expected: 'Joined a board: Mystery Challenge',
        },
        {
          type: 'board_complete' as ActivityType,
          data: { board_title: 'Speed Run Master' },
          expected: 'Completed a board: Speed Run Master',
        },
        {
          type: 'submission_create' as ActivityType,
          data: { challenge_title: 'Photo Hunt Challenge' },
          expected: 'Created a submission: Photo Hunt Challenge',
        },
        {
          type: 'discussion_create' as ActivityType,
          data: { title: 'Best strategies for speedruns?' },
          expected: 'Started a discussion: Best strategies for speedruns?',
        },
        {
          type: 'comment_create' as ActivityType,
          data: { discussion_title: 'Game Tips Thread' },
          expected: 'Commented on: Game Tips Thread',
        },
        {
          type: 'achievement_unlock' as ActivityType,
          data: { achievement_name: 'Speedrun Expert' },
          expected: 'Unlocked achievement: Speedrun Expert',
        },
      ];

      testCases.forEach(({ type, data, expected }) => {
        expect(generateActivityDescription(type, data)).toBe(expected);
      });
    });

    it('should fall back to default when data is incomplete', () => {
      const testCases = [
        {
          type: 'board_create' as ActivityType,
          data: { some_other_field: 'value' }, // Missing board_title
          expected: 'Created a new board',
        },
        {
          type: 'discussion_create' as ActivityType,
          data: { body: 'Some content' }, // Missing title
          expected: 'Started a new discussion',
        },
      ];

      testCases.forEach(({ type, data, expected }) => {
        expect(generateActivityDescription(type, data)).toBe(expected);
      });
    });

    it('should handle empty strings in data', () => {
      const testCases = [
        {
          type: 'board_create' as ActivityType,
          data: { board_title: '' },
          expected: 'Created a new board',
        },
        {
          type: 'achievement_unlock' as ActivityType,
          data: { achievement_name: '' },
          expected: 'Unlocked an achievement',
        },
      ];

      testCases.forEach(({ type, data, expected }) => {
        expect(generateActivityDescription(type, data)).toBe(expected);
      });
    });
  });

  describe('Points Calculation', () => {
    it('should calculate base points correctly', () => {
      const activities: ActivityType[] = [
        'login',
        'logout',
        'board_create',
        'board_join',
        'board_complete',
        'submission_create',
        'discussion_create',
        'comment_create',
        'achievement_unlock',
      ];

      const expectedPoints = [1, 0, 10, 5, 20, 15, 10, 3, 50];

      activities.forEach((activity, index) => {
        expect(calculatePointsEarned(activity)).toBe(expectedPoints[index]);
      });
    });

    it('should apply difficulty multipliers for board activities', () => {
      const testCases = [
        {
          type: 'board_create' as ActivityType,
          data: { difficulty: 'easy' },
          expected: 10, // No multiplier
        },
        {
          type: 'board_create' as ActivityType,
          data: { difficulty: 'medium' },
          expected: 10, // No multiplier
        },
        {
          type: 'board_create' as ActivityType,
          data: { difficulty: 'hard' },
          expected: 15, // 1.5x multiplier
        },
        {
          type: 'board_create' as ActivityType,
          data: { difficulty: 'expert' },
          expected: 20, // 2x multiplier
        },
        {
          type: 'board_complete' as ActivityType,
          data: { difficulty: 'hard' },
          expected: 30, // 20 * 1.5
        },
        {
          type: 'board_complete' as ActivityType,
          data: { difficulty: 'expert' },
          expected: 40, // 20 * 2
        },
      ];

      testCases.forEach(({ type, data, expected }) => {
        expect(calculatePointsEarned(type, data)).toBe(expected);
      });
    });

    it('should not apply difficulty multipliers to non-board activities', () => {
      const testCases = [
        {
          type: 'submission_create' as ActivityType,
          data: { difficulty: 'hard' },
          expected: 15, // No multiplier applied
        },
        {
          type: 'achievement_unlock' as ActivityType,
          data: { difficulty: 'expert' },
          expected: 50, // No multiplier applied
        },
      ];

      testCases.forEach(({ type, data, expected }) => {
        expect(calculatePointsEarned(type, data)).toBe(expected);
      });
    });

    it('should round points to nearest integer', () => {
      // If we had fractional multipliers, this would test rounding
      const type = 'board_join' as ActivityType;
      const data = { difficulty: 'hard' };
      const points = calculatePointsEarned(type, data);
      
      expect(points).toBe(8); // 5 * 1.5 = 7.5, rounded to 8
      expect(Number.isInteger(points)).toBe(true);
    });
  });

  describe('Batch Processing', () => {
    it('should handle batch activity creation', () => {
      const activities = [
        { type: 'login' as ActivityType, data: {} },
        { type: 'board_join' as ActivityType, data: { board_title: 'Test Board' } },
        { type: 'board_complete' as ActivityType, data: { board_title: 'Test Board', difficulty: 'hard' } },
        { type: 'achievement_unlock' as ActivityType, data: { achievement_name: 'First Win' } },
      ];

      const results = activities.map(activity => ({
        description: generateActivityDescription(activity.type, activity.data),
        points: calculatePointsEarned(activity.type, activity.data),
      }));

      expect(results).toEqual([
        { description: 'User logged in', points: 1 },
        { description: 'Joined a board: Test Board', points: 5 },
        { description: 'Completed a board: Test Board', points: 30 },
        { description: 'Unlocked achievement: First Win', points: 50 },
      ]);

      // Total points should be calculated correctly
      const totalPoints = results.reduce((sum, r) => sum + r.points, 0);
      expect(totalPoints).toBe(86);
    });

    it('should process activities in chunks efficiently', () => {
      const BATCH_SIZE = 10;
      const TOTAL_ACTIVITIES = 100;

      // Generate test activities
      const activities = Array.from({ length: TOTAL_ACTIVITIES }, (_, i) => ({
        type: (i % 2 === 0 ? 'comment_create' : 'board_join') as ActivityType,
        data: { index: i },
      }));

      // Process in batches
      const batches: any[][] = [];
      for (let i = 0; i < activities.length; i += BATCH_SIZE) {
        batches.push(activities.slice(i, i + BATCH_SIZE));
      }

      expect(batches.length).toBe(10);
      expect(batches[0].length).toBe(BATCH_SIZE);
      expect(batches[batches.length - 1].length).toBe(BATCH_SIZE);

      // Verify all activities are included
      const processedCount = batches.reduce((sum, batch) => sum + batch.length, 0);
      expect(processedCount).toBe(TOTAL_ACTIVITIES);
    });
  });

  describe('Time-Series Data', () => {
    interface TimedActivity {
      type: ActivityType;
      timestamp: Date;
      data?: ActivityData;
    }

    it('should handle activities across different time periods', () => {
      const now = new Date();
      const activities: TimedActivity[] = [
        { type: 'login', timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) }, // 4 days ago
        { type: 'board_create', timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) }, // 3 days ago
        { type: 'board_complete', timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) }, // 2 days ago
        { type: 'comment_create', timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) }, // 1 day ago
        { type: 'achievement_unlock', timestamp: now }, // Today
      ];

      // Group by day
      const dailyActivities = activities.reduce((acc, activity) => {
        const day = activity.timestamp.toISOString().split('T')[0];
        if (!acc[day]) acc[day] = [];
        acc[day].push(activity);
        return acc;
      }, {} as Record<string, TimedActivity[]>);

      expect(Object.keys(dailyActivities).length).toBe(5); // 5 different days

      // Calculate daily points
      const dailyPoints = Object.entries(dailyActivities).map(([day, dayActivities]) => ({
        day,
        points: dayActivities.reduce((sum, a) => sum + calculatePointsEarned(a.type), 0),
      }));

      // Today should have the most points (achievement unlock = 50)
      const todayPoints = dailyPoints.find(d => d.day === now.toISOString().split('T')[0]);
      expect(todayPoints?.points).toBe(50);
    });

    it('should aggregate activities by hour for recent activity', () => {
      const now = new Date();
      const recentActivities: TimedActivity[] = Array.from({ length: 24 }, (_, hour) => ({
        type: 'comment_create' as ActivityType,
        timestamp: new Date(now.getTime() - hour * 60 * 60 * 1000),
        data: { discussion_title: `Discussion ${hour}` },
      }));

      // Group by hour
      const hourlyGroups = recentActivities.reduce((acc, activity) => {
        const hour = Math.floor((now.getTime() - activity.timestamp.getTime()) / (60 * 60 * 1000));
        if (!acc[hour]) acc[hour] = 0;
        acc[hour]++;
        return acc;
      }, {} as Record<number, number>);

      expect(Object.keys(hourlyGroups).length).toBe(24);
      Object.values(hourlyGroups).forEach(count => {
        expect(count).toBe(1); // One activity per hour
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown activity types', () => {
      const unknownType = 'unknown_activity' as ActivityType;
      
      expect(generateActivityDescription(unknownType)).toBe('Performed activity: unknown_activity');
      expect(calculatePointsEarned(unknownType)).toBe(0);
    });

    it('should handle very long titles in descriptions', () => {
      const longTitle = 'A'.repeat(1000);
      const description = generateActivityDescription('board_create', { board_title: longTitle });
      
      expect(description).toBe(`Created a new board: ${longTitle}`);
      expect(description.length).toBeGreaterThan(1000);
    });

    it('should handle special characters in titles', () => {
      const specialTitles = [
        'Board with "quotes"',
        'Board with <html>',
        'Board with emoji 🎮🏆',
        'Board with\nnewlines',
        'Board with\ttabs',
      ];

      specialTitles.forEach(title => {
        const description = generateActivityDescription('board_create', { board_title: title });
        expect(description).toBe(`Created a new board: ${title}`);
      });
    });

    it('should handle concurrent activity logging scenarios', () => {
      // Simulate multiple activities happening at the same time
      const timestamp = new Date();
      const concurrentActivities = [
        { type: 'board_join' as ActivityType, timestamp, userId: 'user1' },
        { type: 'board_join' as ActivityType, timestamp, userId: 'user2' },
        { type: 'board_join' as ActivityType, timestamp, userId: 'user3' },
      ];

      // Each should generate independent descriptions and points
      const results = concurrentActivities.map(activity => ({
        userId: activity.userId,
        description: generateActivityDescription(activity.type),
        points: calculatePointsEarned(activity.type),
      }));

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.description).toBe('Joined a board');
        expect(result.points).toBe(5);
      });
    });
  });
});