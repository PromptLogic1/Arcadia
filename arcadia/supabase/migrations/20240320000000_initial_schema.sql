-- Zuerst alle existierenden Tabellen und Typen löschen
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS challenge_tags CASCADE;
DROP TABLE IF EXISTS challenges CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS base_table CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS challenge_difficulty CASCADE;
DROP TYPE IF EXISTS challenge_status CASCADE;
DROP TYPE IF EXISTS submission_status CASCADE;
DROP TYPE IF EXISTS programming_language CASCADE;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum types for better data consistency
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
CREATE TYPE challenge_difficulty AS ENUM ('beginner', 'easy', 'medium', 'hard', 'expert');
CREATE TYPE challenge_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE submission_status AS ENUM ('pending', 'running', 'completed', 'failed', 'timeout');
CREATE TYPE programming_language AS ENUM ('javascript', 'typescript', 'python', 'java', 'cpp', 'rust');

-- Base table for timestamps
CREATE TABLE base_table (
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Users table with enhanced profile
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
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

-- Categories for organizing challenges
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon_name TEXT,
    parent_id UUID REFERENCES categories(id),
    display_order INTEGER DEFAULT 0
) INHERITS (base_table);

-- Tags for challenges
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT
) INHERITS (base_table);

-- Main challenges table
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    difficulty challenge_difficulty NOT NULL,
    status challenge_status DEFAULT 'draft' NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_cases JSONB NOT NULL DEFAULT '[]',
    initial_code JSONB NOT NULL DEFAULT '{}',
    solution_code JSONB,
    time_limit_ms INTEGER DEFAULT 5000 NOT NULL,
    memory_limit_mb INTEGER DEFAULT 512 NOT NULL,
    points INTEGER DEFAULT 100 NOT NULL,
    success_rate REAL DEFAULT 0 NOT NULL,
    is_premium BOOLEAN DEFAULT false NOT NULL,
    CONSTRAINT title_length CHECK (char_length(title) >= 3)
) INHERITS (base_table);

-- Challenge-Tag relationship
CREATE TABLE challenge_tags (
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (challenge_id, tag_id)
);

-- User submissions
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language programming_language NOT NULL,
    code TEXT NOT NULL,
    status submission_status DEFAULT 'pending' NOT NULL,
    execution_time_ms INTEGER,
    memory_used_mb INTEGER,
    test_results JSONB,
    error_message TEXT,
    points_earned INTEGER DEFAULT 0 NOT NULL
) INHERITS (base_table);

-- User progress tracking
CREATE TABLE user_progress (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false NOT NULL,
    attempts_count INTEGER DEFAULT 0 NOT NULL,
    best_submission_id UUID REFERENCES submissions(id),
    last_attempted_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, challenge_id)
) INHERITS (base_table);

-- User achievements
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon_url TEXT,
    points INTEGER DEFAULT 0 NOT NULL,
    criteria JSONB NOT NULL
) INHERITS (base_table);

CREATE TABLE user_achievements (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, achievement_id)
);

-- Comments on challenges
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_solution BOOLEAN DEFAULT false NOT NULL,
    is_pinned BOOLEAN DEFAULT false NOT NULL,
    CONSTRAINT content_length CHECK (char_length(content) >= 1)
) INHERITS (base_table);

-- Indexes for better query performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_challenges_slug ON challenges(slug);
CREATE INDEX idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_category ON challenges(category_id);
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_challenge ON submissions(challenge_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_comments_challenge ON comments(challenge_id);
CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- Full-text search indexes
CREATE INDEX idx_challenges_fts ON challenges USING GIN (
    to_tsvector('english', title || ' ' || description)
);
CREATE INDEX idx_tags_fts ON tags USING GIN (
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- Trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update_updated_at trigger to all tables
DO $$ 
DECLARE 
    t text;
BEGIN 
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE' 
    LOOP 
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at 
            BEFORE UPDATE ON %I 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 
            t, t
        );
    END LOOP;
END $$;

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data"
    ON users FOR SELECT
    USING (auth.uid()::uuid = auth_id);

-- Challenges policies
CREATE POLICY "Published challenges are viewable by everyone"
    ON challenges FOR SELECT
    USING (status = 'published' OR auth.uid()::uuid = created_by);

CREATE POLICY "Users can create challenges"
    ON challenges FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::uuid = created_by);

-- Submissions policies
CREATE POLICY "Users can view their own submissions"
    ON submissions FOR SELECT
    USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can create their own submissions"
    ON submissions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::uuid = user_id);

-- Comments policies
CREATE POLICY "Comments are viewable by everyone"
    ON comments FOR SELECT
    USING (true);

CREATE POLICY "Users can create comments"
    ON comments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::uuid = user_id); 