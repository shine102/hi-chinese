# Phase 2: Cloudflare Worker and D1 Sync API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `apps/worker`, a Cloudflare Worker (Hono) with a D1 database that stores the learner's progress and exposes `POST /api/sync` (passphrase-protected) and `GET /api/health`, tested against a real local D1 with the Cloudflare Vitest plugin.

**Architecture:** Shared progress types live in `packages/content` so the Phase 3 web client and the Worker agree on shapes. The Worker is three small modules: bearer-passphrase auth (constant-time compare), a pure request validator, and a D1 sync store that upserts rows with last-write-wins on `updatedAt` and hands out a monotonically increasing server sequence number as the client's cursor. Static asset serving is deferred to Phase 3 (the `apps/web/dist` directory does not exist yet and Wrangler requires it).

**Tech Stack:** Hono 4.13, Wrangler 4.130 (local dev, migrations, deploy), D1 (SQLite), `@cloudflare/vitest-plugin` 1.1.6 with Vitest 4.1 running tests inside workerd against a migrated local D1, `@cloudflare/workers-types`.

**Spec:** `docs/superpowers/specs/2026-09-09-hi-chinese-design.md` (section 7 is what this plan implements; section 2 for layout). Roadmap and prior rulings: `docs/superpowers/plans/README.md`.

## Global Constraints

- Package manager pnpm 10 (binary on this machine: `~/.npm-global/node_modules/.bin/pnpm`; prefix shells with `export PATH="$HOME/.npm-global/node_modules/.bin:$PATH"`). Never commit `package-lock.json`.
- Vitest pinned to `~4.1.11` everywhere (the Cloudflare plugin requires `^4.1.0`). `typescript ~5.9.0`.
- TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax` (from `tsconfig.base.json`); `import type` for type-only imports; relative imports use the `.js` extension.
- `packages/content` keeps zero runtime dependencies. The Worker's only runtime dependency is `hono`.
- API surface is exactly `POST /api/sync` and `GET /api/health` (spec §7). Auth is a single passphrase sent as `Authorization: Bearer <passphrase>`, compared in constant time against the `SYNC_PASSPHRASE` secret; wrong or missing token → 401; unconfigured secret → 500. The passphrase never appears in the repo, logs, or test snapshots except the test-only value `test-passphrase` injected by the Vitest config.
- Conflict resolution: last write wins per row by `updatedAt` (epoch milliseconds, integer). Rows: `unit_progress`, `cards`, `activity` plus `sync_meta` holding the server sequence counter. Migrations live in `apps/worker/migrations` and are applied with Wrangler.
- Never commit `.dev.vars` (git-ignored). Never run `wrangler deploy`, `wrangler login`, or any `--remote` command in this plan; remote setup is documented for the user to run.
- Commit messages: conventional prefix (`feat:`, `test:`, `chore:`, `docs:`). Plain `git commit` with the user's global identity; no Co-Authored-By trailer.

## Verified facts (2026-09-10)

- `@cloudflare/vitest-plugin@1.1.6` exports `cloudflareTest(options)` and `readD1Migrations(dir)`; its `cloudflare:test` module exports `applyD1Migrations(db, migrations)`. Tests import `env` and `exports` from `cloudflare:workers` and call `exports.default.fetch(url, init)` (fallback if `exports` is untyped: `import { SELF } from 'cloudflare:test'` and `SELF.fetch`). Peer: `vitest ^4.1.0`.
- Reference fixture: `https://github.com/cloudflare/workers-sdk/tree/main/fixtures/vitest-plugin-examples/d1` (vitest.config.ts with `miniflare.bindings.TEST_MIGRATIONS`, `test/apply-migrations.ts`, `test/env.d.ts` augmenting `Cloudflare.Env`).
- Latest versions: `hono 4.13.7`, `wrangler 4.130.0`, `@cloudflare/workers-types 5.20260910.1`. The globally installed wrangler is 4.85; always run wrangler through pnpm (`pnpm -F @hi-chinese/worker exec wrangler ...` or package scripts) so the pinned 4.130 is used.
- Hono: `new Hono<{ Bindings: Cloudflare.Env }>()`, `c.env.DB`, `c.req.header('authorization')`, `c.req.json()`, `c.json(body, status)`, `createMiddleware` from `hono/factory`.
- D1: `db.prepare(sql).bind(...).first<T>() / .all<T>() / .run()`, `db.batch([...])` executes statements sequentially in one implicit transaction (all or nothing).

## File structure

```
packages/content/src/progress.ts         progress + sync wire types, CARD_KINDS, cardId/parseCardId, emptyChanges
packages/content/src/index.ts            add `export * from './progress.js'`
packages/content/test/progress.test.ts

apps/worker/package.json                 @hi-chinese/worker: dev, test, typecheck, deploy, db:migrate:local, db:migrate:remote
apps/worker/wrangler.jsonc               name hi-chinese, main src/index.ts, D1 binding DB, migrations_dir
apps/worker/tsconfig.json                worker source (workers-types)
apps/worker/vitest.config.ts             cloudflareTest + TEST_MIGRATIONS + SYNC_PASSPHRASE test binding
apps/worker/.dev.vars.example            SYNC_PASSPHRASE=change-me
apps/worker/migrations/0001_init.sql     schema
apps/worker/src/env.d.ts                 Cloudflare.Env { DB, SYNC_PASSPHRASE }
apps/worker/src/app-env.ts               AppEnv type for Hono generics
apps/worker/src/index.ts                 Hono app: health, auth on /api/sync, sync route, notFound, onError
apps/worker/src/auth.ts                  constantTimeEqual, extractBearer, requirePassphrase
apps/worker/src/sync-request.ts          parseSyncRequest (pure validation), MAX_ROWS_PER_TABLE
apps/worker/src/sync-store.ts            applySync(db, request) → SyncResponse (D1 upserts + pull)
apps/worker/test/tsconfig.json           test types (workers-types + vitest-plugin types)
apps/worker/test/env.d.ts                Cloudflare.Env { TEST_MIGRATIONS }
apps/worker/test/apply-migrations.ts     setup file
apps/worker/test/health.test.ts
apps/worker/test/auth.test.ts
apps/worker/test/sync-request.test.ts
apps/worker/test/sync-store.test.ts
apps/worker/test/sync-route.test.ts
README.md                                Worker + Cloudflare setup section
docs/superpowers/plans/README.md         Phase 2 row updated
```

---

### Task 1: Shared progress and sync types

**Files:**
- Create: `packages/content/src/progress.ts`
- Modify: `packages/content/src/index.ts` (add one export line)
- Test: `packages/content/test/progress.test.ts`

**Interfaces:**
- Produces (imported by every Worker task and by Phase 3):

```ts
export type UnitStatus = 'in-progress' | 'completed';
export interface UnitProgressRow { unitId: string; status: UnitStatus; completedAt: number | null; updatedAt: number }
export type CardKind = 'word-recognition' | 'word-recall' | 'char-write';
export const CARD_KINDS: readonly CardKind[];
export interface FsrsState { due: number; stability: number; difficulty: number; scheduledDays: number; learningSteps: number; reps: number; lapses: number; state: 0 | 1 | 2 | 3; lastReview: number | null }
export interface CardRow { cardId: string; kind: CardKind; fsrs: FsrsState; updatedAt: number }
export interface ActivityRow { date: string; lessons: number; reviews: number; updatedAt: number }   // date = YYYY-MM-DD
export interface SyncChanges { unitProgress: UnitProgressRow[]; cards: CardRow[]; activity: ActivityRow[] }
export interface SyncRequest { cursor: number; changes: SyncChanges }
export interface SyncResponse { cursor: number; changes: SyncChanges }
export function emptyChanges(): SyncChanges;
export function cardId(kind: CardKind, itemId: string): string;           // `${kind}:${itemId}`
export function parseCardId(id: string): { kind: CardKind; itemId: string } | null;
```

All timestamps are epoch milliseconds as integers. Item ids contain colons (`w:我`), so `parseCardId` splits on the first colon only.

- [ ] **Step 1: Write the failing test**

`packages/content/test/progress.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CARD_KINDS, cardId, emptyChanges, parseCardId } from '../src/progress.js';

describe('cardId / parseCardId', () => {
  it('round-trips ids whose item id contains colons', () => {
    const id = cardId('word-recognition', 'w:我');
    expect(id).toBe('word-recognition:w:我');
    expect(parseCardId(id)).toEqual({ kind: 'word-recognition', itemId: 'w:我' });
    expect(parseCardId(cardId('char-write', '你'))).toEqual({ kind: 'char-write', itemId: '你' });
  });
  it('rejects unknown kinds, missing separators and empty item ids', () => {
    expect(parseCardId('bogus:w:我')).toBeNull();
    expect(parseCardId('word-recall')).toBeNull();
    expect(parseCardId('word-recall:')).toBeNull();
    expect(parseCardId('')).toBeNull();
  });
  it('lists exactly the three card kinds', () => {
    expect([...CARD_KINDS]).toEqual(['word-recognition', 'word-recall', 'char-write']);
  });
});

describe('emptyChanges', () => {
  it('returns fresh empty arrays each call', () => {
    const a = emptyChanges();
    const b = emptyChanges();
    expect(a).toEqual({ unitProgress: [], cards: [], activity: [] });
    expect(a.cards).not.toBe(b.cards);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @hi-chinese/content test -- progress`
Expected: FAIL, cannot find module `../src/progress.js`.

- [ ] **Step 3: Implement**

`packages/content/src/progress.ts`:

```ts
export type UnitStatus = 'in-progress' | 'completed';

export interface UnitProgressRow {
  unitId: string;
  status: UnitStatus;
  completedAt: number | null;
  updatedAt: number;
}

export type CardKind = 'word-recognition' | 'word-recall' | 'char-write';

export const CARD_KINDS: readonly CardKind[] = ['word-recognition', 'word-recall', 'char-write'];

export interface FsrsState {
  due: number;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: 0 | 1 | 2 | 3;
  lastReview: number | null;
}

export interface CardRow {
  cardId: string;
  kind: CardKind;
  fsrs: FsrsState;
  updatedAt: number;
}

export interface ActivityRow {
  /** Calendar day in the learner's local time, formatted YYYY-MM-DD. */
  date: string;
  lessons: number;
  reviews: number;
  updatedAt: number;
}

export interface SyncChanges {
  unitProgress: UnitProgressRow[];
  cards: CardRow[];
  activity: ActivityRow[];
}

export interface SyncRequest {
  /** Highest server sequence number the client has already seen; 0 on first sync. */
  cursor: number;
  changes: SyncChanges;
}

export interface SyncResponse {
  cursor: number;
  changes: SyncChanges;
}

export function emptyChanges(): SyncChanges {
  return { unitProgress: [], cards: [], activity: [] };
}

export function cardId(kind: CardKind, itemId: string): string {
  return `${kind}:${itemId}`;
}

export function parseCardId(id: string): { kind: CardKind; itemId: string } | null {
  const sep = id.indexOf(':');
  if (sep <= 0) return null;
  const kind = id.slice(0, sep);
  const itemId = id.slice(sep + 1);
  if (itemId.length === 0) return null;
  if (!(CARD_KINDS as readonly string[]).includes(kind)) return null;
  return { kind: kind as CardKind, itemId };
}
```

Append to `packages/content/src/index.ts`:

```ts
export * from './progress.js';
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm -F @hi-chinese/content test && pnpm -F @hi-chinese/content typecheck`
Expected: all pass (previous 57 plus the new ones).

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/progress.ts packages/content/src/index.ts packages/content/test/progress.test.ts
git commit -m "feat(content): add shared progress and sync wire types"
```

---

### Task 2: Worker package scaffold, D1 schema, and health route

**Files:**
- Create: `apps/worker/package.json`, `apps/worker/wrangler.jsonc`, `apps/worker/tsconfig.json`, `apps/worker/vitest.config.ts`, `apps/worker/.dev.vars.example`
- Create: `apps/worker/migrations/0001_init.sql`
- Create: `apps/worker/src/env.d.ts`, `apps/worker/src/app-env.ts`, `apps/worker/src/index.ts`
- Create: `apps/worker/test/tsconfig.json`, `apps/worker/test/env.d.ts`, `apps/worker/test/apply-migrations.ts`
- Test: `apps/worker/test/health.test.ts`

**Interfaces:**
- Produces: `AppEnv = { Bindings: Cloudflare.Env }` (from `src/app-env.ts`); the Hono `app` default export in `src/index.ts` that later tasks add routes to; D1 tables `unit_progress`, `cards`, `activity`, `sync_meta`; a test harness where `env.DB` is a migrated D1 and `env.SYNC_PASSPHRASE === 'test-passphrase'`.

- [ ] **Step 1: Package and tool config**

`apps/worker/package.json`:

```json
{
  "name": "@hi-chinese/worker",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "test": "vitest run",
    "typecheck": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p test/tsconfig.json",
    "deploy": "wrangler deploy",
    "db:migrate:local": "wrangler d1 migrations apply hi-chinese --local",
    "db:migrate:remote": "wrangler d1 migrations apply hi-chinese --remote"
  },
  "dependencies": {
    "hono": "^4.13.7"
  },
  "devDependencies": {
    "@cloudflare/vitest-plugin": "^1.1.6",
    "@cloudflare/workers-types": "^5.20260910.1",
    "@hi-chinese/content": "workspace:*",
    "typescript": "~5.9.0",
    "vitest": "~4.1.11",
    "wrangler": "^4.130.0"
  }
}
```

`apps/worker/wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "hi-chinese",
  "main": "src/index.ts",
  "compatibility_date": "2026-09-01",
  "observability": { "enabled": true },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "hi-chinese",
      // Placeholder for local dev and tests. Replace with the id printed by
      // `wrangler d1 create hi-chinese` before the first remote deploy.
      "database_id": "00000000-0000-0000-0000-000000000000",
      "migrations_dir": "migrations"
    }
  ]
}
```

`apps/worker/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types/experimental"],
    "noEmit": true
  },
  "include": ["src"]
}
```

`apps/worker/test/tsconfig.json`:

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types/experimental", "@cloudflare/vitest-plugin/types"],
    "noEmit": true
  },
  "include": ["./**/*.ts", "../src/**/*.ts"]
}
```

`apps/worker/vitest.config.ts`:

```ts
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
          // Test-only bindings: migrations to apply in the setup file, and the
          // passphrase the auth tests send. Never a real secret.
          bindings: { TEST_MIGRATIONS: migrations, SYNC_PASSPHRASE: 'test-passphrase' },
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

`apps/worker/.dev.vars.example`:

```
# Copy to .dev.vars (git-ignored) for `pnpm -F @hi-chinese/worker dev`.
SYNC_PASSPHRASE=change-me
```

- [ ] **Step 2: Schema migration**

`apps/worker/migrations/0001_init.sql`:

```sql
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
```

- [ ] **Step 3: Type declarations and minimal app**

`apps/worker/src/env.d.ts`:

```ts
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    SYNC_PASSPHRASE: string;
  }
}
```

`apps/worker/src/app-env.ts`:

```ts
export type AppEnv = { Bindings: Cloudflare.Env };
```

`apps/worker/src/index.ts`:

```ts
import { Hono } from 'hono';
import type { AppEnv } from './app-env.js';

const app = new Hono<AppEnv>();

app.get('/api/health', (c) => c.json({ ok: true }));

app.notFound((c) => c.json({ error: 'not found' }, 404));

app.onError((err, c) => {
  console.error('unhandled error', err);
  return c.json({ error: 'internal error' }, 500);
});

export default app;
```

`apps/worker/test/env.d.ts`:

```ts
declare namespace Cloudflare {
  interface Env {
    /** Injected by vitest.config.ts so the setup file can migrate the test D1. */
    TEST_MIGRATIONS: import('cloudflare:test').D1Migration[];
  }
}
```

`apps/worker/test/apply-migrations.ts`:

```ts
import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';

// Setup files run outside per-test storage isolation and may run more than
// once; applyD1Migrations only applies migrations not yet recorded.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
```

- [ ] **Step 4: Write the failing test**

`apps/worker/test/health.test.ts`:

```ts
import { env, exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await exports.default.fetch('https://hi.test/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('answers unknown paths with a JSON 404', async () => {
    const res = await exports.default.fetch('https://hi.test/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not found' });
  });
});

describe('test harness', () => {
  it('has a migrated D1 and the test passphrase', async () => {
    const row = await env.DB.prepare('SELECT seq FROM sync_meta WHERE id = 1').first<{ seq: number }>();
    expect(row).toEqual({ seq: 0 });
    expect(env.SYNC_PASSPHRASE).toBe('test-passphrase');
  });
});
```

If `exports` is not exported by the installed `cloudflare:workers` types, switch both test files to `import { SELF } from 'cloudflare:test'` and `SELF.fetch(...)`, and note it in the report.

- [ ] **Step 5: Install and run**

```bash
pnpm install
pnpm -F @hi-chinese/worker test
pnpm -F @hi-chinese/worker typecheck
```

Expected: the plugin downloads/starts workerd, applies the migration, and 3 tests pass; typecheck prints nothing. If `pnpm install` fails to fetch the `workerd` binary because of the proxy, report BLOCKED with the exact error.

Also run `pnpm test` and `pnpm typecheck` at the root to confirm the workspace still passes end to end, and `pnpm format:check` (run `pnpm format` if it flags new files; commit the result).

- [ ] **Step 6: Commit**

```bash
git add apps/worker pnpm-lock.yaml
git commit -m "feat(worker): scaffold Cloudflare Worker with D1 schema and health route"
```

---

### Task 3: Passphrase auth middleware

**Files:**
- Create: `apps/worker/src/auth.ts`
- Modify: `apps/worker/src/index.ts` (register middleware on `/api/sync`)
- Test: `apps/worker/test/auth.test.ts`

**Interfaces:**
- Consumes: `AppEnv` from `src/app-env.ts`.
- Produces:

```ts
export function constantTimeEqual(a: string, b: string): boolean;
export function extractBearer(header: string | undefined): string | null;
export const requirePassphrase: MiddlewareHandler<AppEnv>;  // 500 if SYNC_PASSPHRASE unset/empty, 401 if token missing or wrong, else next()
```

- [ ] **Step 1: Write the failing test**

`apps/worker/test/auth.test.ts`:

```ts
import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { constantTimeEqual, extractBearer } from '../src/auth.js';

describe('constantTimeEqual', () => {
  it('is true only for identical strings', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'ab')).toBe(false);
    expect(constantTimeEqual('', '')).toBe(true);
    expect(constantTimeEqual('密码', '密码')).toBe(true);
    expect(constantTimeEqual('密码', '密碼')).toBe(false);
  });
});

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
    const res = await exports.default.fetch('https://hi.test/api/sync', { method: 'POST', body: '{}' });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });
  it('rejects a wrong token with 401', async () => {
    const res = await exports.default.fetch('https://hi.test/api/sync', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong' },
      body: '{}',
    });
    expect(res.status).toBe(401);
  });
  it('lets the right token through to the route (404 until the route exists)', async () => {
    const res = await exports.default.fetch('https://hi.test/api/sync', {
      method: 'POST',
      headers: { authorization: 'Bearer test-passphrase' },
      body: '{}',
    });
    expect(res.status).not.toBe(401);
  });
  it('does not guard the health route', async () => {
    const res = await exports.default.fetch('https://hi.test/api/health');
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @hi-chinese/worker test -- auth`
Expected: FAIL, cannot find module `../src/auth.js`.

- [ ] **Step 3: Implement**

`apps/worker/src/auth.ts`:

```ts
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from './app-env.js';

const encoder = new TextEncoder();

/** Compares two strings without short-circuiting on the first differing byte. */
export function constantTimeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

export function extractBearer(header: string | undefined): string | null {
  if (header === undefined) return null;
  const match = /^Bearer\s+(\S.*)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

export const requirePassphrase = createMiddleware<AppEnv>(async (c, next) => {
  const secret = c.env.SYNC_PASSPHRASE;
  if (typeof secret !== 'string' || secret.length === 0) {
    console.error('SYNC_PASSPHRASE is not configured');
    return c.json({ error: 'server not configured' }, 500);
  }
  const token = extractBearer(c.req.header('authorization'));
  if (token === null || !constantTimeEqual(token, secret)) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  await next();
});
```

In `apps/worker/src/index.ts`, add after the health route:

```ts
import { requirePassphrase } from './auth.js';
// ...
app.use('/api/sync', requirePassphrase);
```

(Keep the import at the top with the others.)

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm -F @hi-chinese/worker test && pnpm -F @hi-chinese/worker typecheck`
Expected: all pass. The "right token" test gets 404 for now.

- [ ] **Step 5: Commit**

```bash
git add apps/worker/src/auth.ts apps/worker/src/index.ts apps/worker/test/auth.test.ts
git commit -m "feat(worker): add constant-time passphrase bearer auth"
```

---

### Task 4: Sync request validation

**Files:**
- Create: `apps/worker/src/sync-request.ts`
- Test: `apps/worker/test/sync-request.test.ts`

**Interfaces:**
- Consumes: `SyncRequest`, `UnitProgressRow`, `CardRow`, `ActivityRow`, `FsrsState`, `CardKind`, `parseCardId` from `@hi-chinese/content`.
- Produces:

```ts
export const MAX_ROWS_PER_TABLE = 500;
export type ParseResult = { ok: true; value: SyncRequest } | { ok: false; error: string };
export function parseSyncRequest(input: unknown): ParseResult;
```

Rules: `cursor` is a non-negative safe integer; `changes` has the three arrays (each may be empty, none may be missing, each at most `MAX_ROWS_PER_TABLE` rows); every row is rebuilt from known fields only (unknown fields dropped). `updatedAt` is a positive integer. `unitProgress.status` ∈ {in-progress, completed}; `completedAt` integer or null. `cards.cardId` must parse with `parseCardId` and its kind must equal `kind`; `fsrs` numeric fields are finite numbers, `state` ∈ {0,1,2,3}, `lastReview` number or null. `activity.date` matches `^\d{4}-\d{2}-\d{2}$`; `lessons`/`reviews` non-negative integers. Error strings name the path, e.g. `changes.cards[1].kind: does not match cardId`.

- [ ] **Step 1: Write the failing test**

`apps/worker/test/sync-request.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MAX_ROWS_PER_TABLE, parseSyncRequest } from '../src/sync-request.js';

const fsrs = {
  due: 1_700_000_000_000,
  stability: 1.5,
  difficulty: 5.2,
  scheduledDays: 1,
  learningSteps: 0,
  reps: 1,
  lapses: 0,
  state: 2,
  lastReview: 1_699_900_000_000,
};

const valid = {
  cursor: 3,
  changes: {
    unitProgress: [{ unitId: 'l1-u01', status: 'completed', completedAt: 1_700_000_000_000, updatedAt: 1_700_000_000_001 }],
    cards: [{ cardId: 'word-recognition:w:我', kind: 'word-recognition', fsrs, updatedAt: 1_700_000_000_002 }],
    activity: [{ date: '2026-09-10', lessons: 1, reviews: 0, updatedAt: 1_700_000_000_003 }],
  },
};

const fail = (input: unknown) => {
  const r = parseSyncRequest(input);
  if (r.ok) throw new Error('expected failure');
  return r.error;
};

describe('parseSyncRequest', () => {
  it('accepts a valid request and strips unknown fields', () => {
    const r = parseSyncRequest({ ...valid, extra: 1, changes: { ...valid.changes, cards: [{ ...valid.changes.cards[0], junk: true }] } });
    expect(r).toEqual({ ok: true, value: valid });
  });
  it('accepts empty change sets', () => {
    expect(parseSyncRequest({ cursor: 0, changes: { unitProgress: [], cards: [], activity: [] } })).toEqual({
      ok: true,
      value: { cursor: 0, changes: { unitProgress: [], cards: [], activity: [] } },
    });
  });
  it('rejects non-objects and bad cursors', () => {
    expect(fail(null)).toMatch(/^body: /);
    expect(fail([])).toMatch(/^body: /);
    expect(fail({ ...valid, cursor: -1 })).toMatch(/^cursor: /);
    expect(fail({ ...valid, cursor: 1.5 })).toMatch(/^cursor: /);
    expect(fail({ ...valid, cursor: '3' })).toMatch(/^cursor: /);
  });
  it('rejects missing change arrays', () => {
    expect(fail({ cursor: 0, changes: { unitProgress: [], cards: [] } })).toMatch(/^changes\.activity: /);
    expect(fail({ cursor: 0 })).toMatch(/^changes: /);
  });
  it('rejects bad unit progress rows', () => {
    const row = valid.changes.unitProgress[0]!;
    expect(fail({ ...valid, changes: { ...valid.changes, unitProgress: [{ ...row, status: 'done' }] } })).toMatch(/^changes\.unitProgress\[0\]\.status: /);
    expect(fail({ ...valid, changes: { ...valid.changes, unitProgress: [{ ...row, completedAt: 1.5 }] } })).toMatch(/completedAt/);
    expect(fail({ ...valid, changes: { ...valid.changes, unitProgress: [{ ...row, updatedAt: 0 }] } })).toMatch(/updatedAt/);
    expect(fail({ ...valid, changes: { ...valid.changes, unitProgress: [{ ...row, unitId: '' }] } })).toMatch(/unitId/);
  });
  it('rejects bad card rows', () => {
    const row = valid.changes.cards[0]!;
    expect(fail({ ...valid, changes: { ...valid.changes, cards: [{ ...row, kind: 'word-recall' }] } })).toMatch(/^changes\.cards\[0\]\.kind: /);
    expect(fail({ ...valid, changes: { ...valid.changes, cards: [{ ...row, cardId: 'nope' }] } })).toMatch(/cardId/);
    expect(fail({ ...valid, changes: { ...valid.changes, cards: [{ ...row, fsrs: { ...fsrs, state: 4 } }] } })).toMatch(/fsrs\.state/);
    expect(fail({ ...valid, changes: { ...valid.changes, cards: [{ ...row, fsrs: { ...fsrs, stability: 'x' } }] } })).toMatch(/fsrs\.stability/);
    expect(fail({ ...valid, changes: { ...valid.changes, cards: [{ ...row, fsrs: { ...fsrs, lastReview: undefined } }] } })).toMatch(/fsrs\.lastReview/);
  });
  it('rejects bad activity rows', () => {
    const row = valid.changes.activity[0]!;
    expect(fail({ ...valid, changes: { ...valid.changes, activity: [{ ...row, date: '2026-9-1' }] } })).toMatch(/^changes\.activity\[0\]\.date: /);
    expect(fail({ ...valid, changes: { ...valid.changes, activity: [{ ...row, lessons: -1 }] } })).toMatch(/lessons/);
  });
  it('rejects oversized batches', () => {
    const many = Array.from({ length: MAX_ROWS_PER_TABLE + 1 }, (_, i) => ({ ...valid.changes.activity[0]!, date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}` }));
    expect(fail({ ...valid, changes: { ...valid.changes, activity: many } })).toMatch(/^changes\.activity: too many rows/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @hi-chinese/worker test -- sync-request`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

`apps/worker/src/sync-request.ts`:

```ts
import {
  parseCardId,
  type ActivityRow,
  type CardRow,
  type FsrsState,
  type SyncRequest,
  type UnitProgressRow,
  type UnitStatus,
} from '@hi-chinese/content';

export const MAX_ROWS_PER_TABLE = 500;

export type ParseResult = { ok: true; value: SyncRequest } | { ok: false; error: string };

class ParseError extends Error {}

function fail(path: string, message: string): never {
  throw new ParseError(`${path}: ${message}`);
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// Every reader takes the raw value and the full dotted path used in error messages.
function readRecord(v: unknown, path: string): Record<string, unknown> {
  if (!isRecord(v)) fail(path, 'expected object');
  return v;
}

function readString(v: unknown, path: string): string {
  if (typeof v !== 'string' || v.length === 0) fail(path, 'expected non-empty string');
  return v;
}

function readInt(v: unknown, path: string, min: number): number {
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < min) fail(path, `expected integer >= ${min}`);
  return v;
}

function readIntOrNull(v: unknown, path: string): number | null {
  if (v === null) return null;
  if (typeof v !== 'number' || !Number.isSafeInteger(v)) fail(path, 'expected integer or null');
  return v;
}

function readNumber(v: unknown, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(path, 'expected finite number');
  return v;
}

function readNumberOrNull(v: unknown, path: string): number | null {
  if (v === null) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(path, 'expected finite number or null');
  return v;
}

function readArray(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) fail(path, 'expected array');
  if (v.length > MAX_ROWS_PER_TABLE) fail(path, `too many rows (max ${MAX_ROWS_PER_TABLE})`);
  return v as unknown[];
}

function parseUnitProgress(v: unknown, path: string): UnitProgressRow {
  const obj = readRecord(v, path);
  const status = obj['status'];
  if (status !== 'in-progress' && status !== 'completed') fail(`${path}.status`, 'expected in-progress or completed');
  return {
    unitId: readString(obj['unitId'], `${path}.unitId`),
    status: status as UnitStatus,
    completedAt: readIntOrNull(obj['completedAt'], `${path}.completedAt`),
    updatedAt: readInt(obj['updatedAt'], `${path}.updatedAt`, 1),
  };
}

function parseFsrs(v: unknown, path: string): FsrsState {
  const obj = readRecord(v, path);
  const state = obj['state'];
  if (state !== 0 && state !== 1 && state !== 2 && state !== 3) fail(`${path}.state`, 'expected 0-3');
  return {
    due: readNumber(obj['due'], `${path}.due`),
    stability: readNumber(obj['stability'], `${path}.stability`),
    difficulty: readNumber(obj['difficulty'], `${path}.difficulty`),
    scheduledDays: readNumber(obj['scheduledDays'], `${path}.scheduledDays`),
    learningSteps: readNumber(obj['learningSteps'], `${path}.learningSteps`),
    reps: readNumber(obj['reps'], `${path}.reps`),
    lapses: readNumber(obj['lapses'], `${path}.lapses`),
    state: state as 0 | 1 | 2 | 3,
    lastReview: readNumberOrNull(obj['lastReview'], `${path}.lastReview`),
  };
}

function parseCard(v: unknown, path: string): CardRow {
  const obj = readRecord(v, path);
  const cardId = readString(obj['cardId'], `${path}.cardId`);
  const parsed = parseCardId(cardId);
  if (parsed === null) fail(`${path}.cardId`, 'malformed card id');
  if (obj['kind'] !== parsed.kind) fail(`${path}.kind`, 'does not match cardId');
  return {
    cardId,
    kind: parsed.kind,
    fsrs: parseFsrs(obj['fsrs'], `${path}.fsrs`),
    updatedAt: readInt(obj['updatedAt'], `${path}.updatedAt`, 1),
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseActivity(v: unknown, path: string): ActivityRow {
  const obj = readRecord(v, path);
  const date = readString(obj['date'], `${path}.date`);
  if (!DATE_RE.test(date)) fail(`${path}.date`, 'expected YYYY-MM-DD');
  return {
    date,
    lessons: readInt(obj['lessons'], `${path}.lessons`, 0),
    reviews: readInt(obj['reviews'], `${path}.reviews`, 0),
    updatedAt: readInt(obj['updatedAt'], `${path}.updatedAt`, 1),
  };
}

export function parseSyncRequest(input: unknown): ParseResult {
  try {
    const body = readRecord(input, 'body');
    const cursor = readInt(body['cursor'], 'cursor', 0);
    const changes = readRecord(body['changes'], 'changes');
    return {
      ok: true,
      value: {
        cursor,
        changes: {
          unitProgress: readArray(changes['unitProgress'], 'changes.unitProgress').map((r, i) =>
            parseUnitProgress(r, `changes.unitProgress[${i}]`),
          ),
          cards: readArray(changes['cards'], 'changes.cards').map((r, i) => parseCard(r, `changes.cards[${i}]`)),
          activity: readArray(changes['activity'], 'changes.activity').map((r, i) =>
            parseActivity(r, `changes.activity[${i}]`),
          ),
        },
      },
    };
  } catch (e) {
    if (e instanceof ParseError) return { ok: false, error: e.message };
    throw e;
  }
}
```

`fail` returns `never`, so TypeScript narrows after each guard; no non-null assertions are needed. The test for `fail(null)` expects `/^body: /` and the array case also fails at `body` because `isRecord` rejects arrays.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm -F @hi-chinese/worker test && pnpm -F @hi-chinese/worker typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/worker/src/sync-request.ts apps/worker/test/sync-request.test.ts
git commit -m "feat(worker): validate sync requests"
```

---

### Task 5: D1 sync store

**Files:**
- Create: `apps/worker/src/sync-store.ts`
- Test: `apps/worker/test/sync-store.test.ts`

**Interfaces:**
- Consumes: `SyncRequest`, `SyncResponse`, `SyncChanges`, `UnitProgressRow`, `CardRow`, `ActivityRow`, `FsrsState`, `CardKind`, `UnitStatus`, `emptyChanges` from `@hi-chinese/content`; the D1 schema from Task 2.
- Produces: `export async function applySync(db: D1Database, req: SyncRequest): Promise<SyncResponse>`.

Algorithm:
1. Read `current` = `sync_meta.seq`. If `req.cursor > current` the client's cursor is from a different or reset database: treat it as 0.
2. If any changes were pushed: run one `db.batch` containing `UPDATE sync_meta SET seq = seq + 1`, then one upsert per row that binds `seq = (SELECT seq FROM sync_meta WHERE id = 1)` and only overwrites when `excluded.updated_at > <table>.updated_at` (last write wins). One batch is one transaction, so concurrent devices serialize and each batch gets its own sequence number.
3. Pull all rows with `seq > cursor` from the three tables, ordered by `seq` then primary key. Response `cursor` = the largest `seq` among returned rows, or the (possibly reset) request cursor when nothing was returned. Rows the client itself just pushed are echoed back; that is intended (the client applies the same last-write-wins rule locally and the echo is a no-op).

- [ ] **Step 1: Write the failing test**

`apps/worker/test/sync-store.test.ts`:

```ts
import { env } from 'cloudflare:workers';
import { emptyChanges, type ActivityRow, type CardRow, type SyncChanges, type UnitProgressRow } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';
import { applySync } from '../src/sync-store.js';

const unit = (over: Partial<UnitProgressRow> = {}): UnitProgressRow => ({
  unitId: 'l1-u01', status: 'in-progress', completedAt: null, updatedAt: 1000, ...over,
});
const card = (over: Partial<CardRow> = {}): CardRow => ({
  cardId: 'word-recognition:w:我',
  kind: 'word-recognition',
  fsrs: { due: 2000, stability: 1, difficulty: 5, scheduledDays: 1, learningSteps: 0, reps: 1, lapses: 0, state: 2, lastReview: 1000 },
  updatedAt: 1000,
  ...over,
});
const activity = (over: Partial<ActivityRow> = {}): ActivityRow => ({
  date: '2026-09-10', lessons: 1, reviews: 0, updatedAt: 1000, ...over,
});
const changes = (partial: Partial<SyncChanges>): SyncChanges => ({ ...emptyChanges(), ...partial });

describe('applySync', () => {
  it('returns nothing for an empty database', async () => {
    const res = await applySync(env.DB, { cursor: 0, changes: emptyChanges() });
    expect(res).toEqual({ cursor: 0, changes: emptyChanges() });
  });

  it('stores pushed rows, echoes them back, and advances the cursor', async () => {
    const res = await applySync(env.DB, {
      cursor: 0,
      changes: changes({ unitProgress: [unit()], cards: [card()], activity: [activity()] }),
    });
    expect(res.cursor).toBe(1);
    expect(res.changes).toEqual({ unitProgress: [unit()], cards: [card()], activity: [activity()] });

    const again = await applySync(env.DB, { cursor: res.cursor, changes: emptyChanges() });
    expect(again).toEqual({ cursor: 1, changes: emptyChanges() });
  });

  it('applies last write wins by updatedAt', async () => {
    await applySync(env.DB, { cursor: 0, changes: changes({ unitProgress: [unit({ updatedAt: 100 })] }) });
    // Older write loses.
    await applySync(env.DB, { cursor: 0, changes: changes({ unitProgress: [unit({ status: 'completed', completedAt: 50, updatedAt: 50 })] }) });
    let pull = await applySync(env.DB, { cursor: 0, changes: emptyChanges() });
    expect(pull.changes.unitProgress).toEqual([unit({ updatedAt: 100 })]);
    // Newer write wins.
    await applySync(env.DB, { cursor: 0, changes: changes({ unitProgress: [unit({ status: 'completed', completedAt: 200, updatedAt: 200 })] }) });
    pull = await applySync(env.DB, { cursor: 0, changes: emptyChanges() });
    expect(pull.changes.unitProgress).toEqual([unit({ status: 'completed', completedAt: 200, updatedAt: 200 })]);
  });

  it('does not advance the sequence for an unchanged (losing) write of an existing row', async () => {
    await applySync(env.DB, { cursor: 0, changes: changes({ activity: [activity({ updatedAt: 100 })] }) });
    const res = await applySync(env.DB, { cursor: 1, changes: changes({ activity: [activity({ lessons: 9, updatedAt: 50 })] }) });
    // The batch still consumed a sequence number, but the losing row kept seq 1, so nothing is newer than cursor 1.
    expect(res.changes).toEqual(emptyChanges());
    expect(res.cursor).toBe(1);
  });

  it('resets a cursor that is ahead of the server', async () => {
    await applySync(env.DB, { cursor: 0, changes: changes({ cards: [card()] }) });
    const res = await applySync(env.DB, { cursor: 999, changes: emptyChanges() });
    expect(res.changes.cards).toEqual([card()]);
    expect(res.cursor).toBe(1);
  });

  it('lets a second device catch up on what the first pushed', async () => {
    const a1 = await applySync(env.DB, { cursor: 0, changes: changes({ unitProgress: [unit()] }) });
    expect(a1.cursor).toBe(1);
    const b1 = await applySync(env.DB, { cursor: 0, changes: changes({ unitProgress: [unit({ unitId: 'l1-u02', updatedAt: 1500 })] }) });
    expect(b1.cursor).toBe(2);
    expect(b1.changes.unitProgress.map((u) => u.unitId)).toEqual(['l1-u01', 'l1-u02']);
    const a2 = await applySync(env.DB, { cursor: a1.cursor, changes: emptyChanges() });
    expect(a2.cursor).toBe(2);
    expect(a2.changes.unitProgress.map((u) => u.unitId)).toEqual(['l1-u02']);
  });

  it('round-trips fsrs state exactly', async () => {
    const c = card({ fsrs: { due: 1.5, stability: 0.123456789, difficulty: 7.25, scheduledDays: 0, learningSteps: 2, reps: 3, lapses: 1, state: 1, lastReview: null } });
    const res = await applySync(env.DB, { cursor: 0, changes: changes({ cards: [c] }) });
    expect(res.changes.cards).toEqual([c]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @hi-chinese/worker test -- sync-store`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

`apps/worker/src/sync-store.ts`:

```ts
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
INSERT INTO unit_progress (unit_id, status, completed_at, updated_at, seq)
VALUES (?1, ?2, ?3, ?4, ${SEQ_SUBQUERY})
ON CONFLICT(unit_id) DO UPDATE SET
  status = excluded.status,
  completed_at = excluded.completed_at,
  updated_at = excluded.updated_at,
  seq = excluded.seq
WHERE excluded.updated_at > unit_progress.updated_at`;

const UPSERT_CARD = `
INSERT INTO cards (card_id, kind, fsrs, updated_at, seq)
VALUES (?1, ?2, ?3, ?4, ${SEQ_SUBQUERY})
ON CONFLICT(card_id) DO UPDATE SET
  kind = excluded.kind,
  fsrs = excluded.fsrs,
  updated_at = excluded.updated_at,
  seq = excluded.seq
WHERE excluded.updated_at > cards.updated_at`;

const UPSERT_ACTIVITY = `
INSERT INTO activity (date, lessons, reviews, updated_at, seq)
VALUES (?1, ?2, ?3, ?4, ${SEQ_SUBQUERY})
ON CONFLICT(date) DO UPDATE SET
  lessons = excluded.lessons,
  reviews = excluded.reviews,
  updated_at = excluded.updated_at,
  seq = excluded.seq
WHERE excluded.updated_at > activity.updated_at`;

interface UnitDbRow { unit_id: string; status: string; completed_at: number | null; updated_at: number; seq: number }
interface CardDbRow { card_id: string; kind: string; fsrs: string; updated_at: number; seq: number }
interface ActivityDbRow { date: string; lessons: number; reviews: number; updated_at: number; seq: number }

async function readSeq(db: D1Database): Promise<number> {
  const row = await db.prepare('SELECT seq FROM sync_meta WHERE id = 1').first<{ seq: number }>();
  return row?.seq ?? 0;
}

export async function applySync(db: D1Database, req: SyncRequest): Promise<SyncResponse> {
  const current = await readSeq(db);
  const cursor = req.cursor > current ? 0 : req.cursor;
  const { unitProgress, cards, activity } = req.changes;

  if (unitProgress.length + cards.length + activity.length > 0) {
    const statements: D1PreparedStatement[] = [db.prepare('UPDATE sync_meta SET seq = seq + 1 WHERE id = 1')];
    for (const r of unitProgress) {
      statements.push(db.prepare(UPSERT_UNIT).bind(r.unitId, r.status, r.completedAt, r.updatedAt));
    }
    for (const r of cards) {
      statements.push(db.prepare(UPSERT_CARD).bind(r.cardId, r.kind, JSON.stringify(r.fsrs), r.updatedAt));
    }
    for (const r of activity) {
      statements.push(db.prepare(UPSERT_ACTIVITY).bind(r.date, r.lessons, r.reviews, r.updatedAt));
    }
    await db.batch(statements);
  }

  const [units, cardRows, activityRows] = await Promise.all([
    db.prepare('SELECT unit_id, status, completed_at, updated_at, seq FROM unit_progress WHERE seq > ?1 ORDER BY seq, unit_id').bind(cursor).all<UnitDbRow>(),
    db.prepare('SELECT card_id, kind, fsrs, updated_at, seq FROM cards WHERE seq > ?1 ORDER BY seq, card_id').bind(cursor).all<CardDbRow>(),
    db.prepare('SELECT date, lessons, reviews, updated_at, seq FROM activity WHERE seq > ?1 ORDER BY seq, date').bind(cursor).all<ActivityDbRow>(),
  ]);

  let maxSeq = cursor;
  for (const r of [...units.results, ...cardRows.results, ...activityRows.results]) {
    if (r.seq > maxSeq) maxSeq = r.seq;
  }

  return {
    cursor: maxSeq,
    changes: {
      unitProgress: units.results.map(
        (r): UnitProgressRow => ({ unitId: r.unit_id, status: r.status as UnitStatus, completedAt: r.completed_at, updatedAt: r.updated_at }),
      ),
      cards: cardRows.results.map(
        (r): CardRow => ({ cardId: r.card_id, kind: r.kind as CardKind, fsrs: JSON.parse(r.fsrs) as FsrsState, updatedAt: r.updated_at }),
      ),
      activity: activityRows.results.map(
        (r): ActivityRow => ({ date: r.date, lessons: r.lessons, reviews: r.reviews, updatedAt: r.updated_at }),
      ),
    },
  };
}
```

If D1 rejects `Promise.all` over three concurrent `.all()` calls (it should not; they are independent reads), run them sequentially with `await` and note it in the report.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm -F @hi-chinese/worker test && pnpm -F @hi-chinese/worker typecheck`
Expected: all pass. Each test gets a fresh, migrated D1 because the Cloudflare plugin isolates storage per test by default; if rows leak between tests, set `isolatedStorage: true` explicitly in `cloudflareTest({...})` and report it.

- [ ] **Step 5: Commit**

```bash
git add apps/worker/src/sync-store.ts apps/worker/test/sync-store.test.ts
git commit -m "feat(worker): D1 sync store with last-write-wins and sequence cursor"
```

---

### Task 6: `POST /api/sync` route

**Files:**
- Modify: `apps/worker/src/index.ts`
- Test: `apps/worker/test/sync-route.test.ts`

**Interfaces:**
- Consumes: `requirePassphrase` (Task 3, already registered on `/api/sync`), `parseSyncRequest` (Task 4), `applySync` (Task 5).
- Produces: the finished `POST /api/sync` endpoint: 401 without the passphrase; 400 `{ error }` for non-JSON or invalid bodies; 200 with a `SyncResponse` body.

- [ ] **Step 1: Write the failing test**

`apps/worker/test/sync-route.test.ts`:

```ts
import { exports } from 'cloudflare:workers';
import { emptyChanges, type SyncResponse } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';

const post = (body: string, token = 'test-passphrase') =>
  exports.default.fetch('https://hi.test/api/sync', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body,
  });

describe('POST /api/sync', () => {
  it('rejects non-JSON bodies with 400', async () => {
    const res = await post('not json');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid JSON' });
  });

  it('rejects invalid shapes with 400 and a path', async () => {
    const res = await post(JSON.stringify({ cursor: -1, changes: emptyChanges() }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(/^cursor: /);
  });

  it('round-trips progress for a fresh device', async () => {
    const first = await post(
      JSON.stringify({
        cursor: 0,
        changes: {
          ...emptyChanges(),
          unitProgress: [{ unitId: 'l1-u01', status: 'completed', completedAt: 1000, updatedAt: 1000 }],
        },
      }),
    );
    expect(first.status).toBe(200);
    const body = (await first.json()) as SyncResponse;
    expect(body.cursor).toBe(1);
    expect(body.changes.unitProgress).toEqual([{ unitId: 'l1-u01', status: 'completed', completedAt: 1000, updatedAt: 1000 }]);

    const fresh = await post(JSON.stringify({ cursor: 0, changes: emptyChanges() }));
    expect(((await fresh.json()) as SyncResponse).changes.unitProgress).toHaveLength(1);
  });

  it('still requires the passphrase', async () => {
    const res = await post(JSON.stringify({ cursor: 0, changes: emptyChanges() }), 'wrong');
    expect(res.status).toBe(401);
  });

  it('rejects GET on the sync route', async () => {
    const res = await exports.default.fetch('https://hi.test/api/sync', { headers: { authorization: 'Bearer test-passphrase' } });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @hi-chinese/worker test -- sync-route`
Expected: FAIL; the JSON and round-trip tests get 404.

- [ ] **Step 3: Implement**

In `apps/worker/src/index.ts`, add imports and the route (final file):

```ts
import { Hono } from 'hono';
import type { AppEnv } from './app-env.js';
import { requirePassphrase } from './auth.js';
import { parseSyncRequest } from './sync-request.js';
import { applySync } from './sync-store.js';

const app = new Hono<AppEnv>();

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
  const result = await applySync(c.env.DB, parsed.value);
  return c.json(result);
});

app.notFound((c) => c.json({ error: 'not found' }, 404));

app.onError((err, c) => {
  console.error('unhandled error', err);
  return c.json({ error: 'internal error' }, 500);
});

export default app;
```

Also update the Task 3 auth test's third case title to "lets the right token through to the route" and change its assertion to `expect(res.status).toBe(400)` (body `{}` is now rejected by validation, proving the middleware passed).

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm -F @hi-chinese/worker test && pnpm -F @hi-chinese/worker typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/worker/src/index.ts apps/worker/test/sync-route.test.ts apps/worker/test/auth.test.ts
git commit -m "feat(worker): add POST /api/sync route"
```

---

### Task 7: Local dev smoke test, root scripts, and docs

**Files:**
- Modify: `package.json` (root scripts)
- Modify: `README.md` (Worker section)
- Modify: `docs/superpowers/plans/README.md` (Phase 2 row)

- [ ] **Step 1: Root scripts**

Add to the root `package.json` `scripts`:

```json
"worker:dev": "pnpm -F @hi-chinese/worker dev",
"worker:test": "pnpm -F @hi-chinese/worker test",
"worker:migrate:local": "pnpm -F @hi-chinese/worker db:migrate:local"
```

- [ ] **Step 2: Local smoke test with Wrangler**

```bash
export PATH="$HOME/.npm-global/node_modules/.bin:$PATH"
cd apps/worker
cp .dev.vars.example .dev.vars
pnpm db:migrate:local
(pnpm dev --port 8787 > /tmp/wrangler-dev.log 2>&1 &) ; sleep 8
curl -s http://127.0.0.1:8787/api/health
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1:8787/api/sync -d '{}'
curl -s -X POST http://127.0.0.1:8787/api/sync -H 'authorization: Bearer change-me' -H 'content-type: application/json' \
  -d '{"cursor":0,"changes":{"unitProgress":[{"unitId":"l1-u01","status":"in-progress","completedAt":null,"updatedAt":1}],"cards":[],"activity":[]}}'
pkill -f "wrangler dev" ; cd ../..
```

Expected: `{"ok":true}`, `401`, then a JSON response with `"cursor":1` and the echoed unit row. Paste the outputs into the report. If `wrangler dev` cannot start in this environment (for example a sandbox blocks binding the port), record the exact error and continue; the Vitest suite already exercises the same code paths against real D1.

- [ ] **Step 3: README section**

Append to `README.md` after the "Checks" section:

```markdown
## Worker (API + D1)

    pnpm worker:test             # Vitest inside workerd against a migrated local D1
    pnpm worker:migrate:local    # apply migrations to the local dev database
    cp apps/worker/.dev.vars.example apps/worker/.dev.vars   # set SYNC_PASSPHRASE
    pnpm worker:dev              # http://127.0.0.1:8787

Endpoints: `GET /api/health`, `POST /api/sync` (header `Authorization: Bearer <SYNC_PASSPHRASE>`,
body `{ cursor, changes: { unitProgress, cards, activity } }`, response same shape). Rows merge by
last write wins on `updatedAt`; `cursor` is the server sequence number to send next time.

### First deploy (run by hand, once)

    cd apps/worker
    pnpm exec wrangler login
    pnpm exec wrangler d1 create hi-chinese      # paste the printed database_id into wrangler.jsonc
    pnpm db:migrate:remote
    pnpm exec wrangler secret put SYNC_PASSPHRASE
    pnpm run deploy

The web app (Phase 3) is served by the same Worker as static assets; until then the Worker is API only.
```

- [ ] **Step 4: Roadmap row**

In `docs/superpowers/plans/README.md`, change the Phase 2 row to:

```
| 2 | `2026-09-10-phase-2-worker-sync.md` | `apps/worker`: Hono on Cloudflare Workers, D1 schema + migrations, passphrase auth, `POST /api/sync` with last-write-wins and a server sequence cursor, Vitest in workerd against local D1 |
```

and add under the findings list:

```
- Phase 2 defers static-asset serving to Phase 3: Wrangler requires the assets directory to exist and
  `apps/web/dist` does not yet. Sync cursors are server sequence numbers (one per sync batch), not
  timestamps, so device clock skew cannot lose rows.
```

- [ ] **Step 5: Full verification and commit**

```bash
pnpm test && pnpm typecheck && pnpm format:check
git add package.json README.md docs/superpowers/plans/README.md
git commit -m "docs: document worker dev, deploy, and sync API"
```

---

## Self-review notes

- Spec §7 coverage: D1 schema mirroring the three tables plus a sync-log equivalent (`sync_meta` counter; per-row `seq`), migrations under `apps/worker/migrations` applied with Wrangler (Task 2); `POST /api/sync` push + pull with last-write-wins per row by `updatedAt` (Tasks 5, 6); `GET /api/health` (Task 2); passphrase bearer auth, constant-time compare, 401 otherwise, secret via Wrangler (Tasks 3, 7). Spec §9 "Worker (Vitest with Miniflare): sync endpoint against a real local D1, including auth rejection and conflict resolution" is covered by Tasks 3, 5, 6. Client-side parts of §7 (Dexie tables, outbox, indicator, fresh-device pull) are Phase 3.
- Type names consistent across tasks: `SyncRequest`, `SyncResponse`, `SyncChanges`, `UnitProgressRow`, `CardRow`, `ActivityRow`, `FsrsState`, `CardKind`, `UnitStatus`, `emptyChanges`, `cardId`, `parseCardId` (Task 1); `AppEnv` (Task 2); `constantTimeEqual`, `extractBearer`, `requirePassphrase` (Task 3); `MAX_ROWS_PER_TABLE`, `ParseResult`, `parseSyncRequest` (Task 4); `applySync` (Task 5).
- Known plan-level choices: FSRS state is stored as a JSON text column rather than columns (the Worker never interprets it); `MAX_ROWS_PER_TABLE = 500` caps a request (Phase 3 chunks its outbox); echoing pushed rows back is accepted for simplicity.
