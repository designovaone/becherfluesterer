-- Becherflüsterer · Weltmeister-Tipp (standalone champion bet).
-- Adds the champion_bets table (one pick per user) and two settings columns
-- (cutoff + winner). Idempotent (IF NOT EXISTS). Paste into the Neon SQL
-- Editor or pipe via psql. Single transaction. Do NOT run via db:push.

BEGIN;

CREATE TABLE IF NOT EXISTS champion_bets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT champion_bets_user_unq UNIQUE (user_id)
);

-- 2026-06-12 02:00:00+00 == 12 June 2026 04:00 Berlin (CEST, UTC+2).
ALTER TABLE settings ADD COLUMN IF NOT EXISTS champion_cutoff_at TIMESTAMPTZ NOT NULL DEFAULT '2026-06-12 02:00:00+00'::timestamptz;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS champion_winner TEXT;  -- NULL = noch offen

COMMIT;

-- ----------------------------------------------------------------------------
-- Rollback (lossy: drops all champion picks and the cutoff/winner settings):
-- ----------------------------------------------------------------------------
-- BEGIN;
--   ALTER TABLE settings DROP COLUMN IF EXISTS champion_winner;
--   ALTER TABLE settings DROP COLUMN IF EXISTS champion_cutoff_at;
--   DROP TABLE IF EXISTS champion_bets;
-- COMMIT;
