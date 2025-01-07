-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Basic Policies
CREATE POLICY "Everyone can view users"
    ON users FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON users FOR INSERT
    WITH CHECK (
        auth.uid()::uuid = auth_id
        OR CURRENT_USER = 'service_role'
    );

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (auth.uid()::uuid = auth_id);

-- Service Role Bypass
CREATE POLICY "Service role has full access"
    ON users
    USING (CURRENT_USER = 'service_role');

-- Regular User Policies
CREATE POLICY "Published challenges are viewable by everyone" 
    ON challenges FOR SELECT 
    USING (status = 'published' OR auth.uid()::uuid = created_by);

CREATE POLICY "Authenticated users can create challenges" 
    ON challenges FOR INSERT 
    WITH CHECK (auth.uid()::uuid = created_by);

CREATE POLICY "Users can update own challenges" 
    ON challenges FOR UPDATE 
    USING (auth.uid()::uuid = created_by);

CREATE POLICY "Users can view own submissions" 
    ON submissions FOR SELECT 
    USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can create submissions" 
    ON submissions FOR INSERT 
    WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Bingo boards are viewable by everyone" 
    ON bingo_boards FOR SELECT USING (true);

-- Public Access Policies
CREATE POLICY "Categories are viewable by everyone" 
    ON categories FOR SELECT USING (true);

CREATE POLICY "Tags are viewable by everyone" 
    ON tags FOR SELECT USING (true);

-- Admin and Moderator Policies
DO $$ 
BEGIN
    -- Create admin role if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
        CREATE ROLE admin;
    END IF;
    
    -- Create moderator role if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'moderator') THEN
        CREATE ROLE moderator;
    END IF;
END
$$;

-- Grant permissions to roles
GRANT admin TO authenticated;
GRANT moderator TO authenticated;

-- Grant basic permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create function to check if user is admin/moderator
CREATE OR REPLACE FUNCTION auth.is_admin_or_moderator()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM auth.users u
        JOIN users p ON u.id::uuid = p.auth_id
        WHERE u.id::uuid = auth.uid()
        AND p.role IN ('admin', 'moderator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin/Moderator policies using the helper function
CREATE POLICY "Admin/Moderator can manage all content"
    ON challenges FOR ALL
    USING (
        CURRENT_USER = 'service_role'
        OR auth.is_admin_or_moderator()
    );

CREATE POLICY "Admin/Moderator can manage all submissions"
    ON submissions FOR ALL
    USING (
        CURRENT_USER = 'service_role'
        OR auth.is_admin_or_moderator()
    );

CREATE POLICY "Admin/Moderator can manage all discussions"
    ON discussions FOR ALL
    USING (
        CURRENT_USER = 'service_role'
        OR auth.is_admin_or_moderator()
    );

CREATE POLICY "Admin/Moderator can manage all comments"
    ON comments FOR ALL
    USING (
        CURRENT_USER = 'service_role'
        OR auth.is_admin_or_moderator()
    );

CREATE POLICY "Admin/Moderator can manage all bingo boards"
    ON bingo_boards FOR ALL
    USING (
        CURRENT_USER = 'service_role'
        OR auth.is_admin_or_moderator()
    );