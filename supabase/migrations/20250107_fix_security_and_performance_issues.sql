-- Migration: Fix critical security and performance issues
-- Date: 2025-01-07
-- Issues addressed:
-- 1. SECURITY DEFINER views exposing data
-- 2. Function search_path vulnerability
-- 3. RLS auth.uid() performance issues
-- 4. Multiple overlapping policies

-- =====================================================
-- STEP 1: Fix SECURITY DEFINER Views
-- =====================================================

-- Drop existing views with SECURITY DEFINER
DROP VIEW IF EXISTS public.leaderboards CASCADE;
DROP VIEW IF EXISTS public.public_boards CASCADE;
DROP VIEW IF EXISTS public.session_stats CASCADE;

-- Recreate leaderboards view without SECURITY DEFINER
CREATE OR REPLACE VIEW public.leaderboards AS
SELECT u.id,
    u.username,
    u.avatar_url,
    COALESCE(stats.total_score, (0)::bigint) AS total_score,
    COALESCE(stats.games_played, (0)::bigint) AS games_played,
    COALESCE(stats.wins, (0)::bigint) AS wins,
    CASE
        WHEN (COALESCE(stats.games_played, (0)::bigint) > 0) THEN round((((COALESCE(stats.wins, (0)::bigint))::numeric / (stats.games_played)::numeric) * (100)::numeric), 2)
        ELSE (0)::numeric
    END AS win_rate,
    COALESCE(stats.avg_score, (0)::numeric) AS avg_score,
    CASE
        WHEN (COALESCE(stats.games_played, (0)::bigint) > 0) THEN round(((COALESCE(stats.total_score, (0)::bigint))::numeric / (stats.games_played)::numeric), 2)
        ELSE (0)::numeric
    END AS points_per_game,
    COALESCE(stats.best_score, 0) AS best_streak,
    COALESCE(stats.fastest_win, (0)::numeric) AS fastest_win,
    stats.last_game_at,
    u.updated_at
FROM (users u
    LEFT JOIN ( SELECT p.user_id,
        sum(p.score) AS total_score,
        count(DISTINCT s.id) AS games_played,
        count(DISTINCT
            CASE
                WHEN (s.winner_id = p.user_id) THEN s.id
                ELSE NULL::uuid
            END) AS wins,
        round(avg(p.score), 2) AS avg_score,
        max(p.score) AS best_score,
        min(
            CASE
                WHEN (s.winner_id = p.user_id) THEN EXTRACT(epoch FROM (s.ended_at - s.started_at))
                ELSE NULL::numeric
            END) AS fastest_win,
        max(s.ended_at) AS last_game_at
    FROM (bingo_session_players p
        JOIN bingo_sessions s ON ((p.session_id = s.id)))
    WHERE (s.status = 'completed'::session_status)
    GROUP BY p.user_id) stats ON ((u.id = stats.user_id)));

-- Recreate public_boards view without SECURITY DEFINER
CREATE OR REPLACE VIEW public.public_boards AS
SELECT b.id,
    b.title,
    b.description,
    b.creator_id,
    b.size,
    b.settings,
    b.game_type,
    b.difficulty,
    b.is_public,
    b.status,
    b.votes,
    b.bookmarked_count,
    b.version,
    b.cloned_from,
    b.created_at,
    b.updated_at,
    b.board_state,
    u.username AS creator_username,
    u.avatar_url AS creator_avatar,
    count(bb.board_id) AS bookmark_count
FROM ((bingo_boards b
    LEFT JOIN users u ON ((b.creator_id = u.id)))
    LEFT JOIN board_bookmarks bb ON ((b.id = bb.board_id)))
WHERE ((b.is_public = true) AND (b.status = 'active'::board_status))
GROUP BY b.id, u.username, u.avatar_url;

-- Recreate session_stats view without SECURITY DEFINER
CREATE OR REPLACE VIEW public.session_stats AS
SELECT s.id,
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
    h.username AS host_username,
    count(sp.id) AS current_player_count
FROM (((bingo_sessions s
    LEFT JOIN bingo_boards b ON ((s.board_id = b.id)))
    LEFT JOIN users h ON ((s.host_id = h.id)))
    LEFT JOIN bingo_session_players sp ON (((s.id = sp.session_id) AND (sp.left_at IS NULL))))
GROUP BY s.id, b.title, h.username;

-- Grant appropriate permissions to views
GRANT SELECT ON public.leaderboards TO anon, authenticated;
GRANT SELECT ON public.public_boards TO anon, authenticated;
GRANT SELECT ON public.session_stats TO anon, authenticated;

-- =====================================================
-- STEP 2: Fix Function Search Path Vulnerability
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_user_statistics_updated_at_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$function$;

-- =====================================================
-- STEP 3: Fix auth.uid() Performance Issues in RLS
-- =====================================================

-- Fix bingo_cards policies
DROP POLICY IF EXISTS "bingo_cards_delete" ON public.bingo_cards;
CREATE POLICY "bingo_cards_delete" ON public.bingo_cards
AS PERMISSIVE FOR DELETE TO public
USING (creator_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "bingo_cards_insert" ON public.bingo_cards;
CREATE POLICY "bingo_cards_insert" ON public.bingo_cards
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (creator_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "bingo_cards_unified_select" ON public.bingo_cards;
CREATE POLICY "bingo_cards_unified_select" ON public.bingo_cards
AS PERMISSIVE FOR SELECT TO public
USING ((is_public = true) OR (creator_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "bingo_cards_update" ON public.bingo_cards;
CREATE POLICY "bingo_cards_update" ON public.bingo_cards
AS PERMISSIVE FOR UPDATE TO public
USING (creator_id = (SELECT auth.uid()));

-- Fix bingo_session_queue policies
DROP POLICY IF EXISTS "session_queue_delete" ON public.bingo_session_queue;
CREATE POLICY "session_queue_delete" ON public.bingo_session_queue
AS PERMISSIVE FOR DELETE TO public
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "session_queue_insert" ON public.bingo_session_queue;
CREATE POLICY "session_queue_insert" ON public.bingo_session_queue
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "session_queue_unified_select" ON public.bingo_session_queue;
CREATE POLICY "session_queue_unified_select" ON public.bingo_session_queue
AS PERMISSIVE FOR SELECT TO public
USING ((user_id = (SELECT auth.uid())) OR (EXISTS (
    SELECT 1 FROM bingo_sessions
    WHERE bingo_sessions.id = bingo_session_queue.session_id 
    AND bingo_sessions.host_id = (SELECT auth.uid())
)));

DROP POLICY IF EXISTS "session_queue_update" ON public.bingo_session_queue;
CREATE POLICY "session_queue_update" ON public.bingo_session_queue
AS PERMISSIVE FOR UPDATE TO public
USING (user_id = (SELECT auth.uid()));

-- Fix community_event_participants policies
DROP POLICY IF EXISTS "Allow users to manage their own participation" ON public.community_event_participants;
CREATE POLICY "Allow users to manage their own participation" ON public.community_event_participants
AS PERMISSIVE FOR ALL TO public
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Allow event organizers to manage participants" ON public.community_event_participants;
CREATE POLICY "Allow event organizers to manage participants" ON public.community_event_participants
AS PERMISSIVE FOR ALL TO public
USING ((
    SELECT community_events.organizer_id
    FROM community_events
    WHERE community_events.id = community_event_participants.event_id
) = (SELECT auth.uid()));

-- Fix community_events policies
DROP POLICY IF EXISTS "Allow authenticated users to create events" ON public.community_events;
CREATE POLICY "Allow authenticated users to create events" ON public.community_events
AS PERMISSIVE FOR INSERT TO public
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Allow organizers to delete their own events" ON public.community_events;
CREATE POLICY "Allow organizers to delete their own events" ON public.community_events
AS PERMISSIVE FOR DELETE TO public
USING ((SELECT auth.uid()) = organizer_id);

DROP POLICY IF EXISTS "Allow organizers to update their own events" ON public.community_events;
CREATE POLICY "Allow organizers to update their own events" ON public.community_events
AS PERMISSIVE FOR UPDATE TO public
USING ((SELECT auth.uid()) = organizer_id)
WITH CHECK ((SELECT auth.uid()) = organizer_id);

-- Fix community_event_tags policies
DROP POLICY IF EXISTS "Allow event organizers to manage tags" ON public.community_event_tags;
CREATE POLICY "Allow event organizers to manage tags" ON public.community_event_tags
AS PERMISSIVE FOR ALL TO public
USING ((
    SELECT community_events.organizer_id
    FROM community_events
    WHERE community_events.id = community_event_tags.event_id
) = (SELECT auth.uid()));

-- Fix user_bookmarks policies
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.user_bookmarks;
CREATE POLICY "Users can view their own bookmarks" ON public.user_bookmarks
AS PERMISSIVE FOR SELECT TO public
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own bookmarks" ON public.user_bookmarks;
CREATE POLICY "Users can insert their own bookmarks" ON public.user_bookmarks
AS PERMISSIVE FOR INSERT TO public
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.user_bookmarks;
CREATE POLICY "Users can delete their own bookmarks" ON public.user_bookmarks
AS PERMISSIVE FOR DELETE TO public
USING ((SELECT auth.uid()) = user_id);

-- Fix categories policies
DROP POLICY IF EXISTS "categories_admin_manage" ON public.categories;
CREATE POLICY "categories_admin_manage" ON public.categories
AS PERMISSIVE FOR ALL TO public
USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid()) 
    AND users.role = 'admin'::user_role
));

-- Fix challenge_tags policies
DROP POLICY IF EXISTS "challenge_tags_manage" ON public.challenge_tags;
CREATE POLICY "challenge_tags_manage" ON public.challenge_tags
AS PERMISSIVE FOR ALL TO public
USING (EXISTS (
    SELECT 1 FROM challenges c
    WHERE c.id = challenge_tags.challenge_id 
    AND c.created_by = (SELECT auth.uid())
));

-- Fix challenges policies
DROP POLICY IF EXISTS "challenges_manage" ON public.challenges;
CREATE POLICY "challenges_manage" ON public.challenges
AS PERMISSIVE FOR ALL TO public
USING (
    (created_by = (SELECT auth.uid())) OR 
    (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = (SELECT auth.uid()) 
        AND users.role = 'admin'::user_role
    ))
);

DROP POLICY IF EXISTS "challenges_unified_select" ON public.challenges;
CREATE POLICY "challenges_unified_select" ON public.challenges
AS PERMISSIVE FOR SELECT TO public
USING (
    (status = 'published'::challenge_status) OR 
    (created_by = (SELECT auth.uid())) OR 
    (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = (SELECT auth.uid()) 
        AND users.role = 'admin'::user_role
    ))
);

-- Fix submissions policies
DROP POLICY IF EXISTS "submissions_manage" ON public.submissions;
CREATE POLICY "submissions_manage" ON public.submissions
AS PERMISSIVE FOR ALL TO public
USING ((user_id = (SELECT auth.uid())) OR (SELECT is_admin()));

DROP POLICY IF EXISTS "submissions_unified_select" ON public.submissions;
CREATE POLICY "submissions_unified_select" ON public.submissions
AS PERMISSIVE FOR SELECT TO public
USING (
    (status = 'completed'::submission_status) OR 
    (user_id = (SELECT auth.uid())) OR 
    (SELECT is_admin())
);

-- Fix tag_votes policies
DROP POLICY IF EXISTS "tag_votes_manage" ON public.tag_votes;
CREATE POLICY "tag_votes_manage" ON public.tag_votes
AS PERMISSIVE FOR ALL TO public
USING (user_id = (SELECT auth.uid()));

-- Fix tags policies
DROP POLICY IF EXISTS "tags_manage" ON public.tags;
CREATE POLICY "tags_manage" ON public.tags
AS PERMISSIVE FOR ALL TO public
USING (
    (created_by = (SELECT auth.uid())) OR 
    (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = (SELECT auth.uid()) 
        AND users.role = 'admin'::user_role
    ))
);

-- Fix user_statistics policies
DROP POLICY IF EXISTS "user_statistics_select" ON public.user_statistics;
CREATE POLICY "user_statistics_select" ON public.user_statistics
AS PERMISSIVE FOR SELECT TO public
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_statistics_update" ON public.user_statistics;
CREATE POLICY "user_statistics_update" ON public.user_statistics
AS PERMISSIVE FOR UPDATE TO public
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_statistics_select_policy" ON public.user_statistics;
CREATE POLICY "user_statistics_select_policy" ON public.user_statistics
AS PERMISSIVE FOR SELECT TO public
USING (
    (user_id = (SELECT auth.uid())) OR 
    (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = (SELECT auth.uid()) 
        AND users.role = ANY(ARRAY['admin'::user_role, 'moderator'::user_role])
    ))
);

DROP POLICY IF EXISTS "user_statistics_update_policy" ON public.user_statistics;
CREATE POLICY "user_statistics_update_policy" ON public.user_statistics
AS PERMISSIVE FOR UPDATE TO public
USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid()) 
    AND users.role = ANY(ARRAY['admin'::user_role, 'moderator'::user_role])
));

-- =====================================================
-- STEP 4: Consolidate Multiple Permissive Policies
-- =====================================================

-- Consolidate user_statistics policies
DROP POLICY IF EXISTS "Anyone can view user statistics" ON public.user_statistics;
DROP POLICY IF EXISTS "user_statistics_select" ON public.user_statistics;
DROP POLICY IF EXISTS "user_statistics_select_policy" ON public.user_statistics;

-- Create single consolidated SELECT policy
CREATE POLICY "user_statistics_consolidated_select" ON public.user_statistics
AS PERMISSIVE FOR SELECT TO public
USING (
    true  -- Public visibility for leaderboards
);

-- Consolidate UPDATE policies
DROP POLICY IF EXISTS "user_statistics_update" ON public.user_statistics;
DROP POLICY IF EXISTS "user_statistics_update_policy" ON public.user_statistics;

CREATE POLICY "user_statistics_consolidated_update" ON public.user_statistics
AS PERMISSIVE FOR UPDATE TO public
USING (
    (user_id = (SELECT auth.uid())) OR
    (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = (SELECT auth.uid()) 
        AND users.role = ANY(ARRAY['admin'::user_role, 'moderator'::user_role])
    ))
);

-- Consolidate community_event_participants policies
DROP POLICY IF EXISTS "Allow users to manage their own participation" ON public.community_event_participants;
DROP POLICY IF EXISTS "Allow event organizers to manage participants" ON public.community_event_participants;
DROP POLICY IF EXISTS "Allow public read access to event participants" ON public.community_event_participants;

-- Create consolidated policies for community_event_participants
CREATE POLICY "community_event_participants_select" ON public.community_event_participants
AS PERMISSIVE FOR SELECT TO public
USING (true);  -- Public read access

CREATE POLICY "community_event_participants_insert" ON public.community_event_participants
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (
    ((SELECT auth.uid()) = user_id) OR
    ((SELECT community_events.organizer_id
      FROM community_events
      WHERE community_events.id = community_event_participants.event_id) = (SELECT auth.uid()))
);

CREATE POLICY "community_event_participants_update" ON public.community_event_participants
AS PERMISSIVE FOR UPDATE TO public
USING (
    ((SELECT auth.uid()) = user_id) OR
    ((SELECT community_events.organizer_id
      FROM community_events
      WHERE community_events.id = community_event_participants.event_id) = (SELECT auth.uid()))
);

CREATE POLICY "community_event_participants_delete" ON public.community_event_participants
AS PERMISSIVE FOR DELETE TO public
USING (
    ((SELECT auth.uid()) = user_id) OR
    ((SELECT community_events.organizer_id
      FROM community_events
      WHERE community_events.id = community_event_participants.event_id) = (SELECT auth.uid()))
);

-- Consolidate categories policies
DROP POLICY IF EXISTS "categories_admin_manage" ON public.categories;
DROP POLICY IF EXISTS "categories_unified_select" ON public.categories;

CREATE POLICY "categories_select" ON public.categories
AS PERMISSIVE FOR SELECT TO public
USING (true);  -- Public read

CREATE POLICY "categories_modify" ON public.categories
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid()) 
    AND users.role = 'admin'::user_role
));

CREATE POLICY "categories_update" ON public.categories
AS PERMISSIVE FOR UPDATE TO public
USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid()) 
    AND users.role = 'admin'::user_role
));

CREATE POLICY "categories_delete" ON public.categories
AS PERMISSIVE FOR DELETE TO public
USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid()) 
    AND users.role = 'admin'::user_role
));

-- Consolidate tags policies
DROP POLICY IF EXISTS "tags_manage" ON public.tags;
DROP POLICY IF EXISTS "tags_unified_select" ON public.tags;

CREATE POLICY "tags_select" ON public.tags
AS PERMISSIVE FOR SELECT TO public
USING (status = ANY(ARRAY['active'::tag_status, 'verified'::tag_status]));

CREATE POLICY "tags_modify" ON public.tags
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (
    (created_by = (SELECT auth.uid())) OR 
    (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = (SELECT auth.uid()) 
        AND users.role = 'admin'::user_role
    ))
);

CREATE POLICY "tags_update" ON public.tags
AS PERMISSIVE FOR UPDATE TO public
USING (
    (created_by = (SELECT auth.uid())) OR 
    (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = (SELECT auth.uid()) 
        AND users.role = 'admin'::user_role
    ))
);

CREATE POLICY "tags_delete" ON public.tags
AS PERMISSIVE FOR DELETE TO public
USING (
    (created_by = (SELECT auth.uid())) OR 
    (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = (SELECT auth.uid()) 
        AND users.role = 'admin'::user_role
    ))
);

-- Consolidate challenge_tags policies
DROP POLICY IF EXISTS "challenge_tags_manage" ON public.challenge_tags;
DROP POLICY IF EXISTS "challenge_tags_unified_select" ON public.challenge_tags;

CREATE POLICY "challenge_tags_select" ON public.challenge_tags
AS PERMISSIVE FOR SELECT TO public
USING (true);

CREATE POLICY "challenge_tags_modify" ON public.challenge_tags
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (EXISTS (
    SELECT 1 FROM challenges c
    WHERE c.id = challenge_tags.challenge_id 
    AND c.created_by = (SELECT auth.uid())
));

CREATE POLICY "challenge_tags_update" ON public.challenge_tags
AS PERMISSIVE FOR UPDATE TO public
USING (EXISTS (
    SELECT 1 FROM challenges c
    WHERE c.id = challenge_tags.challenge_id 
    AND c.created_by = (SELECT auth.uid())
));

CREATE POLICY "challenge_tags_delete" ON public.challenge_tags
AS PERMISSIVE FOR DELETE TO public
USING (EXISTS (
    SELECT 1 FROM challenges c
    WHERE c.id = challenge_tags.challenge_id 
    AND c.created_by = (SELECT auth.uid())
));

-- Consolidate tag_votes policies
DROP POLICY IF EXISTS "tag_votes_manage" ON public.tag_votes;
DROP POLICY IF EXISTS "tag_votes_unified_select" ON public.tag_votes;

CREATE POLICY "tag_votes_select" ON public.tag_votes
AS PERMISSIVE FOR SELECT TO public
USING (true);

CREATE POLICY "tag_votes_insert" ON public.tag_votes
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "tag_votes_update" ON public.tag_votes
AS PERMISSIVE FOR UPDATE TO public
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "tag_votes_delete" ON public.tag_votes
AS PERMISSIVE FOR DELETE TO public
USING (user_id = (SELECT auth.uid()));

-- Consolidate submissions policies
DROP POLICY IF EXISTS "submissions_manage" ON public.submissions;
DROP POLICY IF EXISTS "submissions_unified_select" ON public.submissions;

CREATE POLICY "submissions_select" ON public.submissions
AS PERMISSIVE FOR SELECT TO public
USING (
    (status = 'completed'::submission_status) OR 
    (user_id = (SELECT auth.uid())) OR 
    (SELECT is_admin())
);

CREATE POLICY "submissions_insert" ON public.submissions
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "submissions_update" ON public.submissions
AS PERMISSIVE FOR UPDATE TO public
USING (
    (user_id = (SELECT auth.uid())) OR 
    (SELECT is_admin())
);

CREATE POLICY "submissions_delete" ON public.submissions
AS PERMISSIVE FOR DELETE TO public
USING (
    (user_id = (SELECT auth.uid())) OR 
    (SELECT is_admin())
);

-- Consolidate challenges policies
DROP POLICY IF EXISTS "challenges_manage" ON public.challenges;
DROP POLICY IF EXISTS "challenges_unified_select" ON public.challenges;

CREATE POLICY "challenges_select" ON public.challenges
AS PERMISSIVE FOR SELECT TO public
USING (
    (status = 'published'::challenge_status) OR 
    (created_by = (SELECT auth.uid())) OR 
    (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = (SELECT auth.uid()) 
        AND users.role = 'admin'::user_role
    ))
);

CREATE POLICY "challenges_insert" ON public.challenges
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (
    (created_by = (SELECT auth.uid())) OR 
    (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = (SELECT auth.uid()) 
        AND users.role = 'admin'::user_role
    ))
);

CREATE POLICY "challenges_update" ON public.challenges
AS PERMISSIVE FOR UPDATE TO public
USING (
    (created_by = (SELECT auth.uid())) OR 
    (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = (SELECT auth.uid()) 
        AND users.role = 'admin'::user_role
    ))
);

CREATE POLICY "challenges_delete" ON public.challenges
AS PERMISSIVE FOR DELETE TO public
USING (
    (created_by = (SELECT auth.uid())) OR 
    (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = (SELECT auth.uid()) 
        AND users.role = 'admin'::user_role
    ))
);

-- Consolidate community_event_tags policies
DROP POLICY IF EXISTS "Allow event organizers to manage tags" ON public.community_event_tags;
DROP POLICY IF EXISTS "Allow public read access to event tags" ON public.community_event_tags;

CREATE POLICY "community_event_tags_select" ON public.community_event_tags
AS PERMISSIVE FOR SELECT TO public
USING (true);

CREATE POLICY "community_event_tags_modify" ON public.community_event_tags
AS PERMISSIVE FOR INSERT TO public
WITH CHECK ((
    SELECT community_events.organizer_id
    FROM community_events
    WHERE community_events.id = community_event_tags.event_id
) = (SELECT auth.uid()));

CREATE POLICY "community_event_tags_update" ON public.community_event_tags
AS PERMISSIVE FOR UPDATE TO public
USING ((
    SELECT community_events.organizer_id
    FROM community_events
    WHERE community_events.id = community_event_tags.event_id
) = (SELECT auth.uid()));

CREATE POLICY "community_event_tags_delete" ON public.community_event_tags
AS PERMISSIVE FOR DELETE TO public
USING ((
    SELECT community_events.organizer_id
    FROM community_events
    WHERE community_events.id = community_event_tags.event_id
) = (SELECT auth.uid()));

-- =====================================================
-- VERIFICATION: List all remaining policies to review
-- =====================================================

-- This query will help verify the changes (run manually):
-- SELECT 
--     schemaname,
--     tablename,
--     policyname,
--     permissive,
--     roles,
--     cmd,
--     qual
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd, policyname;