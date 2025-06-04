-- Create a view alias for discussion_comments as 'comments' to match code expectations
CREATE OR REPLACE VIEW public.comments AS
SELECT 
    id,
    discussion_id,
    author_id,
    content,
    created_at,
    updated_at,
    0 as upvotes -- Add upvotes field with default value
FROM public.discussion_comments;

-- Grant appropriate permissions
GRANT SELECT ON public.comments TO anon, authenticated;