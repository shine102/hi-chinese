-- Progress rows. `updated_at` is the client's epoch-ms timestamp used for
-- last-write-wins. `seq` is the server sequence number of the sync batch that
-- last wrote the row; clients pull rows with seq > their cursor.
CREATE TABLE unit_progress (
  unit_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  completed_at INTEGER,
  updated_at INTEGER NOT NULL,
  seq INTEGER NOT NULL
);
CREATE INDEX unit_progress_seq ON unit_progress (seq);

CREATE TABLE cards (
  card_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  fsrs TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  seq INTEGER NOT NULL
);
CREATE INDEX cards_seq ON cards (seq);

CREATE TABLE activity (
  date TEXT PRIMARY KEY,
  lessons INTEGER NOT NULL,
  reviews INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  seq INTEGER NOT NULL
);
CREATE INDEX activity_seq ON activity (seq);

-- Single-row counter for the server sequence number.
CREATE TABLE sync_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  seq INTEGER NOT NULL
);
INSERT INTO sync_meta (id, seq) VALUES (1, 0);
