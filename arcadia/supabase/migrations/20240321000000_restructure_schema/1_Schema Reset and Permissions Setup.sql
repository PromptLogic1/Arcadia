-- Zuerst komplettes Schema zurücksetzen
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Grundlegende Berechtigungen
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;