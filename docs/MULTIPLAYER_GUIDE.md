# 🎮 Multiplayer Bingo Game Guide

This guide explains how the multiplayer bingo game system works in Arcadia, including session management, real-time synchronization, and the join-by-code functionality.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Session Lifecycle](#session-lifecycle)
3. [API Endpoints](#api-endpoints)
4. [Real-time Synchronization](#real-time-synchronization)
5. [Frontend Integration](#frontend-integration)
6. [Testing Guide](#testing-guide)

## 🎯 Overview

The multiplayer bingo system allows multiple players to:
- Create a game session from any bingo board
- Join sessions using a 6-character code
- Play together in real-time
- See each other's moves instantly
- Track scores and determine winners

### Key Features
- **Session Codes**: Auto-generated 6-character alphanumeric codes
- **Real-time Sync**: Powered by Supabase's real-time subscriptions
- **Optimistic Locking**: Version control prevents race conditions
- **Host Controls**: Only the host can start/end sessions

## 🔄 Session Lifecycle

### 1. Session Creation
```typescript
POST /api/bingo/sessions
{
  "boardId": "uuid",
  "displayName": "Player Name",
  "color": "#FF6B6B",
  "team": null
}
```

**Process:**
1. Creates session with status `waiting`
2. Generates unique session code (e.g., "ABC123")
3. Copies board state to session
4. Adds creator as host

### 2. Joining a Session
```typescript
POST /api/bingo/sessions/join-by-code
{
  "session_code": "ABC123",
  "user_id": "uuid",
  "display_name": "Player 2",
  "avatar_url": "https://..."
}
```

**Process:**
1. Validates session code
2. Checks if session is accepting players
3. Assigns player color
4. Adds to session

### 3. Starting the Game
```typescript
POST /api/bingo/sessions/[id]/start
```

**Requirements:**
- Must be the host
- Minimum 2 players
- Session in `waiting` status

### 4. Playing the Game
```typescript
POST /api/bingo/sessions/[id]/mark-cell
{
  "cell_position": 12,
  "user_id": "uuid",
  "action": "mark", // or "unmark"
  "version": 5
}
```

**Features:**
- Version control prevents conflicts
- Real-time updates via subscriptions
- Event logging for replay/analytics

## 🛠️ API Endpoints

### Session Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bingo/sessions` | POST | Create new session |
| `/api/bingo/sessions` | GET | List sessions for a board |
| `/api/bingo/sessions` | PATCH | Update session state |
| `/api/bingo/sessions/join-by-code` | POST | Join session with code |
| `/api/bingo/sessions/[id]/start` | POST | Start game (host only) |

### Game State

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bingo/sessions/[id]/board-state` | GET | Get current board state |
| `/api/bingo/sessions/[id]/board-state` | PATCH | Update board state |
| `/api/bingo/sessions/[id]/mark-cell` | POST | Mark/unmark a cell |

### Player Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bingo/sessions/players` | POST | Add player to session |
| `/api/bingo/sessions/players` | PATCH | Update player info |
| `/api/bingo/sessions/players` | DELETE | Remove player |

## 🔄 Real-time Synchronization

### Setting up Subscriptions
```typescript
const channel = supabase
  .channel(`session:${sessionId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'bingo_sessions',
      filter: `id=eq.${sessionId}`
    },
    (payload) => {
      // Handle state update
      setBoardState(payload.new.current_state);
      setVersion(payload.new.version);
    }
  )
  .subscribe();
```

### Handling Conflicts
The system uses optimistic locking with version numbers:

1. Each state change increments the version
2. Updates must include the current version
3. Version mismatches return 409 Conflict
4. Frontend reloads state on conflict

## 🎨 Frontend Integration

### Using the useBingoGame Hook
```typescript
const {
  session,
  boardState,
  version,
  loading,
  error,
  markCell,
  unmarkCell
} = useBingoGame(sessionId);

// Mark a cell
const handleCellClick = async (position: number) => {
  await markCell(position, userId);
};
```

### Session Context
```typescript
const { 
  session, 
  players, 
  isHost,
  sessionCode 
} = useSession();
```

## 🧪 Testing Guide

### Manual Testing Steps

1. **Create a Session**
   - Create/select a bingo board
   - Click "Start Multiplayer Session"
   - Note the session code

2. **Join from Another Browser**
   - Open incognito/different browser
   - Enter session code
   - Verify player appears in lobby

3. **Start Game**
   - Host clicks "Start Game"
   - All players see status change

4. **Test Synchronization**
   - Player 1 marks a cell
   - Verify Player 2 sees it instantly
   - Test unmarking cells

5. **Test Conflict Resolution**
   - Both players mark different cells rapidly
   - Verify no cells are lost
   - Check version increments properly

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Session code not working | Ensure uppercase, check expiry |
| Players not syncing | Check WebSocket connection |
| Version conflicts | Implement retry logic |
| Host disconnected | Transfer host or pause session |

## 🔒 Security Considerations

1. **Authentication Required**: All endpoints require valid user session
2. **Host Permissions**: Only host can start/end sessions
3. **Rate Limiting**: Prevents spam and abuse
4. **Input Validation**: Session codes, player names sanitized
5. **RLS Policies**: Database-level security rules

## 📊 Database Schema

### bingo_sessions
```sql
- id: UUID (PK)
- board_id: UUID (FK)
- host_id: UUID (FK)
- session_code: TEXT (UNIQUE)
- status: session_status
- current_state: board_cell[]
- version: INTEGER
- settings: session_settings
- started_at: TIMESTAMPTZ
- ended_at: TIMESTAMPTZ
```

### bingo_session_players
```sql
- session_id: UUID (FK)
- user_id: UUID (FK)
- display_name: TEXT
- avatar_url: TEXT
- color: TEXT
- team: INTEGER
- is_host: BOOLEAN
- is_ready: BOOLEAN
- score: INTEGER
```

### bingo_session_events
```sql
- id: UUID (PK)
- session_id: UUID (FK)
- user_id: UUID (FK)
- event_type: TEXT
- event_data: JSONB
- cell_position: INTEGER
- timestamp: BIGINT
```

## 🚀 Future Enhancements

1. **Spectator Mode**: Allow watching without playing
2. **Team Play**: Collaborative bingo modes
3. **Tournament Support**: Multi-session competitions
4. **Replay System**: Watch game replays
5. **Voice/Video Chat**: Integrated communication
6. **Mobile Apps**: Native mobile experience