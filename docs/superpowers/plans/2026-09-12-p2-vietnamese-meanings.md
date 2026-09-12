# P2 — Vietnamese Meanings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace English with Vietnamese as the teaching language across word meanings, character definitions, example sentences, and grammar explanations for all HSK1-3 content, and update the web app to show only Vietnamese in the learning UI. Hán Việt (added in P1) is untouched.

**Architecture:** Word meanings (2209) and character definitions (899) are **seeded from CVDICT**, an open Chinese→Vietnamese translation of CC-CEDICT, matched into the course by simplified string + numeric pinyin, then gap-filled and curated by hand for the small remainder. Sentences (1028) and grammar (273) are bespoke app content with no external Vietnamese source — their `en` field is renamed to `vi` and translated directly, level by level. All Vietnamese content lands in committed **authored** JSON (source of truth); the regular pipeline build never re-touches CVDICT. Output is regenerated through `pnpm content:build`; `apps/web/public/content` is never hand-edited.

**Tech Stack:** TypeScript (Node ESM, `.js` import specifiers), vitest, tsx pipeline scripts; React + Vite + Tailwind web app (vitest + Testing Library).

**Spec:** `docs/superpowers/specs/2026-09-12-vietnamese-hanviet-localization-design.md` (this plan implements phase **P2** of that spec, sections 3/4/6/7/9/10).

## Global Constraints

- **Scope of this phase:** `Word.meanings`, `CharacterData.definition`, `Sentence`'s English field (renamed `en`→`vi`), `GrammarPoint`/`AuthoredGrammar` `title`/`explanation` content. **`Word.alternates[].meanings` stays English** — the spec explicitly excludes it from scope (it never renders in the learning UI) and it must NOT be translated. `pos`, `classifiers`, ids, pinyin, hanViet are unaffected.
- **Curriculum structure is frozen in this phase.** Do not touch unit membership/order/titles, sentence `wordIds`/`unitId`, grammar placement, or word/unit assignment — those are P3/P4/P5. Only the *content* of meanings/definitions/sentence text/grammar text changes.
- **CVDICT source (word meanings + character definitions only):** pinned at commit `c379d909e308343a247e51619f7839a2060a271c`, raw file `https://raw.githubusercontent.com/ph0ngp/CVDICT/c379d909e308343a247e51619f7839a2060a271c/CVDICT.u8` (CEDICT-line format, ~122,591 entries). **License: CC BY-SA 4.0** — ship an attribution entry (Task 1) crediting Phong Phan / CVDICT / CC-CEDICT / CEDICT. CVDICT is used ONLY by the one-off seeding script (Task 2); the regular `pnpm content:build` never fetches it — seeded output is committed to `packages/content/src/authored/`.
- **ü-convention mismatch:** the course's own `pinyinNumeric`/pinyin data uses `ü` (e.g. `nü3`, `lü4`); CVDICT/CEDICT uses `u:` (e.g. `nu:3`, `lu:4`). Always normalize CVDICT pinyin by replacing `u:` → `ü` before comparing.
- **Sentences/grammar have no external seed** — translate directly, level by level, reviewed like any authored content. Where a translation (word, character, sentence, or grammar explanation) is uncertain, **verify via web search** (Vietnamese dictionary sources, Wiktionary) rather than guessing — same practice established in the Hán Việt phase, per explicit user instruction.
- **Fallback semantics (meanings/definitions only, per spec §6):** the pipeline may fall back to the existing English value when a Vietnamese seed is missing, so a build never breaks mid-phase; a **non-blocking** diagnostic (printed by the build script, not a `validateContent` error) lists any word/character still on the English fallback. After Task 3 this list is expected to be **empty** for all 2209 words / 899 characters.
- **Sentences do NOT get an English fallback** — once the field is renamed to `vi`, every sentence must have non-empty Vietnamese; add a hard validation rule (mirrors the P1 `word-hanviet`/`char-hanviet` pattern: no fallback, empty = build failure).
- **Commits:** do NOT add any `Co-Authored-By: Claude` / co-committer trailer (user's global CLAUDE.md rule).
- **Content review:** all Vietnamese content here is AI-authored/AI-seeded and needs the human owner's review before any external deploy (org content-review rule + spec §12). The final finishing-branch merge is a local gate, as in P0/P1; deploy is a separate, later decision.

---

### Task 1: Pin CVDICT source + CEDICT parser + pinyin numeral converter + attribution

**Files:**
- Modify: `packages/content/src/pipeline/fetch.ts`
- Create: `packages/content/src/pipeline/cedict.ts`
- Modify: `packages/content/src/pipeline/build.ts` (ATTRIBUTION text)
- Test: `packages/content/test/cedict.test.ts`
- Test: `packages/content/test/fetch.test.ts` (extend)

**Interfaces:**
- Produces:
  ```ts
  // cedict.ts
  export interface CedictEntry {
    traditional: string;
    simplified: string;
    pinyin: string;   // raw bracket content, e.g. "ni3 hao3" (CEDICT's own u: convention)
    meanings: string[];
  }
  export function parseCedictLine(line: string): CedictEntry | null;
  export function parseCedict(text: string): CedictEntry[];
  export function normalizeCedictPinyin(pinyin: string): string; // "u:" -> "ü"
  export function pinyinSyllableToNumeric(syllable: string): string; // one diacritic syllable -> numeric
  export function pinyinToNumeric(pinyin: string): string; // space-joined syllables -> numeric, space-joined
  ```
- `fetch.ts` gains a standalone `CVDICT_SOURCE` constant (NOT part of the main `SOURCES` map — the regular build must not fetch it) and an optional 4th parameter on `fetchRaw` so a caller can pass a different sources map:
  ```ts
  export async function fetchRaw(
    rawDir: string,
    download: Downloader = defaultDownload,
    log: (msg: string) => void = console.log,
    sources: Record<string, { url: string; file: string }> = SOURCES,
  ): Promise<Record<string, string>>
  ```
  (Existing call sites are unaffected — the 4th parameter defaults to the current `SOURCES`.)
- Consumed by Task 2 (the seed-extraction script imports `cedict.ts` and calls `fetchRaw(rawDir, undefined, undefined, { cvdict: CVDICT_SOURCE })`).

- [ ] **Step 1: Write the failing tests**

Create `packages/content/test/cedict.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  normalizeCedictPinyin,
  parseCedict,
  parseCedictLine,
  pinyinSyllableToNumeric,
  pinyinToNumeric,
} from '../src/pipeline/cedict.js';

describe('parseCedictLine', () => {
  it('parses a data line into traditional/simplified/pinyin/meanings', () => {
    const line = '你好 你好 [ni3 hao3] /xin chào/chào/';
    expect(parseCedictLine(line)).toEqual({
      traditional: '你好',
      simplified: '你好',
      pinyin: 'ni3 hao3',
      meanings: ['xin chào', 'chào'],
    });
  });

  it('returns null for comment lines and blank lines', () => {
    expect(parseCedictLine('# a comment')).toBeNull();
    expect(parseCedictLine('')).toBeNull();
    expect(parseCedictLine('   ')).toBeNull();
  });

  it('returns null for a line that does not match the CEDICT shape', () => {
    expect(parseCedictLine('not a cedict line')).toBeNull();
  });
});

describe('parseCedict', () => {
  it('parses multiple lines, skipping comments', () => {
    const text = [
      '# header comment',
      '你好 你好 [ni3 hao3] /xin chào/chào/',
      '謝謝 谢谢 [xie4 xie5] /cảm ơn/cảm ơn bạn/',
    ].join('\n');
    const out = parseCedict(text);
    expect(out).toHaveLength(2);
    expect(out[0]!.simplified).toBe('你好');
    expect(out[1]!.meanings).toEqual(['cảm ơn', 'cảm ơn bạn']);
  });
});

describe('normalizeCedictPinyin', () => {
  it('converts CEDICT u: convention to ü', () => {
    expect(normalizeCedictPinyin('nu:3')).toBe('nü3');
    expect(normalizeCedictPinyin('lu:4 mao4 zi5')).toBe('lü4 mao4 zi5');
  });

  it('leaves non-ü pinyin unchanged', () => {
    expect(normalizeCedictPinyin('qu4')).toBe('qu4');
  });
});

describe('pinyinSyllableToNumeric', () => {
  it('converts each tone-marked vowel to its numeric form', () => {
    expect(pinyinSyllableToNumeric('nǐ')).toBe('ni3');
    expect(pinyinSyllableToNumeric('hǎo')).toBe('hao3');
    expect(pinyinSyllableToNumeric('mā')).toBe('ma1');
  });

  it('converts precomposed ü-tone vowels, keeping ü', () => {
    expect(pinyinSyllableToNumeric('nǚ')).toBe('nü3');
    expect(pinyinSyllableToNumeric('lǜ')).toBe('lü4');
  });

  it('defaults to neutral tone 5 when there is no diacritic', () => {
    expect(pinyinSyllableToNumeric('ma')).toBe('ma5');
    expect(pinyinSyllableToNumeric('zi')).toBe('zi5');
  });
});

describe('pinyinToNumeric', () => {
  it('converts a full multi-syllable pinyin string', () => {
    expect(pinyinToNumeric('nǐ hǎo')).toBe('ni3 hao3');
    expect(pinyinToNumeric('lǜ')).toBe('lü4');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm -F @hi-chinese/content test cedict`
Expected: FAIL (`cedict.js` does not exist).

- [ ] **Step 3: Implement `cedict.ts`**

```ts
export interface CedictEntry {
  traditional: string;
  simplified: string;
  pinyin: string;
  meanings: string[];
}

const LINE_RE = /^(\S+) (\S+) \[([^\]]*)\] \/(.+)\/$/;

export function parseCedictLine(line: string): CedictEntry | null {
  const trimmed = line.trimEnd();
  if (trimmed.length === 0 || trimmed.startsWith('#')) return null;
  const m = LINE_RE.exec(trimmed);
  if (!m) return null;
  const [, traditional, simplified, pinyin, sensesRaw] = m;
  const meanings = sensesRaw!.split('/').filter((s) => s.length > 0);
  return { traditional: traditional!, simplified: simplified!, pinyin: pinyin!, meanings };
}

export function parseCedict(text: string): CedictEntry[] {
  const out: CedictEntry[] = [];
  for (const line of text.split('\n')) {
    const e = parseCedictLine(line);
    if (e) out.push(e);
  }
  return out;
}

export function normalizeCedictPinyin(pinyin: string): string {
  return pinyin.replace(/u:/g, 'ü');
}

const TONE_MAP: Record<string, [string, number]> = {
  ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4],
  ē: ['e', 1], é: ['e', 2], ě: ['e', 3], è: ['e', 4],
  ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4],
  ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4],
  ū: ['u', 1], ú: ['u', 2], ǔ: ['u', 3], ù: ['u', 4],
  ǖ: ['ü', 1], ǘ: ['ü', 2], ǚ: ['ü', 3], ǜ: ['ü', 4],
};

export function pinyinSyllableToNumeric(syllable: string): string {
  for (const ch of syllable) {
    const hit = TONE_MAP[ch];
    if (hit) {
      const [base, tone] = hit;
      return syllable.replace(ch, base) + tone;
    }
  }
  return `${syllable}5`;
}

export function pinyinToNumeric(pinyin: string): string {
  return pinyin
    .split(/\s+/)
    .filter((s) => s.length > 0)
    .map(pinyinSyllableToNumeric)
    .join(' ');
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm -F @hi-chinese/content test cedict`
Expected: PASS.

- [ ] **Step 5: Add `CVDICT_SOURCE` + extend `fetchRaw`**

In `packages/content/src/pipeline/fetch.ts`, add (do NOT add `cvdict` to the exported `SOURCES` object — it must stay separate so the regular build never fetches it):

```ts
// Pinned separately from SOURCES: only the one-off Vietnamese seeding script
// (scripts/seed-vietnamese.ts) fetches this. The regular content build never
// touches CVDICT once the seed is committed to packages/content/src/authored/.
export const CVDICT_SOURCE = {
  url: 'https://raw.githubusercontent.com/ph0ngp/CVDICT/c379d909e308343a247e51619f7839a2060a271c/CVDICT.u8',
  file: 'CVDICT.u8',
} as const;
```

Change `fetchRaw`'s signature to accept an optional sources map defaulting to `SOURCES`:

```ts
export async function fetchRaw(
  rawDir: string,
  download: Downloader = defaultDownload,
  log: (msg: string) => void = console.log,
  sources: Record<string, { url: string; file: string }> = SOURCES,
): Promise<Record<string, string>> {
  await mkdir(rawDir, { recursive: true });
  const out: Record<string, string> = {};
  for (const key of Object.keys(sources)) {
    const { url, file } = sources[key]!;
    // ...unchanged body, just iterate `sources` instead of `SOURCES` and drop the `SourceKey` cast...
  }
  return out;
}
```

(Adjust the return type / `SourceKey` usage as needed so existing call sites — which pass no 4th argument — keep behaving identically. Keep `export type SourceKey = keyof typeof SOURCES` for existing consumers.)

- [ ] **Step 6: Extend `fetch.test.ts`**

Add a test that `fetchRaw` accepts a custom `sources` map (e.g. `{ cvdict: CVDICT_SOURCE }`) and downloads/caches only that key, leaving the default `SOURCES` behavior (existing tests) unchanged.

- [ ] **Step 7: Update ATTRIBUTION in `build.ts`**

In `packages/content/src/pipeline/build.ts`, extend the `ATTRIBUTION` template literal to add a CVDICT credit block, e.g.:

```ts
const ATTRIBUTION = `Hi Chinese content attribution

Vocabulary: complete-hsk-vocabulary (https://github.com/drkameleon/complete-hsk-vocabulary), MIT License.
Character stroke data and dictionary: Make Me a Hanzi (https://github.com/skishore/makemeahanzi).
  graphics data: Arphic Public License (derived from Arphic PL KaitiM GB / UKai fonts); dictionary data: LGPL (Unihan / CJKlib). See the project's COPYING file.
Vietnamese word meanings and character definitions: seeded from CVDICT (https://github.com/ph0ngp/CVDICT) by Phong Phan,
  itself a Vietnamese translation of CC-CEDICT (https://www.mdbg.net/chinese/dictionary?page=cc-cedict, CEDICT © 1997, 1998 Paul Andrew Denisowski).
  CVDICT is licensed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/); this derived Vietnamese content
  is likewise available under CC BY-SA 4.0.
`;
```

Add/extend a `build.test.ts` assertion that `ATTRIBUTION.txt` in the output contains "CVDICT" and "CC BY-SA".

- [ ] **Step 8: Run full content suite + typecheck**

Run: `pnpm -F @hi-chinese/content typecheck && pnpm -F @hi-chinese/content test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/content/src/pipeline/fetch.ts packages/content/src/pipeline/cedict.ts packages/content/src/pipeline/build.ts packages/content/test/cedict.test.ts packages/content/test/fetch.test.ts packages/content/test/build.test.ts
git commit -m "feat(content): pin CVDICT source, add CEDICT parser and pinyin numeral converter, credit attribution"
```

---

### Task 2: Seed extraction script — Vietnamese meanings + character definitions

**Files:**
- Create: `packages/content/scripts/seed-vietnamese.ts`
- Test: `packages/content/test/seed-vietnamese.test.ts`

**Interfaces:**
- Produces (on running the script, NOT part of this task's automated test — see Step 6): `packages/content/src/authored/meanings/level1.json`, `level2.json`, `level3.json` (each `Record<string /*simplified*/, string[]>`, only words of that HSK level) and `packages/content/src/authored/char-definitions/base.json` (`Record<string /*character*/, string>`), plus a console report of unmatched/ambiguous words for Task 3.
- Consumes: `apps/web/public/content/words.json` and `apps/web/public/content/characters/*.json` (current shipped English content — read-only reference for matching), `CVDICT.u8` (via `fetchRaw` + `CVDICT_SOURCE` from Task 1), `parseCedict`/`normalizeCedictPinyin`/`pinyinToNumeric` from `cedict.ts`.

**Notes for the implementer:**
- This mirrors the shape of `scripts/capture-l1-content.ts` (a one-off script, run once, its output committed as authored source data) — read that file for the project's established pattern (reading shipped `apps/web/public/content`, writing to `packages/content/src/authored/`).
- **Matching algorithm** (write this as a testable pure function, e.g. `matchWordMeanings(word: {simplified: string; pinyinNumeric: string}, cedictBySimplified: Map<string, CedictEntry[]>): { meanings: string[] | null; ambiguous: boolean }`):
  1. Look up all CEDICT entries whose `simplified` equals the word's `simplified`.
  2. If there are none: return `{ meanings: null, ambiguous: false }` (word goes on the "missing" list).
  3. If there is exactly one: return its `meanings` (this is the common case).
  4. If there are multiple (heteronym): normalize each entry's `pinyin` with `normalizeCedictPinyin`, and pick the one that equals the word's `pinyinNumeric` exactly. If found, return its `meanings`. If none matches, concatenate ALL entries' `meanings` (dedup) and return `{ meanings: <concatenated>, ambiguous: true }` (word goes on the "needs review" list for Task 3, but still gets a seed value so nothing is empty).
- **Character matching** is the same shape but keyed by the character's `pinyin: string[]` array (tone-marked): convert each of the character's pinyin readings with `pinyinToNumeric` and compare (normalized) against each CEDICT single-character entry's normalized pinyin; same one/many/ambiguous logic. Join the winning entry's `meanings` array into a single string with `', '` (matching the existing English `definition` style, e.g. `"to see, to observe, to meet, to appear"`).
- Only characters/words actually used by the course matter — build the CEDICT lookup map `Map<string, CedictEntry[]>` keyed by `simplified` once, reused for both words and characters (a character is just a 1-Han-char `simplified` lookup).
- Print, at the end, three lists: words with no CEDICT match at all ("missing" — expect roughly 8, but let the script's real matching decide the exact set — do not hard-code an assumed list), words resolved via the ambiguous-fallback path ("needs review"), and the same two categories for characters (expect ~0 for characters per prior research, but verify for real).
- Write the meaning files split by `word.level` (1/2/3); write `char-definitions/base.json` as one file covering all matched characters.

- [ ] **Step 1: Write a test for the matching function (failing)**

Create `packages/content/test/seed-vietnamese.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { matchWordMeanings, matchCharDefinition } from '../scripts/seed-vietnamese.js';
import type { CedictEntry } from '../src/pipeline/cedict.js';

const byWord = new Map<string, CedictEntry[]>([
  ['你好', [{ traditional: '你好', simplified: '你好', pinyin: 'ni3 hao3', meanings: ['xin chào', 'chào'] }]],
  ['的', [
    { traditional: '的', simplified: '的', pinyin: 'de5', meanings: ['của'] },
    { traditional: '的', simplified: '的', pinyin: 'di1', meanings: ['xe taxi'] },
    { traditional: '的', simplified: '的', pinyin: 'di2', meanings: ['thực sự'] },
    { traditional: '的', simplified: '的', pinyin: 'di4', meanings: ['hồng tâm; mục tiêu'] },
  ]],
  ['女', [
    { traditional: '女', simplified: '女', pinyin: 'nu:3', meanings: ['nữ', 'phụ nữ', 'con gái'] },
    { traditional: '女', simplified: '女', pinyin: 'ru3', meanings: ['biến thể cổ của 汝'] },
  ]],
]);

describe('matchWordMeanings', () => {
  it('returns the single match directly', () => {
    const r = matchWordMeanings({ simplified: '你好', pinyinNumeric: 'ni3 hao3' }, byWord);
    expect(r).toEqual({ meanings: ['xin chào', 'chào'], ambiguous: false });
  });

  it('picks the heteronym line matching the course pinyinNumeric', () => {
    const r = matchWordMeanings({ simplified: '的', pinyinNumeric: 'de5' }, byWord);
    expect(r).toEqual({ meanings: ['của'], ambiguous: false });
  });

  it('normalizes CEDICT u: to ü before comparing', () => {
    const r = matchWordMeanings({ simplified: '女', pinyinNumeric: 'nü3' }, byWord);
    expect(r).toEqual({ meanings: ['nữ', 'phụ nữ', 'con gái'], ambiguous: false });
  });

  it('falls back to a concatenated, flagged result when no heteronym line matches', () => {
    const r = matchWordMeanings({ simplified: '的', pinyinNumeric: 'de2' }, byWord);
    expect(r.ambiguous).toBe(true);
    expect(r.meanings).not.toBeNull();
    expect(r.meanings!.length).toBeGreaterThan(0);
  });

  it('returns null meanings when the word is not in CEDICT at all', () => {
    const r = matchWordMeanings({ simplified: '送到', pinyinNumeric: 'song4 dao4' }, byWord);
    expect(r).toEqual({ meanings: null, ambiguous: false });
  });
});

describe('matchCharDefinition', () => {
  it('matches a character by converting its tone-marked pinyin and comparing', () => {
    const byChar = new Map<string, CedictEntry[]>([
      ['见', [
        { traditional: '見', simplified: '见', pinyin: 'jian4', meanings: ['thấy', 'gặp'] },
        { traditional: '見', simplified: '见', pinyin: 'xian4', meanings: ['xuất hiện'] },
      ]],
    ]);
    const r = matchCharDefinition({ character: '见', pinyin: ['jiàn'] }, byChar);
    expect(r).toEqual({ definition: 'thấy, gặp', ambiguous: false });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm -F @hi-chinese/content test seed-vietnamese`
Expected: FAIL (`scripts/seed-vietnamese.ts` does not exist).

- [ ] **Step 3: Implement `scripts/seed-vietnamese.ts`**

Export the two pure matching functions (`matchWordMeanings`, `matchCharDefinition`) per the algorithm above, plus a script body (guarded so importing the module for tests doesn't execute it — follow `capture-l1-content.ts`'s pattern of putting the script's side-effecting `main()` logic behind a `if (import.meta.url === ...)` style guard, or structure it as: pure functions exported + a top-level `await main()` at the bottom, matching whichever convention `capture-l1-content.ts` already uses) that:
1. Calls `fetchRaw(rawDir, undefined, undefined, { cvdict: CVDICT_SOURCE })`, reads and `parseCedict`s the file, builds `Map<string, CedictEntry[]>` keyed by `simplified`.
2. Reads `apps/web/public/content/words.json`; for each word calls `matchWordMeanings`; collects results into three buckets (matched, ambiguous, missing) split by `word.level`.
3. Reads every file in `apps/web/public/content/characters/`; for each calls `matchCharDefinition`; collects into matched/ambiguous/missing.
4. Writes `packages/content/src/authored/meanings/level{1,2,3}.json` (matched + ambiguous words only — i.e. everything with a non-null result; the true "missing" ones are NOT written here, they get authored by hand in Task 3) and `packages/content/src/authored/char-definitions/base.json` similarly.
5. Prints the missing/ambiguous lists (words and characters) to the console for Task 3 to consume.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm -F @hi-chinese/content test seed-vietnamese`
Expected: PASS (unit tests on the pure matching functions; this does NOT run the real script against the network).

- [ ] **Step 5: Typecheck**

Run: `pnpm -F @hi-chinese/content typecheck`
Expected: PASS.

- [ ] **Step 6: Actually run the script once against real data**

Run: `pnpm --filter @hi-chinese/content exec tsx scripts/seed-vietnamese.ts`
This downloads and caches `CVDICT.u8` (~10.8MB, one-time), matches against the real 2209 words / 899 characters, and writes the `authored/meanings/*.json` + `authored/char-definitions/base.json` files. Record the printed missing/ambiguous counts and lists exactly — Task 3 needs them.

- [ ] **Step 7: Commit**

```bash
git add packages/content/scripts/seed-vietnamese.ts packages/content/test/seed-vietnamese.test.ts
git add packages/content/src/authored/meanings packages/content/src/authored/char-definitions
git commit -m "feat(content): seed Vietnamese word meanings and character definitions from CVDICT"
```

---

### Task 3: Gap-fill missing translations + linguistic curation pass + coverage test

**Files:**
- Modify: `packages/content/src/authored/meanings/level{1,2,3}.json` (add the missing words; fix any curation issues found)
- Modify: `packages/content/src/authored/char-definitions/base.json` (fix any curation issues found, if any)
- Test: `packages/content/test/vietnamese-data.test.ts`

**Interfaces:**
- Produces: complete Vietnamese coverage — every one of the 2209 course words has a non-empty `meanings` entry in `authored/meanings/*.json`; every one of the 899 course characters has a non-empty entry in `authored/char-definitions/base.json`.

**Notes for the implementer:**
- Start from Task 2's printed "missing" list (words with zero CEDICT match — expected to be small, roughly 8, compositional phrases like 送到/这时候/能不能/不太/车上/放到/见过/不一会儿, but use the REAL list Task 2 produced, not this example). For each, author a Vietnamese translation by hand: read the word's existing English `meanings` (in `apps/web/public/content/words.json`) for sense, and its pinyin/component characters, and write a natural Vietnamese equivalent (an array of 1+ short strings, matching the style of the seeded entries — e.g. `送到` "gửi đến; giao đến"). Where uncertain, use WebSearch (Vietnamese dictionary sources, Wiktionary, or the phrase's component characters' Hán Việt/Vietnamese senses) to verify rather than guessing.
- Then do a **spot-check curation pass** over the CVDICT-seeded entries: sample at least 150 words spread across all three levels (prioritize high-frequency words and any word CVDICT gave more than 4 senses, since long sense-lists are the likeliest place for a rare/archaic/mistranslated entry to sneak in — CVDICT's disclosed error classes are rare species/proper-noun names left partly in English, non-standard transliteration of proper nouns, and occasional mistranslation/unnatural phrasing). Compare each sampled Vietnamese meaning against the word's existing English meanings for sense alignment; fix anything wrong, mistranslated, left in English, or nonsensical directly in the `meanings/*.json` files. Do the same spot-check for at least 100 characters in `char-definitions/base.json`.
- Also review every entry Task 2 flagged as `ambiguous` (heteronym fallback that concatenated all senses) — these are the words most likely to need a hand-picked single reading rather than a concatenation; fix in place.

- [ ] **Step 1: Write the coverage acceptance test (failing until gap-fill is done)**

Create `packages/content/test/vietnamese-data.test.ts` (mirrors the P1 `hanviet-data.test.ts` pattern):

```ts
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const authored = resolve(here, '../src/authored');
const content = resolve(here, '../../../apps/web/public/content');
const HAN = /\p{Script=Han}/u;

const readJson = async (p: string) => JSON.parse(await readFile(p, 'utf8'));

async function loadMeanings(): Promise<Record<string, string[]>> {
  const merged: Record<string, string[]> = {};
  for (const level of [1, 2, 3]) {
    const m = (await readJson(resolve(authored, `meanings/level${level}.json`))) as Record<string, string[]>;
    Object.assign(merged, m);
  }
  return merged;
}

describe('Vietnamese meanings coverage', () => {
  it('covers every course word with at least one non-empty meaning', async () => {
    const words = (await readJson(resolve(content, 'words.json'))) as { simplified: string }[];
    const meanings = await loadMeanings();
    const missing = words
      .map((w) => w.simplified)
      .filter((s) => !meanings[s] || meanings[s].length === 0 || meanings[s].every((m) => m.trim() === ''));
    expect(missing).toEqual([]);
  });
});

describe('Vietnamese character definitions coverage', () => {
  it('covers every course character with a non-empty definition', async () => {
    const words = (await readJson(resolve(content, 'words.json'))) as { simplified: string }[];
    const courseChars = new Set<string>();
    for (const w of words) for (const ch of w.simplified) if (HAN.test(ch)) courseChars.add(ch);
    const defs = (await readJson(resolve(authored, 'char-definitions/base.json'))) as Record<string, string>;
    const missing = [...courseChars].filter((ch) => !defs[ch] || defs[ch].trim() === '');
    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails (before gap-fill)**

Run: `pnpm -F @hi-chinese/content test vietnamese-data`
Expected: FAIL, listing the missing words from Task 2's real output.

- [ ] **Step 3: Author the missing word translations + curate the seeded data**

Per the notes above: add every missing word to the appropriate `authored/meanings/levelN.json` file (by the word's HSK level), and fix any issues found in the curation/spot-check pass across both `meanings/*.json` and `char-definitions/base.json`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm -F @hi-chinese/content test vietnamese-data`
Expected: PASS (0 missing words, 0 missing characters).

- [ ] **Step 5: Run the full content suite**

Run: `pnpm -F @hi-chinese/content test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/content/src/authored/meanings packages/content/src/authored/char-definitions packages/content/test/vietnamese-data.test.ts
git commit -m "feat(content): fill missing Vietnamese word translations, curate seeded meanings/definitions"
```

---

### Task 4: Wire Vietnamese meanings/definitions into the pipeline

**Files:**
- Modify: `packages/content/src/pipeline/authored.ts`
- Modify: `packages/content/src/pipeline/hsk.ts`
- Modify: `packages/content/src/pipeline/characters.ts`
- Modify: `packages/content/src/pipeline/run.ts`
- Create: `packages/content/src/pipeline/vietnamese-coverage.ts`
- Modify: `packages/content/scripts/build.ts` (print the coverage diagnostic)
- Test: `packages/content/test/authored.test.ts`, `hsk.test.ts`, `characters.test.ts`, `vietnamese-coverage.test.ts`, `run.test.ts` (extend)

**Interfaces:**
- Extends `Authored` (authored.ts) with `meanings: Record<string, string[]>` and `charDefinitions: Record<string, string>`, loaded by merging every `*.json` file in `authored/meanings/` and `authored/char-definitions/` respectively.
- `normalizeWord`/`parseHskWords` (hsk.ts) take a `viMeanings: Record<string, string[]>` parameter; `word.meanings` becomes `viMeanings[entry.simplified] ?? chosen.meanings` (Vietnamese if seeded, else the existing English — this is the spec's transitional fallback). **`alternates[].meanings` is unaffected — stays `f.meanings` (English), unchanged from today.**
- `buildCharacters` (characters.ts) takes a `viCharDefinitions: Record<string, string>` parameter; `definition` becomes `viCharDefinitions[ch] ?? d?.definition ?? null`.
- New `vietnamese-coverage.ts`:
  ```ts
  import type { ContentBundle } from '../types.js';
  export interface VietnameseCoverageReport {
    wordsOnEnglishFallback: string[];
    charactersOnEnglishFallback: string[];
  }
  export function findEnglishFallbacks(
    bundle: ContentBundle,
    viMeanings: Record<string, string[]>,
    viCharDefinitions: Record<string, string>,
  ): VietnameseCoverageReport {
    return {
      wordsOnEnglishFallback: bundle.words.filter((w) => !viMeanings[w.simplified]).map((w) => w.simplified),
      charactersOnEnglishFallback: bundle.characters
        .filter((c) => !viCharDefinitions[c.character])
        .map((c) => c.character),
    };
  }
  ```
  This is deliberately NOT part of `validateContent` (which is fail-fast for every rule it reports) — it's a non-blocking diagnostic. `scripts/build.ts` calls it after a successful build and prints a warning (not an error, does not affect exit code) if either list is non-empty.

**Notes for the implementer:** merging multiple JSON object files per directory needs a new loader helper distinct from the existing array-merging `readJsonArrays` (which expects each file to hold a JSON *array*). Add:

```ts
async function readJsonObjectsMerged(dir: string): Promise<Record<string, unknown>> {
  let names: string[];
  try {
    names = (await readdir(dir)).filter((n) => n.endsWith('.json')).sort();
  } catch {
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const name of names) {
    const path = join(dir, name);
    const text = await readFile(path, 'utf8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error(`${path}: invalid JSON: ${(e as Error).message}`);
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(`${path}: expected a JSON object`);
    }
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (k in out) throw new Error(`${path}: key "${k}" is already defined by another file in ${dir}`);
      out[k] = v;
    }
  }
  return out;
}
```

Use it in `loadAuthored` for both `meanings` and `charDefinitions`. In `run.ts`, thread `inputs.authored.meanings` into `parseHskWords` and `inputs.authored.charDefinitions` into `buildCharacters`, matching how `hanViet` is already threaded (Task 4 of P1 established this exact pattern — follow it).

- [ ] **Step 1: Extend `Authored` + `loadAuthored`**

Add `readJsonObjectsMerged` to `authored.ts`; add `meanings: Record<string, string[]>` and `charDefinitions: Record<string, string>` to the `Authored` interface; populate them via `readJsonObjectsMerged(join(authoredDir, 'meanings'))` and `readJsonObjectsMerged(join(authoredDir, 'char-definitions'))` (cast to the right record type).

- [ ] **Step 2: Thread into `hsk.ts`**

Add a `viMeanings: Record<string, string[]>` parameter to `normalizeWord` and `parseHskWords`; set `meanings: viMeanings[entry.simplified] ?? chosen.meanings`. Leave `alternates` computation untouched (still uses `f.meanings`, English).

- [ ] **Step 3: Thread into `characters.ts`**

Add a `viCharDefinitions: Record<string, string>` parameter to `buildCharacters`; set `definition: viCharDefinitions[ch] ?? d?.definition ?? null`.

- [ ] **Step 4: Wire `run.ts`**

```ts
const parsed = parseHskWords(entries, inputs.authored.overrides, hanViet, inputs.authored.meanings);
// ...
const { characters, missing } = buildCharacters(
  inputs.dictionaryText,
  inputs.graphicsText,
  words,
  (ch) => hanViet.char(ch),
  inputs.authored.charDefinitions,
);
```

(Adjust parameter order/names to fit the existing signatures cleanly; keep `hanViet` wiring exactly as P1 left it.)

- [ ] **Step 5: Create `vietnamese-coverage.ts` + test**

Implement exactly as specified above. Add `vietnamese-coverage.test.ts`: a bundle with one word/character present in the Vietnamese maps and one absent → `findEnglishFallbacks` returns only the absent ones.

- [ ] **Step 6: Wire the diagnostic into `scripts/build.ts`**

After a successful `writeContent` call, call `findEnglishFallbacks(result.bundle, authored.meanings, authored.charDefinitions)` and, if either list is non-empty, print (not throw) a warning listing them — the build still exits 0.

- [ ] **Step 7: Fix all fixtures**

`normalizeWord`/`parseHskWords`/`buildCharacters` callers (including tests: `hsk.test.ts`, `characters.test.ts`, `run.test.ts`'s `authored()` fixture) need a `viMeanings`/`viCharDefinitions` argument — pass `{}` where the test isn't about Vietnamese content (falls back to English, unchanged behavior) and real small maps where a test needs to assert Vietnamese content flows through.

- [ ] **Step 8: Run full suite + typecheck**

Run: `pnpm -F @hi-chinese/content typecheck && pnpm -F @hi-chinese/content test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/content/src
git add packages/content/test
git commit -m "feat(content): wire Vietnamese meanings/definitions into the pipeline with English fallback + coverage diagnostic"
```

---

### Task 5: Sentence field rename (`en` → `vi`) + validation

**Files:**
- Modify: `packages/content/src/types.ts` (`Sentence.en`→`vi`, `AuthoredSentence.en`→`vi`)
- Modify: `packages/content/src/pipeline/placement.ts` (`placeSentences`)
- Modify: `packages/content/src/pipeline/validate.ts` (new `sentence-vi` rule)
- Modify: `packages/content/src/authored/sentences/level{1,2,3}.json` (mechanical key rename ONLY — `"en":` → `"vi":`, value unchanged for now; Task 6/7/8 translate the content)
- Test: `packages/content/test/placement.test.ts`, `validate.test.ts`, `run.test.ts` (extend)

**Interfaces:**
- `Sentence.vi: string` / `AuthoredSentence.vi: string` (renamed from `en`, same type). `placeSentences` builds `{ ..., vi: s.vi, ... }` instead of `{ ..., en: s.en, ... }`.
- `validate.ts` gains: `if (s.vi.trim() === '') err('sentence-vi', s.id, \`${s.id} has no Vietnamese translation\`);` in the sentences loop (mirrors P1's `word-hanviet`/`char-hanviet` — hard failure, no fallback, since this field has no transitional-English-allowed status).

**Notes for the implementer:** this task is a **mechanical rename** — do NOT translate any sentence content yet (that's Task 6/7/8). After this task, every sentence's `vi` field still literally holds its old English text; the validation only checks non-emptiness, which still passes. Rename the JSON key in all three `authored/sentences/level*.json` files (`"en": "..."` → `"vi": "..."`, same string value) with a small script or careful find-replace — do not alter any other field.

- [ ] **Step 1: Rename the type fields**

In `types.ts`: `Sentence.en: string` → `Sentence.vi: string`; `AuthoredSentence.en: string` → `AuthoredSentence.vi: string`.

- [ ] **Step 2: Update `placement.ts`**

In `placeSentences`, change `sentences.push({ id: s.id, zh: s.zh, pinyin: s.pinyin, en: s.en, wordIds, unitId: latest.id })` to use `vi: s.vi`.

- [ ] **Step 3: Add the `validate.ts` rule**

In the sentences loop, add the `sentence-vi` check per the Interfaces section above.

- [ ] **Step 4: Mechanically rename the JSON key in all three sentence files**

For each of `packages/content/src/authored/sentences/level1.json`, `level2.json`, `level3.json`: rename every object's `"en"` key to `"vi"`, keeping the existing (English) string value unchanged. Verify with a quick script that the file still has the same number of entries and every entry now has a `vi` key and no `en` key.

- [ ] **Step 5: Fix all fixtures**

Update `placement.test.ts`, `run.test.ts`, and any other fixture building `Sentence`/`AuthoredSentence` objects to use `vi` instead of `en`.

- [ ] **Step 6: Add a validate test**

In `validate.test.ts`: a sentence with `vi: ''` produces the `sentence-vi` error; one with non-empty `vi` does not.

- [ ] **Step 7: Run full suite + typecheck**

Run: `pnpm -F @hi-chinese/content typecheck && pnpm -F @hi-chinese/content test`
Expected: PASS (sentence content is still English-in-a-`vi`-field at this point — that's expected and fine; Task 6/7/8 translate it).

- [ ] **Step 8: Commit**

```bash
git add packages/content/src packages/content/test
git commit -m "refactor(content): rename Sentence/AuthoredSentence field en->vi (structure only, translation follows)"
```

---

### Task 6: Translate Level 1 content (316 sentences + 73 grammar points)

**Files:**
- Modify: `packages/content/src/authored/sentences/level1.json` (translate `vi` field content)
- Modify: `packages/content/src/authored/grammar/level1.json` (translate `title`/`explanation` content)

**Notes for the implementer:**
- Translate every sentence's `vi` field from its current English text into natural Vietnamese, matching the `zh` sentence's meaning and register (these are beginner HSK1 sentences — keep translations simple and natural, the way a Vietnamese textbook would phrase them).
- Translate every grammar point's `title` and `explanation` from English into Vietnamese. `pattern` (the Chinese pattern string, e.g. `"Sentence + 吧"`) and `sentenceIds`/`level`/`id` stay unchanged — only `title`/`explanation` content changes language. Where an explanation references Chinese characters/pinyin inline (e.g. `吧 (ba) softens...`), keep the Chinese/pinyin inline and translate the surrounding prose.
- Where a sentence or grammar point's correct Vietnamese phrasing is unclear or the Chinese is idiomatic, verify via web search rather than guessing (same practice as the Hán Việt phase).
- Do not touch any other field (`zh`, `pinyin`, `id`, `words`/`wordIds`, `pattern`, `level`, `examples`/`sentenceIds`) or unit assignment.

- [ ] **Step 1: Translate all 316 Level 1 sentences**

Edit `packages/content/src/authored/sentences/level1.json`: replace every `vi` value with a natural Vietnamese translation of the corresponding `zh`/`en`-original meaning.

- [ ] **Step 2: Translate all 73 Level 1 grammar points**

Edit `packages/content/src/authored/grammar/level1.json`: replace every `title` and `explanation` with Vietnamese.

- [ ] **Step 3: Run the full content suite + typecheck**

Run: `pnpm -F @hi-chinese/content typecheck && pnpm -F @hi-chinese/content test`
Expected: PASS (structural tests only check non-emptiness/shape, not language — this is expected to stay green throughout).

- [ ] **Step 4: Spot-check a sample**

Print and read back 15-20 random sentences and 10 grammar points (`zh` + `vi` + `pattern`/`explanation` side by side) to sanity-check tone and correctness before committing.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/authored/sentences/level1.json packages/content/src/authored/grammar/level1.json
git commit -m "feat(content): translate Level 1 sentences and grammar explanations to Vietnamese"
```

---

### Task 7: Translate Level 2 content (380 sentences + 95 grammar points)

**Files:**
- Modify: `packages/content/src/authored/sentences/level2.json`
- Modify: `packages/content/src/authored/grammar/level2.json`

Same process as Task 6, scoped to Level 2's 380 sentences and 95 grammar points (HSK2 register — slightly more complex sentence structures; keep translations natural, not overly literal).

- [ ] **Step 1: Translate all 380 Level 2 sentences**
- [ ] **Step 2: Translate all 95 Level 2 grammar points**
- [ ] **Step 3: Run the full content suite + typecheck** — `pnpm -F @hi-chinese/content typecheck && pnpm -F @hi-chinese/content test`, expect PASS
- [ ] **Step 4: Spot-check a sample** (15-20 sentences, 10 grammar points)
- [ ] **Step 5: Commit**

```bash
git add packages/content/src/authored/sentences/level2.json packages/content/src/authored/grammar/level2.json
git commit -m "feat(content): translate Level 2 sentences and grammar explanations to Vietnamese"
```

---

### Task 8: Translate Level 3 content (332 sentences + 105 grammar points)

**Files:**
- Modify: `packages/content/src/authored/sentences/level3.json`
- Modify: `packages/content/src/authored/grammar/level3.json`

Same process as Task 6/7, scoped to Level 3's 332 sentences and 105 grammar points (HSK3 register — more nuanced grammar; take particular care with grammar explanations that discuss aspect/mood particles, since these are the hardest to phrase naturally in Vietnamese — verify via web search where unsure).

- [ ] **Step 1: Translate all 332 Level 3 sentences**
- [ ] **Step 2: Translate all 105 Level 3 grammar points**
- [ ] **Step 3: Run the full content suite + typecheck** — `pnpm -F @hi-chinese/content typecheck && pnpm -F @hi-chinese/content test`, expect PASS
- [ ] **Step 4: Spot-check a sample** (15-20 sentences, 10 grammar points)
- [ ] **Step 5: Commit**

```bash
git add packages/content/src/authored/sentences/level3.json packages/content/src/authored/grammar/level3.json
git commit -m "feat(content): translate Level 3 sentences and grammar explanations to Vietnamese"
```

---

### Task 9: Web — replace English with Vietnamese in the learning UI

**Files:**
- Modify: `apps/web/src/lessons/LessonFlow.tsx`
- Modify: `apps/web/src/exercises/types.ts` (`en`→`vi` on `MatchPairsExercise.pairs[]`, `SentenceBuilderExercise`, `FillBlankExercise`; `correctAnswerText`)
- Modify: `apps/web/src/exercises/generate.ts` (`matchPairs`, `sentenceBuilder`, `fillBlank`)
- Modify: `apps/web/src/exercises/components/FillBlank.tsx`
- Modify: `apps/web/src/exercises/components/SentenceBuilder.tsx`
- Modify: `apps/web/src/exercises/components/MatchPairs.tsx`
- Test: extend existing component/exercise tests as needed

**Interfaces:** `Word.meanings` and `CharacterData.definition` already flow into the UI unchanged (`WordIntroSlide`, `ReviewIntroSlide`, `CharacterPage`, `StrokesSheet`, `WriteIt`, `MultipleChoice`'s `primaryMeaning`) — **no code change needed there**, since the field names are the same and their *content* is now Vietnamese as of Tasks 1-4. This task only needs to rename the `Sentence`-derived `en` fields that still say "en" while now meaning "Vietnamese gloss" — leaving a field named `en` holding Vietnamese text would be confusing and wrong.

**Exact renames:**
- `apps/web/src/lessons/LessonFlow.tsx` (~line 167, inside `GrammarIntroSlide`): `<div className="text-sm text-stone-800">{s.en}</div>` → `{s.vi}`.
- `apps/web/src/exercises/types.ts`:
  - `MatchPairsExercise.pairs: { wordId: string; zh: string; en: string }[]` → `{ wordId: string; zh: string; vi: string }[]`.
  - `SentenceBuilderExercise.en: string` → `vi: string`.
  - `FillBlankExercise.en: string` → `vi: string`.
  - `correctAnswerText`'s `match-pairs` case: `exercise.pairs.map((p) => \`${p.zh} = ${p.en}\`)` → `` `${p.zh} = ${p.vi}` ``.
- `apps/web/src/exercises/generate.ts`:
  - `matchPairs`: `const en = primaryMeaning(w);` → `const vi = primaryMeaning(w);`; `seen.has(en)` → `seen.has(vi)`; `pairs.push({ wordId: w.id, zh: w.simplified, en })` → `pairs.push({ wordId: w.id, zh: w.simplified, vi })`.
  - `sentenceBuilder`: `en: sentence.en,` → `vi: sentence.vi,`.
  - `fillBlank`: `en: sentence.en,` → `vi: sentence.vi,`.
- `apps/web/src/exercises/components/FillBlank.tsx`: `<p className="text-stone-600">{exercise.en}</p>` → `{exercise.vi}`.
- `apps/web/src/exercises/components/SentenceBuilder.tsx`: `<p className="text-lg text-stone-800">{exercise.en}</p>` → `{exercise.vi}`.
- `apps/web/src/exercises/components/MatchPairs.tsx`: `{exercise.pairs[i]!.en}` → `{exercise.pairs[i]!.vi}`.

**Also check and fix:** any test fixture across `apps/web/test/` or co-located `*.test.ts(x)` files that constructs a `Sentence`, `MatchPairsExercise`, `SentenceBuilderExercise`, or `FillBlankExercise` object with an `en` field — rename to `vi` (search broadly; TypeScript compilation will surface every site once the types change).

- [ ] **Step 1: Apply the exact renames above** in all six listed files.

- [ ] **Step 2: Fix all fixtures and test call sites**

Search `apps/web/test/` and any co-located test file for object literals with an `en` field matching these exercise/sentence shapes; rename to `vi`.

- [ ] **Step 3: Verify no remaining English rendering in the learning UI**

Grep `apps/web/src` for `\.en\b` restricted to the lesson/exercise/character surfaces touched by this plan (excluding unrelated code, e.g. HTML `lang="en"` attributes if any exist elsewhere in the app shell, which are out of scope) to confirm nothing was missed.

- [ ] **Step 4: Run web typecheck + tests**

Run: `pnpm -F @hi-chinese/web typecheck && pnpm -F @hi-chinese/web test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src apps/web/test
git commit -m "feat(web): rename sentence-derived en fields to vi; learning UI now Vietnamese end-to-end"
```

---

### Task 10: Regenerate content + full verification

- [ ] **Step 1: Regenerate**

Run: `pnpm content:build`
Expected: succeeds (exit 0), prints counts (words 2209, characters 899, grammar 273, sentences 1028, units 184), and prints NO English-fallback warning (or an empty one) from Task 4's diagnostic — if it prints any word/character still on English fallback, that is a real gap: go back and fix Task 2/3's data, do not ignore it.

- [ ] **Step 2: Spot-check the output**

```bash
node -e "const w=require('./apps/web/public/content/words.json'); const by=Object.fromEntries(w.map(x=>[x.simplified,x])); for(const s of ['你好','谢谢','朋友','喜欢']) if(by[s]) console.log(s, JSON.stringify(by[s].meanings));"
node -e "const fs=require('fs'); for(const ch of ['见','好','爱']){const hex=ch.codePointAt(0).toString(16).padStart(4,'0'); console.log(ch, JSON.stringify(JSON.parse(fs.readFileSync('apps/web/public/content/characters/'+hex+'.json','utf8')).definition));}"
node -e "const u=require('./apps/web/public/content/units/l1-u01.json'); console.log(JSON.stringify(u.sentences[0]));"
```
Confirm meanings/definitions/sentence `vi` are genuinely Vietnamese (not leftover English), and hanViet fields from P1 are untouched.

- [ ] **Step 3: Confirm scope discipline**

`git diff --stat apps/web/public/content` should show `words.json`, every `characters/*.json` (meanings/definitions changed), every `units/*.json` (sentences/grammar content changed), and `manifest.json` (version only) — and NOTHING about unit membership/order/titles (`manifest.json`'s `units`/`levels` arrays, aside from `version`/`generatedAt`, must be byte-identical to before this phase — verify with the same before/after manifest diff technique used in P0/P1).

- [ ] **Step 4: Full test sweep**

Run: `pnpm -r --if-present typecheck && pnpm -r --if-present test`
Expected: content, web, worker suites all green.

- [ ] **Step 5: Commit regenerated content**

```bash
git add -f apps/web/public/content
git commit -m "chore(content): regenerate output with Vietnamese meanings, definitions, sentences, and grammar"
```

---

## Self-Review (author's checklist — completed)

- **Spec coverage:** P2 items from spec §10 — meanings/char-definitions seeded + gap-filled (Tasks 1-3), pipeline wiring with transitional fallback (Task 4), sentence field rename + translation (Tasks 5-8), grammar translation (folded into 6-8, per-level alongside their example sentences for context), web fully Vietnamese (Task 9), regenerate (Task 10). `alternates[].meanings` explicitly excluded (Global Constraints) ✅.
- **Ordering keeps every task green:** CVDICT parser (1) before the seed script (2) before gap-fill (3) before pipeline wiring (4) — by the time hsk.ts/characters.ts consume the Vietnamese maps, coverage is already 100%, so the "fallback" path is never actually exercised in practice, exactly as intended. Sentence field rename (5, structure-only) lands before content translation (6-8) so the pipeline never sees a broken shape. Web changes (9) come after all data changes so they operate on real Vietnamese content when manually spot-checked. ✅
- **Type consistency:** `HanVietResolver`/P1 fields untouched; `Sentence.vi`/`AuthoredSentence.vi` renamed consistently across types.ts, placement.ts, validate.ts, and every web consumer (LessonFlow, generate.ts, types.ts, FillBlank/SentenceBuilder/MatchPairs); `matchWordMeanings`/`matchCharDefinition` signatures match between their Task 2 test and implementation. ✅
- **No placeholders:** every code step has real, complete code (parser, converter, loader helper, wiring, exact web renames with line-anchored quotes from the actual current files). Bulk translation content (thousands of sentences/meanings) cannot be pre-written in a planning document — those tasks instead specify the exact acceptance test (coverage/non-emptiness), a concrete matching algorithm with a hand-verified oracle (Task 2), and an explicit spot-check/verification procedure (Tasks 3, 6-8), consistent with how P1 handled the 899-entry Hán Việt char-map. ✅
- **Deferred to later phases (not P2):** curriculum reorder for L1 (P3), thematic curation for L2/L3 (P4/P5) — unit membership/order/titles are explicitly frozen in this phase's Global Constraints.
