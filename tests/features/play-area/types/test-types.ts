import type { Tables } from '../../../../types/database.types';
import type { Page } from '@playwright/test';

// ===== DATABASE TYPE EXTENSIONS =====

// Core gaming entities using database types
export type TestSession = Tables<'bingo_sessions'> & {
  // Extended properties for testing
  board_title?: string;
  host_username?: string;
  current_player_count?: number;
  max_players?: number;
  difficulty?: string;
  game_type?: string;
  players?: TestSessionPlayer[];
};

export type TestSessionPlayer = Tables<'bingo_session_players'> & {
  // Test-specific extensions
  is_current_user?: boolean;
  is_online?: boolean;
  last_action?: string;
  points?: number;
  completed_cells?: number;
  completion_time?: number;
  connection_status?: 'connected' | 'disconnected' | 'reconnecting';
};

export type TestAchievement = Tables<'user_achievements'> & {
  // Test-specific metadata
  progress?: number;
  max_progress?: number;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  category?: string;
  icon?: string;
};

export type TestSpeedrun = {
  id: string;
  user_id: string;
  board_id: string;
  board_title: string;
  time_seconds: number;
  completed_at: string;
  is_verified: boolean;
  is_personal_best: boolean;
  rank?: number;
  category?: string;
  metadata?: {
    splits?: number[];
    input_method?: string;
    version?: string;
  };
};

// ===== GAME STATE TYPES =====

export interface TestGameState {
  session_id: string;
  board_state: TestGameCell[];
  version: number;
  last_updated: string;
  active_players: string[];
  current_turn?: string;
  time_remaining?: number;
  paused: boolean;
  winner?: string;
  win_condition?: string;
}

export interface TestGameCell {
  position: number;
  text: string;
  is_marked: boolean;
  marked_by: string | null;
  marked_at: string | null;
  row: number;
  col: number;
  hover_player?: string;
  animation?: {
    type: 'mark' | 'unmark' | 'conflict' | 'win';
    player_id: string;
    timestamp: number;
    duration?: number;
  };
}

// ===== REAL-TIME EVENT TYPES =====

export interface TestGameEvent {
  id: string;
  type: TestGameEventType;
  session_id: string;
  player_id?: string;
  data: Record<string, unknown>;
  timestamp: number;
  sequence: number;
}

export type TestGameEventType =
  | 'session_created'
  | 'session_updated'
  | 'player_joined'
  | 'player_left'
  | 'player_disconnected'
  | 'player_reconnected'
  | 'game_started'
  | 'game_paused'
  | 'game_resumed'
  | 'game_ended'
  | 'cell_marked'
  | 'cell_unmarked'
  | 'win_detected'
  | 'conflict_detected'
  | 'chat_message'
  | 'host_changed'
  | 'settings_updated'
  | 'timer_started'
  | 'timer_paused'
  | 'timer_stopped'
  | 'achievement_unlocked'
  | 'leaderboard_updated';

// ===== TIMER TYPES =====

export interface TestTimerState {
  isRunning: boolean;
  isPaused: boolean;
  startTime: number | null;
  pausedTime: number;
  currentTime: number;
  precision: 'seconds' | 'milliseconds' | 'microseconds';
}

export interface TestTimerEvent {
  type: 'start' | 'pause' | 'resume' | 'stop' | 'reset';
  timestamp: number;
  precision_ms: number;
}

export interface TestSpeedrunResult {
  final_time: number;
  splits: number[];
  average_split: number;
  fastest_split: number;
  slowest_split: number;
  accuracy: number;
  verified: boolean;
  rank?: number;
}

// ===== TEST HELPER TYPES =====

export interface TestWebSocketHelper {
  connections: Map<string, MockWebSocketConnection>;
  setupRoutes(page: Page): Promise<void>;
  simulateEvent(sessionId: string, event: TestGameEvent): void;
  waitForEvent(
    sessionId: string,
    eventType: string,
    timeout?: number
  ): Promise<TestGameEvent>;
}

export interface MockWebSocketConnection {
  id: string;
  page: Page;
  isConnected: boolean;
  events: TestGameEvent[];
  broadcast(event: TestGameEvent): void;
  close(): void;
}

export interface TestPerformanceMetrics {
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  jsHeapSize: number;
  loadTime: number;
  networkRequests: number;
  memoryUsage: number;
}

export interface TestNetworkConditions {
  offline: boolean;
  latency: number;
  downloadThroughput: number;
  uploadThroughput: number;
  packetLoss: number;
}

// ===== TEST SCENARIO TYPES =====

export interface TestScenario {
  name: string;
  description: string;
  setup: TestScenarioSetup;
  data: TestScenarioData;
  expectations: TestExpectation[];
}

export interface TestScenarioSetup {
  session: Partial<TestSession>;
  players: TestSessionPlayer[];
  gameState?: TestGameState;
  networkConditions?: TestNetworkConditions;
  timerState?: TestTimerState;
}

export interface TestScenarioData {
  boardSize: number;
  cellTexts: string[];
  winConditions: string[];
  maxPlayers: number;
  timeLimit?: number;
}

export interface TestExpectation {
  type: 'ui' | 'api' | 'websocket' | 'performance' | 'timer';
  condition: string;
  value?: unknown;
  timeout?: number;
  tolerance?: number;
}

// ===== FIXTURE FACTORY TYPES =====

export interface TestFixtureOptions {
  boardSize?: number;
  playerCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  gameType?: 'bingo' | 'speedrun' | 'tournament';
  sessionStatus?: 'waiting' | 'active' | 'paused' | 'completed';
}

export interface TestFixtureGenerator {
  session(options?: Partial<TestFixtureOptions>): TestSession;
  players(
    count: number,
    options?: Partial<TestFixtureOptions>
  ): TestSessionPlayer[];
  gameState(boardSize?: number): TestGameState;
  achievements(userId: string): TestAchievement[];
  speedruns(userId: string, count?: number): TestSpeedrun[];
  boardState(size: number): TestGameCell[];
}

// ===== API RESPONSE TYPES =====

export interface TestApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp?: string;
}

export type TestSessionResponse = TestApiResponse<TestSession>;
export type TestPlayersResponse = TestApiResponse<TestSessionPlayer[]>;
export type TestGameStateResponse = TestApiResponse<TestGameState>;
export type TestAchievementsResponse = TestApiResponse<TestAchievement[]>;
export type TestSpeedrunsResponse = TestApiResponse<TestSpeedrun[]>;
export type TestLeaderboardResponse = TestApiResponse<TestLeaderboardEntry[]>;

export interface TestLeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url?: string;
  score: number;
  time?: number;
  date: string;
  is_current_user?: boolean;
}

// ===== ERROR TYPES =====

export interface TestErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
  retry?: boolean;
  retryAfter?: number;
}

export interface TestValidationError extends TestErrorResponse {
  field: string;
  message: string;
  constraint: string;
}

// ===== TEST ASSERTION HELPERS =====

export interface TestTimerAssertions {
  accuracy: number; // allowed drift in milliseconds
  precision: 'ms' | 'centiseconds' | 'deciseconds';
  startTime: number;
  endTime: number;
  expectedDuration: number;
}

export interface TestGameAssertions {
  cellCount: number;
  markedCells: number[];
  winner?: string;
  gameState: 'waiting' | 'active' | 'paused' | 'completed';
  playerCount: number;
}

export interface TestPerformanceThresholds {
  loadTime: number;
  memoryUsage: number;
  networkRequests: number;
  domElements: number;
  jsHeapSize: number;
}

// ===== CONSTANTS FOR TESTING =====

export const TEST_CONSTANTS = {
  TIMER_PRECISION_MS: 100,
  MAX_SESSION_PLAYERS: 8,
  DEFAULT_BOARD_SIZE: 25,
  WEBSOCKET_TIMEOUT: 5000,
  API_TIMEOUT: 10000,
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 250,
  POLLING_INTERVAL: 1000,
} as const;

export const TEST_PERFORMANCE_THRESHOLDS: TestPerformanceThresholds = {
  loadTime: 3000, // 3 seconds
  memoryUsage: 50, // 50MB
  networkRequests: 20, // max requests per page
  domElements: 1000, // max DOM elements
  jsHeapSize: 100, // 100MB
} as const;

export const TEST_TIMER_THRESHOLDS = {
  ACCURACY_MS: 100, // ±100ms tolerance
  HIGH_CPU_ACCURACY_MS: 150, // ±150ms under load
  MOBILE_ACCURACY_MS: 200, // ±200ms on mobile
  BACKGROUND_ACCURACY_MS: 200, // ±200ms when backgrounded
} as const;

// ===== WIN PATTERN DEFINITIONS =====

export const TEST_WIN_PATTERNS = {
  HORIZONTAL: [
    [0, 1, 2, 3, 4],
    [5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14],
    [15, 16, 17, 18, 19],
    [20, 21, 22, 23, 24],
  ],
  VERTICAL: [
    [0, 5, 10, 15, 20],
    [1, 6, 11, 16, 21],
    [2, 7, 12, 17, 22],
    [3, 8, 13, 18, 23],
    [4, 9, 14, 19, 24],
  ],
  DIAGONAL: [
    [0, 6, 12, 18, 24],
    [4, 8, 12, 16, 20],
  ],
  CORNERS: [[0, 4, 20, 24]],
  CENTER_PLUS: [[2, 7, 12, 17, 22]],
} as const;

// ===== MOCK DATA GENERATORS =====

export interface MockDataGenerators {
  randomSessionCode(): string;
  randomUserId(): string;
  randomBoardTitle(): string;
  randomPlayerName(): string;
  randomColor(): string;
  randomTimestamp(): string;
  randomCellText(): string;
  randomAchievementName(): string;
}

// ===== HELPER FUNCTION TYPES =====

export type WaitForCondition = (
  page: Page,
  condition: () => Promise<boolean>,
  timeout?: number
) => Promise<void>;

export type MockApiCall = (
  page: Page,
  url: string,
  response: TestApiResponse
) => Promise<void>;

export type SimulateWebSocketEvent = (
  page: Page,
  event: TestGameEvent
) => Promise<void>;

export type MeasurePerformance = (
  page: Page,
  action: () => Promise<void>
) => Promise<TestPerformanceMetrics>;

export type CreateTestSession = (
  options?: TestFixtureOptions
) => Promise<TestSession>;

export type JoinTestSession = (
  page: Page,
  sessionCode: string
) => Promise<void>;

export type StartTestTimer = (
  page: Page,
  precision?: 'ms' | 'centiseconds'
) => Promise<void>;

export type VerifyTimerAccuracy = (
  page: Page,
  expectedDuration: number,
  tolerance?: number
) => Promise<boolean>;

// ===== EXTENDED PAGE TYPE =====

export interface TestPage extends Page {
  helpers: {
    waitForGameState(state: string): Promise<void>;
    markCell(index: number): Promise<void>;
    waitForPlayerJoin(playerId: string): Promise<void>;
    startSpeedrun(): Promise<void>;
    pauseTimer(): Promise<void>;
    getTimerValue(): Promise<number>;
    waitForAchievement(achievementId: string): Promise<void>;
    getPerformanceMetrics(): Promise<TestPerformanceMetrics>;
  };
}
