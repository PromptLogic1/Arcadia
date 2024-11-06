-- Challenge System
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
    CONSTRAINT title_length CHECK (char_length(title) >= 3)
) INHERITS (base_table);

-- Submissions
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

-- Bingo System
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
    bookmarked_count INTEGER DEFAULT 0 NOT NULL
) INHERITS (base_table);

-- Community System
CREATE TABLE discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id UUID REFERENCES games(id),
    challenge_id UUID REFERENCES challenges(id),
    upvotes INTEGER DEFAULT 0 NOT NULL,
    comment_count INTEGER DEFAULT 0 NOT NULL,
    tags TEXT[] DEFAULT '{}'::TEXT[]
) INHERITS (base_table);

-- Comments System
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    upvotes INTEGER DEFAULT 0 NOT NULL,
    is_solution BOOLEAN DEFAULT false NOT NULL,
    is_pinned BOOLEAN DEFAULT false NOT NULL
) INHERITS (base_table);