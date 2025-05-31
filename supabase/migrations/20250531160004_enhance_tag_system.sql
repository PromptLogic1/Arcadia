-- =============================================================================
-- ENHANCE TAG SYSTEM
-- Safely migrate existing tag types and add new gaming-focused tags
-- =============================================================================

-- Step 1: Create new tag_type enum with expanded values
CREATE TYPE tag_type_new AS ENUM (
    'category',
    'difficulty', 
    'theme',
    'mechanic',
    'custom',
    -- Keep legacy values for existing data
    'core',
    'game', 
    'community'
);

-- Step 2: Update the table to use the new enum
ALTER TABLE tags 
ALTER COLUMN type TYPE tag_type_new USING type::text::tag_type_new;

-- Step 3: Drop old enum and rename new one
DROP TYPE tag_type;
ALTER TYPE tag_type_new RENAME TO tag_type;

-- Step 4: Create new tag_status enum (mapping existing statuses)
CREATE TYPE tag_status_new AS ENUM (
    'active',
    'pending',
    'rejected', 
    'archived',
    -- Keep legacy values for existing data
    'proposed',
    'verified',
    'suspended'
);

-- Step 5: Update tag_status
ALTER TABLE tags 
ALTER COLUMN status TYPE tag_status_new USING status::text::tag_status_new;

-- Step 6: Drop old enum and rename
DROP TYPE tag_status;
ALTER TYPE tag_status_new RENAME TO tag_status;

-- Step 7: Add missing columns to tags table
ALTER TABLE tags 
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS color TEXT;

-- Step 8: Update existing tags usage count (count how many times they're referenced)
UPDATE tags SET usage_count = (
    SELECT COUNT(*) 
    FROM bingo_cards bc 
    WHERE tags.name = ANY(bc.tags)
);

-- Step 9: Add new gaming-focused tags
INSERT INTO tags (name, description, type, status, color) VALUES
('beginnerFriendly', 'Suitable for new players', 'difficulty', 'active', '#22c55e'),
('endgame', 'Late game content', 'difficulty', 'active', '#dc2626'),
('collectible', 'Involves collecting items', 'mechanic', 'active', '#f59e0b'),
('combat', 'Involves fighting mechanics', 'mechanic', 'active', '#ef4444'),
('exploration', 'Involves exploring the world', 'mechanic', 'active', '#10b981'),
('story', 'Story-focused content', 'theme', 'active', '#8b5cf6'),
('multiplayer', 'Multiplayer content', 'category', 'active', '#3b82f6'),
('solo', 'Single player content', 'category', 'active', '#6b7280')
ON CONFLICT (name) DO NOTHING;