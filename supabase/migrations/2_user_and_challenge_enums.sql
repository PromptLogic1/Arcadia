-- Basis-Enums für User und Auth
CREATE TYPE user_role AS ENUM (
    'user',
    'moderator',
    'admin'
);

-- Challenge-bezogene Enums
CREATE TYPE difficulty AS ENUM (
    'beginner',
    'easy',
    'medium',
    'hard',
    'expert'
);

CREATE TYPE challenge_status AS ENUM (
    'draft',
    'published',
    'archived'
);

-- Submission und Game Enums
CREATE TYPE submission_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'timeout'
);

CREATE TYPE programming_language AS ENUM (
    'javascript',
    'typescript',
    'python',
    'java',
    'cpp',
    'rust'
);

-- Bingo-spezifische Enums
CREATE TYPE board_status AS ENUM (
    'draft',
    'active',
    'completed',
    'archived'
);

CREATE TYPE cell_difficulty AS ENUM (
    'normal',
    'hard',
    'extreme'
);

CREATE TYPE cell_reward AS ENUM (
    'block',
    'extra_turn',
    'power_up'
);

-- Community-bezogene Enums
CREATE TYPE event_status AS ENUM (
    'upcoming',
    'active',
    'completed',
    'cancelled'
);

CREATE TYPE participant_status AS ENUM (
    'registered',
    'confirmed',
    'checked_in',
    'completed'
);

-- Add to existing enums
CREATE TYPE game_category AS ENUM (
    'World of Warcraft',
    'Fortnite',
    'Minecraft',
    'Among Us',
    'Apex Legends',
    'League of Legends',
    'Overwatch',
    'Call of Duty: Warzone',
    'Valorant'
);

CREATE TYPE card_category AS ENUM (
    'collecting',
    'killing',
    'building',
    'escaping',
    'surviving',
    'winning'
);

-- Basis-Tabelle für Timestamps
CREATE TABLE base_table (
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);