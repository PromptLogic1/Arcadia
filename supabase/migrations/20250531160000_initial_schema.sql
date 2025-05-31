-- =============================================================================
-- ARCADIA INITIAL DATABASE SCHEMA
-- Created: 2025-05-31
-- Description: Complete database schema for the Arcadia gaming platform
-- =============================================================================

-- Create required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS - Define all database enums
-- =============================================================================

CREATE TYPE activity_type AS ENUM (
    'login',
    'logout',
    'board_create',
    'board_join',
    'board_complete',
    'submission_create',
    'discussion_create',
    'comment_create',
    'achievement_unlock'
);

CREATE TYPE board_status AS ENUM (
    'draft',
    'active',
    'paused',
    'completed',
    'archived'
);

CREATE TYPE challenge_status AS ENUM (
    'draft',
    'published',
    'archived'
);

CREATE TYPE difficulty_level AS ENUM (
    'beginner',
    'easy',
    'medium',
    'hard',
    'expert'
);

CREATE TYPE game_category AS ENUM (
    'All Games',
    'World of Warcraft',
    'Fortnite',
    'Minecraft',
    'Among Us',
    'Apex Legends',
    'League of Legends',
    'Overwatch',
    'Call of Duty: Warzone',
    'Valorant',
    'CS:GO',
    'Dota 2',
    'Rocket League',
    'Fall Guys',
    'Dead by Daylight',
    'Cyberpunk 2077',
    'The Witcher 3',
    'Elden Ring',
    'Dark Souls',
    'Bloodborne',
    'Sekiro',
    'Hollow Knight',
    'Celeste',
    'Hades',
    'The Binding of Isaac',
    'Risk of Rain 2',
    'Deep Rock Galactic',
    'Valheim',
    'Subnautica',
    'No Man''s Sky',
    'Terraria',
    'Stardew Valley',
    'Animal Crossing',
    'Splatoon 3',
    'Super Mario Odyssey',
    'The Legend of Zelda: Breath of the Wild',
    'Super Smash Bros. Ultimate'
);

CREATE TYPE queue_status AS ENUM (
    'waiting',
    'matched',
    'cancelled'
);

CREATE TYPE session_status AS ENUM (
    'waiting',
    'active',
    'paused',
    'completed',
    'cancelled'
);

CREATE TYPE submission_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);

CREATE TYPE tag_action AS ENUM (
    'created',
    'updated',
    'deleted',
    'voted',
    'reported'
);

CREATE TYPE tag_status AS ENUM (
    'active',
    'pending',
    'rejected',
    'archived'
);

CREATE TYPE tag_type AS ENUM (
    'category',
    'difficulty',
    'theme',
    'mechanic',
    'custom'
);

CREATE TYPE user_role AS ENUM (
    'user',
    'premium',
    'moderator',
    'admin'
);

CREATE TYPE visibility_type AS ENUM (
    'public',
    'friends',
    'private'
);

CREATE TYPE vote_type AS ENUM (
    'up',
    'down'
);

-- =============================================================================
-- COMPOSITE TYPES - Define composite types for complex data structures
-- =============================================================================

CREATE TYPE board_cell AS (
    text TEXT,
    position_row INTEGER,
    position_col INTEGER,
    tags TEXT[]
);

CREATE TYPE win_conditions AS (
    single_line BOOLEAN,
    full_board BOOLEAN,
    pattern BOOLEAN,
    custom_pattern JSONB
);

CREATE TYPE board_settings AS (
    timer_enabled BOOLEAN,
    timer_duration INTEGER,
    win_conditions win_conditions,
    visibility visibility_type,
    allow_guests BOOLEAN,
    max_players INTEGER
);

CREATE TYPE session_settings AS (
    auto_start BOOLEAN,
    allow_spectators BOOLEAN,
    min_players INTEGER,
    max_players INTEGER,
    time_limit INTEGER
);

CREATE TYPE tag_category AS (
    name TEXT,
    description TEXT,
    color TEXT
);

-- =============================================================================
-- USERS TABLE - Core user management
-- =============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    experience_points INTEGER DEFAULT 0,
    land TEXT,
    region TEXT,
    city TEXT,
    bio TEXT,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    achievements_visibility visibility_type DEFAULT 'public',
    auth_id TEXT UNIQUE,
    profile_visibility visibility_type DEFAULT 'public',
    submissions_visibility visibility_type DEFAULT 'public'
);

-- =============================================================================
-- BINGO BOARDS - Core game content
-- =============================================================================

CREATE TABLE bingo_boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    size INTEGER DEFAULT 5 CHECK (size BETWEEN 3 AND 10),
    settings board_settings,
    game_type game_category NOT NULL,
    difficulty difficulty_level NOT NULL,
    is_public BOOLEAN DEFAULT false,
    board_state board_cell[],
    status board_status DEFAULT 'draft',
    votes INTEGER DEFAULT 0,
    bookmarked_count INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    cloned_from UUID REFERENCES bingo_boards(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- BINGO CARDS - Individual bingo cells/tasks
-- =============================================================================

CREATE TABLE bingo_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_type game_category NOT NULL,
    difficulty difficulty_level NOT NULL,
    tags TEXT[],
    is_public BOOLEAN DEFAULT false,
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- BINGO SESSIONS - Multiplayer game sessions
-- =============================================================================

CREATE TABLE bingo_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES bingo_boards(id) ON DELETE CASCADE,
    host_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_code TEXT UNIQUE NOT NULL,
    settings session_settings,
    status session_status DEFAULT 'waiting',
    max_players INTEGER DEFAULT 50,
    current_players INTEGER DEFAULT 0,
    winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- BINGO SESSION PLAYERS - Players in a session
-- =============================================================================

CREATE TABLE bingo_session_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES bingo_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    is_ready BOOLEAN DEFAULT false,
    is_host BOOLEAN DEFAULT false,
    score INTEGER DEFAULT 0,
    position INTEGER,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE(session_id, user_id)
);

-- =============================================================================
-- BINGO SESSION QUEUE - Matchmaking queue
-- =============================================================================

CREATE TABLE bingo_session_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_type game_category NOT NULL,
    difficulty difficulty_level NOT NULL,
    max_players INTEGER DEFAULT 50,
    status queue_status DEFAULT 'waiting',
    priority INTEGER DEFAULT 0,
    estimated_wait_time INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- BINGO SESSION EVENTS - Game events during sessions
-- =============================================================================

CREATE TABLE bingo_session_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES bingo_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB,
    cell_position INTEGER,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- BINGO SESSION CELLS - Individual cell states in sessions
-- =============================================================================

CREATE TABLE bingo_session_cells (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES bingo_sessions(id) ON DELETE CASCADE,
    cell_position INTEGER NOT NULL,
    card_id UUID REFERENCES bingo_cards(id) ON DELETE SET NULL,
    marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    marked_at TIMESTAMPTZ,
    verified BOOLEAN DEFAULT false,
    verification_data JSONB,
    UNIQUE(session_id, cell_position)
);

-- =============================================================================
-- USER SESSIONS - Authentication sessions
-- =============================================================================

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

-- =============================================================================
-- USER FRIENDS - Friend relationships
-- =============================================================================

CREATE TABLE user_friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, friend_id),
    CHECK (user_id != friend_id)
);

-- =============================================================================
-- USER ACHIEVEMENTS - Achievement system
-- =============================================================================

CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_name TEXT NOT NULL,
    achievement_data JSONB,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_name)
);

-- =============================================================================
-- USER ACTIVITY - Activity logging
-- =============================================================================

CREATE TABLE user_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type activity_type NOT NULL,
    activity_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- DISCUSSIONS - Community discussions
-- =============================================================================

CREATE TABLE discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_type game_category,
    challenge_type TEXT,
    tags TEXT[],
    upvotes INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- COMMENTS - Discussion comments
-- =============================================================================

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TAGS - Tagging system
-- =============================================================================

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    type tag_type DEFAULT 'custom',
    category tag_category,
    color TEXT,
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    usage_count INTEGER DEFAULT 0,
    status tag_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TAG VOTES - Tag voting system
-- =============================================================================

CREATE TABLE tag_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vote_type vote_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tag_id, user_id)
);

-- =============================================================================
-- TAG REPORTS - Tag reporting system
-- =============================================================================

CREATE TABLE tag_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('pending', 'resolved', 'dismissed')) DEFAULT 'pending',
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TAG HISTORY - Tag change history
-- =============================================================================

CREATE TABLE tag_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action tag_action NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CATEGORIES - Game categories
-- =============================================================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    color TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CHALLENGES - Challenge system
-- =============================================================================

CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    difficulty difficulty_level NOT NULL,
    status challenge_status DEFAULT 'draft',
    requirements JSONB,
    rewards JSONB,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    participant_count INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CHALLENGE TAGS - Challenge tagging
-- =============================================================================

CREATE TABLE challenge_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(challenge_id, tag_id)
);

-- =============================================================================
-- SUBMISSIONS - User submissions
-- =============================================================================

CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES bingo_boards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    media_urls TEXT[],
    status submission_status DEFAULT 'pending',
    moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    feedback TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- BOARD BOOKMARKS - Board bookmarking
-- =============================================================================

CREATE TABLE board_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES bingo_boards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(board_id, user_id)
);

-- =============================================================================
-- BOARD VOTES - Board voting
-- =============================================================================

CREATE TABLE board_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES bingo_boards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vote_type vote_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(board_id, user_id)
);

-- =============================================================================
-- CARD VOTES - Card voting
-- =============================================================================

CREATE TABLE card_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID REFERENCES bingo_cards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vote_type vote_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(card_id, user_id)
);

-- =============================================================================
-- INDEXES - Performance optimization
-- =============================================================================

-- Users indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Bingo boards indexes
CREATE INDEX idx_bingo_boards_creator_id ON bingo_boards(creator_id);
CREATE INDEX idx_bingo_boards_game_type ON bingo_boards(game_type);
CREATE INDEX idx_bingo_boards_difficulty ON bingo_boards(difficulty);
CREATE INDEX idx_bingo_boards_is_public ON bingo_boards(is_public);
CREATE INDEX idx_bingo_boards_status ON bingo_boards(status);
CREATE INDEX idx_bingo_boards_created_at ON bingo_boards(created_at);
CREATE INDEX idx_bingo_boards_votes ON bingo_boards(votes DESC);

-- Bingo cards indexes
CREATE INDEX idx_bingo_cards_creator_id ON bingo_cards(creator_id);
CREATE INDEX idx_bingo_cards_game_type ON bingo_cards(game_type);
CREATE INDEX idx_bingo_cards_difficulty ON bingo_cards(difficulty);
CREATE INDEX idx_bingo_cards_is_public ON bingo_cards(is_public);
CREATE INDEX idx_bingo_cards_tags ON bingo_cards USING GIN(tags);
CREATE INDEX idx_bingo_cards_votes ON bingo_cards(votes DESC);

-- Bingo sessions indexes
CREATE INDEX idx_bingo_sessions_board_id ON bingo_sessions(board_id);
CREATE INDEX idx_bingo_sessions_host_id ON bingo_sessions(host_id);
CREATE INDEX idx_bingo_sessions_session_code ON bingo_sessions(session_code);
CREATE INDEX idx_bingo_sessions_status ON bingo_sessions(status);
CREATE INDEX idx_bingo_sessions_created_at ON bingo_sessions(created_at);

-- Session players indexes
CREATE INDEX idx_session_players_session_id ON bingo_session_players(session_id);
CREATE INDEX idx_session_players_user_id ON bingo_session_players(user_id);

-- Session queue indexes
CREATE INDEX idx_session_queue_user_id ON bingo_session_queue(user_id);
CREATE INDEX idx_session_queue_status ON bingo_session_queue(status);
CREATE INDEX idx_session_queue_game_type ON bingo_session_queue(game_type);
CREATE INDEX idx_session_queue_created_at ON bingo_session_queue(created_at);

-- Discussions indexes
CREATE INDEX idx_discussions_author_id ON discussions(author_id);
CREATE INDEX idx_discussions_game_type ON discussions(game_type);
CREATE INDEX idx_discussions_tags ON discussions USING GIN(tags);
CREATE INDEX idx_discussions_created_at ON discussions(created_at DESC);
CREATE INDEX idx_discussions_upvotes ON discussions(upvotes DESC);

-- Comments indexes
CREATE INDEX idx_comments_discussion_id ON comments(discussion_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- Tags indexes
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_type ON tags(type);
CREATE INDEX idx_tags_status ON tags(status);
CREATE INDEX idx_tags_usage_count ON tags(usage_count DESC);

-- Activity indexes
CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_type ON user_activity(activity_type);
CREATE INDEX idx_user_activity_created_at ON user_activity(created_at DESC);

-- =============================================================================
-- TRIGGERS - Automatic updates and business logic
-- =============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bingo_boards_updated_at BEFORE UPDATE ON bingo_boards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bingo_cards_updated_at BEFORE UPDATE ON bingo_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bingo_sessions_updated_at BEFORE UPDATE ON bingo_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON discussions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON challenges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_session_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_session_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_votes ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Public profiles are viewable by everyone" ON users FOR SELECT USING (profile_visibility = 'public' OR auth_id = auth.uid());
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth_id = auth.uid());

-- Bingo boards policies
CREATE POLICY "Public boards are viewable by everyone" ON bingo_boards FOR SELECT USING (is_public = true OR creator_id = auth.uid()::uuid);
CREATE POLICY "Users can create boards" ON bingo_boards FOR INSERT WITH CHECK (creator_id = auth.uid()::uuid);
CREATE POLICY "Users can update their own boards" ON bingo_boards FOR UPDATE USING (creator_id = auth.uid()::uuid);
CREATE POLICY "Users can delete their own boards" ON bingo_boards FOR DELETE USING (creator_id = auth.uid()::uuid);

-- Bingo cards policies
CREATE POLICY "Public cards are viewable by everyone" ON bingo_cards FOR SELECT USING (is_public = true OR creator_id = auth.uid()::uuid);
CREATE POLICY "Users can create cards" ON bingo_cards FOR INSERT WITH CHECK (creator_id = auth.uid()::uuid);
CREATE POLICY "Users can update their own cards" ON bingo_cards FOR UPDATE USING (creator_id = auth.uid()::uuid);
CREATE POLICY "Users can delete their own cards" ON bingo_cards FOR DELETE USING (creator_id = auth.uid()::uuid);

-- Discussions policies
CREATE POLICY "Discussions are viewable by everyone" ON discussions FOR SELECT USING (true);
CREATE POLICY "Users can create discussions" ON discussions FOR INSERT WITH CHECK (author_id = auth.uid()::uuid);
CREATE POLICY "Users can update their own discussions" ON discussions FOR UPDATE USING (author_id = auth.uid()::uuid);

-- Comments policies
CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (author_id = auth.uid()::uuid);
CREATE POLICY "Users can update their own comments" ON comments FOR UPDATE USING (author_id = auth.uid()::uuid);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to add comments to discussions
CREATE OR REPLACE FUNCTION add_comment(
    p_discussion_id UUID,
    p_content TEXT,
    p_author_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    comment_id UUID;
BEGIN
    INSERT INTO comments (discussion_id, content, author_id)
    VALUES (p_discussion_id, p_content, p_author_id)
    RETURNING id INTO comment_id;
    
    RETURN comment_id;
END;
$$;

-- Function to increment discussion upvotes
CREATE OR REPLACE FUNCTION increment_discussion_upvotes(discussion_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
    UPDATE discussions 
    SET upvotes = upvotes + 1 
    WHERE id = discussion_id;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM users 
        WHERE auth_id = auth.uid() 
        AND role = 'admin'
    );
$$;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_activity_type activity_type,
    p_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO user_activity (user_id, activity_type, activity_data)
    VALUES (p_user_id, p_activity_type, p_data)
    RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$;

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- Insert default categories
INSERT INTO categories (name, description, sort_order) VALUES
('All Games', 'General gaming category for all games', 0),
('Action', 'Fast-paced action games', 10),
('Adventure', 'Exploration and story-driven games', 20),
('RPG', 'Role-playing games', 30),
('Strategy', 'Strategic thinking games', 40),
('Simulation', 'Life and world simulation games', 50),
('Sports', 'Sports and racing games', 60),
('Puzzle', 'Brain teasers and puzzle games', 70),
('Indie', 'Independent developer games', 80),
('Retro', 'Classic and retro games', 90);

-- Insert default tags
INSERT INTO tags (name, description, type, status) VALUES
('beginnerFriendly', 'Suitable for new players', 'difficulty', 'active'),
('speedrun', 'Can be completed quickly', 'mechanic', 'active'),
('collectible', 'Involves collecting items', 'mechanic', 'active'),
('combat', 'Involves fighting mechanics', 'mechanic', 'active'),
('exploration', 'Involves exploring the world', 'mechanic', 'active'),
('story', 'Story-focused content', 'theme', 'active'),
('multiplayer', 'Multiplayer content', 'category', 'active'),
('solo', 'Single player content', 'category', 'active'),
('endgame', 'Late game content', 'difficulty', 'active'),
('achievement', 'Achievement hunting', 'mechanic', 'active');

-- =============================================================================
-- VIEWS - Useful data views
-- =============================================================================

-- View for public board listings
CREATE VIEW public_boards AS
SELECT 
    b.*,
    u.username as creator_username,
    u.avatar_url as creator_avatar,
    COUNT(bb.id) as bookmark_count
FROM bingo_boards b
LEFT JOIN users u ON b.creator_id = u.id
LEFT JOIN board_bookmarks bb ON b.id = bb.board_id
WHERE b.is_public = true AND b.status = 'active'
GROUP BY b.id, u.username, u.avatar_url;

-- View for session statistics
CREATE VIEW session_stats AS
SELECT 
    s.*,
    b.title as board_title,
    h.username as host_username,
    COUNT(sp.id) as current_player_count
FROM bingo_sessions s
LEFT JOIN bingo_boards b ON s.board_id = b.id
LEFT JOIN users h ON s.host_id = h.id
LEFT JOIN bingo_session_players sp ON s.id = sp.session_id AND sp.left_at IS NULL
GROUP BY s.id, b.title, h.username;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Log migration completion
INSERT INTO user_activity (user_id, activity_type, activity_data, created_at)
SELECT 
    id,
    'login',
    '{"migration": "initial_schema", "version": "1.0.0"}'::jsonb,
    NOW()
FROM users 
WHERE role = 'admin' 
LIMIT 1;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================