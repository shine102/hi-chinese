# Sub-Lesson System — Design

Date: 2026-09-11
Status: draft

## 1. Goal

Break each unit's 12 words into 3-4 small lessons of 3-4 words each, so the
learner absorbs material in bite-sized chunks instead of all at once. Later
sub-lessons in the same unit review earlier sub-lesson words, reinforcing
retention within a single study session of 2-3 sub-lessons per day.

Modeled on HelloChinese's approach: each "lesson" (our unit) is split into
small sections, each introducing a few new words and reviewing prior ones.

## 2. Approach: runtime chunking

Sub-lessons are computed at runtime by chunking each unit's `wordIds` array
into groups of 4 (the last group may be 3-4). No changes to the content
pipeline, content types, or built JSON files. The existing word ordering
within units (by frequency) gives natural sub-lesson groupings.

A pure function `computeLessons(unit, words, grammar, sentences)` returns
an array of `Lesson` objects. Grammar and sentences attach to the sub-lesson
containing their latest referenced word.

### Why runtime over pipeline

- No content rebuild (1094 files untouched).
- No content type changes (no migration of authored JSON).
- Word order within units already follows a logical progression.
- If we later want manual sub-lesson assignment, we can add an optional
  `lessons` field to `Unit` and fall back to runtime chunking when absent.

## 3. Data model

### Lesson (runtime, not persisted)

```typescript
interface Lesson {
  /** 0-based index within the unit */
  index: number;
  /** Word IDs for this sub-lesson (3-4 items) */
  wordIds: string[];
  /** Grammar points whose latest sentence word falls in this or an earlier lesson */
  grammarIds: string[];
  /** Sentence IDs for grammar points assigned to this lesson */
  sentenceIds: string[];
  /** Word IDs from all previous lessons in this unit (for review) */
  reviewWordIds: string[];
}
```

### Lesson count

```
lessonCount = ceil(unit.wordIds.length / 4)
```

Most units have 12 words → 3 lessons of 4. Edge cases (l1-u42=14 → 4
lessons, l2-u63=6 → 2 lessons, l3-u79=17 → 5 lessons).

### UnitProgressRow changes

Add `lessonsCompleted: number` (default 0).

- `status === 'completed'` takes precedence — unit is done regardless of
  `lessonsCompleted` value (backward compat with existing completed units).
- `status === 'in-progress'` with `lessonsCompleted > 0` means partially done.
- When the last sub-lesson completes, `status` flips to `'completed'` and
  `lessonsCompleted` equals the total.

### D1 migration

```sql
ALTER TABLE unit_progress ADD COLUMN lessons_completed INTEGER NOT NULL DEFAULT 0;
```

Existing completed rows keep `lessons_completed = 0` but `status = 'completed'`
means they're treated as fully done. No data backfill needed.

### Dexie schema

Bump Dexie version to 2. Add `lessonsCompleted` to the `UnitProgressRow`
interface.

### Sync protocol

Add `lessonsCompleted` to the `UnitProgressRow` type in `@hi-chinese/content`.
The sync upsert and select queries include the new column. Old clients that
don't send it get `0` (the SQL default); new clients that receive a row
without it default to `0`.

## 4. Lesson flow

### Path screen

Each unit node shows sub-lesson progress. For in-progress units, display
"Lesson N/M" or a set of dots/indicators showing which sub-lessons are done.
Tapping a unit goes to the UnitScreen which now shows sub-lessons.

### UnitScreen (lesson picker)

Shows the unit title, sub-lesson list with completion state:
- Each sub-lesson shows its word count and "New words: X, Y, Z" preview.
- Completed sub-lessons have a checkmark.
- The next incomplete sub-lesson is highlighted as the primary action.
- A completed unit shows all sub-lessons as done with a "Practice again"
  option on each.

### Learn screen (scoped to sub-lesson)

Route: `/unit/$unitId/lesson/$lessonIdx/learn`

- **New words section**: only this sub-lesson's 3-4 words.
- **Review section** (lesson 2+): brief list of previous sub-lesson words
  (simplified + pinyin + meaning, no full WordCard).
- **Grammar section**: grammar points assigned to this sub-lesson.
- "Start practice" button links to the sub-lesson's practice.

### Practice session (scoped to sub-lesson)

Route: `/unit/$unitId/lesson/$lessonIdx/practice`

Session generation takes:
- `newWords`: this sub-lesson's 3-4 words
- `reviewWords`: words from previous sub-lessons in this unit
- `grammar`/`sentences`: scoped to this sub-lesson's assignments

Exercise mix (~10 exercises):
- All new words get at least one exercise each (MC, write-it, etc.)
- 2-3 review exercises for lesson 2+ (MC on prior sub-lesson words)
- Fill-blank and sentence-builder from this sub-lesson's grammar/sentences
- Match-pairs draws from new + review words combined
- 0-1 write-it exercise per sub-lesson
- Distractors still pull from full vocabulary up to this point

Session size: ~10 exercises (down from 15), adjustable:
`SESSION_SIZE = 8 + min(reviewWordIds.length, 3)`

### Completion

When a sub-lesson's practice ends:
1. Create review cards for this sub-lesson's words and characters only
   (not the full unit's).
2. Increment `lessonsCompleted` on the unit's progress row.
3. If `lessonsCompleted === lessonCount`, set `status = 'completed'` and
   `completedAt`.
4. Increment `activity.lessons` by 1 (each sub-lesson counts as a lesson).
5. Queue outbox entries and request sync.

### Review cards enter the deck sooner

Under the current system, all 12 words enter the review deck at once when
the unit is completed. With sub-lessons, each batch of 3-4 words enters
the review deck as soon as that sub-lesson is practiced. This is better
for spaced repetition — cards start aging while the learner works through
later sub-lessons in the same unit.

## 5. Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/unit/$unitId` | UnitScreen | Lesson picker (replaces current learn/practice buttons) |
| `/unit/$unitId/lesson/$lessonIdx/learn` | LearnScreen | Scoped learn for sub-lesson |
| `/unit/$unitId/lesson/$lessonIdx/practice` | PracticeScreen | Scoped practice for sub-lesson |

The old `/unit/$unitId/learn` and `/unit/$unitId/practice` routes are
removed. `$lessonIdx` is 0-based.

## 6. Exercise generation changes

The existing `generateSession` function is refactored to accept a
sub-lesson-scoped input:

```typescript
interface SessionInput {
  /** This sub-lesson's words */
  newWords: Word[];
  /** Words from prior sub-lessons (for review exercises) */
  reviewWords: Word[];
  /** Grammar scoped to this sub-lesson */
  grammar: GrammarPoint[];
  /** Sentences scoped to this sub-lesson */
  sentences: Sentence[];
  /** Full word map for distractor lookups */
  words: ReadonlyMap<string, Word>;
  /** Level word IDs for broader distractors */
  levelWordIds: readonly string[];
  /** Whether audio is available */
  audio: boolean;
}
```

The function generates exercises prioritizing new words (every new word
gets at least one exercise), adds review exercises from `reviewWords`,
and fills remaining slots with grammar exercises and listen-pick.

## 7. Unlock logic

`computeUnitStates` is unchanged — it operates on unit-level status.
The sub-lesson detail is shown within the UnitScreen and PathScreen
indicators but doesn't affect the unit locking/unlocking logic.

A unit is still unlocked when the previous unit is completed (all its
sub-lessons done).

## 8. Testing

- **Unit tests**: `computeLessons` pure function (word chunking, grammar
  assignment, edge cases for different word counts).
- **Unit tests**: exercise generation with sub-lesson-scoped input.
- **Unit tests**: `completeLesson` progress function (increments, card
  creation, unit completion on last lesson).
- **Unit tests**: UnitScreen lesson picker rendering.
- **E2E**: complete a unit by doing all sub-lessons in sequence, verify
  each sub-lesson creates its review cards, verify unit is completed
  after the last sub-lesson.
- **Migration test**: verify D1 migration adds the column correctly.

## 9. Decisions

- **Runtime chunking** over pipeline assignment — simpler, no content rebuild.
- **Chunk size 4** — gives 3 lessons for typical 12-word units, matches
  HelloChinese's 3-4 words per section.
- **`lessonsCompleted` integer** over separate lesson progress table —
  simpler, one field vs. new table + sync.
- **Old routes removed** — clean break, no backward compat needed for
  routes (client-only SPA).
- **Review exercises in later sub-lessons** — key UX feature from
  HelloChinese; 2-3 review exercises per session is enough for
  reinforcement without bloating the session.
