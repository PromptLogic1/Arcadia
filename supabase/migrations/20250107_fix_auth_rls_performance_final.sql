-- Migration: Fix remaining auth.uid() performance issues in RLS policies
-- Date: 2025-01-07
-- Issue: auth.uid() being re-evaluated for each row instead of once per query
-- Solution: Replace auth.uid() with (SELECT auth.uid()) to force single evaluation

-- =====================================================
-- Fix categories table policies (from previous migration)
-- =====================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "categories_admin_insert" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_update" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_delete" ON public.categories;

-- Recreate with optimized auth function calls
CREATE POLICY "categories_admin_insert" ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.role = 'admin'::user_role
  )
);

CREATE POLICY "categories_admin_update" ON public.categories
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.role = 'admin'::user_role
  )
);

CREATE POLICY "categories_admin_delete" ON public.categories
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.role = 'admin'::user_role
  )
);

-- =====================================================
-- Fix tags table policies (from previous migration)
-- =====================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "tags_manage_insert" ON public.tags;
DROP POLICY IF EXISTS "tags_manage_update" ON public.tags;
DROP POLICY IF EXISTS "tags_manage_delete" ON public.tags;

-- Recreate with optimized auth function calls
CREATE POLICY "tags_manage_insert" ON public.tags
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.role = 'admin'::user_role
  )
);

CREATE POLICY "tags_manage_update" ON public.tags
FOR UPDATE
TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.role = 'admin'::user_role
  )
);

CREATE POLICY "tags_manage_delete" ON public.tags
FOR DELETE
TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.role = 'admin'::user_role
  )
);

-- =====================================================
-- Fix challenges table policies (from previous migration)
-- =====================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "challenges_manage_insert" ON public.challenges;
DROP POLICY IF EXISTS "challenges_manage_update" ON public.challenges;
DROP POLICY IF EXISTS "challenges_manage_delete" ON public.challenges;
DROP POLICY IF EXISTS "challenges_select_combined" ON public.challenges;

-- Recreate with optimized auth function calls
CREATE POLICY "challenges_select_combined" ON public.challenges
FOR SELECT
USING (
  -- Published challenges or own challenges or admin
  status = 'published'::challenge_status 
  OR created_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.role = 'admin'::user_role
  )
);

CREATE POLICY "challenges_manage_insert" ON public.challenges
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.role = 'admin'::user_role
  )
);

CREATE POLICY "challenges_manage_update" ON public.challenges
FOR UPDATE
TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.role = 'admin'::user_role
  )
);

CREATE POLICY "challenges_manage_delete" ON public.challenges
FOR DELETE
TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid())
    AND users.role = 'admin'::user_role
  )
);

-- =====================================================
-- Fix challenge_tags table policies (from previous migration)
-- =====================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "challenge_tags_manage_insert" ON public.challenge_tags;
DROP POLICY IF EXISTS "challenge_tags_manage_update" ON public.challenge_tags;
DROP POLICY IF EXISTS "challenge_tags_manage_delete" ON public.challenge_tags;

-- Recreate with optimized auth function calls
CREATE POLICY "challenge_tags_manage_insert" ON public.challenge_tags
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_id
    AND c.created_by = (SELECT auth.uid())
  )
);

CREATE POLICY "challenge_tags_manage_update" ON public.challenge_tags
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_id
    AND c.created_by = (SELECT auth.uid())
  )
);

CREATE POLICY "challenge_tags_manage_delete" ON public.challenge_tags
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_id
    AND c.created_by = (SELECT auth.uid())
  )
);

-- =====================================================
-- Fix submissions table policies (from previous migration)
-- =====================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "submissions_manage_insert" ON public.submissions;
DROP POLICY IF EXISTS "submissions_manage_update" ON public.submissions;
DROP POLICY IF EXISTS "submissions_manage_delete" ON public.submissions;
DROP POLICY IF EXISTS "submissions_select_combined" ON public.submissions;

-- Recreate with optimized auth function calls
CREATE POLICY "submissions_select_combined" ON public.submissions
FOR SELECT
USING (
  -- Completed submissions or own submissions or admin
  status = 'completed'::submission_status
  OR user_id = (SELECT auth.uid())
  OR (SELECT is_admin())
);

CREATE POLICY "submissions_manage_insert" ON public.submissions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR (SELECT is_admin())
);

CREATE POLICY "submissions_manage_update" ON public.submissions
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (SELECT is_admin())
);

CREATE POLICY "submissions_manage_delete" ON public.submissions
FOR DELETE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (SELECT is_admin())
);

-- =====================================================
-- Fix tag_votes table policies (from previous migration)
-- =====================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "tag_votes_manage_insert" ON public.tag_votes;
DROP POLICY IF EXISTS "tag_votes_manage_update" ON public.tag_votes;
DROP POLICY IF EXISTS "tag_votes_manage_delete" ON public.tag_votes;

-- Recreate with optimized auth function calls
CREATE POLICY "tag_votes_manage_insert" ON public.tag_votes
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
);

CREATE POLICY "tag_votes_manage_update" ON public.tag_votes
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
);

CREATE POLICY "tag_votes_manage_delete" ON public.tag_votes
FOR DELETE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
);

-- =====================================================
-- Fix community_event_tags table policies (from previous migration)
-- =====================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "community_event_tags_organizer_insert" ON public.community_event_tags;
DROP POLICY IF EXISTS "community_event_tags_organizer_update" ON public.community_event_tags;
DROP POLICY IF EXISTS "community_event_tags_organizer_delete" ON public.community_event_tags;

-- Recreate with optimized auth function calls
CREATE POLICY "community_event_tags_organizer_insert" ON public.community_event_tags
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT organizer_id FROM public.community_events WHERE id = event_id) = (SELECT auth.uid())
);

CREATE POLICY "community_event_tags_organizer_update" ON public.community_event_tags
FOR UPDATE
TO authenticated
USING (
  (SELECT organizer_id FROM public.community_events WHERE id = event_id) = (SELECT auth.uid())
);

CREATE POLICY "community_event_tags_organizer_delete" ON public.community_event_tags
FOR DELETE
TO authenticated
USING (
  (SELECT organizer_id FROM public.community_events WHERE id = event_id) = (SELECT auth.uid())
);

-- =====================================================
-- VERIFICATION: This query helps verify all policies are optimized
-- =====================================================

-- Run this query manually to check for any remaining auth.uid() calls without SELECT:
-- SELECT 
--     schemaname,
--     tablename,
--     policyname,
--     qual
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- AND (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
-- ORDER BY tablename, policyname;