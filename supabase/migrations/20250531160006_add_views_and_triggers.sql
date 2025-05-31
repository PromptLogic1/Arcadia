-- =============================================================================
-- ADD VIEWS AND TRIGGERS
-- Add missing views, enhanced triggers, and additional functionality
-- =============================================================================

-- =============================================================================
-- VIEWS - Useful data views
-- =============================================================================

-- View for public board listings
CREATE OR REPLACE VIEW public_boards AS
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
CREATE OR REPLACE VIEW session_stats AS
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
-- TRIGGERS - Add missing updated_at triggers
-- =============================================================================

-- Updated_at trigger function (may already exist, create if not)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to tables that might be missing them
DO $$ 
BEGIN
    -- Check and create triggers only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bingo_session_queue_updated_at') THEN
        CREATE TRIGGER update_bingo_session_queue_updated_at 
        BEFORE UPDATE ON bingo_session_queue 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_friends_updated_at') THEN
        CREATE TRIGGER update_user_friends_updated_at 
        BEFORE UPDATE ON user_friends 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =============================================================================
-- ENHANCED INDEXES
-- =============================================================================

-- Add any missing indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bingo_boards_votes_desc ON bingo_boards(votes DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bingo_cards_votes_desc ON bingo_cards(votes DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_discussions_created_at_desc ON discussions(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_discussions_upvotes_desc ON discussions(upvotes DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_created_at_desc ON user_activity(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tags_usage_count_desc ON tags(usage_count DESC);

-- =============================================================================
-- ENHANCED RLS POLICIES
-- =============================================================================

-- Add any missing RLS policies for better security
DO $$
BEGIN
    -- Session queue policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bingo_session_queue' AND policyname = 'Users can view their own queue entries') THEN
        CREATE POLICY "Users can view their own queue entries" 
        ON bingo_session_queue FOR SELECT 
        USING (user_id = auth.uid()::uuid);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bingo_session_queue' AND policyname = 'Users can create queue entries') THEN
        CREATE POLICY "Users can create queue entries" 
        ON bingo_session_queue FOR INSERT 
        WITH CHECK (user_id = auth.uid()::uuid);
    END IF;
    
    -- Session events policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bingo_session_events' AND policyname = 'Session events are viewable by session participants') THEN
        CREATE POLICY "Session events are viewable by session participants" 
        ON bingo_session_events FOR SELECT 
        USING (
            session_id IN (
                SELECT session_id FROM bingo_session_players 
                WHERE user_id = auth.uid()::uuid
            )
        );
    END IF;
    
    -- Tags policies enhancement
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Active tags are viewable by everyone') THEN
        CREATE POLICY "Active tags are viewable by everyone" 
        ON tags FOR SELECT 
        USING (status = 'active' OR status = 'verified');
    END IF;
    
END $$;