-- Performance optimization indexes
-- These indexes improve query performance for common access patterns

-- Bingo Sessions indexes
CREATE INDEX IF NOT EXISTS idx_bingo_sessions_board_status 
ON bingo_sessions(board_id, status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bingo_sessions_created_at 
ON bingo_sessions(created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bingo_sessions_host_id 
ON bingo_sessions(host_id) 
WHERE deleted_at IS NULL;

-- Bingo Session Players indexes
CREATE INDEX IF NOT EXISTS idx_session_players_session_id 
ON bingo_session_players(session_id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_session_players_user_id 
ON bingo_session_players(user_id) 
WHERE deleted_at IS NULL;

-- Bingo Boards indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bingo_boards_created_by_status 
ON bingo_boards(created_by, status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bingo_boards_is_public 
ON bingo_boards(is_public, status) 
WHERE deleted_at IS NULL AND is_public = true;

-- Community discussions indexes
CREATE INDEX IF NOT EXISTS idx_discussions_game_type 
ON community_discussions(game_type, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_discussions_author_id 
ON community_discussions(author_id) 
WHERE deleted_at IS NULL;

-- Queue entries for faster matchmaking
CREATE INDEX IF NOT EXISTS idx_queue_entries_game_type_status 
ON bingo_queue_entries(game_type, status, created_at) 
WHERE status = 'waiting';

-- User profiles for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username 
ON users(username) 
WHERE deleted_at IS NULL;

-- Composite indexes for JOIN operations
CREATE INDEX IF NOT EXISTS idx_session_players_composite 
ON bingo_session_players(session_id, user_id, team) 
WHERE deleted_at IS NULL;

-- Add analyze to update statistics
ANALYZE bingo_sessions;
ANALYZE bingo_session_players;
ANALYZE bingo_boards;
ANALYZE community_discussions;
ANALYZE bingo_queue_entries;
ANALYZE users;