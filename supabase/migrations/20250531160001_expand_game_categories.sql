-- =============================================================================
-- EXPAND GAME CATEGORIES ENUM
-- Safely add new games to the existing game_category enum
-- =============================================================================

-- Add new game categories to the existing enum
-- This is safe since we have no existing bingo_boards data
ALTER TYPE game_category ADD VALUE 'CS:GO';
ALTER TYPE game_category ADD VALUE 'Dota 2';
ALTER TYPE game_category ADD VALUE 'Rocket League';
ALTER TYPE game_category ADD VALUE 'Fall Guys';
ALTER TYPE game_category ADD VALUE 'Dead by Daylight';
ALTER TYPE game_category ADD VALUE 'Cyberpunk 2077';
ALTER TYPE game_category ADD VALUE 'The Witcher 3';
ALTER TYPE game_category ADD VALUE 'Elden Ring';
ALTER TYPE game_category ADD VALUE 'Dark Souls';
ALTER TYPE game_category ADD VALUE 'Bloodborne';
ALTER TYPE game_category ADD VALUE 'Sekiro';
ALTER TYPE game_category ADD VALUE 'Hollow Knight';
ALTER TYPE game_category ADD VALUE 'Celeste';
ALTER TYPE game_category ADD VALUE 'Hades';
ALTER TYPE game_category ADD VALUE 'The Binding of Isaac';
ALTER TYPE game_category ADD VALUE 'Risk of Rain 2';
ALTER TYPE game_category ADD VALUE 'Deep Rock Galactic';
ALTER TYPE game_category ADD VALUE 'Valheim';
ALTER TYPE game_category ADD VALUE 'Subnautica';
ALTER TYPE game_category ADD VALUE 'No Man''s Sky';
ALTER TYPE game_category ADD VALUE 'Terraria';
ALTER TYPE game_category ADD VALUE 'Stardew Valley';
ALTER TYPE game_category ADD VALUE 'Animal Crossing';
ALTER TYPE game_category ADD VALUE 'Splatoon 3';
ALTER TYPE game_category ADD VALUE 'Super Mario Odyssey';
ALTER TYPE game_category ADD VALUE 'The Legend of Zelda: Breath of the Wild';
ALTER TYPE game_category ADD VALUE 'Super Smash Bros. Ultimate';