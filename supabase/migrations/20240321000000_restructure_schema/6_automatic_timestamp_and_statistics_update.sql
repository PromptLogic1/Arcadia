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
BEGIN
  -- Only proceed if email is confirmed and user doesn't already exist
  IF NEW.email_confirmed_at IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE auth_id = NEW.id
  ) THEN
    INSERT INTO public.users (
      auth_id,
      username,
      role,
      is_active
    ) 
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
      'user',
      true
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