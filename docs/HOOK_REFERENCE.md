# 📚 Arcadia Gaming Platform - Hook Reference

**Last Updated**: 2025-05-31  
**Version**: Phase 1 Complete + Cleanup

This document provides comprehensive documentation for all React hooks used in the Arcadia Gaming Platform, focusing on the core bingo-boards feature and supporting functionality.

---

## 🎯 Core Bingo Hooks

### `useBingoGame`

**Purpose**: Main hook for bingo game logic and real-time state synchronization.

**Parameters**:
- `sessionId: string` - ID of the bingo session

**Returns**:
```typescript
{
  // State
  session: BingoSession | null;
  boardState: BoardCell[];
  version: number;
  loading: boolean;
  error: string | null;
  
  // Actions
  markCell: (position: number) => Promise<void>;
  unmarkCell: (position: number) => Promise<void>;
  refreshState: () => Promise<void>;
}
```

**Key Features**:
- Real-time synchronization via Supabase subscriptions
- Optimistic locking with version control
- Conflict resolution for concurrent modifications
- Automatic state updates when other players make moves

**Usage Example**:
```typescript
const { session, boardState, markCell, loading } = useBingoGame(sessionId);

const handleCellClick = async (position: number) => {
  if (!loading) {
    await markCell(position);
  }
};
```

---

### `useBingoBoard`

**Purpose**: Manages individual board data and metadata.

**Parameters**:
- `boardId: string` - ID of the bingo board

**Returns**:
```typescript
{
  // State
  board: BingoBoard | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  refreshBoard: () => Promise<void>;
  updateBoard: (updates: Partial<BingoBoard>) => Promise<void>;
}
```

**Key Features**:
- Fetches board configuration and metadata
- Handles board updates and validation
- Caches board data for performance

---

### `useBingoBoards`

**Purpose**: Manages lists of bingo boards with filtering and pagination.

**Returns**:
```typescript
{
  // State
  boards: BingoBoard[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  
  // Actions
  loadBoards: () => Promise<void>;
  loadMore: () => Promise<void>;
  refreshBoards: () => Promise<void>;
  createBoard: (data: CreateBoardFormData) => Promise<BingoBoard>;
}
```

**Key Features**:
- Infinite scrolling support
- Filtering by category, difficulty, and search terms
- Optimistic updates for new board creation

---

### `useBingoBoardsHub`

**Purpose**: Hub component logic for managing boards with filters and creation.

**Returns**:
```typescript
{
  // State
  boards: BingoBoard[];
  isCreateFormOpen: boolean;
  filterSelections: FilterState;
  loading: boolean;
  error: Error | null;
  
  // Actions
  handleFilterChange: (type: keyof FilterState, value: string) => void;
  setIsCreateFormOpen: (open: boolean) => void;
  handleCreateBoard: (data: CreateBoardFormData) => Promise<void>;
}
```

**Key Features**:
- Integrates filtering, creation, and board management
- State management for UI components
- Form handling for board creation

---

### `useBingoBoardEdit`

**Purpose**: Handles editing of existing bingo boards.

**Parameters**:
- `boardId: string` - ID of the board being edited

**Returns**:
```typescript
{
  // State
  board: BingoBoard | null;
  isDirty: boolean;
  isSaving: boolean;
  error: string | null;
  
  // Actions
  updateField: (field: string, value: any) => void;
  saveChanges: () => Promise<void>;
  resetChanges: () => void;
  discardChanges: () => void;
}
```

**Key Features**:
- Track unsaved changes
- Validation before saving
- Optimistic updates with rollback on failure

---

## 🎮 Game Management Hooks

### `useSession`

**Purpose**: Manages bingo session lifecycle and player coordination.

**Parameters**:
- `sessionId: string` - ID of the bingo session

**Returns**:
```typescript
{
  // State
  session: BingoSession | null;
  players: BingoSessionPlayer[];
  isHost: boolean;
  loading: boolean;
  error: string | null;
  
  // Actions
  joinSession: (data: JoinSessionData) => Promise<void>;
  leaveSession: () => Promise<void>;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
}
```

**Key Features**:
- Session status management (waiting, active, completed)
- Player management and permissions
- Host controls for session lifecycle

---

### `useSessionQueue`

**Purpose**: Manages session queue and matchmaking.

**Returns**:
```typescript
{
  // State
  queueEntry: QueueEntry | null;
  estimatedWait: number;
  position: number;
  isInQueue: boolean;
  
  // Actions
  joinQueue: (preferences: QueuePreferences) => Promise<void>;
  leaveQueue: () => Promise<void>;
  updatePreferences: (preferences: QueuePreferences) => Promise<void>;
}
```

**Key Features**:
- Automatic matchmaking based on preferences
- Real-time queue position updates
- Wait time estimation

---

### `useGameSettings`

**Purpose**: Manages game configuration and preferences.

**Parameters**:
- `sessionId: string` - ID of the session

**Returns**:
```typescript
{
  // State
  settings: SessionSettings;
  loading: boolean;
  error: string | null;
  
  // Actions
  updateSettings: (settings: Partial<SessionSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}
```

**Key Features**:
- Game difficulty and rule configuration
- Player limits and team settings
- Win condition customization

---

### `useGameState`

**Purpose**: Manages overall game state and phase transitions.

**Parameters**:
- `sessionId: string` - ID of the session

**Returns**:
```typescript
{
  // State
  gamePhase: GamePhase;
  winner: string | null;
  gameStats: GameStats;
  
  // Actions
  checkWinCondition: () => Promise<boolean>;
  declareWinner: (playerId: string) => Promise<void>;
  resetGame: () => Promise<void>;
}
```

**Key Features**:
- Win condition detection
- Game phase management
- Statistics tracking

---

### `usePlayerManagement`

**Purpose**: Handles player operations and team management.

**Parameters**:
- `sessionId: string` - ID of the session

**Returns**:
```typescript
{
  // State
  players: GamePlayer[];
  currentPlayer: GamePlayer | null;
  loading: boolean;
  error: Error | null;
  
  // Actions
  addPlayer: (player: JoinSessionForm) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  updatePlayer: (playerId: string, updates: Partial<GamePlayer>) => Promise<void>;
  assignTeam: (playerId: string, team: number) => Promise<void>;
}
```

**Key Features**:
- Player lifecycle management
- Team assignment and balancing
- Player status tracking

---

### `useTimer`

**Purpose**: Game timer and time-based events.

**Parameters**:
- `duration?: number` - Timer duration in seconds

**Returns**:
```typescript
{
  // State
  timeRemaining: number;
  isRunning: boolean;
  isCompleted: boolean;
  
  // Actions
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  addTime: (seconds: number) => void;
}
```

**Key Features**:
- Countdown timer functionality
- Pause/resume capabilities
- Time-based game events

---

### `usePresence`

**Purpose**: Real-time presence tracking for multiplayer sessions.

**Parameters**:
- `sessionId: string` - ID of the session

**Returns**:
```typescript
{
  // State
  presenceState: PresenceState;
  onlineUsers: string[];
  typingUsers: string[];
  
  // Actions
  updatePresence: (state: Partial<PresenceState>) => void;
  setTyping: (isTyping: boolean) => void;
}
```

**Key Features**:
- Real-time user presence
- Typing indicators
- Connection status tracking

---

## 🏗️ Utility Hooks

### `useGeneratorPanel`

**Purpose**: Board generator UI and logic.

**Returns**:
```typescript
{
  // State
  isOpen: boolean;
  generatorOptions: GeneratorOptions;
  isGenerating: boolean;
  
  // Actions
  openPanel: () => void;
  closePanel: () => void;
  updateOptions: (options: Partial<GeneratorOptions>) => void;
  generateBoard: () => Promise<BingoBoard>;
}
```

**Key Features**:
- Board generation configuration
- UI panel management
- Template and category selection

---

## 🧹 Removed Hooks (Post-Cleanup)

The following hooks were removed during the cleanup process as they were unused:

- ~~`useGameAnalytics`~~ - Complex analytics system never implemented
- ~~`useLayout`~~ - Layout management never used
- ~~`useTagSystem`~~ - Tag management system unused

These hooks can be re-implemented in the future if needed, but their removal improved codebase maintainability.

---

## 📖 Usage Patterns

### Basic Session Flow
```typescript
// 1. Create or join session
const { session, joinSession } = useSession(sessionId);

// 2. Set up game state
const { boardState, markCell } = useBingoGame(sessionId);

// 3. Manage players
const { players, addPlayer } = usePlayerManagement(sessionId);

// 4. Handle real-time updates
const { presenceState } = usePresence(sessionId);
```

### Board Management Flow
```typescript
// 1. List boards
const { boards, loadBoards } = useBingoBoards();

// 2. Select and edit board
const { board, saveChanges } = useBingoBoardEdit(boardId);

// 3. Generate new board
const { generateBoard } = useGeneratorPanel();
```

---

## 🔧 Implementation Notes

### Error Handling
All hooks follow consistent error handling patterns:
- Errors are stored in `error` state
- Loading states prevent duplicate operations
- Automatic retry logic for transient failures

### Performance Optimizations
- Hooks use `useCallback` and `useMemo` appropriately
- Real-time subscriptions are properly cleaned up
- State updates are batched when possible

### Type Safety
- All hooks are fully typed with TypeScript
- Generated database types are used consistently
- Return types are documented and exported

This reference serves as the definitive guide for all hooks in the Arcadia Gaming Platform. For specific implementation details, refer to the individual hook files in `src/features/bingo-boards/hooks/`.