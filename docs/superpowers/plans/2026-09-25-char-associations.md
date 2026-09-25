# Liên tưởng chữ đơn ↔ từ ghép — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mỗi từ một chữ hiện 2–3 từ ghép minh hoạ trên slide dạy từ, mỗi từ nhiều chữ hiện phần tách chữ, và nghĩa đầu của từ một chữ là nghĩa khoá học dùng.

**Architecture:** Dữ liệu viết tay (`authored/associations/level{1,2,3}.json`, `authored/char-glosses.json`, sửa `authored/meanings/*.json`). Pipeline tra từ ngoài khoá trong CVDICT, kiểm tra âm đọc, rồi gắn `Word.associations` / `Word.parts` / `CharacterData.gloss|associations` vào output. Web đọc các field mới trong component `WordLinks` (slide dạy từ) và `CharacterPage`. Bài tập, FSRS, unit, câu, grammar giữ nguyên.

**Tech Stack:** TypeScript, tsx, vitest, React 19 + Tailwind, pnpm workspace.

**Spec:** `docs/superpowers/specs/2026-09-25-char-associations-design.md`

## Global Constraints

- pnpm ở `~/.npm-global/node_modules/.bin`: mọi lệnh chạy với `export PATH=~/.npm-global/node_modules/.bin:$PATH`.
- `/tmp` (tmpfs) đầy trên máy này: chạy test với `TMPDIR=<repo>/node_modules/.tmp` (tạo trước bằng `mkdir -p node_modules/.tmp`).
- Commit không có dòng `Co-Authored-By` (quy tắc của user).
- Không sửa tay `apps/web/public/content/`. Chỉ `pnpm content:build` được ghi vào đó, và phải commit output cùng dữ liệu authored.
- Unit, câu và grammar phải giữ byte-identical: `git diff main -- apps/web/public/content/units` luôn rỗng.
- Liên tưởng không phải từ phải học: không sinh bài tập, không vào FSRS, không đổi `slides.ts`.
- Mỗi từ một chữ có 2–3 liên tưởng, hoặc `{ "none": "<lý do>" }` khi thật sự không có từ ghép cùng âm đọc đáng dùng.
- Chữ trong liên tưởng phải đọc cùng âm tiết (bỏ dấu thanh) như từ đang dạy.
- Từ ngoài khoá phải có trong CVDICT (nguồn đã pin ở `CVDICT_SOURCE`).
- Gloss: mỗi vế (tách bằng `;`) tối đa 4 từ tiếng Việt.
- `words.json` < 2.5 MB (Workbox precache giới hạn 3 MB, `apps/web/vite.config.ts:38`).
- Nhãn UI mới viết bằng tiếng Việt: "Gặp trong", "Từng chữ", "đã học", "Liên tưởng", "Nghĩa gốc".

## Review Focus

- Chữ đa âm trong từ ghép (行 trong 银行 đọc háng): phần tách chữ phải hiện gloss của âm háng, không phải xíng. Test nằm ở Task 3 (`glossFor` / `buildParts`).
- Từ có 儿 hoá (有空儿 `yǒu kòngr`): căn âm tiết không được lệch, và không báo lỗi âm đọc sai. Test ở Task 2 (`alignSyllables`).
- Từ có Hán Việt override (银行 = Ngân Hàng): Hán Việt từng chữ trong phần tách chữ phải khớp với Hán Việt của từ. Test ở Task 3.
- Từ ngoài khoá là tên riêng (CVDICT `Tai4 ping2 yang2`): pinyin xuất ra phải viết thường. Test ở Task 2.
- Nghĩa liên tưởng dài trên màn hình 375 px: không được tràn ngang. Class `min-w-0`/wrap ở Task 5, kiểm tra bằng mắt ở Task 14.
- `words.json` phình quá giới hạn precache: có data test ở Task 4.

---

### Task 1: Types, loading dữ liệu authored, CVDICT trong build

**Files:**
- Modify: `packages/content/src/types.ts`
- Modify: `packages/content/src/pipeline/authored.ts`
- Modify: `packages/content/src/pipeline/run.ts` (chỉ `RunInputs`)
- Modify: `packages/content/src/pipeline/fetch.ts` (comment của `CVDICT_SOURCE`)
- Modify: `packages/content/scripts/build.ts`
- Test: `packages/content/test/authored.test.ts`, `packages/content/test/run.test.ts`

**Interfaces:**
- Produces (types.ts):
  ```ts
  export interface Association { zh: string; pinyin: string; hanViet: string; vi: string; wordId?: string }
  export interface WordPart { char: string; hanViet: string; gloss: string; wordId?: string }
  export interface AuthoredAssociation { zh: string; vi: string; pinyin?: string; hanViet?: string }
  export type AuthoredAssociationEntry = AuthoredAssociation[] | { none: string };
  export type CharGloss = string | Record<string, string>;
  // Word gets: associations?: Association[]; parts?: WordPart[];
  ```
- Produces (authored.ts): `Authored.associations: Record<string, AuthoredAssociationEntry>`, `Authored.charGlosses: Record<string, CharGloss>`
- Produces (run.ts): `RunInputs.cvdictText?: string`

- [ ] **Step 1: Worktree setup** (bỏ qua nếu controller đã tạo)

```bash
cd /home/shine/work/code/hi-chinese
git worktree add ../hi-chinese-assoc -b feat/char-associations main
cd ../hi-chinese-assoc && export PATH=~/.npm-global/node_modules/.bin:$PATH && pnpm install --frozen-lockfile && mkdir -p node_modules/.tmp
```

- [ ] **Step 2: Failing test cho loader** — thêm vào `packages/content/test/authored.test.ts` trong `describe('loadAuthored')`:

```ts
  it('reads associations (merged per level) and char glosses', async () => {
    await mkdir(join(dir, 'associations'));
    await writeFile(
      join(dir, 'associations', 'level1.json'),
      JSON.stringify({ 太: [{ zh: '太阳', vi: 'mặt trời' }] }),
    );
    await writeFile(join(dir, 'associations', 'level2.json'), JSON.stringify({ 呢: { none: 'hư từ' } }));
    await writeFile(join(dir, 'char-glosses.json'), JSON.stringify({ 太: 'to lớn; quá' }));
    const a = await loadAuthored(dir);
    expect(a.associations).toEqual({ 太: [{ zh: '太阳', vi: 'mặt trời' }], 呢: { none: 'hư từ' } });
    expect(a.charGlosses).toEqual({ 太: 'to lớn; quá' });
  });
```

Trong test `'tolerates a missing overrides file and empty folders'`, thêm `associations: {}` và `charGlosses: {}` vào object mong đợi.

- [ ] **Step 3: Chạy cho fail**

Run: `cd packages/content && TMPDIR=$PWD/../../node_modules/.tmp pnpm vitest run test/authored.test.ts`
Expected: FAIL (`associations` undefined)

- [ ] **Step 4: Implement**

`types.ts` — thêm các interface ở phần Interfaces (sau `Word`), thêm vào `Word`:

```ts
  /** Single-character words only: 2–3 compounds that show the character in use (not taught). */
  associations?: Association[];
  /** Multi-character words only: each character with its Hán Việt and core gloss. */
  parts?: WordPart[];
```

`authored.ts` — thêm hai field vào `Authored` và vào object trả về của `loadAuthored`:

```ts
  associations: Record<string, AuthoredAssociationEntry>;
  charGlosses: Record<string, CharGloss>;
```
```ts
    associations: (await readJsonObjectsMerged(
      join(authoredDir, 'associations'),
    )) as Record<string, AuthoredAssociationEntry>,
    charGlosses: await readJsonObject<Record<string, CharGloss>>(join(authoredDir, 'char-glosses.json')),
```
(import `AuthoredAssociationEntry, CharGloss` từ `../types.js`.)

`run.ts` — thêm vào `RunInputs`:

```ts
  /** CVDICT.u8 text; association words outside the course are checked against it. */
  cvdictText?: string;
```

`run.test.ts` — thêm `associations: {}, charGlosses: {},` vào factory `authored()`.

`fetch.ts` — thay comment phía trên `CVDICT_SOURCE` bằng:

```ts
// Pinned separately from SOURCES: fetched by the Vietnamese seeding script and by the
// content build (association words outside the course must exist in CVDICT).
```

`scripts/build.ts` — import `CVDICT_SOURCE` và đọc CVDICT:

```ts
import { CVDICT_SOURCE, fetchRaw } from '../src/pipeline/fetch.js';
...
const raw = await fetchRaw(rawDir);
const rawCvdict = await fetchRaw(rawDir, undefined, undefined, { cvdict: CVDICT_SOURCE });
...
  graphicsText: await readFile(raw.graphics, 'utf8'),
  cvdictText: await readFile(rawCvdict.cvdict!, 'utf8'),
  authored,
```

- [ ] **Step 5: Chạy test + build**

Run: `cd packages/content && TMPDIR=$PWD/../../node_modules/.tmp pnpm vitest run && pnpm typecheck && cd ../.. && pnpm content:build && git status --short apps/web/public/content`
Expected: test PASS. Build tải `CVDICT.u8` một lần (lần sau `cached`). `git status` trên content rỗng (output không đổi).

- [ ] **Step 6: Commit**

```bash
git add packages/content
git commit -m "feat(content): association/gloss types, authored loading, CVDICT in build"
```

---

### Task 2: Resolver liên tưởng + gắn vào `Word`

**Files:**
- Create: `packages/content/src/pipeline/associations.ts`
- Modify: `packages/content/src/pipeline/run.ts`
- Modify: `packages/content/scripts/build.ts`
- Test: `packages/content/test/associations.test.ts`

**Interfaces:**
- Consumes: types từ Task 1; `numberedToMarked`, `CedictEntry`, `parseCedict` từ `./cedict.js`
- Produces:
  ```ts
  export const MIN_ASSOCIATIONS = 2; export const MAX_ASSOCIATIONS = 3;
  export const ASSOCIATION_LEVELS_DONE: readonly HskLevel[]; // [] lúc đầu
  export const GLOSSES_DONE: boolean;                         // false lúc đầu
  export interface AssociationError { rule: string; ref: string; message: string }
  export function tonelessSyllables(pinyin: string): string[]
  export function alignSyllables(zh: string, pinyin: string): { char: string; syllable: string }[] | null
  export function indexCedict(entries: readonly CedictEntry[]): Map<string, CedictEntry[]>
  export function resolveAssociations(authored, words, cvdict, hanViet): { byChar: Map<string, Association[] | 'none'>; errors: AssociationError[] }
  export function attachAssociations(words: readonly Word[], byChar): Word[]
  export function findMissingAssociations(words: readonly Word[], byChar, levels: readonly HskLevel[]): string[]
  ```

- [ ] **Step 1: Failing tests** — `packages/content/test/associations.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  alignSyllables,
  attachAssociations,
  findMissingAssociations,
  indexCedict,
  resolveAssociations,
  tonelessSyllables,
} from '../src/pipeline/associations.js';
import { parseCedict } from '../src/pipeline/cedict.js';
import { makeHanViet } from '../src/pipeline/hanviet.js';
import type { Word } from '../src/types.js';

function w(simplified: string, pinyin: string, hanViet: string, level: 1 | 2 | 3 = 1, pos: string[] = ['d']): Word {
  return {
    id: `w:${simplified}`, simplified, traditional: simplified, pinyin, pinyinNumeric: '', hanViet,
    meanings: ['x'], alternates: [], pos, classifiers: [], level, frequency: 1,
    characters: [...simplified], unitId: 'l1-u01',
  };
}

const words = [w('太', 'tài', 'Thái'), w('太阳', 'tài yang', 'Thái Dương', 2), w('呢', 'ne', 'Ni', 1, ['y']), w('长', 'cháng', 'Trường')];
const hanViet = makeHanViet({ charMap: { 太: 'Thái', 平: 'Bình', 洋: 'Dương', 空: 'Không', 长: 'Trường', 大: 'Đại' }, wordOverrides: {} });
const cvdict = indexCedict(
  parseCedict(
    [
      '太平洋 太平洋 [Tai4 ping2 yang2] /Thái Bình Dương/',
      '太空 太空 [tai4 kong1] /không gian/',
      '長大 长大 [zhang3 da4] /lớn lên/',
      '太極 太极 [tai4 ji2] /thái cực/',
    ].join('\n'),
  ),
);

describe('tonelessSyllables / alignSyllables', () => {
  it('strips tones but keeps ü', () => {
    expect(tonelessSyllables('Tài píng yáng')).toEqual(['tai', 'ping', 'yang']);
    expect(tonelessSyllables('lǜ sè')).toEqual(['lü', 'se']);
  });
  it('folds erhua 儿 into the previous syllable', () => {
    expect(alignSyllables('有空儿', 'yǒu kòngr')).toEqual([
      { char: '有', syllable: 'you' },
      { char: '空', syllable: 'kong' },
      { char: '儿', syllable: '' },
    ]);
    expect(alignSyllables('太阳', 'tài')).toBeNull();
  });
});

describe('resolveAssociations', () => {
  it('fills course words from the course and outside words from CVDICT (lowercased)', () => {
    const { byChar, errors } = resolveAssociations(
      { 太: [{ zh: '太阳', vi: 'mặt trời' }, { zh: '太平洋', vi: 'Thái Bình Dương' }] },
      words, cvdict, hanViet,
    );
    expect(errors).toEqual([]);
    expect(byChar.get('太')).toEqual([
      { zh: '太阳', pinyin: 'tài yang', hanViet: 'Thái Dương', vi: 'mặt trời', wordId: 'w:太阳' },
      { zh: '太平洋', pinyin: 'tài píng yáng', hanViet: 'Thái Bình Dương', vi: 'Thái Bình Dương' },
    ]);
  });
  it('rejects a word whose character reads differently from the taught word', () => {
    const { errors } = resolveAssociations({ 长: [{ zh: '长大', vi: 'lớn lên' }] }, words, cvdict, hanViet);
    expect(errors.map((e) => e.rule)).toEqual(['association-reading']);
  });
  it('rejects unknown words, pinyin on course words, missing Hán Việt, bad keys and too many entries', () => {
    const { errors } = resolveAssociations(
      {
        太: [
          { zh: '太好', vi: 'x' },
          { zh: '太阳', vi: 'mặt trời', pinyin: 'tài yáng' },
          { zh: '太极', vi: 'thái cực' },
          { zh: '太空', vi: 'không gian' },
        ],
        猫: [{ zh: '猫咪', vi: 'mèo' }],
      },
      words, cvdict, hanViet,
    );
    expect(errors.map((e) => e.rule).sort()).toEqual([
      'association-count',
      'association-hanviet',
      'association-key',
      'association-source',
      'association-source',
    ]);
  });
  it('accepts an explicit none with a reason, and nothing else', () => {
    expect(resolveAssociations({ 呢: { none: 'hư từ cuối câu' } }, words, cvdict, hanViet).errors).toEqual([]);
    expect(resolveAssociations({ 呢: { none: ' ' } }, words, cvdict, hanViet).errors.map((e) => e.rule)).toEqual([
      'association-none',
    ]);
  });
});

describe('attachAssociations / findMissingAssociations', () => {
  it('attaches lists to single-character words only and reports gaps per level', () => {
    const { byChar } = resolveAssociations(
      { 太: [{ zh: '太阳', vi: 'mặt trời' }, { zh: '太空', vi: 'không gian' }], 呢: { none: 'hư từ' } },
      words, cvdict, hanViet,
    );
    const out = attachAssociations(words, byChar);
    expect(out[0]!.associations?.map((a) => a.zh)).toEqual(['太阳', '太空']);
    expect(out[2]!.associations).toBeUndefined();
    expect(findMissingAssociations(out, byChar, [1])).toEqual(['长']);
  });
});
```

- [ ] **Step 2: Chạy cho fail**

Run: `cd packages/content && TMPDIR=$PWD/../../node_modules/.tmp pnpm vitest run test/associations.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement** — `packages/content/src/pipeline/associations.ts`:

```ts
import type {
  Association,
  AuthoredAssociation,
  AuthoredAssociationEntry,
  HanVietResolver,
  HskLevel,
  Word,
} from '../types.js';
import { numberedToMarked, type CedictEntry } from './cedict.js';

export const MIN_ASSOCIATIONS = 2;
export const MAX_ASSOCIATIONS = 3;
/** Levels whose single-character words are fully authored; coverage guards apply to these. */
export const ASSOCIATION_LEVELS_DONE: readonly HskLevel[] = [];
/** True once every course character has a gloss (authored/char-glosses.json). */
export const GLOSSES_DONE = false;

const HAN = /\p{Script=Han}/u;
const TONE_MARKS = /[̀́̄̌]/g;

export interface AssociationError {
  rule: string;
  ref: string;
  message: string;
}

export type ResolvedAssociations = Map<string, Association[] | 'none'>;

/** "Tài píng yáng" -> ["tai", "ping", "yang"]; ü is kept. */
export function tonelessSyllables(pinyin: string): string[] {
  return pinyin
    .toLowerCase()
    .normalize('NFD')
    .replace(TONE_MARKS, '')
    .normalize('NFC')
    .split(/[\s'’-]+/)
    .map((s) => s.replace(/[^a-zü]/g, ''))
    .filter((s) => s.length > 0);
}

/**
 * Pairs each Han character of `zh` with its toneless syllable. An erhua 儿 written into the
 * previous syllable ("kòngr") gets '' and the r is dropped from that syllable. Null when the
 * syllables cannot be matched to the characters.
 */
export function alignSyllables(zh: string, pinyin: string): { char: string; syllable: string }[] | null {
  const chars = [...zh].filter((c) => HAN.test(c));
  const syllables = tonelessSyllables(pinyin);
  if (syllables.length === chars.length) return chars.map((char, i) => ({ char, syllable: syllables[i]! }));
  const out: { char: string; syllable: string }[] = [];
  let j = 0;
  for (const char of chars) {
    const prev = out[out.length - 1];
    if (char === '儿' && prev && prev.syllable.endsWith('r') && prev.syllable !== 'er') {
      prev.syllable = prev.syllable.slice(0, -1);
      out.push({ char, syllable: '' });
      continue;
    }
    const s = syllables[j++];
    if (s === undefined) return null;
    out.push({ char, syllable: s });
  }
  return j === syllables.length ? out : null;
}

export function indexCedict(entries: readonly CedictEntry[]): Map<string, CedictEntry[]> {
  const out = new Map<string, CedictEntry[]>();
  for (const e of entries) {
    const list = out.get(e.simplified);
    if (list) list.push(e);
    else out.set(e.simplified, [e]);
  }
  return out;
}

const normPinyin = (p: string) => p.toLowerCase().replace(/\s+/g, '').normalize('NFC');

function lookupCvdict(
  a: AuthoredAssociation,
  cvdict: ReadonlyMap<string, readonly CedictEntry[]>,
): { pinyin: string } | { error: string } {
  const readings = new Map<string, string>();
  for (const e of cvdict.get(a.zh) ?? []) {
    const marked = numberedToMarked(e.pinyin);
    if (marked !== null) readings.set(normPinyin(marked), marked.toLowerCase());
  }
  if (readings.size === 0) return { error: `${a.zh} is neither a course word nor in CVDICT` };
  const all = [...readings.values()].join(' | ');
  if (a.pinyin !== undefined) {
    const hit = readings.get(normPinyin(a.pinyin));
    return hit ? { pinyin: hit } : { error: `${a.zh} "${a.pinyin}" does not match CVDICT (${all})` };
  }
  if (readings.size > 1) return { error: `${a.zh} has several CVDICT readings (${all}): add "pinyin"` };
  return { pinyin: [...readings.values()][0]! };
}

export function resolveAssociations(
  authored: Readonly<Record<string, AuthoredAssociationEntry>>,
  words: readonly Word[],
  cvdict: ReadonlyMap<string, readonly CedictEntry[]>,
  hanViet: HanVietResolver,
): { byChar: ResolvedAssociations; errors: AssociationError[] } {
  const bySimplified = new Map(words.map((w) => [w.simplified, w]));
  const byChar: ResolvedAssociations = new Map();
  const errors: AssociationError[] = [];
  const err = (rule: string, ref: string, message: string) => errors.push({ rule, ref, message });

  for (const [char, entry] of Object.entries(authored)) {
    const host = bySimplified.get(char);
    if (!host || [...char].length !== 1) {
      err('association-key', char, `${char} is not a single-character course word`);
      continue;
    }
    if (!Array.isArray(entry)) {
      if (typeof entry.none !== 'string' || entry.none.trim() === '') {
        err('association-none', char, `${char}: "none" needs a reason`);
      } else byChar.set(char, 'none');
      continue;
    }
    if (entry.length > MAX_ASSOCIATIONS) {
      err('association-count', char, `${char} has ${entry.length} associations (max ${MAX_ASSOCIATIONS})`);
    }
    const taught = tonelessSyllables(host.pinyin)[0];
    const seen = new Set<string>();
    const out: Association[] = [];
    for (const a of entry.slice(0, MAX_ASSOCIATIONS)) {
      const ref = `${char}→${a.zh}`;
      const zhChars = [...a.zh];
      if (zhChars.length < 2 || !zhChars.every((c) => HAN.test(c)) || !zhChars.includes(char)) {
        err('association-contains', ref, `${a.zh} must be a 2+ character word containing ${char}`);
        continue;
      }
      if (seen.has(a.zh)) {
        err('association-duplicate', ref, `${a.zh} is listed twice for ${char}`);
        continue;
      }
      seen.add(a.zh);
      if (typeof a.vi !== 'string' || a.vi.trim() === '') {
        err('association-vi', ref, `${a.zh} has an empty vi`);
        continue;
      }
      const course = bySimplified.get(a.zh);
      let pinyin: string;
      let hv: string;
      if (course) {
        if (a.pinyin !== undefined || a.hanViet !== undefined) {
          err('association-source', ref, `${a.zh} is a course word: remove pinyin/hanViet (taken from the course)`);
          continue;
        }
        pinyin = course.pinyin;
        hv = course.hanViet;
      } else {
        const found = lookupCvdict(a, cvdict);
        if ('error' in found) {
          err('association-source', ref, found.error);
          continue;
        }
        pinyin = found.pinyin;
        hv = a.hanViet ?? hanViet.word(a.zh);
        if (hv === '') {
          err('association-hanviet', ref, `${a.zh} has a character outside the Hán Việt char-map: add "hanViet"`);
          continue;
        }
      }
      const aligned = alignSyllables(a.zh, pinyin);
      if (!aligned) {
        err('association-reading', ref, `cannot align ${a.zh} with "${pinyin}"`);
        continue;
      }
      const wrong = aligned.find((p) => p.char === char && p.syllable !== taught);
      if (wrong) {
        err('association-reading', ref, `${char} reads ${wrong.syllable} in ${a.zh} (${pinyin}) but ${taught} in the course`);
        continue;
      }
      out.push({ zh: a.zh, pinyin, hanViet: hv, vi: a.vi.trim(), ...(course ? { wordId: course.id } : {}) });
    }
    byChar.set(char, out);
  }
  return { byChar, errors };
}

export function attachAssociations(words: readonly Word[], byChar: ResolvedAssociations): Word[] {
  return words.map((w) => {
    const list = byChar.get(w.simplified);
    return [...w.simplified].length === 1 && Array.isArray(list) && list.length > 0
      ? { ...w, associations: list }
      : w;
  });
}

/** Single-character words of `levels` with neither 2–3 associations nor an explicit none. */
export function findMissingAssociations(
  words: readonly Word[],
  byChar: ResolvedAssociations,
  levels: readonly HskLevel[],
): string[] {
  return words
    .filter((w) => levels.includes(w.level) && [...w.simplified].length === 1)
    .filter((w) => {
      const list = byChar.get(w.simplified);
      return list !== 'none' && (list === undefined || list.length < MIN_ASSOCIATIONS);
    })
    .map((w) => w.simplified);
}
```

Lưu ý: test "rejects unknown words…" mong đợi đúng 5 lỗi: `太好` không có trong CVDICT → source; `太阳` có pinyin → source; `太极` có chữ 极 ngoài char-map → hanviet; danh sách có 4 mục → count (mục thứ 4 bị cắt bởi `slice`); `猫` → key.

- [ ] **Step 4: Gắn vào `run.ts`** — sau `const units = attachToUnits(...)`:

```ts
  const cvdict = indexCedict(inputs.cvdictText ? parseCedict(inputs.cvdictText) : []);
  const { byChar, errors: associationErrors } = resolveAssociations(
    inputs.authored.associations,
    words,
    cvdict,
    hanViet,
  );
  const linkedWords = attachAssociations(words, byChar);
```

Dùng `linkedWords` thay `words` trong lời gọi `buildCharacters(...)` và trong `bundle` (`const bundle: ContentBundle = { words: linkedWords, ... }`). Thêm vào `problems`: `...associationErrors.map((e) => \`[${e.rule}] ${e.message}\`),`. Import `parseCedict` từ `./cedict.js` và các hàm từ `./associations.js`.

Export thêm từ `RunResult` khi ok để build cảnh báo: đổi `{ ok: true; bundle: ContentBundle }` thành `{ ok: true; bundle: ContentBundle; associations: ResolvedAssociations }` và trả `{ ok: true, bundle, associations: byChar }`.

- [ ] **Step 5: Cảnh báo trong build** — cuối `scripts/build.ts`:

```ts
const missingAssoc = findMissingAssociations(result.bundle.words, result.associations, [1, 2, 3]);
if (missingAssoc.length > 0) {
  console.warn(`warning: ${missingAssoc.length} single-character word(s) without associations yet`);
}
```
(import `findMissingAssociations` từ `../src/pipeline/associations.js`.)

- [ ] **Step 6: Chạy test + build**

Run: `cd packages/content && TMPDIR=$PWD/../../node_modules/.tmp pnpm vitest run && pnpm typecheck && cd ../.. && pnpm content:build && git status --short apps/web/public/content`
Expected: PASS. Build in ra `warning: 542 single-character word(s) without associations yet`. Content không đổi.

- [ ] **Step 7: Commit**

```bash
git add packages/content
git commit -m "feat(content): resolve and validate character associations"
```

---

### Task 3: Gloss của chữ, phần tách chữ, CharacterData

**Files:**
- Create: `packages/content/src/pipeline/glosses.ts`
- Modify: `packages/content/src/types.ts` (`CharacterData`)
- Modify: `packages/content/src/pipeline/characters.ts` (kiểu trả về)
- Modify: `packages/content/src/pipeline/run.ts`
- Modify: `packages/content/scripts/build.ts`
- Modify: `apps/web/test/fixtures/content.ts`
- Test: `packages/content/test/glosses.test.ts`

**Interfaces:**
- Consumes: `alignSyllables`, `tonelessSyllables`, `ResolvedAssociations` (Task 2)
- Produces:
  ```ts
  // types.ts CharacterData gets: gloss: string; associations: Association[];
  export type BaseCharacterData = Omit<CharacterData, 'gloss' | 'associations'>; // characters.ts
  export function validateGlosses(glosses: Readonly<Record<string, CharGloss>>, courseChars: ReadonlySet<string>): AssociationError[]
  export function formatGloss(g: CharGloss | undefined): string
  export function glossFor(g: CharGloss | undefined, syllable: string): string
  export function buildParts(word: Word, glosses: Readonly<Record<string, CharGloss>>, singleCharIds: ReadonlyMap<string, string>, hanViet: HanVietResolver): WordPart[]
  export function attachParts(words: readonly Word[], glosses, hanViet): Word[]
  export function findMissingGlosses(courseChars: Iterable<string>, glosses): string[]
  ```

- [ ] **Step 1: Failing tests** — `packages/content/test/glosses.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  attachParts,
  buildParts,
  findMissingGlosses,
  formatGloss,
  glossFor,
  validateGlosses,
} from '../src/pipeline/glosses.js';
import { makeHanViet } from '../src/pipeline/hanviet.js';
import type { Word } from '../src/types.js';

function w(simplified: string, pinyin: string, hanViet: string): Word {
  return {
    id: `w:${simplified}`, simplified, traditional: simplified, pinyin, pinyinNumeric: '', hanViet,
    meanings: ['x'], alternates: [], pos: [], classifiers: [], level: 1, frequency: 1,
    characters: [...simplified], unitId: 'l1-u01',
  };
}
const hanViet = makeHanViet({ charMap: { 银: 'Ngân', 行: 'Hành', 太: 'Thái', 阳: 'Dương', 有: 'Hữu', 空: 'Không', 儿: 'Nhi' }, wordOverrides: { 银行: 'Ngân Hàng' } });
const glosses = { 银: 'bạc', 行: { xíng: 'đi; được', háng: 'hàng; dãy' }, 太: 'to lớn; quá', 阳: 'mặt trời; dương' };

describe('glossFor / formatGloss', () => {
  it('picks the reading-specific gloss of a polyphone', () => {
    expect(glossFor(glosses.行, 'hang')).toBe('hàng; dãy');
    expect(glossFor(glosses.行, 'xing')).toBe('đi; được');
    expect(glossFor(glosses.行, 'heng')).toBe('');
    expect(glossFor('bạc', 'yin')).toBe('bạc');
    expect(formatGloss(glosses.行)).toBe('xíng: đi; được · háng: hàng; dãy');
    expect(formatGloss(undefined)).toBe('');
  });
});

describe('buildParts', () => {
  it('uses the word-level Hán Việt split and the reading-specific gloss', () => {
    const parts = buildParts(w('银行', 'yín háng', 'Ngân Hàng'), glosses, new Map([['行', 'w:行']]), hanViet);
    expect(parts).toEqual([
      { char: '银', hanViet: 'Ngân', gloss: 'bạc' },
      { char: '行', hanViet: 'Hàng', gloss: 'hàng; dãy', wordId: 'w:行' },
    ]);
  });
  it('handles erhua and missing glosses', () => {
    const parts = buildParts(w('有空儿', 'yǒu kòngr', 'Hữu Không Nhi'), {}, new Map(), hanViet);
    expect(parts.map((p) => [p.char, p.hanViet, p.gloss])).toEqual([
      ['有', 'Hữu', ''],
      ['空', 'Không', ''],
      ['儿', 'Nhi', ''],
    ]);
  });
  it('attaches parts to multi-character words only', () => {
    const out = attachParts([w('太', 'tài', 'Thái'), w('太阳', 'tài yang', 'Thái Dương')], glosses, hanViet);
    expect(out[0]!.parts).toBeUndefined();
    expect(out[1]!.parts).toEqual([
      { char: '太', hanViet: 'Thái', gloss: 'to lớn; quá', wordId: 'w:太' },
      { char: '阳', hanViet: 'Dương', gloss: 'mặt trời; dương' },
    ]);
  });
});

describe('validateGlosses / findMissingGlosses', () => {
  it('flags unknown chars, long glosses and malformed polyphone maps', () => {
    const errors = validateGlosses(
      { 太: 'to lớn; quá', 猫: 'mèo', 阳: 'một thứ gì đó rất dài dòng', 行: { xíng: 'đi' }, 银: '' },
      new Set(['太', '阳', '行', '银']),
    );
    expect(errors.map((e) => `${e.rule}:${e.ref}`).sort()).toEqual([
      'char-gloss-key:猫',
      'char-gloss:行',
      'char-gloss:银',
      'char-gloss:阳',
    ]);
  });
  it('lists course characters without a gloss', () => {
    expect(findMissingGlosses(['太', '阳', '猫'], glosses)).toEqual(['猫']);
  });
});
```

- [ ] **Step 2: Chạy cho fail**

Run: `cd packages/content && TMPDIR=$PWD/../../node_modules/.tmp pnpm vitest run test/glosses.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement** — `packages/content/src/pipeline/glosses.ts`:

```ts
import type { CharGloss, HanVietResolver, Word, WordPart } from '../types.js';
import { alignSyllables, tonelessSyllables, type AssociationError } from './associations.js';

const HAN = /\p{Script=Han}/u;
export const MAX_GLOSS_WORDS = 4;

function glossTextOk(text: unknown): boolean {
  if (typeof text !== 'string' || text.trim() === '') return false;
  return text.split(';').every((part) => {
    const n = part.trim().split(/\s+/).filter(Boolean).length;
    return n >= 1 && n <= MAX_GLOSS_WORDS;
  });
}

export function validateGlosses(
  glosses: Readonly<Record<string, CharGloss>>,
  courseChars: ReadonlySet<string>,
): AssociationError[] {
  const errors: AssociationError[] = [];
  for (const [char, g] of Object.entries(glosses)) {
    if (!courseChars.has(char)) {
      errors.push({ rule: 'char-gloss-key', ref: char, message: `${char} is not a course character` });
      continue;
    }
    const ok =
      typeof g === 'string'
        ? glossTextOk(g)
        : Object.keys(g).length >= 2 &&
          Object.entries(g).every(([k, v]) => tonelessSyllables(k).length === 1 && glossTextOk(v));
    if (!ok) {
      errors.push({
        rule: 'char-gloss',
        ref: char,
        message: `${char}: gloss must be non-empty, ≤ ${MAX_GLOSS_WORDS} words per ";" part; a polyphone map needs ≥ 2 single-syllable keys`,
      });
    }
  }
  return errors;
}

export function formatGloss(g: CharGloss | undefined): string {
  if (g === undefined) return '';
  if (typeof g === 'string') return g;
  return Object.entries(g)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');
}

export function glossFor(g: CharGloss | undefined, syllable: string): string {
  if (g === undefined) return '';
  if (typeof g === 'string') return g;
  const hit = Object.entries(g).find(([k]) => tonelessSyllables(k)[0] === syllable);
  return hit ? hit[1] : '';
}

export function buildParts(
  word: Word,
  glosses: Readonly<Record<string, CharGloss>>,
  singleCharIds: ReadonlyMap<string, string>,
  hanViet: HanVietResolver,
): WordPart[] {
  const chars = [...word.simplified].filter((c) => HAN.test(c));
  const aligned = alignSyllables(word.simplified, word.pinyin);
  const hvParts = word.hanViet.split(/\s+/).filter(Boolean);
  return chars.map((char, i) => {
    const wordId = singleCharIds.get(char);
    return {
      char,
      hanViet: hvParts.length === chars.length ? hvParts[i]! : hanViet.char(char),
      gloss: glossFor(glosses[char], aligned?.[i]?.syllable ?? ''),
      ...(wordId !== undefined && wordId !== word.id ? { wordId } : {}),
    };
  });
}

export function attachParts(
  words: readonly Word[],
  glosses: Readonly<Record<string, CharGloss>>,
  hanViet: HanVietResolver,
): Word[] {
  const singleCharIds = new Map(
    words.filter((w) => [...w.simplified].length === 1).map((w) => [w.simplified, w.id]),
  );
  return words.map((w) =>
    [...w.simplified].length > 1 ? { ...w, parts: buildParts(w, glosses, singleCharIds, hanViet) } : w,
  );
}

export function findMissingGlosses(
  courseChars: Iterable<string>,
  glosses: Readonly<Record<string, CharGloss>>,
): string[] {
  return [...courseChars].filter((c) => glosses[c] === undefined);
}
```

`types.ts` — thêm vào `CharacterData`:

```ts
  /** Short core meaning used to explain compounds; '' until authored. */
  gloss: string;
  /** Associations of the single-character word written with this character ([] if none). */
  associations: Association[];
```

`characters.ts` — `export type BaseCharacterData = Omit<CharacterData, 'gloss' | 'associations'>;`, và đổi kiểu trả về của `buildCharacters` thành `{ characters: BaseCharacterData[]; missing: string[] }` (cùng biến local `characters`).

`run.ts` — sau `const linkedWords = attachAssociations(words, byChar);` đổi thành:

```ts
  const linkedWords = attachParts(attachAssociations(words, byChar), inputs.authored.charGlosses, hanViet);
```

Sau `buildCharacters(...)`:

```ts
  const characters: CharacterData[] = baseCharacters.map((c) => {
    const list = byChar.get(c.character);
    return {
      ...c,
      gloss: formatGloss(inputs.authored.charGlosses[c.character]),
      associations: Array.isArray(list) ? list : [],
    };
  });
  const glossErrors = validateGlosses(
    inputs.authored.charGlosses,
    new Set(baseCharacters.map((c) => c.character)),
  );
```

(đổi tên destructure thành `const { characters: baseCharacters, missing } = buildCharacters(...)`, thêm `...glossErrors.map((e) => \`[${e.rule}] ${e.message}\`),` vào `problems`, import `CharacterData`.)

`scripts/build.ts` — thêm sau cảnh báo liên tưởng:

```ts
const missingGloss = findMissingGlosses(result.bundle.characters.map((c) => c.character), authored.charGlosses);
if (missingGloss.length > 0) console.warn(`warning: ${missingGloss.length} character(s) without a gloss yet`);
```

`apps/web/test/fixtures/content.ts` — thêm `gloss: '', associations: [],` vào hai object trong `fixtureCharacters`.

- [ ] **Step 4: Chạy test, typecheck, build**

Run: `cd packages/content && TMPDIR=$PWD/../../node_modules/.tmp pnpm vitest run && cd ../.. && pnpm typecheck && pnpm content:build && git diff --stat -- apps/web/public/content | tail -3 && git diff --quiet main -- apps/web/public/content/units && echo UNITS-UNCHANGED`
Expected: test PASS, typecheck PASS. Build cảnh báo 542 liên tưởng và 899 gloss còn thiếu. Diff chỉ gồm `words.json` (thêm `parts`), `characters/*.json` (thêm `gloss: ""`, `associations: []`) và `manifest.json`. In ra `UNITS-UNCHANGED`.

- [ ] **Step 5: Web test vẫn xanh**

Run: `TMPDIR=$PWD/node_modules/.tmp pnpm -F @hi-chinese/web test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/content apps/web/test/fixtures/content.ts apps/web/public/content
git commit -m "feat(content): character glosses, word parts, gloss/associations on characters"
```

---

### Task 4: Guard dữ liệu + script hỗ trợ viết nội dung

**Files:**
- Create: `packages/content/src/pipeline/assoc-context.ts`
- Create: `packages/content/scripts/assoc-context.ts`
- Modify: `packages/content/package.json` (script `assoc-context`)
- Create: `packages/content/test/associations-data.test.ts`
- Test: `packages/content/test/assoc-context.test.ts`

**Interfaces:**
- Consumes: `ASSOCIATION_LEVELS_DONE`, `GLOSSES_DONE`, `MIN_ASSOCIATIONS`, `MAX_ASSOCIATIONS`, `alignSyllables`, `tonelessSyllables`, `indexCedict` (Task 2)
- Produces:
  ```ts
  export function singleCharWordsInOrder(words: readonly Word[], units: readonly Unit[], level: HskLevel): Word[]
  export function cvdictCandidates(char: string, taught: string, cvdict: ReadonlyMap<string, readonly CedictEntry[]>, courseWords: ReadonlySet<string>, limit?: number): { zh: string; pinyin: string; vi: string; inCourse: boolean }[]
  export const PARTICLE_POS: readonly string[]  // ['u', 'y', 'e', 'o']
  export function isLabelOnlyMeaning(meaning: string): boolean
  ```
  Lệnh: `pnpm -F @hi-chinese/content assoc-context --level N [--from i] [--to j]` và `... assoc-context --glosses [--from i] [--to j]`

- [ ] **Step 1: Failing test cho helper** — `packages/content/test/assoc-context.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cvdictCandidates, isLabelOnlyMeaning, singleCharWordsInOrder } from '../src/pipeline/assoc-context.js';
import { indexCedict } from '../src/pipeline/associations.js';
import { parseCedict } from '../src/pipeline/cedict.js';
import type { Unit, Word } from '../src/types.js';

const word = (simplified: string, unitId: string, level: 1 | 2 | 3 = 1): Word => ({
  id: `w:${simplified}`, simplified, traditional: simplified, pinyin: 'x', pinyinNumeric: '', hanViet: '',
  meanings: ['x'], alternates: [], pos: [], classifiers: [], level, frequency: 1, characters: [...simplified], unitId,
});
const unit = (id: string, order: number, wordIds: string[]): Unit => ({ id, level: 1, order, title: id, wordIds, grammarIds: [], sentenceIds: [] });

describe('singleCharWordsInOrder', () => {
  it('orders single-character words by unit order then position', () => {
    const words = [word('好', 'u2'), word('你', 'u1'), word('你好', 'u2'), word('我', 'u1')];
    const units = [unit('u2', 2, ['w:你好', 'w:好']), unit('u1', 1, ['w:我', 'w:你'])];
    expect(singleCharWordsInOrder(words, units, 1).map((w) => w.simplified)).toEqual(['我', '你', '好']);
  });
});

describe('cvdictCandidates', () => {
  it('keeps same-reading 2–4 character words, course words first', () => {
    const cvdict = indexCedict(
      parseCedict(
        [
          '太空 太空 [tai4 kong1] /không gian/',
          '太陽 太阳 [tai4 yang5] /mặt trời/',
          '大 大 [da4] /to/',
          '太平洋 太平洋 [Tai4 ping2 yang2] /Thái Bình Dương/',
          '泰 泰 [tai4] /x/',
        ].join('\n'),
      ),
    );
    const got = cvdictCandidates('太', 'tai', cvdict, new Set(['太阳']));
    expect(got.map((c) => [c.zh, c.inCourse])).toEqual([
      ['太阳', true],
      ['太空', false],
      ['太平洋', false],
    ]);
  });
});

describe('isLabelOnlyMeaning', () => {
  it('flags pure labels and bound-form prefixes, not real senses', () => {
    expect(isLabelOnlyMeaning('(phó từ mức độ)')).toBe(true);
    expect(isLabelOnlyMeaning('(hình thức kết hợp) trên; phía trên')).toBe(true);
    expect(isLabelOnlyMeaning('(bị) đau; nhức')).toBe(false);
    expect(isLabelOnlyMeaning('rất')).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy cho fail**

Run: `cd packages/content && TMPDIR=$PWD/../../node_modules/.tmp pnpm vitest run test/assoc-context.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement helper** — `packages/content/src/pipeline/assoc-context.ts`:

```ts
import type { HskLevel, Unit, Word } from '../types.js';
import { alignSyllables } from './associations.js';
import { numberedToMarked, type CedictEntry } from './cedict.js';

export const PARTICLE_POS: readonly string[] = ['u', 'y', 'e', 'o'];

const LABEL_ONLY = /^\([^()]*\)$/;
const BOUND_FORM = /^\((hình thức|dạng) (kết hợp|liên kết|ràng buộc|cố định)\)/i;

/** A first meaning that is only a grammar label, or a CEDICT "(bound form)" prefix. */
export function isLabelOnlyMeaning(meaning: string): boolean {
  const m = meaning.trim();
  return LABEL_ONLY.test(m) || BOUND_FORM.test(m);
}

export function singleCharWordsInOrder(words: readonly Word[], units: readonly Unit[], level: HskLevel): Word[] {
  const byId = new Map(words.map((w) => [w.id, w]));
  return [...units]
    .filter((u) => u.level === level)
    .sort((a, b) => a.order - b.order)
    .flatMap((u) => u.wordIds.map((id) => byId.get(id)).filter((w): w is Word => w !== undefined))
    .filter((w) => w.level === level && [...w.simplified].length === 1);
}

export function cvdictCandidates(
  char: string,
  taught: string,
  cvdict: ReadonlyMap<string, readonly CedictEntry[]>,
  courseWords: ReadonlySet<string>,
  limit = 20,
): { zh: string; pinyin: string; vi: string; inCourse: boolean }[] {
  const out: { zh: string; pinyin: string; vi: string; inCourse: boolean }[] = [];
  for (const [zh, entries] of cvdict) {
    const len = [...zh].length;
    if (len < 2 || len > 4 || !zh.includes(char)) continue;
    for (const e of entries) {
      const pinyin = numberedToMarked(e.pinyin)?.toLowerCase();
      if (!pinyin) continue;
      const aligned = alignSyllables(zh, pinyin);
      if (!aligned || aligned.some((p) => p.char === char && p.syllable !== taught)) continue;
      out.push({ zh, pinyin, vi: e.meanings.slice(0, 2).join('; '), inCourse: courseWords.has(zh) });
      break;
    }
  }
  return out
    .sort((a, b) => Number(b.inCourse) - Number(a.inCourse) || [...a.zh].length - [...b.zh].length)
    .slice(0, limit);
}
```

- [ ] **Step 4: Script** — `packages/content/scripts/assoc-context.ts`:

```ts
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAuthored } from '../src/pipeline/authored.js';
import { cvdictCandidates, singleCharWordsInOrder } from '../src/pipeline/assoc-context.js';
import { alignSyllables, indexCedict, tonelessSyllables } from '../src/pipeline/associations.js';
import { parseCedict } from '../src/pipeline/cedict.js';
import { CVDICT_SOURCE, fetchRaw } from '../src/pipeline/fetch.js';
import { formatGloss } from '../src/pipeline/glosses.js';
import type { CharacterData, HskLevel, UnitChunk, Word } from '../src/types.js';

// Authoring aid for associations / glosses / meaning order. Prints context per item; writes nothing.
const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../../../apps/web/public/content');
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const from = Number(arg('from') ?? 0);
const to = Number(arg('to') ?? Number.MAX_SAFE_INTEGER);

const words = JSON.parse(await readFile(resolve(content, 'words.json'), 'utf8')) as Word[];
const chunks: UnitChunk[] = [];
for (const f of (await readdir(resolve(content, 'units'))).filter((n) => n.endsWith('.json'))) {
  chunks.push(JSON.parse(await readFile(resolve(content, 'units', f), 'utf8')) as UnitChunk);
}
const units = chunks.map((c) => c.unit);
const unitOrder = new Map(units.map((u) => [u.id, u.order]));
const sentences = chunks.flatMap((c) => c.sentences);
const authored = await loadAuthored(resolve(here, '../src/authored'));
const raw = await fetchRaw(resolve(here, '../raw'), undefined, () => {}, { cvdict: CVDICT_SOURCE });
const cvdict = indexCedict(parseCedict(await readFile(raw.cvdict!, 'utf8')));
const courseSet = new Set(words.map((w) => w.simplified));
const readChar = async (ch: string) =>
  JSON.parse(
    await readFile(resolve(content, 'characters', `${ch.codePointAt(0)!.toString(16)}.json`), 'utf8'),
  ) as CharacterData;

/** Course words containing `ch`, with the syllable `ch` has in each. */
function courseWordsWith(ch: string): string[] {
  return words
    .filter((w) => w.simplified !== ch && w.simplified.includes(ch))
    .sort((a, b) => (unitOrder.get(a.unitId) ?? 0) - (unitOrder.get(b.unitId) ?? 0))
    .map((w) => {
      const syl = alignSyllables(w.simplified, w.pinyin)?.find((p) => p.char === ch)?.syllable ?? '?';
      return `${w.simplified} ${w.pinyin} [${syl}] (${w.unitId}) ${w.hanViet} — ${w.meanings[0]}`;
    });
}

if (process.argv.includes('--glosses')) {
  const single = new Set(words.filter((w) => [...w.simplified].length === 1).map((w) => w.simplified));
  const firstUnit = new Map<string, number>();
  for (const w of words)
    for (const ch of w.characters)
      firstUnit.set(ch, Math.min(firstUnit.get(ch) ?? Infinity, unitOrder.get(w.unitId) ?? Infinity));
  const chars = [...firstUnit.keys()].filter((c) => !single.has(c)).sort((a, b) => firstUnit.get(a)! - firstUnit.get(b)!);
  console.log(`characters that are not single-character course words: ${chars.length}`);
  for (const [i, ch] of chars.entries()) {
    if (i < from || i > to) continue;
    const c = await readChar(ch);
    console.log(`\n[${i}] ${ch} · ${c.hanViet} · readings ${c.pinyin.join(', ')}`);
    console.log(`  gloss now: ${formatGloss(authored.charGlosses[ch]) || '—'}`);
    console.log(`  definition: ${c.definition ?? '—'}`);
    for (const line of courseWordsWith(ch)) console.log(`  course: ${line}`);
  }
} else {
  const level = Number(arg('level')) as HskLevel;
  if (![1, 2, 3].includes(level)) {
    console.error('Usage: assoc-context --level <1|2|3> [--from i] [--to j] | --glosses [--from i] [--to j]');
    process.exit(1);
  }
  const list = singleCharWordsInOrder(words, units, level);
  console.log(`level ${level}: ${list.length} single-character words`);
  for (const [i, w] of list.entries()) {
    if (i < from || i > to) continue;
    const taught = tonelessSyllables(w.pinyin)[0]!;
    const c = await readChar(w.simplified);
    const current = authored.associations[w.simplified];
    console.log(`\n[${i}] ${w.simplified} ${w.pinyin} · ${w.hanViet} · ${w.unitId} · pos ${w.pos.join(',')}`);
    console.log(`  meanings now: ${w.meanings.join(' | ')}`);
    console.log(`  gloss now: ${formatGloss(authored.charGlosses[w.simplified]) || '—'} · char definition: ${c.definition ?? '—'}`);
    console.log(`  associations now: ${current === undefined ? '—' : JSON.stringify(current)}`);
    for (const s of sentences.filter((s) => s.wordIds.includes(w.id)).slice(0, 4))
      console.log(`  sentence: ${s.zh} ${s.pinyin} — ${s.vi}`);
    for (const line of courseWordsWith(w.simplified)) console.log(`  course: ${line}`);
    for (const cand of cvdictCandidates(w.simplified, taught, cvdict, courseSet))
      console.log(`  cvdict${cand.inCourse ? ' (course)' : ''}: ${cand.zh} ${cand.pinyin} — ${cand.vi}`);
  }
}
```

`package.json` — thêm vào `scripts`: `"assoc-context": "tsx scripts/assoc-context.ts",`

- [ ] **Step 5: Data guard** — `packages/content/test/associations-data.test.ts`:

```ts
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isLabelOnlyMeaning, PARTICLE_POS } from '../src/pipeline/assoc-context.js';
import { ASSOCIATION_LEVELS_DONE, GLOSSES_DONE, MAX_ASSOCIATIONS, MIN_ASSOCIATIONS } from '../src/pipeline/associations.js';
import type { AuthoredAssociationEntry, CharacterData, Word } from '../src/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../../../apps/web/public/content');
const authoredDir = resolve(here, '../src/authored');
const readJson = async <T>(p: string) => JSON.parse(await readFile(p, 'utf8')) as T;

async function authoredAssociations(): Promise<Record<string, AuthoredAssociationEntry>> {
  const out: Record<string, AuthoredAssociationEntry> = {};
  const dir = resolve(authoredDir, 'associations');
  const names = await readdir(dir).catch(() => [] as string[]);
  for (const n of names.filter((n) => n.endsWith('.json'))) Object.assign(out, await readJson(resolve(dir, n)));
  return out;
}

// Spec 2026-09-25-char-associations-design.md. Coverage checks apply only to finished levels
// (ASSOCIATION_LEVELS_DONE) and, for glosses, once GLOSSES_DONE is flipped.
describe('character associations (shipped data)', () => {
  it('gives every single-character word of a finished level 2–3 associations or an explicit none', async () => {
    const words = await readJson<Word[]>(resolve(content, 'words.json'));
    const authored = await authoredAssociations();
    const gaps = words
      .filter((w) => ASSOCIATION_LEVELS_DONE.includes(w.level) && [...w.simplified].length === 1)
      .filter((w) => {
        const entry = authored[w.simplified];
        if (entry !== undefined && !Array.isArray(entry)) return false;
        const n = w.associations?.length ?? 0;
        return n < MIN_ASSOCIATIONS || n > MAX_ASSOCIATIONS;
      })
      .map((w) => w.simplified);
    expect(gaps).toEqual([]);
  });

  it('puts a real sense first for single-character words of a finished level (particles exempt)', async () => {
    const words = await readJson<Word[]>(resolve(content, 'words.json'));
    const bad = words
      .filter((w) => ASSOCIATION_LEVELS_DONE.includes(w.level) && [...w.simplified].length === 1)
      .filter((w) => !w.pos.some((p) => PARTICLE_POS.includes(p)))
      .filter((w) => isLabelOnlyMeaning(w.meanings[0] ?? ''))
      .map((w) => `${w.simplified}: ${w.meanings[0]}`);
    expect(bad).toEqual([]);
  });

  it('has a gloss for every character once glosses are done', async () => {
    if (!GLOSSES_DONE) return;
    const files = (await readdir(resolve(content, 'characters'))).filter((n) => n.endsWith('.json'));
    const missing: string[] = [];
    for (const f of files) {
      const c = await readJson<CharacterData>(resolve(content, 'characters', f));
      if (c.gloss.trim() === '') missing.push(c.character);
    }
    expect(missing).toEqual([]);
  });

  it('keeps CVDICT metadata out of association and gloss text', async () => {
    const texts = [
      ...Object.values(await authoredAssociations()).flatMap((e) => (Array.isArray(e) ? e.map((a) => a.vi) : [])),
      ...Object.values(
        await readJson<Record<string, string | Record<string, string>>>(resolve(authoredDir, 'char-glosses.json')).catch(
          () => ({}),
        ),
      ).flatMap((g) => (typeof g === 'string' ? [g] : Object.values(g))),
    ];
    expect(texts.filter((t) => /\[[a-z]+[1-5]\]|khang hy|lượng từ\s*:/i.test(t))).toEqual([]);
  });

  it('keeps words.json under the precache budget', async () => {
    expect((await stat(resolve(content, 'words.json'))).size).toBeLessThan(2.5 * 1024 * 1024);
  });
});
```

- [ ] **Step 6: Chạy test + thử script**

Run:
```bash
cd packages/content && TMPDIR=$PWD/../../node_modules/.tmp pnpm vitest run && pnpm typecheck
pnpm -s assoc-context --level 1 --from 0 --to 2 && pnpm -s assoc-context --glosses --from 0 --to 1
```
Expected: test PASS. Script in ra 3 mục L1 (có `cvdict:` candidates) và 2 chữ gloss.

- [ ] **Step 7: Commit**

```bash
git add packages/content
git commit -m "feat(content): association data guards and assoc-context authoring aid"
```

---

### Task 5: Web — `WordLinks` trên slide dạy từ

**Files:**
- Create: `apps/web/src/lessons/WordLinks.tsx`
- Modify: `apps/web/src/lessons/LessonFlow.tsx` (`WordIntroSlide` + chỗ gọi)
- Test: `apps/web/test/lessons/WordLinks.test.tsx`

**Interfaces:**
- Consumes: `Word.associations`, `Word.parts` (Task 1–3); `ContentIndex` (`apps/web/src/content/index.ts`)
- Produces: `export function WordLinks({ word, content }: { word: Word; content: ContentIndex }): JSX.Element | null`

- [ ] **Step 1: Failing test** — `apps/web/test/lessons/WordLinks.test.tsx`:

```tsx
// @vitest-environment jsdom
import type { Word } from '@hi-chinese/content';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildContentIndex } from '../../src/content/index.js';
import { WordLinks } from '../../src/lessons/WordLinks.js';
import { fixtureManifest, fixtureWords } from '../fixtures/content.js';

const find = (s: string) => fixtureWords.find((w) => w.simplified === s)!;
const hao: Word = {
  ...find('好'),
  associations: [
    { zh: '你好', pinyin: 'nǐ hǎo', hanViet: 'Nễ Hảo', vi: 'xin chào', wordId: 'w:你好' },
    { zh: '好人', pinyin: 'hǎo rén', hanViet: 'Hảo Nhân', vi: 'người tốt' },
  ],
};
const laoshi: Word = {
  ...find('老师'),
  parts: [
    { char: '老', hanViet: 'Lão', gloss: 'già; cũ' },
    { char: '师', hanViet: 'Sư', gloss: 'thầy' },
  ],
};
const women: Word = {
  ...find('老师'),
  id: 'w:我们',
  simplified: '我们',
  parts: [
    { char: '我', hanViet: 'Ngã', gloss: 'tôi', wordId: 'w:我' },
    { char: '们', hanViet: 'Môn', gloss: '', wordId: 'w:们' },
  ],
};
const nihao: Word = { ...find('你'), id: 'w:你好', simplified: '你好', unitId: 'l1-u02' };
const content = buildContentIndex(fixtureManifest, [...fixtureWords, nihao]);

describe('WordLinks', () => {
  it('lists associations of a single-character word with pinyin, Hán Việt and meaning', () => {
    render(<WordLinks word={hao} content={content} />);
    const box = screen.getByRole('region', { name: 'Gặp trong' });
    expect(within(box).getByText('你好')).toBeTruthy();
    expect(within(box).getByText('xin chào')).toBeTruthy();
    expect(within(box).getByText(/Hảo Nhân/)).toBeTruthy();
    // 你好 is taught in l1-u02, after 好 (l1-u01): not marked as learned.
    expect(within(box).queryByText('đã học')).toBeNull();
  });

  it('splits a compound into characters and marks characters learned in an earlier unit', () => {
    // 我们 sits in l1-u02 (copied from 老师); 我 was taught in l1-u01, 们 in l1-u02 (same unit).
    render(<WordLinks word={women} content={content} />);
    const box = screen.getByRole('region', { name: 'Từng chữ' });
    const items = within(box).getAllByRole('listitem');
    expect(within(items[0]!).getByText('tôi')).toBeTruthy();
    expect(within(items[0]!).getByText('đã học')).toBeTruthy();
    expect(within(items[1]!).queryByText('đã học')).toBeNull();
  });

  it('renders parts without a learned badge when no character is a course word', () => {
    render(<WordLinks word={laoshi} content={content} />);
    expect(screen.getByText('thầy')).toBeTruthy();
    expect(screen.queryByText('đã học')).toBeNull();
  });

  it('renders nothing for a word without links', () => {
    const { container } = render(<WordLinks word={find('吗')} content={content} />);
    expect(container.innerHTML).toBe('');
  });
});
```

- [ ] **Step 2: Chạy cho fail**

Run: `cd apps/web && TMPDIR=$PWD/../../node_modules/.tmp pnpm vitest run test/lessons/WordLinks.test.tsx`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement** — `apps/web/src/lessons/WordLinks.tsx`:

```tsx
import type { Word } from '@hi-chinese/content';
import { SpeakButton } from '../audio/SpeakButton.js';
import type { ContentIndex } from '../content/index.js';

function LearnedBadge() {
  return <span className="ml-1 rounded bg-green-100 px-1 text-xs text-green-800">đã học</span>;
}

/**
 * Association block under a word's meanings: compounds that use a single character
 * ("Gặp trong"), or the characters of a compound ("Từng chữ"). Display only — nothing here
 * is taught or tested.
 */
export function WordLinks({ word, content }: { word: Word; content: ContentIndex }) {
  const currentOrder = content.unitById.get(word.unitId)?.order ?? Number.POSITIVE_INFINITY;
  const learned = (wordId: string | undefined): boolean => {
    if (wordId === undefined) return false;
    const w = content.words.get(wordId);
    const order = w ? content.unitById.get(w.unitId)?.order : undefined;
    return order !== undefined && order < currentOrder;
  };

  if (word.associations && word.associations.length > 0) {
    return (
      <section
        aria-label="Gặp trong"
        className="w-full max-w-sm rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
      >
        <h3 className="text-xs font-medium uppercase tracking-wide text-stone-500">Gặp trong</h3>
        <ul className="mt-1 flex flex-col gap-2">
          {word.associations.map((a) => (
            <li key={a.zh} className="flex items-center gap-3">
              <span className="text-xl">{a.zh}</span>
              <div className="flex min-w-0 flex-1 flex-col text-sm leading-tight">
                <span className="text-stone-600">
                  {a.pinyin}
                  {a.hanViet && <span className="italic text-stone-500"> · {a.hanViet}</span>}
                </span>
                <span className="break-words text-stone-800">
                  {a.vi}
                  {learned(a.wordId) && <LearnedBadge />}
                </span>
              </div>
              <SpeakButton text={a.zh} />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (word.parts && word.parts.length > 0) {
    return (
      <section
        aria-label="Từng chữ"
        className="w-full max-w-sm rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
      >
        <h3 className="text-xs font-medium uppercase tracking-wide text-stone-500">Từng chữ</h3>
        <ul className="mt-1 flex flex-wrap justify-center gap-2">
          {word.parts.map((p, i) => (
            <li
              key={`${p.char}-${i}`}
              className="flex min-w-16 max-w-28 flex-col items-center rounded border border-stone-200 bg-white px-2 py-1"
            >
              <span className="text-2xl">{p.char}</span>
              <span className="text-xs italic text-stone-500">{p.hanViet}</span>
              {p.gloss && <span className="break-words text-center text-xs text-stone-700">{p.gloss}</span>}
              {learned(p.wordId) && <LearnedBadge />}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return null;
}
```

`LessonFlow.tsx`:
- `import { WordLinks } from './WordLinks.js';`
- `WordIntroSlide` nhận thêm prop `content: ContentIndex`, render `<WordLinks word={word} content={content} />` ngay sau `</ul>` của nghĩa, trước `<ContinueButton>`.
- Case `'word-intro'`: `<WordIntroSlide word={word} content={content} onContinue={onContinue} />`.

- [ ] **Step 4: Chạy test**

Run: `cd apps/web && TMPDIR=$PWD/../../node_modules/.tmp pnpm vitest run && pnpm typecheck`
Expected: PASS (kể cả `LessonFlow.test.tsx`).

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): show associations and character parts on the word slide"
```

---

### Task 6: Web — CharacterPage hiện nghĩa gốc + liên tưởng

**Files:**
- Modify: `apps/web/src/character/CharacterPage.tsx`
- Modify: `apps/web/test/fixtures/content.ts` (điền `gloss`/`associations` cho 我)
- Test: `apps/web/test/character/CharacterPage.test.tsx`

**Interfaces:**
- Consumes: `CharacterData.gloss`, `CharacterData.associations` (Task 3)

- [ ] **Step 1: Fixture** — trong `fixtureCharacters`, object 我: `gloss: 'tôi; ta'`, `associations: [{ zh: '我们', pinyin: 'wǒ men', hanViet: 'Ngã Môn', vi: 'chúng tôi' }]`.

- [ ] **Step 2: Failing test** — thêm vào `CharacterPage.test.tsx` (dùng `stubFetch(noSync)` và `renderApp` có sẵn trong file; route của 我 là `/character/6211`):

```tsx
describe('CharacterPage associations', () => {
  it('shows the core gloss and the association list', async () => {
    stubFetch(noSync);
    renderApp('/character/6211');
    expect(await screen.findByText('tôi; ta')).toBeTruthy();
    const box = screen.getByRole('region', { name: 'Liên tưởng' });
    expect(within(box).getByText('我们')).toBeTruthy();
    expect(within(box).getByText('chúng tôi')).toBeTruthy();
  });
});
```
(thêm `within` vào import từ `@testing-library/react`. Nếu file chưa có `renderApp`, copy định nghĩa từ `test/lessons/LessonFlow.test.tsx`.)

- [ ] **Step 3: Chạy cho fail**

Run: `cd apps/web && TMPDIR=$PWD/../../node_modules/.tmp pnpm vitest run test/character/CharacterPage.test.tsx`
Expected: FAIL

- [ ] **Step 4: Implement** — trong `CharacterPage.tsx`, ngay trước `{data.definition && ...}`:

```tsx
          {data.gloss && (
            <p className="text-stone-900">
              <span className="text-sm text-stone-500">Nghĩa gốc: </span>
              <span>{data.gloss}</span>
            </p>
          )}
```

Và trước section `Course words`:

```tsx
      {data.associations.length > 0 && (
        <section aria-label="Liên tưởng" className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Liên tưởng</h2>
          <ul className="flex flex-col gap-1">
            {data.associations.map((a) => (
              <li
                key={a.zh}
                className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2"
              >
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <span className="text-lg">{a.zh}</span>
                  <span className="text-sm text-stone-600">{a.pinyin}</span>
                  {a.hanViet && <span className="text-sm italic text-stone-500">{a.hanViet}</span>}
                  <span className="text-sm text-stone-500">{a.vi}</span>
                </div>
                <SpeakButton text={a.zh} />
              </li>
            ))}
          </ul>
        </section>
      )}
```

- [ ] **Step 5: Chạy test**

Run: `cd apps/web && TMPDIR=$PWD/../../node_modules/.tmp pnpm vitest run && pnpm typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): character page shows core gloss and associations"
```

---

### Tasks 7–12: Nội dung cho từ một chữ (theo batch)

Sáu task cùng một quy trình, mỗi task một khoảng index của `assoc-context`:

| Task | Level | `--from` | `--to` | Cuối task |
|---|---|---|---|---|
| 7 | 1 | 0 | 105 | |
| 8 | 1 | 106 | 211 | thêm `1` vào `ASSOCIATION_LEVELS_DONE` |
| 9 | 2 | 0 | 87 | |
| 10 | 2 | 88 | 175 | thêm `2` |
| 11 | 3 | 0 | 76 | |
| 12 | 3 | 77 | 153 | thêm `3` |

(Nếu `assoc-context --level N` in ra tổng khác bảng trên, chia đôi theo tổng thực tế và ghi lại trong commit message.)

**Files (mỗi task):**
- Modify/Create: `packages/content/src/authored/associations/level<N>.json` (object, key = chữ; giữ key theo thứ tự `assoc-context`)
- Modify/Create: `packages/content/src/authored/char-glosses.json` (object; thêm key cho từng chữ trong batch)
- Modify: `packages/content/src/authored/meanings/level<N>.json` (chỉ các từ một chữ trong batch)
- Modify (task 8/10/12): `packages/content/src/pipeline/associations.ts` (`ASSOCIATION_LEVELS_DONE`)
- Output: `apps/web/public/content/**` (build)

**Quy tắc nội dung** (bám spec §3):

1. **Liên tưởng (2–3 mục mỗi chữ).**
   - Có từ trong khoá chứa chữ đó (dòng `course:`, cùng âm tiết `[syl]`) thì dùng ít nhất một.
   - Thêm từ ngoài khoá (dòng `cvdict:`) khi nó gợi nhớ rõ hơn, nhất là từ có Hán Việt quen với người Việt (Thái Dương, Thái Bình Dương, Điện Thoại, Học Sinh...).
   - Ít nhất một mục phải làm rõ nghĩa của chữ, không chỉ chứa chữ đó.
   - Chỉ dùng từ thông dụng: không thành ngữ hiếm, không tên người, không từ thô tục.
   - Âm tiết của chữ trong từ ví dụ phải trùng âm tiết đang dạy (build sẽ check).
   - `vi`: nghĩa ngắn ≤ 6 từ, đúng nghĩa trong từ ghép đó. Không chép nguyên nghĩa CVDICT nếu nó dài hay lạ. Tránh bẫy đơn vị của tiếng Việt (vd "cân" = 1 kg).
   - Từ trong khoá chỉ ghi `{ "zh", "vi" }`. Từ ngoài khoá ghi thêm `"pinyin"` khi build báo "several CVDICT readings", và ghi `"hanViet"` khi build báo chữ ngoài char-map (Hán Việt Title Case, tra hvdic.thivien.net nếu không chắc).
   - Chỉ dùng `{ "none": "<lý do>" }` khi thật sự không có từ ghép cùng âm đọc nào đáng dùng. Thường là trợ từ như 呢/吧/啊. Ghi lý do bằng tiếng Việt.
2. **Gloss của chữ (`char-glosses.json`).**
   - Nghĩa gốc ngắn, ≤ 4 từ mỗi vế `;`, là nghĩa giúp giải thích từ ghép (太 "to lớn; quá", 阳 "mặt trời; dương").
   - Nếu chữ có ≥ 2 âm đọc trong các từ khoá (cột `[syl]` của dòng `course:` khác nhau), dùng object theo âm có dấu thanh: `{ "xíng": "đi; được", "háng": "hàng; dãy" }`.
3. **Thứ tự nghĩa (`meanings/level<N>.json`).**
   - Đưa nghĩa mà câu khoá học dùng (dòng `sentence:`) lên đầu.
   - Nghĩa đầu không được chỉ là nhãn kiểu "(phó từ mức độ)" hay "(hình thức kết hợp) …". Viết lại thành nghĩa thực, vd 很 → "rất; lắm", 上 → "trên; phía trên".
   - Trợ từ (pos u/y/e/o) giữ mô tả chức năng.
   - Chỉ sắp xếp lại, bỏ bớt hoặc viết gọn các nghĩa đã có. Chỉ thêm nghĩa mới khi nghĩa khoá dùng bị thiếu hẳn, và ghi lại trong commit message.
4. Không sửa file authored nào khác.

- [ ] **Step 1: Lấy context**

Run: `cd packages/content && export PATH=~/.npm-global/node_modules/.bin:$PATH && pnpm -s assoc-context --level <N> --from <a> --to <b> > ../../node_modules/.tmp/ctx.txt && wc -l ../../node_modules/.tmp/ctx.txt`
Expected: một khối cho mỗi chữ trong batch.

- [ ] **Step 2: Viết dữ liệu** theo quy tắc trên cho mọi chữ trong batch. JSON indent 2 dấu cách, có newline cuối file. Ví dụ `level1.json`:

```json
{
  "太": [
    { "zh": "太阳", "vi": "mặt trời" },
    { "zh": "太平洋", "vi": "Thái Bình Dương" },
    { "zh": "太太", "vi": "bà xã; phu nhân" }
  ]
}
```

- [ ] **Step 3: Build cho đến khi sạch**

Run: `cd ../.. && pnpm content:build`
Expected: không có dòng `[association-*]`/`[char-gloss*]`. Số trong `warning: N single-character word(s) without associations yet` giảm đúng bằng số chữ của batch. Lỗi nào thì sửa dữ liệu (không sửa code) rồi build lại.

- [ ] **Step 4: Tự soát**

Run lại Step 1 cho batch này và đọc dòng `associations now:` / `meanings now:` của từng chữ. Kiểm tra từng chữ theo quy tắc 1–3. Chú ý: nghĩa `vi` phải khớp nghĩa trong từ ghép đó, không phải nghĩa của chữ đơn.

- [ ] **Step 5 (task 8, 10, 12): Bật guard cho level**

Thêm level vào `ASSOCIATION_LEVELS_DONE` trong `packages/content/src/pipeline/associations.ts` (vd `[1]`, rồi `[1, 2]`, rồi `[1, 2, 3]`). Build lại.

- [ ] **Step 6: Test**

Run: `TMPDIR=$PWD/node_modules/.tmp pnpm -F @hi-chinese/content test && TMPDIR=$PWD/node_modules/.tmp pnpm -F @hi-chinese/web test && git diff --quiet main -- apps/web/public/content/units && echo UNITS-UNCHANGED`
Expected: PASS và `UNITS-UNCHANGED`.

- [ ] **Step 7: Commit**

```bash
git add packages/content/src apps/web/public/content
git commit -m "feat(content): L<N> associations, glosses, meaning order (<a>..<b>)"
```

---

### Task 13: Gloss cho các chữ còn lại

**Files:**
- Modify: `packages/content/src/authored/char-glosses.json`
- Modify: `packages/content/src/pipeline/associations.ts` (`GLOSSES_DONE = true`)
- Output: `apps/web/public/content/**`

- [ ] **Step 1: Context**

Run: `cd packages/content && pnpm -s assoc-context --glosses > ../../node_modules/.tmp/glosses.txt && head -1 ../../node_modules/.tmp/glosses.txt`
Expected: `characters that are not single-character course words: <khoảng 357>`

- [ ] **Step 2: Viết gloss** cho mọi chữ trong danh sách, theo quy tắc 2 của Tasks 7–12 (nghĩa gốc giải thích được các dòng `course:`; chữ đa âm dùng object theo âm có dấu thanh). Nếu nhiều thì chia làm 2 lượt (index 0–179, 180–hết), build sau mỗi lượt.

- [ ] **Step 3: Bật guard** — `export const GLOSSES_DONE = true;`

- [ ] **Step 4: Build + test**

Run: `cd ../.. && pnpm content:build && TMPDIR=$PWD/node_modules/.tmp pnpm test && git diff --quiet main -- apps/web/public/content/units && echo UNITS-UNCHANGED`
Expected: build không còn `warning: … character(s) without a gloss yet` và `… without associations yet`, mọi test PASS, in ra `UNITS-UNCHANGED`.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src apps/web/public/content
git commit -m "feat(content): glosses for every course character; gloss guard on"
```

---

### Task 14: Native review list, roadmap, kiểm tra cuối

**Files:**
- Create: `docs/superpowers/specs/2026-09-25-char-associations-native-review.md`
- Modify: `docs/superpowers/plans/README.md`

- [ ] **Step 1: Sinh danh sách review**

Chạy node script này từ repo root. Nó in ra ba nhóm cần người bản ngữ soát: liên tưởng ngoài khoá (có `pinyin`/`hanViet` tự ghi hoặc không có `wordId`), các mục `none`, và chữ có gloss đa âm.

```bash
node -e '
const fs=require("fs");const W=JSON.parse(fs.readFileSync("apps/web/public/content/words.json","utf8"));
const A={};for(const f of fs.readdirSync("packages/content/src/authored/associations"))Object.assign(A,JSON.parse(fs.readFileSync("packages/content/src/authored/associations/"+f,"utf8")));
const G=JSON.parse(fs.readFileSync("packages/content/src/authored/char-glosses.json","utf8"));
console.log("## Liên tưởng ngoài khoá\n");for(const w of W)for(const a of w.associations??[])if(!a.wordId)console.log(`- ${w.simplified} → ${a.zh} ${a.pinyin} · ${a.hanViet} — ${a.vi}`);
console.log("\n## Không có liên tưởng (none)\n");for(const[k,v]of Object.entries(A))if(!Array.isArray(v))console.log(`- ${k}: ${v.none}`);
console.log("\n## Gloss đa âm\n");for(const[k,v]of Object.entries(G))if(typeof v!=="string")console.log(`- ${k}: ${Object.entries(v).map(([p,t])=>p+" = "+t).join(" · ")}`);
' > node_modules/.tmp/review.md && wc -l node_modules/.tmp/review.md
```

Ghi vào `docs/superpowers/specs/2026-09-25-char-associations-native-review.md`: tiêu đề `# Liên tưởng chữ — native review`, một đoạn "Toàn bộ nội dung do AI viết; soát các nhóm dưới đây trước khi deploy ra ngoài. Ưu tiên: Hán Việt tự ghi, nghĩa `vi`, gloss đa âm", rồi dán nội dung `review.md`.

- [ ] **Step 2: Roadmap** — thêm một dòng vào bảng cuối của `docs/superpowers/plans/README.md`, ngay dưới dòng `2026-09-24-sentence-expansion.md`:

```markdown
| `2026-09-25-char-associations.md` | `2026-09-25-char-associations-design.md` | Single-character words show 2–3 association compounds (or a reasoned none); compounds show per-character Hán Việt + gloss; every character has a core gloss; first meaning of single-character words is the course sense | merged |
```

- [ ] **Step 3: Kiểm tra toàn bộ**

Run:
```bash
pnpm content:build && git status --short apps/web/public/content
TMPDIR=$PWD/node_modules/.tmp pnpm test && pnpm typecheck
git diff --quiet main -- apps/web/public/content/units && echo UNITS-UNCHANGED
ls -la apps/web/public/content/words.json
```
Expected: build không in warning và không có drift, mọi test PASS, typecheck PASS, in ra `UNITS-UNCHANGED`, `words.json` < 2.5 MB.

- [ ] **Step 4: Chạy thử app ở viewport điện thoại**

`pnpm web:dev`, mở bằng Playwright ở kích thước 375×812, đi qua bài đầu tiên của `l1-u03` (có 太/很) và một bài L2 có từ ghép (vd bài chứa 太阳 ở `l2-u28`). Chụp màn hình slide dạy từ. Kiểm tra: khối "Gặp trong"/"Từng chữ" hiện đủ, không tràn ngang, và nút nghe hoạt động (bấm không lỗi console). Mở `/character/592a` (太) để xem "Nghĩa gốc" và "Liên tưởng".

- [ ] **Step 5: Commit**

```bash
git add docs
git commit -m "docs: char associations native-review list and roadmap"
```
