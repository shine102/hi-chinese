# P1 — Âm Hán Việt (Sino-Vietnamese readings) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add âm Hán Việt (Sino-Vietnamese readings) at both character and word level to all HSK1-3 content, and surface them in the learning UI next to pinyin — without changing the teaching meaning language (English stays in P1).

**Architecture:** Hán Việt is committed *authored* data (`packages/content/src/authored/hanviet/`): a `char-map.json` giving one default Title-Case reading per character, plus a `word-overrides.json` for polyphone/idiom words whose correct word-level reading is not the naive join of its characters' defaults. A new pipeline module `hanviet.ts` turns those maps into a resolver; `hsk.ts` and `characters.ts` populate a new `hanViet` field on `Word` and `CharacterData`; `validate.ts` enforces completeness (no fallback — a missing reading fails the build). The web app renders `hanViet` beside pinyin. Output is regenerated through the pipeline (`pnpm content:build`); `apps/web/public/content` is never hand-edited.

**Tech Stack:** TypeScript (Node ESM, `.js` import specifiers), vitest, tsx pipeline scripts; React + Vite + Tailwind web app (vitest + Testing Library).

**Spec:** `docs/superpowers/specs/2026-09-12-vietnamese-hanviet-localization-design.md` (this plan implements phase **P1** of that spec).

## Global Constraints

- **P1 adds Hán Việt only.** Do NOT translate meanings or touch English glosses in this phase — `word.meanings`, `character.definition`, `sentence.en`, grammar text all stay English. That is P2.
- **Completeness is mandatory, no fallback.** Every course character and every word must have a non-empty `hanViet`. A gap is a build failure (validation error), not a silent blank. There are 899 unique course characters and 2209 words.
- **Format:** each character reading is Title Case (first letter upper, rest lower), e.g. 见 → `"Kiến"`. A word reading is its characters' readings joined by a single space, e.g. 再见 → `"Tái Kiến"`, 谢谢 → `"Tạ Tạ"`. Word readings iterate the *raw* simplified string (duplicates preserved) — NOT the deduped `Word.characters`.
- **Authored source of truth:** all Hán Việt data lives in `packages/content/src/authored/hanviet/`. Regenerate `apps/web/public/content` via `pnpm content:build`. NEVER hand-edit files under `apps/web/public/content` (it is git-ignored but force-committed with `git add -f`).
- **Commits:** do NOT add any `Co-Authored-By: Claude` / co-committer trailer (user's global CLAUDE.md rule; overrides the harness attribution reminder).
- **Content review:** the generated Hán Việt readings are content that the human owner must review before merge (org content-review rule + spec §12 risk). The final finishing-branch merge is that gate.

---

### Task 1: Author `char-map.json` — Hán Việt for all 899 characters

**Files:**
- Create: `packages/content/src/authored/hanviet/char-map.json`
- Test: `packages/content/test/hanviet-data.test.ts`

**Interfaces:**
- Produces: `char-map.json` = `Record<string /*single Han character*/, string /*Title-Case Hán Việt*/>`. Later tasks (loader, resolver) consume it. The set of keys must be a superset of the 899 characters that appear in `apps/web/public/content/words.json` (extracted as the Han characters of every `word.simplified`).

**Notes for the implementer:**
- The authoritative character list is derived, not guessed: read `apps/web/public/content/words.json`, and for every entry take the Han characters (`\p{Script=Han}`) of `simplified`; the union is exactly 899 characters. `apps/web/public/content/manifest.json`'s `characters` array (899 entries, hex-named) is the same set for cross-checking counts.
- For each character supply the single most common everyday Hán Việt reading, Title Case. Use the character's pinyin (from `apps/web/public/content/characters/<hex>.json`, field `pinyin`) as a disambiguation aid when a character has more than one reading — pick the reading matching the pinyin used in the course. Seed from an authoritative Sino-Vietnamese source (Unihan `kVietnamese`) where available; otherwise author from standard Hán Việt. Correctness matters — this is the feature.
- Polyphones: `char-map.json` holds only the ONE default reading. Word-level corrections for the non-default reading go in `word-overrides.json` (Task 2), so choose the *most frequent* reading as the default here (e.g. 行 → `"Hành"`, not `"Hàng"`).

- [ ] **Step 1: Write the acceptance/coverage test (failing)**

Create `packages/content/test/hanviet-data.test.ts`. This test is the oracle for both Task 1 and Task 2 data files.

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

async function courseChars(): Promise<Set<string>> {
  const words = (await readJson(resolve(content, 'words.json'))) as { simplified: string }[];
  const set = new Set<string>();
  for (const w of words) for (const ch of w.simplified) if (HAN.test(ch)) set.add(ch);
  return set;
}

const TITLE = /^\p{Lu}[\p{Ll}\p{M}]*$/u; // one Title-Case syllable (allows combining marks for tones)

describe('char-map.json', () => {
  it('covers every course character', async () => {
    const map = (await readJson(resolve(authored, 'hanviet/char-map.json'))) as Record<string, string>;
    const missing = [...(await courseChars())].filter((ch) => !map[ch] || map[ch].trim() === '');
    expect(missing).toEqual([]);
  });

  it('every value is a single Title-Case syllable', async () => {
    const map = (await readJson(resolve(authored, 'hanviet/char-map.json'))) as Record<string, string>;
    const bad = Object.entries(map).filter(([, v]) => !TITLE.test(v));
    expect(bad).toEqual([]);
  });

  it('matches a hand-verified sample of high-frequency readings', async () => {
    const map = (await readJson(resolve(authored, 'hanviet/char-map.json'))) as Record<string, string>;
    const oracle: Record<string, string> = {
      我: 'Ngã', 你: 'Nhĩ', 好: 'Hảo', 他: 'Tha', 是: 'Thị', 不: 'Bất',
      谢: 'Tạ', 再: 'Tái', 见: 'Kiến', 人: 'Nhân', 中: 'Trung', 国: 'Quốc',
      学: 'Học', 生: 'Sinh', 老: 'Lão', 师: 'Sư', 名: 'Danh', 字: 'Tự',
      银: 'Ngân', 行: 'Hành', 文: 'Văn', 家: 'Gia', 有: 'Hữu',
    };
    for (const [ch, hv] of Object.entries(oracle)) expect(map[ch]).toBe(hv);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm -F @hi-chinese/content test hanviet-data`
Expected: FAIL (file `hanviet/char-map.json` does not exist / cannot be read).

- [ ] **Step 3: Produce `char-map.json`**

Create `packages/content/src/authored/hanviet/char-map.json` covering all 899 course characters, one Title-Case reading each, per the notes above. It is a flat JSON object sorted by character is not required but keep it valid JSON.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm -F @hi-chinese/content test hanviet-data`
Expected: the three `char-map.json` tests PASS (Task 2's `word-overrides` tests, added later in the same file, may not exist yet — keep them in Task 2).

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/authored/hanviet/char-map.json packages/content/test/hanviet-data.test.ts
git commit -m "feat(content): author Hán Việt char-map for all HSK1-3 characters"
```

---

### Task 2: Author `word-overrides.json` — polyphone/idiom word readings

**Files:**
- Create: `packages/content/src/authored/hanviet/word-overrides.json`
- Modify: `packages/content/test/hanviet-data.test.ts` (add a `word-overrides.json` describe block)

**Interfaces:**
- Consumes: `char-map.json` from Task 1 (to know each character's default reading).
- Produces: `word-overrides.json` = `Record<string /*simplified word*/, string /*correct Title-Case word reading, space-joined*/>`. Only for words whose correct reading differs from the naive join of character defaults.

**Notes for the implementer:**
- Compute, don't guess the candidate set: for each word in `words.json`, build the naive reading by joining `char-map[ch]` over the word's Han characters (duplicates preserved). A word needs an override only when a constituent character is a polyphone whose reading *in this word* differs from the default chosen in Task 1. The clearest signal: words containing a character that has more than one common Hán Việt reading (e.g. 行 Hành/Hàng, 长 Trường/Trưởng, 得 Đắc/Đắc, 中 Trung/Trúng, 教 Giáo/Giao, 重 Trọng/Trùng, 乐 Lạc/Nhạc, 好 Hảo/Háo, 觉 Giác/Giáo, 都 Đô/Đô…). Review each such word and, where the default join is wrong, add the corrected full word reading.
- Do NOT add an override that merely restates the default join — overrides are exceptions only. `谢谢` → `"Tạ Tạ"` and `再见` → `"Tái Kiến"` are correct by default and must NOT be listed.

- [ ] **Step 1: Add the word-overrides test block (failing)**

Append to `packages/content/test/hanviet-data.test.ts`:

```ts
describe('word-overrides.json', () => {
  it('is a valid string→string map with Title-Case space-joined values', async () => {
    const ov = (await readJson(resolve(authored, 'hanviet/word-overrides.json'))) as Record<string, string>;
    const bad = Object.entries(ov).filter(
      ([, v]) => v.trim() === '' || v.split(' ').some((s) => !TITLE.test(s)),
    );
    expect(bad).toEqual([]);
  });

  it('includes the known 行=Hàng polyphone words and not redundant defaults', async () => {
    const ov = (await readJson(resolve(authored, 'hanviet/word-overrides.json'))) as Record<string, string>;
    expect(ov['银行']).toBe('Ngân Hàng');
    // default-correct words must NOT be overridden
    expect(ov['谢谢']).toBeUndefined();
    expect(ov['再见']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm -F @hi-chinese/content test hanviet-data`
Expected: FAIL (`word-overrides.json` missing).

- [ ] **Step 3: Produce `word-overrides.json`**

Create `packages/content/src/authored/hanviet/word-overrides.json` per the notes. If `银行` is present in the course it must map to `"Ngân Hàng"`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm -F @hi-chinese/content test hanviet-data`
Expected: all `hanviet-data` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/authored/hanviet/word-overrides.json packages/content/test/hanviet-data.test.ts
git commit -m "feat(content): author Hán Việt word-overrides for polyphone words"
```

---

### Task 3: `hanviet.ts` resolver module + authored loader wiring

**Files:**
- Create: `packages/content/src/pipeline/hanviet.ts`
- Modify: `packages/content/src/pipeline/authored.ts` (add hanViet maps to `Authored`)
- Test: `packages/content/test/hanviet.test.ts`
- Test: `packages/content/test/authored.test.ts` (extend for the new maps)

**Interfaces:**
- Produces:
  ```ts
  // hanviet.ts
  export interface AuthoredHanViet {
    charMap: Record<string, string>;
    wordOverrides: Record<string, string>;
  }
  export interface HanVietResolver {
    char(ch: string): string;              // '' if unknown
    word(simplified: string): string;      // '' if any Han char unknown and no override
  }
  export function makeHanViet(data: AuthoredHanViet): HanVietResolver;
  ```
- Modifies `Authored` (authored.ts) to add `hanViet: AuthoredHanViet`. `loadAuthored` reads `hanviet/char-map.json` and `hanviet/word-overrides.json`; a missing file yields `{}` (tolerant, like `pinyin-overrides.json`).
- Consumed by Task 4 (run.ts/hsk.ts/characters.ts).

- [ ] **Step 1: Write `hanviet.ts` tests (failing)**

Create `packages/content/test/hanviet.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeHanViet } from '../src/pipeline/hanviet.js';

const data = {
  charMap: { 再: 'Tái', 见: 'Kiến', 谢: 'Tạ', 银: 'Ngân', 行: 'Hành' },
  wordOverrides: { 银行: 'Ngân Hàng' },
};

describe('makeHanViet', () => {
  const hv = makeHanViet(data);

  it('returns a character reading', () => {
    expect(hv.char('见')).toBe('Kiến');
  });

  it('returns empty string for an unknown character', () => {
    expect(hv.char('猫')).toBe('');
  });

  it('joins character readings with a space, preserving duplicates', () => {
    expect(hv.word('再见')).toBe('Tái Kiến');
    expect(hv.word('谢谢')).toBe('Tạ Tạ');
  });

  it('applies a word override', () => {
    expect(hv.word('银行')).toBe('Ngân Hàng');
  });

  it('returns empty string when a constituent character is unknown and there is no override', () => {
    expect(hv.word('猫见')).toBe('');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm -F @hi-chinese/content test hanviet.test`
Expected: FAIL (`hanviet.js` not found).

- [ ] **Step 3: Implement `hanviet.ts`**

```ts
import type { AuthoredHanViet, HanVietResolver } from '../types.js';

const HAN = /\p{Script=Han}/u;

export function makeHanViet(data: AuthoredHanViet): HanVietResolver {
  const { charMap, wordOverrides } = data;
  const char = (ch: string): string => charMap[ch] ?? '';
  const word = (simplified: string): string => {
    const override = wordOverrides[simplified];
    if (override !== undefined) return override;
    const parts: string[] = [];
    for (const ch of simplified) {
      if (!HAN.test(ch)) continue;
      const r = charMap[ch];
      if (r === undefined) return '';
      parts.push(r);
    }
    return parts.join(' ');
  };
  return { char, word };
}
```

> Put `AuthoredHanViet` and `HanVietResolver` in `types.ts` (Task 4 also edits `types.ts`; defining them here keeps the module import clean). If you prefer to keep them in `hanviet.ts`, re-export from there — but run.ts/authored.ts must import a single canonical definition. This plan assumes they live in `types.ts`.

- [ ] **Step 4: Add the types to `types.ts`**

Append to `packages/content/src/types.ts`:

```ts
export interface AuthoredHanViet {
  charMap: Record<string, string>;
  wordOverrides: Record<string, string>;
}

export interface HanVietResolver {
  char(ch: string): string;
  word(simplified: string): string;
}
```

- [ ] **Step 5: Extend the authored loader**

In `packages/content/src/pipeline/authored.ts`:
- Import `AuthoredHanViet` from `../types.js`.
- Add `hanViet: AuthoredHanViet` to the `Authored` interface.
- Add a helper to read a JSON object file tolerantly (ENOENT → `{}`), reusing the same pattern as `pinyin-overrides.json`:

```ts
async function readJsonObject<T>(path: string): Promise<T> {
  let text: string | undefined;
  try {
    text = await readFile(path, 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`${path}: invalid JSON: ${(e as Error).message}`);
  }
}
```

- In `loadAuthored`, add to the returned object:

```ts
hanViet: {
  charMap: await readJsonObject<Record<string, string>>(join(authoredDir, 'hanviet', 'char-map.json')),
  wordOverrides: await readJsonObject<Record<string, string>>(join(authoredDir, 'hanviet', 'word-overrides.json')),
},
```

- [ ] **Step 6: Extend `authored.test.ts`**

Add a test asserting `loadAuthored` reads the hanviet maps from a temp authored dir (follow the existing test's fixture style), and that a dir with no `hanviet/` yields `{ charMap: {}, wordOverrides: {} }`.

- [ ] **Step 7: Run tests + typecheck**

Run: `pnpm -F @hi-chinese/content test hanviet.test authored.test`
Run: `pnpm -F @hi-chinese/content typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/content/src/pipeline/hanviet.ts packages/content/src/pipeline/authored.ts packages/content/src/types.ts packages/content/test/hanviet.test.ts packages/content/test/authored.test.ts
git commit -m "feat(content): add hanviet resolver module and authored loader wiring"
```

---

### Task 4: Populate `hanViet` on Word/CharacterData + validation

**Files:**
- Modify: `packages/content/src/types.ts` (add `hanViet` to `Word` and `CharacterData`)
- Modify: `packages/content/src/pipeline/hsk.ts` (set `word.hanViet`)
- Modify: `packages/content/src/pipeline/characters.ts` (set `character.hanViet`)
- Modify: `packages/content/src/pipeline/run.ts` (build resolver, thread it down)
- Modify: `packages/content/src/pipeline/validate.ts` (completeness rules)
- Test: `packages/content/test/hsk.test.ts`, `characters.test.ts`, `validate.test.ts`, `run.test.ts` (whichever exist; extend)

**Interfaces:**
- Consumes: `makeHanViet` / `HanVietResolver` (Task 3), `inputs.authored.hanViet` (Task 3).
- `Word` gains `hanViet: string`; `CharacterData` gains `hanViet: string`. This is a required field: every constructor of these types must set it (compilation forces this — search the repo for object literals building `Word`/`CharacterData`, including test factories).

- [ ] **Step 1: Add fields to `types.ts`**

- `Word`: add `hanViet: string;` (place after `pinyinNumeric` for readability).
- `CharacterData`: add `hanViet: string;` (place after `pinyin`).

- [ ] **Step 2: Thread resolver into `hsk.ts`**

`normalizeWord` and `parseHskWords` take an extra parameter `hanViet: HanVietResolver`. In `normalizeWord` set `hanViet: hanViet.word(entry.simplified)` on the returned word. Update the `parseHskWords` signature to forward it. Update `hsk.test.ts` call sites (pass a stub resolver, e.g. `{ char: () => 'X', word: () => 'X X' }`).

- [ ] **Step 3: Thread resolver into `characters.ts`**

`buildCharacters(dictionaryText, graphicsText, words, charHanViet: (ch: string) => string)` — set `hanViet: charHanViet(ch)` on each `CharacterData`. Update `characters.test.ts` call sites (pass `() => 'X'`).

- [ ] **Step 4: Wire `run.ts`**

```ts
import { makeHanViet } from './hanviet.js';
// ...
const hanViet = makeHanViet(inputs.authored.hanViet);
const parsed = parseHskWords(entries, inputs.authored.overrides, hanViet);
// ...
const { characters, missing } = buildCharacters(
  inputs.dictionaryText,
  inputs.graphicsText,
  words,
  (ch) => hanViet.char(ch),
);
```

- [ ] **Step 5: Add validation rules to `validate.ts`**

In the words loop: `if (w.hanViet.trim() === '') err('word-hanviet', w.id, \`${w.simplified} has no hanViet\`);`
In the characters loop: `if (c.hanViet.trim() === '') err('char-hanviet', c.character, \`${c.character} has no hanViet\`);`
Add matching cases to `validate.test.ts` (a word/character with empty `hanViet` produces the error; a populated one does not). Update any existing validate-test fixtures that build `Word`/`CharacterData` to include `hanViet`.

- [ ] **Step 6: Fix all remaining `Word`/`CharacterData` construction sites**

Compilation will fail wherever a `Word` or `CharacterData` literal omits `hanViet`. Find them (`rg "unitId: ''"` for word factories, plus test helpers like `units.test.ts`'s `mk`) and add `hanViet` (a stub string is fine in unit-test factories).

- [ ] **Step 7: Run the whole content suite + typecheck**

Run: `pnpm -F @hi-chinese/content typecheck && pnpm -F @hi-chinese/content test`
Expected: PASS. (The real-pipeline/reproduce test now exercises the full char-map from Tasks 1-2, so it needs those complete — they are.)

- [ ] **Step 8: Commit**

```bash
git add packages/content/src
git add packages/content/test
git commit -m "feat(content): populate hanViet on words and characters; validate completeness"
```

---

### Task 5: Web — render Hán Việt beside pinyin

**Files:**
- Modify: `apps/web/src/lessons/LessonFlow.tsx`
- Modify: `apps/web/src/character/CharacterPage.tsx`
- Modify: `apps/web/src/hanzi/StrokesSheet.tsx`
- Modify: `apps/web/src/exercises/components/WriteIt.tsx`
- Test: co-located component tests where they exist (extend), or add a focused render test.

**Interfaces:**
- Consumes: `Word.hanViet`, `CharacterData.hanViet` (Task 4). The `@hi-chinese/content` types are re-exported to the web app already.

**Notes:** ADD Hán Việt; do not remove English. Keep it visually subordinate to the character but paired with pinyin (a smaller muted line). Suggested style: a `text-stone-500`/`italic` span or line right under/after pinyin.

- [ ] **Step 1: LessonFlow word slides**

- Word intro slide (`WordIntroSlide`, ~L112): under the pinyin line add
  `{word.hanViet && <div className="text-base italic text-stone-500">{word.hanViet}</div>}`.
- Word writing recap (`WordWritingSlide`, ~L136): change the line to include hanViet, e.g.
  `{word.simplified} — {word.pinyin}{word.hanViet && ` · ${word.hanViet}`}`.
- Review list (`ReviewIntroSlide`, ~L190): add a muted hanViet span after pinyin.

- [ ] **Step 2: CharacterPage**

- Header (~L65): after the pinyin span add `{data.hanViet && <span className="text-lg italic text-stone-500">{data.hanViet}</span>}`.
- Course-words list (~L87): add a muted hanViet span after `w.pinyin`.

- [ ] **Step 3: StrokesSheet**

- (~L57) after the pinyin line add `{data.hanViet && <div className="text-sm italic text-stone-500">{data.hanViet}</div>}`.

- [ ] **Step 4: WriteIt exercise prompt**

- (~L27/L36) the prompt shows a character's pinyin; add its `hanViet` under it (from `charData?.hanViet`).

- [ ] **Step 5: Tests**

Add/extend a render test asserting a word's `hanViet` appears on the intro slide and a character's `hanViet` appears on the character page. Use existing test utilities/fixtures; ensure fixtures include `hanViet`.

- [ ] **Step 6: Run web tests + typecheck**

Run: `pnpm -F @hi-chinese/web typecheck && pnpm -F @hi-chinese/web test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): show âm Hán Việt beside pinyin in lessons and character page"
```

---

### Task 6: Regenerate content + full verification

**Files:**
- Modify (generated): `apps/web/public/content/**` (force-added)

- [ ] **Step 1: Regenerate**

Run: `pnpm content:build`
Expected: succeeds (exit 0), prints counts (words 2209, characters 899, units 184). A failure here means a Hán Việt gap — fix the data (Task 1/2), do not weaken validation.

- [ ] **Step 2: Spot-check the output**

```bash
node -e "const w=require('./apps/web/public/content/words.json'); const byId=Object.fromEntries(w.map(x=>[x.simplified,x])); for(const s of ['再见','谢谢','银行','中国']) if(byId[s]) console.log(s, JSON.stringify(byId[s].hanViet));"
```
Expected: `再见 "Tái Kiến"`, `谢谢 "Tạ Tạ"`, `银行 "Ngân Hàng"` (for whichever are in-course). Confirm no `words.json` entry has empty `hanViet`:
```bash
node -e "const w=require('./apps/web/public/content/words.json'); const bad=w.filter(x=>!x.hanViet||!x.hanViet.trim()); console.log('empty word hanViet:', bad.length);"
```
Expected: `0`.

- [ ] **Step 3: Confirm P1 did not change teaching structure**

`git diff --stat apps/web/public/content` should show the JSON files changed only by the added `hanViet` field (and the manifest `version` hash). Unit membership, titles, order, sentences, grammar, and English meanings are unchanged. Sanity: `git diff apps/web/public/content/manifest.json` shows only `version`/`generatedAt` moved.

- [ ] **Step 4: Full test sweep**

Run: `pnpm -r --if-present typecheck && pnpm -r --if-present test`
Expected: content, web, worker suites all green.

- [ ] **Step 5: Commit regenerated content**

```bash
git add -f apps/web/public/content
git commit -m "chore(content): regenerate output with âm Hán Việt"
```

---

## Self-Review (author's checklist — completed)

- **Spec coverage:** P1 items from spec §10 — `char-map` (Task 1), `word-overrides` (Task 2), `hanviet.ts` (Task 3), `hanViet` field (Task 4), web display (Task 5), regenerate (Task 6). English stays the meaning language (Global Constraints) ✅. Validate rules from spec §7 (word/char hanViet non-empty; every course char in char-map — enforced transitively by the completeness + coverage tests) ✅.
- **Ordering keeps every task green:** data files (1,2) land before the type/populate task (4), so the real-pipeline test in Task 4 has a complete char-map. Task 3 (module + loader) does not add the required `hanViet` field, so it compiles without data. ✅
- **Type consistency:** `HanVietResolver.word(simplified)` takes the raw string (duplicates preserved) — NOT `Word.characters` (deduped by `uniqueHanChars`), so 谢谢 → "Tạ Tạ". `char()`/`word()` names match across hanviet.ts, run.ts, characters.ts. ✅
- **No placeholders:** every code/test step has real content; the acceptance oracle (Task 1/2 tests) is hand-verified. ✅
- **Deferred to later phases (not P1):** Vietnamese meanings/definitions/sentences/grammar (P2); curriculum reorder (P3–P5); exercise multiple-choice hanViet sub-prompt is optional and omitted to keep P1 tight.
