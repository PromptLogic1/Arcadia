-- Aktualisierung des updated_at Timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Anwenden des updated_at Triggers auf alle Tabellen
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

-- Automatische Aktualisierung von Statistiken
CREATE OR REPLACE FUNCTION update_challenge_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE challenges
        SET 
            success_rate = (
                SELECT 
                    COALESCE(
                        COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / 
                        NULLIF(COUNT(*), 0)::float * 100,
                        0
                    )
                FROM submissions
                WHERE challenge_id = NEW.challenge_id
            )
        WHERE id = NEW.challenge_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_challenge_stats_trigger
AFTER INSERT ON submissions
FOR EACH ROW
EXECUTE FUNCTION update_challenge_stats();

-- Automatische Aktualisierung von Diskussions-Statistiken
CREATE OR REPLACE FUNCTION update_discussion_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE discussions
        SET comment_count = comment_count + 1
        WHERE id = NEW.discussion_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE discussions
        SET comment_count = comment_count - 1
        WHERE id = OLD.discussion_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_discussion_comment_count_trigger
AFTER INSERT OR DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_discussion_comment_count();

-- Bingo board statistics update
CREATE OR REPLACE FUNCTION update_bingo_board_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status = 'completed' THEN
        -- Update creator stats or other relevant statistics
        UPDATE users
        SET experience_points = experience_points + 50
        WHERE id = NEW.creator_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bingo_board_stats_trigger
AFTER UPDATE ON bingo_boards
FOR EACH ROW
EXECUTE FUNCTION update_bingo_board_stats();

-- User experience points trigger
CREATE OR REPLACE FUNCTION update_user_experience()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        UPDATE users
        SET experience_points = experience_points + (
            SELECT CASE difficulty
                WHEN 'easy' THEN 10
                WHEN 'medium' THEN 20
                WHEN 'hard' THEN 30
                WHEN 'expert' THEN 50
                ELSE 0
            END
            FROM challenges
            WHERE id = NEW.challenge_id
        )
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_experience_trigger
AFTER UPDATE ON submissions
FOR EACH ROW
EXECUTE FUNCTION update_user_experience();

-- Add to existing triggers
CREATE OR REPLACE FUNCTION update_bingo_statistics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users
        SET total_boards = total_boards + 1,
            experience_points = experience_points + 10
        WHERE id = NEW.creator_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users
        SET total_boards = total_boards - 1
        WHERE id = OLD.creator_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the function that adds a new entry to the users table after verification
CREATE OR REPLACE FUNCTION public.add_user_after_verification()
RETURNS TRIGGER AS $$
DECLARE
  _username TEXT;
  _base_username TEXT;
  _counter INTEGER := 0;
BEGIN
  -- First try to get the display name from OAuth
  _base_username := COALESCE(
    NEW.raw_app_meta_data->>'display_name',  -- First priority: display name from auth.users
    NEW.raw_user_meta_data->>'name',         -- Fallback 1: name from OAuth
    NEW.raw_user_meta_data->>'full_name',    -- Fallback 2: full name from OAuth
    split_part(NEW.email, '@', 1)            -- Last resort: email prefix
  );

  -- Clean up the username
  -- Convert to lowercase and replace spaces with underscores
  _base_username := LOWER(REPLACE(_base_username, ' ', '_'));
  -- Remove any special characters
  _base_username := regexp_replace(_base_username, '[^a-zA-Z0-9_-]', '', 'g');
  
  -- Ensure minimum length
  IF length(_base_username) < 3 THEN
    _base_username := _base_username || 'user';
  END IF;

  -- Try to find an available username
  _username := _base_username;
  WHILE EXISTS (
    SELECT 1 FROM public.users WHERE username = _username
  ) LOOP
    _counter := _counter + 1;
    _username := _base_username || _counter::text;
  END LOOP;

  -- Only insert if user doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE auth_id = NEW.id
  ) THEN
    INSERT INTO public.users (
      auth_id,
      username,
      full_name,
      avatar_url,
      role
    ) 
    VALUES (
      NEW.id,
      _username,
      COALESCE(
        NEW.raw_app_meta_data->>'display_name',  -- Use display name as full name too
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
      ),
      COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        'https://ui-avatars.com/api/?name=' || _username
      ),
      'user'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trigger_add_user_after_verification ON auth.users;
CREATE TRIGGER trigger_add_user_after_verification
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.add_user_after_verification();