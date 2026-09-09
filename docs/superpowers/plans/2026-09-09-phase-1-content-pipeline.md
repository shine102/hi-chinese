# Phase 1: Workspace and Content Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the pnpm workspace and build the `packages/content` pipeline that turns open HSK 3.0 and Make Me a Hanzi data plus authored grammar/sentences into validated JSON chunks under `apps/web/public/content/`.

**Architecture:** Pure, unit-tested functions for each pipeline stage (parse words, choose readings, assign units, place sentences and grammar, extract characters, validate, write chunks), composed by one CLI script. Raw downloads are cached in a git-ignored `raw/` directory. Authored content lives in JSON under `src/authored/` and is placed into units automatically by the words it uses.

**Tech Stack:** Node 22, pnpm 10, TypeScript 5.9, Vitest 4.1, tsx for scripts. No runtime dependencies in the content package.

**Spec:** `docs/superpowers/specs/2026-09-09-hi-chinese-design.md` (section 3 is the one this plan implements; section 2 for layout). Also read `docs/superpowers/plans/README.md` for source-verification findings.

## Global Constraints

- Package manager is pnpm 10 via corepack (`corepack enable && corepack prepare pnpm@10.34.5 --activate`). Never commit `package-lock.json`.
- Vitest is pinned to `4.1.x` everywhere (Cloudflare's test plugin, used in Phase 2, requires it).
- TypeScript `strict: true`, ES modules only (`"type": "module"`), target ES2022, `moduleResolution: "bundler"`.
- `packages/content` has zero runtime dependencies. Dev dependencies only.
- Word ids are `w:<simplified>`. Unit ids are `l<level>-u<two-digit index>` (e.g. `l1-u01`). Character chunks are named by 4+ hex digit code point (e.g. `4f60.json` for 你).
- Every sentence uses only words from its unit or earlier; the build fails otherwise.
- Raw data directory `packages/content/raw/` and build output `apps/web/public/content/` are git-ignored.
- Commit messages: conventional prefix (`feat:`, `test:`, `chore:`, `docs:`). Do not add a Co-Authored-By trailer (user preference).
- Commit author: `git -c user.name=lamnnt -c user.email=lamnnt@ssi.com.vn commit ...` unless git identity is already configured globally (check with `git config user.email`).

## Data sources (verified 2026-09-09)

| Source               | URL                                                                                       | Cached as            | Notes                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| HSK 3.0 words        | `https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json` | `raw/complete.json`  | JSON array, 11470 entries. Levels tagged `new-1`..`new-7`, `old-1`..`old-6`, `newest-*`. Use `new-1..3`: 2209 unique words. MIT. |
| Character dictionary | `https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt`           | `raw/dictionary.txt` | 9574 lines, one JSON object per line: `character, definition?, pinyin[], decomposition, radical, matches, etymology?`. ~2.5 MB.  |
| Character strokes    | `https://raw.githubusercontent.com/skishore/makemeahanzi/master/graphics.txt`             | `raw/graphics.txt`   | One JSON object per line: `character, strokes: string[], medians: number[][][]`. ~30 MB.                                         |

Sample HSK entry (fields we use):

```json
{
  "simplified": "爱好",
  "radical": "爫",
  "level": ["new-1", "old-3"],
  "frequency": 4902,
  "pos": ["n", "v"],
  "forms": [
    {
      "traditional": "愛好",
      "transcriptions": { "pinyin": "ài hào", "numeric": "ai4 hao4" },
      "meanings": ["to like; to be fond of; to take pleasure in; to be keen on", "interest; hobby"],
      "classifiers": ["个"]
    }
  ]
}
```

Known data quirks the code must handle:

- Several forms may share the same `numeric` pinyin (e.g. 个 has `ge4` twice); merge them.
- Forms are not ordered by commonness (说 lists `shui4` before `shuo1`). Capitalized pinyin (`Ye3`, `Du1`) marks surname/proper-noun readings.
- 9 words have no `pos`; treat as empty array. Frequency: lower = more common, always present.
- First 12 level-1 words by frequency are exactly: 的 了 我 是 你 在 不 有 他 这 就 个 (this is unit `l1-u01`; the seed sentences in Task 10 rely on it).

## File structure

```
package.json                       pnpm workspace root: scripts, shared dev deps (typescript, vitest, prettier)
pnpm-workspace.yaml
tsconfig.base.json                 strict ESM base config
.gitignore
.prettierrc
.npmrc
packages/content/
  package.json                     name @hi-chinese/content, scripts: test, build, fetch, report:readings
  tsconfig.json
  vitest.config.ts
  src/index.ts                     re-exports types + ids
  src/types.ts                     content types shared with web and worker (Word, CharacterData, Sentence, GrammarPoint, Unit, chunks, manifest, authored input)
  src/ids.ts                       id helpers, uniqueHanChars
  src/pipeline/hsk.ts              RawHskEntry types, mergeForms, chooseReading, normalizeWord, parseHskWords
  src/pipeline/fetch.ts            SOURCES, fetchRaw with injectable downloader
  src/pipeline/characters.ts       parseJsonLines, buildCharacters
  src/pipeline/units.ts            assignUnits
  src/pipeline/placement.ts        placeSentences, placeGrammar, attachToUnits
  src/pipeline/validate.ts         validateContent
  src/pipeline/build.ts            computeVersion, writeContent
  src/pipeline/authored.ts         loadAuthored (reads src/authored/**.json)
  src/authored/pinyin-overrides.json
  src/authored/sentences/level1.json
  src/authored/grammar/level1.json
  scripts/build.ts                 CLI: full pipeline
  scripts/fetch.ts                 CLI: download only
  scripts/report-readings.ts       CLI: list multi-reading words + chosen reading
  test/*.test.ts                   one file per pipeline module
  test/fixtures/                   small raw samples
  raw/                             git-ignored downloads
apps/web/public/content/           git-ignored build output (directory created by the build)
```

---

### Task 1: Workspace scaffold

**Files:**

- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.prettierrc`, `.npmrc`
- Create: `packages/content/package.json`, `packages/content/tsconfig.json`, `packages/content/vitest.config.ts`
- Create: `packages/content/src/index.ts`, `packages/content/test/smoke.test.ts`

**Interfaces:**

- Produces: workspace commands `pnpm test`, `pnpm -F @hi-chinese/content test`, `pnpm typecheck`.

- [ ] **Step 1: Enable pnpm and write root config**

```bash
cd /home/shine/work/code/hi-chinese
corepack enable && corepack prepare pnpm@10.34.5 --activate && pnpm --version
```

`package.json`:

```json
{
  "name": "hi-chinese",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.34.5",
  "engines": { "node": ">=22" },
  "scripts": {
    "test": "pnpm -r --if-present test",
    "typecheck": "pnpm -r --if-present typecheck",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "content:fetch": "pnpm -F @hi-chinese/content fetch",
    "content:build": "pnpm -F @hi-chinese/content build"
  },
  "devDependencies": {
    "prettier": "^3.6.0",
    "typescript": "~5.9.0",
    "vitest": "~4.1.11"
  }
}
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true
  }
}
```

`.gitignore`:

```
node_modules/
dist/
coverage/
.wrangler/
.dev.vars
packages/content/raw/
apps/web/public/content/
*.log
```

`.prettierrc`:

```json
{ "semi": true, "singleQuote": true, "printWidth": 100, "trailingComma": "all" }
```

`.npmrc`:

```
engine-strict=true
```

- [ ] **Step 2: Write the content package config**

`packages/content/package.json`:

```json
{
  "name": "@hi-chinese/content",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "fetch": "tsx scripts/fetch.ts",
    "build": "tsx scripts/build.ts",
    "report:readings": "tsx scripts/report-readings.ts"
  },
  "devDependencies": {
    "@types/node": "^22.15.0",
    "tsx": "^4.20.0",
    "typescript": "~5.9.0",
    "vitest": "~4.1.11"
  }
}
```

`packages/content/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["node"], "noEmit": true },
  "include": ["src", "scripts", "test"]
}
```

`packages/content/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['test/**/*.test.ts'] },
});
```

`packages/content/src/index.ts`:

```ts
export * from './types.js';
export * from './ids.js';
```

(`types.ts` and `ids.ts` are created in Task 2; for this task create them as empty files containing only `export {};` so the smoke test compiles.)

- [ ] **Step 3: Write a smoke test**

`packages/content/test/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('workspace', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Install and run**

```bash
pnpm install
pnpm -F @hi-chinese/content test
pnpm typecheck
```

Expected: 1 test passes; typecheck prints nothing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm workspace and content package"
```

---

### Task 2: Shared content types and id helpers

**Files:**

- Create: `packages/content/src/types.ts`, `packages/content/src/ids.ts`
- Test: `packages/content/test/ids.test.ts`

**Interfaces:**

- Produces (used by every later task):

```ts
// types.ts
export type HskLevel = 1 | 2 | 3;
export interface WordReading {
  pinyin: string;
  pinyinNumeric: string;
  meanings: string[];
}
export interface Word {
  id: string;
  simplified: string;
  traditional: string;
  pinyin: string;
  pinyinNumeric: string;
  meanings: string[];
  alternates: WordReading[];
  pos: string[];
  classifiers: string[];
  level: HskLevel;
  frequency: number;
  characters: string[];
  unitId: string;
}
export interface CharacterData {
  character: string;
  strokes: string[];
  medians: number[][][];
  pinyin: string[];
  definition: string | null;
  radical: string;
  decomposition: string;
  wordIds: string[];
}
export interface Sentence {
  id: string;
  zh: string;
  pinyin: string;
  en: string;
  wordIds: string[];
  unitId: string;
}
export interface GrammarPoint {
  id: string;
  title: string;
  pattern: string;
  explanation: string;
  level: HskLevel;
  sentenceIds: string[];
  unitId: string;
}
export interface Unit {
  id: string;
  level: HskLevel;
  order: number;
  title: string;
  wordIds: string[];
  grammarIds: string[];
  sentenceIds: string[];
}
export interface UnitChunk {
  unit: Unit;
  grammar: GrammarPoint[];
  sentences: Sentence[];
}
export interface ManifestUnit {
  id: string;
  level: HskLevel;
  order: number;
  title: string;
  wordCount: number;
  grammarCount: number;
}
export interface ContentManifest {
  version: string;
  generatedAt: string;
  levels: { level: HskLevel; title: string; unitIds: string[] }[];
  units: ManifestUnit[];
  counts: { words: number; characters: number; grammar: number; sentences: number; units: number };
}
export interface ContentBundle {
  words: Word[];
  characters: CharacterData[];
  units: Unit[];
  grammar: GrammarPoint[];
  sentences: Sentence[];
}
export interface AuthoredSentence {
  id: string;
  zh: string;
  pinyin: string;
  en: string;
  words: string[];
}
export interface AuthoredGrammar {
  id: string;
  title: string;
  pattern: string;
  explanation: string;
  level: HskLevel;
  examples: string[];
}
export type PinyinOverrides = Record<string, string>;
// ids.ts
export function wordId(simplified: string): string;
export function unitId(level: HskLevel, indexInLevel: number): string;
export function characterFileName(ch: string): string;
export function uniqueHanChars(text: string): string[];
```

- [ ] **Step 1: Write the failing test**

`packages/content/test/ids.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { characterFileName, uniqueHanChars, unitId, wordId } from '../src/ids.js';

describe('ids', () => {
  it('builds word ids from simplified form', () => {
    expect(wordId('爱好')).toBe('w:爱好');
  });
  it('builds zero-padded unit ids', () => {
    expect(unitId(1, 1)).toBe('l1-u01');
    expect(unitId(3, 42)).toBe('l3-u42');
    expect(unitId(2, 105)).toBe('l2-u105');
  });
  it('names character files by hex code point', () => {
    expect(characterFileName('你')).toBe('4f60');
    expect(characterFileName('一')).toBe('4e00');
  });
  it('extracts unique Han characters in order, dropping punctuation and latin', () => {
    expect(uniqueHanChars('你好，你好吗？OK')).toEqual(['你', '好', '吗']);
    expect(uniqueHanChars('')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @hi-chinese/content test -- ids`
Expected: FAIL, `wordId` is not exported.

- [ ] **Step 3: Write types and ids**

`packages/content/src/types.ts`: paste the full interface block from **Interfaces** above (all `export interface` / `export type` lines, one per declaration, with each field on its own line).

`packages/content/src/ids.ts`:

```ts
import type { HskLevel } from './types.js';

export function wordId(simplified: string): string {
  return `w:${simplified}`;
}

export function unitId(level: HskLevel, indexInLevel: number): string {
  return `l${level}-u${String(indexInLevel).padStart(2, '0')}`;
}

export function characterFileName(ch: string): string {
  const cp = ch.codePointAt(0);
  if (cp === undefined) throw new Error('characterFileName: empty string');
  return cp.toString(16).padStart(4, '0');
}

const HAN = /\p{Script=Han}/u;

export function uniqueHanChars(text: string): string[] {
  const seen = new Set<string>();
  for (const ch of text) {
    if (HAN.test(ch) && !seen.has(ch)) seen.add(ch);
  }
  return [...seen];
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm -F @hi-chinese/content test && pnpm -F @hi-chinese/content typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/types.ts packages/content/src/ids.ts packages/content/test/ids.test.ts
git commit -m "feat(content): add shared content types and id helpers"
```

---

### Task 3: Parse HSK words and choose readings

**Files:**

- Create: `packages/content/src/pipeline/hsk.ts`
- Test: `packages/content/test/hsk.test.ts`

**Interfaces:**

- Consumes: `Word`, `WordReading`, `HskLevel`, `PinyinOverrides` from `types.ts`; `wordId`, `uniqueHanChars` from `ids.ts`.
- Produces:

```ts
export interface RawHskForm {
  traditional: string;
  transcriptions: { pinyin: string; numeric: string };
  meanings: string[];
  classifiers?: string[];
}
export interface RawHskEntry {
  simplified: string;
  radical: string;
  level: string[];
  frequency: number;
  pos?: string[];
  forms: RawHskForm[];
}
export function hskLevelOf(entry: RawHskEntry): HskLevel | null;
export function mergeForms(forms: RawHskForm[]): RawHskForm[]; // same numeric → one form, meanings concatenated (deduped)
export function chooseReading(
  entry: RawHskEntry,
  overrides: PinyinOverrides,
): { chosen: RawHskForm; others: RawHskForm[] };
export function normalizeWord(entry: RawHskEntry, overrides: PinyinOverrides): Word | null; // null if not level 1-3
export function parseHskWords(entries: RawHskEntry[], overrides: PinyinOverrides): Word[]; // level 1-3 only, deduped by simplified, sorted by level then frequency then simplified
```

- [ ] **Step 1: Write the failing tests**

`packages/content/test/hsk.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  chooseReading,
  hskLevelOf,
  mergeForms,
  normalizeWord,
  parseHskWords,
  type RawHskEntry,
  type RawHskForm,
} from '../src/pipeline/hsk.js';

const form = (numeric: string, pinyin: string, meanings: string[]): RawHskForm => ({
  traditional: 'X',
  transcriptions: { pinyin, numeric },
  meanings,
  classifiers: [],
});

const shuo: RawHskEntry = {
  simplified: '说',
  radical: '讠',
  level: ['new-1', 'old-1'],
  frequency: 46,
  pos: ['v'],
  forms: [
    form('shui4', 'shuì', ['to persuade']),
    form('shuo1', 'shuō', ['to speak', 'to say', 'to explain', 'to scold']),
    form('shuo1', 'shuō', ['variant of 說']),
  ],
};

const ye: RawHskEntry = {
  simplified: '也',
  radical: '乙',
  level: ['new-1'],
  frequency: 130,
  pos: ['d'],
  forms: [form('Ye3', 'Yě', ['surname Ye']), form('ye3', 'yě', ['also', 'too'])],
};

const le: RawHskEntry = {
  simplified: '了',
  radical: '乙',
  level: ['new-1'],
  frequency: 2,
  forms: [
    form('le5', 'le', ['(completed action marker)', '(modal particle)', '(change of state)']),
    form('liao3', 'liǎo', ['to finish', 'to settle', 'to understand', 'clear']),
  ],
};

const aihao: RawHskEntry = {
  simplified: '爱好',
  radical: '爫',
  level: ['new-1', 'old-3'],
  frequency: 4902,
  pos: ['n', 'v'],
  forms: [
    {
      traditional: '愛好',
      transcriptions: { pinyin: 'ài hào', numeric: 'ai4 hao4' },
      meanings: ['to like; to be fond of', 'interest; hobby'],
      classifiers: ['个'],
    },
  ],
};

const levelFour: RawHskEntry = { ...aihao, simplified: '抽象', level: ['new-4'] };

describe('hskLevelOf', () => {
  it('returns the lowest new-N level within 1..3', () => {
    expect(hskLevelOf(shuo)).toBe(1);
    expect(hskLevelOf({ ...shuo, level: ['new-3', 'new-2', 'old-6'] })).toBe(2);
  });
  it('returns null for words outside levels 1-3', () => {
    expect(hskLevelOf(levelFour)).toBeNull();
    expect(hskLevelOf({ ...shuo, level: ['old-1'] })).toBeNull();
  });
});

describe('mergeForms', () => {
  it('merges forms sharing the same numeric pinyin and dedupes meanings', () => {
    const merged = mergeForms(shuo.forms);
    expect(merged.map((f) => f.transcriptions.numeric)).toEqual(['shui4', 'shuo1']);
    expect(merged[1]!.meanings).toEqual([
      'to speak',
      'to say',
      'to explain',
      'to scold',
      'variant of 說',
    ]);
  });
});

describe('chooseReading', () => {
  it('prefers the reading with the most substantive meanings', () => {
    expect(chooseReading(shuo, {}).chosen.transcriptions.numeric).toBe('shuo1');
  });
  it('penalizes capitalized (proper noun) readings', () => {
    expect(chooseReading(ye, {}).chosen.transcriptions.numeric).toBe('ye3');
  });
  it('lets an override win', () => {
    expect(chooseReading(le, {}).chosen.transcriptions.numeric).toBe('liao3');
    const r = chooseReading(le, { 了: 'le5' });
    expect(r.chosen.transcriptions.numeric).toBe('le5');
    expect(r.others.map((f) => f.transcriptions.numeric)).toEqual(['liao3']);
  });
  it('throws a helpful error when an override does not match any form', () => {
    expect(() => chooseReading(le, { 了: 'le4' })).toThrow(/了.*le4.*le5, liao3/);
  });
});

describe('normalizeWord', () => {
  it('produces a Word with chosen reading, alternates, characters and empty unitId', () => {
    const w = normalizeWord(le, { 了: 'le5' })!;
    expect(w).toMatchObject({
      id: 'w:了',
      simplified: '了',
      traditional: 'X',
      pinyin: 'le',
      pinyinNumeric: 'le5',
      level: 1,
      frequency: 2,
      pos: [],
      classifiers: [],
      characters: ['了'],
      unitId: '',
    });
    expect(w.meanings).toHaveLength(3);
    expect(w.alternates).toEqual([
      {
        pinyin: 'liǎo',
        pinyinNumeric: 'liao3',
        meanings: ['to finish', 'to settle', 'to understand', 'clear'],
      },
    ]);
  });
  it('keeps classifiers and multi-character words', () => {
    const w = normalizeWord(aihao, {})!;
    expect(w.classifiers).toEqual(['个']);
    expect(w.characters).toEqual(['爱', '好']);
    expect(w.traditional).toBe('愛好');
  });
  it('returns null outside levels 1-3', () => {
    expect(normalizeWord(levelFour, {})).toBeNull();
  });
});

describe('parseHskWords', () => {
  it('filters, dedupes by simplified, and sorts by level, frequency, simplified', () => {
    const words = parseHskWords(
      [levelFour, aihao, shuo, { ...shuo }, le, { ...ye, level: ['new-2'] }],
      {},
    );
    expect(words.map((w) => w.simplified)).toEqual(['了', '说', '爱好', '也']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @hi-chinese/content test -- hsk`
Expected: FAIL, cannot find module `../src/pipeline/hsk.js`.

- [ ] **Step 3: Implement**

`packages/content/src/pipeline/hsk.ts`:

```ts
import { uniqueHanChars, wordId } from '../ids.js';
import type { HskLevel, PinyinOverrides, Word, WordReading } from '../types.js';

export interface RawHskForm {
  traditional: string;
  transcriptions: { pinyin: string; numeric: string };
  meanings: string[];
  classifiers?: string[];
}

export interface RawHskEntry {
  simplified: string;
  radical: string;
  level: string[];
  frequency: number;
  pos?: string[];
  forms: RawHskForm[];
}

const LEVELS: HskLevel[] = [1, 2, 3];

export function hskLevelOf(entry: RawHskEntry): HskLevel | null {
  for (const level of LEVELS) {
    if (entry.level.includes(`new-${level}`)) return level;
  }
  return null;
}

export function mergeForms(forms: RawHskForm[]): RawHskForm[] {
  const byNumeric = new Map<string, RawHskForm>();
  for (const f of forms) {
    const key = f.transcriptions.numeric;
    const existing = byNumeric.get(key);
    if (!existing) {
      byNumeric.set(key, {
        ...f,
        meanings: [...f.meanings],
        classifiers: [...(f.classifiers ?? [])],
      });
      continue;
    }
    for (const m of f.meanings) if (!existing.meanings.includes(m)) existing.meanings.push(m);
    for (const c of f.classifiers ?? [])
      if (!existing.classifiers!.includes(c)) existing.classifiers!.push(c);
  }
  return [...byNumeric.values()];
}

// Meanings that describe a rare or non-lexical reading, not the everyday one.
const WEAK_MEANING =
  /^(surname |variant of |old variant of |see |used in |erhua variant|\(old\)|abbr\. for )/i;

function readingScore(form: RawHskForm): number {
  let score = form.meanings.filter((m) => !WEAK_MEANING.test(m)).length;
  if (/^[A-Z]/.test(form.transcriptions.pinyin)) score -= 100;
  return score;
}

export function chooseReading(
  entry: RawHskEntry,
  overrides: PinyinOverrides,
): { chosen: RawHskForm; others: RawHskForm[] } {
  const forms = mergeForms(entry.forms);
  if (forms.length === 0) throw new Error(`${entry.simplified}: entry has no forms`);
  const override = overrides[entry.simplified];
  let chosen: RawHskForm | undefined;
  if (override !== undefined) {
    chosen = forms.find((f) => f.transcriptions.numeric === override);
    if (!chosen) {
      const available = forms.map((f) => f.transcriptions.numeric).join(', ');
      throw new Error(
        `pinyin override for ${entry.simplified} = "${override}" matches no form; available: ${available}`,
      );
    }
  } else {
    chosen = [...forms].sort((a, b) => readingScore(b) - readingScore(a))[0]!;
  }
  return { chosen, others: forms.filter((f) => f !== chosen) };
}

export function normalizeWord(entry: RawHskEntry, overrides: PinyinOverrides): Word | null {
  const level = hskLevelOf(entry);
  if (level === null) return null;
  const { chosen, others } = chooseReading(entry, overrides);
  const alternates: WordReading[] = others.map((f) => ({
    pinyin: f.transcriptions.pinyin,
    pinyinNumeric: f.transcriptions.numeric,
    meanings: f.meanings,
  }));
  return {
    id: wordId(entry.simplified),
    simplified: entry.simplified,
    traditional: chosen.traditional,
    pinyin: chosen.transcriptions.pinyin,
    pinyinNumeric: chosen.transcriptions.numeric,
    meanings: chosen.meanings,
    alternates,
    pos: entry.pos ?? [],
    classifiers: chosen.classifiers ?? [],
    level,
    frequency: entry.frequency,
    characters: uniqueHanChars(entry.simplified),
    unitId: '',
  };
}

export function parseHskWords(entries: RawHskEntry[], overrides: PinyinOverrides): Word[] {
  const seen = new Set<string>();
  const words: Word[] = [];
  for (const entry of entries) {
    if (seen.has(entry.simplified)) continue;
    const word = normalizeWord(entry, overrides);
    if (!word) continue;
    seen.add(entry.simplified);
    words.push(word);
  }
  words.sort(
    (a, b) =>
      a.level - b.level ||
      a.frequency - b.frequency ||
      a.simplified.localeCompare(b.simplified, 'zh'),
  );
  return words;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm -F @hi-chinese/content test && pnpm -F @hi-chinese/content typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/pipeline/hsk.ts packages/content/test/hsk.test.ts
git commit -m "feat(content): parse HSK 3.0 words and choose primary readings"
```

---

### Task 4: Raw data fetcher with cache

**Files:**

- Create: `packages/content/src/pipeline/fetch.ts`, `packages/content/scripts/fetch.ts`
- Test: `packages/content/test/fetch.test.ts`

**Interfaces:**

- Produces:

```ts
export const SOURCES: { hsk: { url; file }; dictionary: { url; file }; graphics: { url; file } };
export type SourceKey = keyof typeof SOURCES;
export type Downloader = (url: string) => Promise<string>;
export function fetchRaw(
  rawDir: string,
  download?: Downloader,
  log?: (msg: string) => void,
): Promise<Record<SourceKey, string>>; // returns absolute file paths
```

- [ ] **Step 1: Write the failing test**

`packages/content/test/fetch.test.ts`:

```ts
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SOURCES, fetchRaw } from '../src/pipeline/fetch.js';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'hi-chinese-fetch-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('fetchRaw', () => {
  it('downloads every missing source once and returns file paths', async () => {
    const calls: string[] = [];
    const download = async (url: string) => {
      calls.push(url);
      return `content of ${url}`;
    };
    const paths = await fetchRaw(dir, download, () => {});
    expect(calls.sort()).toEqual(
      Object.values(SOURCES)
        .map((s) => s.url)
        .sort(),
    );
    expect(paths.hsk).toBe(join(dir, 'complete.json'));
    expect(await readFile(paths.graphics, 'utf8')).toBe(`content of ${SOURCES.graphics.url}`);
  });

  it('skips sources whose file already exists', async () => {
    await writeFile(join(dir, 'complete.json'), '[]');
    const calls: string[] = [];
    await fetchRaw(
      dir,
      async (url) => {
        calls.push(url);
        return 'x';
      },
      () => {},
    );
    expect(calls).not.toContain(SOURCES.hsk.url);
    expect(calls).toHaveLength(2);
    expect(await readFile(join(dir, 'complete.json'), 'utf8')).toBe('[]');
  });

  it('does not leave a partial file when a download fails', async () => {
    await expect(
      fetchRaw(
        dir,
        async () => {
          throw new Error('boom');
        },
        () => {},
      ),
    ).rejects.toThrow('boom');
    await expect(readFile(join(dir, 'complete.json'), 'utf8')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @hi-chinese/content test -- fetch`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

`packages/content/src/pipeline/fetch.ts`:

```ts
import { access, mkdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const SOURCES = {
  hsk: {
    url: 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json',
    file: 'complete.json',
  },
  dictionary: {
    url: 'https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt',
    file: 'dictionary.txt',
  },
  graphics: {
    url: 'https://raw.githubusercontent.com/skishore/makemeahanzi/master/graphics.txt',
    file: 'graphics.txt',
  },
} as const;

export type SourceKey = keyof typeof SOURCES;
export type Downloader = (url: string) => Promise<string>;

export const defaultDownload: Downloader = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  return res.text();
};

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function fetchRaw(
  rawDir: string,
  download: Downloader = defaultDownload,
  log: (msg: string) => void = console.log,
): Promise<Record<SourceKey, string>> {
  await mkdir(rawDir, { recursive: true });
  const out = {} as Record<SourceKey, string>;
  for (const key of Object.keys(SOURCES) as SourceKey[]) {
    const { url, file } = SOURCES[key];
    const target = join(rawDir, file);
    out[key] = target;
    if (await exists(target)) {
      log(`cached  ${file}`);
      continue;
    }
    log(`fetch   ${url}`);
    const body = await download(url);
    const tmp = `${target}.part`;
    await writeFile(tmp, body, 'utf8');
    await rename(tmp, target);
    log(`saved   ${file} (${(body.length / 1e6).toFixed(1)} MB)`);
  }
  return out;
}
```

`packages/content/scripts/fetch.ts`:

```ts
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { fetchRaw } from '../src/pipeline/fetch.js';

const here = dirname(fileURLToPath(import.meta.url));
await fetchRaw(resolve(here, '../raw'));
```

- [ ] **Step 4: Run tests, then the real download**

```bash
pnpm -F @hi-chinese/content test
pnpm -F @hi-chinese/content fetch
ls -la packages/content/raw
```

Expected: tests pass; three files present (complete.json ~ 8 MB, dictionary.txt ~ 2.5 MB, graphics.txt ~ 30 MB). A second `pnpm -F @hi-chinese/content fetch` prints `cached` three times.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/pipeline/fetch.ts packages/content/scripts/fetch.ts packages/content/test/fetch.test.ts
git commit -m "feat(content): fetch and cache raw HSK and Make Me a Hanzi data"
```

---

### Task 5: Character extraction

**Files:**

- Create: `packages/content/src/pipeline/characters.ts`
- Test: `packages/content/test/characters.test.ts`

**Interfaces:**

- Consumes: `Word`, `CharacterData`.
- Produces:

```ts
export function parseJsonLines<T>(text: string): T[];
export interface RawDictionaryEntry {
  character: string;
  definition?: string;
  pinyin: string[];
  decomposition: string;
  radical: string;
}
export interface RawGraphicsEntry {
  character: string;
  strokes: string[];
  medians: number[][][];
}
export function buildCharacters(
  dictionaryText: string,
  graphicsText: string,
  words: Word[],
): { characters: CharacterData[]; missing: string[] };
```

`missing` lists characters used by words that have no graphics entry (the validator later turns this into a build failure).

- [ ] **Step 1: Write the failing test**

`packages/content/test/characters.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildCharacters, parseJsonLines } from '../src/pipeline/characters.js';
import type { Word } from '../src/types.js';

const dictionary = [
  '{"character":"你","definition":"you, second person pronoun","pinyin":["nǐ"],"decomposition":"⿰亻尔","radical":"亻","matches":[[0]]}',
  '{"character":"好","definition":"good, excellent, fine; proper, suitable; well","pinyin":["hǎo"],"decomposition":"⿰女子","radical":"女","matches":[[0]]}',
  '{"character":"⺀","pinyin":[],"decomposition":"？","radical":"⺀","matches":[null,null]}',
  '',
].join('\n');

const graphics = [
  '{"character":"你","strokes":["M 1 1 L 2 2","M 3 3 L 4 4"],"medians":[[[1,1],[2,2]],[[3,3],[4,4]]]}',
  '{"character":"⺀","strokes":["M 0 0"],"medians":[[[0,0]]]}',
].join('\n');

const word = (simplified: string, characters: string[]): Word => ({
  id: `w:${simplified}`,
  simplified,
  traditional: simplified,
  pinyin: '',
  pinyinNumeric: '',
  meanings: ['x'],
  alternates: [],
  pos: [],
  classifiers: [],
  level: 1,
  frequency: 1,
  characters,
  unitId: 'l1-u01',
});

describe('parseJsonLines', () => {
  it('parses one JSON object per non-empty line', () => {
    expect(parseJsonLines<{ character: string }>(dictionary).map((e) => e.character)).toEqual([
      '你',
      '好',
      '⺀',
    ]);
  });
});

describe('buildCharacters', () => {
  it('returns data only for characters used by words, with word back-references', () => {
    const { characters, missing } = buildCharacters(dictionary, graphics, [
      word('你', ['你']),
      word('你好', ['你', '好']),
    ]);
    expect(missing).toEqual(['好']);
    expect(characters).toHaveLength(1);
    expect(characters[0]).toEqual({
      character: '你',
      strokes: ['M 1 1 L 2 2', 'M 3 3 L 4 4'],
      medians: [
        [
          [1, 1],
          [2, 2],
        ],
        [
          [3, 3],
          [4, 4],
        ],
      ],
      pinyin: ['nǐ'],
      definition: 'you, second person pronoun',
      radical: '亻',
      decomposition: '⿰亻尔',
      wordIds: ['w:你', 'w:你好'],
    });
  });

  it('uses null definition and empty fields when the dictionary lacks the character', () => {
    const { characters } = buildCharacters('', graphics, [word('你', ['你'])]);
    expect(characters[0]).toMatchObject({
      character: '你',
      definition: null,
      pinyin: [],
      radical: '',
      decomposition: '',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @hi-chinese/content test -- characters`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

`packages/content/src/pipeline/characters.ts`:

```ts
import type { CharacterData, Word } from '../types.js';

export interface RawDictionaryEntry {
  character: string;
  definition?: string;
  pinyin: string[];
  decomposition: string;
  radical: string;
}

export interface RawGraphicsEntry {
  character: string;
  strokes: string[];
  medians: number[][][];
}

export function parseJsonLines<T>(text: string): T[] {
  const out: T[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    out.push(JSON.parse(trimmed) as T);
  }
  return out;
}

export function buildCharacters(
  dictionaryText: string,
  graphicsText: string,
  words: Word[],
): { characters: CharacterData[]; missing: string[] } {
  const wordIdsByChar = new Map<string, string[]>();
  for (const w of words) {
    for (const ch of w.characters) {
      const list = wordIdsByChar.get(ch) ?? [];
      list.push(w.id);
      wordIdsByChar.set(ch, list);
    }
  }

  const dictionary = new Map<string, RawDictionaryEntry>();
  for (const e of parseJsonLines<RawDictionaryEntry>(dictionaryText)) {
    if (wordIdsByChar.has(e.character)) dictionary.set(e.character, e);
  }
  const graphics = new Map<string, RawGraphicsEntry>();
  for (const e of parseJsonLines<RawGraphicsEntry>(graphicsText)) {
    if (wordIdsByChar.has(e.character)) graphics.set(e.character, e);
  }

  const characters: CharacterData[] = [];
  const missing: string[] = [];
  for (const [ch, wordIds] of wordIdsByChar) {
    const g = graphics.get(ch);
    if (!g) {
      missing.push(ch);
      continue;
    }
    const d = dictionary.get(ch);
    characters.push({
      character: ch,
      strokes: g.strokes,
      medians: g.medians,
      pinyin: d?.pinyin ?? [],
      definition: d?.definition ?? null,
      radical: d?.radical ?? '',
      decomposition: d?.decomposition ?? '',
      wordIds,
    });
  }
  characters.sort((a, b) => a.character.localeCompare(b.character, 'zh'));
  missing.sort();
  return { characters, missing };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm -F @hi-chinese/content test && pnpm -F @hi-chinese/content typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/pipeline/characters.ts packages/content/test/characters.test.ts
git commit -m "feat(content): extract stroke and dictionary data for course characters"
```

---

### Task 6: Assign words to units

**Files:**

- Create: `packages/content/src/pipeline/units.ts`
- Test: `packages/content/test/units.test.ts`

**Interfaces:**

- Consumes: `Word`, `Unit`, `HskLevel`; `unitId` from `ids.ts`. Input words must already be sorted by level then frequency (as `parseHskWords` returns them).
- Produces:

```ts
export interface UnitOptions {
  wordsPerUnit: number;
  minLastUnit: number;
}
export const DEFAULT_UNIT_OPTIONS: UnitOptions; // { wordsPerUnit: 12, minLastUnit: 6 }
export function assignUnits(words: Word[], options?: UnitOptions): { units: Unit[]; words: Word[] };
```

Rules: group by level; chunk each level's words in given order into `wordsPerUnit`; if the final chunk of a level has fewer than `minLastUnit` words, merge it into the previous chunk. `Unit.order` is global and 1-based across levels. `Unit.title` is `Unit <indexInLevel>`. Returned words are copies with `unitId` set; `grammarIds` and `sentenceIds` start empty.

- [ ] **Step 1: Write the failing test**

`packages/content/test/units.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { assignUnits } from '../src/pipeline/units.js';
import type { HskLevel, Word } from '../src/types.js';

const mk = (simplified: string, level: HskLevel, frequency: number): Word => ({
  id: `w:${simplified}`,
  simplified,
  traditional: simplified,
  pinyin: 'x',
  pinyinNumeric: 'x1',
  meanings: ['x'],
  alternates: [],
  pos: [],
  classifiers: [],
  level,
  frequency,
  characters: [...simplified],
  unitId: '',
});

// 7 level-1 words, 3 level-2 words, sorted by level then frequency
const words = [
  ...['甲', '乙', '丙', '丁', '戊', '己', '庚'].map((s, i) => mk(s, 1, i + 1)),
  ...['子', '丑', '寅'].map((s, i) => mk(s, 2, i + 1)),
];

describe('assignUnits', () => {
  it('chunks each level into units of wordsPerUnit with global order', () => {
    const { units } = assignUnits(words, { wordsPerUnit: 3, minLastUnit: 1 });
    expect(units.map((u) => [u.id, u.level, u.order, u.wordIds.length])).toEqual([
      ['l1-u01', 1, 1, 3],
      ['l1-u02', 1, 2, 3],
      ['l1-u03', 1, 3, 1],
      ['l2-u01', 2, 4, 3],
    ]);
    expect(units[0]!.wordIds).toEqual(['w:甲', 'w:乙', 'w:丙']);
    expect(units[0]!.title).toBe('Unit 1');
    expect(units[0]!.grammarIds).toEqual([]);
    expect(units[0]!.sentenceIds).toEqual([]);
  });

  it('merges a too-small final chunk into the previous unit', () => {
    const { units } = assignUnits(words, { wordsPerUnit: 3, minLastUnit: 2 });
    expect(units.map((u) => [u.id, u.wordIds.length])).toEqual([
      ['l1-u01', 3],
      ['l1-u02', 4],
      ['l2-u01', 3],
    ]);
  });

  it('sets unitId on returned word copies without mutating input', () => {
    const { words: out } = assignUnits(words, { wordsPerUnit: 3, minLastUnit: 1 });
    expect(out.find((w) => w.simplified === '丁')!.unitId).toBe('l1-u02');
    expect(out.find((w) => w.simplified === '寅')!.unitId).toBe('l2-u01');
    expect(words[0]!.unitId).toBe('');
  });

  it('uses defaults of 12 words per unit and a minimum last unit of 6', () => {
    const many = Array.from({ length: 29 }, (_, i) =>
      mk(String.fromCodePoint(0x4e00 + i), 1, i + 1),
    );
    const { units } = assignUnits(many);
    expect(units.map((u) => u.wordIds.length)).toEqual([12, 17]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @hi-chinese/content test -- units`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

`packages/content/src/pipeline/units.ts`:

```ts
import { unitId } from '../ids.js';
import type { HskLevel, Unit, Word } from '../types.js';

export interface UnitOptions {
  wordsPerUnit: number;
  minLastUnit: number;
}

export const DEFAULT_UNIT_OPTIONS: UnitOptions = { wordsPerUnit: 12, minLastUnit: 6 };

function chunk<T>(items: T[], size: number, minLast: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  const last = chunks[chunks.length - 1];
  const prev = chunks[chunks.length - 2];
  if (last && prev && last.length < minLast) {
    prev.push(...last);
    chunks.pop();
  }
  return chunks;
}

export function assignUnits(
  words: Word[],
  options: UnitOptions = DEFAULT_UNIT_OPTIONS,
): { units: Unit[]; words: Word[] } {
  const byLevel = new Map<HskLevel, Word[]>();
  for (const w of words) {
    const list = byLevel.get(w.level) ?? [];
    list.push(w);
    byLevel.set(w.level, list);
  }

  const units: Unit[] = [];
  const unitByWordId = new Map<string, string>();
  let order = 0;
  for (const level of [...byLevel.keys()].sort((a, b) => a - b)) {
    const chunks = chunk(byLevel.get(level)!, options.wordsPerUnit, options.minLastUnit);
    chunks.forEach((chunkWords, i) => {
      order += 1;
      const id = unitId(level, i + 1);
      units.push({
        id,
        level,
        order,
        title: `Unit ${i + 1}`,
        wordIds: chunkWords.map((w) => w.id),
        grammarIds: [],
        sentenceIds: [],
      });
      for (const w of chunkWords) unitByWordId.set(w.id, id);
    });
  }

  const assigned = words.map((w) => ({ ...w, unitId: unitByWordId.get(w.id) ?? '' }));
  return { units, words: assigned };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm -F @hi-chinese/content test && pnpm -F @hi-chinese/content typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/pipeline/units.ts packages/content/test/units.test.ts
git commit -m "feat(content): assign words to units by level and frequency"
```

---

### Task 7: Place sentences and grammar into units

**Files:**

- Create: `packages/content/src/pipeline/placement.ts`
- Test: `packages/content/test/placement.test.ts`

**Interfaces:**

- Consumes: `AuthoredSentence`, `AuthoredGrammar`, `Sentence`, `GrammarPoint`, `Unit`, `Word`.
- Produces:

```ts
export interface PlacementError {
  kind:
    | 'unknown-token'
    | 'token-mismatch'
    | 'duplicate-id'
    | 'missing-sentence'
    | 'level-mismatch'
    | 'overflow';
  ref: string;
  message: string;
}
export function placeSentences(
  authored: AuthoredSentence[],
  words: Word[],
  units: Unit[],
): { sentences: Sentence[]; errors: PlacementError[] };
export function placeGrammar(
  authored: AuthoredGrammar[],
  sentences: Sentence[],
  units: Unit[],
  maxPerUnit?: number,
): { grammar: GrammarPoint[]; errors: PlacementError[] }; // default maxPerUnit 2
export function attachToUnits(
  units: Unit[],
  sentences: Sentence[],
  grammar: GrammarPoint[],
): Unit[];
```

Rules:

- A sentence's `words` are simplified tokens. Each must match a `Word.simplified`. The Han characters of `zh` (punctuation and spaces stripped) must equal the tokens joined. The sentence's unit is the unit with the highest `order` among its words' units.
- A grammar point's unit is the highest-order unit among its example sentences. If that unit's level is below the grammar's declared level, the point moves to the first unit of its level. If it is above, `level-mismatch` error. At most `maxPerUnit` grammar points per unit; overflow moves to the next unit in order (repeat until it fits); if it runs past the last unit, `overflow` error.
- `attachToUnits` returns unit copies with `sentenceIds` and `grammarIds` filled (sorted by id), input untouched.

- [ ] **Step 1: Write the failing test**

`packages/content/test/placement.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { attachToUnits, placeGrammar, placeSentences } from '../src/pipeline/placement.js';
import type { AuthoredGrammar, AuthoredSentence, Sentence, Unit, Word } from '../src/types.js';

const unit = (id: string, level: 1 | 2, order: number, wordIds: string[]): Unit => ({
  id,
  level,
  order,
  title: id,
  wordIds,
  grammarIds: [],
  sentenceIds: [],
});
const word = (s: string, unitId: string, level: 1 | 2): Word => ({
  id: `w:${s}`,
  simplified: s,
  traditional: s,
  pinyin: 'x',
  pinyinNumeric: 'x1',
  meanings: ['x'],
  alternates: [],
  pos: [],
  classifiers: [],
  level,
  frequency: 1,
  characters: [...s],
  unitId,
});

const units = [
  unit('l1-u01', 1, 1, ['w:我', 'w:是', 'w:你']),
  unit('l1-u02', 1, 2, ['w:学生', 'w:不']),
  unit('l2-u01', 2, 3, ['w:老师']),
];
const words = [
  word('我', 'l1-u01', 1),
  word('是', 'l1-u01', 1),
  word('你', 'l1-u01', 1),
  word('学生', 'l1-u02', 1),
  word('不', 'l1-u02', 1),
  word('老师', 'l2-u01', 2),
];

const s1: AuthoredSentence = {
  id: 's1',
  zh: '我是你。',
  pinyin: 'Wǒ shì nǐ.',
  en: 'I am you.',
  words: ['我', '是', '你'],
};
const s2: AuthoredSentence = {
  id: 's2',
  zh: '我不是学生。',
  pinyin: 'Wǒ bú shì xuéshēng.',
  en: 'I am not a student.',
  words: ['我', '不', '是', '学生'],
};
const s3: AuthoredSentence = {
  id: 's3',
  zh: '你是老师。',
  pinyin: 'Nǐ shì lǎoshī.',
  en: 'You are a teacher.',
  words: ['你', '是', '老师'],
};

describe('placeSentences', () => {
  it('places each sentence in the latest unit among its words', () => {
    const { sentences, errors } = placeSentences([s1, s2, s3], words, units);
    expect(errors).toEqual([]);
    expect(sentences.map((s) => [s.id, s.unitId])).toEqual([
      ['s1', 'l1-u01'],
      ['s2', 'l1-u02'],
      ['s3', 'l2-u01'],
    ]);
    expect(sentences[1]).toEqual({
      id: 's2',
      zh: '我不是学生。',
      pinyin: 'Wǒ bú shì xuéshēng.',
      en: 'I am not a student.',
      wordIds: ['w:我', 'w:不', 'w:是', 'w:学生'],
      unitId: 'l1-u02',
    });
  });
  it('reports unknown tokens, token mismatches and duplicate ids, skipping those sentences', () => {
    const bad1: AuthoredSentence = { ...s1, id: 'b1', words: ['我', '是', '猫'], zh: '我是猫。' };
    const bad2: AuthoredSentence = { ...s1, id: 'b2', zh: '我是你们。' };
    const { sentences, errors } = placeSentences([s1, bad1, bad2, { ...s1 }], words, units);
    expect(sentences.map((s) => s.id)).toEqual(['s1']);
    expect(errors.map((e) => [e.kind, e.ref])).toEqual([
      ['unknown-token', 'b1'],
      ['token-mismatch', 'b2'],
      ['duplicate-id', 's1'],
    ]);
    expect(errors[0]!.message).toContain('猫');
  });
});

const placed = (): Sentence[] => placeSentences([s1, s2, s3], words, units).sentences;

describe('placeGrammar', () => {
  const g = (id: string, level: 1 | 2, examples: string[]): AuthoredGrammar => ({
    id,
    title: id,
    pattern: 'A 是 B',
    explanation: 'x',
    level,
    examples,
  });

  it('places a grammar point in the latest unit among its examples', () => {
    const { grammar, errors } = placeGrammar([g('g1', 1, ['s1', 's2'])], placed(), units);
    expect(errors).toEqual([]);
    expect(grammar[0]).toEqual({
      id: 'g1',
      title: 'g1',
      pattern: 'A 是 B',
      explanation: 'x',
      level: 1,
      sentenceIds: ['s1', 's2'],
      unitId: 'l1-u02',
    });
  });
  it('moves a point forward to the first unit of its declared level', () => {
    const { grammar } = placeGrammar([g('g1', 2, ['s1'])], placed(), units);
    expect(grammar[0]!.unitId).toBe('l2-u01');
  });
  it('errors when examples need a later level than declared', () => {
    const { grammar, errors } = placeGrammar([g('g1', 1, ['s3'])], placed(), units);
    expect(grammar).toEqual([]);
    expect(errors.map((e) => e.kind)).toEqual(['level-mismatch']);
  });
  it('errors on missing example sentences', () => {
    const { errors } = placeGrammar([g('g1', 1, ['nope'])], placed(), units);
    expect(errors.map((e) => [e.kind, e.ref])).toEqual([['missing-sentence', 'g1']]);
  });
  it('spills extra points to the next unit and errors when out of units', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => g(id, 1, ['s1']));
    const { grammar, errors } = placeGrammar(many, placed(), units, 2);
    expect(grammar.map((x) => [x.id, x.unitId])).toEqual([
      ['a', 'l1-u01'],
      ['b', 'l1-u01'],
      ['c', 'l1-u02'],
      ['d', 'l1-u02'],
      ['e', 'l2-u01'],
      ['f', 'l2-u01'],
    ]);
    expect(errors.map((e) => [e.kind, e.ref])).toEqual([['overflow', 'g']]);
  });
});

describe('attachToUnits', () => {
  it('fills sentenceIds and grammarIds on unit copies', () => {
    const sentences = placed();
    const { grammar } = placeGrammar(
      [{ id: 'g1', title: 't', pattern: 'p', explanation: 'e', level: 1, examples: ['s2'] }],
      sentences,
      units,
    );
    const out = attachToUnits(units, sentences, grammar);
    expect(out[0]!.sentenceIds).toEqual(['s1']);
    expect(out[1]!.sentenceIds).toEqual(['s2']);
    expect(out[1]!.grammarIds).toEqual(['g1']);
    expect(out[2]!.sentenceIds).toEqual(['s3']);
    expect(units[1]!.grammarIds).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @hi-chinese/content test -- placement`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

`packages/content/src/pipeline/placement.ts`:

```ts
import type {
  AuthoredGrammar,
  AuthoredSentence,
  GrammarPoint,
  Sentence,
  Unit,
  Word,
} from '../types.js';

export interface PlacementError {
  kind:
    | 'unknown-token'
    | 'token-mismatch'
    | 'duplicate-id'
    | 'missing-sentence'
    | 'level-mismatch'
    | 'overflow';
  ref: string;
  message: string;
}

const NON_HAN = /[^\p{Script=Han}]/gu;

export function placeSentences(
  authored: AuthoredSentence[],
  words: Word[],
  units: Unit[],
): { sentences: Sentence[]; errors: PlacementError[] } {
  const wordBySimplified = new Map(words.map((w) => [w.simplified, w]));
  const unitById = new Map(units.map((u) => [u.id, u]));
  const seen = new Set<string>();
  const sentences: Sentence[] = [];
  const errors: PlacementError[] = [];

  for (const s of authored) {
    if (seen.has(s.id)) {
      errors.push({
        kind: 'duplicate-id',
        ref: s.id,
        message: `sentence id ${s.id} appears more than once`,
      });
      continue;
    }
    seen.add(s.id);

    const unknown = s.words.filter((t) => !wordBySimplified.has(t));
    if (unknown.length > 0) {
      errors.push({
        kind: 'unknown-token',
        ref: s.id,
        message: `${s.id}: not course words: ${unknown.join(' ')}`,
      });
      continue;
    }
    const joined = s.words.join('');
    const han = s.zh.replace(NON_HAN, '');
    if (joined !== han) {
      errors.push({
        kind: 'token-mismatch',
        ref: s.id,
        message: `${s.id}: tokens "${joined}" do not spell "${han}"`,
      });
      continue;
    }

    let latest: Unit | undefined;
    const wordIds: string[] = [];
    for (const t of s.words) {
      const w = wordBySimplified.get(t)!;
      wordIds.push(w.id);
      const u = unitById.get(w.unitId);
      if (u && (!latest || u.order > latest.order)) latest = u;
    }
    if (!latest) {
      errors.push({
        kind: 'unknown-token',
        ref: s.id,
        message: `${s.id}: words are not assigned to any unit`,
      });
      continue;
    }
    sentences.push({ id: s.id, zh: s.zh, pinyin: s.pinyin, en: s.en, wordIds, unitId: latest.id });
  }
  return { sentences, errors };
}

export function placeGrammar(
  authored: AuthoredGrammar[],
  sentences: Sentence[],
  units: Unit[],
  maxPerUnit = 2,
): { grammar: GrammarPoint[]; errors: PlacementError[] } {
  const sentenceById = new Map(sentences.map((s) => [s.id, s]));
  const unitById = new Map(units.map((u) => [u.id, u]));
  const ordered = [...units].sort((a, b) => a.order - b.order);
  const errors: PlacementError[] = [];
  const seen = new Set<string>();

  // First pass: natural unit per grammar point.
  const pending: { point: GrammarPoint; unitIndex: number }[] = [];
  for (const g of authored) {
    if (seen.has(g.id)) {
      errors.push({
        kind: 'duplicate-id',
        ref: g.id,
        message: `grammar id ${g.id} appears more than once`,
      });
      continue;
    }
    seen.add(g.id);
    const missing = g.examples.filter((id) => !sentenceById.has(id));
    if (missing.length > 0) {
      errors.push({
        kind: 'missing-sentence',
        ref: g.id,
        message: `${g.id}: unknown example sentences: ${missing.join(', ')}`,
      });
      continue;
    }
    let latest: Unit | undefined;
    for (const id of g.examples) {
      const u = unitById.get(sentenceById.get(id)!.unitId);
      if (u && (!latest || u.order > latest.order)) latest = u;
    }
    let unitIndex = latest
      ? ordered.indexOf(latest)
      : ordered.findIndex((u) => u.level === g.level);
    const natural = ordered[unitIndex];
    if (!natural) {
      errors.push({
        kind: 'level-mismatch',
        ref: g.id,
        message: `${g.id}: no units exist for level ${g.level}`,
      });
      continue;
    }
    if (natural.level > g.level) {
      errors.push({
        kind: 'level-mismatch',
        ref: g.id,
        message: `${g.id}: declared level ${g.level} but examples need level ${natural.level} (${natural.id})`,
      });
      continue;
    }
    if (natural.level < g.level) unitIndex = ordered.findIndex((u) => u.level === g.level);
    pending.push({
      point: {
        id: g.id,
        title: g.title,
        pattern: g.pattern,
        explanation: g.explanation,
        level: g.level,
        sentenceIds: [...g.examples],
        unitId: '',
      },
      unitIndex,
    });
  }

  // Second pass: enforce the per-unit cap, spilling forward in authored order.
  pending.sort((a, b) => a.unitIndex - b.unitIndex);
  const counts = new Map<number, number>();
  const grammar: GrammarPoint[] = [];
  for (const { point, unitIndex } of pending) {
    let i = unitIndex;
    while (i < ordered.length && (counts.get(i) ?? 0) >= maxPerUnit) i += 1;
    if (i >= ordered.length) {
      errors.push({
        kind: 'overflow',
        ref: point.id,
        message: `${point.id}: no unit left with fewer than ${maxPerUnit} grammar points`,
      });
      continue;
    }
    counts.set(i, (counts.get(i) ?? 0) + 1);
    grammar.push({ ...point, unitId: ordered[i]!.id });
  }
  return { grammar, errors };
}

export function attachToUnits(
  units: Unit[],
  sentences: Sentence[],
  grammar: GrammarPoint[],
): Unit[] {
  return units.map((u) => ({
    ...u,
    sentenceIds: sentences
      .filter((s) => s.unitId === u.id)
      .map((s) => s.id)
      .sort(),
    grammarIds: grammar
      .filter((g) => g.unitId === u.id)
      .map((g) => g.id)
      .sort(),
  }));
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm -F @hi-chinese/content test && pnpm -F @hi-chinese/content typecheck`
Expected: all pass. If the spill test fails on ordering, note that `pending.sort` must be stable (it is in Node 22) so authored order breaks ties.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/pipeline/placement.ts packages/content/test/placement.test.ts
git commit -m "feat(content): place authored sentences and grammar into units"
```

---

### Task 8: Content validator

**Files:**

- Create: `packages/content/src/pipeline/validate.ts`
- Test: `packages/content/test/validate.test.ts`

**Interfaces:**

- Consumes: `ContentBundle` and its member types.
- Produces:

```ts
export interface ValidationError {
  rule: string;
  ref: string;
  message: string;
}
export function validateContent(bundle: ContentBundle): ValidationError[];
```

Rules (rule ids in parentheses): unique ids across words, units, grammar, sentences, characters (`unique-id`); every word has at least one meaning and non-empty pinyin (`word-meaning`, `word-pinyin`); every word's `unitId` exists and that unit lists the word, and every unit wordId exists (`word-unit`); every unit has at least one word (`unit-empty`); every character used by any word has a `CharacterData` entry (`char-missing`); every character has ≥1 stroke and `medians.length === strokes.length` (`char-strokes`); every sentence's words exist and belong to units with `order <=` the sentence's unit order (`sentence-order`); every grammar point's sentences exist, its unit exists, its unit's level equals its level, and it has ≥1 example (`grammar-refs`); every unit's `grammarIds`/`sentenceIds` exist and point back to that unit (`unit-refs`).

- [ ] **Step 1: Write the failing test**

`packages/content/test/validate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { validateContent } from '../src/pipeline/validate.js';
import type {
  CharacterData,
  ContentBundle,
  GrammarPoint,
  Sentence,
  Unit,
  Word,
} from '../src/types.js';

const word = (s: string, unitId: string, over: Partial<Word> = {}): Word => ({
  id: `w:${s}`,
  simplified: s,
  traditional: s,
  pinyin: 'x',
  pinyinNumeric: 'x1',
  meanings: ['m'],
  alternates: [],
  pos: [],
  classifiers: [],
  level: 1,
  frequency: 1,
  characters: [...s],
  unitId,
  ...over,
});
const char = (c: string, over: Partial<CharacterData> = {}): CharacterData => ({
  character: c,
  strokes: ['M 0 0'],
  medians: [[[0, 0]]],
  pinyin: [],
  definition: null,
  radical: '',
  decomposition: '',
  wordIds: [],
  ...over,
});

function bundle(): ContentBundle {
  const units: Unit[] = [
    {
      id: 'l1-u01',
      level: 1,
      order: 1,
      title: 'Unit 1',
      wordIds: ['w:我', 'w:是'],
      grammarIds: ['g1'],
      sentenceIds: ['s1'],
    },
    {
      id: 'l1-u02',
      level: 1,
      order: 2,
      title: 'Unit 2',
      wordIds: ['w:你'],
      grammarIds: [],
      sentenceIds: ['s2'],
    },
  ];
  const words = [word('我', 'l1-u01'), word('是', 'l1-u01'), word('你', 'l1-u02')];
  const characters = [char('我'), char('是'), char('你')];
  const sentences: Sentence[] = [
    { id: 's1', zh: '我是。', pinyin: 'x', en: 'x', wordIds: ['w:我', 'w:是'], unitId: 'l1-u01' },
    {
      id: 's2',
      zh: '你是我。',
      pinyin: 'x',
      en: 'x',
      wordIds: ['w:你', 'w:是', 'w:我'],
      unitId: 'l1-u02',
    },
  ];
  const grammar: GrammarPoint[] = [
    {
      id: 'g1',
      title: 't',
      pattern: 'p',
      explanation: 'e',
      level: 1,
      sentenceIds: ['s1'],
      unitId: 'l1-u01',
    },
  ];
  return { words, characters, units, grammar, sentences };
}

const rules = (b: ContentBundle) => validateContent(b).map((e) => e.rule);

describe('validateContent', () => {
  it('accepts a consistent bundle', () => {
    expect(validateContent(bundle())).toEqual([]);
  });
  it('rejects duplicate ids', () => {
    const b = bundle();
    b.words.push(word('我', 'l1-u01'));
    expect(rules(b)).toContain('unique-id');
  });
  it('rejects words without meanings or pinyin', () => {
    const b = bundle();
    b.words[0] = word('我', 'l1-u01', { meanings: [] });
    b.words[1] = word('是', 'l1-u01', { pinyin: '' });
    expect(rules(b)).toEqual(expect.arrayContaining(['word-meaning', 'word-pinyin']));
  });
  it('rejects word/unit mismatches and empty units', () => {
    const b = bundle();
    b.words[2] = word('你', 'l1-u01');
    b.units[1]!.wordIds = [];
    expect(rules(b)).toEqual(expect.arrayContaining(['word-unit', 'unit-empty']));
  });
  it('rejects missing or malformed character data', () => {
    const b = bundle();
    b.characters = [char('我'), char('是', { medians: [] })];
    const errs = validateContent(b);
    expect(errs.map((e) => [e.rule, e.ref])).toEqual(
      expect.arrayContaining([
        ['char-missing', '你'],
        ['char-strokes', '是'],
      ]),
    );
  });
  it('rejects sentences using words from later units or unknown words', () => {
    const b = bundle();
    b.sentences[0] = { ...b.sentences[0]!, wordIds: ['w:你', 'w:是'] };
    b.sentences[1] = { ...b.sentences[1]!, wordIds: ['w:鸟'] };
    const errs = validateContent(b).filter((e) => e.rule === 'sentence-order');
    expect(errs.map((e) => e.ref)).toEqual(['s1', 's2']);
  });
  it('rejects grammar points with bad references, wrong level, or no examples', () => {
    const b = bundle();
    b.grammar[0] = { ...b.grammar[0]!, sentenceIds: [], level: 2 };
    expect(rules(b)).toContain('grammar-refs');
  });
  it('rejects units referencing ids that do not point back', () => {
    const b = bundle();
    b.units[1]!.grammarIds = ['g1'];
    b.units[0]!.sentenceIds = ['s9'];
    expect(validateContent(b).filter((e) => e.rule === 'unit-refs')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @hi-chinese/content test -- validate`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

`packages/content/src/pipeline/validate.ts`:

```ts
import type { ContentBundle } from '../types.js';

export interface ValidationError {
  rule: string;
  ref: string;
  message: string;
}

export function validateContent(b: ContentBundle): ValidationError[] {
  const errors: ValidationError[] = [];
  const err = (rule: string, ref: string, message: string) => errors.push({ rule, ref, message });

  // unique-id
  const checkUnique = (kind: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) err('unique-id', id, `${kind} id ${id} is duplicated`);
      seen.add(id);
    }
  };
  checkUnique(
    'word',
    b.words.map((w) => w.id),
  );
  checkUnique(
    'unit',
    b.units.map((u) => u.id),
  );
  checkUnique(
    'grammar',
    b.grammar.map((g) => g.id),
  );
  checkUnique(
    'sentence',
    b.sentences.map((s) => s.id),
  );
  checkUnique(
    'character',
    b.characters.map((c) => c.character),
  );

  const wordById = new Map(b.words.map((w) => [w.id, w]));
  const unitById = new Map(b.units.map((u) => [u.id, u]));
  const sentenceById = new Map(b.sentences.map((s) => [s.id, s]));
  const grammarById = new Map(b.grammar.map((g) => [g.id, g]));
  const charSet = new Set(b.characters.map((c) => c.character));

  // words
  for (const w of b.words) {
    if (w.meanings.length === 0) err('word-meaning', w.id, `${w.simplified} has no meanings`);
    if (w.pinyin.trim() === '') err('word-pinyin', w.id, `${w.simplified} has no pinyin`);
    const u = unitById.get(w.unitId);
    if (!u) err('word-unit', w.id, `${w.simplified} has unknown unit ${w.unitId}`);
    else if (!u.wordIds.includes(w.id))
      err('word-unit', w.id, `${w.simplified} not listed in ${u.id}`);
    for (const ch of w.characters) {
      if (!charSet.has(ch))
        err('char-missing', ch, `character ${ch} (in ${w.simplified}) has no stroke data`);
    }
  }

  // units
  for (const u of b.units) {
    if (u.wordIds.length === 0) err('unit-empty', u.id, `${u.id} has no words`);
    for (const id of u.wordIds) {
      const w = wordById.get(id);
      if (!w) err('word-unit', u.id, `${u.id} lists unknown word ${id}`);
      else if (w.unitId !== u.id)
        err('word-unit', u.id, `${u.id} lists ${id} but the word belongs to ${w.unitId}`);
    }
    for (const id of u.grammarIds) {
      const g = grammarById.get(id);
      if (!g || g.unitId !== u.id)
        err('unit-refs', u.id, `${u.id} lists grammar ${id} which does not point back`);
    }
    for (const id of u.sentenceIds) {
      const s = sentenceById.get(id);
      if (!s || s.unitId !== u.id)
        err('unit-refs', u.id, `${u.id} lists sentence ${id} which does not point back`);
    }
  }

  // characters
  for (const c of b.characters) {
    if (c.strokes.length === 0 || c.medians.length !== c.strokes.length) {
      err(
        'char-strokes',
        c.character,
        `${c.character}: ${c.strokes.length} strokes, ${c.medians.length} medians`,
      );
    }
  }

  // sentences
  for (const s of b.sentences) {
    const u = unitById.get(s.unitId);
    if (!u) {
      err('sentence-order', s.id, `${s.id} has unknown unit ${s.unitId}`);
      continue;
    }
    for (const id of s.wordIds) {
      const w = wordById.get(id);
      const wu = w ? unitById.get(w.unitId) : undefined;
      if (!w || !wu) err('sentence-order', s.id, `${s.id} uses unknown word ${id}`);
      else if (wu.order > u.order)
        err(
          'sentence-order',
          s.id,
          `${s.id} in ${u.id} uses ${w.simplified} from later unit ${wu.id}`,
        );
    }
  }

  // grammar
  for (const g of b.grammar) {
    if (g.sentenceIds.length === 0) err('grammar-refs', g.id, `${g.id} has no example sentences`);
    for (const id of g.sentenceIds) {
      if (!sentenceById.has(id))
        err('grammar-refs', g.id, `${g.id} references unknown sentence ${id}`);
    }
    const u = unitById.get(g.unitId);
    if (!u) err('grammar-refs', g.id, `${g.id} has unknown unit ${g.unitId}`);
    else if (u.level !== g.level)
      err(
        'grammar-refs',
        g.id,
        `${g.id} is level ${g.level} but sits in level ${u.level} unit ${u.id}`,
      );
  }

  return errors;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm -F @hi-chinese/content test && pnpm -F @hi-chinese/content typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/pipeline/validate.ts packages/content/test/validate.test.ts
git commit -m "feat(content): validate content bundle consistency"
```

---

### Task 9: Write content chunks and manifest

**Files:**

- Create: `packages/content/src/pipeline/build.ts`
- Test: `packages/content/test/build.test.ts`

**Interfaces:**

- Consumes: `ContentBundle`, `ContentManifest`, `UnitChunk`; `characterFileName` from `ids.ts`.
- Produces:

```ts
export function computeVersion(parts: string[]): string; // sha256 hex of joined parts, first 12 chars
export function buildManifest(
  bundle: ContentBundle,
  version: string,
  generatedAt: string,
): ContentManifest;
export async function writeContent(
  bundle: ContentBundle,
  outDir: string,
  now?: () => Date,
): Promise<ContentManifest>;
```

Output layout under `outDir`: `manifest.json`, `words.json` (all `Word`s sorted by level, frequency, simplified), `units/<unitId>.json` (`UnitChunk`), `characters/<hex>.json` (`CharacterData`). `writeContent` deletes and recreates `outDir` first; it refuses to run if the path does not end with `/content` (guard against wiping the wrong directory). JSON is written with `JSON.stringify(value)` (no whitespace) and a trailing newline. The version hashes every chunk body except the manifest, so it is stable across runs when content is unchanged.

- [ ] **Step 1: Write the failing test**

`packages/content/test/build.test.ts`:

```ts
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildManifest, computeVersion, writeContent } from '../src/pipeline/build.js';
import type { ContentBundle } from '../src/types.js';

function bundle(): ContentBundle {
  return {
    units: [
      {
        id: 'l1-u01',
        level: 1,
        order: 1,
        title: 'Unit 1',
        wordIds: ['w:我', 'w:是'],
        grammarIds: ['g1'],
        sentenceIds: ['s1'],
      },
      {
        id: 'l2-u01',
        level: 2,
        order: 2,
        title: 'Unit 1',
        wordIds: ['w:你'],
        grammarIds: [],
        sentenceIds: [],
      },
    ],
    words: [
      {
        id: 'w:我',
        simplified: '我',
        traditional: '我',
        pinyin: 'wǒ',
        pinyinNumeric: 'wo3',
        meanings: ['I'],
        alternates: [],
        pos: ['r'],
        classifiers: [],
        level: 1,
        frequency: 3,
        characters: ['我'],
        unitId: 'l1-u01',
      },
      {
        id: 'w:是',
        simplified: '是',
        traditional: '是',
        pinyin: 'shì',
        pinyinNumeric: 'shi4',
        meanings: ['to be'],
        alternates: [],
        pos: ['v'],
        classifiers: [],
        level: 1,
        frequency: 4,
        characters: ['是'],
        unitId: 'l1-u01',
      },
      {
        id: 'w:你',
        simplified: '你',
        traditional: '你',
        pinyin: 'nǐ',
        pinyinNumeric: 'ni3',
        meanings: ['you'],
        alternates: [],
        pos: ['r'],
        classifiers: [],
        level: 2,
        frequency: 5,
        characters: ['你'],
        unitId: 'l2-u01',
      },
    ],
    characters: ['我', '是', '你'].map((c) => ({
      character: c,
      strokes: ['M 0 0'],
      medians: [[[0, 0]]],
      pinyin: [],
      definition: null,
      radical: '',
      decomposition: '',
      wordIds: [`w:${c}`],
    })),
    grammar: [
      {
        id: 'g1',
        title: 't',
        pattern: 'p',
        explanation: 'e',
        level: 1,
        sentenceIds: ['s1'],
        unitId: 'l1-u01',
      },
    ],
    sentences: [
      {
        id: 's1',
        zh: '我是。',
        pinyin: 'Wǒ shì.',
        en: 'I am.',
        wordIds: ['w:我', 'w:是'],
        unitId: 'l1-u01',
      },
    ],
  };
}

describe('computeVersion', () => {
  it('is deterministic and 12 hex chars', () => {
    expect(computeVersion(['a', 'b'])).toMatch(/^[0-9a-f]{12}$/);
    expect(computeVersion(['a', 'b'])).toBe(computeVersion(['a', 'b']));
    expect(computeVersion(['a', 'b'])).not.toBe(computeVersion(['a', 'c']));
  });
});

describe('buildManifest', () => {
  it('summarizes levels, units and counts', () => {
    const m = buildManifest(bundle(), 'abc', '2026-09-09T00:00:00.000Z');
    expect(m).toEqual({
      version: 'abc',
      generatedAt: '2026-09-09T00:00:00.000Z',
      levels: [
        { level: 1, title: 'HSK 1', unitIds: ['l1-u01'] },
        { level: 2, title: 'HSK 2', unitIds: ['l2-u01'] },
      ],
      units: [
        { id: 'l1-u01', level: 1, order: 1, title: 'Unit 1', wordCount: 2, grammarCount: 1 },
        { id: 'l2-u01', level: 2, order: 2, title: 'Unit 1', wordCount: 1, grammarCount: 0 },
      ],
      counts: { words: 3, characters: 3, grammar: 1, sentences: 1, units: 2 },
    });
  });
});

describe('writeContent', () => {
  let dir: string;
  beforeEach(async () => {
    dir = join(await mkdtemp(join(tmpdir(), 'hi-chinese-build-')), 'content');
  });
  afterEach(async () => {
    await rm(join(dir, '..'), { recursive: true, force: true });
  });

  it('writes manifest, words, unit chunks and character chunks', async () => {
    const manifest = await writeContent(bundle(), dir, () => new Date('2026-09-09T00:00:00.000Z'));
    expect((await readdir(dir)).sort()).toEqual([
      'characters',
      'manifest.json',
      'units',
      'words.json',
    ]);
    expect((await readdir(join(dir, 'units'))).sort()).toEqual(['l1-u01.json', 'l2-u01.json']);
    expect((await readdir(join(dir, 'characters'))).sort()).toEqual([
      '4f60.json',
      '6211.json',
      '662f.json',
    ]);
    const chunk = JSON.parse(await readFile(join(dir, 'units', 'l1-u01.json'), 'utf8'));
    expect(chunk.unit.id).toBe('l1-u01');
    expect(chunk.grammar.map((g: { id: string }) => g.id)).toEqual(['g1']);
    expect(chunk.sentences.map((s: { id: string }) => s.id)).toEqual(['s1']);
    const words = JSON.parse(await readFile(join(dir, 'words.json'), 'utf8'));
    expect(words.map((w: { id: string }) => w.id)).toEqual(['w:我', 'w:是', 'w:你']);
    const onDisk = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
    expect(onDisk).toEqual(manifest);
    expect(manifest.generatedAt).toBe('2026-09-09T00:00:00.000Z');
  });

  it('produces the same version for the same content and replaces stale files', async () => {
    const first = await writeContent(bundle(), dir);
    const second = await writeContent(bundle(), dir);
    expect(second.version).toBe(first.version);
    const b = bundle();
    b.sentences[0]!.en = 'I am!';
    const third = await writeContent(b, dir);
    expect(third.version).not.toBe(first.version);
  });

  it('refuses an output directory not named content', async () => {
    await expect(writeContent(bundle(), join(dir, '..'))).rejects.toThrow(/content/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @hi-chinese/content test -- build`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

`packages/content/src/pipeline/build.ts`:

```ts
import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { characterFileName } from '../ids.js';
import type { ContentBundle, ContentManifest, HskLevel, UnitChunk, Word } from '../types.js';

export function computeVersion(parts: string[]): string {
  const hash = createHash('sha256');
  for (const p of parts) hash.update(p);
  return hash.digest('hex').slice(0, 12);
}

const LEVEL_TITLES: Record<HskLevel, string> = { 1: 'HSK 1', 2: 'HSK 2', 3: 'HSK 3' };

function sortWords(words: Word[]): Word[] {
  return [...words].sort(
    (a, b) =>
      a.level - b.level ||
      a.frequency - b.frequency ||
      a.simplified.localeCompare(b.simplified, 'zh'),
  );
}

export function buildManifest(
  bundle: ContentBundle,
  version: string,
  generatedAt: string,
): ContentManifest {
  const units = [...bundle.units].sort((a, b) => a.order - b.order);
  const levels = ([1, 2, 3] as HskLevel[])
    .map((level) => ({
      level,
      title: LEVEL_TITLES[level],
      unitIds: units.filter((u) => u.level === level).map((u) => u.id),
    }))
    .filter((l) => l.unitIds.length > 0);
  return {
    version,
    generatedAt,
    levels,
    units: units.map((u) => ({
      id: u.id,
      level: u.level,
      order: u.order,
      title: u.title,
      wordCount: u.wordIds.length,
      grammarCount: u.grammarIds.length,
    })),
    counts: {
      words: bundle.words.length,
      characters: bundle.characters.length,
      grammar: bundle.grammar.length,
      sentences: bundle.sentences.length,
      units: bundle.units.length,
    },
  };
}

const json = (value: unknown) => `${JSON.stringify(value)}\n`;

export async function writeContent(
  bundle: ContentBundle,
  outDir: string,
  now: () => Date = () => new Date(),
): Promise<ContentManifest> {
  if (basename(outDir) !== 'content') {
    throw new Error(`refusing to write to ${outDir}: output directory must be named "content"`);
  }
  await rm(outDir, { recursive: true, force: true });
  await mkdir(join(outDir, 'units'), { recursive: true });
  await mkdir(join(outDir, 'characters'), { recursive: true });

  const files: { path: string; body: string }[] = [];
  files.push({ path: 'words.json', body: json(sortWords(bundle.words)) });

  const grammarByUnit = new Map<string, typeof bundle.grammar>();
  for (const g of bundle.grammar)
    grammarByUnit.set(g.unitId, [...(grammarByUnit.get(g.unitId) ?? []), g]);
  const sentencesByUnit = new Map<string, typeof bundle.sentences>();
  for (const s of bundle.sentences)
    sentencesByUnit.set(s.unitId, [...(sentencesByUnit.get(s.unitId) ?? []), s]);

  for (const unit of [...bundle.units].sort((a, b) => a.order - b.order)) {
    const chunk: UnitChunk = {
      unit,
      grammar: (grammarByUnit.get(unit.id) ?? []).sort((a, b) => a.id.localeCompare(b.id)),
      sentences: (sentencesByUnit.get(unit.id) ?? []).sort((a, b) => a.id.localeCompare(b.id)),
    };
    files.push({ path: join('units', `${unit.id}.json`), body: json(chunk) });
  }
  for (const c of [...bundle.characters].sort((a, b) =>
    a.character.localeCompare(b.character, 'zh'),
  )) {
    files.push({
      path: join('characters', `${characterFileName(c.character)}.json`),
      body: json(c),
    });
  }

  const version = computeVersion(files.map((f) => `${f.path}\n${f.body}`));
  const manifest = buildManifest(bundle, version, now().toISOString());
  files.push({ path: 'manifest.json', body: json(manifest) });

  await Promise.all(files.map((f) => writeFile(join(outDir, f.path), f.body, 'utf8')));
  return manifest;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm -F @hi-chinese/content test && pnpm -F @hi-chinese/content typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/pipeline/build.ts packages/content/test/build.test.ts
git commit -m "feat(content): write versioned content chunks and manifest"
```

---

### Task 10: Authored content loader, seed data, and the build CLI

**Files:**

- Create: `packages/content/src/pipeline/authored.ts`
- Create: `packages/content/src/authored/pinyin-overrides.json`, `packages/content/src/authored/sentences/level1.json`, `packages/content/src/authored/grammar/level1.json`
- Create: `packages/content/scripts/build.ts`, `packages/content/scripts/report-readings.ts`
- Test: `packages/content/test/authored.test.ts`

**Interfaces:**

- Consumes: everything from Tasks 3 to 9.
- Produces:

```ts
export interface Authored {
  sentences: AuthoredSentence[];
  grammar: AuthoredGrammar[];
  overrides: PinyinOverrides;
}
export function loadAuthored(authoredDir: string): Promise<Authored>; // reads pinyin-overrides.json, sentences/*.json, grammar/*.json (sorted by filename)
```

Authored JSON file shapes: `sentences/*.json` is an array of `AuthoredSentence`; `grammar/*.json` is an array of `AuthoredGrammar`; `pinyin-overrides.json` is an object mapping simplified word to numeric pinyin.

- [ ] **Step 1: Write the failing test**

`packages/content/test/authored.test.ts`:

```ts
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadAuthored } from '../src/pipeline/authored.js';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'hi-chinese-authored-'));
  await mkdir(join(dir, 'sentences'));
  await mkdir(join(dir, 'grammar'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('loadAuthored', () => {
  it('reads overrides, sentences and grammar in filename order', async () => {
    await writeFile(join(dir, 'pinyin-overrides.json'), JSON.stringify({ 了: 'le5' }));
    await writeFile(
      join(dir, 'sentences', 'b.json'),
      JSON.stringify([{ id: 's2', zh: '你。', pinyin: 'nǐ', en: 'you', words: ['你'] }]),
    );
    await writeFile(
      join(dir, 'sentences', 'a.json'),
      JSON.stringify([{ id: 's1', zh: '我。', pinyin: 'wǒ', en: 'I', words: ['我'] }]),
    );
    await writeFile(
      join(dir, 'grammar', 'a.json'),
      JSON.stringify([
        { id: 'g1', title: 't', pattern: 'p', explanation: 'e', level: 1, examples: ['s1'] },
      ]),
    );
    const a = await loadAuthored(dir);
    expect(a.overrides).toEqual({ 了: 'le5' });
    expect(a.sentences.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(a.grammar.map((g) => g.id)).toEqual(['g1']);
  });
  it('tolerates a missing overrides file and empty folders', async () => {
    const a = await loadAuthored(dir);
    expect(a).toEqual({ sentences: [], grammar: [], overrides: {} });
  });
  it('rejects a file that is not an array', async () => {
    await writeFile(join(dir, 'grammar', 'bad.json'), JSON.stringify({ id: 'g1' }));
    await expect(loadAuthored(dir)).rejects.toThrow(/bad\.json.*array/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @hi-chinese/content test -- authored`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement the loader**

`packages/content/src/pipeline/authored.ts`:

```ts
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { AuthoredGrammar, AuthoredSentence, PinyinOverrides } from '../types.js';

export interface Authored {
  sentences: AuthoredSentence[];
  grammar: AuthoredGrammar[];
  overrides: PinyinOverrides;
}

async function readJsonArrays<T>(dir: string): Promise<T[]> {
  let names: string[];
  try {
    names = (await readdir(dir)).filter((n) => n.endsWith('.json')).sort();
  } catch {
    return [];
  }
  const out: T[] = [];
  for (const name of names) {
    const path = join(dir, name);
    const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
    if (!Array.isArray(parsed)) throw new Error(`${path}: expected a JSON array`);
    out.push(...(parsed as T[]));
  }
  return out;
}

export async function loadAuthored(authoredDir: string): Promise<Authored> {
  let overrides: PinyinOverrides = {};
  try {
    overrides = JSON.parse(
      await readFile(join(authoredDir, 'pinyin-overrides.json'), 'utf8'),
    ) as PinyinOverrides;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  return {
    sentences: await readJsonArrays<AuthoredSentence>(join(authoredDir, 'sentences')),
    grammar: await readJsonArrays<AuthoredGrammar>(join(authoredDir, 'grammar')),
    overrides,
  };
}
```

Run: `pnpm -F @hi-chinese/content test -- authored` → PASS.

- [ ] **Step 4: Write the seed authored content**

Unit `l1-u01` is exactly 的 了 我 是 你 在 不 有 他 这 就 个, so these sentences all land there.

`packages/content/src/authored/pinyin-overrides.json` (cases where the heuristic picks the wrong reading; verified against the source forms):

```json
{
  "了": "le5",
  "着": "zhe5",
  "那": "na4",
  "啊": "a5"
}
```

`packages/content/src/authored/sentences/level1.json`:

```json
[
  {
    "id": "s:l1:001",
    "zh": "这是我的。",
    "pinyin": "Zhè shì wǒ de.",
    "en": "This is mine.",
    "words": ["这", "是", "我", "的"]
  },
  {
    "id": "s:l1:002",
    "zh": "我有这个。",
    "pinyin": "Wǒ yǒu zhège.",
    "en": "I have this one.",
    "words": ["我", "有", "这", "个"]
  },
  {
    "id": "s:l1:003",
    "zh": "他不在。",
    "pinyin": "Tā bú zài.",
    "en": "He is not here.",
    "words": ["他", "不", "在"]
  },
  {
    "id": "s:l1:004",
    "zh": "我不是你。",
    "pinyin": "Wǒ bú shì nǐ.",
    "en": "I am not you.",
    "words": ["我", "不", "是", "你"]
  },
  {
    "id": "s:l1:005",
    "zh": "你是不是他？",
    "pinyin": "Nǐ shì bu shì tā?",
    "en": "Are you him?",
    "words": ["你", "是", "不", "是", "他"]
  },
  {
    "id": "s:l1:006",
    "zh": "你在不在？",
    "pinyin": "Nǐ zài bu zài?",
    "en": "Are you there?",
    "words": ["你", "在", "不", "在"]
  },
  {
    "id": "s:l1:007",
    "zh": "他有了。",
    "pinyin": "Tā yǒu le.",
    "en": "He has it now.",
    "words": ["他", "有", "了"]
  },
  {
    "id": "s:l1:008",
    "zh": "这个是你的。",
    "pinyin": "Zhège shì nǐ de.",
    "en": "This one is yours.",
    "words": ["这", "个", "是", "你", "的"]
  }
]
```

`packages/content/src/authored/grammar/level1.json`:

```json
[
  {
    "id": "g:shi-sentences",
    "title": "Linking with 是",
    "pattern": "A + 是 + B",
    "explanation": "是 (shì) links a subject to what it is, like English \"to be\". It never changes form: 我是, 你是, 他是 all use the same 是. Negate it with 不是 (bú shì), never with 没.",
    "level": 1,
    "examples": ["s:l1:001", "s:l1:004", "s:l1:008"]
  },
  {
    "id": "g:bu-negation",
    "title": "Negating with 不",
    "pattern": "不 + verb / adjective",
    "explanation": "不 (bù) goes directly before a verb or adjective to negate it: 不是 (is not), 不在 (is not at/there). Before a 4th-tone syllable such as 是 or 在, 不 is pronounced bú.",
    "level": 1,
    "examples": ["s:l1:003", "s:l1:004"]
  },
  {
    "id": "g:affirmative-negative-questions",
    "title": "Yes/no questions with verb-不-verb",
    "pattern": "Subject + verb + 不 + verb (+ object) ?",
    "explanation": "Repeat the verb with 不 between the two copies to ask a yes/no question: 是不是 (is or isn't?), 在不在 (there or not?). The 不 in the middle is unstressed and usually written with the neutral tone in pinyin.",
    "level": 1,
    "examples": ["s:l1:005", "s:l1:006"]
  },
  {
    "id": "g:you-possession",
    "title": "有 for possession",
    "pattern": "Subject + 有 + object",
    "explanation": "有 (yǒu) means \"to have\". Sentence-final 了 after 有 signals a change: the subject did not have it before but has it now.",
    "level": 1,
    "examples": ["s:l1:002", "s:l1:007"]
  }
]
```

- [ ] **Step 5: Write the build CLI**

`packages/content/scripts/build.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAuthored } from '../src/pipeline/authored.js';
import { writeContent } from '../src/pipeline/build.js';
import { buildCharacters } from '../src/pipeline/characters.js';
import { fetchRaw } from '../src/pipeline/fetch.js';
import { parseHskWords, type RawHskEntry } from '../src/pipeline/hsk.js';
import { attachToUnits, placeGrammar, placeSentences } from '../src/pipeline/placement.js';
import { assignUnits } from '../src/pipeline/units.js';
import { validateContent } from '../src/pipeline/validate.js';
import type { ContentBundle } from '../src/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const rawDir = resolve(here, '../raw');
const authoredDir = resolve(here, '../src/authored');
const outDir = process.env['CONTENT_OUT'] ?? resolve(here, '../../../apps/web/public/content');

const t0 = Date.now();
const raw = await fetchRaw(rawDir);
const authored = await loadAuthored(authoredDir);

const entries = JSON.parse(await readFile(raw.hsk, 'utf8')) as RawHskEntry[];
const parsed = parseHskWords(entries, authored.overrides);
const { units: bareUnits, words } = assignUnits(parsed);

const { sentences, errors: sentenceErrors } = placeSentences(authored.sentences, words, bareUnits);
const { grammar, errors: grammarErrors } = placeGrammar(authored.grammar, sentences, bareUnits);
const units = attachToUnits(bareUnits, sentences, grammar);

const { characters, missing } = buildCharacters(
  await readFile(raw.dictionary, 'utf8'),
  await readFile(raw.graphics, 'utf8'),
  words,
);

const bundle: ContentBundle = { words, characters, units, grammar, sentences };
const problems = [
  ...sentenceErrors.map((e) => `[placement:${e.kind}] ${e.message}`),
  ...grammarErrors.map((e) => `[placement:${e.kind}] ${e.message}`),
  ...missing.map((ch) => `[characters] no stroke data for ${ch}`),
  ...validateContent(bundle).map((e) => `[${e.rule}] ${e.message}`),
];
if (problems.length > 0) {
  console.error(`content build failed with ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const manifest = await writeContent(bundle, outDir);
console.log(
  `content ${manifest.version} written to ${outDir} in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
);
console.log(manifest.counts);
for (const level of manifest.levels) console.log(`  ${level.title}: ${level.unitIds.length} units`);
```

`packages/content/scripts/report-readings.ts` (review aid for Phase 5; prints one line per multi-reading word):

```ts
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAuthored } from '../src/pipeline/authored.js';
import { chooseReading, hskLevelOf, mergeForms, type RawHskEntry } from '../src/pipeline/hsk.js';

const here = dirname(fileURLToPath(import.meta.url));
const entries = JSON.parse(
  await readFile(resolve(here, '../raw/complete.json'), 'utf8'),
) as RawHskEntry[];
const { overrides } = await loadAuthored(resolve(here, '../src/authored'));

console.log('word\tlevel\tchosen\toverride?\tall readings (meaning count)');
for (const entry of entries) {
  const level = hskLevelOf(entry);
  if (level === null) continue;
  const forms = mergeForms(entry.forms);
  if (forms.length < 2) continue;
  const { chosen } = chooseReading(entry, overrides);
  const all = forms.map((f) => `${f.transcriptions.numeric}(${f.meanings.length})`).join(' ');
  const flag = entry.simplified in overrides ? 'override' : '';
  console.log(`${entry.simplified}\t${level}\t${chosen.transcriptions.numeric}\t${flag}\t${all}`);
}
```

- [ ] **Step 6: Run the full build against real data**

```bash
pnpm -F @hi-chinese/content build
ls apps/web/public/content | head
ls apps/web/public/content/units | wc -l
ls apps/web/public/content/characters | wc -l
node -e 'const m=require("./apps/web/public/content/manifest.json"); console.log(m.counts, m.levels.map(l=>l.title+":"+l.unitIds.length))'
node -e 'const c=require("./apps/web/public/content/units/l1-u01.json"); console.log(c.unit.wordIds.join(" "), "| grammar:", c.grammar.map(g=>g.id).join(","), "| sentences:", c.sentences.length)'
```

Expected:

- Build exits 0 and prints counts close to `{ words: 2209, characters: 899, grammar: 4, sentences: 8, units: ~185 }` (unit count depends on the 12-per-unit chunking: roughly 42 + 62 + 80).
- `l1-u01` words are `w:的 w:了 w:我 w:是 w:你 w:在 w:不 w:有 w:他 w:这 w:就 w:个`, grammar lists 2 of the 4 seed points (the cap of 2 per unit pushes the other 2 into `l1-u02`), sentences: 8.
- If the build reports `[characters] no stroke data for X`, list the characters in the commit message and add them to a new `packages/content/src/authored/missing-characters.md` note; do not silently drop words. Then stop and report, since the spec requires stroke data for every character (Phase 5 or a follow-up decides how to source them).
- If `pinyin override ... matches no form`, fix the override value using the `available:` list in the error.

Also run `pnpm -F @hi-chinese/content report:readings | head -20` and confirm it prints a table.

- [ ] **Step 7: Run the whole test suite and typecheck**

```bash
pnpm test && pnpm typecheck && pnpm format:check || pnpm format
```

Expected: all green. If `format:check` fails, run `pnpm format` and include the changes in the commit.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(content): build CLI with seed authored content and readings report"
```

---

### Task 11: Documentation

**Files:**

- Create: `README.md`, `packages/content/README.md`

- [ ] **Step 1: Write the root README**

`README.md`:

```markdown
# Hi Chinese

A single-user, installable web app (PWA) for learning Mandarin, modeled on
HelloChinese. Covers HSK 3.0 levels 1 to 3. Runs on Cloudflare Workers with
progress stored in D1.

Design: `docs/superpowers/specs/2026-09-09-hi-chinese-design.md`.
Roadmap: `docs/superpowers/plans/README.md`.

## Setup

    corepack enable && corepack prepare pnpm@10.34.5 --activate
    pnpm install

## Content

    pnpm content:fetch   # download open data into packages/content/raw (cached)
    pnpm content:build   # emit apps/web/public/content/*

## Checks

    pnpm test
    pnpm typecheck
    pnpm format:check

## Layout

- `packages/content` – content pipeline and shared types
- `apps/web` – React PWA (Phase 3)
- `apps/worker` – Cloudflare Worker API (Phase 2)

## Data sources and licenses

- HSK 3.0 word list: complete-hsk-vocabulary (MIT)
- Character strokes and dictionary: Make Me a Hanzi (LGPL / Arphic Public License, see its COPYING)
```

- [ ] **Step 2: Write the content package README**

`packages/content/README.md`:

```markdown
# @hi-chinese/content

Turns open data plus authored grammar and sentences into static JSON chunks.

## Pipeline

1. `fetchRaw` downloads `complete.json`, `dictionary.txt`, `graphics.txt` into `raw/` (git-ignored, cached).
2. `parseHskWords` keeps HSK 3.0 levels 1-3, merges duplicate readings, picks the primary reading
   (heuristic + `src/authored/pinyin-overrides.json`).
3. `assignUnits` chunks each level's words by frequency into units of 12.
4. `placeSentences` / `placeGrammar` put authored content into the earliest unit where all its words are known.
5. `buildCharacters` extracts stroke and dictionary data for every character in the course.
6. `validateContent` fails the build on any inconsistency.
7. `writeContent` emits `manifest.json`, `words.json`, `units/<id>.json`, `characters/<hex>.json`.

## Authoring

- `src/authored/sentences/*.json`: arrays of `{ id, zh, pinyin, en, words }`. `words` are the simplified
  tokens of `zh` in order; every token must be a course word. Ids: `s:l<level>:<nnn>`.
- `src/authored/grammar/*.json`: arrays of `{ id, title, pattern, explanation, level, examples }` where
  `examples` are sentence ids. Ids: `g:<kebab-slug>`. A unit holds at most 2 grammar points.
- `src/authored/pinyin-overrides.json`: `{ "<simplified>": "<numeric pinyin>" }` for words where the
  automatic reading choice is wrong. Run `pnpm report:readings` to review all multi-reading words.

## Commands

    pnpm test
    pnpm build            # full pipeline, writes ../../apps/web/public/content
    CONTENT_OUT=/tmp/x/content pnpm build
    pnpm report:readings
```

- [ ] **Step 3: Commit**

```bash
git add README.md packages/content/README.md
git commit -m "docs: add project and content package READMEs"
```

---

## Self-review notes

- Spec section 3 coverage: hierarchy (Task 6), types (Task 2), fetch (Task 4), normalize (Task 3), author + validation of word availability (Tasks 7, 8, 10), build with manifest, unit chunks and character chunks (Task 9), all four build-failure rules (Task 8). CC-CEDICT step dropped per verified source data (see plans README).
- Type names are consistent across tasks: `Word`, `CharacterData`, `Sentence`, `GrammarPoint`, `Unit`, `UnitChunk`, `ContentManifest`, `ContentBundle`, `AuthoredSentence`, `AuthoredGrammar`, `PinyinOverrides`; functions `parseHskWords`, `chooseReading`, `mergeForms`, `hskLevelOf`, `normalizeWord`, `fetchRaw`, `buildCharacters`, `parseJsonLines`, `assignUnits`, `placeSentences`, `placeGrammar`, `attachToUnits`, `validateContent`, `computeVersion`, `buildManifest`, `writeContent`, `loadAuthored`.
- Phase 2 will add progress types to `packages/content/src/types.ts` (spec section 7) when the worker needs them.
