-- =============================================================================
-- CREATE BINGO QUEUE ENTRIES TABLE
-- Matchmaking queue for automatic player matching
-- =============================================================================

-- Create bingo_queue_entries table for matchmaking
CREATE TABLE bingo_queue_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    board_id UUID NOT NULL REFERENCES bingo_boards(id) ON DELETE CASCADE,
    status queue_status DEFAULT 'waiting',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_bingo_queue_entries_status ON bingo_queue_entries(status);
CREATE INDEX idx_bingo_queue_entries_board_id ON bingo_queue_entries(board_id);
CREATE INDEX idx_bingo_queue_entries_created_at ON bingo_queue_entries(created_at);
CREATE INDEX idx_bingo_queue_entries_user_board ON bingo_queue_entries(user_id, board_id);

-- Add RLS policies
ALTER TABLE bingo_queue_entries ENABLE ROW LEVEL SECURITY;

-- Users can see their own queue entries
CREATE POLICY "Users can view own queue entries" ON bingo_queue_entries
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own queue entries
CREATE POLICY "Users can insert own queue entries" ON bingo_queue_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own queue entries
CREATE POLICY "Users can update own queue entries" ON bingo_queue_entries
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage all queue entries for processing
CREATE POLICY "Service role can manage queue entries" ON bingo_queue_entries
    FOR ALL USING (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE TRIGGER update_bingo_queue_entries_updated_at
    BEFORE UPDATE ON bingo_queue_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE bingo_queue_entries IS 'Matchmaking queue for automatic player matching based on board and preferences';