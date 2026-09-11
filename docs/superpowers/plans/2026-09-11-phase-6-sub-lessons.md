# Sub-Lesson System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Break each unit's words into 3-4 small sub-lessons of 3-4 words each, with review of earlier sub-lessons built into later ones.

**Architecture:** Runtime chunking — a pure function splits each unit's `wordIds` into groups of 4 at load time. No content pipeline or JSON file changes. Progress is tracked by adding `lessonsCompleted` to the existing `UnitProgressRow`. The UnitScreen becomes a lesson picker; learn/practice screens are scoped to one sub-lesson.

**Tech Stack:** TypeScript 5.9 strict, React 19, TanStack Router, Dexie, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-09-11-sub-lessons-design.md`

## Global Constraints

- TypeScript strict mode with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`
- Relative imports use `.js` extension
- No Co-Authored-By trailer on commits
- Tests use Vitest ~4.1 with `@cloudflare/vitest-plugin` for worker tests
- pnpm workspace — shared types live in `packages/content`, web app in `apps/web`, worker in `apps/worker`
- Tailwind CSS for styling
- `CHROME_PATH` env var for Playwright
- Dev-only test attributes: `data-correct`, `data-answer-index`, `data-pair-*`, `data-auto-complete`, `data-show-answer`, `data-kind`, `data-testid`

---

### Task 1: `computeLessons` Pure Function and Tests

**Files:**
- Create: `apps/web/src/lessons/compute.ts`
- Create: `apps/web/test/lessons/compute.test.ts`

**Interfaces:**
- Consumes: `Unit`, `GrammarPoint`, `Sentence` from `@hi-chinese/content`
- Produces: `Lesson` type and `computeLessons(unit, grammar, sentences): Lesson[]` — used by Tasks 3, 4, 5, 6, 8

```typescript
// The Lesson type (apps/web/src/lessons/compute.ts)
export interface Lesson {
  index: number;
  wordIds: string[];
  grammarIds: string[];
  sentenceIds: string[];
  reviewWordIds: string[];
}

export function computeLessons(
  unit: Unit,
  grammar: readonly GrammarPoint[],
  sentences: readonly Sentence[],
): Lesson[]

export function lessonCount(wordCount: number): number
```

- [ ] **Step 1: Write the test file**

```typescript
// apps/web/test/lessons/compute.test.ts
import type { GrammarPoint, Sentence, Unit } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';
import { computeLessons, lessonCount } from '../../src/lessons/compute.js';

describe('lessonCount', () => {
  it('returns ceil(wordCount / 4)', () => {
    expect(lessonCount(12)).toBe(3);
    expect(lessonCount(6)).toBe(2);
    expect(lessonCount(4)).toBe(1);
    expect(lessonCount(14)).toBe(4);
    expect(lessonCount(17)).toBe(5);
    expect(lessonCount(1)).toBe(1);
  });
});

describe('computeLessons', () => {
  const unit12: Unit = {
    id: 'l1-u01', level: 1, order: 1, title: 'Unit 1',
    wordIds: ['w:1','w:2','w:3','w:4','w:5','w:6','w:7','w:8','w:9','w:10','w:11','w:12'],
    grammarIds: ['g:1','g:2'], sentenceIds: ['s:1','s:2','s:3','s:4'],
  };

  const sentences: Sentence[] = [
    { id: 's:1', zh: '一二', pinyin: '', en: '', wordIds: ['w:1','w:2'], unitId: 'l1-u01' },
    { id: 's:2', zh: '三四', pinyin: '', en: '', wordIds: ['w:3','w:4'], unitId: 'l1-u01' },
    { id: 's:3', zh: '五六', pinyin: '', en: '', wordIds: ['w:5','w:6'], unitId: 'l1-u01' },
    { id: 's:4', zh: '九十', pinyin: '', en: '', wordIds: ['w:9','w:10'], unitId: 'l1-u01' },
  ];

  const grammar: GrammarPoint[] = [
    { id: 'g:1', title: 'G1', pattern: '', explanation: '', level: 1,
      sentenceIds: ['s:1','s:2'], unitId: 'l1-u01' },
    { id: 'g:2', title: 'G2', pattern: '', explanation: '', level: 1,
      sentenceIds: ['s:3','s:4'], unitId: 'l1-u01' },
  ];

  it('splits 12 words into 3 lessons of 4', () => {
    const lessons = computeLessons(unit12, grammar, sentences);
    expect(lessons).toHaveLength(3);
    expect(lessons[0]!.wordIds).toEqual(['w:1','w:2','w:3','w:4']);
    expect(lessons[1]!.wordIds).toEqual(['w:5','w:6','w:7','w:8']);
    expect(lessons[2]!.wordIds).toEqual(['w:9','w:10','w:11','w:12']);
  });

  it('first lesson has no reviewWordIds', () => {
    const lessons = computeLessons(unit12, grammar, sentences);
    expect(lessons[0]!.reviewWordIds).toEqual([]);
  });

  it('second lesson reviews first lesson words', () => {
    const lessons = computeLessons(unit12, grammar, sentences);
    expect(lessons[1]!.reviewWordIds).toEqual(['w:1','w:2','w:3','w:4']);
  });

  it('third lesson reviews first and second lesson words', () => {
    const lessons = computeLessons(unit12, grammar, sentences);
    expect(lessons[2]!.reviewWordIds).toEqual(
      ['w:1','w:2','w:3','w:4','w:5','w:6','w:7','w:8'],
    );
  });

  it('assigns grammar to the lesson containing its latest sentence word', () => {
    const lessons = computeLessons(unit12, grammar, sentences);
    // g:1 sentences use words w:1-w:4 → lesson 0
    expect(lessons[0]!.grammarIds).toContain('g:1');
    // g:2 sentences use w:5,w:6 (lesson 1) and w:9,w:10 (lesson 2) → lesson 2
    expect(lessons[2]!.grammarIds).toContain('g:2');
  });

  it('assigns sentences to the lesson containing their latest word', () => {
    const lessons = computeLessons(unit12, grammar, sentences);
    expect(lessons[0]!.sentenceIds).toContain('s:1'); // words w:1,w:2 → lesson 0
    expect(lessons[0]!.sentenceIds).toContain('s:2'); // words w:3,w:4 → lesson 0
    expect(lessons[1]!.sentenceIds).toContain('s:3'); // words w:5,w:6 → lesson 1
    expect(lessons[2]!.sentenceIds).toContain('s:4'); // words w:9,w:10 → lesson 2
  });

  it('handles a 6-word unit (2 lessons)', () => {
    const unit6: Unit = {
      id: 'l1-u02', level: 1, order: 2, title: 'Unit 2',
      wordIds: ['w:1','w:2','w:3','w:4','w:5','w:6'],
      grammarIds: [], sentenceIds: [],
    };
    const lessons = computeLessons(unit6, [], []);
    expect(lessons).toHaveLength(2);
    expect(lessons[0]!.wordIds).toEqual(['w:1','w:2','w:3','w:4']);
    expect(lessons[1]!.wordIds).toEqual(['w:5','w:6']);
  });

  it('handles a 4-word unit (1 lesson)', () => {
    const unit4: Unit = {
      id: 'l1-u03', level: 1, order: 3, title: 'Unit 3',
      wordIds: ['w:1','w:2','w:3','w:4'],
      grammarIds: [], sentenceIds: [],
    };
    const lessons = computeLessons(unit4, [], []);
    expect(lessons).toHaveLength(1);
    expect(lessons[0]!.wordIds).toEqual(['w:1','w:2','w:3','w:4']);
    expect(lessons[0]!.reviewWordIds).toEqual([]);
  });

  it('handles units with no grammar or sentences', () => {
    const lessons = computeLessons(unit12, [], []);
    expect(lessons).toHaveLength(3);
    expect(lessons.every(l => l.grammarIds.length === 0)).toBe(true);
    expect(lessons.every(l => l.sentenceIds.length === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && npx vitest run test/lessons/compute.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `computeLessons`**

```typescript
// apps/web/src/lessons/compute.ts
import type { GrammarPoint, Sentence, Unit } from '@hi-chinese/content';

export interface Lesson {
  index: number;
  wordIds: string[];
  grammarIds: string[];
  sentenceIds: string[];
  reviewWordIds: string[];
}

const CHUNK_SIZE = 4;

export function lessonCount(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / CHUNK_SIZE));
}

export function computeLessons(
  unit: Unit,
  grammar: readonly GrammarPoint[],
  sentences: readonly Sentence[],
): Lesson[] {
  const total = lessonCount(unit.wordIds.length);
  const wordIndex = new Map<string, number>();
  unit.wordIds.forEach((wid, i) => wordIndex.set(wid, Math.floor(i / CHUNK_SIZE)));

  // Build word chunks
  const lessons: Lesson[] = [];
  for (let i = 0; i < total; i++) {
    const start = i * CHUNK_SIZE;
    const wordIds = unit.wordIds.slice(start, start + CHUNK_SIZE);
    const reviewWordIds = unit.wordIds.slice(0, start);
    lessons.push({ index: i, wordIds, grammarIds: [], sentenceIds: [], reviewWordIds });
  }

  // Place sentences into the lesson of their latest word
  const sentenceLesson = new Map<string, number>();
  for (const s of sentences) {
    let maxLesson = 0;
    for (const wid of s.wordIds) {
      const li = wordIndex.get(wid);
      if (li !== undefined && li > maxLesson) maxLesson = li;
    }
    sentenceLesson.set(s.id, maxLesson);
    lessons[maxLesson]!.sentenceIds.push(s.id);
  }

  // Place grammar into the lesson of their latest sentence
  for (const g of grammar) {
    let maxLesson = 0;
    for (const sid of g.sentenceIds) {
      const li = sentenceLesson.get(sid);
      if (li !== undefined && li > maxLesson) maxLesson = li;
    }
    lessons[maxLesson]!.grammarIds.push(g.id);
  }

  return lessons;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run test/lessons/compute.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lessons/compute.ts apps/web/test/lessons/compute.test.ts
git commit -m "feat(web): computeLessons pure function for runtime sub-lesson chunking"
```

---

### Task 2: `UnitProgressRow` and Sync — Add `lessonsCompleted`

**Files:**
- Modify: `packages/content/src/progress.ts:3-8` (add `lessonsCompleted` to `UnitProgressRow`)
- Modify: `apps/web/src/db/db.ts:31` (bump Dexie version to 2)
- Modify: `apps/web/src/db/progress.ts` (update `markUnitStarted` and `completeUnit`)
- Create: `apps/worker/migrations/0002_lessons_completed.sql`
- Modify: `apps/worker/src/sync-store.ts:14-22,80-81,102-130` (add column to upsert/select)
- Modify: `apps/worker/src/sync-request.ts:77-88` (parse `lessonsCompleted`)
- Modify: `apps/web/test/db/progress.test.ts` (update assertions)
- Modify: `apps/web/src/sync/client.ts` (ensure `lessonsCompleted` is in push/pull)

**Interfaces:**
- Consumes: existing `UnitProgressRow`, `sync-store`, `sync-request`
- Produces: updated `UnitProgressRow { ..., lessonsCompleted: number }`, D1 migration, updated sync upsert/select/parse — used by Tasks 3, 5, 6, 7

- [ ] **Step 1: Update `UnitProgressRow` type**

In `packages/content/src/progress.ts`, add `lessonsCompleted` to the interface:

```typescript
export interface UnitProgressRow {
  unitId: string;
  status: UnitStatus;
  completedAt: number | null;
  lessonsCompleted: number;
  updatedAt: number;
}
```

- [ ] **Step 2: Fix all TypeScript compilation errors**

Adding the field will cause TS errors everywhere `UnitProgressRow` is constructed. Fix each site:

In `apps/web/src/db/progress.ts` — `markUnitStarted`:
```typescript
await db.unitProgress.put({ unitId, status: 'in-progress', completedAt: null, lessonsCompleted: 0, updatedAt });
```

In `apps/web/src/db/progress.ts` — `completeUnit`:
```typescript
await db.unitProgress.put({
  unitId,
  status: 'completed',
  completedAt: now,
  lessonsCompleted: prev?.lessonsCompleted ?? 0,
  updatedAt: unitUpdatedAt,
});
```

In `apps/worker/src/sync-store.ts` — the `unitProgress` mapping in the response:
```typescript
unitProgress: units.results.map((r): UnitProgressRow => ({
  unitId: r.unit_id,
  status: r.status as UnitStatus,
  completedAt: r.completed_at,
  lessonsCompleted: r.lessons_completed ?? 0,
  updatedAt: r.updated_at,
})),
```

In `apps/worker/src/sync-request.ts` — `parseUnitProgress`:
```typescript
function parseUnitProgress(v: unknown, path: string): UnitProgressRow {
  const obj = readRecord(v, path);
  const status = obj['status'];
  if (status !== 'in-progress' && status !== 'completed')
    fail(`${path}.status`, 'expected in-progress or completed');
  return {
    unitId: readString(obj['unitId'], `${path}.unitId`, 200),
    status: status as UnitStatus,
    completedAt: readIntOrNull(obj['completedAt'], `${path}.completedAt`, 0),
    lessonsCompleted: typeof obj['lessonsCompleted'] === 'number'
      ? readInt(obj['lessonsCompleted'], `${path}.lessonsCompleted`, 0)
      : 0,
    updatedAt: readInt(obj['updatedAt'], `${path}.updatedAt`, 1),
  };
}
```

- [ ] **Step 3: Update D1 sync store**

In `apps/worker/src/sync-store.ts`, update `UPSERT_UNIT`:
```sql
INSERT INTO unit_progress (unit_id, status, completed_at, lessons_completed, updated_at, seq)
VALUES (?1, ?2, ?3, ?4, ?5, (SELECT seq FROM sync_meta WHERE id = 1))
ON CONFLICT(unit_id) DO UPDATE SET
  status = excluded.status,
  completed_at = excluded.completed_at,
  lessons_completed = excluded.lessons_completed,
  updated_at = excluded.updated_at,
  seq = excluded.seq
WHERE excluded.updated_at > unit_progress.updated_at
```

Update the bind call:
```typescript
for (const r of unitProgress) {
  statements.push(db.prepare(UPSERT_UNIT).bind(
    r.unitId, r.status, r.completedAt, r.lessonsCompleted, r.updatedAt,
  ));
}
```

Update the SELECT:
```sql
SELECT unit_id, status, completed_at, lessons_completed, updated_at, seq FROM unit_progress WHERE seq > ?1 ORDER BY seq, unit_id
```

Add `lessons_completed` to `UnitDbRow`:
```typescript
interface UnitDbRow {
  unit_id: string;
  status: string;
  completed_at: number | null;
  lessons_completed: number;
  updated_at: number;
  seq: number;
}
```

- [ ] **Step 4: Create D1 migration**

```sql
-- apps/worker/migrations/0002_lessons_completed.sql
ALTER TABLE unit_progress ADD COLUMN lessons_completed INTEGER NOT NULL DEFAULT 0;
```

- [ ] **Step 5: Update Dexie schema version**

In `apps/web/src/db/db.ts`, add version 2 after the existing version 1 block. Dexie auto-handles upgrades; the existing indexed columns don't change — just add a version so the new field is recognized:

```typescript
d.version(2).stores({
  unitProgress: 'unitId, status',
  cards: 'cardId, kind, fsrs.due',
  activity: 'date',
  outbox: 'key, table',
  meta: 'key',
}).upgrade(async (tx) => {
  // Backfill lessonsCompleted for existing rows (default is 0 from the type;
  // Dexie's schemaless storage means the field just appears on reads)
});
```

Note: Dexie is schemaless for non-indexed columns. The `lessonsCompleted` field will default to `undefined` on old rows. Update the sync client's push mapping to default `undefined` to `0`:

In `apps/web/src/sync/client.ts`, wherever `unitProgress` rows are pushed, ensure `lessonsCompleted: r.lessonsCompleted ?? 0`.

- [ ] **Step 6: Update existing tests**

In `apps/web/test/db/progress.test.ts`, update `markUnitStarted` assertion:
```typescript
expect(await db.unitProgress.get('l1-u01')).toEqual({
  unitId: 'l1-u01',
  status: 'in-progress',
  completedAt: null,
  lessonsCompleted: 0,
  updatedAt: 1000,
});
```

Update `completeUnit` assertion:
```typescript
expect(await db.unitProgress.get('l1-u01')).toEqual({
  unitId: 'l1-u01',
  status: 'completed',
  completedAt: 5000,
  lessonsCompleted: 0,
  updatedAt: 9001,
});
```

- [ ] **Step 7: Run all tests**

Run: `cd apps/web && npx vitest run` then `cd apps/worker && npx vitest run`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add packages/content/src/progress.ts apps/web/src/db/db.ts apps/web/src/db/progress.ts \
  apps/worker/migrations/0002_lessons_completed.sql apps/worker/src/sync-store.ts \
  apps/worker/src/sync-request.ts apps/web/test/db/progress.test.ts apps/web/src/sync/client.ts
git commit -m "feat: add lessonsCompleted to UnitProgressRow, D1 migration, sync support"
```

---

### Task 3: `completeLesson` Progress Function and Tests

**Files:**
- Modify: `apps/web/src/db/progress.ts` (add `completeLesson`)
- Modify: `apps/web/test/db/progress.test.ts` (add `completeLesson` tests)

**Interfaces:**
- Consumes: `UnitProgressRow` with `lessonsCompleted` (Task 2), `computeLessons` (Task 1), Dexie tables
- Produces: `completeLesson(db, input): Promise<void>` — used by Tasks 6, 8

```typescript
export interface CompleteLessonInput {
  unitId: string;
  /** Total lessons in this unit (from lessonCount) */
  totalLessons: number;
  /** Word IDs learned in this specific sub-lesson */
  wordIds: readonly string[];
  /** Characters from this sub-lesson's words */
  characters: readonly string[];
  now: number;
}
```

- [ ] **Step 1: Write tests for `completeLesson`**

```typescript
// Add to apps/web/test/db/progress.test.ts

describe('completeLesson', () => {
  const baseInput: CompleteLessonInput = {
    unitId: 'l1-u01',
    totalLessons: 3,
    wordIds: ['w:我', 'w:你'],
    characters: ['我', '你'],
    now: 5000,
  };

  it('creates an in-progress row with lessonsCompleted=1 for the first lesson', async () => {
    await completeLesson(db, baseInput);
    const row = await db.unitProgress.get('l1-u01');
    expect(row).toEqual({
      unitId: 'l1-u01',
      status: 'in-progress',
      completedAt: null,
      lessonsCompleted: 1,
      updatedAt: 5000,
    });
  });

  it('increments lessonsCompleted on subsequent lessons', async () => {
    await completeLesson(db, baseInput);
    await completeLesson(db, { ...baseInput, wordIds: ['w:他', 'w:是'], characters: ['他', '是'], now: 6000 });
    const row = await db.unitProgress.get('l1-u01');
    expect(row?.lessonsCompleted).toBe(2);
    expect(row?.status).toBe('in-progress');
  });

  it('marks unit completed when last lesson finishes', async () => {
    await completeLesson(db, baseInput);
    await completeLesson(db, { ...baseInput, now: 6000 });
    await completeLesson(db, { ...baseInput, now: 7000 });
    const row = await db.unitProgress.get('l1-u01');
    expect(row?.lessonsCompleted).toBe(3);
    expect(row?.status).toBe('completed');
    expect(row?.completedAt).toBe(7000);
  });

  it('creates review cards only for this sub-lesson words', async () => {
    await completeLesson(db, baseInput);
    const cards = await db.cards.toArray();
    const cardIds = cards.map(c => c.cardId).sort();
    expect(cardIds).toEqual([
      cardId('char-write', '你'),
      cardId('char-write', '我'),
      cardId('word-recall', 'w:你'),
      cardId('word-recall', 'w:我'),
      cardId('word-recognition', 'w:你'),
      cardId('word-recognition', 'w:我'),
    ].sort());
  });

  it('does not duplicate cards from prior lessons', async () => {
    await completeLesson(db, baseInput);
    // Second lesson shares character '我' (would happen if a word reuses a character)
    await completeLesson(db, { ...baseInput, wordIds: ['w:他'], characters: ['他', '我'], now: 6000 });
    const charWriteCards = (await db.cards.toArray()).filter(c => c.kind === 'char-write');
    expect(charWriteCards).toHaveLength(3); // 我, 你, 他 — not 4
  });

  it('increments the daily lesson counter per sub-lesson', async () => {
    await completeLesson(db, baseInput);
    await completeLesson(db, { ...baseInput, now: 6000 });
    const date = localDate(6000);
    const day = await db.activity.get(date);
    expect(day?.lessons).toBe(2);
  });

  it('queues outbox entries for unit, cards, and activity', async () => {
    await completeLesson(db, baseInput);
    const outbox = await db.outbox.toArray();
    const tables = new Set(outbox.map(o => o.table));
    expect(tables).toEqual(new Set(['unitProgress', 'cards', 'activity']));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && npx vitest run test/db/progress.test.ts`
Expected: FAIL — `completeLesson` not found

- [ ] **Step 3: Implement `completeLesson`**

Add to `apps/web/src/db/progress.ts`:

```typescript
export interface CompleteLessonInput {
  unitId: string;
  totalLessons: number;
  wordIds: readonly string[];
  characters: readonly string[];
  now: number;
}

export async function completeLesson(db: HiChineseDb, input: CompleteLessonInput): Promise<void> {
  const { unitId, totalLessons, now } = input;
  await db.transaction('rw', [db.unitProgress, db.cards, db.activity, db.outbox], async () => {
    const outbox: OutboxRow[] = [];

    const prev = await db.unitProgress.get(unitId);
    const newCount = (prev?.lessonsCompleted ?? 0) + 1;
    const done = newCount >= totalLessons;
    const unitUpdatedAt = nextUpdatedAt(prev?.updatedAt, now);
    await db.unitProgress.put({
      unitId,
      status: done ? 'completed' : 'in-progress',
      completedAt: done ? now : null,
      lessonsCompleted: newCount,
      updatedAt: unitUpdatedAt,
    });
    outbox.push(outboxEntry('unitProgress', unitId, unitUpdatedAt));

    // Create review cards for this sub-lesson's words and characters
    const wanted: { id: string; kind: CardKind }[] = [];
    for (const w of input.wordIds) {
      wanted.push({ id: cardId('word-recognition', w), kind: 'word-recognition' });
      wanted.push({ id: cardId('word-recall', w), kind: 'word-recall' });
    }
    for (const ch of input.characters)
      wanted.push({ id: cardId('char-write', ch), kind: 'char-write' });
    const existing = await db.cards.bulkGet(wanted.map((c) => c.id));
    const fresh: CardRow[] = [];
    wanted.forEach((c, i) => {
      if (existing[i] !== undefined) return;
      fresh.push({ cardId: c.id, kind: c.kind, fsrs: emptyFsrsState(now), updatedAt: now });
      outbox.push(outboxEntry('cards', c.id, now));
    });
    if (fresh.length > 0) await db.cards.bulkPut(fresh);

    const date = localDate(now);
    const day = await db.activity.get(date);
    const dayUpdatedAt = nextUpdatedAt(day?.updatedAt, now);
    await db.activity.put({
      date,
      lessons: (day?.lessons ?? 0) + 1,
      reviews: day?.reviews ?? 0,
      updatedAt: dayUpdatedAt,
    });
    outbox.push(outboxEntry('activity', date, dayUpdatedAt));

    await db.outbox.bulkPut(outbox);
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run test/db/progress.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/db/progress.ts apps/web/test/db/progress.test.ts
git commit -m "feat(web): completeLesson tracks per-sub-lesson progress and creates review cards"
```

---

### Task 4: Refactor Exercise Generation for Sub-Lesson Scope

**Files:**
- Modify: `apps/web/src/exercises/generate.ts` (change `SessionInput`, adjust `generateSession`)
- Modify: `apps/web/test/exercises/generate.test.ts` (update for new interface)

**Interfaces:**
- Consumes: `Lesson` from Task 1, existing `Exercise` types
- Produces: updated `SessionInput` with `newWordIds`/`reviewWordIds` fields, updated `generateSession` — used by Task 6

The key change: `SessionInput.chunk` is replaced. Instead, the generator receives `newWords` and `reviewWords` separately. This lets it prioritize new-word exercises and add review exercises.

- [ ] **Step 1: Update `SessionInput` type**

The new interface:

```typescript
export interface SessionInput {
  /** This sub-lesson's words — every new word gets at least one exercise */
  newWords: readonly Word[];
  /** Words from prior sub-lessons — used for review exercises */
  reviewWords: readonly Word[];
  /** Grammar scoped to this sub-lesson */
  grammar: readonly GrammarPoint[];
  /** Sentences scoped to this sub-lesson */
  sentences: readonly Sentence[];
  /** Full word map for distractor lookups */
  words: ReadonlyMap<string, Word>;
  /** All word IDs at this HSK level — broader distractor pool */
  levelWordIds: readonly string[];
  /** False when no Chinese voice exists */
  audio: boolean;
}
```

Note: `SESSION_SIZE` changes from 15 to a computed value:
```typescript
export function sessionSize(newWordCount: number, reviewWordCount: number): number {
  return Math.min(15, 6 + newWordCount + Math.min(reviewWordCount, 3));
}
```

For a sub-lesson of 4 new words + 4 review words: `6 + 4 + 3 = 13`.
For a first sub-lesson of 4 new words + 0 review: `6 + 4 + 0 = 10`.

- [ ] **Step 2: Update `generateSession` implementation**

Key changes inside `generateSession`:
- `unitWords` → `input.newWords` (primary exercises)
- `candidates()` helper needs updating — it now uses `newWords` + `reviewWords` for the closest distractors, then `levelWordIds` for broader ones
- Grammar fill-blank: from `input.grammar` (already scoped)
- Sentence builder: from `input.sentences` (already scoped)
- Match pairs: draws from `[...input.newWords, ...input.reviewWords]`
- Write-it: characters from `input.newWords` only
- Listen-pick: from `input.newWords`
- MC: prioritize `input.newWords` (every word gets at least 1), then add review MCs
- At the end, add 2-3 review MC exercises from `input.reviewWords` (if any)

Full implementation in `generate.ts` — the internal structure stays the same, just sourcing words differently.

- [ ] **Step 3: Update tests**

Update `apps/web/test/exercises/generate.test.ts` to construct `SessionInput` with the new shape. The fixture `fixtureUnit1` has 6 words, so use the first 4 as `newWords` and the remaining 2 as `reviewWords`:

```typescript
const newWords = fixtureUnit1.unit.wordIds.slice(0, 4).flatMap(id => {
  const w = wordMap.get(id);
  return w ? [w] : [];
});
const reviewWords = fixtureUnit1.unit.wordIds.slice(4).flatMap(id => {
  const w = wordMap.get(id);
  return w ? [w] : [];
});

const input: SessionInput = {
  newWords,
  reviewWords,
  grammar: fixtureUnit1.grammar,
  sentences: fixtureUnit1.sentences,
  words: wordMap,
  levelWordIds: fixtureWords.map(w => w.id),
  audio: true,
};
```

Test assertions:
- Session includes exercises for all new words
- Session includes some review exercises when `reviewWords` is non-empty
- Session size is within expected range
- Fill-blank, sentence-builder, write-it still present
- With empty `reviewWords` (first lesson), no review exercises appear

- [ ] **Step 4: Run all exercise tests**

Run: `cd apps/web && npx vitest run test/exercises/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/exercises/generate.ts apps/web/test/exercises/generate.test.ts
git commit -m "feat(web): exercise generation accepts sub-lesson-scoped input with review words"
```

---

### Task 5: UnitScreen — Lesson Picker

**Files:**
- Modify: `apps/web/src/path/UnitScreen.tsx` (rewrite as lesson picker)
- Modify: `apps/web/src/router.tsx` (add lesson routes, remove old learn/practice routes)
- Create: `apps/web/test/path/UnitScreen.test.tsx`

**Interfaces:**
- Consumes: `computeLessons` (Task 1), `lessonCount` (Task 1), `UnitProgressRow` with `lessonsCompleted` (Task 2), `useUnitChunk` and `useContent` from content provider
- Produces: UnitScreen with lesson list, new routes `/unit/$unitId/lesson/$lessonIdx/learn` and `/unit/$unitId/lesson/$lessonIdx/practice` — used by Tasks 6, 7

- [ ] **Step 1: Update routes in `router.tsx`**

Replace the old `learnRoute` and `practiceRoute` with lesson-scoped routes:

```typescript
export const learnRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unit/$unitId/lesson/$lessonIdx/learn',
  component: LearnScreen,
});
export const practiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unit/$unitId/lesson/$lessonIdx/practice',
  component: PracticeScreen,
});
```

Remove the old `/unit/$unitId/learn` and `/unit/$unitId/practice` routes.

- [ ] **Step 2: Rewrite UnitScreen as lesson picker**

The screen loads the unit chunk, computes lessons, reads `lessonsCompleted` from DB, and renders a list:

```tsx
export function UnitScreen() {
  const { unitId } = useParams({ from: '/unit/$unitId' });
  const content = useContent();
  const chunk = useUnitChunk(unitId);
  const rows = useLiveQuery(() => db.unitProgress.toArray(), []);
  const unit = content.unitById.get(unitId);

  if (!unit) return <p role="alert">Unknown unit.</p>;
  if (rows === undefined || chunk.status === 'loading') return <Loading />;
  if (chunk.status === 'error')
    return <InlineError message={chunk.error.message} onRetry={chunk.retry} />;

  const state = computeUnitStates(content.unitOrder, rows).get(unitId) ?? 'locked';
  if (state === 'locked')
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">{unit.title}</h1>
        <p className="rounded-lg bg-stone-100 p-4 text-stone-700">
          This unit is locked. Complete the previous unit first.
        </p>
        <Link to="/" className="text-sm underline">Back to path</Link>
      </div>
    );

  const lessons = computeLessons(chunk.chunk.unit, chunk.chunk.grammar, chunk.chunk.sentences);
  const progress = rows.find(r => r.unitId === unitId);
  const completed = progress?.status === 'completed'
    ? lessons.length
    : (progress?.lessonsCompleted ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{unit.title}</h1>
        <p className="text-stone-600">{unit.wordCount} words, {lessons.length} lessons</p>
      </div>
      <ol className="flex flex-col gap-2">
        {lessons.map((lesson, i) => {
          const done = i < completed;
          const current = i === completed && completed < lessons.length;
          const words = lesson.wordIds
            .map(id => content.words.get(id)?.simplified)
            .filter(Boolean)
            .join(', ');
          return (
            <li key={i} data-testid={`lesson-${i}`} data-done={done}>
              <Link
                to="/unit/$unitId/lesson/$lessonIdx/learn"
                params={{ unitId, lessonIdx: String(i) }}
                className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                  done ? 'bg-green-50 border border-green-200' :
                  current ? 'bg-white border-2 border-red-400' :
                  'bg-white border border-stone-200'
                }`}
              >
                <div>
                  <div className="font-medium">Lesson {i + 1}</div>
                  <div className="text-xs text-stone-600">{words}</div>
                </div>
                <span className="text-xs font-medium">
                  {done ? 'Done' : current ? 'Start' : `${lesson.wordIds.length} words`}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <Link to="/" className="text-sm underline">Back to path</Link>
    </div>
  );
}
```

- [ ] **Step 3: Write UnitScreen tests**

```typescript
// apps/web/test/path/UnitScreen.test.tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RouterProvider } from '@tanstack/react-router';
// Test that lesson items appear and link correctly
// Test that completed lessons show "Done"
// Test locked state shows message
```

Test setup uses a minimal router pointing at `/unit/l1-u01`, with fixture content and mocked DB.

- [ ] **Step 4: Run tests**

Run: `cd apps/web && npx vitest run test/path/UnitScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/path/UnitScreen.tsx apps/web/src/router.tsx apps/web/test/path/UnitScreen.test.tsx
git commit -m "feat(web): UnitScreen shows sub-lesson picker, lesson-scoped routes"
```

---

### Task 6: LearnScreen and PracticeScreen — Scoped to Sub-Lesson

**Files:**
- Modify: `apps/web/src/learn/LearnScreen.tsx` (scope to sub-lesson)
- Modify: `apps/web/src/practice/PracticeScreen.tsx` (scope to sub-lesson, use `completeLesson`)
- Modify: `apps/web/test/exercises/generate.test.ts` (if needed)

**Interfaces:**
- Consumes: `computeLessons` (Task 1), `completeLesson` (Task 3), updated `generateSession` / `SessionInput` (Task 4), lesson routes with `$lessonIdx` param (Task 5)
- Produces: LearnScreen and PracticeScreen rendering only sub-lesson content — used by Task 8

- [ ] **Step 1: Update LearnScreen**

Change the route param from `/unit/$unitId/learn` to `/unit/$unitId/lesson/$lessonIdx/learn`. Use `computeLessons` to get this lesson's words, grammar, and review words.

```tsx
export function LearnScreen() {
  const { unitId, lessonIdx: lessonIdxStr } = useParams({
    from: '/unit/$unitId/lesson/$lessonIdx/learn',
  });
  const lessonIdx = Number(lessonIdxStr);
  const content = useContent();
  const chunk = useUnitChunk(unitId);

  useEffect(() => {
    void markUnitStarted(db, unitId, Date.now());
  }, [unitId]);

  if (chunk.status === 'loading') return <Loading label="Loading unit…" />;
  if (chunk.status === 'error')
    return <InlineError message={chunk.error.message} onRetry={chunk.retry} />;

  const { unit, grammar, sentences } = chunk.chunk;
  const lessons = computeLessons(unit, grammar, sentences);
  const lesson = lessons[lessonIdx];
  if (!lesson) return <p role="alert">Invalid lesson.</p>;

  const sentenceById = new Map(sentences.map((s) => [s.id, s] as const));
  const lessonGrammar = lesson.grammarIds.flatMap(gid => {
    const g = grammar.find(g => g.id === gid);
    return g ? [g] : [];
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">
        {unit.title}: Lesson {lessonIdx + 1}
      </h1>
      <NoVoiceBanner />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">New words</h2>
        <ul className="flex flex-col gap-2">
          {lesson.wordIds.map((id) => {
            const word = content.words.get(id);
            return word ? <WordCard key={id} word={word} /> : null;
          })}
        </ul>
      </section>

      {lesson.reviewWordIds.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Review</h2>
          <ul className="flex flex-col gap-1">
            {lesson.reviewWordIds.map((id) => {
              const word = content.words.get(id);
              if (!word) return null;
              return (
                <li key={id} className="flex items-center gap-3 text-sm text-stone-700">
                  <span className="text-lg">{word.simplified}</span>
                  <span className="text-stone-500">{word.pinyin}</span>
                  <span>{word.meanings[0]}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {lessonGrammar.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Grammar</h2>
          {lessonGrammar.map((g) => (
            <GrammarCard
              key={g.id}
              point={g}
              examples={g.sentenceIds.flatMap((sid) => {
                const s = sentenceById.get(sid);
                return s ? [s] : [];
              })}
            />
          ))}
        </section>
      )}

      <Link
        to="/unit/$unitId/lesson/$lessonIdx/practice"
        params={{ unitId, lessonIdx: lessonIdxStr }}
        className="rounded-lg bg-red-700 px-4 py-3 text-center font-medium text-white"
      >
        Start practice
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Update PracticeScreen**

Change the route param. Load the unit chunk, compute lessons, build sub-lesson-scoped `SessionInput`, and use `completeLesson` instead of `completeUnit`.

```tsx
export function PracticeScreen() {
  const { unitId, lessonIdx: lessonIdxStr } = useParams({
    from: '/unit/$unitId/lesson/$lessonIdx/practice',
  });
  const lessonIdx = Number(lessonIdxStr);
  const content = useContent();
  const chunk = useUnitChunk(unitId);
  const audio = useHasChineseVoice();

  if (chunk.status === 'loading') return <Loading label="Preparing exercises…" />;
  if (chunk.status === 'error')
    return <InlineError message={chunk.error.message} onRetry={chunk.retry} />;

  const lessons = computeLessons(chunk.chunk.unit, chunk.chunk.grammar, chunk.chunk.sentences);
  const lesson = lessons[lessonIdx];
  if (!lesson) return <p role="alert">Invalid lesson.</p>;

  return (
    <PracticeSession
      key={`${unitId}-${lessonIdx}`}
      chunk={chunk.chunk}
      lesson={lesson}
      totalLessons={lessons.length}
      content={content}
      audio={audio}
    />
  );
}
```

Update `PracticeSession` to accept `lesson` and `totalLessons` props. Build `SessionInput` from the lesson's words. On completion, call `completeLesson` instead of `completeUnit`:

```tsx
function PracticeSession({
  chunk, lesson, totalLessons, content, audio,
}: {
  chunk: UnitChunk; lesson: Lesson; totalLessons: number;
  content: ContentIndex; audio: boolean;
}) {
  const resolveWords = (ids: readonly string[]) =>
    ids.flatMap(id => { const w = content.words.get(id); return w ? [w] : []; });

  const [state, dispatch] = useReducer(sessionReducer, undefined, () =>
    createSession(
      generateSession(
        {
          newWords: resolveWords(lesson.wordIds),
          reviewWords: resolveWords(lesson.reviewWordIds),
          grammar: lesson.grammarIds.flatMap(gid => {
            const g = chunk.grammar.find(g => g.id === gid);
            return g ? [g] : [];
          }),
          sentences: lesson.sentenceIds.flatMap(sid => {
            const s = chunk.sentences.find(s => s.id === sid);
            return s ? [s] : [];
          }),
          words: content.words,
          levelWordIds: content.wordIdsByLevel.get(chunk.unit.level) ?? [],
          audio,
        },
        Date.now(),
      ),
    ),
  );

  // ... same feedback/progress UI ...

  // On done: completeLesson instead of completeUnit
  useEffect(() => {
    if (state.phase !== 'done' || recorded.current) return;
    recorded.current = true;
    const characters = uniqueHanChars(
      lesson.wordIds.map(id => content.words.get(id)?.simplified ?? '').join(''),
    );
    void completeLesson(db, {
      unitId: chunk.unit.id,
      totalLessons,
      wordIds: lesson.wordIds,
      characters,
      now: Date.now(),
    }).then(() => requestSync({ db }));
  }, [state.phase, chunk, lesson, totalLessons, content]);

  // Results show lesson word count, not full unit
  if (state.phase === 'done')
    return <Results state={state} wordCount={lesson.wordIds.length} />;
  // ...
}
```

Update the Results component heading from "Unit complete" to "Lesson complete" (or "Unit complete" if this was the last lesson — check if `totalLessons` was reached).

- [ ] **Step 3: Run all tests**

Run: `cd apps/web && npx vitest run`
Expected: PASS (some tests may need SessionInput shape updates)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/learn/LearnScreen.tsx apps/web/src/practice/PracticeScreen.tsx
git commit -m "feat(web): LearnScreen and PracticeScreen scoped to sub-lesson"
```

---

### Task 7: PathScreen — Sub-Lesson Progress Indicators

**Files:**
- Modify: `apps/web/src/path/PathScreen.tsx` (show lesson progress on in-progress units)
- Modify: `apps/web/src/path/unlock.ts` (no change needed — unit states unchanged)
- Modify: `apps/web/test/path/unlock.test.ts` (add `lessonsCompleted` to fixtures)

**Interfaces:**
- Consumes: `lessonCount` (Task 1), `UnitProgressRow` with `lessonsCompleted` (Task 2)
- Produces: PathScreen showing "Lesson N/M" on in-progress units

- [ ] **Step 1: Update PathScreen `UnitNode` to show sub-lesson progress**

Add lesson progress indicator to in-progress units:

```tsx
function UnitNode({ unit, state, lessonsCompleted }: {
  unit: ManifestUnit; state: UnitState; lessonsCompleted: number;
}) {
  const total = lessonCount(unit.wordCount);
  const inner = (
    <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${BADGE[state]}`}>
      <div>
        <div className="font-medium">{unit.title}</div>
        <div className="text-xs opacity-70">
          {unit.wordCount} words, {total} lessons
          {state === 'in-progress' && lessonsCompleted > 0
            ? ` — ${lessonsCompleted}/${total} done`
            : ''}
        </div>
      </div>
      <span className="text-xs font-medium uppercase tracking-wide">{LABEL[state]}</span>
    </div>
  );
  // ... same link/disabled logic
}
```

Pass `lessonsCompleted` from the progress rows:
```tsx
const progressByUnit = new Map(rows.map(r => [r.unitId, r]));
// In the JSX:
<UnitNode
  key={id}
  unit={unit}
  state={states.get(id) ?? 'locked'}
  lessonsCompleted={progressByUnit.get(id)?.lessonsCompleted ?? 0}
/>
```

- [ ] **Step 2: Update unlock test fixtures**

In `apps/web/test/path/unlock.test.ts`, add `lessonsCompleted: 0` to all test `UnitProgressRow` objects (since the type now requires it).

- [ ] **Step 3: Run tests**

Run: `cd apps/web && npx vitest run test/path/`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/path/PathScreen.tsx apps/web/test/path/unlock.test.ts
git commit -m "feat(web): PathScreen shows sub-lesson progress on in-progress units"
```

---

### Task 8: E2E Test — Complete a Unit via Sub-Lessons

**Files:**
- Modify: `apps/web/e2e/complete-unit.spec.ts` (rewrite flow for sub-lessons)

**Interfaces:**
- Consumes: lesson picker (Task 5), scoped learn/practice (Task 6), all route changes

The e2e test navigates: setup → path → unit → lesson 1 learn → lesson 1 practice → back to unit → lesson 2 → ... → verify unit completed.

- [ ] **Step 1: Rewrite the e2e test**

```typescript
test('a fresh device sets up, learns Unit 1 via sub-lessons, and syncs', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/setup$/);
  await page.getByLabel('Passphrase').fill('test-passphrase');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'HSK 1' })).toBeVisible();
  await expect(page.getByTestId('unit-l1-u01')).toHaveAttribute('data-state', 'available');

  // Enter unit → see lesson picker
  await page.getByRole('link', { name: /^Unit 1/ }).click();
  await expect(page.getByRole('heading', { name: 'Unit 1' })).toBeVisible();

  // Count lessons and complete each one
  const lessonCount = await page.locator('[data-testid^="lesson-"]').count();
  expect(lessonCount).toBeGreaterThanOrEqual(1);

  for (let li = 0; li < lessonCount; li++) {
    // Click the lesson
    await page.getByTestId(`lesson-${li}`).click();

    // Learn screen
    await expect(page.getByRole('heading', { name: /Lesson \d+/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'New words' })).toBeVisible();
    await page.getByRole('link', { name: 'Start practice' }).click();

    // Practice: answer all exercises
    for (let i = 0; i < 60; i++) {
      if (await page.getByTestId('results').isVisible()) break;
      await expect(page.getByTestId('exercise')).toBeVisible();
      await answerCurrent(page);
      await page.getByRole('button', { name: 'Continue' }).click();
    }
    await expect(page.getByTestId('results')).toBeVisible();

    // Go back to unit screen for the next lesson
    await page.getByRole('link', { name: 'Back to path' }).click();

    // If not the last lesson, we should be on the unit screen
    if (li < lessonCount - 1) {
      await expect(page.getByRole('heading', { name: 'Unit 1' })).toBeVisible();
      // Previous lesson should be marked done
      await expect(page.getByTestId(`lesson-${li}`)).toHaveAttribute('data-done', 'true');
    }
  }

  // After completing all lessons, verify the unit is complete on the path
  // (The last "Back to path" goes to the path screen since the unit is done)
  await expect(page.getByTestId('unit-l1-u01')).toHaveAttribute('data-state', 'completed');
  await expect(page.getByTestId('unit-l1-u02')).toHaveAttribute('data-state', 'available');
  await expect(page.getByTestId('sync-status')).toHaveText('Synced');
});
```

Note: The "Back to path" link in the Results component should navigate to the unit screen (so the user sees the remaining lessons), except after the last lesson when it navigates to `/`. Update the Results component accordingly:

```tsx
// In PracticeScreen Results — pass unitId and whether this was the last lesson
<Link
  to={allDone ? '/' : '/unit/$unitId'}
  params={allDone ? {} : { unitId }}
  className="mt-4 rounded-lg bg-red-700 px-5 py-3 font-medium text-white"
>
  {allDone ? 'Back to path' : 'Next lesson'}
</Link>
```

- [ ] **Step 2: Run the e2e test**

Run: `cd apps/web && npx playwright test e2e/complete-unit.spec.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/complete-unit.spec.ts apps/web/src/practice/PracticeScreen.tsx
git commit -m "test(e2e): complete unit via sub-lessons flow"
```

---

### Task 9: Update Fixture Data and Fix Remaining Test Breakage

**Files:**
- Modify: `apps/web/test/fixtures/content.ts` (update fixture to work with sub-lessons)
- Modify: any remaining test files that reference old `SessionInput` shape or old routes
- Modify: `apps/web/e2e/review-session.spec.ts` (update navigation if it clicks old learn/practice routes)

**Interfaces:**
- Consumes: all changes from Tasks 1-8
- Produces: green test suite

This is a sweep task. The implementer must:
1. Run `cd apps/web && npx vitest run` and fix all failures
2. Run `cd apps/worker && npx vitest run` and fix all failures
3. Run `cd apps/web && npx playwright test` and fix all failures

Common fixes expected:
- Test files constructing `SessionInput` with the old `chunk` field → update to `newWords`/`reviewWords`/`grammar`/`sentences`
- Test files using `lessonsCompleted`-less `UnitProgressRow` → add `lessonsCompleted: 0`
- Review e2e test navigating through old routes → update for sub-lesson routes
- Components test using old `useParams` from → update route strings

- [ ] **Step 1: Run full test suite, catalogue failures**

Run: `cd apps/web && npx vitest run 2>&1 | tail -50`
Run: `cd apps/worker && npx vitest run 2>&1 | tail -50`

- [ ] **Step 2: Fix each failure**

- [ ] **Step 3: Run full suite again to confirm green**

Run: `cd apps/web && npx vitest run && cd ../worker && npx vitest run`
Expected: all PASS

- [ ] **Step 4: Run e2e**

Run: `cd apps/web && npx playwright test`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix(web): update tests and fixtures for sub-lesson system"
```
