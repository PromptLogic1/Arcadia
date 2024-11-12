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

## 🧪 Unit Tests Required

### Session Management Tests
- [x] Concurrent Join Requests:
  - [x] Test queue system for multiple simultaneous joins
  - [x] Verify FIFO processing of join requests
  - [x] Test color conflict resolution
  - [x] Test team assignment balancing

### State Synchronization Tests
- [x] Real-time Updates:
  - [x] Test WebSocket connection handling
  - [x] Verify state merge conflicts resolution
  - [x] Test optimistic updates rollback
  - [x] Verify version control system

### Session History Tests
- [x] State Change Tracking:
  - [x] Test state change recording
  - [x] Verify action logging
  - [x] Test win condition detection
  - [x] Verify session completion handling

### Player Activity Tests
- [x] Connection Management:
  - [x] Test player connection tracking
  - [x] Verify disconnection handling
  - [x] Test reconnection process
  - [x] Verify last_active timestamp updates

### Database Constraint Tests
- [ ] Foreign Key Tests:
  - [ ] Test cascade deletions
  - [ ] Verify referential integrity
  - [ ] Test orphaned record prevention

- [ ] Unique Constraint Tests:
  - [x] Test duplicate player prevention
  - [x] Verify color uniqueness per session
  - [x] Test team number validation

### RLS Policy Tests
- [ ] Session Access Tests:
  - [ ] Test view permissions for different roles
  - [ ] Verify update permission restrictions
  - [ ] Test delete permission boundaries

- [ ] Player Management Tests:
  - [x] Test join session policy enforcement
  - [x] Verify player info update restrictions
  - [x] Test leave session permission checks

### Error Handling Tests
- [x] Session Error Tests:
  - [x] Test invalid state handling
  - [x] Verify concurrent access error handling
  - [x] Test permission violation responses

- [x] Player Error Tests:
  - [x] Test invalid data validation
  - [x] Verify duplicate registration handling
  - [x] Test team conflict resolution

### Integration Tests
- [ ] End-to-End Flow Tests:
  - [ ] Test complete session lifecycle
  - [ ] Verify player journey scenarios
  - [ ] Test multi-player interactions

### Performance Tests
- [x] Load Testing:
  - [x] Test concurrent session handling
  - [x] Verify real-time update performance
  - [x] Test queue system under load

### Security Tests
- [ ] Authentication Tests:
  - [ ] Test token validation
  - [ ] Verify permission checks
  - [ ] Test role-based access

- [ ] Data Protection Tests:
  - [ ] Test data isolation between sessions
  - [ ] Verify secure state updates
  - [ ] Test private data access controls