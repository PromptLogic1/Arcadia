-- Add password field to session_settings composite type
-- First drop the type if it exists (with CASCADE to update dependent tables)
DROP TYPE IF EXISTS session_settings CASCADE;

-- Recreate the session_settings type with password field
CREATE TYPE session_settings AS (
  max_players INTEGER,
  allow_spectators BOOLEAN,
  auto_start BOOLEAN,
  time_limit INTEGER,
  require_approval BOOLEAN,
  password TEXT
);

-- Recreate the bingo_sessions table constraint that uses session_settings
-- (This will be handled automatically by the CASCADE, but we need to ensure proper recreation)
-- Update any tables that use this type (bingo_sessions in our case)
ALTER TABLE bingo_sessions 
ALTER COLUMN settings TYPE session_settings 
USING settings::text::session_settings;

-- Update the session_stats view to handle the new password field
CREATE OR REPLACE VIEW session_stats AS
SELECT 
  bs.id,
  bs.board_id,
  bs.host_id,
  bs.session_code,
  bs.status,
  bs.current_state,
  bs.settings,
  bs.started_at,
  bs.ended_at,
  bs.created_at,
  bs.updated_at,
  bs.version,
  bs.winner_id,
  bb.title as board_title,
  bb.difficulty as board_difficulty,
  bb.game_type as board_game_type,
  u.username as host_username,
  COUNT(bsp.user_id) as current_player_count,
  COALESCE((bs.settings).max_players, 4) as max_players,
  -- Don't expose password in public view
  CASE WHEN (bs.settings).password IS NOT NULL AND (bs.settings).password != '' 
       THEN true 
       ELSE false 
  END as has_password
FROM bingo_sessions bs
LEFT JOIN bingo_boards bb ON bs.board_id = bb.id
LEFT JOIN users u ON bs.host_id = u.id
LEFT JOIN bingo_session_players bsp ON bs.id = bsp.session_id AND bsp.left_at IS NULL
WHERE bs.status IN ('waiting', 'active')
GROUP BY bs.id, bb.title, bb.difficulty, bb.game_type, u.username;

-- Grant necessary permissions
GRANT SELECT ON session_stats TO authenticated;