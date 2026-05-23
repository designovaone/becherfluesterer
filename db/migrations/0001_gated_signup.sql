-- Becherflüsterer · Per-user accounts with password auth (gated signup).
-- Wipes existing user data (TRUNCATE), reshapes the users table.
-- Paste into the Neon SQL Editor or pipe via psql. Single transaction.

BEGIN;

TRUNCATE users CASCADE;  -- removes bets via existing FK cascade

-- Drop EVERY unique constraint on users that involves the `name` column.
-- A SELECT INTO would crash with TOO_MANY_ROWS if more than one matches.
-- The loop handles zero, one, or many cleanly.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT DISTINCT con.conname
      FROM pg_constraint con
      JOIN pg_class    rel ON rel.oid = con.conrelid
      JOIN pg_attribute att ON att.attrelid = con.conrelid
                            AND att.attnum  = ANY(con.conkey)
     WHERE rel.relname  = 'users'
       AND con.contype  = 'u'
       AND att.attname  = 'name'
  LOOP
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE users DROP COLUMN IF EXISTS name;
ALTER TABLE users ADD COLUMN first_name      TEXT NOT NULL;
ALTER TABLE users ADD COLUMN last_name       TEXT NOT NULL;
ALTER TABLE users ADD COLUMN first_name_key  TEXT NOT NULL;
ALTER TABLE users ADD COLUMN last_name_key   TEXT NOT NULL;
ALTER TABLE users ADD COLUMN password_hash   TEXT NOT NULL;
ALTER TABLE users ADD COLUMN session_epoch   INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX users_name_key_unq ON users (first_name_key, last_name_key);

COMMIT;

-- ----------------------------------------------------------------------------
-- Rollback (lossy: forward migration TRUNCATEs all existing users).
-- Run only if you need to revert to the pre-migration schema:
-- ----------------------------------------------------------------------------
-- BEGIN;
--   DROP INDEX IF EXISTS users_name_key_unq;
--   ALTER TABLE users DROP COLUMN IF EXISTS session_epoch;
--   ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
--   ALTER TABLE users DROP COLUMN IF EXISTS last_name_key;
--   ALTER TABLE users DROP COLUMN IF EXISTS first_name_key;
--   ALTER TABLE users DROP COLUMN IF EXISTS last_name;
--   ALTER TABLE users DROP COLUMN IF EXISTS first_name;
--   ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT '';
--   ALTER TABLE users ALTER COLUMN name DROP DEFAULT;
--   ALTER TABLE users ADD CONSTRAINT users_name_key UNIQUE (name);
-- COMMIT;
-- After rollback, all user names are empty strings — original data is gone.
