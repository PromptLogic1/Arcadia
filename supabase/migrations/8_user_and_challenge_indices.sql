-- Add missing indices for bingo_boards and optimize existing ones

-- User-bezogene Indizes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Challenge-bezogene Indizes
CREATE INDEX IF NOT EXISTS idx_challenges_slug ON challenges(slug);
CREATE INDEX IF NOT EXISTS idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_game ON challenges(game_id);
CREATE INDEX IF NOT EXISTS idx_challenges_category ON challenges(category_id);
CREATE INDEX IF NOT EXISTS idx_challenges_created_by ON challenges(created_by);

-- Submission-bezogene Indizes
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_challenge ON submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);

-- Bingo-bezogene Indizes
CREATE INDEX IF NOT EXISTS idx_bingo_boards_creator ON bingo_boards(creator_id);
CREATE INDEX IF NOT EXISTS idx_bingo_boards_game ON bingo_boards(game_id);
CREATE INDEX IF NOT EXISTS idx_bingo_boards_status ON bingo_boards(status);
CREATE INDEX IF NOT EXISTS idx_bingo_boards_votes ON bingo_boards(votes DESC);
CREATE INDEX IF NOT EXISTS idx_bingo_boards_created_at ON bingo_boards(created_at DESC);

-- Community-bezogene Indizes
CREATE INDEX IF NOT EXISTS idx_discussions_author ON discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_discussions_game ON discussions(game);
CREATE INDEX IF NOT EXISTS idx_discussions_challenge ON discussions(challenge_type);
CREATE INDEX IF NOT EXISTS idx_discussions_created_at ON discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_upvotes ON discussions(upvotes DESC);

-- Volltextsuche-Indizes
CREATE INDEX IF NOT EXISTS idx_challenges_fts ON challenges USING GIN (
    to_tsvector('english', title || ' ' || description)
);

CREATE INDEX IF NOT EXISTS idx_discussions_fts ON discussions USING GIN (
    to_tsvector('english', title || ' ' || content)
);

-- Tags und Kategorien Indizes
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);