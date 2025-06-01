# 🗄️ Database Schema Documentation

_Complete reference for the Arcadia Gaming Platform database structure_

## 📊 **Overview**

The database consists of **25 tables** organized into logical domains:

- **Core**: Users, authentication, profiles
- **Gaming**: Boards, cards, sessions, players
- **Social**: Discussions, comments, votes
- **Content**: Categories, tags, challenges

## 🔐 **Core Tables**

### **users**

Central user authentication and profile table.

```sql
- id: UUID (primary key)
- email: TEXT (unique)
- username: TEXT (unique)
- full_name: TEXT
- bio: TEXT
- avatar_url: TEXT
- role: user_role
- privacy_settings: JSONB
- notification_preferences: JSONB
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### **user_profiles**

Extended user information and statistics.

```sql
- user_id: UUID (foreign key → users)
- total_games_played: INTEGER
- total_wins: INTEGER
- favorite_categories: TEXT[]
- achievements: JSONB
- social_links: JSONB
```

## 🎮 **Gaming Tables**

### **bingo_boards**

Master table for all bingo board templates.

```sql
- id: UUID (primary key)
- title: TEXT
- description: TEXT
- creator_id: UUID (foreign key → users)
- size: board_size (3x3, 4x4, 5x5)
- difficulty: difficulty_level
- visibility: visibility_type
- status: board_status
- board_state: JSONB (cell configuration)
- tags: TEXT[]
- play_count: INTEGER
- avg_rating: NUMERIC
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### **bingo_cards**

Individual challenge cards that can be used in boards.

```sql
- id: UUID (primary key)
- title: TEXT
- content: TEXT
- creator_id: UUID (foreign key → users)
- difficulty: difficulty_level
- category: TEXT
- tags: TEXT[]
- estimated_time: INTEGER
- requirements: TEXT
```

### **bingo_sessions**

Active game sessions for multiplayer play.

```sql
- id: UUID (primary key)
- board_id: UUID (foreign key → bingo_boards)
- host_id: UUID (foreign key → users)
- session_code: TEXT (unique, auto-generated)
- current_state: JSONB (real-time board state)
- version: INTEGER (optimistic locking)
- status: session_status
- settings: session_settings
- started_at: TIMESTAMPTZ
- completed_at: TIMESTAMPTZ
```

### **bingo_session_players**

Players participating in sessions.

```sql
- id: UUID (primary key)
- session_id: UUID (foreign key → bingo_sessions)
- user_id: UUID (foreign key → users)
- display_name: TEXT
- avatar_url: TEXT
- color: TEXT
- team: INTEGER
- is_ready: BOOLEAN
- is_host: BOOLEAN
- score: INTEGER
- position: INTEGER
- joined_at: TIMESTAMPTZ
- left_at: TIMESTAMPTZ
```

### **bingo_session_events**

Event log for game actions and history.

```sql
- id: UUID (primary key)
- session_id: UUID (foreign key → bingo_sessions)
- user_id: UUID (foreign key → users)
- event_type: TEXT
- event_data: JSONB
- cell_position: INTEGER
- timestamp: BIGINT
```

### **bingo_queue_entries**

Queue system for finding games.

```sql
- id: UUID (primary key)
- board_id: UUID (foreign key → bingo_boards)
- user_id: UUID (foreign key → users)
- preferences: JSONB
- status: queue_status
- matched_session_id: UUID
- created_at: TIMESTAMPTZ
- matched_at: TIMESTAMPTZ
```

## 💬 **Social Tables**

### **discussions**

Community discussion threads.

```sql
- id: UUID (primary key)
- title: TEXT
- content: TEXT
- author_id: UUID (foreign key → users)
- game_type: game_category
- challenge_type: TEXT
- tags: TEXT[]
- upvotes: INTEGER
- view_count: INTEGER
- is_pinned: BOOLEAN
- is_locked: BOOLEAN
```

### **comments**

Comments on discussions.

```sql
- id: UUID (primary key)
- discussion_id: UUID (foreign key → discussions)
- author_id: UUID (foreign key → users)
- content: TEXT
- parent_id: UUID (self-reference)
- upvotes: INTEGER
```

### **board_votes**

Voting system for boards.

```sql
- id: UUID (primary key)
- board_id: UUID (foreign key → bingo_boards)
- user_id: UUID (foreign key → users)
- vote_type: vote_type (upvote/downvote)
```

## 🏷️ **Content Management**

### **categories**

Game categories for organization.

```sql
- id: UUID (primary key)
- name: TEXT (unique)
- description: TEXT
- icon_url: TEXT
- color: TEXT
- sort_order: INTEGER
- is_active: BOOLEAN
```

### **tags**

Flexible tagging system.

```sql
- id: UUID (primary key)
- name: TEXT (unique)
- category: tag_category
- usage_count: INTEGER
- is_approved: BOOLEAN
- created_by: UUID
```

### **challenges**

Special challenge events.

```sql
- id: UUID (primary key)
- title: TEXT
- description: TEXT
- creator_id: UUID
- category_id: UUID
- difficulty: difficulty_level
- status: challenge_status
- requirements: JSONB
- rewards: JSONB
- start_date: TIMESTAMPTZ
- end_date: TIMESTAMPTZ
```

## 🔑 **Enums**

### **user_role**

- `user`, `moderator`, `admin`

### **board_size**

- `3x3`, `4x4`, `5x5`

### **difficulty_level**

- `easy`, `medium`, `hard`, `expert`

### **visibility_type**

- `public`, `private`, `unlisted`, `friends_only`

### **board_status**

- `draft`, `active`, `archived`

### **session_status**

- `waiting`, `active`, `completed`, `cancelled`

### **queue_status**

- `waiting`, `matched`, `cancelled`, `expired`

### **vote_type**

- `upvote`, `downvote`

### **game_category**

- 37+ categories including:
  - `world_of_warcraft`, `minecraft`, `fortnite`
  - `league_of_legends`, `valorant`, `apex_legends`
  - `pokemon`, `zelda`, `mario`
  - And many more...

## 🛡️ **Security**

### **Row Level Security (RLS)**

All tables have RLS policies for:

- Read access based on visibility
- Write access for owners
- Moderation capabilities

### **Indexes**

Performance indexes on:

- Foreign keys
- Frequently queried fields
- Search fields (tags, titles)
- Timestamp fields

### **Triggers**

- Auto-generate session codes
- Update timestamps
- Increment version numbers
- Cascade deletions

## 📈 **Views**

### **active_sessions_view**

Combined view of sessions with player counts and board info.

### **popular_boards_view**

Boards ranked by play count and ratings.

### **user_stats_view**

Aggregated user statistics and achievements.

## 🔄 **Real-time**

Tables enabled for real-time subscriptions:

- `bingo_sessions` - Game state updates
- `bingo_session_players` - Player joins/leaves
- `bingo_session_events` - Game events
- `discussions` - New posts
- `comments` - New comments

## 📝 **Migration History**

1. `20250531160000_initial_schema.sql` - Base tables
2. `20250531160001_expand_game_categories.sql` - More games
3. `20250531160002_update_queue_status_enum.sql` - Queue states
4. `20250531160003_add_gaming_categories.sql` - 37+ categories
5. `20250531160004_enhance_tag_system.sql` - Tag features
6. `20250531160005_update_tag_actions.sql` - Tag moderation
7. `20250531160006_add_views_and_triggers.sql` - Performance
8. `20250531160009_phase1_minimal_schema_fix.sql` - Session fixes
9. `20250531170000_add_current_state_to_sessions.sql` - Real-time state
