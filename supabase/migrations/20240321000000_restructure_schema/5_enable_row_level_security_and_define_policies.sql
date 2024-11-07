-- Aktiviere RLS für alle relevanten Tabellen
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_boards ENABLE ROW LEVEL SECURITY;

-- User Policies
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (auth.uid()::uuid = auth_id);

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (auth.uid()::uuid = auth_id)
    WITH CHECK (auth.uid()::uuid = auth_id);

CREATE POLICY "Public can view limited user info"
    ON users FOR SELECT
    USING (true);

-- Challenge Policies
CREATE POLICY "Anyone can view published challenges"
    ON challenges FOR SELECT
    USING (status = 'published' OR auth.uid()::uuid = created_by);

CREATE POLICY "Users can create challenges"
    ON challenges FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::uuid = created_by);

CREATE POLICY "Authors can update their challenges"
    ON challenges FOR UPDATE
    USING (auth.uid()::uuid = created_by);

-- Bingo Board Policies
CREATE POLICY "Public can view active bingo boards"
    ON bingo_boards FOR SELECT
    USING (status = 'active' OR creator_id = auth.uid()::uuid);

CREATE POLICY "Users can create bingo boards"
    ON bingo_boards FOR INSERT
    TO authenticated
    WITH CHECK (creator_id = auth.uid()::uuid);

CREATE POLICY "Creators can manage their boards"
    ON bingo_boards FOR UPDATE
    USING (creator_id = auth.uid()::uuid);

-- Discussion Policies
CREATE POLICY "Discussions are publicly viewable"
    ON discussions FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create discussions"
    ON discussions FOR INSERT
    TO authenticated
    WITH CHECK (author_id = auth.uid()::uuid);

CREATE POLICY "Authors can update their discussions"
    ON discussions FOR UPDATE
    USING (author_id = auth.uid()::uuid);

-- Comment Policies
CREATE POLICY "Comments are publicly viewable"
    ON comments FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can comment"
    ON comments FOR INSERT
    TO authenticated
    WITH CHECK (author_id = auth.uid()::uuid);

CREATE POLICY "Authors can manage their comments"
    ON comments FOR UPDATE
    USING (author_id = auth.uid()::uuid);

-- Füge diese Policy hinzu, um das Erstellen von Benutzerprofilen zu erlauben
CREATE POLICY "Enable insert for authenticated users creating their own profile" 
    ON users FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid()::uuid = auth_id);

-- Füge auch eine Policy für das Lesen von Benutzerprofilen hinzu
CREATE POLICY "Enable read access for authenticated users" 
    ON users FOR SELECT 
    TO authenticated
    USING (true);

-- Stelle sicher, dass der authenticated Role die notwendigen Rechte hat
GRANT ALL ON users TO authenticated;