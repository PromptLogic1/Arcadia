-- =============================================================================
-- UPDATE TAG ACTIONS ENUM
-- Update tag_action enum with new standardized values
-- =============================================================================

-- Create new tag_action enum
CREATE TYPE tag_action_new AS ENUM (
    'created',
    'updated',
    'deleted',
    'voted',
    'reported',
    -- Keep legacy values for compatibility
    'create',
    'update', 
    'delete',
    'vote',
    'verify',
    'archive'
);

-- Update the table to use the new enum
ALTER TABLE tag_history 
ALTER COLUMN action TYPE tag_action_new USING action::text::tag_action_new;

-- Drop old enum and rename new one
DROP TYPE tag_action;
ALTER TYPE tag_action_new RENAME TO tag_action;