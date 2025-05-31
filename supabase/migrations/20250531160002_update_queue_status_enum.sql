-- =============================================================================
-- UPDATE QUEUE STATUS ENUM
-- Replace queue_status enum with the proper gaming session values
-- Safe since bingo_session_queue table is empty
-- =============================================================================

-- Since the table is empty, we can safely replace the enum
-- First, let's create the new enum
CREATE TYPE queue_status_new AS ENUM (
    'waiting',
    'matched', 
    'cancelled'
);

-- Update the table to use the new enum
ALTER TABLE bingo_session_queue 
ALTER COLUMN status TYPE queue_status_new USING status::text::queue_status_new;

-- Drop the old enum and rename the new one
DROP TYPE queue_status;
ALTER TYPE queue_status_new RENAME TO queue_status;

-- Update the default value
ALTER TABLE bingo_session_queue 
ALTER COLUMN status SET DEFAULT 'waiting';