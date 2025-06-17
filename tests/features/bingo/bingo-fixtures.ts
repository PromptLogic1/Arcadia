import type { Tables, Enums } from '../../../types/database.types';
import type { BoardCell } from '../../../src/features/bingo-boards/types';

/**
 * Type-safe fixtures for bingo board testing
 */

// =============================================================================
// CARD LIBRARY FIXTURES
// =============================================================================

export const TYPED_CARD_FIXTURES: Record<Enums<'game_category'>, Tables<'bingo_cards'>[]> = {
  valorant: [
    {
      id: 'card-val-ace',
      title: 'Get an ace',
      description: 'Eliminate all 5 enemy players in a round',
      game_type: 'valorant',
      difficulty: 'hard',
      tags: ['elimination', 'skill', 'round-win'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-val-clutch',
      title: 'Clutch 1v3',
      description: 'Win a round when outnumbered 3 to 1',
      game_type: 'valorant',
      difficulty: 'expert',
      tags: ['clutch', 'skill', 'pressure'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-val-spike',
      title: 'Plant the spike',
      description: 'Successfully plant the spike on a site',
      game_type: 'valorant',
      difficulty: 'easy',
      tags: ['objective', 'attacker'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-val-defuse',
      title: 'Defuse the spike',
      description: 'Successfully defuse the planted spike',
      game_type: 'valorant',
      difficulty: 'medium',
      tags: ['objective', 'defender'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-val-headshot',
      title: '5 headshot kills',
      description: 'Get 5 headshot eliminations in a match',
      game_type: 'valorant',
      difficulty: 'medium',
      tags: ['aim', 'skill', 'elimination'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-val-economy',
      title: 'Win an eco round',
      description: 'Win a round with inferior economy',
      game_type: 'valorant',
      difficulty: 'hard',
      tags: ['economy', 'strategy', 'teamwork'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-val-flawless',
      title: 'Flawless round',
      description: 'Win a round without any team deaths',
      game_type: 'valorant',
      difficulty: 'hard',
      tags: ['teamwork', 'perfect', 'round-win'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-val-wallbang',
      title: 'Wallbang elimination',
      description: 'Eliminate an enemy through a wall',
      game_type: 'valorant',
      difficulty: 'medium',
      tags: ['skill', 'game-sense', 'elimination'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-val-knife',
      title: 'Knife elimination',
      description: 'Get a knife kill on an enemy',
      game_type: 'valorant',
      difficulty: 'hard',
      tags: ['melee', 'risky', 'elimination'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ],
  minecraft: [
    {
      id: 'card-mc-diamond',
      title: 'Find diamonds',
      description: 'Mine your first diamond ore',
      game_type: 'minecraft',
      difficulty: 'medium',
      tags: ['mining', 'resources', 'progression'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-mc-nether',
      title: 'Enter the Nether',
      description: 'Build a portal and enter the Nether',
      game_type: 'minecraft',
      difficulty: 'easy',
      tags: ['dimension', 'exploration', 'progression'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-mc-dragon',
      title: 'Defeat the Ender Dragon',
      description: 'Defeat the final boss',
      game_type: 'minecraft',
      difficulty: 'expert',
      tags: ['boss', 'endgame', 'combat'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-mc-enchant',
      title: 'Enchant an item',
      description: 'Use an enchanting table to enchant any item',
      game_type: 'minecraft',
      difficulty: 'medium',
      tags: ['enchanting', 'progression', 'crafting'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-mc-village',
      title: 'Find a village',
      description: 'Discover a naturally spawned village',
      game_type: 'minecraft',
      difficulty: 'easy',
      tags: ['exploration', 'structures', 'villagers'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-mc-farm',
      title: 'Build an automatic farm',
      description: 'Create any type of automatic farm',
      game_type: 'minecraft',
      difficulty: 'hard',
      tags: ['redstone', 'automation', 'building'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-mc-tame',
      title: 'Tame 3 different animals',
      description: 'Tame a wolf, cat, and horse',
      game_type: 'minecraft',
      difficulty: 'medium',
      tags: ['animals', 'taming', 'collection'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-mc-elytra',
      title: 'Obtain Elytra',
      description: 'Find and equip Elytra wings',
      game_type: 'minecraft',
      difficulty: 'hard',
      tags: ['end-city', 'exploration', 'flying'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-mc-beacon',
      title: 'Activate a beacon',
      description: 'Build and activate a full beacon',
      game_type: 'minecraft',
      difficulty: 'expert',
      tags: ['building', 'resources', 'endgame'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ],
  'league-of-legends': [
    {
      id: 'card-lol-pentakill',
      title: 'Get a Pentakill',
      description: 'Eliminate all 5 enemy champions rapidly',
      game_type: 'league-of-legends',
      difficulty: 'expert',
      tags: ['elimination', 'teamfight', 'legendary'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-lol-first-blood',
      title: 'Get First Blood',
      description: 'Score the first kill of the game',
      game_type: 'league-of-legends',
      difficulty: 'medium',
      tags: ['early-game', 'elimination', 'gold'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-lol-baron',
      title: 'Secure Baron Nashor',
      description: 'Last hit Baron Nashor for your team',
      game_type: 'league-of-legends',
      difficulty: 'hard',
      tags: ['objective', 'late-game', 'teamwork'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-lol-dragon-soul',
      title: 'Obtain Dragon Soul',
      description: 'Help your team secure Dragon Soul',
      game_type: 'league-of-legends',
      difficulty: 'hard',
      tags: ['objective', 'macro', 'teamwork'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-lol-perfect-cs',
      title: 'Perfect CS (10 min)',
      description: 'Get 90+ CS by 10 minutes',
      game_type: 'league-of-legends',
      difficulty: 'hard',
      tags: ['farming', 'laning', 'fundamentals'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-lol-ward-score',
      title: 'Vision Score 50+',
      description: 'Achieve 50+ vision score in a game',
      game_type: 'league-of-legends',
      difficulty: 'medium',
      tags: ['vision', 'support', 'macro'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-lol-steal',
      title: 'Steal enemy buff',
      description: 'Steal red or blue buff from enemy jungle',
      game_type: 'league-of-legends',
      difficulty: 'medium',
      tags: ['jungle', 'invade', 'risky'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-lol-tower-dive',
      title: 'Successful tower dive',
      description: 'Get a kill under enemy tower and survive',
      game_type: 'league-of-legends',
      difficulty: 'hard',
      tags: ['aggressive', 'coordination', 'risky'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'card-lol-backdoor',
      title: 'Backdoor win',
      description: 'Win by backdooring the enemy nexus',
      game_type: 'league-of-legends',
      difficulty: 'expert',
      tags: ['strategy', 'split-push', 'clutch'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ],
  'custom-community': []
};

// =============================================================================
// BOARD TEMPLATE FIXTURES
// =============================================================================

export interface BoardTemplateFixture {
  board: Omit<Tables<'bingo_boards'>, 'id' | 'created_at' | 'updated_at' | 'creator_id'>;
  cards: Tables<'bingo_cards'>[];
  layout: BoardCell[][];
}

export const BOARD_TEMPLATES: Record<string, BoardTemplateFixture> = {
  'valorant-beginner': {
    board: {
      title: 'Valorant Beginner Bingo',
      description: 'Perfect for new players learning the basics',
      size: 3,
      game_type: 'valorant',
      difficulty: 'beginner',
      is_public: true,
      board_state: null,
      settings: {
        winConditions: { line: true, diagonal: false, corners: false, majority: false },
        sessionSettings: { max_players: 4, allow_spectators: true, auto_start: false, time_limit: null, require_approval: false, password: null }
      },
      status: 'published',
      cloned_from: null,
      version: 1,
      votes: 0,
      bookmarked_count: 0
    },
    cards: TYPED_CARD_FIXTURES.valorant.filter(card => ['easy', 'beginner'].includes(card.difficulty)).slice(0, 9),
    layout: [] // Would be populated based on cards
  },
  'minecraft-speedrun': {
    board: {
      title: 'Minecraft Speedrun Bingo',
      description: 'Race to complete these Minecraft challenges',
      size: 5,
      game_type: 'minecraft',
      difficulty: 'hard',
      is_public: true,
      board_state: null,
      settings: {
        winConditions: { line: true, diagonal: true, corners: false, majority: false },
        sessionSettings: { max_players: 8, allow_spectators: true, auto_start: false, time_limit: 3600, require_approval: false, password: null }
      },
      status: 'published',
      cloned_from: null,
      version: 1,
      votes: 0,
      bookmarked_count: 0
    },
    cards: TYPED_CARD_FIXTURES.minecraft,
    layout: []
  },
  'lol-teamfight': {
    board: {
      title: 'LoL Teamfight Tactics',
      description: 'Complete these objectives in your ranked games',
      size: 4,
      game_type: 'league-of-legends',
      difficulty: 'medium',
      is_public: true,
      board_state: null,
      settings: {
        winConditions: { line: true, diagonal: true, corners: true, majority: false },
        sessionSettings: { max_players: 5, allow_spectators: false, auto_start: true, time_limit: null, require_approval: false, password: null }
      },
      status: 'published',
      cloned_from: null,
      version: 1,
      votes: 0,
      bookmarked_count: 0
    },
    cards: TYPED_CARD_FIXTURES['league-of-legends'].slice(0, 16),
    layout: []
  }
};

// =============================================================================
// MULTIPLAYER SCENARIO FIXTURES
// =============================================================================

export interface MultiplayerScenarioFixture {
  name: string;
  description: string;
  playerCount: number;
  boardSize: 3 | 4 | 5 | 6;
  gameType: Enums<'game_category'>;
  difficulty: Enums<'difficulty_level'>;
  winConditions: Partial<{
    line: boolean;
    diagonal: boolean;
    corners: boolean;
    majority: boolean;
  }>;
  sessionSettings: Partial<Tables<'bingo_sessions'>['settings']>;
  expectedDuration: number; // milliseconds
  testObjectives: string[];
}

export const MULTIPLAYER_SCENARIOS: Record<string, MultiplayerScenarioFixture> = {
  quickDuel: {
    name: 'Quick Duel',
    description: '2-player competitive race on a small board',
    playerCount: 2,
    boardSize: 3,
    gameType: 'valorant',
    difficulty: 'easy',
    winConditions: { line: true, diagonal: false },
    sessionSettings: {
      max_players: 2,
      allow_spectators: false,
      auto_start: true,
      time_limit: 300, // 5 minutes
      require_approval: false,
      password: null
    },
    expectedDuration: 180000, // 3 minutes average
    testObjectives: [
      'Fast-paced gameplay',
      'Real-time sync under pressure',
      'Win detection accuracy',
      'Connection stability'
    ]
  },
  teamChallenge: {
    name: 'Team Challenge',
    description: '4-player team-based competition',
    playerCount: 4,
    boardSize: 5,
    gameType: 'minecraft',
    difficulty: 'medium',
    winConditions: { line: true, diagonal: true, corners: false },
    sessionSettings: {
      max_players: 4,
      allow_spectators: true,
      auto_start: false,
      time_limit: 1800, // 30 minutes
      require_approval: false,
      password: null
    },
    expectedDuration: 900000, // 15 minutes average
    testObjectives: [
      'Team coordination',
      'Spectator functionality',
      'Extended session stability',
      'Complex win patterns'
    ]
  },
  chaosMode: {
    name: 'Chaos Mode',
    description: 'Maximum players on a large board',
    playerCount: 8,
    boardSize: 6,
    gameType: 'league-of-legends',
    difficulty: 'hard',
    winConditions: { line: true, diagonal: true, corners: true, majority: true },
    sessionSettings: {
      max_players: 20,
      allow_spectators: true,
      auto_start: false,
      time_limit: null,
      require_approval: true,
      password: null
    },
    expectedDuration: 1800000, // 30 minutes average
    testObjectives: [
      'High player count handling',
      'Queue management',
      'Performance under load',
      'Concurrent marking conflicts'
    ]
  },
  privateMatch: {
    name: 'Private Match',
    description: 'Password-protected friends-only game',
    playerCount: 3,
    boardSize: 4,
    gameType: 'custom-community',
    difficulty: 'medium',
    winConditions: { line: true, diagonal: false, corners: true },
    sessionSettings: {
      max_players: 4,
      allow_spectators: false,
      auto_start: false,
      time_limit: null,
      require_approval: false,
      password: 'test123'
    },
    expectedDuration: 600000, // 10 minutes average
    testObjectives: [
      'Password protection',
      'Private session isolation',
      'Custom content support',
      'Friend invite flow'
    ]
  }
};

// =============================================================================
// GAME STATE FIXTURES
// =============================================================================

export interface GameStateFixture {
  name: string;
  description: string;
  boardSize: number;
  markedCells: Array<{
    position: number;
    playerId: string;
    color: string;
  }>;
  expectedWinner?: string;
  expectedPattern?: string;
}

export const GAME_STATE_FIXTURES: GameStateFixture[] = [
  {
    name: 'Near horizontal win',
    description: 'One cell away from horizontal line win',
    boardSize: 5,
    markedCells: [
      { position: 5, playerId: 'player1', color: '#06b6d4' },
      { position: 6, playerId: 'player1', color: '#06b6d4' },
      { position: 7, playerId: 'player1', color: '#06b6d4' },
      { position: 8, playerId: 'player1', color: '#06b6d4' },
      // Missing position 9 for complete line
      { position: 12, playerId: 'player2', color: '#8b5cf6' },
      { position: 17, playerId: 'player2', color: '#8b5cf6' }
    ]
  },
  {
    name: 'Diagonal conflict',
    description: 'Two players competing for diagonal',
    boardSize: 5,
    markedCells: [
      { position: 0, playerId: 'player1', color: '#06b6d4' },
      { position: 6, playerId: 'player1', color: '#06b6d4' },
      { position: 12, playerId: 'player2', color: '#8b5cf6' },
      { position: 18, playerId: 'player1', color: '#06b6d4' },
      { position: 24, playerId: 'player2', color: '#8b5cf6' }
    ]
  },
  {
    name: 'Four corners achieved',
    description: 'Player has marked all four corners',
    boardSize: 5,
    markedCells: [
      { position: 0, playerId: 'player1', color: '#06b6d4' },
      { position: 4, playerId: 'player1', color: '#06b6d4' },
      { position: 20, playerId: 'player1', color: '#06b6d4' },
      { position: 24, playerId: 'player1', color: '#06b6d4' }
    ],
    expectedWinner: 'player1',
    expectedPattern: 'four-corners'
  },
  {
    name: 'Complex multi-pattern',
    description: 'Board state with multiple potential wins',
    boardSize: 4,
    markedCells: [
      // Player 1 has vertical line (column 0)
      { position: 0, playerId: 'player1', color: '#06b6d4' },
      { position: 4, playerId: 'player1', color: '#06b6d4' },
      { position: 8, playerId: 'player1', color: '#06b6d4' },
      { position: 12, playerId: 'player1', color: '#06b6d4' },
      // Player 2 has horizontal line (row 1)
      { position: 4, playerId: 'player2', color: '#8b5cf6' }, // Conflict!
      { position: 5, playerId: 'player2', color: '#8b5cf6' },
      { position: 6, playerId: 'player2', color: '#8b5cf6' },
      { position: 7, playerId: 'player2', color: '#8b5cf6' }
    ]
  }
];

// =============================================================================
// PERFORMANCE BENCHMARK FIXTURES
// =============================================================================

export const PERFORMANCE_BENCHMARKS = {
  boardCreation: {
    small: { size: 3, p50: 800, p95: 1500, p99: 2000 },
    medium: { size: 5, p50: 1200, p95: 2000, p99: 2500 },
    large: { size: 6, p50: 1500, p95: 2500, p99: 3000 }
  },
  cellMarking: {
    local: { p50: 30, p95: 80, p99: 100 },
    remote: { p50: 80, p95: 150, p99: 200 }
  },
  winDetection: {
    simple: { patterns: ['line'], p50: 10, p95: 25, p99: 40 },
    complex: { patterns: ['line', 'diagonal', 'corners', 'majority'], p50: 20, p95: 40, p99: 50 }
  },
  realtimeSync: {
    optimal: { playerCount: 2, p50: 50, p95: 100, p99: 150 },
    normal: { playerCount: 4, p50: 80, p95: 150, p99: 180 },
    stress: { playerCount: 20, p50: 150, p95: 250, p99: 300 }
  },
  sessionJoin: {
    direct: { p50: 800, p95: 1200, p99: 1500 },
    queued: { p50: 1000, p95: 1500, p99: 2000 }
  }
};

// =============================================================================
// COMPLEX GAME STATE FIXTURES
// =============================================================================

export const COMPLEX_GAME_STATES = {
  nearWinConflict: {
    name: 'Near win conflict scenario',
    description: 'Two players one cell away from different wins',
    boardSize: 5,
    players: [
      { id: 'player1', color: '#06b6d4', name: 'Host' },
      { id: 'player2', color: '#8b5cf6', name: 'Challenger' }
    ],
    markedCells: [
      // Player 1: 4/5 horizontal (row 0)
      { position: 0, playerId: 'player1', color: '#06b6d4' },
      { position: 1, playerId: 'player1', color: '#06b6d4' },
      { position: 2, playerId: 'player1', color: '#06b6d4' },
      { position: 3, playerId: 'player1', color: '#06b6d4' },
      // Player 2: 4/5 vertical (col 4)
      { position: 4, playerId: 'player2', color: '#8b5cf6' },
      { position: 9, playerId: 'player2', color: '#8b5cf6' },
      { position: 14, playerId: 'player2', color: '#8b5cf6' },
      { position: 19, playerId: 'player2', color: '#8b5cf6' },
      // Blocking moves
      { position: 24, playerId: 'player1', color: '#06b6d4' }, // Player 1 blocks player 2's win
    ],
    conflictCell: 4, // Both need this cell to win
    expectedWinner: null, // Depends on who clicks first
    testObjectives: [
      'Race condition handling',
      'Optimistic UI updates',
      'Conflict resolution timing',
      'State reconciliation'
    ]
  },
  
  teamVersusTeam: {
    name: 'Team vs team scenario',
    description: 'Team-based victory conditions',
    boardSize: 4,
    teams: [
      { id: 'red', players: ['player1', 'player2'], color: '#ef4444' },
      { id: 'blue', players: ['player3', 'player4'], color: '#3b82f6' }
    ],
    markedCells: [
      // Red team controls row 0
      { position: 0, playerId: 'player1', color: '#ef4444', team: 'red' },
      { position: 1, playerId: 'player2', color: '#ef4444', team: 'red' },
      { position: 2, playerId: 'player1', color: '#ef4444', team: 'red' },
      { position: 3, playerId: 'player2', color: '#ef4444', team: 'red' },
      // Blue team controls column 0
      { position: 4, playerId: 'player3', color: '#3b82f6', team: 'blue' },
      { position: 8, playerId: 'player4', color: '#3b82f6', team: 'blue' },
      { position: 12, playerId: 'player3', color: '#3b82f6', team: 'blue' },
    ],
    winCondition: 'team_line',
    expectedWinner: 'red', // Complete horizontal line
    testObjectives: [
      'Team win detection',
      'Shared victory celebration',
      'Team score aggregation',
      'Cross-team coordination'
    ]
  },

  maxPlayerChaos: {
    name: 'Maximum player chaos',
    description: '20 players with concurrent actions',
    boardSize: 6,
    playerCount: 20,
    concurrentActions: 15, // Actions happening simultaneously
    markedCells: [], // Generated dynamically for stress testing
    patterns: ['random', 'clustered', 'competing'],
    testObjectives: [
      'High concurrency handling',
      'Memory usage under load',
      'Network throughput limits',
      'UI performance degradation',
      'Database connection pooling'
    ]
  },

  spectatorHeavy: {
    name: 'Spectator-heavy session',
    description: '4 players, 50 spectators watching',
    boardSize: 5,
    activePlayerCount: 4,
    spectatorCount: 50,
    testObjectives: [
      'Spectator state sync efficiency',
      'Bandwidth optimization',
      'Read-only session handling',
      'Broadcast performance'
    ]
  }
};

// =============================================================================
// SECURITY TEST SCENARIOS
// =============================================================================

export const SECURITY_TEST_SCENARIOS = {
  sessionHijacking: {
    name: 'Session hijacking attempt',
    description: 'Malicious user tries to take over active session',
    steps: [
      'Legitimate user starts session',
      'Attacker attempts to join with forged credentials',
      'Attacker tries to mark cells as legitimate user',
      'System should reject unauthorized actions'
    ],
    expectedBehavior: 'All malicious actions rejected',
    securityChecks: [
      'Authentication validation',
      'Session token verification',
      'User ID consistency',
      'Action authorization'
    ]
  },

  inputValidation: {
    name: 'Malicious input validation',
    description: 'Various injection attempts through game inputs',
    maliciousInputs: [
      { type: 'sql_injection', payload: "'; DROP TABLE bingo_sessions; --" },
      { type: 'xss_attempt', payload: '<script>alert("xss")</script>' },
      { type: 'buffer_overflow', payload: 'A'.repeat(10000) },
      { type: 'command_injection', payload: '$(rm -rf /)' }
    ],
    testTargets: [
      'Board title input',
      'Card text input',
      'Player display name',
      'Session code',
      'Chat messages'
    ],
    expectedBehavior: 'All inputs sanitized and validated'
  },

  rateLimiting: {
    name: 'Rate limiting protection',
    description: 'Rapid action spam protection',
    scenarios: [
      { action: 'cell_marking', rate: '100/second', expected: 'throttled' },
      { action: 'board_creation', rate: '10/minute', expected: 'limited' },
      { action: 'session_join', rate: '50/minute', expected: 'queued' }
    ],
    testObjectives: [
      'DDoS protection',
      'Resource conservation',
      'Fair gameplay',
      'System stability'
    ]
  },

  gameStateTampering: {
    name: 'Game state tampering',
    description: 'Client-side manipulation attempts',
    tamperingAttempts: [
      'Modify cell marked state in DOM',
      'Forge WebSocket messages',
      'Manipulate local storage',
      'Intercept and modify API calls',
      'Time travel attacks (replay old states)'
    ],
    expectedBehavior: 'Server-side validation rejects all tampering'
  }
};

// =============================================================================
// ERROR SCENARIO FIXTURES
// =============================================================================

export interface ErrorScenarioFixture {
  name: string;
  description: string;
  trigger: () => Promise<void>;
  expectedError: string | RegExp;
  recovery?: () => Promise<void>;
}

export const ERROR_SCENARIOS: ErrorScenarioFixture[] = [
  {
    name: 'Invalid session code',
    description: 'Attempting to join with non-existent code',
    trigger: async () => { /* Implementation in test */ },
    expectedError: /session not found/i
  },
  {
    name: 'Session full',
    description: 'Attempting to join a full session',
    trigger: async () => { /* Implementation in test */ },
    expectedError: /session is full/i
  },
  {
    name: 'Network timeout',
    description: 'Operation timing out due to network issues',
    trigger: async () => { /* Implementation in test */ },
    expectedError: /network timeout/i,
    recovery: async () => { /* Reconnect logic */ }
  },
  {
    name: 'Concurrent modification',
    description: 'Multiple players modifying same cell',
    trigger: async () => { /* Implementation in test */ },
    expectedError: /conflict/i,
    recovery: async () => { /* State reconciliation */ }
  },
  {
    name: 'Permission denied',
    description: 'Attempting unauthorized action',
    trigger: async () => { /* Implementation in test */ },
    expectedError: /permission denied/i
  },
  {
    name: 'Database connection lost',
    description: 'Database becomes temporarily unavailable',
    trigger: async () => { /* Implementation in test */ },
    expectedError: /database connection/i,
    recovery: async () => { /* Reconnection with backoff */ }
  },
  {
    name: 'Memory pressure',
    description: 'System under high memory load',
    trigger: async () => { /* Implementation in test */ },
    expectedError: /resource exhausted/i,
    recovery: async () => { /* Graceful degradation */ }
  }
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a complete board layout from cards
 */
export function generateBoardLayout(
  cards: Tables<'bingo_cards'>[],
  boardSize: number
): BoardCell[][] {
  const layout: BoardCell[][] = [];
  let cardIndex = 0;
  
  for (let row = 0; row < boardSize; row++) {
    const rowCells: BoardCell[] = [];
    for (let col = 0; col < boardSize; col++) {
      const card = cards[cardIndex % cards.length];
      rowCells.push({
        text: card.title,
        colors: null,
        completed_by: null,
        blocked: false,
        is_marked: false,
        cell_id: card.id,
        version: 1,
        last_updated: Date.now(),
        last_modified_by: null
      });
      cardIndex++;
    }
    layout.push(rowCells);
  }
  
  return layout;
}

/**
 * Get cards for a specific difficulty and game type
 */
export function getCardsForCriteria(
  gameType: Enums<'game_category'>,
  difficulty?: Enums<'difficulty_level'>,
  count?: number
): Tables<'bingo_cards'>[] {
  let cards = TYPED_CARD_FIXTURES[gameType] || [];
  
  if (difficulty) {
    cards = cards.filter(card => card.difficulty === difficulty);
  }
  
  if (count && cards.length > count) {
    cards = cards.slice(0, count);
  }
  
  return cards;
}

/**
 * Create a random board state for testing
 */
export function createRandomBoardState(
  boardSize: number,
  markPercentage = 0.3,
  playerIds: string[] = ['player1', 'player2']
): GameStateFixture {
  const totalCells = boardSize * boardSize;
  const cellsToMark = Math.floor(totalCells * markPercentage);
  const markedCells: GameStateFixture['markedCells'] = [];
  const usedPositions = new Set<number>();
  
  for (let i = 0; i < cellsToMark; i++) {
    let position: number;
    do {
      position = Math.floor(Math.random() * totalCells);
    } while (usedPositions.has(position));
    
    usedPositions.add(position);
    const playerId = playerIds[Math.floor(Math.random() * playerIds.length)];
    const playerIndex = playerIds.indexOf(playerId);
    const color = ['#06b6d4', '#8b5cf6', '#ec4899', '#10b981'][playerIndex] || '#06b6d4';
    
    markedCells.push({ position, playerId, color });
  }
  
  return {
    name: 'Random board state',
    description: `Random state with ${markPercentage * 100}% cells marked`,
    boardSize,
    markedCells
  };
}