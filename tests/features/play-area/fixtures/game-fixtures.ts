import type { 
  TestSession, 
  TestSessionPlayer, 
  TestAchievement, 
  TestSpeedrun,
  TestGameState,
  TestGameCell,
  TestFixtureOptions,
  TestLeaderboardEntry
} from '../types/test-types';

/**
 * Type-safe fixture factory for gaming tests
 * Generates consistent test data following database schema
 */
export class GameFixtureFactory {
  
  /**
   * Generate a test gaming session with realistic data
   */
  static session(overrides?: Partial<TestSession>): TestSession {
    const baseSession: TestSession = {
      id: this.randomId('session'),
      board_id: this.randomId('board'),
      host_id: this.randomId('user'),
      session_code: this.randomSessionCode(),
      status: 'waiting',
      created_at: new Date().toISOString(),
      started_at: null,
      ended_at: null,
      updated_at: new Date().toISOString(),
      winner_id: null,
      version: 1,
      current_state: null,
      settings: {
        max_players: 4,
        allow_spectators: true,
        auto_start: false,
        time_limit: null,
        require_approval: false,
        password: null
      },
      // Extended test properties
      board_title: this.randomBoardTitle(),
      host_username: this.randomPlayerName(),
      current_player_count: 1,
      max_players: 4,
      difficulty: 'medium',
      game_type: 'bingo',
      players: []
    };

    return { ...baseSession, ...overrides };
  }

  /**
   * Generate a test session player with connection status
   */
  static sessionPlayer(overrides?: Partial<TestSessionPlayer>): TestSessionPlayer {
    const basePlayer: TestSessionPlayer = {
      id: this.randomId('player-session'),
      session_id: this.randomId('session'),
      user_id: this.randomId('user'),
      display_name: this.randomPlayerName(),
      is_host: false,
      is_ready: true,
      color: this.randomPlayerColor(),
      position: 0,
      score: null,
      team: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
      left_at: null,
      // Extended test properties
      is_current_user: false,
      is_online: true,
      last_action: 'joined',
      points: 0,
      completed_cells: 0,
      completion_time: null,
      connection_status: 'connected'
    };

    return { ...basePlayer, ...overrides };
  }

  /**
   * Generate a test achievement with progression
   */
  static achievement(overrides?: Partial<TestAchievement>): TestAchievement {
    const achievementTypes = ['gameplay', 'social', 'speedrun', 'completion', 'streak'] as const;
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
    const icons = ['🏆', '🎯', '⚡', '🔥', '💎', '⭐', '🎖️', '👑', '💫', '🚀'];
    
    const baseAchievement: TestAchievement = {
      id: this.randomId('achievement'),
      user_id: this.randomId('user'),
      achievement_name: this.randomAchievementName(),
      achievement_type: achievementTypes[Math.floor(Math.random() * achievementTypes.length)],
      description: 'Complete a challenging gaming task',
      points: Math.floor(Math.random() * 500) + 50,
      unlocked_at: Math.random() > 0.5 ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      metadata: {
        category: 'gaming',
        rarity: rarities[Math.floor(Math.random() * rarities.length)],
        progress: 0,
        max_progress: 1,
        icon: icons[Math.floor(Math.random() * icons.length)]
      },
      // Extended test properties
      progress: 0,
      max_progress: 1,
      rarity: 'common',
      category: 'gaming',
      icon: '🏆'
    };

    return { ...baseAchievement, ...overrides };
  }

  /**
   * Generate a test speedrun result
   */
  static speedrun(overrides?: Partial<TestSpeedrun>): TestSpeedrun {
    const baseSpeedrun: TestSpeedrun = {
      id: this.randomId('speedrun'),
      user_id: this.randomId('user'),
      board_id: this.randomId('board'),
      board_title: this.randomBoardTitle(),
      time_seconds: Math.floor(Math.random() * 300) + 30, // 30-330 seconds
      completed_at: new Date().toISOString(),
      is_verified: true,
      is_personal_best: Math.random() > 0.7,
      rank: Math.floor(Math.random() * 100) + 1,
      category: 'standard',
      metadata: {
        splits: [],
        input_method: 'mouse',
        version: '1.0.0'
      }
    };

    // Generate realistic splits
    const totalTime = baseSpeedrun.time_seconds * 1000; // Convert to ms
    const splitCount = 5;
    const splits: number[] = [];
    for (let i = 0; i < splitCount; i++) {
      const splitTime = (totalTime / splitCount) * (i + 1) + (Math.random() - 0.5) * 1000;
      splits.push(Math.max(splits[splits.length - 1] || 0, splitTime));
    }
    baseSpeedrun.metadata!.splits = splits;

    return { ...baseSpeedrun, ...overrides };
  }

  /**
   * Generate game state with board cells
   */
  static gameState(sessionId: string, boardSize: number = 25): TestGameState {
    return {
      session_id: sessionId,
      board_state: this.boardCells(boardSize),
      version: 1,
      last_updated: new Date().toISOString(),
      active_players: [],
      current_turn: null,
      time_remaining: null,
      paused: false,
      winner: null,
      win_condition: null
    };
  }

  /**
   * Generate board cells for a given size
   */
  static boardCells(size: number = 25): TestGameCell[] {
    const cells: TestGameCell[] = [];
    const gridSize = Math.sqrt(size);
    
    for (let i = 0; i < size; i++) {
      cells.push({
        position: i,
        text: this.randomCellText(),
        is_marked: false,
        marked_by: null,
        marked_at: null,
        row: Math.floor(i / gridSize),
        col: i % gridSize,
        hover_player: null,
        animation: null
      });
    }
    
    return cells;
  }

  /**
   * Generate leaderboard entries
   */
  static leaderboardEntries(count: number = 10): TestLeaderboardEntry[] {
    const entries: TestLeaderboardEntry[] = [];
    
    for (let i = 0; i < count; i++) {
      entries.push({
        rank: i + 1,
        user_id: this.randomId('user'),
        username: this.randomPlayerName(),
        avatar_url: Math.random() > 0.5 ? `https://avatar.example.com/${i}.jpg` : null,
        score: Math.floor(Math.random() * 5000) + 1000,
        time: Math.floor(Math.random() * 300) + 30,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_current_user: i === 0 // First entry is current user
      });
    }
    
    // Sort by score (descending) then by time (ascending)
    return entries.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return (a.time || 0) - (b.time || 0);
    }).map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  // ===== SCENARIO GENERATORS =====

  /**
   * Generate a complete multiplayer session scenario
   */
  static multiplayerScenario(playerCount: number = 3): {
    session: TestSession;
    players: TestSessionPlayer[];
    gameState: TestGameState;
  } {
    const hostId = this.randomId('user');
    const session = this.session({
      host_id: hostId,
      status: 'active',
      current_player_count: playerCount,
      max_players: Math.max(playerCount, 4)
    });

    const players: TestSessionPlayer[] = [];
    for (let i = 0; i < playerCount; i++) {
      players.push(this.sessionPlayer({
        session_id: session.id,
        user_id: i === 0 ? hostId : this.randomId('user'),
        is_host: i === 0,
        position: i,
        display_name: i === 0 ? 'Host Player' : `Player ${i + 1}`,
        color: this.PLAYER_COLORS[i % this.PLAYER_COLORS.length]
      }));
    }

    const gameState = this.gameState(session.id);
    gameState.active_players = players.map(p => p.user_id);

    return { session, players, gameState };
  }

  /**
   * Generate a speedrun scenario
   */
  static speedrunScenario(): {
    session: TestSession;
    player: TestSessionPlayer;
    speedrun: TestSpeedrun;
  } {
    const userId = this.randomId('user');
    const session = this.session({
      host_id: userId,
      status: 'active',
      game_type: 'speedrun',
      difficulty: 'hard'
    });

    const player = this.sessionPlayer({
      session_id: session.id,
      user_id: userId,
      is_host: true,
      is_current_user: true
    });

    const speedrun = this.speedrun({
      user_id: userId,
      board_id: session.board_id!,
      board_title: session.board_title
    });

    return { session, player, speedrun };
  }

  /**
   * Generate achievement progression scenario
   */
  static achievementProgressionScenario(userId: string): TestAchievement[] {
    return [
      this.achievement({
        user_id: userId,
        achievement_name: 'first_win',
        description: 'Win your first game',
        points: 50,
        unlocked_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        metadata: {
          category: 'milestone',
          rarity: 'common',
          progress: 1,
          max_progress: 1,
          icon: '🏆'
        }
      }),
      this.achievement({
        user_id: userId,
        achievement_name: 'winning_streak',
        description: 'Win 5 games in a row',
        points: 200,
        unlocked_at: null,
        metadata: {
          category: 'streak',
          rarity: 'uncommon',
          progress: 3,
          max_progress: 5,
          icon: '🔥'
        }
      }),
      this.achievement({
        user_id: userId,
        achievement_name: 'speedrun_master',
        description: 'Complete a speedrun under 30 seconds',
        points: 500,
        unlocked_at: null,
        metadata: {
          category: 'speedrun',
          rarity: 'rare',
          progress: 0,
          max_progress: 1,
          icon: '⚡'
        }
      })
    ];
  }

  // ===== UTILITY GENERATORS =====

  private static randomId(prefix: string = 'test'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private static randomSessionCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private static randomBoardTitle(): string {
    const adjectives = ['Epic', 'Legendary', 'Ultimate', 'Classic', 'Master', 'Elite', 'Pro', 'Super'];
    const nouns = ['Challenge', 'Quest', 'Adventure', 'Battle', 'Tournament', 'Competition', 'Showdown'];
    const games = ['Bingo', 'Speedrun', 'Marathon', 'Sprint', 'Rush', 'Blitz'];
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const game = games[Math.floor(Math.random() * games.length)];
    
    return `${adj} ${game} ${noun}`;
  }

  private static randomPlayerName(): string {
    const prefixes = ['Gaming', 'Pro', 'Elite', 'Master', 'Speed', 'Quick', 'Ninja', 'Cyber'];
    const suffixes = ['Player', 'Gamer', 'Legend', 'Hero', 'Champion', 'Warrior', 'Runner', 'Star'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const number = Math.floor(Math.random() * 999) + 1;
    
    return `${prefix}${suffix}${number}`;
  }

  private static randomCellText(): string {
    const actions = [
      'Complete tutorial', 'Reach level 10', 'Defeat a boss', 'Find secret area',
      'Collect 100 coins', 'Win a match', 'Use special ability', 'Unlock achievement',
      'Join a team', 'Complete mission', 'Craft an item', 'Explore new area',
      'Master a skill', 'Break a record', 'Help another player', 'Survive 5 minutes',
      'Score a headshot', 'Build something cool', 'Solve a puzzle', 'Race to finish',
      'Capture the flag', 'Defend the base', 'Cast a spell', 'Tame a creature',
      'Discover a recipe'
    ];
    
    return actions[Math.floor(Math.random() * actions.length)];
  }

  private static randomAchievementName(): string {
    const achievements = [
      'first_win', 'quick_start', 'speed_demon', 'perfectionist', 'social_butterfly',
      'streak_master', 'completionist', 'explorer', 'collector', 'champion',
      'legend', 'veteran', 'rookie', 'mentor', 'survivor', 'destroyer',
      'creator', 'strategist', 'lucky_shot', 'persistence'
    ];
    
    return achievements[Math.floor(Math.random() * achievements.length)];
  }

  private static randomPlayerColor(): string {
    return this.PLAYER_COLORS[Math.floor(Math.random() * this.PLAYER_COLORS.length)];
  }

  // ===== CONSTANTS =====

  private static readonly PLAYER_COLORS = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Gold
    '#BB8FCE', // Lavender
    '#85C1E9'  // Sky Blue
  ];

  // ===== BULK GENERATORS =====

  /**
   * Generate multiple test sessions for performance testing
   */
  static bulkSessions(count: number, options?: TestFixtureOptions): TestSession[] {
    const sessions: TestSession[] = [];
    
    for (let i = 0; i < count; i++) {
      sessions.push(this.session({
        ...options,
        board_title: `${options?.gameType || 'Test'} Session ${i + 1}`,
        current_player_count: Math.floor(Math.random() * 4) + 1,
        status: ['waiting', 'active', 'paused'][Math.floor(Math.random() * 3)] as any
      }));
    }
    
    return sessions;
  }

  /**
   * Generate stress test data for concurrent operations
   */
  static stressTestData(sessionCount: number = 50, playersPerSession: number = 4): {
    sessions: TestSession[];
    allPlayers: TestSessionPlayer[];
  } {
    const sessions = this.bulkSessions(sessionCount);
    const allPlayers: TestSessionPlayer[] = [];
    
    sessions.forEach(session => {
      for (let i = 0; i < playersPerSession; i++) {
        allPlayers.push(this.sessionPlayer({
          session_id: session.id,
          is_host: i === 0,
          position: i
        }));
      }
    });
    
    return { sessions, allPlayers };
  }
}

// Export convenience functions
export const { 
  session, 
  sessionPlayer, 
  achievement, 
  speedrun, 
  gameState, 
  boardCells,
  leaderboardEntries,
  multiplayerScenario,
  speedrunScenario,
  achievementProgressionScenario,
  bulkSessions,
  stressTestData
} = GameFixtureFactory;