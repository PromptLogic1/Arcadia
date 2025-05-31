-- =============================================================================
-- ADD CURRENT_STATE TO BINGO_SESSIONS
-- Critical for Phase 1 - Store real-time board state during gameplay
-- =============================================================================

-- Add current_state column to store the real-time board state
ALTER TABLE bingo_sessions 
ADD COLUMN IF NOT EXISTS current_state JSONB;

-- Add index for better query performance on current_state
CREATE INDEX IF NOT EXISTS idx_bingo_sessions_current_state ON bingo_sessions USING GIN (current_state);

-- Comment for documentation
COMMENT ON COLUMN bingo_sessions.current_state IS 'Real-time board state during gameplay. Contains array of cell states with marked status and player info.';

-- Update the version increment trigger to handle current_state changes
-- (Already exists from previous migration, but let's ensure it's correct)
CREATE OR REPLACE FUNCTION increment_session_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only increment version when current_state changes
    IF NEW.current_state IS DISTINCT FROM OLD.current_state THEN
        NEW.version := COALESCE(OLD.version, 0) + 1;
        NEW.updated_at := NOW(); -- Also update the timestamp
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists (drop and recreate to be sure)
DROP TRIGGER IF EXISTS increment_session_version_trigger ON bingo_sessions;
CREATE TRIGGER increment_session_version_trigger
    BEFORE UPDATE ON bingo_sessions
    FOR EACH ROW
    EXECUTE FUNCTION increment_session_version();