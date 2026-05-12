-- Becherflüsterer · Initiales Schema
-- Im Neon SQL Editor einfügen und ausführen.

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id          SERIAL PRIMARY KEY,
  home_team   TEXT NOT NULL,
  away_team   TEXT NOT NULL,
  kickoff_at  TIMESTAMPTZ NOT NULL,
  stage       TEXT NOT NULL,
  home_score  INTEGER,
  away_score  INTEGER,
  finalized   BOOLEAN NOT NULL DEFAULT FALSE,
  betting_open BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS matches_kickoff_idx ON matches(kickoff_at);

CREATE TABLE IF NOT EXISTS bets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id    INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  pred_home   INTEGER NOT NULL,
  pred_away   INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bets_user_match_unq UNIQUE (user_id, match_id)
);

CREATE TABLE IF NOT EXISTS settings (
  id                       INTEGER PRIMARY KEY DEFAULT 1,
  viewer_passphrase_hash   TEXT NOT NULL,
  admin_password_hash      TEXT NOT NULL,
  CONSTRAINT settings_singleton CHECK (id = 1)
);
