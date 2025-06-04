-- Create game_results table for storing game outcomes
CREATE TABLE IF NOT EXISTS public.game_results (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid REFERENCES public.bingo_sessions(id) ON DELETE CASCADE,
    player_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    position integer NOT NULL, -- 1st, 2nd, 3rd, etc.
    score integer DEFAULT 0,
    time_to_complete integer, -- seconds
    pattern_completed text, -- which win pattern was achieved
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_results_session_id ON public.game_results(session_id);
CREATE INDEX IF NOT EXISTS idx_game_results_player_id ON public.game_results(player_id);
CREATE INDEX IF NOT EXISTS idx_game_results_created_at ON public.game_results(created_at DESC);

-- Enable RLS
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "game_results_select" ON public.game_results
    FOR SELECT 
    USING (
        -- Anyone can view game results
        true
    );

CREATE POLICY "game_results_insert" ON public.game_results
    FOR INSERT 
    WITH CHECK (
        -- Only the system (via service role) or session host can insert results
        EXISTS (
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

CREATE POLICY "game_results_update" ON public.game_results
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "game_results_delete" ON public.game_results
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_game_results_updated_at BEFORE UPDATE ON public.game_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();