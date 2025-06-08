-- Fix session_stats view to include missing fields expected by the application
CREATE OR REPLACE VIEW public.session_stats AS
SELECT 
    s.id,
    s.board_id,
    s.host_id,
    s.session_code,
    s.settings,
    s.status,
    s.winner_id,
    s.started_at,
    s.ended_at,
    s.created_at,
    s.updated_at,
    s.version,
    s.current_state,
    b.title AS board_title,
    b.game_type AS board_game_type,
    b.difficulty AS board_difficulty,
    h.username AS host_username,
    count(sp.id) AS current_player_count,
    -- Extract has_password from settings composite type
    CASE 
        WHEN s.settings IS NOT NULL AND (s.settings).password IS NOT NULL 
        THEN true 
        ELSE false 
    END AS has_password,
    -- Extract max_players from settings composite type
    (s.settings).max_players AS max_players
FROM bingo_sessions s
    LEFT JOIN bingo_boards b ON s.board_id = b.id
    LEFT JOIN users h ON s.host_id = h.id
    LEFT JOIN bingo_session_players sp ON s.id = sp.session_id AND sp.left_at IS NULL
GROUP BY s.id, b.title, b.game_type, b.difficulty, h.username;

-- Grant appropriate permissions
GRANT SELECT ON public.session_stats TO anon, authenticated;