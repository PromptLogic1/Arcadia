-- Users Tabelle (Basis für Auth und Profile)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user' NOT NULL,
    experience_points INTEGER DEFAULT 0 NOT NULL,
    preferred_language programming_language,
    github_username TEXT,
    bio TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
) INHERITS (base_table);

-- Games Tabelle (Basis für alle spielbezogenen Features)
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0
) INHERITS (base_table);

-- Categories (für Spiele und Challenges)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon_name TEXT,
    parent_id UUID REFERENCES categories(id),
    display_order INTEGER DEFAULT 0
) INHERITS (base_table);

-- Tags (für Challenges, Discussions, etc.)
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    type TEXT NOT NULL, -- 'challenge', 'discussion', 'event'
    color TEXT
) INHERITS (base_table);

-- Achievements (Basis für Gamification)
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon_url TEXT,
    points INTEGER DEFAULT 0 NOT NULL,
    criteria JSONB NOT NULL,
    category TEXT NOT NULL -- 'challenge', 'community', 'event'
) INHERITS (base_table);

-- User Achievements
CREATE TABLE user_achievements (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, achievement_id)
);