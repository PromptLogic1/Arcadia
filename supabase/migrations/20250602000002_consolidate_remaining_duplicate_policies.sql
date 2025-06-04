-- Consolidate remaining duplicate RLS policies for performance optimization
-- Remove redundant policies and keep only the most comprehensive ones

-- Categories table - remove duplicate and keep optimized unified policy
DROP POLICY IF EXISTS "categories_admin_manage" ON public.categories;
-- Keep the unified_select policy as it covers the necessary access patterns

-- Tags table - remove duplicate and keep optimized unified policy  
DROP POLICY IF EXISTS "tags_manage" ON public.tags;
-- Keep the unified_select policy as it covers the necessary access patterns

-- Challenges table - remove duplicate and keep optimized unified policy
DROP POLICY IF EXISTS "challenges_manage" ON public.challenges;
-- Keep the unified_select policy as it covers the necessary access patterns

-- Challenge tags table - remove duplicate and keep optimized unified policy
DROP POLICY IF EXISTS "challenge_tags_manage" ON public.challenge_tags;
-- Keep the unified_select policy as it covers the necessary access patterns

-- Submissions table - remove duplicate and keep optimized unified policy
DROP POLICY IF EXISTS "submissions_manage" ON public.submissions;
-- Keep the unified_select policy as it covers the necessary access patterns

-- Tag votes table - remove duplicate and keep optimized unified policy
DROP POLICY IF EXISTS "tag_votes_manage" ON public.tag_votes;
-- Keep the unified_select policy as it covers the necessary access patterns

-- Note: For bingo_cards and bingo_session_queue, the separate policies for
-- different operations (INSERT, UPDATE, DELETE, SELECT) are intentional
-- and provide better security granularity, so we keep them separate.