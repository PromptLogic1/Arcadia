-- =============================================================================
-- SCORING SYSTEM - Game Results and Leaderboards
-- Enables tracking of player performance and achievements
-- =============================================================================

-- Create game_results table for tracking individual game performance
CREATE TABLE IF NOT EXISTS game_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES bingo_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    final_score INTEGER NOT NULL DEFAULT 0,
    patterns_achieved JSONB DEFAULT '[]'::jsonb,
    time_to_win INTEGER, -- Seconds to complete
    placement INTEGER DEFAULT 1, -- 1st, 2nd, 3rd, etc.
    mistake_count INTEGER DEFAULT 0, -- Number of cell unmarks
    bonus_points INTEGER DEFAULT 0, -- Speed/perfection bonuses
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_placement CHECK (placement > 0),
    CONSTRAINT valid_score CHECK (final_score >= 0),
    CONSTRAINT valid_time CHECK (time_to_win IS NULL OR time_to_win >= 0)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_results_user_score ON game_results(user_id, final_score DESC);
CREATE INDEX IF NOT EXISTS idx_game_results_session ON game_results(session_id);
CREATE INDEX IF NOT EXISTS idx_game_results_created ON game_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_results_placement ON game_results(placement, final_score DESC);

-- Create user_statistics table for aggregated stats
CREATE TABLE IF NOT EXISTS user_statistics (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Game counts
    total_games INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_completed INTEGER DEFAULT 0,
    
    -- Scoring
    total_score INTEGER DEFAULT 0,
    highest_score INTEGER DEFAULT 0,
    average_score NUMERIC(10,2) DEFAULT 0,
    
    -- Performance
    fastest_win INTEGER, -- Seconds
    total_playtime INTEGER DEFAULT 0, -- Total seconds played
    
    -- Patterns
    patterns_completed JSONB DEFAULT '{}'::jsonb,
    favorite_pattern TEXT,
    
    -- Streaks
    current_win_streak INTEGER DEFAULT 0,
    longest_win_streak INTEGER DEFAULT 0,
    
    -- Updated automatically
    last_game_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_games CHECK (total_games >= 0),
    CONSTRAINT valid_wins CHECK (games_won <= total_games),
    CONSTRAINT valid_completions CHECK (games_completed <= total_games),
    CONSTRAINT valid_streaks CHECK (current_win_streak >= 0 AND longest_win_streak >= 0)
);

-- Create leaderboards view for easy querying
CREATE OR REPLACE VIEW leaderboards AS
SELECT 
    u.id,
    u.username,
    u.avatar_url,
    us.total_games as games_played,
    us.games_won as wins,
    us.total_score,
    us.average_score as avg_score,
    us.fastest_win,
    us.longest_win_streak as best_streak,
    
    -- Calculate win rate
    CASE 
        WHEN us.total_games > 0 THEN ROUND((us.games_won::NUMERIC / us.total_games::NUMERIC) * 100, 2)
        ELSE 0 
    END as win_rate,
    
    -- Points per game
    CASE 
        WHEN us.total_games > 0 THEN ROUND(us.total_score::NUMERIC / us.total_games::NUMERIC, 2)
        ELSE 0 
    END as points_per_game,
    
    us.last_game_at,
    us.updated_at
FROM users u
LEFT JOIN user_statistics us ON u.id = us.user_id
WHERE us.total_games > 0  -- Only include users who have played
ORDER BY us.total_score DESC;

-- Function to update user statistics after a game
CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS TRIGGER AS $$
DECLARE
    was_winner BOOLEAN;
    prev_stats RECORD;
    new_win_streak INTEGER;
BEGIN
    -- Check if this user won the game
    was_winner := (
        SELECT winner_id = NEW.user_id 
        FROM bingo_sessions 
        WHERE id = NEW.session_id
    );
    
    -- Get current stats
    SELECT * INTO prev_stats 
    FROM user_statistics 
    WHERE user_id = NEW.user_id;
    
    -- Calculate new win streak
    IF was_winner THEN
        new_win_streak := COALESCE(prev_stats.current_win_streak, 0) + 1;
    ELSE
        new_win_streak := 0;
    END IF;
    
    -- Insert or update statistics
    INSERT INTO user_statistics (
        user_id,
        total_games,
        games_won,
        games_completed,
        total_score,
        highest_score,
        average_score,
        fastest_win,
        total_playtime,
        current_win_streak,
        longest_win_streak,
        last_game_at
    )
    VALUES (
        NEW.user_id,
        1,
        CASE WHEN was_winner THEN 1 ELSE 0 END,
        1,
        NEW.final_score,
        NEW.final_score,
        NEW.final_score,
        CASE WHEN was_winner THEN NEW.time_to_win ELSE NULL END,
        COALESCE(NEW.time_to_win, 0),
        new_win_streak,
        new_win_streak,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_games = user_statistics.total_games + 1,
        games_won = user_statistics.games_won + CASE WHEN was_winner THEN 1 ELSE 0 END,
        games_completed = user_statistics.games_completed + 1,
        total_score = user_statistics.total_score + NEW.final_score,
        highest_score = GREATEST(user_statistics.highest_score, NEW.final_score),
        average_score = (user_statistics.total_score + NEW.final_score) / (user_statistics.total_games + 1),
        fastest_win = CASE 
            WHEN was_winner AND NEW.time_to_win IS NOT NULL THEN 
                CASE 
                    WHEN user_statistics.fastest_win IS NULL THEN NEW.time_to_win
                    ELSE LEAST(user_statistics.fastest_win, NEW.time_to_win)
                END
            ELSE user_statistics.fastest_win
        END,
        total_playtime = user_statistics.total_playtime + COALESCE(NEW.time_to_win, 0),
        current_win_streak = new_win_streak,
        longest_win_streak = GREATEST(user_statistics.longest_win_streak, new_win_streak),
        last_game_at = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update statistics
DROP TRIGGER IF EXISTS update_user_stats_trigger ON game_results;
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT ON game_results
    FOR EACH ROW
    EXECUTE FUNCTION update_user_statistics();

-- Create indexes on the statistics table
CREATE INDEX IF NOT EXISTS idx_user_statistics_total_score ON user_statistics(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_statistics_win_rate ON user_statistics((games_won::NUMERIC / NULLIF(total_games, 0)::NUMERIC) DESC);
CREATE INDEX IF NOT EXISTS idx_user_statistics_games_played ON user_statistics(total_games DESC);

-- Add RLS policies
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;

-- Game results policies
CREATE POLICY "Users can view their own game results" ON game_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view results from their sessions" ON game_results
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM bingo_sessions 
            WHERE host_id = auth.uid() 
            OR id IN (
                SELECT session_id FROM bingo_session_players 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Statistics policies (read-only for users)
CREATE POLICY "Anyone can view user statistics" ON user_statistics
    FOR SELECT USING (true);

-- Comments for documentation
COMMENT ON TABLE game_results IS 'Individual game performance tracking for scoring and leaderboards';
COMMENT ON TABLE user_statistics IS 'Aggregated user performance statistics';
COMMENT ON VIEW leaderboards IS 'Pre-calculated leaderboard rankings with win rates and performance metrics';