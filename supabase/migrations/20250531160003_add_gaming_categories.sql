-- =============================================================================
-- ADD GAMING CATEGORIES
-- Add new gaming-focused categories alongside existing tech categories
-- =============================================================================

-- First, add missing columns to categories table to match new schema
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS icon_url TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing categories with sort order to preserve them at the top
UPDATE categories SET sort_order = 0, is_active = true WHERE name = 'Web Development';
UPDATE categories SET sort_order = 10, is_active = true WHERE name = 'Algorithms';
UPDATE categories SET sort_order = 20, is_active = true WHERE name = 'Game Development';
UPDATE categories SET sort_order = 30, is_active = true WHERE name = 'Mobile Development';
UPDATE categories SET sort_order = 40, is_active = true WHERE name = 'Data Science';
UPDATE categories SET sort_order = 50, is_active = true WHERE name = 'DevOps';

-- Insert new gaming categories
INSERT INTO categories (name, description, sort_order, is_active) VALUES
('All Games', 'General gaming category for all games', 100, true),
('Action', 'Fast-paced action games', 110, true),
('Adventure', 'Exploration and story-driven games', 120, true),
('RPG', 'Role-playing games', 130, true),
('Strategy', 'Strategic thinking games', 140, true),
('Simulation', 'Life and world simulation games', 150, true),
('Sports', 'Sports and racing games', 160, true),
('Puzzle', 'Brain teasers and puzzle games', 170, true),
('Indie', 'Independent developer games', 180, true),
('Retro', 'Classic and retro games', 190, true)
ON CONFLICT (name) DO NOTHING;