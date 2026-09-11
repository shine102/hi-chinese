# Phase 4: Review, Writing, and Streak Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add FSRS-scheduled spaced-repetition review sessions, Hanzi Writer character-writing exercises, a character detail page, and a streak display to the Hi Chinese PWA.

**Architecture:** Phase 3 already creates review cards on unit completion (`completeUnit` writes `word-recognition`, `word-recall`, and `char-write` cards with `emptyFsrsState(now)`, making them immediately due). Phase 4 queries those due cards, presents them as exercises using the existing exercise components plus a new write-it component backed by Hanzi Writer, grades them with `ts-fsrs`, and persists the updated FSRS state through the same outbox-sync pipeline. A streak counter and due-card count are computed from the activity table and card index and shown on the path (home) screen.

**Tech Stack:** React 19.3, ts-fsrs 5.4.2, hanzi-writer 3.7.3 (new), Dexie 4.4, TanStack Router 1.170, Vitest 4.1, Playwright 1.63

**Spec:** `docs/superpowers/specs/2026-09-09-hi-chinese-design.md` (sections 4, 5, 6, and streak in 5)

## Global Constraints

- TypeScript ~5.9 strict: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`; every relative import ends with `.js`
- `pnpm` workspace; packages reference each other via `workspace:*`
- Every DB write goes through `nextUpdatedAt` for LWW correctness and is accompanied by an `outboxEntry` in the same transaction
- `Rating` from ts-fsrs is an enum (a value import, not `import type`)
- Vitest environment is `node` by default; files needing DOM must have `// @vitest-environment jsdom` as the first line
- `globals: true` is already set for RTL cleanup in jsdom tests
- `import.meta.env.DEV`-gated dev attributes are the pattern for e2e test hooks
- Tests live in `apps/web/test/`; test include pattern is `test/**/*.test.ts` and `test/**/*.test.tsx`
- Content types come from `@hi-chinese/content`; progress types (`CardRow`, `FsrsState`, `CardKind`, `cardId`, `parseCardId`, `Rating`) from `@hi-chinese/content` and `ts-fsrs`
- The existing `fsrs.due` index on the Dexie `cards` table supports `db.cards.where('fsrs.due').belowOrEqual(now)`
- Commits must not include `Co-Authored-By` trailer for Claude

---

## Verified Facts

1. `completeUnit` (progress.ts:28) creates cards with `emptyFsrsState(now)` — `due` = `now`, so every new card is immediately due for review.
2. `db.cards` index schema is `'cardId, kind, fsrs.due'` (db.ts:33) — `fsrs.due` is a top-level Dexie index on the nested property.
3. `parseCardId(id)` (progress.ts, packages/content) returns `{ kind: CardKind; itemId: string } | null` where `itemId` is the word id (`w:我`) or character string (`我`).
4. `ActivityRow.reviews` exists but is never incremented in Phase 3; Phase 4 must increment it on review session completion.
5. hanzi-writer 3.7.3: built-in TS types, ESM, renders SVG in a div. `HanziWriter.create(el, char, opts)`. Quiz: `writer.quiz({ showHintAfterMisses: 3, onComplete, onMistake })`. Custom `charDataLoader(char, onLoad, onError)`. Our `CharacterData.strokes` + `CharacterData.medians` match the expected shape directly.
6. ts-fsrs 5.4.2: `fsrs().repeat(card, now)` returns `Record<Rating, { card: Card; log: ReviewLog }>`. `Rating`: Again=1, Hard=2, Good=3, Easy=4.
7. `fromFsrsState` / `toFsrsState` (fsrs/state.ts) convert between our `FsrsState` (epoch ms) and ts-fsrs `Card` (Date objects).
8. `ExerciseView` (ExerciseView.tsx) switches on `exercise.kind` exhaustively — adding a kind requires a new case.
9. `sessionReducer` (session.ts) is exercise-kind-agnostic; it delegates to `checkAnswer`. A new exercise kind only needs `checkAnswer` support.
10. `loadCharacter(ch)` (loader.ts:46) fetches `/content/characters/${characterFileName(ch)}.json` — returns `CharacterData` with `strokes`, `medians`, `pinyin`, `definition`, `radical`, `decomposition`, `wordIds`.
11. `characterFileName(ch)` from `@hi-chinese/content` returns the hex codepoint zero-padded to 4 digits (e.g., `"4e00"` for `"一"`).
12. `ContentIndex.words` is a `ReadonlyMap<string, Word>` where Word.characters is `string[]` (the Han characters in the word).
13. `ContentManifest.characters` is `string[]` listing all 899 course characters.
14. vitest config aliases `virtual:pwa-register/react` to a test stub — same pattern can be used for `hanzi-writer`.

## Rulings

- **Review reducer vs practice reducer**: the review session uses its own `reviewReducer`, NOT the practice `sessionReducer`. Review has fundamentally different flow: no re-queue, FSRS grading per card, self-grade UI for write cards. Exercise COMPONENTS are reused; the session state machine is not.
- **Write-it in practice always passes**: `checkAnswer` returns true for any write answer (`answer.kind === 'write'`). Practice write-it exercises are never re-queued. The spec shows hints after 3 failed strokes, so the user always completes. Re-queuing write exercises in practice would be frustrating.
- **Character page route uses hex**: `/character/$charCode` where `$charCode` is the hex codepoint (e.g., `4e00`), not the raw character. This avoids URL encoding issues and matches the content file naming.
- **"Show me" button only in review**: practice write-it exercises have no "Show me" — the quiz mode with outline and hints is sufficient. Review write exercises (no outline) get a "Show me" that cancels the quiz, plays the animation, and auto-grades Again.
- **Review session persists grades at session end**: all card FSRS state updates and the activity.reviews increment happen in one transaction at session completion, not per-card. This matches the practice pattern (completeUnit is one transaction at the end).
- **HanziWriter mock for tests**: vitest config adds an alias `hanzi-writer` → `test/stubs/hanzi-writer.ts` providing a mock class. Component tests in jsdom use this mock.

---

## File Structure

### New files (by task)

| File | Task | Responsibility |
|------|------|---------------|
| `src/fsrs/scheduler.ts` | 1 | `gradeCard`, `getDueCards`, `getDueCount`, `MAX_REVIEW_CARDS` |
| `src/streak/streak.ts` | 2 | `computeStreak` from activity rows |
| `src/hanzi/HanziWriterComponent.tsx` | 3 | React wrapper for hanzi-writer library |
| `src/hanzi/StrokesSheet.tsx` | 4 | Bottom-sheet overlay with stroke animation, radical, meaning per character |
| `src/exercises/components/WriteIt.tsx` | 5 | Write-it exercise component wrapping HanziWriter quiz mode |
| `src/review/review-exercises.ts` | 6 | `cardToExercise`, `generateReviewSession` converting CardRow → Exercise |
| `src/review/review-session.ts` | 7 | `reviewReducer`, `ReviewState`, `ReviewAction`, grade helpers |
| `src/review/ReviewScreen.tsx` | 7 | Review session UI |
| `src/review/GradeSelector.tsx` | 7 | Grade selector for self-graded write cards |
| `src/character/CharacterPage.tsx` | 9 | Character detail page (strokes, radical, decomposition, words) |
| `src/streak/StreakBadge.tsx` | 8 | Streak flame + due count display component |
| `test/stubs/hanzi-writer.ts` | 3 | HanziWriter mock for vitest |
| `test/fsrs/scheduler.test.ts` | 1 | gradeCard, getDueCards, getDueCount tests |
| `test/streak/streak.test.ts` | 2 | computeStreak tests |
| `test/exercises/write-it.test.ts` | 5 | checkAnswer, correctAnswerText for write-it |
| `test/review/review-exercises.test.ts` | 6 | cardToExercise tests |
| `test/review/review-session.test.ts` | 7 | reviewReducer tests |
| `e2e/review-session.spec.ts` | 10 | E2E: complete unit → review due cards → verify |

### Modified files

| File | Task | Change |
|------|------|--------|
| `package.json` | 3 | Add `hanzi-writer` dependency |
| `vitest.config.ts` | 3 | Add `hanzi-writer` alias to test stubs |
| `src/exercises/types.ts` | 5 | Add `WriteItExercise` to `Exercise` union, `WriteAnswer` to `Answer`, update `checkAnswer` and `correctAnswerText` |
| `src/exercises/generate.ts` | 5 | Add write-it exercise generation (1–2 per session) |
| `src/exercises/components/ExerciseView.tsx` | 5 | Add `write-it` case |
| `src/learn/LearnScreen.tsx` | 4 | Add "Strokes" button to `WordCard` |
| `src/db/progress.ts` | 7 | Add `completeReviewSession` |
| `src/path/PathScreen.tsx` | 8 | Add streak, due count, review button |
| `src/router.tsx` | 7, 9 | Add `/review` and `/character/$charCode` routes |
| `test/fixtures/content.ts` | 5 | Add fixture `CharacterData` array and update manifest |

All paths below are relative to `apps/web/`.

---

### Task 1: FSRS Scheduling and Due-Card Queries

**Files:**
- Create: `src/fsrs/scheduler.ts`
- Test: `test/fsrs/scheduler.test.ts`

**Interfaces:**
- Consumes: `fromFsrsState`, `toFsrsState` from `src/fsrs/state.ts`; `fsrs`, `Rating` from `ts-fsrs`; `CardRow`, `FsrsState` from `@hi-chinese/content`; `HiChineseDb` from `src/db/db.ts`
- Produces: `gradeCard(state: FsrsState, rating: Rating, now: number): FsrsState`; `getDueCards(db: HiChineseDb, now: number): Promise<CardRow[]>`; `getDueCount(db: HiChineseDb, now: number): Promise<number>`; `MAX_REVIEW_CARDS = 50`

- [ ] **Step 1: Write the test file**

```ts
// test/fsrs/scheduler.test.ts
import { Rating } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { emptyFsrsState } from '../../src/fsrs/state.js';
import { gradeCard, MAX_REVIEW_CARDS } from '../../src/fsrs/scheduler.js';

describe('gradeCard', () => {
  const now = Date.now();
  const fresh = emptyFsrsState(now);

  it('advances a new card past New state after grading Good', () => {
    const next = gradeCard(fresh, Rating.Good, now);
    expect(next.state).not.toBe(0); // no longer New
    expect(next.reps).toBe(1);
    expect(next.due).toBeGreaterThan(now);
    expect(next.lastReview).toBe(now);
  });

  it('keeps a card in learning after Again', () => {
    const next = gradeCard(fresh, Rating.Again, now);
    expect(next.lapses).toBeGreaterThanOrEqual(0);
    expect(next.reps).toBe(1);
    expect(next.lastReview).toBe(now);
  });

  it('schedules further out for Easy than Good', () => {
    const afterGood = gradeCard(fresh, Rating.Good, now);
    const afterEasy = gradeCard(fresh, Rating.Easy, now);
    expect(afterEasy.due).toBeGreaterThanOrEqual(afterGood.due);
  });

  it('MAX_REVIEW_CARDS is 50', () => {
    expect(MAX_REVIEW_CARDS).toBe(50);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web && pnpm vitest run test/fsrs/scheduler.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement scheduler.ts**

```ts
// src/fsrs/scheduler.ts
import type { CardRow, FsrsState } from '@hi-chinese/content';
import { fsrs, type Rating } from 'ts-fsrs';
import type { HiChineseDb } from '../db/db.js';
import { fromFsrsState, toFsrsState } from './state.js';

export const MAX_REVIEW_CARDS = 50;

const f = fsrs();

export function gradeCard(state: FsrsState, rating: Rating, now: number): FsrsState {
  const card = fromFsrsState(state);
  const result = f.repeat(card, new Date(now));
  return toFsrsState(result[rating].card);
}

export async function getDueCards(db: HiChineseDb, now: number): Promise<CardRow[]> {
  return db.cards.where('fsrs.due').belowOrEqual(now).limit(MAX_REVIEW_CARDS).toArray();
}

export async function getDueCount(db: HiChineseDb, now: number): Promise<number> {
  return db.cards.where('fsrs.due').belowOrEqual(now).count();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && pnpm vitest run test/fsrs/scheduler.test.ts`
Expected: PASS

- [ ] **Step 5: Add DB integration tests for getDueCards and getDueCount**

Append to `test/fsrs/scheduler.test.ts`:

```ts
import { cardId } from '@hi-chinese/content';
import { afterEach, beforeEach } from 'vitest';
import { openDb, outboxEntry, type HiChineseDb } from '../../src/db/db.js';
import { getDueCards, getDueCount } from '../../src/fsrs/scheduler.js';

describe('getDueCards / getDueCount', () => {
  let db: HiChineseDb;

  beforeEach(() => {
    db = openDb(`test-scheduler-${Date.now()}`);
  });
  afterEach(async () => {
    await db.delete();
  });

  const now = 1_700_000_000_000;

  async function seedCards(count: number, dueOffset: number) {
    const cards = Array.from({ length: count }, (_, i) => ({
      cardId: cardId('word-recognition', `w:test${i}`),
      kind: 'word-recognition' as const,
      fsrs: { ...emptyFsrsState(now), due: now + dueOffset },
      updatedAt: now,
    }));
    await db.cards.bulkPut(cards);
  }

  it('returns only cards due at or before now', async () => {
    await seedCards(3, -1000); // due in the past
    await seedCards(2, 60_000); // due in the future
    const due = await getDueCards(db, now);
    expect(due).toHaveLength(3);
    const count = await getDueCount(db, now);
    expect(count).toBe(3);
  });

  it('caps at MAX_REVIEW_CARDS', async () => {
    await seedCards(60, -1000);
    const due = await getDueCards(db, now);
    expect(due).toHaveLength(50);
  });
});
```

- [ ] **Step 6: Run full test file**

Run: `cd apps/web && pnpm vitest run test/fsrs/scheduler.test.ts`
Expected: PASS (all tests)

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/fsrs/scheduler.ts apps/web/test/fsrs/scheduler.test.ts
git commit -m "feat(web): FSRS scheduling — gradeCard, getDueCards, getDueCount"
```

---

### Task 2: Streak Computation

**Files:**
- Create: `src/streak/streak.ts`
- Test: `test/streak/streak.test.ts`

**Interfaces:**
- Consumes: `ActivityRow` from `@hi-chinese/content`
- Produces: `computeStreak(activities: readonly ActivityRow[], today: string): number`

- [ ] **Step 1: Write the test file**

```ts
// test/streak/streak.test.ts
import { describe, expect, it } from 'vitest';
import { computeStreak } from '../../src/streak/streak.js';
import type { ActivityRow } from '@hi-chinese/content';

function activity(date: string, lessons: number, reviews: number): ActivityRow {
  return { date, lessons, reviews, updatedAt: 0 };
}

describe('computeStreak', () => {
  it('returns 0 when no activities exist', () => {
    expect(computeStreak([], '2026-09-11')).toBe(0);
  });

  it('returns 0 when today has no activity', () => {
    expect(computeStreak([activity('2026-09-10', 1, 0)], '2026-09-11')).toBe(0);
  });

  it('returns 1 when only today has activity', () => {
    expect(computeStreak([activity('2026-09-11', 0, 1)], '2026-09-11')).toBe(1);
  });

  it('counts consecutive days from today backwards', () => {
    const acts = [
      activity('2026-09-11', 1, 0),
      activity('2026-09-10', 0, 1),
      activity('2026-09-09', 1, 1),
      activity('2026-09-07', 1, 0), // gap on 2026-09-08
    ];
    expect(computeStreak(acts, '2026-09-11')).toBe(3);
  });

  it('counts a day with only reviews', () => {
    const acts = [
      activity('2026-09-11', 0, 2),
      activity('2026-09-10', 0, 1),
    ];
    expect(computeStreak(acts, '2026-09-11')).toBe(2);
  });

  it('ignores days with zero lessons and zero reviews', () => {
    const acts = [
      activity('2026-09-11', 1, 0),
      activity('2026-09-10', 0, 0), // no activity
    ];
    expect(computeStreak(acts, '2026-09-11')).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/web && pnpm vitest run test/streak/streak.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement streak.ts**

```ts
// src/streak/streak.ts
import type { ActivityRow } from '@hi-chinese/content';

export function computeStreak(activities: readonly ActivityRow[], today: string): number {
  const active = new Set<string>();
  for (const a of activities) {
    if (a.lessons > 0 || a.reviews > 0) active.add(a.date);
  }
  let streak = 0;
  let date = today;
  while (active.has(date)) {
    streak++;
    date = prevDate(date);
  }
  return streak;
}

function prevDate(yyyyMmDd: string): string {
  const d = new Date(yyyyMmDd + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
```

The `T12:00:00` anchor avoids DST edge cases when subtracting a day at midnight.

- [ ] **Step 4: Run tests**

Run: `cd apps/web && pnpm vitest run test/streak/streak.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/streak/streak.ts apps/web/test/streak/streak.test.ts
git commit -m "feat(web): streak computation from activity log"
```

---

### Task 3: Hanzi Writer React Wrapper

**Files:**
- Modify: `package.json` (add `hanzi-writer` dependency)
- Modify: `vitest.config.ts` (add `hanzi-writer` test alias)
- Create: `test/stubs/hanzi-writer.ts`
- Create: `src/hanzi/HanziWriterComponent.tsx`
- Test: `test/hanzi/char-data-loader.test.ts`

**Interfaces:**
- Consumes: `hanzi-writer` npm package; `characterFileName` from `@hi-chinese/content`; `CONTENT_BASE` from `src/content/loader.ts`
- Produces: `HanziWriterComponent` React component with props: `character: string`, `mode: 'animate' | 'quiz'`, `showOutline?: boolean` (default `true`), `width?: number` (default `200`), `height?: number` (default `200`), `onQuizComplete?: (summary: { character: string; totalMistakes: number }) => void`

- [ ] **Step 1: Install hanzi-writer**

```bash
cd apps/web && pnpm add hanzi-writer@^3.7
```

- [ ] **Step 2: Create the HanziWriter test stub**

```ts
// test/stubs/hanzi-writer.ts
type Opts = Record<string, unknown>;

interface QuizOpts {
  onComplete?: (summary: { character: string; totalMistakes: number }) => void;
  onMistake?: (data: { totalMistakes: number }) => void;
  showHintAfterMisses?: number | false;
}

export default class HanziWriter {
  _el: unknown;
  _char: string;
  _quizOpts: QuizOpts | undefined;

  constructor(el: unknown, _opts?: Opts) {
    this._el = el;
    this._char = '';
  }

  static create(el: unknown, char: string, opts?: Opts): HanziWriter {
    const w = new HanziWriter(el, opts);
    w._char = char;
    return w;
  }

  setCharacter(char: string): Promise<void> {
    this._char = char;
    return Promise.resolve();
  }

  animateCharacter(): Promise<{ canceled: boolean }> {
    return Promise.resolve({ canceled: false });
  }

  loopCharacterAnimation(): Promise<void> {
    return Promise.resolve();
  }

  quiz(opts?: QuizOpts): Promise<void> {
    this._quizOpts = opts;
    return Promise.resolve();
  }

  cancelQuiz(): void {
    this._quizOpts = undefined;
  }

  showOutline(): Promise<void> { return Promise.resolve(); }
  hideOutline(): Promise<void> { return Promise.resolve(); }
  showCharacter(): Promise<void> { return Promise.resolve(); }
  hideCharacter(): Promise<void> { return Promise.resolve(); }
}
```

- [ ] **Step 3: Add vitest alias for hanzi-writer**

In `vitest.config.ts`, add to the `resolve.alias` object:

```ts
'hanzi-writer': path.resolve(import.meta.dirname, 'test/stubs/hanzi-writer.ts'),
```

So the alias block becomes:

```ts
alias: {
  'virtual:pwa-register/react': path.resolve(import.meta.dirname, 'test/stubs/pwa-register.ts'),
  'hanzi-writer': path.resolve(import.meta.dirname, 'test/stubs/hanzi-writer.ts'),
},
```

- [ ] **Step 4: Implement HanziWriterComponent**

```tsx
// src/hanzi/HanziWriterComponent.tsx
import HanziWriter from 'hanzi-writer';
import { useEffect, useRef } from 'react';
import { characterFileName } from '@hi-chinese/content';
import { CONTENT_BASE } from '../content/loader.js';

export interface HanziWriterProps {
  character: string;
  mode: 'animate' | 'quiz';
  showOutline?: boolean;
  width?: number;
  height?: number;
  onQuizComplete?: (summary: { character: string; totalMistakes: number }) => void;
  onMistake?: () => void;
}

export function HanziWriterComponent({
  character,
  mode,
  showOutline = true,
  width = 200,
  height = 200,
  onQuizComplete,
  onMistake,
}: HanziWriterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const onCompleteRef = useRef(onQuizComplete);
  onCompleteRef.current = onQuizComplete;
  const onMistakeRef = useRef(onMistake);
  onMistakeRef.current = onMistake;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const writer = HanziWriter.create(el, character, {
      width,
      height,
      showOutline,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 200,
      charDataLoader: (char: string, onLoad: (d: unknown) => void, onError: (e?: unknown) => void) => {
        const hex = characterFileName(char);
        fetch(`${CONTENT_BASE}/characters/${hex}.json`)
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
          .then((data) => onLoad(data))
          .catch((err) => onError?.(err));
      },
    });
    writerRef.current = writer;

    if (mode === 'animate') {
      void writer.loopCharacterAnimation();
    } else {
      void writer.quiz({
        showHintAfterMisses: 3,
        onComplete: (summary) => onCompleteRef.current?.(summary),
        onMistake: () => onMistakeRef.current?.(),
      });
    }

    return () => {
      writer.cancelQuiz();
      while (el.firstChild) el.removeChild(el.firstChild);
      writerRef.current = null;
    };
  }, [character, mode, showOutline, width, height]);

  return <div ref={containerRef} data-testid={`hanzi-writer-${character}`} />;
}
```

- [ ] **Step 5: Write charDataLoader test**

```ts
// test/hanzi/char-data-loader.test.ts
import { characterFileName } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';
import { CONTENT_BASE } from '../../src/content/loader.js';

describe('charDataLoader URL', () => {
  it('builds the correct URL for a character', () => {
    const ch = '一';
    const hex = characterFileName(ch);
    expect(hex).toBe('4e00');
    expect(`${CONTENT_BASE}/characters/${hex}.json`).toBe('/content/characters/4e00.json');
  });

  it('handles multi-byte characters', () => {
    const ch = '龙';
    const hex = characterFileName(ch);
    expect(`${CONTENT_BASE}/characters/${hex}.json`).toMatch(/^\/content\/characters\/[0-9a-f]+\.json$/);
  });
});
```

- [ ] **Step 6: Run tests**

Run: `cd apps/web && pnpm vitest run test/hanzi/`
Expected: PASS

- [ ] **Step 7: Run full web test suite to check nothing broke**

Run: `cd apps/web && pnpm vitest run`
Expected: all tests PASS

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json apps/web/vitest.config.ts \
  apps/web/test/stubs/hanzi-writer.ts \
  apps/web/src/hanzi/HanziWriterComponent.tsx \
  apps/web/test/hanzi/char-data-loader.test.ts
git commit -m "feat(web): HanziWriter React wrapper with custom charDataLoader"
```

After committing, run `pnpm install` from the workspace root to update the lockfile if needed.

---

### Task 4: Strokes Sheet on Learn Screen

**Files:**
- Create: `src/hanzi/StrokesSheet.tsx`
- Modify: `src/learn/LearnScreen.tsx` (add strokes button to `WordCard`)

**Interfaces:**
- Consumes: `HanziWriterComponent` from `src/hanzi/HanziWriterComponent.tsx`; `loadCharacter` from `src/content/loader.ts`; `Word`, `CharacterData` from `@hi-chinese/content`
- Produces: `StrokesSheet` component; modified `WordCard` with a "Strokes" button

- [ ] **Step 1: Implement StrokesSheet**

```tsx
// src/hanzi/StrokesSheet.tsx
import type { CharacterData, Word } from '@hi-chinese/content';
import { useEffect, useRef, useState } from 'react';
import { loadCharacter } from '../content/loader.js';
import { Loading } from '../ui/Loading.js';
import { HanziWriterComponent } from './HanziWriterComponent.js';

export function StrokesSheet({ word, onClose }: { word: Word; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [chars, setChars] = useState<(CharacterData | null)[] | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all(word.characters.map((ch) => loadCharacter(ch).catch(() => null))).then((data) => {
      if (!cancelled) setChars(data);
    });
    return () => {
      cancelled = true;
    };
  }, [word]);

  return (
    <dialog
      ref={dialogRef}
      className="w-full max-w-sm rounded-xl bg-white p-0 shadow-xl backdrop:bg-black/40"
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Strokes: {word.simplified}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded p-1 text-stone-500 hover:bg-stone-100"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
        {chars === null ? (
          <Loading label="Loading strokes…" />
        ) : (
          <div className="flex flex-col gap-5">
            {word.characters.map((ch, i) => {
              const data = chars[i];
              if (!data) return null;
              return (
                <div key={ch} className="flex items-start gap-4">
                  <HanziWriterComponent character={ch} mode="animate" width={120} height={120} />
                  <div className="flex flex-col gap-1 pt-2">
                    <div className="text-2xl">{ch}</div>
                    <div className="text-sm text-stone-600">{data.pinyin.join(', ')}</div>
                    {data.definition && (
                      <div className="text-sm text-stone-800">{data.definition}</div>
                    )}
                    <div className="text-xs text-stone-500">Radical: {data.radical}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </dialog>
  );
}
```

- [ ] **Step 2: Add Strokes button to WordCard in LearnScreen**

In `src/learn/LearnScreen.tsx`, modify the `WordCard` function. Add a state for the sheet and a button:

```tsx
import { useState } from 'react';
, { StrokesSheet } from '../hanzi/StrokesSheet.js';
```

Replace the `WordCard` function body with:

```tsx
export function WordCard({ word }: { word: Word }) {
  const [showStrokes, setShowStrokes] = useState(false);
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4">
      <div>
        <div className="text-3xl">{word.simplified}</div>
        <div className="text-stone-600">{word.pinyin}</div>
        <ul className="mt-1 text-sm text-stone-800">
          {word.meanings.slice(0, 2).map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        {word.traditional !== word.simplified && (
          <div className="mt-1 text-xs text-stone-500">Traditional: {word.traditional}</div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <SpeakButton text={word.simplified} />
        {word.characters.length > 0 && (
          <button
            type="button"
            onClick={() => setShowStrokes(true)}
            className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700"
            aria-label={`Strokes for ${word.simplified}`}
          >
            Strokes
          </button>
        )}
      </div>
      {showStrokes && <StrokesSheet word={word} onClose={() => setShowStrokes(false)} />}
    </li>
  );
}
```

Note: add `useState` to the existing React import and add the `StrokesSheet` import.

- [ ] **Step 3: Run full test suite**

Run: `cd apps/web && pnpm vitest run`
Expected: PASS (no regressions)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hanzi/StrokesSheet.tsx apps/web/src/learn/LearnScreen.tsx
git commit -m "feat(web): stroke-order animation sheet on learn screen word cards"
```

---

### Task 5: Write-It Exercise Type, Component, and Practice Generation

**Files:**
- Modify: `src/exercises/types.ts` (add WriteItExercise, WriteAnswer)
- Modify: `src/exercises/generate.ts` (add write-it generation)
- Modify: `src/exercises/components/ExerciseView.tsx` (add case)
- Create: `src/exercises/components/WriteIt.tsx`
- Modify: `test/fixtures/content.ts` (add fixture characters)
- Test: `test/exercises/write-it.test.ts`

**Interfaces:**
- Consumes: `HanziWriterComponent` from `src/hanzi/HanziWriterComponent.tsx`; `loadCharacter` from `src/content/loader.ts`; `Exercise`, `Answer` types; `ExerciseProps` from `MultipleChoice.tsx`; `devAttr` from `dev-attrs.ts`
- Produces: `WriteItExercise { kind: 'write-it'; id: string; character: string; showOutline: boolean }` in the Exercise union; `{ kind: 'write'; totalMistakes: number; showedAnswer: boolean }` in the Answer union; `WriteIt` component; updated `generateSession` producing 1–2 write-it exercises per session

- [ ] **Step 1: Write the type test**

```ts
// test/exercises/write-it.test.ts
import { describe, expect, it } from 'vitest';
import { checkAnswer, correctAnswerText, type Answer, type Exercise } from '../../src/exercises/types.js';

describe('write-it exercise', () => {
  const exercise: Exercise = {
    kind: 'write-it',
    id: 'write-4e00',
    character: '一',
    showOutline: true,
  };

  it('checkAnswer returns true for a completed write', () => {
    const answer: Answer = { kind: 'write', totalMistakes: 5, showedAnswer: false };
    expect(checkAnswer(exercise, answer)).toBe(true);
  });

  it('checkAnswer returns false when answer was shown', () => {
    const answer: Answer = { kind: 'write', totalMistakes: 0, showedAnswer: true };
    expect(checkAnswer(exercise, answer)).toBe(false);
  });

  it('checkAnswer returns false for wrong answer kind', () => {
    const answer: Answer = { kind: 'choice', index: 0 };
    expect(checkAnswer(exercise, answer)).toBe(false);
  });

  it('correctAnswerText returns the character', () => {
    expect(correctAnswerText(exercise)).toBe('一');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd apps/web && pnpm vitest run test/exercises/write-it.test.ts`
Expected: FAIL — WriteItExercise not in Exercise union

- [ ] **Step 3: Add WriteItExercise and WriteAnswer to types.ts**

In `src/exercises/types.ts`:

Add the interface after `FillBlankExercise`:

```ts
export interface WriteItExercise {
  kind: 'write-it';
  id: string;
  character: string;
  showOutline: boolean;
}
```

Add `WriteItExercise` to the `Exercise` union:

```ts
export type Exercise =
  | MultipleChoiceExercise
  | ListenPickExercise
  | MatchPairsExercise
  | SentenceBuilderExercise
  | FillBlankExercise
  | WriteItExercise;
```

Add to the `Answer` union:

```ts
export type Answer =
  | { kind: 'choice'; index: number }
  | { kind: 'order'; tiles: string[] }
  | { kind: 'pairs'; mismatches: number }
  | { kind: 'write'; totalMistakes: number; showedAnswer: boolean };
```

Add the `write-it` case to `checkAnswer`:

```ts
case 'write-it':
  return answer.kind === 'write' && !answer.showedAnswer;
```

Add to `correctAnswerText`:

```ts
case 'write-it':
  return exercise.character;
```

- [ ] **Step 4: Run write-it test**

Run: `cd apps/web && pnpm vitest run test/exercises/write-it.test.ts`
Expected: PASS

- [ ] **Step 5: Verify existing tests still pass (exhaustive switches)**

Run: `cd apps/web && pnpm vitest run`
Expected: might fail if ExerciseView.tsx has exhaustive switch. Fix in next step.

- [ ] **Step 6: Create the WriteIt exercise component**

```tsx
// src/exercises/components/WriteIt.tsx
import type { CharacterData } from '@hi-chinese/content';
import { useEffect, useRef, useState } from 'react';
import { loadCharacter } from '../../content/loader.js';
import { HanziWriterComponent } from '../../hanzi/HanziWriterComponent.js';
import { Loading } from '../../ui/Loading.js';
import { devAttr } from '../dev-attrs.js';
import type { WriteItExercise } from '../types.js';
import type { ExerciseProps } from './MultipleChoice.js';

export function WriteIt({ exercise, answered, onAnswer }: ExerciseProps<WriteItExercise>) {
  const [charData, setCharData] = useState<CharacterData | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const mistakesRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    loadCharacter(exercise.character).then((data) => {
      if (!cancelled) setCharData(data);
    });
    return () => {
      cancelled = true;
    };
  }, [exercise.character]);

  if (!charData && !answered) return <Loading label="Loading character…" />;

  const pinyin = charData?.pinyin.join(', ') ?? '';
  const meaning = charData?.definition ?? '';

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-stone-500">
        {exercise.showOutline ? 'Trace the character' : 'Write from memory'}
      </p>
      <div className="text-center">
        <p className="text-lg font-medium">{pinyin}</p>
        <p className="text-sm text-stone-600">{meaning}</p>
      </div>
      {answered ? (
        <div className="flex flex-col items-center gap-2">
          <div className="text-6xl">{exercise.character}</div>
          <p className="text-sm text-stone-500">
            {mistakes === 0 ? 'Perfect!' : `${mistakes} mistake${mistakes === 1 ? '' : 's'}`}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border-2 border-stone-200 bg-white">
            <HanziWriterComponent
              character={exercise.character}
              mode="quiz"
              showOutline={exercise.showOutline}
              width={250}
              height={250}
              onQuizComplete={(summary) => {
                setMistakes(summary.totalMistakes);
                onAnswer({
                  kind: 'write',
                  totalMistakes: summary.totalMistakes,
                  showedAnswer: false,
                });
              }}
              onMistake={() => {
                mistakesRef.current++;
                setMistakes(mistakesRef.current);
              }}
            />
          </div>
          {!exercise.showOutline && (
            <button
              type="button"
              onClick={() => {
                onAnswer({ kind: 'write', totalMistakes: 0, showedAnswer: true });
              }}
              className="text-sm text-stone-500 underline"
              {...devAttr('data-show-answer', 'true')}
            >
              Show me
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onAnswer({ kind: 'write', totalMistakes: 0, showedAnswer: false });
            }}
            className="hidden"
            {...devAttr('data-auto-complete', 'true')}
          >
            Auto-complete
          </button>
        </>
      )}
    </div>
  );
}
```

The hidden `data-auto-complete` button exists only in dev builds for e2e testing.

- [ ] **Step 7: Add write-it case to ExerciseView**

In `src/exercises/components/ExerciseView.tsx`, add import and case:

Add import:
```ts
import { WriteIt } from './WriteIt.js';
```

Add case before the closing of the switch:
```ts
case 'write-it':
  body = <WriteIt exercise={exercise} answered={answered} onAnswer={onAnswer} />;
  break;
```

- [ ] **Step 8: Add fixture characters to test fixtures**

In `test/fixtures/content.ts`, add at the end before `fixtureLoaders`:

```ts
import type { CharacterData } from '@hi-chinese/content';

export const fixtureCharacters: CharacterData[] = [
  {
    character: '我',
    strokes: ['M 350 400 Q 400 350 450 400'],
    medians: [[[350, 400], [400, 350], [450, 400]]],
    pinyin: ['wǒ'],
    definition: 'I; me',
    radical: '戈',
    decomposition: '⿰扌戈',
    wordIds: ['w:我'],
  },
  {
    character: '你',
    strokes: ['M 300 400 Q 350 350 400 400'],
    medians: [[[300, 400], [350, 350], [400, 400]]],
    pinyin: ['nǐ'],
    definition: 'you',
    radical: '亻',
    decomposition: '⿰亻尔',
    wordIds: ['w:你'],
  },
];
```

Also update `fixtureManifest` to include characters:

```ts
characters: ['我', '你', '他', '是', '不', '好', '们'],
counts: { words: 10, characters: 7, grammar: 1, sentences: 3, units: 2 },
```

- [ ] **Step 9: Add write-it generation to generateSession**

In `src/exercises/generate.ts`:

Add import for `WriteItExercise`:
```ts
import type {
  ...,
  WriteItExercise,
} from './types.js';
```

Add a `writeIt` generator function (after the existing generators, before `generateSession`):

```ts
function writeIt(character: string, rng: Rng, id: IdGen): WriteItExercise {
  return {
    kind: 'write-it',
    id: id('wr'),
    character,
    showOutline: true,
  };
}
```

In `generateSession`, after the `matchPairs` block (line ~262) and before the `if (input.audio)` block, add:

```ts
const unitChars = new Set<string>();
for (const wid of chunk.unit.wordIds) {
  const w = words.get(wid);
  if (w) for (const ch of w.characters) unitChars.add(ch);
}
const writeChars = shuffle(Array.from(unitChars), rng).slice(0, rng() < 0.5 ? 1 : 2);
for (const ch of writeChars) special.push(writeIt(ch, rng, id));
```

- [ ] **Step 10: Add generation test to write-it.test.ts**

Append to `test/exercises/write-it.test.ts`:

```ts
import { generateSession, type SessionInput } from '../../src/exercises/generate.js';
import { fixtureUnit1, fixtureWords } from '../fixtures/content.js';

describe('write-it in generateSession', () => {
  const words = new Map(fixtureWords.map((w) => [w.id, w]));
  const input: SessionInput = {
    chunk: fixtureUnit1,
    words,
    levelWordIds: fixtureWords.map((w) => w.id),
    audio: false,
  };

  it('generates at least one write-it exercise', () => {
    const exercises = generateSession(input, 42);
    const writeIts = exercises.filter((e) => e.kind === 'write-it');
    expect(writeIts.length).toBeGreaterThanOrEqual(1);
    expect(writeIts.length).toBeLessThanOrEqual(2);
  });

  it('write-it exercises have valid characters from the unit', () => {
    const exercises = generateSession(input, 42);
    const unitChars = new Set<string>();
    for (const wid of fixtureUnit1.unit.wordIds) {
      const w = words.get(wid);
      if (w) for (const ch of w.characters) unitChars.add(ch);
    }
    for (const ex of exercises) {
      if (ex.kind === 'write-it') {
        expect(unitChars.has(ex.character)).toBe(true);
        expect(ex.showOutline).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 11: Run all tests**

Run: `cd apps/web && pnpm vitest run`
Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add apps/web/src/exercises/types.ts \
  apps/web/src/exercises/generate.ts \
  apps/web/src/exercises/components/WriteIt.tsx \
  apps/web/src/exercises/components/ExerciseView.tsx \
  apps/web/test/exercises/write-it.test.ts \
  apps/web/test/fixtures/content.ts
git commit -m "feat(web): write-it exercise type, component, and practice generation"
```

---

### Task 6: Review Exercise Generation from Cards

**Files:**
- Create: `src/review/review-exercises.ts`
- Test: `test/review/review-exercises.test.ts`

**Interfaces:**
- Consumes: `CardRow`, `CardKind`, `parseCardId` from `@hi-chinese/content`; `Word` from `@hi-chinese/content`; `Exercise`, `MultipleChoiceExercise`, `WriteItExercise` from `src/exercises/types.ts`; `primaryMeaning` from `src/exercises/generate.ts`; `mulberry32`, `shuffle`, `randomInt` from `src/exercises/random.ts`
- Produces: `cardToExercise(card: CardRow, words: ReadonlyMap<string, Word>, allWordIds: readonly string[], rng: Rng): Exercise | null`; `generateReviewSession(cards: readonly CardRow[], words: ReadonlyMap<string, Word>, allWordIds: readonly string[], seed: number): Exercise[]`

- [ ] **Step 1: Write the test**

```ts
// test/review/review-exercises.test.ts
import { cardId, type CardRow } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';
import { emptyFsrsState } from '../../src/fsrs/state.js';
import { cardToExercise, generateReviewSession } from '../../src/review/review-exercises.js';
import { fixtureWords } from '../fixtures/content.js';

const now = Date.now();
const words = new Map(fixtureWords.map((w) => [w.id, w]));
const allWordIds = fixtureWords.map((w) => w.id);

function card(kind: 'word-recognition' | 'word-recall' | 'char-write', itemId: string): CardRow {
  return {
    cardId: cardId(kind, itemId),
    kind,
    fsrs: emptyFsrsState(now),
    updatedAt: now,
  };
}

describe('cardToExercise', () => {
  it('word-recognition → MC zh-en', () => {
    const ex = cardToExercise(card('word-recognition', 'w:我'), words, allWordIds, () => 0.5);
    expect(ex).not.toBeNull();
    expect(ex!.kind).toBe('multiple-choice');
    if (ex!.kind === 'multiple-choice') {
      expect(ex!.direction).toBe('zh-en');
      expect(ex!.prompt).toBe('我');
    }
  });

  it('word-recall → MC en-zh', () => {
    const ex = cardToExercise(card('word-recall', 'w:你'), words, allWordIds, () => 0.5);
    expect(ex).not.toBeNull();
    expect(ex!.kind).toBe('multiple-choice');
    if (ex!.kind === 'multiple-choice') {
      expect(ex!.direction).toBe('en-zh');
    }
  });

  it('char-write → write-it with showOutline false', () => {
    const ex = cardToExercise(card('char-write', '我'), words, allWordIds, () => 0.5);
    expect(ex).not.toBeNull();
    expect(ex!.kind).toBe('write-it');
    if (ex!.kind === 'write-it') {
      expect(ex!.character).toBe('我');
      expect(ex!.showOutline).toBe(false);
    }
  });

  it('returns null for unknown word', () => {
    const ex = cardToExercise(card('word-recognition', 'w:unknown'), words, allWordIds, () => 0.5);
    expect(ex).toBeNull();
  });
});

describe('generateReviewSession', () => {
  it('shuffles cards and produces exercises', () => {
    const cards = [
      card('word-recognition', 'w:我'),
      card('word-recall', 'w:你'),
      card('char-write', '好'),
    ];
    const exercises = generateReviewSession(cards, words, allWordIds, 42);
    expect(exercises).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd apps/web && pnpm vitest run test/review/review-exercises.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement review-exercises.ts**

```ts
// src/review/review-exercises.ts
import { parseCardId, type CardRow } from '@hi-chinese/content';
import type { Word } from '@hi-chinese/content';
import { primaryMeaning } from '../exercises/generate.js';
import { mulberry32, randomInt, shuffle, type Rng } from '../exercises/random.js';
import type { Exercise, MultipleChoiceExercise, WriteItExercise } from '../exercises/types.js';

function distinctMeanings(
  pool: readonly Word[],
  exclude: ReadonlySet<string>,
  n: number,
): string[] {
  const seen = new Set(exclude);
  const out: string[] = [];
  for (const w of pool) {
    const m = primaryMeaning(w);
    if (seen.has(m)) continue;
    seen.add(m);
    out.push(m);
    if (out.length === n) break;
  }
  return out;
}

function distinctSimplified(
  pool: readonly Word[],
  exclude: ReadonlySet<string>,
  n: number,
): string[] {
  const seen = new Set(exclude);
  const out: string[] = [];
  for (const w of pool) {
    if (seen.has(w.simplified)) continue;
    seen.add(w.simplified);
    out.push(w.simplified);
    if (out.length === n) break;
  }
  return out;
}

function withCorrect(
  correct: string,
  distractors: string[],
  rng: Rng,
): { options: string[]; correctIndex: number } {
  const correctIndex = randomInt(distractors.length + 1, rng);
  const options = [...distractors];
  options.splice(correctIndex, 0, correct);
  return { options, correctIndex };
}

export function cardToExercise(
  card: CardRow,
  words: ReadonlyMap<string, Word>,
  allWordIds: readonly string[],
  rng: Rng,
): Exercise | null {
  const parsed = parseCardId(card.cardId);
  if (!parsed) return null;

  if (parsed.kind === 'char-write') {
    const ex: WriteItExercise = {
      kind: 'write-it',
      id: card.cardId,
      character: parsed.itemId,
      showOutline: false,
    };
    return ex;
  }

  const word = words.get(parsed.itemId);
  if (!word) return null;

  const pool = shuffle(
    allWordIds.flatMap((id) => {
      const w = words.get(id);
      return w && w.id !== word.id ? [w] : [];
    }),
    rng,
  );

  if (parsed.kind === 'word-recognition') {
    const correct = primaryMeaning(word);
    const { options, correctIndex } = withCorrect(
      correct,
      distinctMeanings(pool, new Set([correct]), 3),
      rng,
    );
    const ex: MultipleChoiceExercise = {
      kind: 'multiple-choice',
      id: card.cardId,
      wordId: word.id,
      direction: 'zh-en',
      prompt: word.simplified,
      promptSub: word.pinyin,
      speech: word.simplified,
      options,
      correctIndex,
    };
    return ex;
  }

  // word-recall: en → zh
  const correct = word.simplified;
  const { options, correctIndex } = withCorrect(
    correct,
    distinctSimplified(pool, new Set([correct]), 3),
    rng,
  );
  const ex: MultipleChoiceExercise = {
    kind: 'multiple-choice',
    id: card.cardId,
    wordId: word.id,
    direction: 'en-zh',
    prompt: primaryMeaning(word),
    promptSub: null,
    speech: null,
    options,
    correctIndex,
  };
  return ex;
}

export function generateReviewSession(
  cards: readonly CardRow[],
  words: ReadonlyMap<string, Word>,
  allWordIds: readonly string[],
  seed: number,
): Exercise[] {
  const rng = mulberry32(seed);
  const shuffled = shuffle([...cards], rng);
  const exercises: Exercise[] = [];
  for (const card of shuffled) {
    const ex = cardToExercise(card, words, allWordIds, rng);
    if (ex) exercises.push(ex);
  }
  return exercises;
}
```

- [ ] **Step 4: Run tests**

Run: `cd apps/web && pnpm vitest run test/review/review-exercises.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/review/review-exercises.ts apps/web/test/review/review-exercises.test.ts
git commit -m "feat(web): review exercise generation from due cards"
```

---

### Task 7: Review Session Screen with Grade UI

**Files:**
- Create: `src/review/review-session.ts`
- Create: `src/review/GradeSelector.tsx`
- Create: `src/review/ReviewScreen.tsx`
- Modify: `src/db/progress.ts` (add `completeReviewSession`)
- Modify: `src/router.tsx` (add `/review` route)
- Test: `test/review/review-session.test.ts`

**Interfaces:**
- Consumes: `getDueCards` from `src/fsrs/scheduler.ts`; `gradeCard` from `src/fsrs/scheduler.ts`; `generateReviewSession` from `src/review/review-exercises.ts`; `Exercise`, `Answer`, `checkAnswer`, `correctAnswerText` from `src/exercises/types.ts`; `ExerciseView` from `src/exercises/components/ExerciseView.tsx`; `ExerciseBoundary` from `src/exercises/components/ExerciseBoundary.tsx`; `requestSync` from `src/sync/store.ts`; `db`, `outboxEntry`, `HiChineseDb`, `OutboxRow` from `src/db/db.ts`; `Rating` from `ts-fsrs`; `ContentIndex` from `src/content/index.ts`; `useContent` from `src/content/provider.tsx`
- Produces: `ReviewState`, `ReviewAction`, `reviewReducer`, `ReviewScreen` component, `completeReviewSession` DB function, `/review` route

- [ ] **Step 1: Write review-session reducer test**

```ts
// test/review/review-session.test.ts
import { Rating } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import {
  createReviewSession,
  currentReviewCard,
  reviewReducer,
  suggestWriteGrade,
  type ReviewState,
} from '../../src/review/review-session.js';

const mcExercise = {
  kind: 'multiple-choice' as const,
  id: 'test-mc',
  wordId: 'w:我',
  direction: 'zh-en' as const,
  prompt: '我',
  promptSub: 'wǒ',
  speech: '我',
  options: ['I; me', 'you', 'he', 'she'],
  correctIndex: 0,
};

const writeExercise = {
  kind: 'write-it' as const,
  id: 'test-wr',
  character: '我',
  showOutline: false,
};

describe('suggestWriteGrade', () => {
  it('0 mistakes → Easy', () => expect(suggestWriteGrade(0, false)).toBe(Rating.Easy));
  it('1 mistake → Good', () => expect(suggestWriteGrade(1, false)).toBe(Rating.Good));
  it('2 mistakes → Good', () => expect(suggestWriteGrade(2, false)).toBe(Rating.Good));
  it('3 mistakes → Hard', () => expect(suggestWriteGrade(3, false)).toBe(Rating.Hard));
  it('showed answer → Again', () => expect(suggestWriteGrade(0, true)).toBe(Rating.Again));
});

describe('reviewReducer', () => {
  it('creates a session with the given exercises', () => {
    const state = createReviewSession([mcExercise, writeExercise]);
    expect(state.exercises).toHaveLength(2);
    expect(state.phase).toBe('question');
    expect(state.position).toBe(0);
  });

  it('MC answer → auto-grade Good, phase feedback', () => {
    let state = createReviewSession([mcExercise]);
    state = reviewReducer(state, { type: 'answer', answer: { kind: 'choice', index: 0 } });
    expect(state.phase).toBe('feedback');
    expect(state.confirmedGrade).toBe(Rating.Good);
    expect(state.correct).toBe(1);
  });

  it('MC wrong answer → auto-grade Again, phase feedback', () => {
    let state = createReviewSession([mcExercise]);
    state = reviewReducer(state, { type: 'answer', answer: { kind: 'choice', index: 1 } });
    expect(state.phase).toBe('feedback');
    expect(state.confirmedGrade).toBe(Rating.Again);
    expect(state.correct).toBe(0);
  });

  it('write answer → phase grading with suggested grade', () => {
    let state = createReviewSession([writeExercise]);
    state = reviewReducer(state, {
      type: 'answer',
      answer: { kind: 'write', totalMistakes: 1, showedAnswer: false },
    });
    expect(state.phase).toBe('grading');
    expect(state.suggestedGrade).toBe(Rating.Good);
    expect(state.confirmedGrade).toBe(Rating.Good); // defaults to suggested
  });

  it('grade action overrides the suggested grade', () => {
    let state = createReviewSession([writeExercise]);
    state = reviewReducer(state, {
      type: 'answer',
      answer: { kind: 'write', totalMistakes: 1, showedAnswer: false },
    });
    state = reviewReducer(state, { type: 'grade', rating: Rating.Hard });
    expect(state.phase).toBe('feedback');
    expect(state.confirmedGrade).toBe(Rating.Hard);
  });

  it('next advances position', () => {
    let state = createReviewSession([mcExercise, writeExercise]);
    state = reviewReducer(state, { type: 'answer', answer: { kind: 'choice', index: 0 } });
    state = reviewReducer(state, { type: 'next' });
    expect(state.position).toBe(1);
    expect(state.phase).toBe('question');
  });

  it('next after last card → done', () => {
    let state = createReviewSession([mcExercise]);
    state = reviewReducer(state, { type: 'answer', answer: { kind: 'choice', index: 0 } });
    state = reviewReducer(state, { type: 'next' });
    expect(state.phase).toBe('done');
    expect(state.grades).toHaveLength(1);
  });

  it('skip removes current exercise', () => {
    let state = createReviewSession([mcExercise, writeExercise]);
    state = reviewReducer(state, { type: 'skip' });
    expect(state.exercises).toHaveLength(1);
    expect(state.skipped).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd apps/web && pnpm vitest run test/review/review-session.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement review-session.ts**

```ts
// src/review/review-session.ts
import { Rating } from 'ts-fsrs';
import { checkAnswer, type Answer, type Exercise } from '../exercises/types.js';

export function suggestWriteGrade(totalMistakes: number, showedAnswer: boolean): Rating {
  if (showedAnswer) return Rating.Again;
  if (totalMistakes === 0) return Rating.Easy;
  if (totalMistakes <= 2) return Rating.Good;
  return Rating.Hard;
}

function mcGrade(correct: boolean): Rating {
  return correct ? Rating.Good : Rating.Again;
}

export interface ReviewGrade {
  exerciseIndex: number;
  rating: Rating;
}

export interface ReviewState {
  exercises: Exercise[];
  position: number;
  phase: 'question' | 'feedback' | 'grading' | 'done';
  currentAnswer: Answer | null;
  suggestedGrade: Rating | null;
  confirmedGrade: Rating | null;
  grades: ReviewGrade[];
  correct: number;
  answered: number;
  skipped: number;
}

export type ReviewAction =
  | { type: 'answer'; answer: Answer }
  | { type: 'grade'; rating: Rating }
  | { type: 'next' }
  | { type: 'skip' };

export function createReviewSession(exercises: readonly Exercise[]): ReviewState {
  return {
    exercises: [...exercises],
    position: 0,
    phase: exercises.length === 0 ? 'done' : 'question',
    currentAnswer: null,
    suggestedGrade: null,
    confirmedGrade: null,
    grades: [],
    correct: 0,
    answered: 0,
    skipped: 0,
  };
}

export function currentReviewCard(state: ReviewState): Exercise | null {
  return state.phase === 'done' ? null : (state.exercises[state.position] ?? null);
}

export function reviewProgress(state: ReviewState): number {
  return state.exercises.length === 0 ? 1 : Math.min(1, state.position / state.exercises.length);
}

export function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  const current = currentReviewCard(state);

  switch (action.type) {
    case 'answer': {
      if (state.phase !== 'question' || !current) return state;
      const isCorrect = checkAnswer(current, action.answer);

      if (current.kind === 'write-it' && action.answer.kind === 'write') {
        const suggested = suggestWriteGrade(action.answer.totalMistakes, action.answer.showedAnswer);
        return {
          ...state,
          phase: 'grading',
          currentAnswer: action.answer,
          suggestedGrade: suggested,
          confirmedGrade: suggested,
          answered: state.answered + 1,
          correct: state.correct + (isCorrect ? 1 : 0),
        };
      }

      const grade = mcGrade(isCorrect);
      return {
        ...state,
        phase: 'feedback',
        currentAnswer: action.answer,
        suggestedGrade: grade,
        confirmedGrade: grade,
        answered: state.answered + 1,
        correct: state.correct + (isCorrect ? 1 : 0),
      };
    }

    case 'grade': {
      if (state.phase !== 'grading') return state;
      return {
        ...state,
        phase: 'feedback',
        confirmedGrade: action.rating,
      };
    }

    case 'next': {
      if (state.phase !== 'feedback' || state.confirmedGrade === null) return state;
      const grades = [...state.grades, { exerciseIndex: state.position, rating: state.confirmedGrade }];
      const position = state.position + 1;
      return {
        ...state,
        grades,
        position,
        phase: position >= state.exercises.length ? 'done' : 'question',
        currentAnswer: null,
        suggestedGrade: null,
        confirmedGrade: null,
      };
    }

    case 'skip': {
      if (state.phase === 'done' || !current) return state;
      const exercises = state.exercises.filter((_, i) => i !== state.position);
      return {
        ...state,
        exercises,
        skipped: state.skipped + 1,
        currentAnswer: null,
        suggestedGrade: null,
        confirmedGrade: null,
        phase: state.position >= exercises.length ? 'done' : 'question',
      };
    }
  }
}
```

- [ ] **Step 4: Run reducer tests**

Run: `cd apps/web && pnpm vitest run test/review/review-session.test.ts`
Expected: PASS

- [ ] **Step 5: Implement completeReviewSession in progress.ts**

In `src/db/progress.ts`, add the following imports and function:

Add imports at the top:
```ts
import type { FsrsState } from '@hi-chinese/content';
```

Add after `completeUnit`:

```ts
export interface ReviewGradeInput {
  cardId: string;
  newFsrs: FsrsState;
}

export async function completeReviewSession(
  db: HiChineseDb,
  grades: readonly ReviewGradeInput[],
  now: number,
): Promise<void> {
  await db.transaction('rw', [db.cards, db.activity, db.outbox], async () => {
    const outbox: OutboxRow[] = [];

    for (const { cardId: cid, newFsrs } of grades) {
      const existing = await db.cards.get(cid);
      if (!existing) continue;
      const updatedAt = nextUpdatedAt(existing.updatedAt, now);
      await db.cards.put({ ...existing, fsrs: newFsrs, updatedAt });
      outbox.push(outboxEntry('cards', cid, updatedAt));
    }

    const date = localDate(now);
    const day = await db.activity.get(date);
    const dayUpdatedAt = nextUpdatedAt(day?.updatedAt, now);
    await db.activity.put({
      date,
      lessons: day?.lessons ?? 0,
      reviews: (day?.reviews ?? 0) + 1,
      updatedAt: dayUpdatedAt,
    });
    outbox.push(outboxEntry('activity', date, dayUpdatedAt));

    await db.outbox.bulkPut(outbox);
  });
}
```

- [ ] **Step 6: Implement GradeSelector component**

```tsx
// src/review/GradeSelector.tsx
import { Rating } from 'ts-fsrs';

const GRADES = [
  { rating: Rating.Again, label: 'Again', color: 'bg-red-100 text-red-800 border-red-300' },
  { rating: Rating.Hard, label: 'Hard', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { rating: Rating.Good, label: 'Good', color: 'bg-green-100 text-green-800 border-green-300' },
  { rating: Rating.Easy, label: 'Easy', color: 'bg-blue-100 text-blue-800 border-blue-300' },
] as const;

export function GradeSelector({
  selected,
  onSelect,
}: {
  selected: Rating;
  onSelect: (rating: Rating) => void;
}) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Grade your answer">
      {GRADES.map(({ rating, label, color }) => (
        <button
          key={rating}
          type="button"
          role="radio"
          aria-checked={selected === rating}
          onClick={() => onSelect(rating)}
          className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm font-medium transition-all ${
            selected === rating ? `${color} ring-2 ring-offset-1` : 'border-stone-200 bg-white text-stone-600'
          }`}
          data-grade={rating}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Implement ReviewScreen**

```tsx
// src/review/ReviewScreen.tsx
import { Rating } from 'ts-fsrs';
import { Link } from '@tanstack/react-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useContent } from '../content/provider.js';
import { db } from '../db/db.js';
import { completeReviewSession, type ReviewGradeInput } from '../db/progress.js';
import { ExerciseBoundary } from '../exercises/components/ExerciseBoundary.js';
import { ExerciseView } from '../exercises/components/ExerciseView.js';
import { correctAnswerText, type Answer } from '../exercises/types.js';
import { gradeCard } from '../fsrs/scheduler.js';
import { getDueCards } from '../fsrs/scheduler.js';
import { requestSync } from '../sync/store.js';
import { InlineError } from '../ui/InlineError.js';
import { Loading } from '../ui/Loading.js';
import { GradeSelector } from './GradeSelector.js';
import { generateReviewSession } from './review-exercises.js';
import {
  createReviewSession,
  currentReviewCard,
  reviewProgress,
  reviewReducer,
  type ReviewState,
} from './review-session.js';

export function ReviewScreen() {
  const content = useContent();
  const [cards, setCards] = useState<Awaited<ReturnType<typeof getDueCards>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDueCards(db, Date.now())
      .then(setCards)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  if (error) return <InlineError message={`Could not load review cards: ${error}`} />;
  if (cards === null) return <Loading label="Loading review…" />;
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <h1 className="text-2xl font-semibold">All caught up!</h1>
        <p className="text-stone-600">No cards are due for review right now.</p>
        <Link to="/" className="mt-4 rounded-lg bg-red-700 px-5 py-3 font-medium text-white">
          Back to path
        </Link>
      </div>
    );
  }

  const allWordIds = Array.from(content.words.keys());
  const exercises = generateReviewSession(cards, content.words, allWordIds, Date.now());

  return <ReviewSessionRunner key={cards.length} exercises={exercises} cards={cards} />;
}

function ReviewSessionRunner({
  exercises,
  cards,
}: {
  exercises: ReturnType<typeof generateReviewSession>;
  cards: Awaited<ReturnType<typeof getDueCards>>;
}) {
  const [state, dispatch] = useReducer(reviewReducer, exercises, createReviewSession);
  const [answered, setAnswered] = useState<Answer | null>(null);
  const recorded = useRef(false);

  useEffect(() => {
    if (state.phase !== 'done' || recorded.current) return;
    recorded.current = true;

    const now = Date.now();
    const gradeInputs: ReviewGradeInput[] = state.grades.flatMap((g) => {
      const card = cards[g.exerciseIndex];
      if (!card) return [];
      const newFsrs = gradeCard(card.fsrs, g.rating, now);
      return [{ cardId: card.cardId, newFsrs }];
    });

    void completeReviewSession(db, gradeInputs, now).then(() => requestSync({ db }));
  }, [state.phase, state.grades, cards]);

  if (state.phase === 'done') return <ReviewResults state={state} />;

  const exercise = currentReviewCard(state);
  if (!exercise) return <Loading />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${Math.round(reviewProgress(state) * 100)}%` }}
          />
        </div>
        <span className="text-sm text-stone-600">
          {state.position + 1}/{state.exercises.length}
        </span>
      </div>

      <ExerciseBoundary
        key={`${exercise.id}:${state.position}`}
        onError={() => dispatch({ type: 'skip' })}
      >
        <ExerciseView
          exercise={exercise}
          answered={answered}
          onAnswer={(a) => {
            setAnswered(a);
            dispatch({ type: 'answer', answer: a });
          }}
        />
      </ExerciseBoundary>

      {state.phase === 'grading' && state.confirmedGrade !== null && (
        <div className="flex flex-col gap-3 rounded-lg bg-stone-50 p-4">
          <p className="text-sm font-medium text-stone-700">How well did you know this?</p>
          <GradeSelector
            selected={state.confirmedGrade}
            onSelect={(rating) => dispatch({ type: 'grade', rating })}
          />
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'grade', rating: state.confirmedGrade! });
            }}
            className="rounded-md bg-stone-900 px-4 py-2 text-white"
          >
            Continue
          </button>
        </div>
      )}

      {state.phase === 'feedback' && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-lg p-4 ${
            state.confirmedGrade !== null && state.confirmedGrade >= Rating.Good
              ? 'bg-green-50 text-green-900'
              : 'bg-red-50 text-red-900'
          }`}
        >
          <div>
            <p className="font-semibold">
              {state.confirmedGrade !== null && state.confirmedGrade >= Rating.Good
                ? 'Correct!'
                : 'Review again soon'}
            </p>
            {state.confirmedGrade !== null &&
              state.confirmedGrade < Rating.Good &&
              exercise.kind !== 'write-it' && (
                <p className="text-sm">Answer: {correctAnswerText(exercise)}</p>
              )}
          </div>
          <button
            type="button"
            onClick={() => {
              setAnswered(null);
              dispatch({ type: 'next' });
            }}
            className="rounded-md bg-stone-900 px-4 py-2 text-white"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewResults({ state }: { state: ReviewState }) {
  const acc = state.answered === 0 ? 0 : state.correct / state.answered;
  return (
    <div data-testid="review-results" className="flex flex-col items-center gap-4 py-8 text-center">
      <h1 className="text-2xl font-semibold">Review complete</h1>
      <p className="text-4xl font-semibold text-blue-700">{Math.round(acc * 100)}%</p>
      <p className="text-stone-600">accuracy</p>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-stone-700">
        <dt>Cards reviewed</dt>
        <dd className="font-medium">{state.answered}</dd>
        <dt>Correct</dt>
        <dd className="font-medium">{state.correct}</dd>
      </dl>
      <Link to="/" className="mt-4 rounded-lg bg-blue-700 px-5 py-3 font-medium text-white">
        Back to path
      </Link>
    </div>
  );
}
```

- [ ] **Step 8: Add /review route to router.tsx**

In `src/router.tsx`, add import:
```ts
import { ReviewScreen } from './review/ReviewScreen.js';
```

Add route after `practiceRoute`:
```ts
export const reviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/review',
  component: ReviewScreen,
});
```

Add `reviewRoute` to the `routeTree` children array.

- [ ] **Step 9: Run all tests**

Run: `cd apps/web && pnpm vitest run`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/review/review-session.ts \
  apps/web/src/review/GradeSelector.tsx \
  apps/web/src/review/ReviewScreen.tsx \
  apps/web/src/review/review-exercises.ts \
  apps/web/src/db/progress.ts \
  apps/web/src/router.tsx \
  apps/web/test/review/review-session.test.ts
git commit -m "feat(web): review session with FSRS grading and grade selector"
```

---

### Task 8: Path Screen — Streak, Due Count, and Review Button

**Files:**
- Create: `src/streak/StreakBadge.tsx`
- Modify: `src/path/PathScreen.tsx`

**Interfaces:**
- Consumes: `computeStreak` from `src/streak/streak.ts`; `getDueCount` from `src/fsrs/scheduler.ts`; `db` from `src/db/db.ts`; `useLiveQuery` from `src/db/use-live-query.ts`; `localDate` from `src/db/time.ts`
- Produces: `StreakBadge` component; modified `PathScreen` with streak, due count, and "Review" link

- [ ] **Step 1: Implement StreakBadge**

```tsx
// src/streak/StreakBadge.tsx
export function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null;
  return (
    <div className="flex items-center gap-1 text-orange-600" aria-label={`${streak} day streak`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
      </svg>
      <span className="text-sm font-semibold">{streak}</span>
    </div>
  );
}

export function DueCountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
      {count} due
    </span>
  );
}
```

- [ ] **Step 2: Modify PathScreen to show streak, due count, and review button**

In `src/path/PathScreen.tsx`, add imports:

```ts
import { Link } from '@tanstack/react-router';
import { getDueCount } from '../fsrs/scheduler.js';
import { localDate } from '../db/time.js';
import { computeStreak } from '../streak/streak.js';
import { StreakBadge, DueCountBadge } from '../streak/StreakBadge.js';
```

Add two more `useLiveQuery` calls inside `PathScreen`, after the existing `rows` query:

```ts
const activities = useLiveQuery(() => db.activity.toArray(), []);
const dueCount = useLiveQuery(() => getDueCount(db, Date.now()), []);
```

Compute streak (after the existing `states` computation):

```ts
const streak = activities ? computeStreak(activities, localDate(Date.now())) : 0;
```

Add a hero section before the level list. The returned JSX becomes:

```tsx
return (
  <div className="flex flex-col gap-8">
    <div className="flex items-center justify-between">
      <StreakBadge streak={streak} />
      <div className="flex items-center gap-3">
        {dueCount !== undefined && dueCount > 0 && (
          <>
            <DueCountBadge count={dueCount} />
            <Link
              to="/review"
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white"
              data-testid="review-button"
            >
              Review
            </Link>
          </>
        )}
      </div>
    </div>
    {content.manifest.levels.map((level) => (
      /* existing level sections unchanged */
    ))}
  </div>
);
```

- [ ] **Step 3: Run all tests**

Run: `cd apps/web && pnpm vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/streak/StreakBadge.tsx apps/web/src/path/PathScreen.tsx
git commit -m "feat(web): streak badge, due count, and review button on path screen"
```

---

### Task 9: Character Page

**Files:**
- Create: `src/character/CharacterPage.tsx`
- Modify: `src/router.tsx` (add `/character/$charCode` route)
- Modify: `src/learn/LearnScreen.tsx` (make characters in WordCard link to character page)

**Interfaces:**
- Consumes: `HanziWriterComponent` from `src/hanzi/HanziWriterComponent.tsx`; `loadCharacter` from `src/content/loader.ts`; `useContent` from `src/content/provider.tsx`; `CharacterData`, `Word` from `@hi-chinese/content`
- Produces: `CharacterPage` component at route `/character/$charCode`

- [ ] **Step 1: Implement CharacterPage**

```tsx
// src/character/CharacterPage.tsx
import type { CharacterData } from '@hi-chinese/content';
import { Link, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { SpeakButton } from '../audio/SpeakButton.js';
import { useContent } from '../content/provider.js';
import { loadCharacter } from '../content/loader.js';
import { HanziWriterComponent } from '../hanzi/HanziWriterComponent.js';
import { InlineError } from '../ui/InlineError.js';
import { Loading } from '../ui/Loading.js';

export function CharacterPage() {
  const { charCode } = useParams({ from: '/character/$charCode' });
  const ch = String.fromCodePoint(parseInt(charCode, 16));
  const content = useContent();
  const [data, setData] = useState<CharacterData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    loadCharacter(ch)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [ch]);

  if (error)
    return (
      <InlineError
        message={`Could not load character: ${error}`}
        onRetry={() => {
          setError(null);
          loadCharacter(ch)
            .then(setData)
            .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
        }}
      />
    );
  if (!data) return <Loading label={`Loading ${ch}…`} />;

  const words = data.wordIds.flatMap((wid) => {
    const w = content.words.get(wid);
    return w ? [w] : [];
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-5">
        <div className="rounded-lg border-2 border-stone-200 bg-white">
          <HanziWriterComponent character={ch} mode="animate" width={160} height={160} />
        </div>
        <div className="flex flex-col gap-1 pt-2">
          <h1 className="text-5xl">{ch}</h1>
          <div className="flex items-center gap-2">
            <span className="text-lg text-stone-600">{data.pinyin.join(', ')}</span>
            <SpeakButton text={ch} />
          </div>
          {data.definition && <p className="text-stone-800">{data.definition}</p>}
          <div className="mt-1 text-sm text-stone-500">
            <span>Radical: {data.radical}</span>
            {data.decomposition !== '？' && <span className="ml-3">Parts: {data.decomposition}</span>}
          </div>
        </div>
      </div>

      {words.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Course words</h2>
          <ul className="flex flex-col gap-1">
            {words.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-lg">{w.simplified}</span>
                  <span className="text-sm text-stone-600">{w.pinyin}</span>
                  <span className="text-sm text-stone-500">
                    {w.meanings.slice(0, 2).join('; ')}
                  </span>
                </div>
                <SpeakButton text={w.simplified} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link to="/" className="text-sm text-stone-500 underline">
        Back to path
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Add /character/$charCode route to router.tsx**

In `src/router.tsx`, add import:
```ts
import { CharacterPage } from './character/CharacterPage.js';
```

Add route:
```ts
export const characterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/character/$charCode',
  component: CharacterPage,
});
```

Add `characterRoute` to the `routeTree` children array.

- [ ] **Step 3: Make characters in WordCard link to character page**

In `src/learn/LearnScreen.tsx`, modify the WordCard's `<div className="text-3xl">` to make each character clickable:

Replace `<div className="text-3xl">{word.simplified}</div>` with:

```tsx
<div className="text-3xl">
  {[...word.simplified].map((ch, i) => (
    <Link
      key={i}
      to="/character/$charCode"
      params={{ charCode: ch.codePointAt(0)!.toString(16).padStart(4, '0') }}
      className="hover:text-red-700 hover:underline"
    >
      {ch}
    </Link>
  ))}
</div>
```

Add `Link` to the `@tanstack/react-router` import if not already there.

- [ ] **Step 4: Run all tests**

Run: `cd apps/web && pnpm vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/character/CharacterPage.tsx \
  apps/web/src/router.tsx \
  apps/web/src/learn/LearnScreen.tsx
git commit -m "feat(web): character page with strokes, radical, words; link from learn screen"
```

---

### Task 10: E2E Test — Review Session Flow

**Files:**
- Create: `e2e/review-session.spec.ts`

**Interfaces:**
- Consumes: existing e2e infrastructure (Playwright config, wrangler + vite web servers); dev attributes (`data-correct`, `data-answer-index`, `data-auto-complete`, `data-show-answer`, `data-grade`); test passphrase `test-passphrase`

- [ ] **Step 1: Write the e2e test**

```ts
// e2e/review-session.spec.ts
import { expect, test } from '@playwright/test';

test('complete Unit 1 then review due cards', async ({ page }) => {
  // --- Setup: enter passphrase ---
  await page.goto('/');
  await page.waitForURL('/setup');
  await page.getByPlaceholder('Passphrase').fill('test-passphrase');
  await page.getByRole('button', { name: /enter/i }).click();
  await page.waitForURL('/');

  // --- Learn Unit 1 ---
  await page.getByTestId('unit-l1-u01').click();
  await page.getByRole('link', { name: /learn/i }).click();
  await page.getByRole('link', { name: /start practice/i }).click();

  // --- Practice: solve all exercises ---
  const solveExercises = async () => {
    for (let i = 0; i < 30; i++) {
      const exerciseEl = page.getByTestId('exercise');
      const kind = await exerciseEl.getAttribute('data-kind');
      if (!kind) break;

      if (kind === 'write-it') {
        const autoBtn = page.locator('[data-auto-complete="true"]');
        if (await autoBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await autoBtn.click();
        }
      } else if (kind === 'match-pairs') {
        const pairs = await page.locator('[data-pair-zh]').all();
        for (const pair of pairs) {
          const zh = await pair.getAttribute('data-pair-zh');
          const en = await pair.getAttribute('data-pair-en');
          if (zh && en) {
            await page.locator(`[data-pair-zh="${zh}"]`).click();
            await page.locator(`[data-pair-en="${en}"]`).click();
          }
        }
      } else {
        const correct = page.locator('[data-correct="true"]');
        if (await correct.isVisible({ timeout: 500 }).catch(() => false)) {
          await correct.click();
        }
      }

      const continueBtn = page.getByRole('button', { name: /continue/i });
      if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await continueBtn.click();
      }

      if (await page.getByTestId('results').isVisible({ timeout: 500 }).catch(() => false)) {
        break;
      }
    }
  };

  await solveExercises();
  await expect(page.getByTestId('results')).toBeVisible({ timeout: 10_000 });

  // --- Navigate back and verify Review button ---
  await page.getByRole('link', { name: /back to path/i }).click();
  await page.waitForURL('/');
  await expect(page.getByTestId('review-button')).toBeVisible({ timeout: 5000 });

  // --- Start review ---
  await page.getByTestId('review-button').click();
  await page.waitForURL('/review');

  // --- Solve review exercises (MC and write-it) ---
  for (let i = 0; i < 60; i++) {
    const exerciseEl = page.getByTestId('exercise');
    if (!(await exerciseEl.isVisible({ timeout: 2000 }).catch(() => false))) break;

    const kind = await exerciseEl.getAttribute('data-kind');

    if (kind === 'write-it') {
      const autoBtn = page.locator('[data-auto-complete="true"]');
      const showBtn = page.locator('[data-show-answer="true"]');
      if (await autoBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await autoBtn.click();
      } else if (await showBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await showBtn.click();
      }
      // Grade selector: click Continue (defaults to suggested grade)
      const gradeContBtn = page.getByRole('button', { name: /continue/i });
      if (await gradeContBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await gradeContBtn.click();
      }
    } else {
      const correct = page.locator('[data-correct="true"]');
      if (await correct.isVisible({ timeout: 500 }).catch(() => false)) {
        await correct.click();
      }
    }

    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
    }

    if (await page.getByTestId('review-results').isVisible({ timeout: 500 }).catch(() => false)) {
      break;
    }
  }

  // --- Verify review results ---
  await expect(page.getByTestId('review-results')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Review complete')).toBeVisible();
});
```

- [ ] **Step 2: Run the e2e test**

Run: `cd apps/web && pnpm exec playwright test e2e/review-session.spec.ts`
Expected: PASS (may need debugging — adjust selectors or timing as needed)

- [ ] **Step 3: Run the full e2e suite to check for regressions**

Run: `cd apps/web && pnpm exec playwright test`
Expected: both e2e tests PASS

- [ ] **Step 4: Run the full unit test suite one final time**

Run: `cd apps/web && pnpm vitest run`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e/review-session.spec.ts
git commit -m "test(web): e2e test for review session flow after completing Unit 1"
```

---

## Self-Review Notes

### Spec coverage check

| Spec requirement | Task |
|-----------------|------|
| §5 Cards: word-recognition, word-recall, char-write | Phase 3 creates them; Task 6 converts to exercises |
| §5 Scheduling: FSRS, default params, retention 0.9 | Task 1: `fsrs()` defaults |
| §5 Grades: Again/Hard/Good/Easy; MC wrong→Again, correct→Good; Hard/Easy only on writing | Task 7: `mcGrade`, `suggestWriteGrade`, `GradeSelector` |
| §5 Session: all due, cap 50, random order | Task 1: `getDueCards` with limit; Task 6: shuffle |
| §5 Home: due count and streak | Task 8: `PathScreen` with `StreakBadge` + `DueCountBadge` |
| §5 New cards only via lessons | Design: cards created in `completeUnit`, review only queries existing |
| §5 Streak: day counts if lesson or review done; computed from activity log | Task 2: `computeStreak` |
| §6 Library: Hanzi Writer, custom charDataLoader, offline | Task 3: `HanziWriterComponent` with fetch from `/content/characters/` |
| §6 Learn step: strokes button → sheet with animation, radical, meaning | Task 4: `StrokesSheet` + WordCard button |
| §6 Practice: write-it, quiz with outline, hint after 3 | Task 5: `WriteIt` component with `showOutline: true`, `showHintAfterMisses: 3` |
| §6 Review: write from memory, no outline; grade from mistakes; user override | Task 7: WriteIt with `showOutline: false`, `GradeSelector` |
| §6 Character page: strokes, radical, decomposition, course words; reachable from any word | Task 9: `CharacterPage`; clickable characters in WordCard |

### Placeholder scan

No TBD, TODO, "implement later", or "similar to Task N" found.

### Type consistency check

- `Exercise` union: `WriteItExercise` added in Task 5, consumed in Tasks 6, 7
- `Answer` union: `WriteAnswer` (`kind: 'write'`) added in Task 5, consumed in Tasks 7
- `gradeCard` signature: `(FsrsState, Rating, number) → FsrsState` — consistent in Tasks 1, 7
- `getDueCards` / `getDueCount`: produced in Task 1, consumed in Tasks 7, 8
- `computeStreak`: produced in Task 2, consumed in Task 8
- `cardToExercise` / `generateReviewSession`: produced in Task 6, consumed in Task 7
- `reviewReducer` / `createReviewSession`: produced in Task 7, consumed in ReviewScreen
- `completeReviewSession`: produced in Task 7 (progress.ts), consumed in ReviewScreen
- `ReviewGradeInput`: `{ cardId: string; newFsrs: FsrsState }` — consistent across progress.ts and ReviewScreen
- `HanziWriterComponent` props: consistent across Tasks 3, 4, 5, 9
- Route params: `$charCode` (hex string) consistent in router.tsx, CharacterPage, WordCard links

### Deferred items

- **useLiveQuery silent failure**: deferred from Phase 3; still applies to new `useLiveQuery` calls in PathScreen (due count, activities). Revisit in Phase 5.
- **MatchPairs setTimeout cleanup**: deferred from Phase 3; unrelated to Phase 4.
- **Review session mid-session persistence**: if the user closes the app mid-review, grades are lost. Acceptable for single-user app; could add per-card persistence later.
- **Character page links from practice/review exercises**: currently only from LearnScreen WordCard. Could add links from exercise feedback later.
- **Review session concurrency with sync**: if a sync pulls updated card states while a review is in progress, the session's in-memory states are stale. Acceptable: single user, the end-of-session write uses `nextUpdatedAt` so LWW resolves correctly.
