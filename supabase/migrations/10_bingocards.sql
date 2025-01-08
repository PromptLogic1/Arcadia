-- First, drop existing tables and types if they exist
DROP TABLE IF EXISTS bingocards CASCADE;

-- Create the bingo boards table
CREATE TABLE bingocards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES users(id),
    card_content TEXT NOT NULL,
    card_explanation TEXT,
    card_tags JSONB DEFAULT '[]' NOT NULL,
    card_type card_category NOT NULL,
    card_difficulty difficulty DEFAULT 'medium' NOT NULL,
    votes INTEGER DEFAULT 0 NOT NULL,
    is_public BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    generated_by_ai BOOLEAN DEFAULT false NOT NULL,
    -- Constraints
    CONSTRAINT tags_limit CHECK (jsonb_array_length(card_tags) <= 5),
    CONSTRAINT card_content_length CHECK (char_length(card_content) BETWEEN 0 AND 255)
) INHERITS (base_table);

-- Add indices
CREATE INDEX idx_bingocards_creator_id ON bingocards (creator_id);
CREATE INDEX idx_bingocards_is_public ON bingocards (is_public);
CREATE INDEX idx_bingocards_deleted_at ON bingocards (deleted_at);
CREATE INDEX idx_bingocards_public_available
   ON bingocards (is_public) 
   WHERE deleted_at IS NULL;

-- Enable RLS on bingocards
ALTER TABLE bingocards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Card is viewable by public"
  ON bingocards FOR SELECT
  USING (deleted_at IS NULL AND is_public = true);

CREATE POLICY "Card is viewable by creator"
  ON bingocards FOR SELECT
  USING (
    creator_id = (SELECT id FROM users WHERE auth_id = auth.uid()) 
    AND (is_public = false OR deleted_at IS NOT NULL)
  );

CREATE POLICY "Card is not visible if deleted"
  ON bingocards FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create Card boards" 
    ON bingocards 
    FOR INSERT 
    WITH CHECK (
        -- Check that the auth_id matches the creator_id of the users table
        EXISTS (
            SELECT 1 
            FROM users 
            WHERE auth_id = auth.uid()  -- Get the auth_id from auth system
              AND id = creator_id        -- Ensure it matches the creator_id of bingocards
        )
    );

CREATE POLICY "Users can update own bingo cards" 
    ON bingocards 
    FOR UPDATE 
    USING (
        -- Check if the user attempting to update the board is the creator
        EXISTS (
            SELECT 1 
            FROM users 
            WHERE auth_id = auth.uid()  -- Get the auth_id from auth system
              AND id = creator_id        -- Ensure it matches the creator_id of bingocards
        )
    );