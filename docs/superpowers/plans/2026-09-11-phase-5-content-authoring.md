# Phase 5: Content Authoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author grammar points and example sentences for all 184 units (currently only 2 have content), extend pinyin overrides for multi-reading words, and rebuild the content bundle so the web app has full learn/practice content.

**Architecture:** The content pipeline (`packages/content`) already handles placement, validation, and build — no pipeline code changes are needed. Phase 5 is primarily a data-authoring task: writing `AuthoredGrammar` and `AuthoredSentence` JSON files that the existing pipeline processes. A vocabulary-context helper script aids authoring by printing the words available at each unit. Content is authored per HSK level (3 levels × 1 file each for grammar and sentences). After all content is authored, a full pipeline build regenerates the web app's content bundle.

**Tech Stack:** TypeScript (tsx scripts), packages/content pipeline (existing), `pnpm content:build` for validation + output

**Spec:** `docs/superpowers/specs/2026-09-09-hi-chinese-design.md` (section 3: Content model and pipeline, section 4: exercises)

## Global Constraints

- Authored grammar lives in `packages/content/src/authored/grammar/*.json` as `AuthoredGrammar[]` arrays
- Authored sentences live in `packages/content/src/authored/sentences/*.json` as `AuthoredSentence[]` arrays
- Files are read sorted by filename; one array per file, concatenated in order
- **Sentence word constraint**: every `words[]` token must be a course word's `simplified` form; tokens joined (Han chars only) must exactly equal the Han characters in `zh`
- **Sentence placement**: a sentence is auto-placed at the latest unit among its words' units — sentences can only use words from their auto-placed unit or earlier
- **Grammar placement**: a grammar point is placed at the unit of its latest example sentence; max 2 grammar points per unit (overflow spills forward to the next same-level unit)
- **Grammar level**: must match the level of the unit it lands in
- **Grammar examples**: 3–5 example sentence IDs per grammar point (spec §3)
- Sentence IDs: `s:l<level>:<3-digit-number>` (globally unique across all files)
- Grammar IDs: `g:<kebab-case-name>` (globally unique)
- Pinyin in sentences uses tone marks (not numeric), capitalized at sentence start
- English translations should be natural, not word-for-word
- `pnpm --filter @hi-chinese/content build` validates everything and fails on errors
- Commits must not include `Co-Authored-By` trailer for Claude

---

## Verified Facts

1. **184 units**: 42 HSK 1 (l1-u01..l1-u42), 63 HSK 2 (l2-u01..l2-u63), 79 HSK 3 (l3-u01..l3-u79); ~12 words per unit.
2. **Existing content**: 4 grammar points + 8 sentences covering only l1-u01 and l1-u02 (IDs `g:shi-sentences`, `g:bu-negation`, `g:affirmative-negative-questions`, `g:you-possession`; sentences `s:l1:001`–`s:l1:008`).
3. **Target**: ~1–2 grammar points per unit → ~270 total; 3–5 sentences per grammar point → ~1000 total.
4. **Pipeline** (`assembleContent` in `run.ts`): reads authored → `placeSentences` → `placeGrammar` → `attachToUnits` → `validateContent` → `writeContent`. Already fully operational.
5. **252 multi-reading words**, 9 overrides in `pinyin-overrides.json`. Format: `{ "simplified": "numericPinyin" }`.
6. **Validation** catches: unknown tokens, token mismatches, duplicate IDs, missing sentences, level mismatches, overflow, sentence-order violations (word from later unit).
7. Grammar currently only requires `sentenceIds.length > 0`; spec says 3–5. Tightening validation is a plan decision (see Rulings).
8. The `report:readings` script (`npx tsx scripts/report-readings.ts`) lists all multi-reading words with their chosen reading, override status, and all available readings.
9. `words.json` at `apps/web/public/content/words.json` has all 2209 words with `unitId`, `simplified`, `pinyin`, `meanings`, etc.

## Rulings

- **No validation tightening for grammar example count**: The validator currently checks `sentenceIds.length === 0` (line 116 of validate.ts). Changing this to enforce 3–5 would be a code change that affects the existing 2 grammar points (which have 2–3 examples). Instead, the plan documents the 3–5 target and the implementer adheres to it. The final build validation catches structural errors; count enforcement is a future hardening pass. Cost if wrong: some grammar points could ship with fewer than 3 examples.
- **Content authored by the implementer agent directly**: The spec says "Drafts are generated in batches by a script for human review and editing." For this SDD execution, the implementer agent writes the JSON directly (it has Mandarin knowledge) and the pipeline validates. The user reviews the committed content. Cost if wrong: some grammar explanations or sentences may need human editing.
- **Files organized as one per level** (`level1.json`, `level2.json`, `level3.json`): matches the existing pattern. Level 1 file is extended (keeping existing 4+8 entries). Cost if wrong: none, pipeline reads all files sorted by name.

---

## File Structure

### New files

| File | Task | Responsibility |
|------|------|---------------|
| `packages/content/scripts/vocab-context.ts` | 1 | Print available vocabulary per unit for content authoring reference |

### Modified files

| File | Task | Change |
|------|------|--------|
| `packages/content/src/authored/grammar/level1.json` | 2 | Extend from 4 to ~63 grammar points (units l1-u03 through l1-u42) |
| `packages/content/src/authored/sentences/level1.json` | 2 | Extend from 8 to ~250 sentences |
| `packages/content/src/authored/grammar/level2.json` | 3 | Create ~95 grammar points for all 63 L2 units |
| `packages/content/src/authored/sentences/level2.json` | 3 | Create ~380 sentences |
| `packages/content/src/authored/grammar/level3.json` | 4 | Create ~119 grammar points for all 79 L3 units |
| `packages/content/src/authored/sentences/level3.json` | 4 | Create ~476 sentences |
| `packages/content/src/authored/pinyin-overrides.json` | 5 | Extend from 9 to ~50+ overrides for common multi-reading words |
| `packages/content/package.json` | 1 | Add `vocab-context` script |
| `apps/web/public/content/*` | 6 | Rebuilt content bundle (manifest, words, units, characters) |

All paths below are relative to the repo root.

---

### Task 1: Vocabulary Context Script

**Files:**
- Create: `packages/content/scripts/vocab-context.ts`
- Modify: `packages/content/package.json` (add script)

**Interfaces:**
- Consumes: `assembleContent` from `src/pipeline/run.ts`; `fetchRaw` from `src/pipeline/fetch.ts`; `loadAuthored` from `src/pipeline/authored.ts`
- Produces: `pnpm --filter @hi-chinese/content vocab-context -- --level <1|2|3>` prints a per-unit vocabulary report to stdout

- [ ] **Step 1: Implement the vocab-context script**

```ts
// packages/content/scripts/vocab-context.ts
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAuthored } from '../src/pipeline/authored.js';
import { parseHskWords, type RawHskEntry } from '../src/pipeline/hsk.js';
import { assignUnits } from '../src/pipeline/units.js';
import { fetchRaw } from '../src/pipeline/fetch.js';
import type { HskLevel } from '../src/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const rawDir = resolve(here, '../raw');
const authoredDir = resolve(here, '../src/authored');

const levelArg = process.argv.find((a) => a.startsWith('--level='))?.split('=')[1]
  ?? process.argv[process.argv.indexOf('--level') + 1];
if (!levelArg || !['1', '2', '3'].includes(levelArg)) {
  console.error('Usage: vocab-context --level <1|2|3>');
  process.exit(1);
}
const level = Number(levelArg) as HskLevel;

const raw = await fetchRaw(rawDir);
const { overrides } = await loadAuthored(authoredDir);
const entries = JSON.parse(await readFile(raw.hsk, 'utf8')) as RawHskEntry[];
const parsed = parseHskWords(entries, overrides);
const { units, words } = assignUnits(parsed);

const wordById = new Map(words.map((w) => [w.id, w]));
const cumulative: string[] = [];

for (const u of units.filter((u) => u.level === level).sort((a, b) => a.order - b.order)) {
  const newWords = u.wordIds.map((id) => wordById.get(id)!);
  for (const w of newWords) cumulative.push(w.simplified);
  console.log(`\n## ${u.id} — ${u.title}`);
  console.log(`New words (${newWords.length}):`);
  for (const w of newWords) {
    console.log(`  ${w.simplified}\t${w.pinyin}\t${w.meanings.slice(0, 2).join('; ')}`);
  }
  console.log(`Cumulative vocabulary: ${cumulative.length} words`);
  console.log(`Available: ${cumulative.join(' ')}`);
}
```

- [ ] **Step 2: Add the script to package.json**

In `packages/content/package.json`, add to `"scripts"`:

```json
"vocab-context": "tsx scripts/vocab-context.ts"
```

- [ ] **Step 3: Test the script**

Run: `cd packages/content && pnpm vocab-context -- --level 1 | head -30`
Expected: shows unit l1-u01 with its words, then l1-u02, etc.

Run: `cd packages/content && pnpm vocab-context -- --level 2 | head -30`
Expected: shows L2 units starting from l2-u01.

- [ ] **Step 4: Run existing content tests**

Run: `cd packages/content && pnpm test`
Expected: all existing tests pass (no regressions)

- [ ] **Step 5: Commit**

```bash
git add packages/content/scripts/vocab-context.ts packages/content/package.json
git commit -m "feat(content): vocabulary context script for content authoring"
```

---

### Task 2: HSK Level 1 Grammar and Sentences

**Files:**
- Modify: `packages/content/src/authored/grammar/level1.json` (extend from 4 entries)
- Modify: `packages/content/src/authored/sentences/level1.json` (extend from 8 entries)

**Interfaces:**
- Consumes: vocabulary from `pnpm vocab-context -- --level 1`; existing entries in level1.json files
- Produces: ~63 grammar points covering units l1-u01 through l1-u42; ~250 sentences

This is a **content authoring task**, not a typical code task. The implementer writes JSON files that pass pipeline validation.

- [ ] **Step 1: Generate vocabulary context**

Run: `cd packages/content && pnpm vocab-context -- --level 1 > /tmp/l1-vocab.txt`

Read `/tmp/l1-vocab.txt` to understand which words are available at each unit. This is your primary reference for writing sentences that only use available vocabulary.

- [ ] **Step 2: Read the existing Level 1 content**

Read `packages/content/src/authored/grammar/level1.json` and `packages/content/src/authored/sentences/level1.json`. The existing 4 grammar points and 8 sentences must be preserved. New entries extend these arrays.

- [ ] **Step 3: Author grammar points and sentences for units l1-u03 through l1-u42**

For each unit (or group of 2–3 units), write 1–2 grammar points with 3–5 example sentences each. Follow these rules:

**Grammar point format:**
```json
{
  "id": "g:<kebab-case-name>",
  "title": "<Short title in English>",
  "pattern": "<Chinese pattern with key words>",
  "explanation": "<2-4 sentence English explanation. Clear, concise, aimed at beginners. Mention tone changes or common errors where relevant.>",
  "level": 1,
  "examples": ["s:l1:009", "s:l1:010", "s:l1:011"]
}
```

**Sentence format:**
```json
{
  "id": "s:l1:<3-digit-number>",
  "zh": "<Natural Chinese sentence with proper punctuation>",
  "pinyin": "<Tone-mark pinyin, capitalized at sentence start>",
  "en": "<Natural English translation>",
  "words": ["<simplified>", "<simplified>", ...]
}
```

**Authoring rules:**
- Every word in `words[]` must be a course vocabulary word available at or before the sentence's auto-placed unit
- `words` joined must exactly equal the Han characters in `zh` (ignoring punctuation and spaces)
- Each grammar point needs 3–5 example sentences
- Sentence IDs continue from `s:l1:009` upward, globally unique
- Grammar IDs are descriptive kebab-case, globally unique
- Sentences should be natural, not stilted or overly formal
- Grammar explanations should be clear for English-speaking beginners
- Cover the key grammar patterns introduced by each unit's new words

**Common HSK 1 grammar topics by approximate unit range:**
- u01–u05: 是/不 sentences, question particles 吗/呢, pronouns, 的 possessive
- u06–u10: 在 for location, 有 possession/existence, numbers + 个
- u11–u15: 想/要/会/能/可以, time words (今天/明天/昨天), 了 completed
- u16–u20: 很 + adjective, 也/都, comparison basics, 从...到
- u21–u25: measure words (本/杯/件), 多少/几 questions, 给
- u26–u30: 过 experience, 正在 progressive, directional complements
- u31–u35: 得 complement, time duration, 一点儿/有点儿
- u36–u42: review patterns, compound sentences, 因为...所以

These are rough guides — check the actual words per unit to determine what grammar patterns naturally emerge.

- [ ] **Step 4: Validate by running the content build**

Run: `cd packages/content && pnpm build`

If it fails, read the error messages. Common issues:
- `unknown-token`: a word in a sentence isn't in the course vocabulary — replace it
- `token-mismatch`: the `words` array doesn't spell the Chinese text — fix tokens
- `sentence-order`: a sentence uses a word from a later unit — restructure or move the sentence
- `duplicate-id`: reused an ID — renumber
- `level-mismatch`: grammar is at wrong level — check sentence word units
- `overflow`: too many grammar points for available units — reduce count or spread them out

Fix errors and re-run until the build succeeds.

- [ ] **Step 5: Verify content counts**

After a successful build, the output should show something like:
```
{ words: 2209, characters: 899, grammar: ~63, sentences: ~250, units: 184 }
```

Verify that grammar and sentence counts are reasonable (not 4 and 8 anymore).

- [ ] **Step 6: Run the full content test suite**

Run: `cd packages/content && pnpm test`
Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add packages/content/src/authored/grammar/level1.json \
  packages/content/src/authored/sentences/level1.json
git commit -m "content(l1): grammar points and sentences for all HSK Level 1 units"
```

Do NOT commit the rebuilt content bundle yet — that happens in Task 6 after all levels are done.

---

### Task 3: HSK Level 2 Grammar and Sentences

**Files:**
- Create: `packages/content/src/authored/grammar/level2.json`
- Create: `packages/content/src/authored/sentences/level2.json`

**Interfaces:**
- Consumes: vocabulary from `pnpm vocab-context -- --level 2`; Level 1 content from Task 2
- Produces: ~95 grammar points covering units l2-u01 through l2-u63; ~380 sentences

Same authoring process as Task 2, but for HSK Level 2.

- [ ] **Step 1: Generate vocabulary context**

Run: `cd packages/content && pnpm vocab-context -- --level 2 > /tmp/l2-vocab.txt`

Read the output. Note: Level 2 sentences can also use Level 1 words (they're available at all L2 units). The vocabulary context script shows only same-level words, but the full word list is in `apps/web/public/content/words.json`.

- [ ] **Step 2: Author grammar points and sentences**

Create `packages/content/src/authored/grammar/level2.json` and `packages/content/src/authored/sentences/level2.json`.

Sentence IDs start at `s:l2:001`. Grammar IDs use `g:<kebab-case>`, all globally unique (no collisions with Level 1 grammar IDs).

**Common HSK 2 grammar topics:**
- 比 comparisons (A比B + adj), 一样 similarity
- 把 disposal sentences (把 + object + verb + complement)
- 被 passive (basic)
- 是...的 emphasis on time/place/manner
- 得 degree complement (verb + 得 + adj), potential complement
- 除了...以外 "besides/except"
- time: 以前/以后, 的时候, 一边...一边
- 越来越 "more and more", 越...越 "the more...the more"
- 虽然...但是 "although...but"
- 如果...就 "if...then"
- 不但...而且 "not only...but also"
- 又...又 "both...and"
- Various aspect markers and complements
- Direction complements (上来/下去/出来/回去)

- [ ] **Step 3: Validate with pipeline build**

Run: `cd packages/content && pnpm build`
Fix any errors. Re-run until clean.

- [ ] **Step 4: Verify counts**

Expected: grammar ~158 total (63 L1 + 95 L2), sentences ~630 total.

- [ ] **Step 5: Run content tests**

Run: `cd packages/content && pnpm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/content/src/authored/grammar/level2.json \
  packages/content/src/authored/sentences/level2.json
git commit -m "content(l2): grammar points and sentences for all HSK Level 2 units"
```

---

### Task 4: HSK Level 3 Grammar and Sentences

**Files:**
- Create: `packages/content/src/authored/grammar/level3.json`
- Create: `packages/content/src/authored/sentences/level3.json`

**Interfaces:**
- Consumes: vocabulary from `pnpm vocab-context -- --level 3`; Level 1+2 content from Tasks 2–3
- Produces: ~119 grammar points covering units l3-u01 through l3-u79; ~476 sentences

Same authoring process as Tasks 2–3, but for HSK Level 3.

- [ ] **Step 1: Generate vocabulary context**

Run: `cd packages/content && pnpm vocab-context -- --level 3 > /tmp/l3-vocab.txt`

Level 3 sentences can use Level 1+2+3 words.

- [ ] **Step 2: Author grammar points and sentences**

Create `packages/content/src/authored/grammar/level3.json` and `packages/content/src/authored/sentences/level3.json`.

Sentence IDs start at `s:l3:001`. Grammar IDs use `g:<kebab-case>`, globally unique.

**Common HSK 3 grammar topics:**
- Resultative complements (看见/听到/做完/学会)
- 把 sentences (complex: 把...V成/V到/V给)
- 被 passive (full: 被/叫/让 + agent)
- 使/让 causative
- Potential complement (V得了/V不了, V得下/V不下)
- 连...都/也 "even..."
- 不管...都 "no matter...all"
- 只要...就 "as long as...then"
- 既然...就 "since...then"
- 无论...都 "regardless...all"
- 于是 "thereupon", 终于 "finally"
- 按照 "according to", 根据 "based on"
- Relative clauses with 的
- 所 nominalizer (所有, 所以)
- Various idiomatic patterns

- [ ] **Step 3: Validate with pipeline build**

Run: `cd packages/content && pnpm build`
Fix errors. Re-run until clean.

- [ ] **Step 4: Verify counts**

Expected: grammar ~277 total, sentences ~1100 total.

- [ ] **Step 5: Run content tests**

Run: `cd packages/content && pnpm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/content/src/authored/grammar/level3.json \
  packages/content/src/authored/sentences/level3.json
git commit -m "content(l3): grammar points and sentences for all HSK Level 3 units"
```

---

### Task 5: Pinyin Overrides Review

**Files:**
- Modify: `packages/content/src/authored/pinyin-overrides.json`

**Interfaces:**
- Consumes: `pnpm --filter @hi-chinese/content report:readings` output; current overrides (9 entries)
- Produces: extended overrides (~50+ entries) covering the most common multi-reading words

- [ ] **Step 1: Generate the readings report**

Run: `cd packages/content && pnpm report:readings > /tmp/readings.txt`

Read the output. Each line shows: word, level, chosen reading, override status, all available readings.

- [ ] **Step 2: Review and extend overrides**

Read `packages/content/src/authored/pinyin-overrides.json`. Current entries:

```json
{
  "了": "le5", "着": "zhe5", "那": "na4", "啊": "a5",
  "重": "zhong4", "长": "chang2", "为": "wei4", "数": "shu4", "得": "de5"
}
```

Review the readings report. For each multi-reading word, check if the pipeline's chosen reading (by heuristic: most meanings) is the most common/useful reading for learners. Add overrides where the heuristic picks wrong.

**Common cases needing overrides** (check each against the report):
- 说 → shuō (not shuì)
- 还 → hái (not huán, more common meaning "still")
- 地 → de (when used as particle, vs dì "ground")
- 乐 → lè (not yuè, "happy" more common at beginner level)
- 行 → xíng (not háng, "okay/walk" more common)
- 都 → dōu (not dū "capital")
- 觉 → jué (as in 觉得 "feel")
- 发 → fā (not fà "hair")
- 干 → gàn (not gān "dry")
- 少 → shǎo (not shào "young")
- 种 → zhǒng (not zhòng "plant")
- 只 → zhǐ (not zhī "measure word")
- 教 → jiāo (not jiào "religion")
- 空 → kòng (depends on usage)
- 分 → fēn (not fèn)
- 看 → kàn (standard)
- etc.

For each word, pick the reading that a beginner would encounter first. When both readings are common, pick the one used by the word's most frequent meaning.

Format: `{ "simplified": "numericPinyin" }` where numericPinyin uses numbers for tones (e.g., `"shuo1"`).

- [ ] **Step 3: Validate**

Run: `cd packages/content && pnpm build`
Expected: build succeeds. Overrides affect the primary reading of words in the output.

- [ ] **Step 4: Run tests**

Run: `cd packages/content && pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/authored/pinyin-overrides.json
git commit -m "content: extend pinyin overrides for common multi-reading words"
```

---

### Task 6: Full Content Build and Web App Verification

**Files:**
- Modify: `apps/web/public/content/*` (rebuilt content bundle)
- Modify: `docs/superpowers/plans/README.md` (Phase 5 findings)

**Interfaces:**
- Consumes: all authored content from Tasks 2–5; full pipeline
- Produces: rebuilt content bundle; updated web app with full grammar/sentence content

- [ ] **Step 1: Run the full content build**

Run: `cd packages/content && pnpm build`

Expected output shows all content:
```
content <version> written to .../apps/web/public/content in X.Xs
{ words: 2209, characters: 899, grammar: ~277, sentences: ~1100, units: 184 }
  HSK 1: 42 units
  HSK 2: 63 units
  HSK 3: 79 units
```

Verify: grammar count is roughly 270–280, sentences roughly 1000–1200. Every unit (or nearly every) should have at least 1 grammar point.

- [ ] **Step 2: Run content package tests**

Run: `cd packages/content && pnpm test`
Expected: PASS

- [ ] **Step 3: Run web app tests**

Run: `cd apps/web && pnpm vitest run`
Expected: all tests PASS (the web app tests use fixture data, not the real content bundle, so they should be unaffected)

- [ ] **Step 4: Build the web app**

Run: `pnpm build` (from workspace root)
Expected: Vite build succeeds. The built bundle includes the new content.

- [ ] **Step 5: Verify a sample unit has grammar and sentences**

Read a rebuilt unit file to confirm grammar and sentences are present:

Run: `cat apps/web/public/content/units/l1-u10.json | python3 -m json.tool | head -30`

Expected: the unit chunk should have `grammar` and `sentences` arrays populated.

Also spot-check a Level 2 and Level 3 unit.

- [ ] **Step 6: Commit the rebuilt content bundle**

```bash
git add apps/web/public/content/
git commit -m "content: rebuild content bundle with full grammar and sentences (all 184 units)"
```

- [ ] **Step 7: Update the roadmap README**

Add Phase 5 findings to `docs/superpowers/plans/README.md`:

```markdown
- Phase 5 (2026-09-11): authored ~277 grammar points and ~1100 sentences across all 184 units. Extended
  pinyin overrides from 9 to ~50 entries. Content generated by AI, validated by the existing pipeline.
  The grammar validator only checks sentenceIds.length > 0 (not the spec's 3-5 minimum) — tighten in a
  future hardening pass. Exercise generation (fill-blank, sentence-builder) now has real sentence data
  for all units.
```

```bash
git add docs/superpowers/plans/README.md
git commit -m "docs: update roadmap with Phase 5 findings"
```

---

## Self-Review Notes

### Spec coverage check

| Spec requirement | Task |
|-----------------|------|
| §3 Grammar points in `src/grammar/*.json` | Tasks 2, 3, 4 |
| §3 Sentences in `src/sentences/*.json` | Tasks 2, 3, 4 |
| §3 "3 to 5 example sentence ids" per grammar | Tasks 2, 3, 4 (target, not validated) |
| §3 Sentence uses only words from its unit or earlier | Pipeline validates (sentence-order rule) |
| §3 "Drafts are generated in batches by a script" | Ruling: implementer writes directly, pipeline validates |
| §3 readings review for multi-pronunciation words | Task 5 |
| §4 Fill-the-blank from grammar sentences | Existing exercise generator uses sentences |
| §4 Sentence builder from sentences | Existing exercise generator uses sentences |

### Placeholder scan

No TBD, TODO, "implement later", or "similar to Task N" found. Tasks 2–4 are intentionally open-ended on exact grammar topics (the implementer chooses based on the vocabulary at each unit), but they specify the format, validation, and quality constraints precisely.

### Type consistency check

- `AuthoredGrammar` fields (`id`, `title`, `pattern`, `explanation`, `level`, `examples`) — consistent across all tasks and the existing level1.json
- `AuthoredSentence` fields (`id`, `zh`, `pinyin`, `en`, `words`) — consistent
- Sentence ID pattern `s:l<level>:<3digits>` — consistent
- Grammar ID pattern `g:<kebab-case>` — consistent
- `pinyin-overrides.json` format `{ simplified: numericPinyin }` — consistent with existing entries

### Deferred items

- **Grammar example count validation** (3–5 per grammar point): deferred to a future hardening pass. The implementer targets 3–5, but the validator only enforces >= 1.
- **Content quality review**: AI-generated grammar explanations and sentences should be reviewed by a Mandarin speaker. The pipeline catches structural errors but not linguistic quality.
- **Full e2e verification with grammar/sentences**: the existing e2e tests cover the exercise flow, but no e2e specifically verifies that fill-blank and sentence-builder exercises work with the real content. This is covered by the pipeline validation + existing exercise generation tests.
