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