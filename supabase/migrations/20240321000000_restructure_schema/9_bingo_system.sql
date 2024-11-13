-- First, drop existing tables and types if they exist
DROP TABLE IF EXISTS bingo_session_players CASCADE;
DROP TABLE IF EXISTS bingo_sessions CASCADE;
DROP TABLE IF EXISTS bingo_boards CASCADE;
DROP TYPE IF EXISTS game_status;

-- Create game status enum
CREATE TYPE game_status AS ENUM ('active', 'completed', 'cancelled');

-- Create the bingo boards table
CREATE TABLE bingo_boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    creator_id UUID NOT NULL REFERENCES users(id),
    size INTEGER NOT NULL CHECK (size BETWEEN 3 AND 6),
    board_state JSONB NOT NULL DEFAULT '[]',
    settings JSONB NOT NULL DEFAULT '{
        "teamMode": false,
        "lockout": false,
        "soundEnabled": true,
        "timeLimit": 0,
        "winConditions": {
            "line": true,
            "majority": false
        }
    }',
    game_type game_category NOT NULL,
    difficulty challenge_difficulty DEFAULT 'medium' NOT NULL,
    is_public BOOLEAN DEFAULT false NOT NULL,
    cloned_from UUID REFERENCES bingo_boards(id),
    votes INTEGER DEFAULT 0 NOT NULL,
    bookmarked_count INTEGER DEFAULT 0 NOT NULL,
    status challenge_status DEFAULT 'draft' NOT NULL,
    CONSTRAINT title_length CHECK (char_length(title) BETWEEN 3 AND 50)
) INHERITS (base_table);

-- Create the sessions table with additional columns
CREATE TABLE bingo_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES bingo_boards(id) ON DELETE CASCADE,
    status game_status DEFAULT 'active' NOT NULL,
    current_state JSONB NOT NULL,
    winner_id UUID REFERENCES users(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    current_player INTEGER DEFAULT 1 NOT NULL,
    version INTEGER DEFAULT 0 NOT NULL,
    last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT valid_version CHECK (version >= 0),
    CONSTRAINT valid_current_player CHECK (current_player >= 1)
) INHERITS (base_table);

-- Create the session players table
CREATE TABLE bingo_session_players (
    session_id UUID NOT NULL REFERENCES bingo_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    player_name TEXT NOT NULL,
    color TEXT NOT NULL,
    team INTEGER,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    PRIMARY KEY (session_id, user_id)
) INHERITS (base_table);

-- Add RLS Policies
ALTER TABLE bingo_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_session_players ENABLE ROW LEVEL SECURITY;

-- Add statistics tracking
CREATE TRIGGER update_bingo_board_statistics
    AFTER INSERT OR DELETE ON bingo_boards
    FOR EACH ROW
    EXECUTE FUNCTION update_bingo_statistics();

-- Add indices
CREATE INDEX idx_bingo_boards_creator ON bingo_boards(creator_id);
CREATE INDEX idx_bingo_boards_game ON bingo_boards(game_type);
CREATE INDEX idx_bingo_boards_status ON bingo_boards(status);
CREATE INDEX idx_bingo_sessions_board ON bingo_sessions(board_id);
CREATE INDEX idx_bingo_sessions_status ON bingo_sessions(status);
CREATE INDEX idx_bingo_session_players_session ON bingo_session_players(session_id);

-- Board Access Policies
ALTER TABLE bingo_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public boards are viewable by everyone"
  ON bingo_boards FOR SELECT
  USING (is_public = true);

CREATE POLICY "Private boards are only viewable by creator"
  ON bingo_boards FOR SELECT
  USING (creator_id = auth.uid() OR is_public = true);

-- Session Management Policies
ALTER TABLE bingo_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions can be updated by creator only"
  ON bingo_sessions FOR UPDATE
  USING (board_id IN (
    SELECT id FROM bingo_boards WHERE creator_id = auth.uid()
  ));

CREATE POLICY "Sessions can be viewed by participants"
  ON bingo_sessions FOR SELECT
  USING (id IN (
    SELECT session_id FROM bingo_session_players WHERE user_id = auth.uid()
  ));

-- Player Management Policies
ALTER TABLE bingo_session_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can only update their own info"
  ON bingo_session_players FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Players can only join active sessions with space"
  ON bingo_session_players FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bingo_sessions s
      WHERE s.id = session_id 
      AND s.status = 'active'
      AND (
        SELECT COUNT(*) FROM bingo_session_players 
        WHERE session_id = s.id
      ) < 8
    )
  );
  