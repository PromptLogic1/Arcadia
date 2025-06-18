import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { waitForNetworkIdle, fillForm } from '../../helpers/test-utils';
import type { Tables, Enums } from '../../../types/database.types';
import type { 
  BoardCell,
  GamePlayer
} from '../../../types/domains/bingo';
import type { CompositeTypes } from '../../../types/database.types';

/**
 * Enhanced Bingo test utilities with full type safety
 */

// Type aliases for database composite types
type SessionSettings = CompositeTypes<'session_settings'>;
type BoardSettings = CompositeTypes<'board_settings'>;
type WinConditions = CompositeTypes<'win_conditions'>;

// =============================================================================
// TYPE-SAFE INTERFACES
// =============================================================================

export interface TypedGameSession {
  session: Tables<'bingo_sessions'>;
  players: Tables<'bingo_session_players'>[];
  cells: Tables<'bingo_session_cells'>[];
  events: Tables<'bingo_session_events'>[];
}

export interface TypedBoardFixture {
  board: Tables<'bingo_boards'>;
  cards: Tables<'bingo_cards'>[];
  layout: BoardCell[];
}

export interface GameStateSnapshot {
  markedCells: Array<{
    position: number;
    row: number;
    col: number;
    markedBy: string[];
    color: string;
  }>;
  players: GamePlayer[];
  gameStatus: Enums<'session_status'>;
  version: number;
  lastUpdate: string;
}

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  details?: Record<string, unknown>;
}

// =============================================================================
// GAME STATE TRANSITIONS
// =============================================================================

export type GameStateTransition = 
  | { type: 'CELL_MARKED'; payload: { cellPosition: number; playerId: string; color: string } }
  | { type: 'CELL_UNMARKED'; payload: { cellPosition: number; playerId: string } }
  | { type: 'PLAYER_JOINED'; payload: { player: Tables<'bingo_session_players'> } }
  | { type: 'PLAYER_LEFT'; payload: { playerId: string } }
  | { type: 'GAME_PAUSED'; payload: { pausedBy: string } }
  | { type: 'GAME_RESUMED'; payload: { resumedBy: string } }
  | { type: 'GAME_WON'; payload: { winnerId: string; pattern: string; winningCells: number[] } };

// =============================================================================
// REALTIME EVENT TYPES
// =============================================================================

export interface RealtimeEvent<T = unknown> {
  type: Enums<'session_event_type'>;
  sessionId: string;
  playerId: string;
  timestamp: number;
  data: T;
  version: number;
}

export type CellMarkEvent = RealtimeEvent<{
  cellPosition: number;
  marked: boolean;
  color: string;
}>;

export type PlayerEvent = RealtimeEvent<{
  action: 'joined' | 'left' | 'disconnected' | 'reconnected';
  playerData?: Tables<'bingo_session_players'>;
}>;

// =============================================================================
// BOARD CREATION WITH TYPE SAFETY
// =============================================================================

/**
 * Create a complete bingo board with full type safety
 */
export async function createTypedTestBoard(
  page: Page,
  options: {
    title?: string;
    size?: 3 | 4 | 5 | 6;
    gameType?: Enums<'game_category'>;
    difficulty?: Enums<'difficulty_level'>;
    cardCount?: number;
    isPublic?: boolean;
    winConditions?: Partial<WinConditions>;
    sessionSettings?: Partial<SessionSettings>;
  } = {}
): Promise<TypedBoardFixture> {
  const {
    title = 'Test Board',
    size = 5,
    gameType = 'Valorant',
    difficulty = 'medium',
    cardCount = size * size,
    isPublic = true,
    winConditions = { line: true, diagonal: true },
    sessionSettings = { max_players: 4, allow_spectators: true }
  } = options;

  // Navigate to create board
  await page.goto('/play-area/bingo');
  await waitForNetworkIdle(page);
  
  await page.getByRole('button', { name: /create.*board/i }).click();
  
  // Fill board creation form with typed data
  await fillForm(page, {
    title,
    boardSize: size.toString(),
    gameType,
    difficulty,
    isPublic
  });
  
  // Configure win conditions
  if (winConditions.line !== undefined && winConditions.line !== null) {
    await page.getByLabel(/horizontal.*vertical.*win/i).setChecked(winConditions.line);
  }
  if (winConditions.diagonal !== undefined && winConditions.diagonal !== null) {
    await page.getByLabel(/diagonal.*win/i).setChecked(winConditions.diagonal);
  }
  
  await page.getByRole('button', { name: /create/i }).click();
  await expect(page.getByText(/board created successfully/i)).toBeVisible();
  
  // Extract board ID
  const url = page.url();
  const boardId = url.split('/').pop() || '';
  
  // Create typed board object
  const board: Tables<'bingo_boards'> = {
    id: boardId,
    title,
    size,
    game_type: gameType,
    difficulty,
    is_public: isPublic,
    board_state: null,
    settings: { winConditions, sessionSettings },
    status: 'draft',
    creator_id: null,
    description: null,
    cloned_from: null,
    version: 1,
    votes: 0,
    bookmarked_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Add cards with proper types
  const cards: Tables<'bingo_cards'>[] = [];
  const layout: BoardCell[] = [];
  
  for (let i = 0; i < cardCount; i++) {
    const cardText = `Test Card ${i + 1}`;
    const cardId = `card-${boardId}-${i}`;
    
    // Create typed card
    const card: Tables<'bingo_cards'> = {
      id: cardId,
      title: cardText,
      game_type: gameType,
      difficulty,
      description: null,
      tags: ['test', 'automated'],
      is_public: true,
      creator_id: null,
      votes: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    cards.push(card);
    
    // Add card via UI
    await page.getByRole('button', { name: /add.*card/i }).click();
    await page.getByLabel(/card text/i).fill(cardText);
    await page.getByLabel(/category/i).selectOption('action');
    await page.getByRole('button', { name: /save.*card/i }).click();
    
    // Place card in grid
    const cardElement = page.getByTestId('library-card').filter({ hasText: cardText }).first();
    const row = Math.floor(i / size);
    const col = i % size;
    const cell = page.getByTestId(`grid-cell-${row}-${col}`);
    await cardElement.dragTo(cell);
    
    // Create typed board cell
    const boardCell: BoardCell = {
      text: cardText,
      colors: null,
      completed_by: null,
      blocked: false,
      is_marked: false,
      cell_id: cardId,
      version: 1,
      last_updated: Date.now(),
      last_modified_by: null
    };
    layout.push(boardCell);
  }
  
  await waitForNetworkIdle(page);
  
  return { board, cards, layout };
}

// =============================================================================
// GAME SESSION MANAGEMENT
// =============================================================================

/**
 * Start a typed game session with full state tracking
 */
export async function startTypedGameSession(
  page: Page,
  boardId?: string,
  settings?: Partial<SessionSettings>
): Promise<TypedGameSession> {
  if (boardId) {
    await page.goto(`/play-area/bingo/edit/${boardId}`);
    await waitForNetworkIdle(page);
  }
  
  // Configure session settings if provided
  if (settings) {
    await page.getByRole('button', { name: /game.*settings/i }).click();
    if (settings.max_players !== undefined && settings.max_players !== null) {
      await page.getByLabel(/max.*players/i).fill(settings.max_players.toString());
    }
    if (settings.allow_spectators !== undefined && settings.allow_spectators !== null) {
      await page.getByLabel(/allow.*spectators/i).setChecked(settings.allow_spectators);
    }
    await page.getByRole('button', { name: /save.*settings/i }).click();
  }
  
  await page.getByRole('button', { name: /start.*game/i }).click();
  await expect(page.getByText(/game started/i)).toBeVisible();
  
  const sessionCode = await page.getByTestId('session-code').textContent() || '';
  const sessionUrl = page.url();
  const sessionId = sessionUrl.split('/').pop() || '';
  
  // Create typed session object
  const session: Tables<'bingo_sessions'> = {
    id: sessionId,
    board_id: boardId || null,
    session_code: sessionCode,
    host_id: null,
    status: 'active',
    current_state: null,
    settings: settings ? {
      max_players: settings.max_players || 4,
      allow_spectators: settings.allow_spectators || true,
      auto_start: settings.auto_start || false,
      time_limit: settings.time_limit || null,
      require_approval: settings.require_approval || false,
      password: settings.password || null
    } : null,
    version: 1,
    winner_id: null,
    started_at: new Date().toISOString(),
    ended_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  return {
    session,
    players: [],
    cells: [],
    events: []
  };
}

/**
 * Join a game session with typed player data
 */
export async function joinTypedGameSession(
  page: Page,
  sessionCode: string,
  playerData: {
    displayName?: string;
    color?: string;
    team?: number;
  } = {}
): Promise<Tables<'bingo_session_players'>> {
  await page.goto('/play-area/bingo');
  await waitForNetworkIdle(page);
  
  await page.getByRole('button', { name: /join.*game/i }).click();
  await page.getByLabel(/session code/i).fill(sessionCode);
  
  if (playerData.displayName) {
    await page.getByLabel(/display.*name/i).fill(playerData.displayName);
  }
  
  await page.getByRole('button', { name: /join/i }).click();
  await expect(page.getByText(/joined game/i)).toBeVisible();
  
  // Create typed player object
  const player: Tables<'bingo_session_players'> = {
    id: '',
    session_id: '',
    user_id: '',
    color: playerData.color || '#06b6d4',
    display_name: playerData.displayName || 'Player',
    team: playerData.team || null,
    joined_at: new Date().toISOString(),
    left_at: null,
    is_host: false,
    is_ready: true,
    position: null,
    score: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  return player;
}

// =============================================================================
// CELL MARKING WITH STATE TRACKING
// =============================================================================

/**
 * Mark cells with full state tracking and verification
 */
export async function markCellsWithTracking(
  page: Page,
  cells: Array<{ row: number; col: number }>,
  playerId: string,
  color = '#06b6d4'
): Promise<CellMarkEvent[]> {
  const events: CellMarkEvent[] = [];
  
  for (const { row, col } of cells) {
    const cellPosition = row * 5 + col; // Assuming 5x5 grid
    const cellElement = page.getByTestId(`grid-cell-${row}-${col}`);
    
    // Mark the cell
    await cellElement.click();
    
    // Verify marking
    await expect(cellElement).toHaveAttribute('data-marked', 'true');
    await expect(cellElement).toHaveAttribute('data-marked-by', playerId);
    
    // Create typed event
    const event: CellMarkEvent = {
      type: 'cell_marked',
      sessionId: '', // Would be filled from actual session
      playerId,
      timestamp: Date.now(),
      data: {
        cellPosition,
        marked: true,
        color
      },
      version: 1
    };
    
    events.push(event);
  }
  
  return events;
}

// =============================================================================
// GAME STATE VERIFICATION
// =============================================================================

/**
 * Get current game state with full type information
 */
export async function getTypedGameState(page: Page): Promise<GameStateSnapshot> {
  const markedCells: GameStateSnapshot['markedCells'] = [];
  const gridSize = 5; // Default, could be parameterized
  
  // Get all marked cells with detailed info
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cell = page.getByTestId(`grid-cell-${row}-${col}`);
      const isMarked = await cell.getAttribute('data-marked') === 'true';
      
      if (isMarked) {
        const markedBy = await cell.getAttribute('data-marked-by') || '';
        const color = await cell.getAttribute('data-player-color') || '';
        
        markedCells.push({
          position: row * gridSize + col,
          row,
          col,
          markedBy: markedBy.split(',').filter(Boolean),
          color
        });
      }
    }
  }
  
  // Get player information
  const playerElements = await page.getByTestId(/player-item-\d+/).all();
  const players: GamePlayer[] = [];
  
  for (const playerEl of playerElements) {
    const name = await playerEl.getByTestId('player-name').textContent() || '';
    const color = await playerEl.getAttribute('data-player-color') || '';
    const playerId = await playerEl.getAttribute('data-player-id') || '';
    
    players.push({
      id: playerId,
      display_name: name,
      color,
      hoverColor: color,
      team: 0,
      isActive: true,
      session_id: '',
      user_id: playerId,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_host: false,
      is_ready: true,
      joined_at: new Date().toISOString(),
      left_at: null,
      position: null,
      score: null
    });
  }
  
  // Get game status
  const statusText = await page.getByTestId('game-status').textContent() || '';
  const gameStatus = mapStatusTextToEnum(statusText);
  
  return {
    markedCells,
    players,
    gameStatus,
    version: 1,
    lastUpdate: new Date().toISOString()
  };
}

// =============================================================================
// WIN PATTERN TESTING
// =============================================================================

/**
 * Mark cells for specific win patterns with verification
 */
export async function markWinPattern(
  page: Page,
  pattern: 'horizontal' | 'vertical' | 'diagonal' | 'four-corners' | 'x' | 'plus' | 'full-house',
  options: {
    boardSize?: number;
    row?: number;
    col?: number;
    playerId?: string;
    color?: string;
  } = {}
): Promise<number[]> {
  const { boardSize = 5, row = 0, col = 0, playerId = 'test-player', color = '#06b6d4' } = options;
  const markedPositions: number[] = [];
  
  switch (pattern) {
    case 'horizontal':
      for (let c = 0; c < boardSize; c++) {
        await markCellsWithTracking(page, [{ row, col: c }], playerId, color);
        markedPositions.push(row * boardSize + c);
      }
      break;
      
    case 'vertical':
      for (let r = 0; r < boardSize; r++) {
        await markCellsWithTracking(page, [{ row: r, col }], playerId, color);
        markedPositions.push(r * boardSize + col);
      }
      break;
      
    case 'diagonal':
      for (let i = 0; i < boardSize; i++) {
        await markCellsWithTracking(page, [{ row: i, col: i }], playerId, color);
        markedPositions.push(i * boardSize + i);
      }
      break;
      
    case 'four-corners': {
      const corners = [
        { row: 0, col: 0 },
        { row: 0, col: boardSize - 1 },
        { row: boardSize - 1, col: 0 },
        { row: boardSize - 1, col: boardSize - 1 }
      ];
      await markCellsWithTracking(page, corners, playerId, color);
      corners.forEach(({ row, col }) => markedPositions.push(row * boardSize + col));
      break;
    }
      
    case 'x':
      for (let i = 0; i < boardSize; i++) {
        await markCellsWithTracking(page, [
          { row: i, col: i },
          { row: i, col: boardSize - 1 - i }
        ], playerId, color);
        markedPositions.push(i * boardSize + i);
        if (i !== boardSize - 1 - i) {
          markedPositions.push(i * boardSize + (boardSize - 1 - i));
        }
      }
      break;
      
    case 'plus': {
      const middle = Math.floor(boardSize / 2);
      for (let i = 0; i < boardSize; i++) {
        await markCellsWithTracking(page, [
          { row: middle, col: i },
          { row: i, col: middle }
        ], playerId, color);
        markedPositions.push(middle * boardSize + i);
        if (i !== middle) {
          markedPositions.push(i * boardSize + middle);
        }
      }
      break;
    }
      
    case 'full-house': {
      const allCells = [];
      for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
          allCells.push({ row: r, col: c });
          markedPositions.push(r * boardSize + c);
        }
      }
      await markCellsWithTracking(page, allCells, playerId, color);
      break;
    }
  }
  
  return markedPositions;
}

/**
 * Verify win detection with typed response
 */
export async function verifyWinDetection(
  page: Page,
  expectedWinner: string,
  expectedPattern: string
): Promise<{
  winner: string;
  pattern: string;
  winningCells: number[];
  timestamp: string;
}> {
  // Wait for win dialog
  await expect(page.getByRole('dialog', { name: /winner/i })).toBeVisible();
  
  // Get winner information
  const winnerText = await page.getByTestId('winner-name').textContent() || '';
  const patternText = await page.getByTestId('win-pattern').textContent() || '';
  
  // Get winning cells
  const winningCellElements = await page.locator('.winning-cell').all();
  const winningCells: number[] = [];
  
  for (const cellEl of winningCellElements) {
    const testId = await cellEl.getAttribute('data-testid') || '';
    const matches = testId.match(/grid-cell-(\d+)-(\d+)/);
    if (matches && matches[1] && matches[2]) {
      const row = parseInt(matches[1]);
      const col = parseInt(matches[2]);
      winningCells.push(row * 5 + col); // Assuming 5x5
    }
  }
  
  // Verify expectations
  expect(winnerText).toContain(expectedWinner);
  expect(patternText.toLowerCase()).toContain(expectedPattern.toLowerCase());
  
  return {
    winner: winnerText,
    pattern: patternText,
    winningCells,
    timestamp: new Date().toISOString()
  };
}

// =============================================================================
// REAL-TIME TESTING UTILITIES
// =============================================================================

/**
 * Test WebSocket resilience with network conditions
 */
export async function testWebSocketResilience(
  page: Page,
  conditions: {
    disconnectDuration?: number;
    packetLoss?: number;
    latency?: number;
    jitter?: number;
  } = {}
): Promise<{
  reconnectTime: number;
  stateConsistent: boolean;
  eventsLost: number;
}> {
  const context = page.context();
  const startState = await getTypedGameState(page);
  const disconnectStart = Date.now();
  
  // Simulate network conditions
  await context.setOffline(true);
  
  if (conditions.disconnectDuration) {
    await page.waitForTimeout(conditions.disconnectDuration);
  }
  
  // Reconnect
  await context.setOffline(false);
  const reconnectTime = Date.now() - disconnectStart;
  
  // Wait for reconnection
  await expect(page.getByText(/reconnected|online/i)).toBeVisible({ timeout: 10000 });
  
  // Verify state consistency
  const endState = await getTypedGameState(page);
  const stateConsistent = JSON.stringify(startState.markedCells) === JSON.stringify(endState.markedCells);
  
  return {
    reconnectTime,
    stateConsistent,
    eventsLost: 0 // Would need event tracking to determine
  };
}

/**
 * Test concurrent operations with conflict resolution
 */
export async function testConcurrentOperations(
  pages: Page[],
  operation: (page: Page) => Promise<void>
): Promise<{
  conflicts: number;
  resolutionTime: number;
  finalState: GameStateSnapshot;
}> {
  const startTime = Date.now();
  let conflicts = 0;
  
  // Execute operations concurrently
  const results = await Promise.allSettled(
    pages.map(page => operation(page))
  );
  
  // Check for conflicts
  results.forEach(result => {
    if (result.status === 'rejected') {
      conflicts++;
    }
  });
  
  // Wait for state to stabilize
  if (pages.length === 0) {
    throw new Error('No pages provided for conflict resolution test');
  }
  
  const firstPage = pages[0];
  if (!firstPage) throw new Error('No pages provided');
  
  await firstPage.waitForTimeout(500);
  
  // Get final state from first page
  const finalState = await getTypedGameState(firstPage);
  const resolutionTime = Date.now() - startTime;
  
  // Verify all pages have same state
  for (const page of pages.slice(1)) {
    const state = await getTypedGameState(page);
    expect(state.markedCells).toEqual(finalState.markedCells);
  }
  
  return { conflicts, resolutionTime, finalState };
}

// =============================================================================
// PERFORMANCE MEASUREMENT
// =============================================================================

/**
 * Measure operation performance with detailed metrics
 */
export async function measureOperationPerformance<T>(
  operation: () => Promise<T>,
  operationName: string,
  expectedDuration: number
): Promise<{
  result: T;
  metrics: PerformanceMetrics;
  passed: boolean;
}> {
  const startTime = performance.now();
  let success = true;
  let result: T;
  
  try {
    result = await operation();
  } catch (error) {
    success = false;
    throw error;
  }

  const duration = performance.now() - startTime;
  const passed = duration <= expectedDuration;
  
  const metrics: PerformanceMetrics = {
    operation: operationName,
    duration,
    timestamp: Date.now(),
    success,
    details: {
      expected: expectedDuration,
      actual: duration,
      difference: duration - expectedDuration
    }
  };
  
  if (!passed) {
    console.warn(
      `Performance degradation: ${operationName} took ${duration}ms (expected ${expectedDuration}ms)`
    );
  }
  
  return { result, metrics, passed };
}

// =============================================================================
// MULTIPLAYER SESSION MANAGEMENT
// =============================================================================

/**
 * Create a full multiplayer session with typed data
 */
export async function createTypedMultiplayerSession(
  hostPage: Page,
  playerPages: Page[],
  options: {
    boardId?: string;
    sessionSettings?: Partial<SessionSettings>;
    playerColors?: string[];
  } = {}
): Promise<{
  session: TypedGameSession;
  players: Tables<'bingo_session_players'>[];
  getState: () => Promise<GameStateSnapshot>;
}> {
  // Host starts the session
  const session = await startTypedGameSession(
    hostPage,
    options.boardId,
    options.sessionSettings
  );
  
  const players: Tables<'bingo_session_players'>[] = [];
  
  // Add host as first player
  const hostPlayer: Tables<'bingo_session_players'> = {
    id: '',
    session_id: session.session.id,
    user_id: '',
    color: options.playerColors?.[0] || '#06b6d4',
    display_name: 'Host',
    team: null,
    joined_at: new Date().toISOString(),
    left_at: null,
    is_host: true,
    is_ready: true,
    position: null,
    score: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  players.push(hostPlayer);
  
  // Other players join
  for (let i = 0; i < playerPages.length; i++) {
    const playerPage = playerPages[i];
    if (!playerPage) continue;
    
    const player = await joinTypedGameSession(
      playerPage,
      session.session.session_code || '',
      {
        displayName: `Player ${i + 2}`,
        color: options.playerColors?.[i + 1] || PLAYER_COLORS[i + 1]
      }
    );
    players.push(player);
  }
  
  // Verify all players are connected
  const totalPlayers = playerPages.length + 1;
  await expect(hostPage.getByText(new RegExp(`${totalPlayers} players`, 'i'))).toBeVisible();
  
  return {
    session: { ...session, players },
    players,
    getState: () => getTypedGameState(hostPage)
  };
}

// =============================================================================
// TEST CLEANUP
// =============================================================================

/**
 * Enhanced cleanup with resource tracking and database cleanup
 */
export class TypedTestSessionManager {
  private sessions = new Set<string>();
  private boards = new Set<string>();
  private pages = new Set<Page>();
  private players = new Set<string>();
  private cleanupPromises: Promise<void>[] = [];
  
  trackSession(sessionId: string): void {
    this.sessions.add(sessionId);
  }
  
  trackBoard(boardId: string): void {
    this.boards.add(boardId);
  }
  
  trackPage(page: Page): void {
    this.pages.add(page);
  }
  
  trackPlayer(playerId: string): void {
    this.players.add(playerId);
  }
  
  /**
   * Comprehensive cleanup with database operations
   */
  async cleanup(): Promise<void> {
    const cleanupOperations: Promise<void>[] = [];
    
    // 1. Close all tracked pages
    cleanupOperations.push(
      ...Array.from(this.pages).map(async (page) => {
        try {
          if (!page.isClosed()) {
            await page.close();
          }
        } catch (error) {
          console.warn('Failed to close page:', error);
        }
      })
    );
    
    // 2. End active sessions
    cleanupOperations.push(
      ...Array.from(this.sessions).map(async (sessionId) => {
        try {
          await this.endSession(sessionId);
        } catch (error) {
          console.warn(`Failed to end session ${sessionId}:`, error);
        }
      })
    );
    
    // 3. Delete test boards
    cleanupOperations.push(
      ...Array.from(this.boards).map(async (boardId) => {
        try {
          await this.deleteBoard(boardId);
        } catch (error) {
          console.warn(`Failed to delete board ${boardId}:`, error);
        }
      })
    );
    
    // 4. Clean up player data
    cleanupOperations.push(
      ...Array.from(this.players).map(async (playerId) => {
        try {
          await this.cleanupPlayerData(playerId);
        } catch (error) {
          console.warn(`Failed to cleanup player ${playerId}:`, error);
        }
      })
    );
    
    // Execute all cleanup operations in parallel
    await Promise.allSettled(cleanupOperations);
    
    // Clear tracking sets
    this.sessions.clear();
    this.boards.clear();
    this.pages.clear();
    this.players.clear();
    this.cleanupPromises = [];
  }
  
  /**
   * Force end a game session
   */
  private async endSession(sessionId: string): Promise<void> {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true, reason: 'test_cleanup' })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to end session: ${response.statusText}`);
      }
    } catch (error) {
      // Session might already be ended, which is fine for cleanup
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.debug(`Session ${sessionId} cleanup:`, errorMessage);
    }
  }
  
  /**
   * Delete a test board and associated data
   */
  private async deleteBoard(boardId: string): Promise<void> {
    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete board: ${response.statusText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.debug(`Board ${boardId} cleanup:`, errorMessage);
    }
  }
  
  /**
   * Clean up player-specific test data
   */
  private async cleanupPlayerData(playerId: string): Promise<void> {
    try {
      // Clear player statistics
      await fetch(`/api/players/${playerId}/stats`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Clear player session history for test data
      await fetch(`/api/players/${playerId}/sessions?test=true`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.debug(`Player ${playerId} cleanup:`, errorMessage);
    }
  }
  
  /**
   * Emergency cleanup for critical test failures
   */
  async emergencyCleanup(): Promise<void> {
    console.warn('Performing emergency cleanup...');
    
    // Force close all pages immediately
    await Promise.allSettled(
      Array.from(this.pages).map(page => 
        page.close().catch(() => {})
      )
    );
    
    // Clear all tracking without waiting for API calls
    this.sessions.clear();
    this.boards.clear();
    this.pages.clear();
    this.players.clear();
  }
  
  /**
   * Get cleanup status for debugging
   */
  getStatus(): {
    activeSessions: number;
    activeBoards: number;
    activePages: number;
    activePlayers: number;
  } {
    return {
      activeSessions: this.sessions.size,
      activeBoards: this.boards.size,
      activePages: this.pages.size,
      activePlayers: this.players.size
    };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function mapStatusTextToEnum(text: string): Enums<'session_status'> {
  const normalized = text.toLowerCase();
  if (normalized.includes('waiting')) return 'waiting';
  if (normalized.includes('active') || normalized.includes('in progress')) return 'active';
  if (normalized.includes('paused')) return 'waiting';
  if (normalized.includes('completed') || normalized.includes('ended')) return 'completed';
  return 'waiting';
}

// Default player colors for consistency
const PLAYER_COLORS = [
  '#06b6d4', // Cyan
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#10b981', // Green
  '#f59e0b', // Orange
  '#ef4444', // Red
];

// Export everything for backward compatibility
// export * from './bingo.config';