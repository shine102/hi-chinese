# Sentence Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every lesson has ≥2 sentences of ≥3 words, and every course word appears in a sentence or in a reasoned allowlist.

**Architecture:** Task 1 extends the `lesson-gaps` authoring tool and adds two data guards gated by a `LEVELS_DONE` constant. Tasks 2-10 author sentences level by level (L1 → L2 → L3) over unit ranges; the task that finishes a level adds it to `LEVELS_DONE`.

**Tech Stack:** TypeScript, tsx, Vitest, pnpm workspace (`packages/content`, `apps/web`).

**Spec:** `docs/superpowers/specs/2026-09-24-sentence-expansion-design.md`

## Global Constraints

- pnpm is not on PATH: prefix shell work with `export PATH="$HOME/.npm-global/node_modules/.bin:$PATH"`.
- Commits: plain `git commit`, no `Co-Authored-By` trailer.
- A "builder sentence" has ≥3 words (`wordIds.length >= 3`).
- A sentence for lesson k of unit u uses only words of earlier units (all levels, course order) and lessons 0..k of u.
- Each new sentence contains ≥1 word of its lesson that has no sentence yet, while the lesson has such words.
- Length 3 to 8 tokens. Tokens are course words (`words.json` simplified forms).
- Pinyin follows the conventions of `packages/content/src/pipeline/sentence-pinyin.ts` (不/一 sandhi, 2-syllable token joined except 不太/有人, 了/着/过 written separately, 这个/那个/哪个 joined, 们 joined).
- Ids continue the fill series: `s:l1:fill:045…`, `s:l2:fill:205…`, `s:l3:fill:280…`, in the level file of the unit the sentence is written for.
- Vary sentence frames within a unit; a run of "我有X。"/"这是X。" is a defect.
- Allowlist `packages/content/src/authored/uncovered-words.json` stays under 2% of course words (< 44); every entry has a reason.
- Existing sentences are not rewritten except to fix an error found while writing; such fixes are logged in the review list.
- Build output `apps/web/public/content` is tracked; commit it with the authored change.

## Review Focus

1. A new sentence uses a word from a later lesson of the same unit, so it lands in the wrong lesson → the task re-runs `lesson-gaps` after the build and expects 0 lessons below min in its range.
2. A polyphone token reads differently in the sentence than its course reading (长 cháng/zhǎng, 只 zhǐ/zhī, 还 hái/huán, 得 de/děi) → the task reviewer checks each sentence's pinyin against `words.json`; the pinyin checker catches tone mismatches only when the reading exists.
3. Sentence ids collide across tasks of the same level → `pnpm content:build` fails on `unique-id`; each task starts its ids after the highest existing fill id.
4. A sentence shorter than 3 tokens fills the "sentence" count but not the builder count → the ≥2 builder guard counts only `wordIds.length >= 3`.
5. The allowlist grows into an escape hatch → the guard fails at ≥44 entries and on any allowlisted word that is actually covered.

---

### Task 1: Tooling and guards

**Files:**
- Modify: `packages/content/src/pipeline/lesson-gaps.ts`
- Modify: `packages/content/test/lesson-gaps.test.ts`
- Modify: `packages/content/scripts/lesson-gaps.ts`
- Create: `packages/content/src/authored/uncovered-words.json`
- Create: `apps/web/test/content/levels-done.ts`
- Modify: `apps/web/test/content/lesson-coverage-data.test.ts`
- Create: `apps/web/test/content/word-coverage-data.test.ts`
- Create: `docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md`

**Interfaces:**
- Produces: `lessonSentenceCounts(wordIds, sentences, minWords = 1): number[]`; `uncoveredWords(wordIds, sentences): string[]`; CLI `lesson-gaps --level N [--from] [--to] [--min n]` whose last two lines are `Lessons below <n> builder sentences in scope (<from>..<to>): <x>` and `Uncovered words in scope: <y> (allowlisted: <z>)`; `LEVELS_DONE: readonly number[]` exported from `apps/web/test/content/levels-done.ts`.

- [ ] **Step 1: Write the failing unit tests**

Append to `packages/content/test/lesson-gaps.test.ts` (and change the import line to `import { lessonSentenceCounts, uncoveredWords } from '../src/pipeline/lesson-gaps.js';`):

```ts
describe('lessonSentenceCounts with minWords', () => {
  it('counts only sentences with at least minWords words', () => {
    const counts = lessonSentenceCounts(
      ids(8),
      [
        { wordIds: ['w:0', 'w:1'] },
        { wordIds: ['w:0', 'w:1', 'w:2'] },
        { wordIds: ['w:4', 'w:5', 'w:6', 'w:7'] },
      ],
      3,
    );
    expect(counts).toEqual([1, 1]);
  });
});

describe('uncoveredWords', () => {
  it('returns the unit words absent from every sentence, in unit order', () => {
    expect(
      uncoveredWords(ids(5), [{ wordIds: ['w:1', 'w:x'] }, { wordIds: ['w:3'] }]),
    ).toEqual(['w:0', 'w:2', 'w:4']);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm -F @hi-chinese/content exec vitest run test/lesson-gaps.test.ts`
Expected: FAIL — `uncoveredWords` is not exported, and the minWords test gets `[2, 1]`.

- [ ] **Step 3: Implement**

Replace `packages/content/src/pipeline/lesson-gaps.ts` with:

```ts
// Mirrors CHUNK_SIZE and sentence placement in apps/web/src/lessons/compute.ts.
// Authoring tool only; the web data guards run the real computeLessons.
export const LESSON_SIZE = 4;

// Sentences per lesson, counting only sentences with at least minWords words.
export function lessonSentenceCounts(
  wordIds: readonly string[],
  sentences: readonly { wordIds: readonly string[] }[],
  minWords = 1,
): number[] {
  const total = Math.max(1, Math.ceil(wordIds.length / LESSON_SIZE));
  const lessonOf = new Map(wordIds.map((w, i) => [w, Math.floor(i / LESSON_SIZE)] as const));
  const counts = Array<number>(total).fill(0);
  for (const s of sentences) {
    if (s.wordIds.length < minWords) continue;
    let latest = 0;
    for (const w of s.wordIds) {
      const li = lessonOf.get(w);
      if (li !== undefined && li > latest) latest = li;
    }
    counts[latest]!++;
  }
  return counts;
}

// Words of wordIds that no sentence uses.
export function uncoveredWords(
  wordIds: readonly string[],
  sentences: readonly { wordIds: readonly string[] }[],
): string[] {
  const used = new Set(sentences.flatMap((s) => s.wordIds));
  return wordIds.filter((w) => !used.has(w));
}
```

- [ ] **Step 4: Run the unit tests**

Run: `pnpm -F @hi-chinese/content exec vitest run test/lesson-gaps.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Update the CLI**

In `packages/content/scripts/lesson-gaps.ts`:

1. Import line becomes `import { LESSON_SIZE, lessonSentenceCounts, uncoveredWords } from '../src/pipeline/lesson-gaps.js';`
2. Usage string becomes `'Usage: lesson-gaps --level <1|2|3> [--from <unitId>] [--to <unitId>] [--min <n>]'`.
3. After the `level` check add:

```ts
const min = Number(arg('min') ?? '1');
if (!Number.isInteger(min) || min < 1) {
  console.error(usage);
  process.exit(1);
}
const allow = await readJson<Record<string, string>>(
  resolve(here, '../src/authored/uncovered-words.json'),
);
```

4. After `const zh = …` add a load of every sentence in the course:

```ts
const allSentences: Sentence[] = [];
for (const uid of allUnitIds) allSentences.push(...(await readChunk(uid)).sentences);
const uncovered = new Set(uncoveredWords(words.map((w) => w.id), allSentences));
```

5. Replace everything from `let empty = 0;` to the end of the file with:

```ts
let below = 0;
let open = 0;
let allowed = 0;
for (const uid of scope) {
  const { unit, sentences } = await readChunk(uid);
  const counts = lessonSentenceCounts(unit.wordIds, sentences, 3);
  console.log(`\n## ${unit.id} — ${unit.title}`);
  counts.forEach((count, li) => {
    if (count < min) below++;
    console.log(`Lesson ${li} (${count} builder sentences)${count < min ? '  [BELOW MIN]' : ''}`);
    for (const wid of unit.wordIds.slice(li * LESSON_SIZE, (li + 1) * LESSON_SIZE)) {
      const w = wordById.get(wid);
      let mark = '';
      if (uncovered.has(wid)) {
        if (w && allow[w.simplified] !== undefined) {
          allowed++;
          mark = '\t[allowlisted]';
        } else {
          open++;
          mark = '\t[no sentence]';
        }
      }
      console.log(
        w
          ? `  ${w.simplified}\t${w.pinyin}\t${w.meanings.slice(0, 2).join('; ')}${mark}`
          : `  ${wid}${mark}`,
      );
    }
  });
}
console.log(
  `\nLessons below ${min} builder sentences in scope (${scope[0]}..${scope[scope.length - 1]}): ${below}`,
);
console.log(`Uncovered words in scope: ${open} (allowlisted: ${allowed})`);
```

Create `packages/content/src/authored/uncovered-words.json` with content `{}` and a trailing newline.

- [ ] **Step 6: Run the CLI**

Run: `pnpm -F @hi-chinese/content lesson-gaps --level 1 --min 2 | tail -2`
Expected: `Lessons below 2 builder sentences in scope (l1-u01..l1-u42): 69` and `Uncovered words in scope: 88 (allowlisted: 0)`.

- [ ] **Step 7: Write the guards**

Create `apps/web/test/content/levels-done.ts`:

```ts
// Levels whose sentence expansion is finished (spec 2026-09-24-sentence-expansion-design.md).
// The ≥2 builder-sentence and word-coverage guards apply to these levels only.
export const LEVELS_DONE: readonly number[] = [];
```

In `apps/web/test/content/lesson-coverage-data.test.ts` add `import { LEVELS_DONE } from './levels-done.js';` and, inside the `describe`, after the existing `it`:

```ts
  it('gives every lesson of a finished level two sentences of 3+ words', async () => {
    const manifest = await readJson<{ levels: { level: number; unitIds: string[] }[] }>(
      resolve(content, 'manifest.json'),
    );
    const short: string[] = [];
    for (const l of manifest.levels.filter((x) => LEVELS_DONE.includes(x.level))) {
      for (const uid of l.unitIds) {
        const chunk = await readJson<{ unit: Unit; grammar: GrammarPoint[]; sentences: Sentence[] }>(
          resolve(content, 'units', `${uid}.json`),
        );
        const byId = new Map(chunk.sentences.map((s) => [s.id, s]));
        for (const lesson of computeLessons(chunk.unit, chunk.grammar, chunk.sentences)) {
          const n = lesson.sentenceIds.filter((id) => (byId.get(id)?.wordIds.length ?? 0) >= 3).length;
          if (n < 2) short.push(`${uid}#${lesson.index}:${n}`);
        }
      }
    }
    expect(short).toEqual([]);
  });
```

Create `apps/web/test/content/word-coverage-data.test.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Sentence, Unit, Word } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';
import { LEVELS_DONE } from './levels-done.js';

// Spec 2026-09-24-sentence-expansion-design.md: every word of a finished level is
// in some sentence, or in the allowlist with a reason. Reads the shipped content.
const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../../public/content');
const allowPath = resolve(here, '../../../../packages/content/src/authored/uncovered-words.json');
const readJson = async <T>(p: string): Promise<T> => JSON.parse(await readFile(p, 'utf8')) as T;

const load = async () => {
  const manifest = await readJson<{ levels: { level: number; unitIds: string[] }[] }>(
    resolve(content, 'manifest.json'),
  );
  const words = await readJson<Word[]>(resolve(content, 'words.json'));
  const allow = await readJson<Record<string, string>>(allowPath);
  const units = new Map<string, { unit: Unit; sentences: Sentence[] }>();
  for (const uid of manifest.levels.flatMap((l) => l.unitIds))
    units.set(uid, await readJson(resolve(content, 'units', `${uid}.json`)));
  const used = new Set([...units.values()].flatMap((c) => c.sentences.flatMap((s) => s.wordIds)));
  return { manifest, words, allow, units, used };
};

describe('shipped content word coverage', () => {
  it('puts every word of a finished level in a sentence or the allowlist', async () => {
    const { manifest, words, allow, units, used } = await load();
    const zh = new Map(words.map((w) => [w.id, w.simplified]));
    const missing = manifest.levels
      .filter((l) => LEVELS_DONE.includes(l.level))
      .flatMap((l) => l.unitIds.flatMap((uid) => units.get(uid)!.unit.wordIds))
      .filter((wid) => !used.has(wid) && allow[zh.get(wid)!] === undefined)
      .map((wid) => zh.get(wid) ?? wid);
    expect(missing).toEqual([]);
  });

  it('keeps the allowlist small, reasoned and limited to uncovered course words', async () => {
    const { words, allow, used } = await load();
    const bySimplified = new Map(words.map((w) => [w.simplified, w]));
    const entries = Object.entries(allow);
    expect(entries.filter(([zh]) => !bySimplified.has(zh)).map(([zh]) => zh)).toEqual([]);
    expect(entries.filter(([zh]) => used.has(bySimplified.get(zh)?.id ?? '')).map(([zh]) => zh)).toEqual([]);
    expect(entries.filter(([, why]) => why.trim() === '').map(([zh]) => zh)).toEqual([]);
    expect(entries.length).toBeLessThan(0.02 * words.length);
  });
});
```

- [ ] **Step 8: Watch the new guards fail on real data**

Temporarily set `LEVELS_DONE` to `[1]`.
Run: `pnpm -F @hi-chinese/web exec vitest run test/content/lesson-coverage-data.test.ts test/content/word-coverage-data.test.ts`
Expected: FAIL — the builder test lists 69 short lessons of L1, the coverage test lists 88 L1 words.
Set `LEVELS_DONE` back to `[]`, run the same command.
Expected: PASS, 4 tests.

- [ ] **Step 9: Create the review list**

Create `docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md`:

```markdown
# Sentence expansion — native-speaker review list

Spec: `2026-09-24-sentence-expansion-design.md`. AI-written. Mark a row in the last
column when a sentence is unnatural, mistranslated, or misread.

## Uncovered-word allowlist

| Word | Reason | Note |
|---|---|---|

## Existing sentences fixed while writing

| Id | Before → after | Note |
|---|---|---|

## L1

| Id | Chinese | Pinyin | Vietnamese | Note |
|---|---|---|---|---|

## L2

| Id | Chinese | Pinyin | Vietnamese | Note |
|---|---|---|---|---|

## L3

| Id | Chinese | Pinyin | Vietnamese | Note |
|---|---|---|---|---|
```

- [ ] **Step 10: Full suite and commit**

Run: `pnpm test`
Expected: all packages pass (content 235, web 154, worker 43).

```bash
git add packages/content apps/web/test/content docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md
git commit -m "feat(content): lesson-gaps reports builder sentences and uncovered words; coverage guards"
```

---

### Task 2: L1 sentences, units l1-u01..l1-u21

**Files:**
- Modify: `packages/content/src/authored/sentences/level1.json` (append)
- Modify: `packages/content/src/authored/uncovered-words.json` (only if a word truly cannot be covered)
- Modify: `apps/web/public/content/**` (rebuilt)
- Modify: `docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md` (L1 section)

**Interfaces:**
- Consumes: `lesson-gaps --min 2` from Task 1.
- Produces: sentences `s:l1:fill:045` upward; the next task starts after the highest id this task writes.

- [ ] **Step 1: List the gaps**

Run: `pnpm -F @hi-chinese/content lesson-gaps --level 1 --from l1-u01 --to l1-u21 --min 2 > <workspace>/gaps-l1-a.txt` and read it.
Expected: last lines report the lessons below 2 and the uncovered words for this range (non-zero).

- [ ] **Step 2: Write the sentences**

For every `[BELOW MIN]` lesson and every lesson with a `[no sentence]` word, append sentence objects to `packages/content/src/authored/sentences/level1.json`, in the existing shape:

```json
  {
    "id": "s:l1:fill:045",
    "zh": "我妈妈喜欢喝茶。",
    "pinyin": "Wǒ māma xǐhuan hē chá.",
    "vi": "Mẹ tôi thích uống trà.",
    "words": ["我", "妈妈", "喜欢", "喝", "茶"]
  }
```

Follow every Global Constraint on vocabulary, coverage, length, pinyin, ids and variety. Keep writing for a lesson until it has ≥2 builder sentences and no `[no sentence]` word. Only a word that cannot appear in a natural sentence with the vocabulary available, or an 儿化 variant whose base form is covered, goes to `uncovered-words.json` with a reason.

- [ ] **Step 3: Rebuild**

Run: `pnpm content:build`
Expected: exit 0, no problems reported.

- [ ] **Step 4: Re-check the range**

Run: `pnpm -F @hi-chinese/content lesson-gaps --level 1 --from l1-u01 --to l1-u21 --min 2 | tail -2`
Expected: `Lessons below 2 builder sentences in scope (l1-u01..l1-u21): 0` and `Uncovered words in scope: 0 (allowlisted: <n>)`.
If not 0, a sentence landed in another lesson (it used a later word) or missed a word; fix and repeat Steps 3-4.

- [ ] **Step 5: Pinyin guard and full suite**

Run: `pnpm -F @hi-chinese/content exec vitest run test/sentence-pinyin-data.test.ts` then `pnpm test`
Expected: PASS for both.

- [ ] **Step 6: Review list**

Append one row per new sentence to the `## L1` table (`| id | zh | pinyin | vi |  |`), each allowlisted word to the allowlist table, and each fixed existing sentence to the fixes table.

- [ ] **Step 7: Commit**

```bash
git add packages/content/src/authored apps/web/public/content docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md
git commit -m "feat(content): L1 sentences for l1-u01..u21 (two per lesson, word coverage)"
```

---

### Task 3: L1 sentences, units l1-u22..l1-u42; L1 done

**Files:**
- Modify: `packages/content/src/authored/sentences/level1.json` (append)
- Modify: `packages/content/src/authored/uncovered-words.json` (only if a word truly cannot be covered)
- Modify: `apps/web/public/content/**` (rebuilt)
- Modify: `apps/web/test/content/levels-done.ts`
- Modify: `docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md` (L1 section)

**Interfaces:**
- Consumes: `lesson-gaps --min 2`; ids continue after the highest `s:l1:fill:` id from Task 2.
- Produces: `LEVELS_DONE = [1]`.

- [ ] **Step 1: List the gaps**

Run: `pnpm -F @hi-chinese/content lesson-gaps --level 1 --from l1-u22 --to l1-u42 --min 2 > <workspace>/gaps-l1-b.txt` and read it.
Expected: non-zero lessons below 2 / uncovered words for this range.

- [ ] **Step 2: Write the sentences**

Append sentence objects to `packages/content/src/authored/sentences/level1.json` in the shape `{ "id", "zh", "pinyin", "vi", "words" }`, ids continuing the `s:l1:fill:` series. For every `[BELOW MIN]` lesson and every lesson with a `[no sentence]` word, write until the lesson has ≥2 builder sentences and no uncovered word. Follow every Global Constraint. Allowlist only per the spec's reasons.

- [ ] **Step 3: Rebuild**

Run: `pnpm content:build`
Expected: exit 0, no problems.

- [ ] **Step 4: Re-check the whole level**

Run: `pnpm -F @hi-chinese/content lesson-gaps --level 1 --min 2 | tail -2`
Expected: `Lessons below 2 builder sentences in scope (l1-u01..l1-u42): 0` and `Uncovered words in scope: 0 (allowlisted: <n>)`.

- [ ] **Step 5: Turn on the L1 guards**

Set `LEVELS_DONE` in `apps/web/test/content/levels-done.ts` to `[1]`.
Run: `pnpm -F @hi-chinese/content exec vitest run test/sentence-pinyin-data.test.ts` then `pnpm test`
Expected: PASS for both.

- [ ] **Step 6: Review list**

Append one row per new sentence to the `## L1` table, allowlisted words to the allowlist table, fixed existing sentences to the fixes table.

- [ ] **Step 7: Commit**

```bash
git add packages/content/src/authored apps/web/public/content apps/web/test/content/levels-done.ts docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md
git commit -m "feat(content): L1 sentences for l1-u22..u42; L1 coverage guards on"
```

---

### Task 4: L2 sentences, units l2-u01..l2-u20

**Files:**
- Modify: `packages/content/src/authored/sentences/level2.json` (append)
- Modify: `packages/content/src/authored/uncovered-words.json` (only if a word truly cannot be covered)
- Modify: `apps/web/public/content/**` (rebuilt)
- Modify: `docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md` (L2 section)

**Interfaces:**
- Consumes: `lesson-gaps --min 2`.
- Produces: sentences `s:l2:fill:205` upward.

- [ ] **Step 1: List the gaps**

Run: `pnpm -F @hi-chinese/content lesson-gaps --level 2 --from l2-u01 --to l2-u20 --min 2 > <workspace>/gaps-l2-a.txt` and read it.
Expected: non-zero lessons below 2 / uncovered words for this range.

- [ ] **Step 2: Write the sentences**

Append sentence objects to `packages/content/src/authored/sentences/level2.json` in the shape `{ "id", "zh", "pinyin", "vi", "words" }`, ids starting at `s:l2:fill:205`. Sentences may use all L1 words and earlier L2 units. For every `[BELOW MIN]` lesson and every lesson with a `[no sentence]` word, write until the lesson has ≥2 builder sentences and no uncovered word. Follow every Global Constraint. Allowlist only per the spec's reasons.

- [ ] **Step 3: Rebuild**

Run: `pnpm content:build`
Expected: exit 0, no problems.

- [ ] **Step 4: Re-check the range**

Run: `pnpm -F @hi-chinese/content lesson-gaps --level 2 --from l2-u01 --to l2-u20 --min 2 | tail -2`
Expected: `Lessons below 2 builder sentences in scope (l2-u01..l2-u20): 0` and `Uncovered words in scope: 0 (allowlisted: <n>)`.

- [ ] **Step 5: Pinyin guard and full suite**

Run: `pnpm -F @hi-chinese/content exec vitest run test/sentence-pinyin-data.test.ts` then `pnpm test`
Expected: PASS for both.

- [ ] **Step 6: Review list**

Append one row per new sentence to the `## L2` table, allowlisted words to the allowlist table, fixed existing sentences to the fixes table.

- [ ] **Step 7: Commit**

```bash
git add packages/content/src/authored apps/web/public/content docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md
git commit -m "feat(content): L2 sentences for l2-u01..u20 (two per lesson, word coverage)"
```

---

### Task 5: L2 sentences, units l2-u21..l2-u40

**Files:**
- Modify: `packages/content/src/authored/sentences/level2.json` (append)
- Modify: `packages/content/src/authored/uncovered-words.json` (only if a word truly cannot be covered)
- Modify: `apps/web/public/content/**` (rebuilt)
- Modify: `docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md` (L2 section)

**Interfaces:**
- Consumes: `lesson-gaps --min 2`; ids continue after the highest `s:l2:fill:` id from Task 4.

- [ ] **Step 1: List the gaps**

Run: `pnpm -F @hi-chinese/content lesson-gaps --level 2 --from l2-u21 --to l2-u40 --min 2 > <workspace>/gaps-l2-b.txt` and read it.
Expected: non-zero lessons below 2 / uncovered words for this range.

- [ ] **Step 2: Write the sentences**

Append sentence objects to `packages/content/src/authored/sentences/level2.json` in the shape `{ "id", "zh", "pinyin", "vi", "words" }`, ids continuing the `s:l2:fill:` series. For every `[BELOW MIN]` lesson and every lesson with a `[no sentence]` word, write until the lesson has ≥2 builder sentences and no uncovered word. Follow every Global Constraint. Allowlist only per the spec's reasons.

- [ ] **Step 3: Rebuild**

Run: `pnpm content:build`
Expected: exit 0, no problems.

- [ ] **Step 4: Re-check the range**

Run: `pnpm -F @hi-chinese/content lesson-gaps --level 2 --from l2-u21 --to l2-u40 --min 2 | tail -2`
Expected: `Lessons below 2 builder sentences in scope (l2-u21..l2-u40): 0` and `Uncovered words in scope: 0 (allowlisted: <n>)`.

- [ ] **Step 5: Pinyin guard and full suite**

Run: `pnpm -F @hi-chinese/content exec vitest run test/sentence-pinyin-data.test.ts` then `pnpm test`
Expected: PASS for both.

- [ ] **Step 6: Review list**

Append one row per new sentence to the `## L2` table, allowlisted words to the allowlist table, fixed existing sentences to the fixes table.

- [ ] **Step 7: Commit**

```bash
git add packages/content/src/authored apps/web/public/content docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md
git commit -m "feat(content): L2 sentences for l2-u21..u40 (two per lesson, word coverage)"
```

---

### Task 6: L2 sentences, units l2-u41..l2-u59; L2 done

**Files:**
- Modify: `packages/content/src/authored/sentences/level2.json` (append)
- Modify: `packages/content/src/authored/uncovered-words.json` (only if a word truly cannot be covered)
- Modify: `apps/web/public/content/**` (rebuilt)
- Modify: `apps/web/test/content/levels-done.ts`
- Modify: `docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md` (L2 section)

**Interfaces:**
- Consumes: `lesson-gaps --min 2`; ids continue after the highest `s:l2:fill:` id from Task 5.
- Produces: `LEVELS_DONE = [1, 2]`.

- [ ] **Step 1: List the gaps**

Run: `pnpm -F @hi-chinese/content lesson-gaps --level 2 --from l2-u41 --to l2-u59 --min 2 > <workspace>/gaps-l2-c.txt` and read it.
Expected: non-zero lessons below 2 / uncovered words for this range.

- [ ] **Step 2: Write the sentences**

Append sentence objects to `packages/content/src/authored/sentences/level2.json` in the shape `{ "id", "zh", "pinyin", "vi", "words" }`, ids continuing the `s:l2:fill:` series. For every `[BELOW MIN]` lesson and every lesson with a `[no sentence]` word, write until the lesson has ≥2 builder sentences and no uncovered word. Follow every Global Constraint. Allowlist only per the spec's reasons.

- [ ] **Step 3: Rebuild**

Run: `pnpm content:build`
Expected: exit 0, no problems.

- [ ] **Step 4: Re-check the whole level**

Run: `pnpm -F @hi-chinese/content lesson-gaps --level 2 --min 2 | tail -2`
Expected: `Lessons below 2 builder sentences in scope (l2-u01..l2-u59): 0` and `Uncovered words in scope: 0 (allowlisted: <n>)`.

- [ ] **Step 5: Turn on the L2 guards**

Set `LEVELS_DONE` in `apps/web/test/content/levels-done.ts` to `[1, 2]`.
Run: `pnpm -F @hi-chinese/content exec vitest run test/sentence-pinyin-data.test.ts` then `pnpm test`
Expected: PASS for both.

- [ ] **Step 6: Review list**

Append one row per new sentence to the `## L2` table, allowlisted words to the allowlist table, fixed existing sentences to the fixes table.

- [ ] **Step 7: Commit**

```bash
git add packages/content/src/authored apps/web/public/content apps/web/test/content/levels-done.ts docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md
git commit -m "feat(content): L2 sentences for l2-u41..u59; L2 coverage guards on"
```

---

### Task 7: L3 sentences, units l3-u01..l3-u21

**Files:**
- Modify: `packages/content/src/authored/sentences/level3.json` (append)
- Modify: `packages/content/src/authored/uncovered-words.json` (only if a word truly cannot be covered)
- Modify: `apps/web/public/content/**` (rebuilt)
- Modify: `docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md` (L3 section)

**Interfaces:**
- Consumes: `lesson-gaps --min 2`.
- Produces: sentences `s:l3:fill:280` upward.

- [ ] **Step 1: List the gaps**

Run: `pnpm -F @hi-chinese/content lesson-gaps --level 3 --from l3-u01 --to l3-u21 --min 2 > <workspace>/gaps-l3-a.txt` and read it.
Expected: non-zero lessons below 2 / uncovered words for this range.

- [ ] **Step 2: Write the sentences**

Append sentence objects to `packages/content/src/authored/sentences/level3.json` in the shape `{ "id", "zh", "pinyin", "vi", "words" }`, ids starting at `s:l3:fill:280`. Sentences may use all L1/L2 words and earlier L3 units. For every `[BELOW MIN]` lesson and every lesson with a `[no sentence]` word, write until the lesson has ≥2 builder sentences and no uncovered word. Follow every Global Constraint. Allowlist only per the spec's reasons.

- [ ] **Step 3: Rebuild**

Run: `pnpm content:build`
Expected: exit 0, no problems.

- [ ] **Step 4: Re-check the range**

Run: `pnpm -F @hi-chinese/content lesson-gaps --level 3 --from l3-u01 --to l3-u21 --min 2 | tail -2`
Expected: `Lessons below 2 builder sentences in scope (l3-u01..l3-u21): 0` and `Uncovered words in scope: 0 (allowlisted: <n>)`.

- [ ] **Step 5: Pinyin guard and full suite**

Run: `pnpm -F @hi-chinese/content exec vitest run test/sentence-pinyin-data.test.ts` then `pnpm test`
Expected: PASS for both.

- [ ] **Step 6: Review list**

Append one row per new sentence to the `## L3` table, allowlisted words to the allowlist table, fixed existing sentences to the fixes table.

- [ ] **Step 7: Commit**

```bash
git add packages/content/src/authored apps/web/public/content docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md
git commit -m "feat(content): L3 sentences for l3-u01..u21 (two per lesson, word coverage)"
```

---

### Task 8: L3 sentences, units l3-u22..l3-u42

**Files:**
- Modify: `packages/content/src/authored/sentences/level3.json` (append)
- Modify: `packages/content/src/authored/uncovered-words.json` (only if a word truly cannot be covered)
- Modify: `apps/web/public/content/**` (rebuilt)
- Modify: `docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md` (L3 section)

**Interfaces:**
- Consumes: `lesson-gaps --min 2`; ids continue after the highest `s:l3:fill:` id from Task 7.

- [ ] **Step 1: List the gaps**

Run: `pnpm -F @hi-chinese/content lesson-gaps --level 3 --from l3-u22 --to l3-u42 --min 2 > <workspace>/gaps-l3-b.txt` and read it.
Expected: non-zero lessons below 2 / uncovered words for this range.

- [ ] **Step 2: Write the sentences**

Append sentence objects to `packages/content/src/authored/sentences/level3.json` in the shape `{ "id", "zh", "pinyin", "vi", "words" }`, ids continuing the `s:l3:fill:` series. For every `[BELOW MIN]` lesson and every lesson with a `[no sentence]` word, write until the lesson has ≥2 builder sentences and no uncovered word. Follow every Global Constraint. Allowlist only per the spec's reasons.

- [ ] **Step 3: Rebuild**

Run: `pnpm content:build`
Expected: exit 0, no problems.

- [ ] **Step 4: Re-check the range**

Run: `pnpm -F @hi-chinese/content lesson-gaps --level 3 --from l3-u22 --to l3-u42 --min 2 | tail -2`
Expected: `Lessons below 2 builder sentences in scope (l3-u22..l3-u42): 0` and `Uncovered words in scope: 0 (allowlisted: <n>)`.

- [ ] **Step 5: Pinyin guard and full suite**

Run: `pnpm -F @hi-chinese/content exec vitest run test/sentence-pinyin-data.test.ts` then `pnpm test`
Expected: PASS for both.

- [ ] **Step 6: Review list**

Append one row per new sentence to the `## L3` table, allowlisted words to the allowlist table, fixed existing sentences to the fixes table.

- [ ] **Step 7: Commit**

```bash
git add packages/content/src/authored apps/web/public/content docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md
git commit -m "feat(content): L3 sentences for l3-u22..u42 (two per lesson, word coverage)"
```

---

### Task 9: L3 sentences, units l3-u43..l3-u63

**Files:**
- Modify: `packages/content/src/authored/sentences/level3.json` (append)
- Modify: `packages/content/src/authored/uncovered-words.json` (only if a word truly cannot be covered)
- Modify: `apps/web/public/content/**` (rebuilt)
- Modify: `docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md` (L3 section)

**Interfaces:**
- Consumes: `lesson-gaps --min 2`; ids continue after the highest `s:l3:fill:` id from Task 8.

- [ ] **Step 1: List the gaps**

Run: `pnpm -F @hi-chinese/content lesson-gaps --level 3 --from l3-u43 --to l3-u63 --min 2 > <workspace>/gaps-l3-c.txt` and read it.
Expected: non-zero lessons below 2 / uncovered words for this range.

- [ ] **Step 2: Write the sentences**

Append sentence objects to `packages/content/src/authored/sentences/level3.json` in the shape `{ "id", "zh", "pinyin", "vi", "words" }`, ids continuing the `s:l3:fill:` series. For every `[BELOW MIN]` lesson and every lesson with a `[no sentence]` word, write until the lesson has ≥2 builder sentences and no uncovered word. Follow every Global Constraint. Allowlist only per the spec's reasons.

- [ ] **Step 3: Rebuild**

Run: `pnpm content:build`
Expected: exit 0, no problems.

- [ ] **Step 4: Re-check the range**

Run: `pnpm -F @hi-chinese/content lesson-gaps --level 3 --from l3-u43 --to l3-u63 --min 2 | tail -2`
Expected: `Lessons below 2 builder sentences in scope (l3-u43..l3-u63): 0` and `Uncovered words in scope: 0 (allowlisted: <n>)`.

- [ ] **Step 5: Pinyin guard and full suite**

Run: `pnpm -F @hi-chinese/content exec vitest run test/sentence-pinyin-data.test.ts` then `pnpm test`
Expected: PASS for both.

- [ ] **Step 6: Review list**

Append one row per new sentence to the `## L3` table, allowlisted words to the allowlist table, fixed existing sentences to the fixes table.

- [ ] **Step 7: Commit**

```bash
git add packages/content/src/authored apps/web/public/content docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md
git commit -m "feat(content): L3 sentences for l3-u43..u63 (two per lesson, word coverage)"
```

---

### Task 10: L3 sentences, units l3-u64..l3-u84; L3 done; roadmap

**Files:**
- Modify: `packages/content/src/authored/sentences/level3.json` (append)
- Modify: `packages/content/src/authored/uncovered-words.json` (only if a word truly cannot be covered)
- Modify: `apps/web/public/content/**` (rebuilt)
- Modify: `apps/web/test/content/levels-done.ts`
- Modify: `docs/superpowers/specs/2026-09-24-sentence-expansion-native-review.md` (L3 section)
- Modify: `docs/superpowers/plans/README.md`

**Interfaces:**
- Consumes: `lesson-gaps --min 2`; ids continue after the highest `s:l3:fill:` id from Task 9.
- Produces: `LEVELS_DONE = [1, 2, 3]`.

- [ ] **Step 1: List the gaps**

Run: `pnpm -F @hi-chinese/content lesson-gaps --level 3 --from l3-u64 --to l3-u84 --min 2 > <workspace>/gaps-l3-d.txt` and read it.
Expected: non-zero lessons below 2 / uncovered words for this range.

- [ ] **Step 2: Write the sentences**

Append sentence objects to `packages/content/src/authored/sentences/level3.json` in the shape `{ "id", "zh", "pinyin", "vi", "words" }`, ids continuing the `s:l3:fill:` series. For every `[BELOW MIN]` lesson and every lesson with a `[no sentence]` word, write until the lesson has ≥2 builder sentences and no uncovered word. Follow every Global Constraint. Allowlist only per the spec's reasons.

- [ ] **Step 3: Rebuild**

Run: `pnpm content:build`
Expected: exit 0, no problems.

- [ ] **Step 4: Re-check every level**

Run: `for l in 1 2 3; do pnpm -F @hi-chinese/content lesson-gaps --level $l --min 2 | tail -2; done`
Expected: every level reports `... : 0` lessons below 2 and `Uncovered words in scope: 0 (allowlisted: <n>)`.

- [ ] **Step 5: Turn on the L3 guards**

Set `LEVELS_DONE` in `apps/web/test/content/levels-done.ts` to `[1, 2, 3]`.
Run: `pnpm -F @hi-chinese/content exec vitest run test/sentence-pinyin-data.test.ts` then `pnpm test`
Expected: PASS for both.

- [ ] **Step 6: Review list and roadmap**

Append one row per new sentence to the `## L3` table, allowlisted words to the allowlist table, fixed existing sentences to the fixes table.

In `docs/superpowers/plans/README.md`, add a row to the curriculum-audit table:

```markdown
| `2026-09-24-sentence-expansion.md` | `2026-09-24-sentence-expansion-design.md` | Every lesson has ≥2 sentences of ≥3 words; every word is in a sentence or the reasoned allowlist | merged |
```

and remove the two "Still open" bullets for lessons with only one sentence and words in no sentence.

- [ ] **Step 7: Commit**

```bash
git add packages/content/src/authored apps/web/public/content apps/web/test/content/levels-done.ts docs/superpowers
git commit -m "feat(content): L3 sentences for l3-u64..u84; coverage guards on for every level"
```
