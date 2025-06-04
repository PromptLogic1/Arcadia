-- Update bingo_session_players table to match code expectations
-- Add missing columns that the application code requires

-- First, add the missing columns
ALTER TABLE public.bingo_session_players
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS team text,
ADD COLUMN IF NOT EXISTS score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_host boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_ready boolean DEFAULT false;

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_bingo_session_players_user_id ON public.bingo_session_players(user_id);

-- Update RLS policies for the new columns
DROP POLICY IF EXISTS "bingo_session_players_select" ON public.bingo_session_players;
CREATE POLICY "bingo_session_players_select" ON public.bingo_session_players
    FOR SELECT 
    USING (
        -- Players can see other players in their session
        EXISTS (
            SELECT 1 FROM bingo_session_players sp
            WHERE sp.session_id = bingo_session_players.session_id
            AND sp.user_id = (select auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS "bingo_session_players_insert" ON public.bingo_session_players;
CREATE POLICY "bingo_session_players_insert" ON public.bingo_session_players
    FOR INSERT 
    WITH CHECK (
        user_id = (select auth.uid())
    );

DROP POLICY IF EXISTS "bingo_session_players_update" ON public.bingo_session_players;
CREATE POLICY "bingo_session_players_update" ON public.bingo_session_players
    FOR UPDATE 
    USING (
        user_id = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM bingo_sessions s
            WHERE s.id = session_id
            AND s.host_id = (select auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS "bingo_session_players_delete" ON public.bingo_session_players;
CREATE POLICY "bingo_session_players_delete" ON public.bingo_session_players
    FOR DELETE 
    USING (
        user_id = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM bingo_sessions s
            WHERE s.id = session_id
            AND s.host_id = (select auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );