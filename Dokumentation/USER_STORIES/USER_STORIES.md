# Arcadia Platform User Stories

## 👤 Guest User

As a guest user, I want to:

### View & Browse

- [x] See the landing page with featured games and challenges (verified in landing-page components)
- [x] Browse public bingo boards (verified in BoardCard.tsx)
- [x] View board details:
  - [x] Title
  - [x] Creator info
  - [x] Game type
  - [x] Difficulty
  - [x] Board size
  - [x] Vote count
  - [x] Bookmark count
- [x] View board layouts without saving (verified in BingoBoard.tsx)
- [x] Access basic search functionality (verified in useSearch.ts)

### Limited Interaction

- [x] Preview board generator (verified in BoardGenerator.tsx)
- [x] Temporarily edit board cells (verified in BingoCell.tsx)
- [x] Test board settings (verified in GameSettings.tsx)
- [x] Use board templates (verified in BoardGenerator.tsx)

### Restrictions (Database)

- [x] No write access to bingo_boards table (verified in RLS policies)
- [x] No write access to bingo_sessions table (verified in RLS policies)
- [x] No write access to bingo_session_players table (verified in RLS policies)
- [x] No access to private boards (verified in RLS policies)

## 🎮 Authenticated User

As an authenticated user, I want to:

### Board Management (bingo_boards table)

- [x] Create new boards with:
  - [x] Title (verified in database schema)
  - [x] Size (3x3 to 6x6) (verified in database schema)
  - [x] Game type (verified in database schema)
  - [x] Difficulty (verified in database schema)
  - [x] Board state (verified in database schema)
  - [x] Settings JSON (verified in database schema)
  - [x] Public/private status (verified in database schema)
- [x] Edit own boards (verified in RLS policies)
- [x] Clone public boards (verified in BoardCard.tsx)
- [x] Delete own boards (verified in RLS policies)

### Game Sessions (bingo_sessions table)

As an authenticated user, I want to:

#### Session Creation

- [x] Create new game sessions:
  - [x] Insert into bingo_sessions table:
    - [x] Generate UUID for session
    - [x] Link to board_id
    - [x] Set initial current_state
    - [x] Set status to 'active'
    - [x] Record started_at timestamp
  - [x] Handle session creation errors:
    - [x] Board existence validation
    - [x] Permission checks
    - [x] Concurrent session limits

#### Session Management

- [ ] Join existing sessions:
  - [x] Verify session status is 'active'
  - [x] Check player limit hasn't been reached
  - [x] Validate board accessibility
  - [ ] Handle concurrent join requests
  - [ ] Manage session state synchronization

#### State Management

- [x] Update session states:
  - [x] Modify current_state JSONB:
    - [x] Cell markings
    - [x] Team scores
    - [x] Turn order
  - [x] Handle state conflicts:
    - [x] Concurrent updates
    - [x] State validation
    - [x] Rollback mechanisms

#### Session History

- [ ] Track session progress:
  - [ ] Record state changes
  - [ ] Log player actions
  - [ ] Monitor win conditions
  - [ ] Handle session completion:
    - [ ] Update winner_id
    - [ ] Set status to 'completed'
    - [ ] Record ended_at timestamp

### Player Management (bingo_session_players table)

As an authenticated user, I want to:

#### Player Registration

- [x] Join sessions as player:
  - [x] Insert into bingo_session_players:
    - [x] Link session_id and user_id
    - [x] Set player_name
    - [x] Assign color
    - [x] Record joined_at timestamp
  - [x] Handle registration errors:
    - [x] Duplicate player checks
    - [x] Session capacity limits
    - [x] Permission validation

#### Player Configuration

- [x] Manage player settings:
  - [x] Update player_name:
    - [x] Validate length (3-20 chars)
    - [x] Check for duplicates
    - [x] Handle special characters
  - [x] Set player color:
    - [x] Validate color format
    - [x] Check color availability
    - [x] Handle color conflicts
  - [x] Configure team assignment:
    - [x] Validate team existence
    - [x] Check team capacity
    - [x] Handle team balance

#### Session Participation

- [ ] Track player activity:
  - [ ] Monitor connection status
  - [ ] Handle disconnections
  - [ ] Manage reconnections
  - [ ] Update last_active timestamp

#### Session Departure

- [x] Leave sessions properly:
  - [x] Update player status
  - [x] Clean up player resources
  - [x] Handle mid-game departures:
    - [x] State reconciliation
    - [x] Team rebalancing
    - [x] Turn order adjustment

### Database Constraints

- [ ] Foreign key relationships:
  - [ ] session_id -> bingo_sessions(id)
  - [ ] user_id -> users(id)
  - [ ] board_id -> bingo_boards(id)
- [ ] Unique constraints:
  - [ ] One player per session
  - [ ] Unique colors per session
  - [ ] Team number validation
- [ ] Check constraints:
  - [ ] Valid status values
  - [ ] Timestamp validations
  - [ ] Player count limits

### RLS Policies

- [ ] Session access:
  - [ ] View permissions for participants
  - [ ] Update permissions for creator
  - [ ] Delete permissions for admin
- [ ] Player management:
  - [ ] Join session policies
  - [ ] Update player info
  - [ ] Leave session permissions

### Error Handling

- [ ] Session errors:
  - [ ] Invalid session state
  - [ ] Concurrent access conflicts
  - [ ] Permission violations
- [ ] Player errors:
  - [ ] Invalid player data
  - [ ] Duplicate registrations
  - [ ] Team assignment conflicts

### Community Features

- [ ] Create discussions (not implemented)
- [ ] Comment on discussions (not implemented)
- [x] Vote on content (verified in RLS policies)
- [ ] Report inappropriate content (not implemented)

## ⭐ Premium User

As a premium user, I want to:

- [ ] Access extended board sizes (not implemented)
- [ ] Use custom themes (not implemented)
- [ ] Create tournaments (not implemented)
- [ ] Access advanced analytics (not implemented)
- [ ] Use team features (not implemented)
- [ ] Create private events (not implemented)

## 👮 Moderator (Community)

As a moderator, I want to:

- [x] Access all public and private boards (verified in RLS policies)
- [x] Manage board content (verified in RLS policies)
- [ ] Control game sessions (not working)
- [x] Update user roles (verified in RLS policies)

## 🔧 Administrator

As an administrator, I want to:

- [x] Full CRUD access to all tables (verified in RLS policies)
- [x] Manage user roles and permissions (verified in RLS policies)
- [x] Configure RLS policies (verified in migrations)
- [x] View all analytics (verified in RLS policies)
- [x] Manage database schema (verified in migrations)

## 🎮 Session History System

As a game participant, I want to:

### State Changes

- [x] See my moves recorded with timestamps
- [x] Track version history of the board
- [x] View state changes in real-time
- [x] Receive notifications of other players' moves

### Win Conditions

- [x] Have win conditions automatically detected
- [x] See winning moves highlighted
- [x] Get notifications when game is won
- [x] View game completion statistics

### Player Actions

- [x] See a log of all player actions
- [x] Track metadata for each move
- [x] View player-specific statistics
- [x] Access historical game data

### Session Management

- [x] Have sessions properly completed
- [x] See final game state preserved
- [x] Access session replay functionality
- [x] Export session data

### Data Synchronization

- [x] Have moves synchronized across players
- [x] Handle concurrent updates properly
- [x] Resolve conflicts automatically
- [x] Maintain consistent game state

### Testing Requirements

- [x] Unit tests for state changes
- [x] Integration tests for win conditions
- [x] Performance tests for synchronization
- [x] End-to-end session tests
