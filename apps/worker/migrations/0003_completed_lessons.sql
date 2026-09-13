-- Replaces the `lessons_completed` counter with the actual set of finished
-- sub-lesson indices (JSON array of integers), so completing sub-lessons out
-- of order is tracked correctly instead of just counting how many were done.
-- The old column is left in place, unused, rather than dropped: SQLite/D1
-- table rebuilds for DROP COLUMN carry more operational risk than an unused
-- column costs.
ALTER TABLE unit_progress ADD COLUMN completed_lessons TEXT NOT NULL DEFAULT '[]';
