# Multi-User Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single shared `SYNC_PASSPHRASE` with per-user passphrases, and partition `unit_progress`/`cards`/`activity` in D1 by `user_id`, so a handful of known users (each on their own device) can sync independently without seeing or overwriting each other's progress.

**Architecture:** A new `users` table maps a SHA-256-hashed passphrase to a `user_id`. The `requirePassphrase` middleware looks up the incoming token's hash in `users`, attaches the resolved `user_id` to the Hono request context, and every sync read/write is scoped by it. `unit_progress`, `cards`, and `activity` gain a `user_id` column and a composite primary key (`user_id`, *original key*). The client is unaffected: each device already holds exactly one user's local data.

**Tech Stack:** Cloudflare Workers (Hono), Cloudflare D1 (SQLite), Vitest + `@cloudflare/vitest-plugin` (Miniflare), Node.js (provisioning script), TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-14-multi-user-sync-design.md`

## Global Constraints

- Passphrases are never stored in plaintext — only their SHA-256 hex hash, computed via Web Crypto (`crypto.subtle.digest`), per spec §3–§4.
- No self-signup: users are provisioned by hand via the `add-user` script, per spec §7.
- Existing D1 data is disposable test data — the migration recreates tables rather than backfilling, per spec §3/§8/§10.
- No client (`apps/web`) schema or protocol changes beyond an optional copy tweak — `user_id` is a server-side partition key never sent on the wire, per spec §5–§6.
- The shared global `sync_meta.seq` counter is kept as-is; only pull queries gain a `user_id = ?` filter, per spec §3.

---

### Task 1: Passphrase hashing helper

**Files:**
- Create: `apps/worker/src/crypto.ts`
- Test: `apps/worker/test/crypto.test.ts`

**Interfaces:**
- Produces: `hashPassphrase(passphrase: string): Promise<string>` — SHA-256 hex digest, consumed by Task 2's `auth.ts` and by `test/apply-migrations.ts`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/worker/test/crypto.test.ts
import { describe, expect, it } from 'vitest';
import { hashPassphrase } from '../src/crypto.js';

describe('hashPassphrase', () => {
  it('returns the SHA-256 hex digest of the input', async () => {
    // Known NIST test vector for SHA-256("abc").
    expect(await hashPassphrase('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('is deterministic and sensitive to every character', async () => {
    const a = await hashPassphrase('correct horse battery staple');
    const b = await hashPassphrase('correct horse battery staple');
    const c = await hashPassphrase('correct horse battery staplE');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @hi-chinese/worker test test/crypto.test.ts`
Expected: FAIL — `Cannot find module '../src/crypto.js'` (or similar resolution error).

- [ ] **Step 3: Write the implementation**

```typescript
// apps/worker/src/crypto.ts
const encoder = new TextEncoder();

/**
 * SHA-256 hex digest of a UTF-8 string, using the Workers runtime's Web
 * Crypto (`crypto.subtle`, available globally — no import needed).
 */
export async function hashPassphrase(passphrase: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(passphrase));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F @hi-chinese/worker test test/crypto.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/worker/src/crypto.ts apps/worker/test/crypto.test.ts
git commit -m "feat(worker): add passphrase hashing helper"
```

---

### Task 2: Multi-user schema, auth, and sync-store partitioning

This task is one unit because the schema, the auth middleware, and the sync
store are inseparable: the moment the schema changes, `auth.ts` and
`sync-store.ts` (and the tests that exercise them through the HTTP route)
stop compiling/passing until they're updated together. Intermediate steps
within this task will leave other test files red — that's expected until
the last "run full suite" step.

**Files:**
- Create: `apps/worker/migrations/0004_multi_user.sql`
- Create: `apps/worker/test/migration.test.ts`
- Modify: `apps/worker/src/app-env.ts`
- Modify: `apps/worker/src/env.d.ts`
- Modify: `apps/worker/src/auth.ts`
- Modify: `apps/worker/src/sync-store.ts`
- Modify: `apps/worker/src/index.ts`
- Modify: `apps/worker/vitest.config.ts`
- Modify: `apps/worker/test/apply-migrations.ts`
- Modify: `apps/worker/test/auth.test.ts`
- Modify: `apps/worker/test/health.test.ts`
- Modify: `apps/worker/test/sync-store.test.ts`
- Modify: `apps/worker/test/sync-route.test.ts`

**Interfaces:**
- Consumes: `hashPassphrase(passphrase: string): Promise<string>` from Task 1 (`apps/worker/src/crypto.ts`).
- Produces: `applySync(db: D1Database, userId: string, req: SyncRequest): Promise<SyncResponse>` (signature change — old call sites all take a new second argument). `AppEnv` gains `Variables: { userId: string }`.

- [ ] **Step 1: Write the failing schema test**

```typescript
// apps/worker/test/migration.test.ts
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

describe('0004_multi_user migration', () => {
  it('creates a users table with the expected columns', async () => {
    const cols = await env.DB.prepare('PRAGMA table_info(users)').all<{ name: string }>();
    expect(cols.results.map((c) => c.name).sort()).toEqual(
      ['created_at', 'display_name', 'passphrase_hash', 'user_id'].sort(),
    );
  });

  it('gives unit_progress, cards, and activity a composite (user_id, *) primary key', async () => {
    const tables = [
      ['unit_progress', 'unit_id'],
      ['cards', 'card_id'],
      ['activity', 'date'],
    ] as const;
    for (const [table, secondCol] of tables) {
      const cols = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{
        name: string;
        pk: number;
      }>();
      const pkCols = cols.results.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk);
      expect(pkCols.map((c) => c.name)).toEqual(['user_id', secondCol]);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @hi-chinese/worker test test/migration.test.ts`
Expected: FAIL — `users` table has no rows/columns yet (`PRAGMA table_info(users)` returns empty results, so the first assertion fails; or the table doesn't exist).

- [ ] **Step 3: Write the migration**

```sql
-- apps/worker/migrations/0004_multi_user.sql

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

-- `user_id` below is not FK-enforced at runtime: SQLite foreign keys are
-- off unless a connection opts in with `PRAGMA foreign_keys = ON`, which D1
-- does not do. The REFERENCES clause is documentation; the real guarantee
-- is that requirePassphrase only ever hands sync-store a user_id it just
-- looked up in `users`.
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

- [ ] **Step 4: Run the schema test to verify it passes**

Run: `pnpm -F @hi-chinese/worker test test/migration.test.ts`
Expected: PASS (2 tests). Other test files are now failing — expected; fixed by the remaining steps below.

- [ ] **Step 5: Update `AppEnv` to carry the resolved user id**

```typescript
// apps/worker/src/app-env.ts
export type AppEnv = { Bindings: Cloudflare.Env; Variables: { userId: string } };
```

- [ ] **Step 6: Drop `SYNC_PASSPHRASE` from the env type**

```typescript
// apps/worker/src/env.d.ts
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
  }
}
```

- [ ] **Step 7: Rewrite `auth.ts` to look up the user by hashed passphrase**

```typescript
// apps/worker/src/auth.ts
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from './app-env.js';
import { hashPassphrase } from './crypto.js';

export function extractBearer(header: string | undefined): string | null {
  if (header === undefined) return null;
  const match = /^Bearer\s+(\S.*)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

export const requirePassphrase = createMiddleware<AppEnv>(async (c, next) => {
  const token = extractBearer(c.req.header('authorization'));
  if (token === null) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const hash = await hashPassphrase(token);
  const row = await c.env.DB.prepare('SELECT user_id FROM users WHERE passphrase_hash = ?1')
    .bind(hash)
    .first<{ user_id: string }>();
  if (row === null) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  c.set('userId', row.user_id);
  await next();
});
```

Note: `constantTimeEqual` is deleted along with the direct-comparison approach — hashing plus SQL equality replaces it (there's no longer a fixed secret to compare against with a timing-safe comparator; the lookup is by hash equality in the database).

- [ ] **Step 8: Rewrite `auth.test.ts`**

```typescript
// apps/worker/test/auth.test.ts
import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { extractBearer } from '../src/auth.js';

describe('extractBearer', () => {
  it('extracts the token case-insensitively and trims whitespace', () => {
    expect(extractBearer('Bearer abc')).toBe('abc');
    expect(extractBearer('bearer   abc  ')).toBe('abc');
    expect(extractBearer('Basic abc')).toBeNull();
    expect(extractBearer('Bearer')).toBeNull();
    expect(extractBearer('Bearer ')).toBeNull();
    expect(extractBearer(undefined)).toBeNull();
  });
});

describe('requirePassphrase on /api/sync', () => {
  it('rejects a missing token with 401', async () => {
    const res = await SELF.fetch('https://hi.test/api/sync', { method: 'POST', body: '{}' });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });

  it('rejects an unknown token with 401', async () => {
    const res = await SELF.fetch('https://hi.test/api/sync', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong' },
      body: '{}',
    });
    expect(res.status).toBe(401);
  });

  it('lets a known passphrase through to the route', async () => {
    const res = await SELF.fetch('https://hi.test/api/sync', {
      method: 'POST',
      headers: { authorization: 'Bearer test-passphrase' },
      body: '{}',
    });
    // Auth passed; the route now fails on body parsing instead.
    expect(res.status).toBe(400);
  });

  it('does not guard the health route', async () => {
    const res = await SELF.fetch('https://hi.test/api/health');
    expect(res.status).toBe(200);
  });
});
```

This relies on a seeded `test-passphrase` → `test-user` row, added in Step 12 below.

- [ ] **Step 9: Rewrite `sync-store.ts` to partition by `user_id`**

```typescript
// apps/worker/src/sync-store.ts
import type {
  ActivityRow,
  CardKind,
  CardRow,
  FsrsState,
  SyncRequest,
  SyncResponse,
  UnitProgressRow,
  UnitStatus,
} from '@hi-chinese/content';

const SEQ_SUBQUERY = '(SELECT seq FROM sync_meta WHERE id = 1)';

const UPSERT_UNIT = `
INSERT INTO unit_progress (user_id, unit_id, status, completed_at, completed_lessons, updated_at, seq)
VALUES (?1, ?2, ?3, ?4, ?5, ?6, ${SEQ_SUBQUERY})
ON CONFLICT(user_id, unit_id) DO UPDATE SET
  status = excluded.status,
  completed_at = excluded.completed_at,
  completed_lessons = excluded.completed_lessons,
  updated_at = excluded.updated_at,
  seq = excluded.seq
WHERE excluded.updated_at > unit_progress.updated_at`;

const UPSERT_CARD = `
INSERT INTO cards (user_id, card_id, kind, fsrs, updated_at, seq)
VALUES (?1, ?2, ?3, ?4, ?5, ${SEQ_SUBQUERY})
ON CONFLICT(user_id, card_id) DO UPDATE SET
  kind = excluded.kind,
  fsrs = excluded.fsrs,
  updated_at = excluded.updated_at,
  seq = excluded.seq
WHERE excluded.updated_at > cards.updated_at`;

const UPSERT_ACTIVITY = `
INSERT INTO activity (user_id, date, lessons, reviews, updated_at, seq)
VALUES (?1, ?2, ?3, ?4, ?5, ${SEQ_SUBQUERY})
ON CONFLICT(user_id, date) DO UPDATE SET
  lessons = excluded.lessons,
  reviews = excluded.reviews,
  updated_at = excluded.updated_at,
  seq = excluded.seq
WHERE excluded.updated_at > activity.updated_at`;

interface UnitDbRow {
  unit_id: string;
  status: string;
  completed_at: number | null;
  completed_lessons: string;
  updated_at: number;
  seq: number;
}
interface CardDbRow {
  card_id: string;
  kind: string;
  fsrs: string;
  updated_at: number;
  seq: number;
}
interface ActivityDbRow {
  date: string;
  lessons: number;
  reviews: number;
  updated_at: number;
  seq: number;
}

async function readSeq(db: D1Database): Promise<number> {
  const row = await db.prepare('SELECT seq FROM sync_meta WHERE id = 1').first<{ seq: number }>();
  return row?.seq ?? 0;
}

export async function applySync(
  db: D1Database,
  userId: string,
  req: SyncRequest,
): Promise<SyncResponse> {
  const current = await readSeq(db);
  const cursor = req.cursor > current ? 0 : req.cursor;
  const { unitProgress, cards, activity } = req.changes;

  if (unitProgress.length + cards.length + activity.length > 0) {
    const statements: D1PreparedStatement[] = [
      db.prepare('UPDATE sync_meta SET seq = seq + 1 WHERE id = 1'),
    ];
    for (const r of unitProgress) {
      statements.push(
        db
          .prepare(UPSERT_UNIT)
          .bind(
            userId,
            r.unitId,
            r.status,
            r.completedAt,
            JSON.stringify(r.completedLessons),
            r.updatedAt,
          ),
      );
    }
    for (const r of cards) {
      statements.push(
        db
          .prepare(UPSERT_CARD)
          .bind(userId, r.cardId, r.kind, JSON.stringify(r.fsrs), r.updatedAt),
      );
    }
    for (const r of activity) {
      statements.push(
        db.prepare(UPSERT_ACTIVITY).bind(userId, r.date, r.lessons, r.reviews, r.updatedAt),
      );
    }
    await db.batch(statements);
  }

  // Run the three pull SELECTs as one db.batch() rather than Promise.all(): a
  // batch executes as a single implicit transaction, so all three see the same
  // snapshot. With independent queries, a concurrent device's push could land
  // between them, and the client would compute a cursor that skips a row that
  // was already committed at the time of this pull, forever.
  const [units, cardRows, activityRows] = (await db.batch([
    db
      .prepare(
        'SELECT unit_id, status, completed_at, completed_lessons, updated_at, seq FROM unit_progress WHERE user_id = ?1 AND seq > ?2 ORDER BY seq, unit_id',
      )
      .bind(userId, cursor),
    db
      .prepare(
        'SELECT card_id, kind, fsrs, updated_at, seq FROM cards WHERE user_id = ?1 AND seq > ?2 ORDER BY seq, card_id',
      )
      .bind(userId, cursor),
    db
      .prepare(
        'SELECT date, lessons, reviews, updated_at, seq FROM activity WHERE user_id = ?1 AND seq > ?2 ORDER BY seq, date',
      )
      .bind(userId, cursor),
  ])) as [D1Result<UnitDbRow>, D1Result<CardDbRow>, D1Result<ActivityDbRow>];

  let maxSeq = cursor;
  for (const r of [...units.results, ...cardRows.results, ...activityRows.results]) {
    if (r.seq > maxSeq) maxSeq = r.seq;
  }

  return {
    cursor: maxSeq,
    changes: {
      unitProgress: units.results.map(
        (r): UnitProgressRow => ({
          unitId: r.unit_id,
          status: r.status as UnitStatus,
          completedAt: r.completed_at,
          completedLessons: JSON.parse(r.completed_lessons ?? '[]') as number[],
          updatedAt: r.updated_at,
        }),
      ),
      cards: cardRows.results.map(
        (r): CardRow => ({
          cardId: r.card_id,
          kind: r.kind as CardKind,
          fsrs: JSON.parse(r.fsrs) as FsrsState,
          updatedAt: r.updated_at,
        }),
      ),
      activity: activityRows.results.map(
        (r): ActivityRow => ({
          date: r.date,
          lessons: r.lessons,
          reviews: r.reviews,
          updatedAt: r.updated_at,
        }),
      ),
    },
  };
}
```

- [ ] **Step 10: Wire `index.ts` to pass the authenticated user id through**

```typescript
// apps/worker/src/index.ts
import { Hono } from 'hono';
import type { AppEnv } from './app-env.js';
import { requirePassphrase } from './auth.js';
import { parseSyncRequest } from './sync-request.js';
import { applySync } from './sync-store.js';

const app = new Hono<AppEnv>();

// Sync responses and health checks carry per-user or point-in-time state;
// make sure no cache (browser, CDN, or intermediary) ever serves a stale copy.
app.use('/api/*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
});

app.get('/api/health', (c) => c.json({ ok: true }));

app.use('/api/sync', requirePassphrase);

app.post('/api/sync', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid JSON' }, 400);
  }
  const parsed = parseSyncRequest(body);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const result = await applySync(c.env.DB, c.get('userId'), parsed.value);
  return c.json(result);
});

app.notFound((c) => c.json({ error: 'not found' }, 404));

app.onError((err, c) => {
  console.error('unhandled error', err);
  return c.json({ error: 'internal error' }, 500);
});

export default app;
```

(Only the `applySync(...)` call line actually changes; the rest is unchanged and shown for context.)

- [ ] **Step 11: Drop the `SYNC_PASSPHRASE` test binding**

```typescript
// apps/worker/vitest.config.ts
import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, 'migrations'));
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          // Test-only binding: migrations to apply in the setup file. Auth
          // in tests now goes through a seeded `users` row (see
          // test/apply-migrations.ts), not an env var.
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    test: {
      include: ['test/**/*.test.ts'],
      setupFiles: ['./test/apply-migrations.ts'],
    },
  };
});
```

- [ ] **Step 12: Seed test users after migrating**

```typescript
// apps/worker/test/apply-migrations.ts
import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { hashPassphrase } from '../src/crypto.js';

// Setup files run outside per-test storage isolation and may run more than
// once; applyD1Migrations only applies migrations not yet recorded, and the
// seed inserts below are idempotent (ON CONFLICT DO NOTHING) for the same
// reason.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

async function seedUser(userId: string, passphrase: string, displayName: string): Promise<void> {
  const passphraseHash = await hashPassphrase(passphrase);
  await env.DB.prepare(
    'INSERT INTO users (user_id, passphrase_hash, display_name, created_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(user_id) DO NOTHING',
  )
    .bind(userId, passphraseHash, displayName, 0)
    .run();
}

await seedUser('test-user', 'test-passphrase', 'Test User');
await seedUser('test-user-2', 'test-passphrase-2', 'Test User 2');
```

- [ ] **Step 13: Replace the health test's env-var assertion with a users-table check**

```typescript
// apps/worker/test/health.test.ts
// TODO: switch SELF (deprecated) to exports.default once wrangler types codegen is added.
import { SELF } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await SELF.fetch('https://hi.test/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  // In production non-API paths never reach the Worker (the assets layer serves
  // them); this pins the Worker's own behaviour, which the Vitest plugin exercises directly.
  it('answers unknown paths with a JSON 404', async () => {
    const res = await SELF.fetch('https://hi.test/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not found' });
  });
});

describe('test harness', () => {
  it('has a migrated D1 and a seeded test user', async () => {
    const row = await env.DB.prepare('SELECT seq FROM sync_meta WHERE id = 1').first<{
      seq: number;
    }>();
    expect(row).toEqual({ seq: 0 });
    const user = await env.DB.prepare('SELECT user_id FROM users WHERE user_id = ?1')
      .bind('test-user')
      .first<{ user_id: string }>();
    expect(user).toEqual({ user_id: 'test-user' });
  });
});
```

- [ ] **Step 14: Rewrite `sync-store.test.ts` for the new signature, plus an isolation test**

```typescript
// apps/worker/test/sync-store.test.ts
import { env } from 'cloudflare:workers';
import {
  emptyChanges,
  type ActivityRow,
  type CardRow,
  type SyncChanges,
  type UnitProgressRow,
} from '@hi-chinese/content';
import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_ROWS_PER_TABLE } from '../src/sync-request.js';
import { applySync } from '../src/sync-store.js';

// The Cloudflare vitest plugin isolates storage per test *file*, not per
// individual test case (this file's tests otherwise share one D1 instance),
// so reset the tables and sequence counter before every test.
beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM unit_progress'),
    env.DB.prepare('DELETE FROM cards'),
    env.DB.prepare('DELETE FROM activity'),
    env.DB.prepare('UPDATE sync_meta SET seq = 0 WHERE id = 1'),
  ]);
});

const USER = 'user-a';

const unit = (over: Partial<UnitProgressRow> = {}): UnitProgressRow => ({
  unitId: 'l1-u01',
  status: 'in-progress',
  completedAt: null,
  completedLessons: [],
  updatedAt: 1000,
  ...over,
});
const card = (over: Partial<CardRow> = {}): CardRow => ({
  cardId: 'word-recognition:w:我',
  kind: 'word-recognition',
  fsrs: {
    due: 2000,
    stability: 1,
    difficulty: 5,
    scheduledDays: 1,
    learningSteps: 0,
    reps: 1,
    lapses: 0,
    state: 2,
    lastReview: 1000,
  },
  updatedAt: 1000,
  ...over,
});
const activity = (over: Partial<ActivityRow> = {}): ActivityRow => ({
  date: '2026-09-10',
  lessons: 1,
  reviews: 0,
  updatedAt: 1000,
  ...over,
});
const changes = (partial: Partial<SyncChanges>): SyncChanges => ({ ...emptyChanges(), ...partial });

describe('applySync', () => {
  it('returns nothing for an empty database', async () => {
    const res = await applySync(env.DB, USER, { cursor: 0, changes: emptyChanges() });
    expect(res).toEqual({ cursor: 0, changes: emptyChanges() });
  });

  it('stores pushed rows, echoes them back, and advances the cursor', async () => {
    const res = await applySync(env.DB, USER, {
      cursor: 0,
      changes: changes({ unitProgress: [unit()], cards: [card()], activity: [activity()] }),
    });
    expect(res.cursor).toBe(1);
    expect(res.changes).toEqual({
      unitProgress: [unit()],
      cards: [card()],
      activity: [activity()],
    });

    const again = await applySync(env.DB, USER, { cursor: res.cursor, changes: emptyChanges() });
    expect(again).toEqual({ cursor: 1, changes: emptyChanges() });
  });

  it('applies last write wins by updatedAt', async () => {
    await applySync(env.DB, USER, {
      cursor: 0,
      changes: changes({ unitProgress: [unit({ updatedAt: 100 })] }),
    });
    // Older write loses.
    await applySync(env.DB, USER, {
      cursor: 0,
      changes: changes({
        unitProgress: [unit({ status: 'completed', completedAt: 50, updatedAt: 50 })],
      }),
    });
    let pull = await applySync(env.DB, USER, { cursor: 0, changes: emptyChanges() });
    expect(pull.changes.unitProgress).toEqual([unit({ updatedAt: 100 })]);
    // Newer write wins.
    await applySync(env.DB, USER, {
      cursor: 0,
      changes: changes({
        unitProgress: [unit({ status: 'completed', completedAt: 200, updatedAt: 200 })],
      }),
    });
    pull = await applySync(env.DB, USER, { cursor: 0, changes: emptyChanges() });
    expect(pull.changes.unitProgress).toEqual([
      unit({ status: 'completed', completedAt: 200, updatedAt: 200 }),
    ]);
  });

  it('does not advance the sequence for an unchanged (losing) write of an existing row', async () => {
    await applySync(env.DB, USER, {
      cursor: 0,
      changes: changes({ activity: [activity({ updatedAt: 100 })] }),
    });
    const res = await applySync(env.DB, USER, {
      cursor: 1,
      changes: changes({ activity: [activity({ lessons: 9, updatedAt: 50 })] }),
    });
    // The batch still consumed a sequence number, but the losing row kept seq 1, so nothing is newer than cursor 1.
    expect(res.changes).toEqual(emptyChanges());
    expect(res.cursor).toBe(1);
  });

  it('resets a cursor that is ahead of the server', async () => {
    await applySync(env.DB, USER, { cursor: 0, changes: changes({ cards: [card()] }) });
    const res = await applySync(env.DB, USER, { cursor: 999, changes: emptyChanges() });
    expect(res.changes.cards).toEqual([card()]);
    expect(res.cursor).toBe(1);
  });

  it('lets a second device catch up on what the first pushed', async () => {
    const a1 = await applySync(env.DB, USER, {
      cursor: 0,
      changes: changes({ unitProgress: [unit()] }),
    });
    expect(a1.cursor).toBe(1);
    const b1 = await applySync(env.DB, USER, {
      cursor: 0,
      changes: changes({ unitProgress: [unit({ unitId: 'l1-u02', updatedAt: 1500 })] }),
    });
    expect(b1.cursor).toBe(2);
    expect(b1.changes.unitProgress.map((u) => u.unitId)).toEqual(['l1-u01', 'l1-u02']);
    const a2 = await applySync(env.DB, USER, { cursor: a1.cursor, changes: emptyChanges() });
    expect(a2.cursor).toBe(2);
    expect(a2.changes.unitProgress.map((u) => u.unitId)).toEqual(['l1-u02']);
  });

  it('round-trips fsrs state exactly', async () => {
    const c = card({
      fsrs: {
        due: 1.5,
        stability: 0.123456789,
        difficulty: 7.25,
        scheduledDays: 0,
        learningSteps: 2,
        reps: 3,
        lapses: 1,
        state: 1,
        lastReview: null,
      },
    });
    const res = await applySync(env.DB, USER, { cursor: 0, changes: changes({ cards: [c] }) });
    expect(res.changes.cards).toEqual([c]);
  });

  it('accepts exactly MAX_ROWS_PER_TABLE rows per table in one push', async () => {
    const startDate = new Date('2020-01-01T00:00:00Z');
    const dateAt = (i: number) => {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    };
    const unitProgress = Array.from({ length: MAX_ROWS_PER_TABLE }, (_, i) =>
      unit({ unitId: `l1-u${i}` }),
    );
    const cards = Array.from({ length: MAX_ROWS_PER_TABLE }, (_, i) =>
      card({ cardId: `word-recall:w:x${i}`, kind: 'word-recall' }),
    );
    const activityRows = Array.from({ length: MAX_ROWS_PER_TABLE }, (_, i) =>
      activity({ date: dateAt(i) }),
    );

    const res = await applySync(env.DB, USER, {
      cursor: 0,
      changes: changes({ unitProgress, cards, activity: activityRows }),
    });
    expect(res.changes.unitProgress).toHaveLength(MAX_ROWS_PER_TABLE);
    expect(res.changes.cards).toHaveLength(MAX_ROWS_PER_TABLE);
    expect(res.changes.activity).toHaveLength(MAX_ROWS_PER_TABLE);
    expect(res.cursor).toBe(1);

    const pull = await applySync(env.DB, USER, { cursor: res.cursor, changes: emptyChanges() });
    expect(pull).toEqual({ cursor: 1, changes: emptyChanges() });
  });

  it('isolates rows between users, even when they share the same unit id', async () => {
    await applySync(env.DB, 'user-a', {
      cursor: 0,
      changes: changes({ unitProgress: [unit()] }),
    });
    await applySync(env.DB, 'user-b', {
      cursor: 0,
      changes: changes({
        unitProgress: [unit({ status: 'completed', completedAt: 500, updatedAt: 500 })],
      }),
    });

    const pullA = await applySync(env.DB, 'user-a', { cursor: 0, changes: emptyChanges() });
    const pullB = await applySync(env.DB, 'user-b', { cursor: 0, changes: emptyChanges() });

    expect(pullA.changes.unitProgress).toEqual([unit()]);
    expect(pullB.changes.unitProgress).toEqual([
      unit({ status: 'completed', completedAt: 500, updatedAt: 500 }),
    ]);
  });
});
```

- [ ] **Step 15: Add an end-to-end isolation test at the HTTP route level**

Append to `apps/worker/test/sync-route.test.ts` (inside the existing `describe('POST /api/sync', ...)` block, after the `'still requires the passphrase'` test):

```typescript
  it('keeps progress isolated between two different users', async () => {
    await post(
      JSON.stringify({
        cursor: 0,
        changes: {
          ...emptyChanges(),
          unitProgress: [
            {
              unitId: 'l1-u01',
              status: 'completed',
              completedAt: 1000,
              completedLessons: [0, 1, 2],
              updatedAt: 1000,
            },
          ],
        },
      }),
      'test-passphrase',
    );

    const other = await post(JSON.stringify({ cursor: 0, changes: emptyChanges() }), 'test-passphrase-2');
    expect(((await other.json()) as SyncResponse).changes.unitProgress).toEqual([]);
  });
```

This relies on the `test-user-2` / `test-passphrase-2` seed from Step 12.

- [ ] **Step 16: Run the full worker test suite**

Run: `pnpm -F @hi-chinese/worker test`
Expected: PASS — every file in `apps/worker/test/` green.

- [ ] **Step 17: Typecheck**

Run: `pnpm -F @hi-chinese/worker typecheck`
Expected: PASS (no errors from the `AppEnv`/`Cloudflare.Env` changes).

- [ ] **Step 18: Commit**

```bash
git add apps/worker/migrations/0004_multi_user.sql apps/worker/test/migration.test.ts \
  apps/worker/src/app-env.ts apps/worker/src/env.d.ts apps/worker/src/auth.ts \
  apps/worker/src/sync-store.ts apps/worker/src/index.ts apps/worker/vitest.config.ts \
  apps/worker/test/apply-migrations.ts apps/worker/test/auth.test.ts \
  apps/worker/test/health.test.ts apps/worker/test/sync-store.test.ts \
  apps/worker/test/sync-route.test.ts
git commit -m "feat(worker): partition sync data by user_id, per-user passphrases"
```

---

### Task 3: User provisioning script

**Files:**
- Create: `apps/worker/scripts/add-user.mjs`
- Modify: `apps/worker/package.json`

**Interfaces:**
- Consumes: the `users` table schema from Task 2 (`user_id`, `passphrase_hash`, `display_name`, `created_at`); duplicates (does not import) the hashing logic from `apps/worker/src/crypto.ts` since this script runs under plain Node, not the Workers runtime.
- Produces: a `pnpm -F @hi-chinese/worker add-user -- --user-id <id> [--name <name>] (--local|--remote)` CLI command.

- [ ] **Step 1: Write the script**

```javascript
#!/usr/bin/env node
// apps/worker/scripts/add-user.mjs
import { webcrypto } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// Keep this hashing logic identical to apps/worker/src/crypto.ts's
// hashPassphrase — this script runs under plain Node (to shell out to
// wrangler), not the Workers runtime, so it can't import that module directly.
async function hashPassphrase(passphrase) {
  const digest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(passphrase));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomPassphrase() {
  const bytes = webcrypto.getRandomValues(new Uint8Array(18));
  return Buffer.from(bytes).toString('base64url');
}

function sqlString(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

const { values } = parseArgs({
  options: {
    'user-id': { type: 'string' },
    name: { type: 'string' },
    remote: { type: 'boolean', default: false },
    local: { type: 'boolean', default: false },
  },
});

const userId = values['user-id'];
if (!userId || !/^[a-z0-9-]+$/.test(userId)) {
  console.error(
    'Usage: pnpm add-user -- --user-id <lowercase-id> [--name "Display Name"] (--remote | --local)',
  );
  console.error('  --user-id must match /^[a-z0-9-]+$/');
  process.exit(1);
}
if (values.remote === values.local) {
  console.error('Pass exactly one of --remote or --local.');
  process.exit(1);
}

const passphrase = randomPassphrase();
const passphraseHash = await hashPassphrase(passphrase);
const createdAt = Date.now();
const displayNameSql = values.name ? sqlString(values.name) : 'NULL';

const sql = `INSERT INTO users (user_id, passphrase_hash, display_name, created_at) VALUES (${sqlString(userId)}, ${sqlString(passphraseHash)}, ${displayNameSql}, ${createdAt});`;

const workerDir = fileURLToPath(new URL('..', import.meta.url));
execFileSync(
  'wrangler',
  ['d1', 'execute', 'hi-chinese', values.remote ? '--remote' : '--local', '--command', sql],
  { cwd: workerDir, stdio: 'inherit' },
);

console.log(`\nUser '${userId}' created. Passphrase (shown once — not stored anywhere, copy it now):\n`);
console.log(`  ${passphrase}\n`);
```

- [ ] **Step 2: Register the script**

```json
// apps/worker/package.json — add to "scripts"
"add-user": "node scripts/add-user.mjs"
```

- [ ] **Step 3: Verify manually against local D1**

Run:
```bash
pnpm -F @hi-chinese/worker db:migrate:local
pnpm -F @hi-chinese/worker add-user -- --user-id tung --name "Tung" --local
```
Expected: the command prints a generated passphrase once. Then run:
```bash
wrangler d1 execute hi-chinese --local --command "SELECT user_id, display_name FROM users" --config apps/worker/wrangler.jsonc
```
Expected: one row, `{ user_id: 'tung', display_name: 'Tung' }`.

- [ ] **Step 4: Commit**

```bash
git add apps/worker/scripts/add-user.mjs apps/worker/package.json
git commit -m "feat(worker): add script to provision new sync users"
```

---

### Task 4: Cleanup — drop the old passphrase var file, personalize client copy

**Files:**
- Modify: `apps/worker/.dev.vars.example` (delete)
- Modify: `apps/web/src/setup/SetupScreen.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by later tasks (this is the last task).

- [ ] **Step 1: Delete the stale passphrase template**

```bash
git rm apps/worker/.dev.vars.example
```

`SYNC_PASSPHRASE` is no longer read anywhere; a developer's own local `.dev.vars` (git-ignored) may still contain a stale `SYNC_PASSPHRASE` line, which is now simply unused and harmless.

- [ ] **Step 2: Personalize the setup screen copy**

In `apps/web/src/setup/SetupScreen.tsx`, change:

```tsx
      <p className="text-stone-600">
        Enter your sync passphrase to load your progress on this device.
      </p>
```
to:
```tsx
      <p className="text-stone-600">
        Enter your passphrase to load your progress on this device.
      </p>
```

and change:
```tsx
      <label className="flex flex-col gap-1 text-sm font-medium">
        Passphrase
```
to:
```tsx
      <label className="flex flex-col gap-1 text-sm font-medium">
        Your passphrase
```

This is copy-only — no test exists or is needed for this component's text.

- [ ] **Step 3: Typecheck the web app**

Run: `pnpm -F @hi-chinese/web typecheck`
Expected: PASS (copy-only change, no type impact).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/setup/SetupScreen.tsx
git commit -m "chore: drop unused SYNC_PASSPHRASE template, personalize passphrase copy"
```

---

## Final Verification

- [ ] Run `pnpm -F @hi-chinese/worker test` — all green.
- [ ] Run `pnpm typecheck` (repo root) — all packages pass.
- [ ] Manually confirm (Task 3, Step 3) that a freshly provisioned user's passphrase is accepted by `pnpm -F @hi-chinese/worker dev` + a request to `/api/sync` with that bearer token.
