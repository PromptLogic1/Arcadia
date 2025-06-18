import type { Database } from '@/types/database.types';

type UserProfile = Database['public']['Tables']['users']['Row'];
type UserStats = Database['public']['Tables']['user_statistics']['Row'];
type GameResult = Database['public']['Tables']['game_results']['Row'];
type UserActivity = Database['public']['Tables']['user_activity']['Row'];
type UserAchievement = Database['public']['Tables']['user_achievements']['Row'];

/**
 * Test Data Factories
 * 
 * Factory functions for creating test data with realistic values
 * for user profile related tests.
 */

let userIdCounter = 1;
let gameIdCounter = 1;
let activityIdCounter = 1;
let achievementIdCounter = 1;

export function createUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  const id = `user_${userIdCounter++}`;
  const now = new Date().toISOString();

  return {
    id,
    username: `testuser${userIdCounter}`,
    full_name: `Test User ${userIdCounter}`,
    email: `user${userIdCounter}@example.com`,
    bio: 'I love playing games and collecting achievements!',
    avatar_url: 'https://example.com/avatar.jpg',
    city: 'San Francisco',
    region: 'California',
    land: 'USA',
    experience_points: 100,
    role: 'user',
    profile_visibility: 'public',
    achievements_visibility: 'public',
    submissions_visibility: 'public',
    created_at: now,
    updated_at: now,
    last_login_at: now,
    email_verified: true,
    ...overrides,
  };
}

export function createUserStats(overrides: Partial<UserStats> = {}): UserStats {
  const userId = overrides.user_id || `user_${userIdCounter}`;
  const now = new Date().toISOString();

  return {
    id: userId,
    user_id: userId,
    total_games: 50,
    games_won: 25,
    total_score: 2500,
    average_score: 50,
    highest_score: 150,
    fastest_win: 180, // 3 minutes
    longest_win_streak: 5,
    current_win_streak: 2,
    favorite_game_mode: 'classic',
    total_playtime: 3600, // 1 hour in seconds
    last_game_at: now,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function createGameResult(overrides: Partial<GameResult> = {}): GameResult {
  const id = `game_${gameIdCounter++}`;
  const now = new Date().toISOString();

  return {
    id,
    user_id: overrides.user_id || `user_${userIdCounter}`,
    session_id: overrides.session_id || `session_${gameIdCounter}`,
    board_id: overrides.board_id || `board_${gameIdCounter}`,
    placement: 1,
    final_score: 100,
    time_elapsed: 300, // 5 minutes
    moves_made: 25,
    power_ups_used: 3,
    created_at: now,
    completed_at: now,
    ...overrides,
  };
}

export function createUserActivity(overrides: Partial<UserActivity> = {}): UserActivity {
  const id = `activity_${activityIdCounter++}`;
  const now = new Date().toISOString();

  return {
    id,
    user_id: overrides.user_id || `user_${userIdCounter}`,
    activity_type: 'board_complete',
    data: {
      board_title: 'Test Board',
      difficulty: 'medium',
      score: 100,
    },
    created_at: now,
    ...overrides,
  };
}

export function createUserAchievement(overrides: Partial<UserAchievement> = {}): UserAchievement {
  const id = `achievement_${achievementIdCounter++}`;
  const now = new Date().toISOString();

  return {
    id,
    user_id: overrides.user_id || `user_${userIdCounter}`,
    achievement_type: 'milestone',
    achievement_name: 'Regular Player',
    points: 50,
    description: 'Played 10 games',
    metadata: {
      games_played: 10,
      unlocked_at: now,
    },
    created_at: now,
    ...overrides,
  };
}

// Helper functions for creating specific user scenarios

export function createNewUser(username: string): UserProfile {
  return createUserProfile({
    username,
    experience_points: 0,
    bio: null,
    avatar_url: null,
    city: null,
    region: null,
    land: null,
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString(),
  });
}

export function createPowerUser(username: string): {
  profile: UserProfile;
  stats: UserStats;
  achievements: UserAchievement[];
} {
  const userId = `power_user_${userIdCounter++}`;
  
  const profile = createUserProfile({
    id: userId,
    username,
    experience_points: 5000,
    bio: 'Veteran player with years of experience. Love speedrunning and helping new players!',
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
  });

  const stats = createUserStats({
    user_id: userId,
    total_games: 1000,
    games_won: 750,
    average_score: 85,
    highest_score: 300,
    fastest_win: 90, // 1.5 minutes
    longest_win_streak: 25,
    current_win_streak: 10,
    total_playtime: 360000, // 100 hours
  });

  const achievements = [
    createUserAchievement({
      user_id: userId,
      achievement_name: 'Master',
      achievement_type: 'rank',
      points: 500,
    }),
    createUserAchievement({
      user_id: userId,
      achievement_name: 'Speedrun Expert',
      achievement_type: 'speedrun',
      points: 150,
    }),
    createUserAchievement({
      user_id: userId,
      achievement_name: 'Unstoppable',
      achievement_type: 'streak',
      points: 200,
    }),
  ];

  return { profile, stats, achievements };
}

export function createGameHistory(
  userId: string,
  count: number,
  options: {
    winRate?: number;
    avgScore?: number;
    timeRange?: number; // days
  } = {}
): GameResult[] {
  const { winRate = 0.5, avgScore = 100, timeRange = 30 } = options;
  const now = Date.now();
  const results: GameResult[] = [];

  for (let i = 0; i < count; i++) {
    const isWin = Math.random() < winRate;
    const scoreVariance = avgScore * 0.3;
    const score = Math.round(avgScore + (Math.random() - 0.5) * scoreVariance * 2);
    const timeAgo = Math.random() * timeRange * 24 * 60 * 60 * 1000;
    
    results.push(
      createGameResult({
        user_id: userId,
        placement: isWin ? 1 : Math.floor(Math.random() * 3) + 2,
        final_score: score,
        time_elapsed: 180 + Math.floor(Math.random() * 420), // 3-10 minutes
        created_at: new Date(now - timeAgo).toISOString(),
      })
    );
  }

  return results.sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function createActivityLog(
  userId: string,
  days: number,
  activitiesPerDay = 10
): UserActivity[] {
  const activities: UserActivity[] = [];
  const now = Date.now();
  const activityTypes = [
    'login',
    'board_create',
    'board_join',
    'board_complete',
    'submission_create',
    'discussion_create',
    'comment_create',
    'achievement_unlock',
  ];

  for (let day = 0; day < days; day++) {
    const dayStart = now - day * 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < activitiesPerDay; i++) {
      const timeOffset = Math.random() * 24 * 60 * 60 * 1000;
      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      
      activities.push(
        createUserActivity({
          user_id: userId,
          activity_type: activityType as any,
          created_at: new Date(dayStart - timeOffset).toISOString(),
          data: generateActivityData(activityType),
        })
      );
    }
  }

  return activities.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function generateActivityData(activityType: string): any {
  switch (activityType) {
    case 'board_create':
    case 'board_join':
    case 'board_complete':
      return {
        board_id: `board_${Math.floor(Math.random() * 100)}`,
        board_title: `Board ${Math.floor(Math.random() * 100)}`,
        difficulty: ['easy', 'medium', 'hard', 'expert'][Math.floor(Math.random() * 4)],
      };
    case 'submission_create':
      return {
        submission_id: `submission_${Math.floor(Math.random() * 100)}`,
        challenge_title: `Challenge ${Math.floor(Math.random() * 100)}`,
      };
    case 'discussion_create':
      return {
        discussion_id: `discussion_${Math.floor(Math.random() * 100)}`,
        title: `Discussion ${Math.floor(Math.random() * 100)}`,
      };
    case 'comment_create':
      return {
        comment_id: `comment_${Math.floor(Math.random() * 100)}`,
        discussion_title: `Discussion ${Math.floor(Math.random() * 100)}`,
      };
    case 'achievement_unlock':
      return {
        achievement_name: ['First Victory', 'Regular Player', 'On Fire'][Math.floor(Math.random() * 3)],
        points: [50, 100, 150][Math.floor(Math.random() * 3)],
      };
    default:
      return {};
  }
}

// Reset counters for tests
export function resetCounters() {
  userIdCounter = 1;
  gameIdCounter = 1;
  activityIdCounter = 1;
  achievementIdCounter = 1;
}