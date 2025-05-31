-- =============================================================================
-- PHASE 1 SCHEMA ALIGNMENT (CORRECTED)
-- Add only the missing fields needed for frontend integration
-- =============================================================================

-- Add version field to bingo_sessions (only missing field)
ALTER TABLE bingo_sessions 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add missing fields to bingo_session_players
ALTER TABLE bingo_session_players 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#FF6B6B',
ADD COLUMN IF NOT EXISTS team INTEGER DEFAULT NULL;

-- Add session_code field to bingo_sessions if not exists (for join-by-code functionality)
ALTER TABLE bingo_sessions 
ADD COLUMN IF NOT EXISTS session_code TEXT UNIQUE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bingo_sessions_version ON bingo_sessions(version);
CREATE INDEX IF NOT EXISTS idx_bingo_sessions_session_code ON bingo_sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_session_players_color ON bingo_session_players(color);
CREATE INDEX IF NOT EXISTS idx_session_players_team ON bingo_session_players(team);

-- Generate session codes for existing sessions without codes
UPDATE bingo_sessions 
SET session_code = UPPER(LEFT(MD5(RANDOM()::TEXT || id::TEXT), 6))
WHERE session_code IS NULL;

-- Update existing players to have default colors (cycling through a palette)
DO $$
DECLARE
    player_record RECORD;
    color_palette TEXT[] := ARRAY['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#87CEEB', '#98FB98'];
    color_index INTEGER := 0;
BEGIN
    FOR player_record IN SELECT id FROM bingo_session_players WHERE color IS NULL ORDER BY created_at
    LOOP
        UPDATE bingo_session_players 
        SET color = color_palette[1 + (color_index % 8)]
        WHERE id = player_record.id;
        
        color_index := color_index + 1;
    END LOOP;
END $$;

-- Make color NOT NULL after populating existing records
ALTER TABLE bingo_session_players 
ALTER COLUMN color SET NOT NULL;

-- Function to auto-assign colors to new players
CREATE OR REPLACE FUNCTION assign_player_color()
RETURNS TRIGGER AS $$
DECLARE
    color_palette TEXT[] := ARRAY['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#87CEEB', '#98FB98'];
    player_count INTEGER;
BEGIN
    IF NEW.color IS NULL THEN
        SELECT COUNT(*) INTO player_count 
        FROM bingo_session_players 
        WHERE session_id = NEW.session_id;
        
        NEW.color := color_palette[1 + (player_count % 8)];
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-assigning colors
DROP TRIGGER IF EXISTS assign_player_color_trigger ON bingo_session_players;
CREATE TRIGGER assign_player_color_trigger
    BEFORE INSERT ON bingo_session_players
    FOR EACH ROW
    EXECUTE FUNCTION assign_player_color();

-- Function to generate session codes for new sessions
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.session_code IS NULL THEN
        -- Generate 6-character alphanumeric code
        NEW.session_code := UPPER(LEFT(MD5(RANDOM()::TEXT || NEW.id::TEXT), 6));
        
        -- Ensure uniqueness (retry up to 10 times if collision)
        WHILE EXISTS (SELECT 1 FROM bingo_sessions WHERE session_code = NEW.session_code AND id != NEW.id) LOOP
            NEW.session_code := UPPER(LEFT(MD5(RANDOM()::TEXT || NEW.id::TEXT), 6));
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating session codes
DROP TRIGGER IF EXISTS generate_session_code_trigger ON bingo_sessions;
CREATE TRIGGER generate_session_code_trigger
    BEFORE INSERT ON bingo_sessions
    FOR EACH ROW
    EXECUTE FUNCTION generate_session_code();

-- Function to increment session version on state updates
CREATE OR REPLACE FUNCTION increment_session_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only increment version when current_state changes
    IF NEW.current_state IS DISTINCT FROM OLD.current_state THEN
        NEW.version := COALESCE(OLD.version, 0) + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for version management
DROP TRIGGER IF EXISTS increment_session_version_trigger ON bingo_sessions;
CREATE TRIGGER increment_session_version_trigger
    BEFORE UPDATE ON bingo_sessions
    FOR EACH ROW
    EXECUTE FUNCTION increment_session_version();