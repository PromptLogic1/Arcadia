-- Add missing columns to bingo_cards table to match code expectations
-- This is a temporary fix for the architectural mismatch between code and schema

ALTER TABLE public.bingo_cards
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS difficulty difficulty_level DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS votes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags text[];

-- Update existing rows to use text as title
UPDATE public.bingo_cards
SET title = text
WHERE title IS NULL;

-- Add NOT NULL constraint after populating data
ALTER TABLE public.bingo_cards
ALTER COLUMN title SET NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bingo_cards_votes ON public.bingo_cards(votes DESC);
CREATE INDEX IF NOT EXISTS idx_bingo_cards_difficulty ON public.bingo_cards(difficulty);

-- Add RLS policy for voting
CREATE POLICY "bingo_cards_vote_update" ON public.bingo_cards
    FOR UPDATE 
    USING (true) -- Anyone can vote
    WITH CHECK (true);