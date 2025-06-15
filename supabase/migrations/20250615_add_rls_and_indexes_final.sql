-- Migration: Add missing RLS policies and performance indexes (Final)
-- Date: 2025-06-15
-- Purpose: Fix critical security vulnerabilities and performance issues

-- =====================================================
-- STEP 1: Enable RLS on critical tables (if not already enabled)
-- =====================================================

DO $$ 
BEGIN
    -- Enable RLS only if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'bingo_sessions' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.bingo_sessions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'bingo_session_players' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.bingo_session_players ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'bingo_session_events' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.bingo_session_events ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'bingo_queue_entries' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.bingo_queue_entries ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'board_bookmarks' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.board_bookmarks ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- =====================================================
-- STEP 2: Create RLS Policies for bingo_sessions (if not exist)
-- =====================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'bingo_sessions' 
        AND policyname = 'bingo_sessions_select'
    ) THEN
        CREATE POLICY "bingo_sessions_select" ON public.bingo_sessions
        AS PERMISSIVE FOR SELECT TO public
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'bingo_sessions' 
        AND policyname = 'bingo_sessions_insert'
    ) THEN
        CREATE POLICY "bingo_sessions_insert" ON public.bingo_sessions
        AS PERMISSIVE FOR INSERT TO authenticated
        WITH CHECK (host_id = (SELECT auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'bingo_sessions' 
        AND policyname = 'bingo_sessions_update'
    ) THEN
        CREATE POLICY "bingo_sessions_update" ON public.bingo_sessions
        AS PERMISSIVE FOR UPDATE TO authenticated
        USING (host_id = (SELECT auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'bingo_sessions' 
        AND policyname = 'bingo_sessions_delete'
    ) THEN
        CREATE POLICY "bingo_sessions_delete" ON public.bingo_sessions
        AS PERMISSIVE FOR DELETE TO authenticated
        USING (host_id = (SELECT auth.uid()));
    END IF;
END $$;

-- =====================================================
-- STEP 3: Create RLS Policies for bingo_session_players
-- =====================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'bingo_session_players' 
        AND policyname = 'bingo_session_players_select'
    ) THEN
        CREATE POLICY "bingo_session_players_select" ON public.bingo_session_players
        AS PERMISSIVE FOR SELECT TO public
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'bingo_session_players' 
        AND policyname = 'bingo_session_players_insert'
    ) THEN
        CREATE POLICY "bingo_session_players_insert" ON public.bingo_session_players
        AS PERMISSIVE FOR INSERT TO authenticated
        WITH CHECK (user_id = (SELECT auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'bingo_session_players' 
        AND policyname = 'bingo_session_players_update'
    ) THEN
        CREATE POLICY "bingo_session_players_update" ON public.bingo_session_players
        AS PERMISSIVE FOR UPDATE TO authenticated
        USING (
          user_id = (SELECT auth.uid()) OR
          EXISTS (
            SELECT 1 FROM bingo_sessions
            WHERE bingo_sessions.id = bingo_session_players.session_id
            AND bingo_sessions.host_id = (SELECT auth.uid())
          )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'bingo_session_players' 
        AND policyname = 'bingo_session_players_delete'
    ) THEN
        CREATE POLICY "bingo_session_players_delete" ON public.bingo_session_players
        AS PERMISSIVE FOR DELETE TO authenticated
        USING (
          user_id = (SELECT auth.uid()) OR
          EXISTS (
            SELECT 1 FROM bingo_sessions
            WHERE bingo_sessions.id = bingo_session_players.session_id
            AND bingo_sessions.host_id = (SELECT auth.uid())
          )
        );
    END IF;
END $$;

-- =====================================================
-- STEP 4: Create RLS Policies for bingo_session_events
-- =====================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'bingo_session_events' 
        AND policyname = 'bingo_session_events_select'
    ) THEN
        CREATE POLICY "bingo_session_events_select" ON public.bingo_session_events
        AS PERMISSIVE FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM bingo_session_players
            WHERE bingo_session_players.session_id = bingo_session_events.session_id
            AND bingo_session_players.user_id = (SELECT auth.uid())
          ) OR
          EXISTS (
            SELECT 1 FROM bingo_sessions
            WHERE bingo_sessions.id = bingo_session_events.session_id
            AND bingo_sessions.host_id = (SELECT auth.uid())
          )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'bingo_session_events' 
        AND policyname = 'bingo_session_events_insert'
    ) THEN
        CREATE POLICY "bingo_session_events_insert" ON public.bingo_session_events
        AS PERMISSIVE FOR INSERT TO authenticated
        WITH CHECK (
          user_id = (SELECT auth.uid()) AND
          EXISTS (
            SELECT 1 FROM bingo_session_players
            WHERE bingo_session_players.session_id = bingo_session_events.session_id
            AND bingo_session_players.user_id = (SELECT auth.uid())
          )
        );
    END IF;
END $$;

-- =====================================================
-- STEP 5: Create RLS Policies for bingo_queue_entries
-- =====================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'bingo_queue_entries' 
        AND policyname = 'bingo_queue_entries_select'
    ) THEN
        CREATE POLICY "bingo_queue_entries_select" ON public.bingo_queue_entries
        AS PERMISSIVE FOR SELECT TO authenticated
        USING (
          user_id = (SELECT auth.uid()) OR
          EXISTS (
            SELECT 1 FROM bingo_sessions
            WHERE bingo_sessions.id = bingo_queue_entries.matched_session_id
            AND bingo_sessions.host_id = (SELECT auth.uid())
          )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'bingo_queue_entries' 
        AND policyname = 'bingo_queue_entries_insert'
    ) THEN
        CREATE POLICY "bingo_queue_entries_insert" ON public.bingo_queue_entries
        AS PERMISSIVE FOR INSERT TO authenticated
        WITH CHECK (user_id = (SELECT auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'bingo_queue_entries' 
        AND policyname = 'bingo_queue_entries_update'
    ) THEN
        CREATE POLICY "bingo_queue_entries_update" ON public.bingo_queue_entries
        AS PERMISSIVE FOR UPDATE TO authenticated
        USING (user_id = (SELECT auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'bingo_queue_entries' 
        AND policyname = 'bingo_queue_entries_delete'
    ) THEN
        CREATE POLICY "bingo_queue_entries_delete" ON public.bingo_queue_entries
        AS PERMISSIVE FOR DELETE TO authenticated
        USING (user_id = (SELECT auth.uid()));
    END IF;
END $$;

-- =====================================================
-- STEP 6: Create RLS Policies for board_bookmarks
-- =====================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'board_bookmarks' 
        AND policyname = 'board_bookmarks_select'
    ) THEN
        CREATE POLICY "board_bookmarks_select" ON public.board_bookmarks
        AS PERMISSIVE FOR SELECT TO authenticated
        USING (user_id = (SELECT auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'board_bookmarks' 
        AND policyname = 'board_bookmarks_insert'
    ) THEN
        CREATE POLICY "board_bookmarks_insert" ON public.board_bookmarks
        AS PERMISSIVE FOR INSERT TO authenticated
        WITH CHECK (user_id = (SELECT auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'board_bookmarks' 
        AND policyname = 'board_bookmarks_delete'
    ) THEN
        CREATE POLICY "board_bookmarks_delete" ON public.board_bookmarks
        AS PERMISSIVE FOR DELETE TO authenticated
        USING (user_id = (SELECT auth.uid()));
    END IF;
END $$;

-- =====================================================
-- STEP 7: Create Performance Indexes
-- =====================================================

-- Indexes for RLS performance on foreign keys
CREATE INDEX IF NOT EXISTS idx_bingo_sessions_host_id 
ON public.bingo_sessions(host_id);

CREATE INDEX IF NOT EXISTS idx_bingo_session_players_user_id 
ON public.bingo_session_players(user_id);

CREATE INDEX IF NOT EXISTS idx_bingo_session_players_session_id 
ON public.bingo_session_players(session_id);

CREATE INDEX IF NOT EXISTS idx_bingo_boards_creator_id 
ON public.bingo_boards(creator_id);

CREATE INDEX IF NOT EXISTS idx_board_bookmarks_user_id 
ON public.board_bookmarks(user_id);

CREATE INDEX IF NOT EXISTS idx_board_bookmarks_board_id 
ON public.board_bookmarks(board_id);

CREATE INDEX IF NOT EXISTS idx_bingo_session_events_session_id 
ON public.bingo_session_events(session_id);

CREATE INDEX IF NOT EXISTS idx_bingo_session_events_user_id 
ON public.bingo_session_events(user_id);

CREATE INDEX IF NOT EXISTS idx_bingo_queue_entries_user_id 
ON public.bingo_queue_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_bingo_queue_entries_matched_session_id 
ON public.bingo_queue_entries(matched_session_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bingo_sessions_status_created 
ON public.bingo_sessions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bingo_boards_public_status 
ON public.bingo_boards(is_public, status) 
WHERE is_public = true AND status = 'active';

-- Session code lookup index
CREATE INDEX IF NOT EXISTS idx_bingo_sessions_code 
ON public.bingo_sessions(session_code) 
WHERE session_code IS NOT NULL;

-- Board votes index
CREATE INDEX IF NOT EXISTS idx_board_votes_board_id 
ON public.board_votes(board_id);

CREATE INDEX IF NOT EXISTS idx_board_votes_user_id 
ON public.board_votes(user_id);

-- =====================================================
-- VERIFICATION: Return summary of what was done
-- =====================================================

SELECT 
    'RLS and Indexes Migration Complete' as status,
    NOW() as completed_at;