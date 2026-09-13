-- Adds per-user identity: each row in unit_progress/cards/activity now
-- belongs to a user_id, and a passphrase authenticates as exactly one user
-- (replacing the single shared SYNC_PASSPHRASE). Existing rows in these
-- three tables are test data (confirmed disposable) — SQLite/D1 can't
-- ALTER a column into a PRIMARY KEY, so we recreate the tables instead of
-- migrating rows.
DROP TABLE unit_progress;
DROP TABLE cards;
DROP TABLE activity;

CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  -- SHA-256 hex digest of the passphrase (see apps/worker/src/crypto.ts).
  -- Never store the plaintext passphrase.
  passphrase_hash TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at INTEGER NOT NULL
);

-- `user_id` below IS FK-enforced at runtime: unlike vanilla SQLite (where
-- foreign keys are off unless a connection opts in with
-- `PRAGMA foreign_keys = ON`), D1 enforces foreign key constraints by
-- default and gives no way to turn that off (see
-- https://developers.cloudflare.com/d1/sql-api/foreign-keys/). So every row
-- here must reference a real `users` row; requirePassphrase is the only
-- code path that legitimately produces a user_id (looked up in `users`) to
-- pass to sync-store, and test code that writes these tables directly must
-- seed a real user row first.
CREATE TABLE unit_progress (
  user_id TEXT NOT NULL REFERENCES users(user_id),
  unit_id TEXT NOT NULL,
  status TEXT NOT NULL,
  completed_at INTEGER,
  completed_lessons TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  PRIMARY KEY (user_id, unit_id)
);
CREATE INDEX unit_progress_seq ON unit_progress (seq);

CREATE TABLE cards (
  user_id TEXT NOT NULL REFERENCES users(user_id),
  card_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  fsrs TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  PRIMARY KEY (user_id, card_id)
);
CREATE INDEX cards_seq ON cards (seq);

CREATE TABLE activity (
  user_id TEXT NOT NULL REFERENCES users(user_id),
  date TEXT NOT NULL,
  lessons INTEGER NOT NULL,
  reviews INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  PRIMARY KEY (user_id, date)
);
CREATE INDEX activity_seq ON activity (seq);
