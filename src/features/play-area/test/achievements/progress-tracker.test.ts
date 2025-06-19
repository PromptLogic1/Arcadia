import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Progress tracking types
interface ProgressEvent {
  type:
    | 'game_completed'
    | 'achievement_progress'
    | 'milestone_reached'
    | 'streak_update';
  userId: string;
  timestamp: number;
  data: Record<string, any>;
}

interface UserProgress {
  userId: string;
  totalGamesPlayed: number;
  totalPlayTime: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayedAt: string;
  achievements: Map<string, number>;
  milestones: Set<string>;
  statistics: GameStatistics;
}

interface GameStatistics {
  winRate: number;
  averageGameDuration: number;
  favoriteGameType: string;
  peakPlayTime: { hour: number; count: number };
  weeklyActivity: number[];
}

interface ProgressUpdate {
  field: keyof UserProgress | string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

// Progress tracker implementation
export class ProgressTracker {
  private userProgress: Map<string, UserProgress> = new Map();
  private progressHistory: Map<string, ProgressUpdate[]> = new Map();
  private eventQueue: ProgressEvent[] = [];
  private processingEvents = false;

  // Initialize or get user progress
  getUserProgress(userId: string): UserProgress {
    if (!this.userProgress.has(userId)) {
      this.userProgress.set(userId, {
        userId,
        totalGamesPlayed: 0,
        totalPlayTime: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastPlayedAt: new Date().toISOString(),
        achievements: new Map(),
        milestones: new Set(),
        statistics: {
          winRate: 0,
          averageGameDuration: 0,
          favoriteGameType: '',
          peakPlayTime: { hour: 0, count: 0 },
          weeklyActivity: new Array(7).fill(0),
        },
      });
    }
    return this.userProgress.get(userId)!;
  }

  // Track game completion
  trackGameCompletion(
    userId: string,
    gameData: {
      duration: number;
      won: boolean;
      gameType: string;
      score?: number;
    }
  ): UserProgress {
    const progress = this.getUserProgress(userId);
    const oldProgress = { ...progress };

    // Update basic stats
    progress.totalGamesPlayed++;
    progress.totalPlayTime += gameData.duration;

    // Update win rate
    const totalWins = Math.round(
      progress.statistics.winRate * (progress.totalGamesPlayed - 1)
    );
    const newWins = totalWins + (gameData.won ? 1 : 0);
    progress.statistics.winRate = newWins / progress.totalGamesPlayed;

    // Update average duration
    const totalDuration =
      progress.statistics.averageGameDuration * (progress.totalGamesPlayed - 1);
    progress.statistics.averageGameDuration =
      (totalDuration + gameData.duration) / progress.totalGamesPlayed;

    // Update streaks
    if (gameData.won) {
      this.updateStreak(userId, true);
    } else {
      this.updateStreak(userId, false);
    }

    // Update last played
    progress.lastPlayedAt = new Date().toISOString();

    // Track game type frequency
    this.updateGameTypeStats(progress, gameData.gameType);

    // Track play time patterns
    this.updatePlayTimePatterns(progress);

    // Record changes
    this.recordProgressUpdate(userId, oldProgress, progress);

    // Queue event for async processing
    this.queueEvent({
      type: 'game_completed',
      userId,
      timestamp: Date.now(),
      data: gameData,
    });

    return progress;
  }

  // Update achievement progress
  updateAchievementProgress(
    userId: string,
    achievementId: string,
    progress: number
  ): { oldProgress: number; newProgress: number; completed: boolean } {
    const userProgress = this.getUserProgress(userId);
    const oldProgress = userProgress.achievements.get(achievementId) || 0;
    const newProgress = Math.max(oldProgress, progress);

    userProgress.achievements.set(achievementId, newProgress);

    const completed = newProgress >= 100;

    // Queue event
    this.queueEvent({
      type: 'achievement_progress',
      userId,
      timestamp: Date.now(),
      data: { achievementId, oldProgress, newProgress, completed },
    });

    return { oldProgress, newProgress, completed };
  }

  // Track milestone reached
  trackMilestone(userId: string, milestoneId: string): boolean {
    const progress = this.getUserProgress(userId);

    if (progress.milestones.has(milestoneId)) {
      return false; // Already achieved
    }

    progress.milestones.add(milestoneId);

    this.queueEvent({
      type: 'milestone_reached',
      userId,
      timestamp: Date.now(),
      data: { milestoneId },
    });

    return true;
  }

  // Update win/loss streak
  private updateStreak(userId: string, won: boolean) {
    const progress = this.getUserProgress(userId);
    const oldStreak = progress.currentStreak;

    if (won) {
      progress.currentStreak++;
      if (progress.currentStreak > progress.longestStreak) {
        progress.longestStreak = progress.currentStreak;
      }
    } else {
      progress.currentStreak = 0;
    }

    if (oldStreak !== progress.currentStreak) {
      this.queueEvent({
        type: 'streak_update',
        userId,
        timestamp: Date.now(),
        data: { oldStreak, newStreak: progress.currentStreak },
      });
    }
  }

  // Update game type statistics
  private updateGameTypeStats(progress: UserProgress, gameType: string) {
    // Simple frequency tracking (in real app, would be more sophisticated)
    if (!progress.statistics.favoriteGameType) {
      progress.statistics.favoriteGameType = gameType;
    }
  }

  // Update play time patterns
  private updatePlayTimePatterns(progress: UserProgress) {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Update peak hour
    if (hour === progress.statistics.peakPlayTime.hour) {
      progress.statistics.peakPlayTime.count++;
    }

    // Update weekly activity
    if (progress.statistics.weeklyActivity[dayOfWeek] !== undefined) {
      progress.statistics.weeklyActivity[dayOfWeek]++;
    }
  }

  // Record progress updates for history
  private recordProgressUpdate(
    userId: string,
    oldProgress: UserProgress,
    newProgress: UserProgress
  ) {
    if (!this.progressHistory.has(userId)) {
      this.progressHistory.set(userId, []);
    }

    const updates: ProgressUpdate[] = [];
    const timestamp = Date.now();

    // Check for changes in key fields
    if (oldProgress.totalGamesPlayed !== newProgress.totalGamesPlayed) {
      updates.push({
        field: 'totalGamesPlayed',
        oldValue: oldProgress.totalGamesPlayed,
        newValue: newProgress.totalGamesPlayed,
        timestamp,
      });
    }

    if (oldProgress.currentStreak !== newProgress.currentStreak) {
      updates.push({
        field: 'currentStreak',
        oldValue: oldProgress.currentStreak,
        newValue: newProgress.currentStreak,
        timestamp,
      });
    }

    this.progressHistory.get(userId)!.push(...updates);
  }

  // Queue event for async processing
  private queueEvent(event: ProgressEvent) {
    this.eventQueue.push(event);
    if (!this.processingEvents) {
      this.processEventQueue();
    }
  }

  // Process queued events
  private async processEventQueue() {
    this.processingEvents = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        // In real app, would save to database, trigger notifications, etc.
        await this.processEvent(event);
      }
    }

    this.processingEvents = false;
  }

  private async processEvent(event: ProgressEvent) {
    // Simulate async processing
    await new Promise(resolve => setTimeout(resolve, 10));
    console.log('Processed event:', event.type);
  }

  // Get progress history for user
  getProgressHistory(userId: string, limit?: number): ProgressUpdate[] {
    const history = this.progressHistory.get(userId) || [];
    if (limit) {
      return history.slice(-limit);
    }
    return history;
  }

  // Calculate progress velocity (rate of improvement)
  calculateProgressVelocity(
    userId: string,
    days = 7
  ): {
    gamesPerDay: number;
    winRateChange: number;
    streakTrend: number;
  } {
    const progress = this.getUserProgress(userId);
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    // Get recent history
    const recentHistory = this.getProgressHistory(userId).filter(
      update => update.timestamp >= cutoff
    );

    // Calculate games per day
    const gamesInPeriod = recentHistory
      .filter(u => u.field === 'totalGamesPlayed')
      .reduce((sum, u) => sum + (u.newValue - u.oldValue), 0);

    const gamesPerDay = gamesInPeriod / days;

    // Calculate win rate change (simplified)
    const winRateChange = 0; // Would calculate from history

    // Calculate streak trend
    const streakUpdates = recentHistory
      .filter(u => u.field === 'currentStreak')
      .map(u => u.newValue as number);

    const streakTrend =
      streakUpdates.length > 0
        ? (streakUpdates[streakUpdates.length - 1] ?? 0) -
          (streakUpdates[0] ?? 0)
        : 0;

    return {
      gamesPerDay,
      winRateChange,
      streakTrend,
    };
  }

  // Get leaderboard data
  getLeaderboard(
    metric: 'totalGamesPlayed' | 'winRate' | 'longestStreak',
    limit = 10
  ): Array<{
    userId: string;
    value: number;
    rank: number;
  }> {
    const users = Array.from(this.userProgress.values());

    const sorted = users.sort((a, b) => {
      switch (metric) {
        case 'totalGamesPlayed':
          return b.totalGamesPlayed - a.totalGamesPlayed;
        case 'winRate':
          return b.statistics.winRate - a.statistics.winRate;
        case 'longestStreak':
          return b.longestStreak - a.longestStreak;
      }
    });

    return sorted.slice(0, limit).map((user, index) => ({
      userId: user.userId,
      value: metric === 'winRate' ? user.statistics.winRate : user[metric],
      rank: index + 1,
    }));
  }
}

describe('Progress Tracker', () => {
  let tracker: ProgressTracker;

  beforeEach(() => {
    tracker = new ProgressTracker();
  });

  describe('Basic Progress Tracking', () => {
    test('should initialize user progress', () => {
      const progress = tracker.getUserProgress('user-1');

      expect(progress).toEqual({
        userId: 'user-1',
        totalGamesPlayed: 0,
        totalPlayTime: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastPlayedAt: expect.any(String),
        achievements: new Map(),
        milestones: new Set(),
        statistics: {
          winRate: 0,
          averageGameDuration: 0,
          favoriteGameType: '',
          peakPlayTime: { hour: 0, count: 0 },
          weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
        },
      });
    });

    test('should track game completion', () => {
      const progress = tracker.trackGameCompletion('user-1', {
        duration: 1200, // 20 minutes
        won: true,
        gameType: 'puzzle',
        score: 1500,
      });

      expect(progress.totalGamesPlayed).toBe(1);
      expect(progress.totalPlayTime).toBe(1200);
      expect(progress.statistics.winRate).toBe(1);
      expect(progress.statistics.averageGameDuration).toBe(1200);
      expect(progress.currentStreak).toBe(1);
    });

    test('should update win rate correctly', () => {
      tracker.trackGameCompletion('user-1', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });
      tracker.trackGameCompletion('user-1', {
        duration: 600,
        won: false,
        gameType: 'puzzle',
      });
      tracker.trackGameCompletion('user-1', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });

      const progress = tracker.getUserProgress('user-1');
      expect(progress.statistics.winRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('Streak Tracking', () => {
    test('should track winning streaks', () => {
      tracker.trackGameCompletion('user-1', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });
      tracker.trackGameCompletion('user-1', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });
      tracker.trackGameCompletion('user-1', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });

      const progress = tracker.getUserProgress('user-1');
      expect(progress.currentStreak).toBe(3);
      expect(progress.longestStreak).toBe(3);
    });

    test('should reset streak on loss', () => {
      tracker.trackGameCompletion('user-1', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });
      tracker.trackGameCompletion('user-1', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });
      tracker.trackGameCompletion('user-1', {
        duration: 600,
        won: false,
        gameType: 'puzzle',
      });

      const progress = tracker.getUserProgress('user-1');
      expect(progress.currentStreak).toBe(0);
      expect(progress.longestStreak).toBe(2);
    });

    test('should preserve longest streak', () => {
      // First streak of 3
      for (let i = 0; i < 3; i++) {
        tracker.trackGameCompletion('user-1', {
          duration: 600,
          won: true,
          gameType: 'puzzle',
        });
      }

      // Loss
      tracker.trackGameCompletion('user-1', {
        duration: 600,
        won: false,
        gameType: 'puzzle',
      });

      // Second streak of 2
      for (let i = 0; i < 2; i++) {
        tracker.trackGameCompletion('user-1', {
          duration: 600,
          won: true,
          gameType: 'puzzle',
        });
      }

      const progress = tracker.getUserProgress('user-1');
      expect(progress.currentStreak).toBe(2);
      expect(progress.longestStreak).toBe(3);
    });
  });

  describe('Achievement Progress', () => {
    test('should track achievement progress', () => {
      const result = tracker.updateAchievementProgress(
        'user-1',
        'speedrun-master',
        50
      );

      expect(result.oldProgress).toBe(0);
      expect(result.newProgress).toBe(50);
      expect(result.completed).toBe(false);
    });

    test('should detect achievement completion', () => {
      tracker.updateAchievementProgress('user-1', 'speedrun-master', 50);
      const result = tracker.updateAchievementProgress(
        'user-1',
        'speedrun-master',
        100
      );

      expect(result.newProgress).toBe(100);
      expect(result.completed).toBe(true);
    });

    test('should not decrease progress', () => {
      tracker.updateAchievementProgress('user-1', 'speedrun-master', 75);
      const result = tracker.updateAchievementProgress(
        'user-1',
        'speedrun-master',
        50
      );

      expect(result.newProgress).toBe(75);
    });
  });

  describe('Milestone Tracking', () => {
    test('should track new milestones', () => {
      const result = tracker.trackMilestone('user-1', 'first-10-games');
      expect(result).toBe(true);

      const progress = tracker.getUserProgress('user-1');
      expect(progress.milestones.has('first-10-games')).toBe(true);
    });

    test('should not duplicate milestones', () => {
      tracker.trackMilestone('user-1', 'first-10-games');
      const result = tracker.trackMilestone('user-1', 'first-10-games');

      expect(result).toBe(false);
    });
  });

  describe('Progress History', () => {
    test('should record progress changes', () => {
      tracker.trackGameCompletion('user-1', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });
      tracker.trackGameCompletion('user-1', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });

      const history = tracker.getProgressHistory('user-1');

      expect(history.length).toBeGreaterThan(0);
      expect(history.some(u => u.field === 'totalGamesPlayed')).toBe(true);
      expect(history.some(u => u.field === 'currentStreak')).toBe(true);
    });

    test('should limit history results', () => {
      for (let i = 0; i < 10; i++) {
        tracker.trackGameCompletion('user-1', {
          duration: 600,
          won: true,
          gameType: 'puzzle',
        });
      }

      const history = tracker.getProgressHistory('user-1', 5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Progress Analytics', () => {
    test('should calculate progress velocity', () => {
      // Simulate games over time
      jest.useFakeTimers();
      const baseTime = new Date('2024-01-01').getTime();
      jest.setSystemTime(baseTime);

      for (let day = 0; day < 7; day++) {
        jest.setSystemTime(baseTime + day * 24 * 60 * 60 * 1000);
        tracker.trackGameCompletion('user-1', {
          duration: 600,
          won: day % 2 === 0,
          gameType: 'puzzle',
        });
      }

      const velocity = tracker.calculateProgressVelocity('user-1', 7);

      expect(velocity.gamesPerDay).toBeCloseTo(1, 1);
      expect(velocity.streakTrend).toBeDefined();

      jest.useRealTimers();
    });

    test('should calculate average game duration', () => {
      tracker.trackGameCompletion('user-1', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });
      tracker.trackGameCompletion('user-1', {
        duration: 900,
        won: true,
        gameType: 'puzzle',
      });
      tracker.trackGameCompletion('user-1', {
        duration: 1200,
        won: true,
        gameType: 'puzzle',
      });

      const progress = tracker.getUserProgress('user-1');
      expect(progress.statistics.averageGameDuration).toBe(900);
    });
  });

  describe('Leaderboards', () => {
    test('should generate leaderboard by total games', () => {
      tracker.trackGameCompletion('user-1', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });
      tracker.trackGameCompletion('user-1', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });

      tracker.trackGameCompletion('user-2', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });
      tracker.trackGameCompletion('user-2', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });
      tracker.trackGameCompletion('user-2', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });

      tracker.trackGameCompletion('user-3', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });

      const leaderboard = tracker.getLeaderboard('totalGamesPlayed', 3);

      expect(leaderboard).toEqual([
        { userId: 'user-2', value: 3, rank: 1 },
        { userId: 'user-1', value: 2, rank: 2 },
        { userId: 'user-3', value: 1, rank: 3 },
      ]);
    });

    test('should generate leaderboard by win rate', () => {
      // User 1: 100% win rate (2/2)
      tracker.trackGameCompletion('user-1', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });
      tracker.trackGameCompletion('user-1', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });

      // User 2: 66% win rate (2/3)
      tracker.trackGameCompletion('user-2', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });
      tracker.trackGameCompletion('user-2', {
        duration: 600,
        won: false,
        gameType: 'puzzle',
      });
      tracker.trackGameCompletion('user-2', {
        duration: 600,
        won: true,
        gameType: 'puzzle',
      });

      const leaderboard = tracker.getLeaderboard('winRate', 2);

      expect(leaderboard[0]?.userId).toBe('user-1');
      expect(leaderboard[0]?.value).toBe(1);
      expect(leaderboard[1]?.userId).toBe('user-2');
      expect(leaderboard[1]?.value).toBeCloseTo(0.667, 2);
    });
  });

  describe('Performance', () => {
    test('should handle many users efficiently', () => {
      const startTime = performance.now();

      // Track games for 100 users
      for (let i = 0; i < 100; i++) {
        for (let j = 0; j < 10; j++) {
          tracker.trackGameCompletion(`user-${i}`, {
            duration: 600 + Math.random() * 600,
            won: Math.random() > 0.5,
            gameType: ['puzzle', 'strategy', 'action'][j % 3] ?? 'puzzle',
          });
        }
      }

      const endTime = performance.now();

      // Should process 1000 games in under 100ms
      expect(endTime - startTime).toBeLessThan(100);

      // Verify data integrity
      const leaderboard = tracker.getLeaderboard('totalGamesPlayed', 10);
      expect(leaderboard[0]?.value).toBe(10);
    });
  });
});
