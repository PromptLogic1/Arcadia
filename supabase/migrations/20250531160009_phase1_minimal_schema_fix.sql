-- =============================================================================
-- PHASE 1 MINIMAL SCHEMA FIX
-- Add only the truly missing fields
-- =============================================================================

-- Check what we actually need to add to bingo_sessions
ALTER TABLE bingo_sessions 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS session_code TEXT UNIQUE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bingo_sessions_version ON bingo_sessions(version);
CREATE INDEX IF NOT EXISTS idx_bingo_sessions_session_code ON bingo_sessions(session_code);

-- Generate session codes for existing sessions without codes
UPDATE bingo_sessions 
SET session_code = UPPER(LEFT(MD5(RANDOM()::TEXT || id::TEXT), 6))
WHERE session_code IS NULL;

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