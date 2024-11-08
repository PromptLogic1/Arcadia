-- Challenge System with improved validation and constraints
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    difficulty challenge_difficulty NOT NULL,
    status challenge_status DEFAULT 'draft' NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    game_id UUID REFERENCES games(id),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_cases JSONB NOT NULL DEFAULT '[]',
    initial_code JSONB NOT NULL DEFAULT '{}',
    solution_code JSONB,
    time_limit_ms INTEGER DEFAULT 5000 NOT NULL,
    memory_limit_mb INTEGER DEFAULT 512 NOT NULL,
    points INTEGER DEFAULT 100 NOT NULL,
    success_rate REAL DEFAULT 0 NOT NULL,
    is_premium BOOLEAN DEFAULT false NOT NULL,
    CONSTRAINT title_length CHECK (char_length(title) BETWEEN 3 AND 100),
    CONSTRAINT description_length CHECK (char_length(description) >= 10),
    CONSTRAINT valid_time_limit CHECK (time_limit_ms BETWEEN 1000 AND 30000),
    CONSTRAINT valid_memory_limit CHECK (memory_limit_mb BETWEEN 128 AND 1024),
    CONSTRAINT valid_points CHECK (points BETWEEN 0 AND 1000),
    CONSTRAINT valid_success_rate CHECK (success_rate BETWEEN 0 AND 100)
) INHERITS (base_table);

-- Submissions with improved validation
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
    points_earned INTEGER DEFAULT 0 NOT NULL,
    CONSTRAINT valid_code_length CHECK (char_length(code) > 0),
    CONSTRAINT valid_execution_time CHECK (execution_time_ms >= 0),
    CONSTRAINT valid_memory_used CHECK (memory_used_mb >= 0),
    CONSTRAINT valid_points_earned CHECK (points_earned >= 0)
) INHERITS (base_table);

-- Bingo System with improved validation
CREATE TABLE bingo_boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    game_id UUID REFERENCES games(id),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    size INTEGER NOT NULL CHECK (size BETWEEN 3 AND 6),
    time_limit INTEGER DEFAULT 300 NOT NULL,
    win_conditions JSONB DEFAULT '{"line": true, "majority": false}' NOT NULL,
    status board_status DEFAULT 'draft' NOT NULL,
    votes INTEGER DEFAULT 0 NOT NULL,
    bookmarked_count INTEGER DEFAULT 0 NOT NULL,
    CONSTRAINT title_length CHECK (char_length(title) BETWEEN 3 AND 50),
    CONSTRAINT valid_time_limit CHECK (time_limit BETWEEN 60 AND 3600),
    CONSTRAINT valid_votes CHECK (votes >= 0),
    CONSTRAINT valid_bookmarks CHECK (bookmarked_count >= 0)
) INHERITS (base_table);

-- Add validation trigger for win_conditions
CREATE OR REPLACE FUNCTION validate_win_conditions()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT (
        NEW.win_conditions ? 'line' AND 
        NEW.win_conditions ? 'majority' AND
        jsonb_typeof(NEW.win_conditions->'line') = 'boolean' AND
        jsonb_typeof(NEW.win_conditions->'majority') = 'boolean'
    ) THEN
        RAISE EXCEPTION 'Invalid win_conditions format';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_win_conditions_trigger
    BEFORE INSERT OR UPDATE ON bingo_boards
    FOR EACH ROW
    EXECUTE FUNCTION validate_win_conditions();