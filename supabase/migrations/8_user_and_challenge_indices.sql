-- Add missing indices for bingo_boards and optimize existing ones

-- User-bezogene Indizes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
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