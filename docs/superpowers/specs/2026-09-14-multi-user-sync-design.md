# Multi-User Sync — Design

Date: 2026-09-14
Status: draft

## 1. Goal

Today `apps/worker` gates `/api/sync` with a single shared `SYNC_PASSPHRASE`
env var, and all rows in `unit_progress`, `cards`, `activity` are unkeyed by
user — anyone with the passphrase reads/writes the same flat rows. This is
fine for one person but breaks down for a small, fixed set of real users
(e.g. family members), each on their own device, who must not see or
overwrite each other's progress.

Scope: a handful of known users, each with their own device (no in-app
profile switching), provisioned by hand by the app owner (no self-signup).
Existing D1 data is test data and can be reset — no migration of live rows
needed.

## 2. Approach: per-row `user_id` in the shared D1 database

Add a `users` table (passphrase → user identity) and a `user_id` column to
the three existing tables, with composite primary keys. One passphrase per
user replaces the single shared passphrase. All sync reads/writes are
scoped by the authenticated `user_id`.

Rejected alternatives:
- **Separate D1 database per user** — full isolation, but multiplies
  wrangler bindings and migrations per user for no real benefit at this
  scale (a few known people).
- **Client-supplied profile tag on top of the shared passphrase** — not
  real authentication; any client could claim any other user's tag.

### Why this fits

- No new infrastructure — one D1 database, one worker deployment.
- `user_id` filtering is a mechanical addition to existing queries; the
  sync protocol (cursor/seq, last-write-wins via `updated_at`) is unchanged.
- The local client already only ever holds one user's data per device (own
  device per user), so the IndexedDB/Dexie layer needs no schema change.

## 3. Data model

### `users` table (new)

```sql
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  passphrase_hash TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at INTEGER NOT NULL
);
```

`passphrase_hash` is SHA-256 (hex) of the passphrase, computed with the
Workers-runtime `crypto.subtle.digest('SHA-256', ...)`. Plaintext
passphrases are never stored — only ever handed to the new user once, out
of band, when provisioned.

### Existing tables gain `user_id`, composite PK

```sql
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
```

SQLite/D1 can't `ALTER TABLE` a column into a primary key, so the migration
drops and recreates all three tables. Since current D1 contents are
disposable test data (confirmed with the app owner), no backfill is
required.

`sync_meta` (the single global `seq` counter) is unchanged — it stays one
shared monotonic counter across all users. Pull queries add `user_id = ?`
alongside the existing `seq > ?` filter, so each user's cursor only ever
tracks the highest seq among *their own* rows; a shared counter is simpler
than per-user counters and does not leak cross-user information (`seq`
values are already meaningless integers to the client; rows are the only
things it reads).

## 4. Auth (`apps/worker/src/auth.ts`)

`requirePassphrase` currently compares the bearer token against the single
`SYNC_PASSPHRASE` env var with `constantTimeEqual`. It becomes:

1. Extract the bearer token (unchanged, `extractBearer`).
2. Hash it (SHA-256, hex).
3. `SELECT user_id FROM users WHERE passphrase_hash = ?1`.
4. Not found → `401 { error: 'unauthorized' }` (same shape as today).
5. Found → `c.set('userId', row.user_id)` on the Hono context, then
   `await next()`.

`AppEnv` (`app-env.ts`) gains a `Variables: { userId: string }` so
downstream handlers can read `c.get('userId')` with types. The
`SYNC_PASSPHRASE` env var and its 500 "server not configured" guard are
removed entirely — auth is now fully data-driven via the `users` table.

`constantTimeEqual` becomes unused and is deleted; hashing + exact string
comparison via SQL equality is the new mechanism (timing differences in a
hash lookup do not leak the passphrase the way a direct compare would).

## 5. Sync store (`apps/worker/src/sync-store.ts`)

`applySync(db: D1Database, req: SyncRequest)` becomes
`applySync(db: D1Database, userId: string, req: SyncRequest)`.

- Every `UPSERT_UNIT` / `UPSERT_CARD` / `UPSERT_ACTIVITY` statement binds
  `userId` as an extra leading parameter, and the `ON CONFLICT` target
  becomes the composite key (`ON CONFLICT(user_id, unit_id)`, etc.).
- All three pull `SELECT`s add `WHERE user_id = ?1 AND seq > ?2` (bind
  order: `userId`, `cursor`).
- Row-shaping code (`UnitDbRow` → `UnitProgressRow`, etc.) is unchanged —
  `user_id` is not part of the wire format; it's implied by whichever
  passphrase authenticated the request.

`apps/worker/src/index.ts`'s `/api/sync` handler passes
`c.get('userId')` through to `applySync`.

No change to `SyncRequest`/`SyncResponse`/`UnitProgressRow`/`CardRow`/
`ActivityRow` types in `@hi-chinese/content` — `user_id` is a server-side
partition key, never sent by the client (the client only ever has one
user's data anyway).

## 6. Client (apps/web)

No schema change. `apps/web/src/db/db.ts`'s single `hi-chinese` IndexedDB
name and the `meta` table are unchanged, because each device still holds
exactly one user's local data — the passphrase already *is* that user's
identity from the client's point of view.

Cosmetic only: `apps/web/src/setup/SetupScreen.tsx`'s passphrase field
label can change from generic "sync passphrase" copy to make clear it's
personal (e.g. "Your passphrase"), since it's no longer a household-shared
secret. Not required for correctness.

## 7. Provisioning new users

New script `apps/worker/scripts/add-user.mjs` (run locally with Node, not
deployed):

1. Args: `--user-id <id>` (required), `--name <display name>` (optional).
2. Generates a random passphrase (e.g. `crypto.randomBytes(18).toString
   ('base64url')`) unless one is piped in.
3. Hashes it (SHA-256, hex — same algorithm as the worker) with Node's
   `crypto.subtle` (or `crypto.createHash`, kept in lockstep with the
   worker's Web Crypto usage).
4. Runs `wrangler d1 execute hi-chinese --remote --command "INSERT INTO
   users (user_id, passphrase_hash, display_name, created_at) VALUES
   (...)"` (and `--local` for local dev, as a second explicit flag/step —
   never both in one invocation, to avoid drift between which environment
   was actually provisioned).
5. Prints the plaintext passphrase to stdout once, with a reminder it
   won't be shown again and isn't stored anywhere — the operator copies it
   out-of-band (e.g. a chat message) to the new user.

Added as a `package.json` script: `"add-user": "node scripts/add-user.mjs"`.

## 8. Migration

New file `apps/worker/migrations/0004_multi_user.sql`:

```sql
DROP TABLE unit_progress;
DROP TABLE cards;
DROP TABLE activity;

CREATE TABLE users ( ... );          -- section 3
CREATE TABLE unit_progress ( ... );  -- section 3, with user_id + composite PK
CREATE TABLE cards ( ... );
CREATE TABLE activity ( ... );
```

Applied via the existing `pnpm -F @hi-chinese/worker db:migrate:local` /
`db:migrate:remote` scripts (unchanged). After migrating, the app owner
runs `add-user` once for themselves before using the app again.

`apps/worker/.dev.vars.example` drops the `SYNC_PASSPHRASE` line (file may
become empty/removed if nothing else uses `.dev.vars`).
`apps/worker/wrangler.jsonc` needs no change (no env var was declared
there; `SYNC_PASSPHRASE` was only ever a runtime secret).

## 9. Testing

- **`auth.ts` unit tests**: correct passphrase → `userId` set to the right
  user; wrong/unknown passphrase → 401; empty/missing header → 401 (no more
  "server not configured" 500 path since there's no required env var).
- **`sync-store.ts` unit tests**: two users pushing/pulling independently
  never see each other's rows; same `unit_id`/`card_id`/`date` value used
  by two different users doesn't collide (composite PK holds).
- **Migration test**: `0004_multi_user.sql` produces the expected schema
  (existing pattern in the worker test suite, if one already checks
  migrations; otherwise a smoke test that applies migrations to a fresh
  local D1 and queries `sqlite_master`).
- **`add-user.mjs`**: not unit tested (thin CLI script); manually verified
  against a local D1 as part of implementation.

## 10. Decisions

- **Composite PK over a separate uniqueness constraint** — matches how
  `unit_id`/`card_id`/`date` were already the sole PK; minimal conceptual
  change to the upsert pattern.
- **Table recreate over column+constraint migration** — D1/SQLite can't add
  a column into an existing PRIMARY KEY via `ALTER TABLE`; recreating is
  safe here only because current data is disposable test data (confirmed
  with the app owner). This is a one-time exception, not a precedent — a
  future migration touching live user data would need a copy-and-swap
  (create new tables, `INSERT INTO ... SELECT`, drop old, rename) instead.
- **Passphrase hashing added now** — even though the current design stores
  the shared secret in an env var (never in D1), moving passphrases into a
  DB table makes plaintext storage a real risk (DB dumps, backups); hashing
  costs little and removes that risk entirely.
- **Shared global `seq` counter kept** — simpler than per-user counters;
  correctness only depends on `user_id = ?` narrowing the pull query, not
  on `seq` being dense per user.
- **No in-app profile switching** — out of scope per the "one device per
  user" requirement; if that changes later, the client would need a
  `profileId` concept in Dexie, which this design deliberately does not
  add.
