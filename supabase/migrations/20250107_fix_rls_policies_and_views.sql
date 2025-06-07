-- Fix multiple permissive policies and security definer views
-- Based on Supabase linter warnings

-- 1. Fix categories table policies
-- Drop existing policies
DROP POLICY IF EXISTS "categories_admin_manage" ON public.categories;
DROP POLICY IF EXISTS "categories_unified_select" ON public.categories;

-- Create a single combined SELECT policy
CREATE POLICY "categories_select_combined" ON public.categories
FOR SELECT
USING (
  -- General select access 
  true
);

-- Keep other operation policies separate for admin-only operations
CREATE POLICY "categories_admin_insert" ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'::user_role
  )
);

CREATE POLICY "categories_admin_update" ON public.categories
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'::user_role
  )
);

CREATE POLICY "categories_admin_delete" ON public.categories
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'::user_role
  )
);

-- 2. Fix challenge_tags table policies
DROP POLICY IF EXISTS "challenge_tags_manage" ON public.challenge_tags;
DROP POLICY IF EXISTS "challenge_tags_unified_select" ON public.challenge_tags;

-- Create a single combined SELECT policy
CREATE POLICY "challenge_tags_select_combined" ON public.challenge_tags
FOR SELECT
USING (
  -- General select access
  true
);

-- Keep other operation policies separate
CREATE POLICY "challenge_tags_manage_insert" ON public.challenge_tags
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_id
    AND c.created_by = auth.uid()
  )
);

CREATE POLICY "challenge_tags_manage_update" ON public.challenge_tags
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_id
    AND c.created_by = auth.uid()
  )
);

CREATE POLICY "challenge_tags_manage_delete" ON public.challenge_tags
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_id
    AND c.created_by = auth.uid()
  )
);

-- 3. Fix challenges table policies
DROP POLICY IF EXISTS "challenges_manage" ON public.challenges;
DROP POLICY IF EXISTS "challenges_unified_select" ON public.challenges;

-- Create a single combined SELECT policy
CREATE POLICY "challenges_select_combined" ON public.challenges
FOR SELECT
USING (
  -- Published challenges or own challenges or admin
  status = 'published'::challenge_status 
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'::user_role
  )
);

-- Keep other operation policies separate
CREATE POLICY "challenges_manage_insert" ON public.challenges
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'::user_role
  )
);

CREATE POLICY "challenges_manage_update" ON public.challenges
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'::user_role
  )
);

CREATE POLICY "challenges_manage_delete" ON public.challenges
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'::user_role
  )
);

-- 4. Fix community_event_tags table policies
DROP POLICY IF EXISTS "Allow event organizers to manage tags" ON public.community_event_tags;
DROP POLICY IF EXISTS "Allow public read access to event tags" ON public.community_event_tags;

-- Create a single combined SELECT policy
CREATE POLICY "community_event_tags_select_combined" ON public.community_event_tags
FOR SELECT
USING (
  -- Public read access
  true
);

-- Keep management policies for other operations
CREATE POLICY "community_event_tags_organizer_insert" ON public.community_event_tags
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT organizer_id FROM public.community_events WHERE id = event_id) = auth.uid()
);

CREATE POLICY "community_event_tags_organizer_update" ON public.community_event_tags
FOR UPDATE
TO authenticated
USING (
  (SELECT organizer_id FROM public.community_events WHERE id = event_id) = auth.uid()
);

CREATE POLICY "community_event_tags_organizer_delete" ON public.community_event_tags
FOR DELETE
TO authenticated
USING (
  (SELECT organizer_id FROM public.community_events WHERE id = event_id) = auth.uid()
);

-- 5. Fix submissions table policies
DROP POLICY IF EXISTS "submissions_manage" ON public.submissions;
DROP POLICY IF EXISTS "submissions_unified_select" ON public.submissions;

-- Create a single combined SELECT policy
CREATE POLICY "submissions_select_combined" ON public.submissions
FOR SELECT
USING (
  -- Completed submissions or own submissions or admin
  status = 'completed'::submission_status
  OR user_id = auth.uid()
  OR is_admin()
);

-- Keep other operation policies separate
CREATE POLICY "submissions_manage_insert" ON public.submissions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR is_admin()
);

CREATE POLICY "submissions_manage_update" ON public.submissions
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR is_admin()
);

CREATE POLICY "submissions_manage_delete" ON public.submissions
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR is_admin()
);

-- 6. Fix tag_votes table policies
DROP POLICY IF EXISTS "tag_votes_manage" ON public.tag_votes;
DROP POLICY IF EXISTS "tag_votes_unified_select" ON public.tag_votes;

-- Create a single combined SELECT policy
CREATE POLICY "tag_votes_select_combined" ON public.tag_votes
FOR SELECT
USING (
  -- General select access
  true
);

-- Keep other operation policies separate
CREATE POLICY "tag_votes_manage_insert" ON public.tag_votes
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "tag_votes_manage_update" ON public.tag_votes
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
);

CREATE POLICY "tag_votes_manage_delete" ON public.tag_votes
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
);

-- 7. Fix tags table policies
DROP POLICY IF EXISTS "tags_manage" ON public.tags;
DROP POLICY IF EXISTS "tags_unified_select" ON public.tags;

-- Create a single combined SELECT policy
CREATE POLICY "tags_select_combined" ON public.tags
FOR SELECT
USING (
  -- Active or verified tags
  status = ANY(ARRAY['active'::tag_status, 'verified'::tag_status])
);

-- Keep other operation policies separate
CREATE POLICY "tags_manage_insert" ON public.tags
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'::user_role
  )
);

CREATE POLICY "tags_manage_update" ON public.tags
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'::user_role
  )
);

CREATE POLICY "tags_manage_delete" ON public.tags
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'::user_role
  )
);

-- 8. Fix security definer views
-- Convert views to security invoker
ALTER VIEW public.leaderboards SET (security_invoker = true);
ALTER VIEW public.public_boards SET (security_invoker = true);
ALTER VIEW public.session_stats SET (security_invoker = true);