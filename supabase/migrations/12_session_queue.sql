-- Create join queue table
CREATE TABLE bingo_session_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES bingo_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    player_name TEXT NOT NULL,
    color TEXT NOT NULL,
    team INTEGER,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    processed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(session_id, user_id)
) INHERITS (base_table);

-- Add index for queue processing
CREATE INDEX idx_session_queue_status ON bingo_session_queue(status, requested_at);

-- Add RLS policies
ALTER TABLE bingo_session_queue ENABLE ROW LEVEL SECURITY;

-- Everyone can view their own queue entries
CREATE POLICY "Users can view their own queue entries"
    ON bingo_session_queue FOR SELECT
    USING (auth.uid()::uuid = user_id);

-- Session creator can view all queue entries for their session
CREATE POLICY "Session creators can view all queue entries"
    ON bingo_session_queue FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bingo_sessions s
            JOIN bingo_boards b ON s.board_id = b.id
            WHERE s.id = bingo_session_queue.session_id
            AND b.creator_id = auth.uid()::uuid
        )
    );

-- Users can create queue entries
CREATE POLICY "Users can create queue entries"
    ON bingo_session_queue FOR INSERT
    WITH CHECK (auth.uid()::uuid = user_id);

-- Only session creator can update queue entries
CREATE POLICY "Session creators can update queue entries"
    ON bingo_session_queue FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM bingo_sessions s
            JOIN bingo_boards b ON s.board_id = b.id
            WHERE s.id = bingo_session_queue.session_id
            AND b.creator_id = auth.uid()::uuid
        )
    );

-- Function to process join queue
CREATE OR REPLACE FUNCTION process_join_queue() 
RETURNS TRIGGER AS $$
DECLARE
    player_count INTEGER;
    queue_entry RECORD;
BEGIN
    -- Get current player count
    SELECT COUNT(*) INTO player_count
    FROM bingo_session_players
    WHERE session_id = NEW.session_id;

    -- Check if there's room for more players
    IF player_count >= 8 THEN
        -- Reject all pending requests if session is full
        UPDATE bingo_session_queue
        SET 
            status = 'rejected',
            processed_at = NOW()
        WHERE session_id = NEW.session_id
        AND status = 'pending';
        
        RETURN NULL;
    END IF;

    -- Process queue in FIFO order
    FOR queue_entry IN
        SELECT * FROM bingo_session_queue
        WHERE session_id = NEW.session_id
        AND status = 'pending'
        ORDER BY requested_at ASC
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Check if color is still available
        IF NOT EXISTS (
            SELECT 1 FROM bingo_session_players
            WHERE session_id = queue_entry.session_id
            AND color = queue_entry.color
        ) THEN
            -- Add player to session
            INSERT INTO bingo_session_players (
                session_id,
                user_id,
                player_name,
                color,
                team,
                joined_at
            ) VALUES (
                queue_entry.session_id,
                queue_entry.user_id,
                queue_entry.player_name,
                queue_entry.color,
                queue_entry.team,
                NOW()
            );

            -- Update queue entry status
            UPDATE bingo_session_queue
            SET 
                status = 'approved',
                processed_at = NOW()
            WHERE id = queue_entry.id;
        ELSE
            -- Color taken, reject request
            UPDATE bingo_session_queue
            SET 
                status = 'rejected',
                processed_at = NOW()
            WHERE id = queue_entry.id;
        END IF;

        -- Update player count
        SELECT COUNT(*) INTO player_count
        FROM bingo_session_players
        WHERE session_id = NEW.session_id;

        -- Stop if session is full
        IF player_count >= 8 THEN
            EXIT;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to process queue on new entries
CREATE TRIGGER process_join_queue_trigger
    AFTER INSERT ON bingo_session_queue
    FOR EACH ROW
    EXECUTE FUNCTION process_join_queue(); 