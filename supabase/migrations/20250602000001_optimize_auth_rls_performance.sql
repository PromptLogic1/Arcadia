-- Optimize RLS policies to prevent re-evaluation of auth functions
-- Replace auth.uid() with (select auth.uid()) for better performance

-- Categories table policies
DROP POLICY IF EXISTS "categories_admin_manage" ON public.categories;
CREATE POLICY "categories_admin_manage" ON public.categories
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );

-- Tags table policies  
DROP POLICY IF EXISTS "tags_manage" ON public.tags;
CREATE POLICY "tags_manage" ON public.tags
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );

-- Challenges table policies
DROP POLICY IF EXISTS "challenges_manage" ON public.challenges;
CREATE POLICY "challenges_manage" ON public.challenges
    FOR ALL 
    USING (
        creator_id = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS "challenges_unified_select" ON public.challenges;
CREATE POLICY "challenges_unified_select" ON public.challenges
    FOR SELECT 
    USING (
        status = 'published'
        OR creator_id = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );

-- Challenge tags table policies
DROP POLICY IF EXISTS "challenge_tags_manage" ON public.challenge_tags;
CREATE POLICY "challenge_tags_manage" ON public.challenge_tags
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM challenges c 
            WHERE c.id = challenge_id 
            AND (c.creator_id = (select auth.uid()) OR EXISTS (
                SELECT 1 FROM users 
                WHERE id = (select auth.uid()) 
                AND role IN ('admin', 'moderator')
            ))
        )
    );

-- Submissions table policies
DROP POLICY IF EXISTS "submissions_manage" ON public.submissions;
CREATE POLICY "submissions_manage" ON public.submissions
    FOR ALL 
    USING (
        user_id = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS "submissions_unified_select" ON public.submissions;
CREATE POLICY "submissions_unified_select" ON public.submissions
    FOR SELECT 
    USING (
        user_id = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM challenges c 
            WHERE c.id = challenge_id 
            AND c.creator_id = (select auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );

-- Bingo cards table policies
DROP POLICY IF EXISTS "bingo_cards_delete" ON public.bingo_cards;
CREATE POLICY "bingo_cards_delete" ON public.bingo_cards
    FOR DELETE 
    USING (
        creator_id = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS "bingo_cards_insert" ON public.bingo_cards;
CREATE POLICY "bingo_cards_insert" ON public.bingo_cards
    FOR INSERT 
    WITH CHECK (
        creator_id = (select auth.uid())
    );

DROP POLICY IF EXISTS "bingo_cards_unified_select" ON public.bingo_cards;
CREATE POLICY "bingo_cards_unified_select" ON public.bingo_cards
    FOR SELECT 
    USING (
        is_public = true
        OR creator_id = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS "bingo_cards_update" ON public.bingo_cards;
CREATE POLICY "bingo_cards_update" ON public.bingo_cards
    FOR UPDATE 
    USING (
        creator_id = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );

-- Bingo session queue policies
DROP POLICY IF EXISTS "session_queue_delete" ON public.bingo_session_queue;
CREATE POLICY "session_queue_delete" ON public.bingo_session_queue
    FOR DELETE 
    USING (
        user_id = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS "session_queue_insert" ON public.bingo_session_queue;
CREATE POLICY "session_queue_insert" ON public.bingo_session_queue
    FOR INSERT 
    WITH CHECK (
        user_id = (select auth.uid())
    );

DROP POLICY IF EXISTS "session_queue_unified_select" ON public.bingo_session_queue;
CREATE POLICY "session_queue_unified_select" ON public.bingo_session_queue
    FOR SELECT 
    USING (
        user_id = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS "session_queue_update" ON public.bingo_session_queue;
CREATE POLICY "session_queue_update" ON public.bingo_session_queue
    FOR UPDATE 
    USING (
        user_id = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );

-- Tag votes table policies
DROP POLICY IF EXISTS "tag_votes_manage" ON public.tag_votes;
CREATE POLICY "tag_votes_manage" ON public.tag_votes
    FOR ALL 
    USING (
        voter_id = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'moderator')
        )
    );