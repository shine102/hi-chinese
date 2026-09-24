# Lesson Sentence Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every lesson (4-word chunk) of every unit has at least one sentence, so every lesson gets a sentence-builder exercise.

**Architecture:** A pure helper `lessonSentenceCounts` (content package) mirrors the app's lesson chunking; a `lesson-gaps` script uses it on the built output to list empty lessons with their words and the vocabulary allowed so far. Six content batches add ~320 authored sentences (`s:lN:fill:NNN`) until the script reports zero gaps; the last batch adds a web data guard that runs the real `computeLessons` over the shipped content.

**Tech Stack:** TypeScript, tsx, vitest, pnpm monorepo (`packages/content`, `apps/web`).

**Spec:** `docs/superpowers/specs/2026-09-24-lesson-sentence-coverage-design.md`

## Global Constraints

- Before any pnpm command: `export PATH="$HOME/.npm-global/node_modules/.bin:$PATH"`.
- Source of truth is `packages/content/src/authored/`; never hand-edit `apps/web/public/content`. Regenerate with `pnpm content:build` (repo root). Stage output with `git add -f apps/web/public/content`.
- Commits: plain `git commit`, **no Co-Authored-By trailer**.
- Lesson = 4 consecutive words of `unit.wordIds` (`CHUNK_SIZE = 4` in `apps/web/src/lessons/compute.ts`); a sentence belongs to the lesson of its latest word from that unit (lesson 0 if none).
- A sentence belongs to the unit of its latest word across the whole course. So a sentence for lesson `k` of unit `U` must contain ≥1 word of lesson `k`, and may use only words from earlier units (any level) plus lessons `0..k` of `U`.
- New sentence ids: `s:l1:fill:NNN`, `s:l2:fill:NNN`, `s:l3:fill:NNN` (3 digits, contiguous from 001 per level, continuing across tasks), appended to the end of `packages/content/src/authored/sentences/level{1,2,3}.json` by the level of the target unit.
- Sentence fields: `id`, `zh`, `pinyin`, `vi`, `words`. `words` tokens are course words (exact `simplified` of a word in `words.json`) and concatenate to exactly the Han characters of `zh`. A multi-character course word must be one token (学生, not 学+生).
- `pinyin`: tone marks, spaced by word, 不/一 sandhi (不是 → bú shì, 一个 → yí ge), 个 → "ge", aspect particles 了/着/过 and directional complements neutral, capitalized first letter and proper nouns — same conventions as `s:l1:core:*`. `vi` natural Vietnamese, not word-by-word.
- Short: usually 4-10 characters at L1, ≤15 at L2/L3; natural, fits the unit theme. One sentence per empty lesson is enough.
- Do **not** touch `packages/content/src/authored/grammar/` or any unit file; new sentences are never added to grammar `examples`.
- New content is AI-authored → native-speaker review before any deploy; do not push or deploy.

## Review Focus

1. A compound lesson word split into characters (学+生) makes the sentence miss the lesson word and land elsewhere → each content task's Step 4 re-runs `lesson-gaps` (scope must show 0 empty) and the reviewer checks tokens against the word list.
2. A sentence using a word from a later lesson of the same unit lands in that later lesson, leaving the target empty → same `lesson-gaps` re-run; Task 1 test "counts a sentence in the lesson of its latest unit word".
3. Units whose word count is not a multiple of 4 (last lesson has 1-3 words) and sentences with no unit word → Task 1 tests for 5-word units and "no unit word → lesson 0".
4. A batch silently editing grammar `examples` would shift grammar placement → each content task's Step 5 asserts `git diff --stat BASE -- packages/content/src/authored/grammar packages/content/src/authored/units` is empty.
5. The script's chunking drifting from the app's → Task 7 guard uses the real `computeLessons`, not the helper.

---

### Task 1: `lessonSentenceCounts` + `lesson-gaps` script

**Files:**
- Create: `packages/content/src/pipeline/lesson-gaps.ts`
- Create: `packages/content/scripts/lesson-gaps.ts`
- Modify: `packages/content/package.json` (scripts)
- Test: `packages/content/test/lesson-gaps.test.ts`

**Interfaces:**
- Produces: `LESSON_SIZE = 4`; `lessonSentenceCounts(wordIds: readonly string[], sentences: readonly { wordIds: readonly string[] }[]): number[]`; CLI `pnpm -F @hi-chinese/content lesson-gaps --level <1|2|3> [--from <unitId>] [--to <unitId>]` whose last line is `Empty lessons in scope (<from>..<to>): <N>` and which marks empty lessons with `[EMPTY]`.

- [ ] **Step 1: Write the failing test**

`packages/content/test/lesson-gaps.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { lessonSentenceCounts } from '../src/pipeline/lesson-gaps.js';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `w:${i}`);

describe('lessonSentenceCounts', () => {
  it('returns one zero per lesson when there are no sentences', () => {
    expect(lessonSentenceCounts(ids(12), [])).toEqual([0, 0, 0]);
  });

  it('counts a sentence in the lesson of its latest unit word', () => {
    const counts = lessonSentenceCounts(ids(12), [
      { wordIds: ['w:0', 'w:9'] },
      { wordIds: ['w:5', 'w:1'] },
      { wordIds: ['w:3'] },
    ]);
    expect(counts).toEqual([1, 1, 1]);
  });

  it('puts a sentence with no word of the unit in lesson 0', () => {
    expect(lessonSentenceCounts(ids(8), [{ wordIds: ['w:other'] }])).toEqual([1, 0]);
  });

  it('gives a short last lesson its own slot', () => {
    expect(lessonSentenceCounts(ids(5), [{ wordIds: ['w:4'] }])).toEqual([0, 1]);
  });

  it('treats an empty unit as one lesson', () => {
    expect(lessonSentenceCounts([], [])).toEqual([0]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="$HOME/.npm-global/node_modules/.bin:$PATH"; pnpm -F @hi-chinese/content test -- lesson-gaps`
Expected: FAIL — cannot resolve `../src/pipeline/lesson-gaps.js`.

- [ ] **Step 3: Implement the helper**

`packages/content/src/pipeline/lesson-gaps.ts`:

```ts
// Mirrors CHUNK_SIZE and sentence placement in apps/web/src/lessons/compute.ts.
// Authoring tool only; the web data guard runs the real computeLessons.
export const LESSON_SIZE = 4;

export function lessonSentenceCounts(
  wordIds: readonly string[],
  sentences: readonly { wordIds: readonly string[] }[],
): number[] {
  const total = Math.max(1, Math.ceil(wordIds.length / LESSON_SIZE));
  const lessonOf = new Map(wordIds.map((w, i) => [w, Math.floor(i / LESSON_SIZE)] as const));
  const counts = Array<number>(total).fill(0);
  for (const s of sentences) {
    let latest = 0;
    for (const w of s.wordIds) {
      const li = lessonOf.get(w);
      if (li !== undefined && li > latest) latest = li;
    }
    counts[latest]!++;
  }
  return counts;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F @hi-chinese/content test -- lesson-gaps`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the script**

`packages/content/scripts/lesson-gaps.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LESSON_SIZE, lessonSentenceCounts } from '../src/pipeline/lesson-gaps.js';
import type { Sentence, Unit, Word } from '../src/types.js';

// Lists lessons with no sentence in the built content, with each lesson's words
// and the vocabulary a new sentence may use. Authoring aid; not part of the build.

const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../../../apps/web/public/content');
const readJson = async <T>(p: string): Promise<T> => JSON.parse(await readFile(p, 'utf8')) as T;

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const usage = 'Usage: lesson-gaps --level <1|2|3> [--from <unitId>] [--to <unitId>]';

const level = Number(arg('level'));
if (![1, 2, 3].includes(level)) {
  console.error(usage);
  process.exit(1);
}

const manifest = await readJson<{ levels: { level: number; unitIds: string[] }[] }>(
  resolve(content, 'manifest.json'),
);
const words = await readJson<Word[]>(resolve(content, 'words.json'));
const wordById = new Map(words.map((w) => [w.id, w]));
const levels = [...manifest.levels].sort((a, b) => a.level - b.level);
const allUnitIds = levels.flatMap((l) => l.unitIds);
const levelUnitIds = levels.find((l) => l.level === level)!.unitIds;

const from = arg('from') ?? levelUnitIds[0]!;
const to = arg('to') ?? levelUnitIds[levelUnitIds.length - 1]!;
const start = levelUnitIds.indexOf(from);
const end = levelUnitIds.indexOf(to);
if (start < 0 || end < start) {
  console.error(`${usage}\n--from/--to must be unit ids of level ${level}, in order.`);
  process.exit(1);
}
const scope = levelUnitIds.slice(start, end + 1);

const readChunk = (uid: string) =>
  readJson<{ unit: Unit; sentences: Sentence[] }>(resolve(content, 'units', `${uid}.json`));
const zh = (wid: string) => wordById.get(wid)?.simplified ?? wid;

const before: string[] = [];
for (const uid of allUnitIds.slice(0, allUnitIds.indexOf(scope[0]!))) {
  before.push(...(await readChunk(uid)).unit.wordIds.map(zh));
}
console.log(`# Vocabulary before ${scope[0]} (${before.length} words)`);
console.log(before.join(' '));
console.log('\nA sentence for lesson k may also use the words of lessons 0..k of its unit.');

let empty = 0;
for (const uid of scope) {
  const { unit, sentences } = await readChunk(uid);
  const counts = lessonSentenceCounts(unit.wordIds, sentences);
  console.log(`\n## ${unit.id} — ${unit.title}`);
  counts.forEach((count, li) => {
    if (count === 0) empty++;
    console.log(`Lesson ${li} (${count} sentences)${count === 0 ? '  [EMPTY]' : ''}`);
    for (const wid of unit.wordIds.slice(li * LESSON_SIZE, (li + 1) * LESSON_SIZE)) {
      const w = wordById.get(wid);
      console.log(w ? `  ${w.simplified}\t${w.pinyin}\t${w.meanings.slice(0, 2).join('; ')}` : `  ${wid}`);
    }
  });
}
console.log(`\nEmpty lessons in scope (${scope[0]}..${scope[scope.length - 1]}): ${empty}`);
```

Add to `packages/content/package.json` `scripts`, after `"vocab-context"`:

```json
    "lesson-gaps": "tsx scripts/lesson-gaps.ts"
```

(Remember the comma after the `vocab-context` line.)

- [ ] **Step 6: Run the script and check the baseline**

Run:
```bash
pnpm -F @hi-chinese/content lesson-gaps --level 1 | tail -1
pnpm -F @hi-chinese/content lesson-gaps --level 2 | tail -1
pnpm -F @hi-chinese/content lesson-gaps --level 3 | tail -1
pnpm -F @hi-chinese/content lesson-gaps --level 2 --from l2-u01 --to l2-u25 | tail -1
```
Expected: `... (l1-u01..l1-u42): 35`, `... (l2-u01..l2-u64): 111`, `... (l3-u01..l3-u78): 174`, `... (l2-u01..l2-u25): 51`.
Also check `pnpm -F @hi-chinese/content lesson-gaps --level 4` prints the usage and exits 1, and `pnpm -F @hi-chinese/content typecheck` passes.

- [ ] **Step 7: Commit**

```bash
git add packages/content/src/pipeline/lesson-gaps.ts packages/content/scripts/lesson-gaps.ts packages/content/package.json packages/content/test/lesson-gaps.test.ts
git commit -m "feat(content): add lesson-gaps authoring script"
```

---

### Content task procedure (Tasks 2-7)

Each content task follows these steps for its **scope** (level + `--from`/`--to`) and **id prefix**. BASE is the commit before the task.

- [ ] **Step 1: List the gaps**

```bash
export PATH="$HOME/.npm-global/node_modules/.bin:$PATH"
pnpm -F @hi-chinese/content lesson-gaps --level <L> --from <FROM> --to <TO> > <scratch>/gaps.txt
tail -1 <scratch>/gaps.txt
```
Expected count: the task's table value. Find the last existing `s:l<L>:fill:NNN` id (`grep -o 's:l<L>:fill:[0-9]*' packages/content/src/authored/sentences/level<L>.json | tail -1`); continue numbering from it (start at 001 if none).

- [ ] **Step 2: Write one sentence per `[EMPTY]` lesson**

For each `[EMPTY]` lesson `k` of unit `U`: pick one of lesson `k`'s words (prefer one not used by any existing sentence of `U`) and write a sentence that uses it, plus only words from "Vocabulary before" + units earlier in the scope + lessons `0..k` of `U`. Follow every sentence rule in Global Constraints. Example shape:

```json
{ "id": "s:l2:fill:001", "zh": "我家有一只小猫。", "pinyin": "Wǒ jiā yǒu yì zhī xiǎo māo.", "vi": "Nhà tôi có một con mèo nhỏ.", "words": ["我", "家", "有", "一", "只", "小", "猫"] }
```

Append all new sentences to the end of `packages/content/src/authored/sentences/level<L>.json` (keep the file's existing formatting: 2-space JSON array).

- [ ] **Step 3: Build**

Run: `pnpm content:build` (repo root).
Expected: build succeeds with 0 placement/validate problems and 0 curriculum-order violations. On `[placement:unknown-token]`, a token is not a course word — replace the word or retokenize.

- [ ] **Step 4: Verify the gaps are closed**

```bash
pnpm -F @hi-chinese/content lesson-gaps --level <L> --from <FROM> --to <TO> | tail -1
```
Expected: `Empty lessons in scope (<FROM>..<TO>): 0`. If not, open the output, find the remaining `[EMPTY]` lessons, and fix the sentences meant for them (usually a later-lesson word or a split compound), then repeat Steps 3-4.

- [ ] **Step 5: Check nothing else moved**

```bash
git diff --stat BASE -- packages/content/src/authored/grammar packages/content/src/authored/units
```
Expected: empty output.

Run: `pnpm -F @hi-chinese/content test`
Expected: all pass (incl. `core-grammar-data.test.ts`).

- [ ] **Step 6: Commit**

```bash
git add packages/content/src/authored/sentences/level<L>.json
git add -f apps/web/public/content
git commit -m "feat(content): add sentences for empty lessons in <scope>"
```

---

### Task 2: L1 sentences

Scope: `--level 1` (l1-u01..l1-u42). Id prefix `s:l1:fill:`. Expected gaps at Step 1: **35**. Follow the "Content task procedure (Tasks 2-7)" section (part of this task's requirements).

### Task 3: L2 u01-u25 sentences

Scope: `--level 2 --from l2-u01 --to l2-u25`. Id prefix `s:l2:fill:` (starts at 001). Expected gaps: **51**. Follow the "Content task procedure (Tasks 2-7)" section (part of this task's requirements).

### Task 4: L2 u26-u64 sentences

Scope: `--level 2 --from l2-u26 --to l2-u64`. Id prefix `s:l2:fill:` (continues after Task 3). Expected gaps: **60**. Follow the "Content task procedure (Tasks 2-7)" section (part of this task's requirements). After Step 4, also run `lesson-gaps --level 2 | tail -1` → `0`.

### Task 5: L3 u01-u29 sentences

Scope: `--level 3 --from l3-u01 --to l3-u29`. Id prefix `s:l3:fill:` (starts at 001). Expected gaps: **55**. Follow the "Content task procedure (Tasks 2-7)" section (part of this task's requirements).

### Task 6: L3 u30-u52 sentences

Scope: `--level 3 --from l3-u30 --to l3-u52`. Id prefix `s:l3:fill:` (continues after Task 5). Expected gaps: **58**. Follow the "Content task procedure (Tasks 2-7)" section (part of this task's requirements).

### Task 7: L3 u53-u78 sentences + web data guard

Scope: `--level 3 --from l3-u53 --to l3-u78`. Id prefix `s:l3:fill:` (continues after Task 6). Expected gaps: **61**. Follow the "Content task procedure (Tasks 2-7)" section (part of this task's requirements) Steps 1-5, then:

**Files:**
- Create: `apps/web/test/content/lesson-coverage-data.test.ts`

- [ ] **Step 6: Confirm zero gaps course-wide**

```bash
for L in 1 2 3; do pnpm -F @hi-chinese/content lesson-gaps --level $L | tail -1; done
```
Expected: all three end with `: 0`.

- [ ] **Step 7: Write the guard**

`apps/web/test/content/lesson-coverage-data.test.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GrammarPoint, Sentence, Unit } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';
import { computeLessons } from '../../src/lessons/compute.js';

// Spec 2026-09-24-lesson-sentence-coverage-design.md: every lesson has a sentence,
// so every lesson gets a sentence-builder exercise. Reads the shipped content.
const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../../public/content');
const readJson = async <T>(p: string): Promise<T> => JSON.parse(await readFile(p, 'utf8')) as T;

describe('shipped content lesson coverage', () => {
  it('gives every lesson of every unit at least one sentence', async () => {
    const manifest = await readJson<{ levels: { unitIds: string[] }[] }>(
      resolve(content, 'manifest.json'),
    );
    const unitIds = manifest.levels.flatMap((l) => l.unitIds);
    const empty: string[] = [];
    for (const uid of unitIds) {
      const chunk = await readJson<{ unit: Unit; grammar: GrammarPoint[]; sentences: Sentence[] }>(
        resolve(content, 'units', `${uid}.json`),
      );
      for (const lesson of computeLessons(chunk.unit, chunk.grammar, chunk.sentences)) {
        if (lesson.sentenceIds.length === 0) empty.push(`${uid}#${lesson.index}`);
      }
    }
    expect(unitIds.length).toBeGreaterThan(100);
    expect(empty).toEqual([]);
  });
});
```

- [ ] **Step 8: Run the guard**

Run: `pnpm -F @hi-chinese/web test -- lesson-coverage`
Expected: PASS. (To see it bite, temporarily check out `apps/web/public/content` from BASE of Task 2 — not required.)

- [ ] **Step 9: Full test suite**

Run: `pnpm test` (repo root).
Expected: content, web, worker all pass. (CharacterPage / shell tests can time out under load; rerun once before treating as a failure.)

- [ ] **Step 10: Commit**

```bash
git add packages/content/src/authored/sentences/level3.json apps/web/test/content/lesson-coverage-data.test.ts
git add -f apps/web/public/content
git commit -m "feat(content): add sentences for empty lessons in l3-u53..u78 + lesson coverage guard"
```
