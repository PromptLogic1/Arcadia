-- First, drop existing tables and types if they exist
DROP TABLE IF EXISTS bingoboards CASCADE;

-- Create the bingo boards table
CREATE TABLE bingoboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES users(id),
    board_title TEXT NOT NULL,
    board_description TEXT,
    board_size INTEGER NOT NULL CHECK (board_size BETWEEN 3 AND 6), 
    board_layoutbingocards JSONB DEFAULT '[]' NOT NULL,
    board_tags JSONB DEFAULT '[]' NOT NULL,
    board_game_type game_category NOT NULL,
    board_difficulty difficulty DEFAULT 'medium' NOT NULL,
    cloned_from UUID REFERENCES bingoboards(id),
    votes INTEGER DEFAULT 0 NOT NULL,
    is_public BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    generated_by_ai BOOLEAN DEFAULT false NOT NULL,
    -- Constraints
    CONSTRAINT tags_limit CHECK (jsonb_array_length(board_tags) <= 5),
    CONSTRAINT title_length CHECK (char_length(board_title) BETWEEN 3 AND 50),
    CONSTRAINT description_length CHECK (char_length(board_description) BETWEEN 0 AND 255)
) INHERITS (base_table);

-- Add indices
CREATE INDEX idx_bingoboards_creator_id ON bingoboards (creator_id);
CREATE INDEX idx_bingoboards_is_public ON bingoboards (is_public);
CREATE INDEX idx_bingoboards_deleted_at ON bingoboards (deleted_at);
CREATE INDEX idx_bingoboards_game ON bingoboards(game_type);
CREATE INDEX idx_bingoboards_public_available
   ON bingoboards (is_public) 
   WHERE deleted_at IS NULL;

-- Enable RLS on bingoboards
ALTER TABLE bingoboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Board is viewable by public"
  ON bingoboards FOR SELECT
  USING (deleted_at IS NULL AND is_public = true);

CREATE POLICY "Board is viewable by creator"
  ON bingoboards FOR SELECT
  USING (
    creator_id = (SELECT id FROM users WHERE auth_id = auth.uid()) 
    AND (is_public = false OR deleted_at IS NOT NULL)
  );

CREATE POLICY "Board is not visible if deleted"
  ON bingoboards FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create bingo boards" 
    ON bingoboards 
    FOR INSERT 
    WITH CHECK (
        -- Check that the auth_id matches the creator_id of the users table
        EXISTS (
            SELECT 1 
            FROM users 
            WHERE auth_id = auth.uid()  -- Get the auth_id from auth system
              AND id = creator_id        -- Ensure it matches the creator_id of bingoboards
        )
    );

CREATE POLICY "Users can update own bingo boards" 
    ON bingoboards 
    FOR UPDATE 
    USING (
        -- Check if the user attempting to update the board is the creator
        EXISTS (
            SELECT 1 
            FROM users 
            WHERE auth_id = auth.uid()  -- Get the auth_id from auth system
              AND id = creator_id        -- Ensure it matches the creator_id of bingoboards
        )
    );