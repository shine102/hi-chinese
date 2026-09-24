# Thứ tự unit theo tier + dọn nợ kỹ thuật — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa unit L2/L3 cụ thể/đời thường lên trước (tier), chặn pinyin sai bằng data test, gỡ dồn ngữ pháp `l1-u12`, cho `useLiveQuery` báo lỗi, track content build và cập nhật roadmap.

**Architecture:** Checker pinyin thuần trong `packages/content/src/pipeline/sentence-pinyin.ts` + data test đọc authored sentences và `words.json` đã build. Tier là dữ liệu authored trong `themes/level{2,3}.json`; `orderUnits` trong `retheme.ts` sắp theo khóa rải-theo-broad + phạt tier, rồi chạy lại `retheme-units` và sửa nội dung như phần 4. Web: hook `useLiveQuery` trả `{ data, error, retry }`, màn hình hiện `InlineError`.

**Tech Stack:** TypeScript, vitest, tsx, pnpm workspace; React + Dexie (`apps/web`).

**Spec:** `docs/superpowers/specs/2026-09-24-unit-order-tech-debt-design.md`

## Global Constraints

- Làm trong worktree `../hi-chinese-unit-order`, branch `feat/unit-order`. Setup: `git worktree add ../hi-chinese-unit-order -b feat/unit-order && cp -r packages/content/raw ../hi-chinese-unit-order/packages/content/ && cd ../hi-chinese-unit-order && pnpm install --frozen-lockfile`.
- pnpm ở `~/.npm-global/node_modules/.bin/pnpm` (thêm vào PATH nếu `pnpm` không có).
- Authored JSON trong `packages/content/src/authored/` là nguồn chân lý; `pnpm content:build` sinh lại `apps/web/public/content`. Trước Task 7 (vẫn còn trong `.gitignore`), content build phải commit bằng `git add -f apps/web/public/content`.
- Commit không có dòng `Co-Authored-By` Claude.
- Quy tắc câu: token là từ trong khóa theo đúng cách đọc của entry (长 cháng, 只 zhǐ/zhī, 种 zhǒng; ngoại lệ 不了 bu liǎo); từ nhiều chữ = 1 token; pinyin có dấu, biến điệu 不/一, 个 → ge; 上/里 tách token sau danh từ = thanh đầy đủ; 不太 `bú tài`, 这个 `zhège`, 别人 `biéren`, 有人 `yǒu rén`, 各种 `gèzhǒng`; `vi` tự nhiên, trung tính giới khi tiếng Trung không rõ giới; coi chừng từ ghép ẩn qua ranh giới token.
- Id câu mới: `s:l<L>:fill:NNN` nối tiếp số lớn nhất hiện có của level.
- `TIER_PENALTY = { 1: 0, 2: 0.15, 3: 0.35 }`; khóa `j / n_broad + 0.1 × rank / N + TIER_PENALTY[tier]`.
- `MAX_GRAMMAR_PER_UNIT = 5` cho mọi level; unit L2/L3 ≤ 18 từ.
- Thông điệp lỗi web: `Could not read saved progress on this device.`
- Nội dung mới do AI viết → cần người bản ngữ review trước khi deploy; không push, không deploy.

## Review Focus

1. Câu có polyphone được chọn cách đọc alternate (只 zhī, 了 liǎo, 着 zháo) — checker phải thử mọi cách đọc, không chỉ reading chính (test `accepts an alternate reading` ở Task 1).
2. 一 ở cuối từ (统一, 第一, 星期一) không bị ép biến điệu (test `leaves 一 at the end of a word` ở Task 1).
3. Dời unit làm pin trỏ sai unit → 可以/得 rời `l2-u01` (guard CORE ở Task 4).
4. Querier lỗi rồi retry thành công → màn hình phải về trạng thái bình thường, không kẹt lỗi cũ (test `retry` ở Task 6).
5. Bỏ `.gitignore` làm lộ file build tạm khác trong `apps/web/public` (kiểm `git status` sau build ở Task 7).

---

### Task 1: Checker pinyin (module thuần + unit test)

**Files:**
- Create: `packages/content/src/pipeline/sentence-pinyin.ts`
- Test: `packages/content/test/sentence-pinyin.test.ts`

**Interfaces:**
- Produces: `checkSentencePinyin(sentence: PinyinSentence, bySimplified: ReadonlyMap<string, ReadingWord>): PinyinIssue[]`; types `ReadingWord`, `PinyinSentence`, `PinyinIssue`, `PinyinIssueKind`; `Word` (từ `src/types.ts`) thỏa `ReadingWord`.

- [ ] **Step 1: Viết test fail**

```ts
import { describe, expect, it } from 'vitest';
import { checkSentencePinyin, type ReadingWord } from '../src/pipeline/sentence-pinyin.js';

const dict: [string, string, string[]?][] = [
  ['我', 'wo3'], ['不', 'bu4'], ['是', 'shi4'], ['你', 'ni3'], ['一', 'yi1'], ['个', 'ge4'],
  ['这', 'zhe4'], ['星期', 'xing1 qi1'], ['起来', 'qi3 lai5'], ['只', 'zhi3', ['zhi1']],
  ['狗', 'gou3'], ['在家', 'zai4 jia1'], ['去', 'qu4'], ['过', 'guo4', ['guo5']],
  ['孩子', 'hai2 zi5'], ['们', 'men5'], ['站', 'zhan4'], ['统一', 'tong3 yi1'], ['了', 'le5'],
];
const by = new Map<string, ReadingWord>(
  dict.map(([simplified, pinyinNumeric, alt]) => [
    simplified,
    { simplified, pinyinNumeric, alternates: (alt ?? []).map((p) => ({ pinyinNumeric: p })) },
  ]),
);
const check = (pinyin: string, words: string[]) =>
  checkSentencePinyin({ id: 's', pinyin, words }, by).map((i) => `${i.kind} ${i.token} ${i.expected}/${i.got}`);

describe('checkSentencePinyin', () => {
  it('accepts correct pinyin with 不 sandhi', () => {
    expect(check('Wǒ bú shì nǐ.', ['我', '不', '是', '你'])).toEqual([]);
  });
  it('requires 不 sandhi before tone 4', () => {
    expect(check('Wǒ bù shì nǐ.', ['我', '不', '是', '你'])).toEqual(['tone 不 2/4']);
  });
  it('allows neutral 不 in A-不-A', () => {
    expect(check('Nǐ shì bu shì?', ['你', '是', '不', '是'])).toEqual([]);
  });
  it('requires 一 sandhi before a measure word', () => {
    expect(check('yí ge', ['一', '个'])).toEqual([]);
    expect(check('yī gè', ['一', '个'])).toEqual(['tone 一 2/1']);
  });
  it('keeps 一 tone 1 when counting', () => {
    expect(check('xīngqī yī', ['星期', '一'])).toEqual([]);
  });
  it('leaves 一 at the end of a word', () => {
    expect(check('tǒngyī', ['统一'])).toEqual([]);
  });
  it('joins 这个 and writes 个 neutral', () => {
    expect(check('zhège', ['这', '个'])).toEqual([]);
  });
  it('follows the dictionary neutral tone', () => {
    expect(check('zhàn qǐlai', ['站', '起来'])).toEqual([]);
    expect(check('zhàn qǐlái', ['站', '起来'])).toEqual(['tone 起来 5/2']);
  });
  it('accepts an alternate reading', () => {
    expect(check('yì zhī gǒu', ['一', '只', '狗'])).toEqual([]);
  });
  it('flags a split two-syllable token and a joined particle', () => {
    expect(check('zài jiā', ['在家'])).toEqual(['split 在家 one word/split']);
    expect(check('zàijiā', ['在家'])).toEqual([]);
    expect(check('qùguo', ['去', '过'])).toEqual(['join 去过 separate/joined']);
    expect(check('qù guo', ['去', '过'])).toEqual([]);
  });
  it('lets 们 join its noun', () => {
    expect(check('háizimen', ['孩子', '们'])).toEqual([]);
  });
  it('reports syllable mismatches and unknown tokens', () => {
    expect(check('nǐ', ['我'])).toEqual(['syllables 我 token readings/ni']);
    expect(check('wǒ', ['他'])).toEqual(['unknown-token 他 course word/他']);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm -F @hi-chinese/content test sentence-pinyin`
Expected: FAIL — cannot find module `sentence-pinyin.js`.

- [ ] **Step 3: Viết module**

`packages/content/src/pipeline/sentence-pinyin.ts` (đã chạy thử trên dữ liệu thật ngày 2026-09-24: ~150 issue, xem Task 2):

```ts
// Checks a sentence's pinyin against its tokens (spec 2026-09-24-unit-order-tech-debt-design.md §3):
// syllables must spell the tokens' readings, tones must match the reading after the course's
// sandhi/neutral-tone conventions, and pinyin word boundaries must follow the tokens.

export interface ReadingWord {
  simplified: string;
  pinyinNumeric: string;
  alternates?: { pinyinNumeric: string }[];
}

export interface PinyinSentence {
  id: string;
  pinyin: string;
  words: string[];
}

export type PinyinIssueKind = 'unknown-token' | 'syllables' | 'tone' | 'split' | 'join';

export interface PinyinIssue {
  id: string;
  kind: PinyinIssueKind;
  token: string;
  expected: string;
  got: string;
}

const MARKS: Record<string, [string, number]> = {
  ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4],
  ē: ['e', 1], é: ['e', 2], ě: ['e', 3], è: ['e', 4],
  ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4],
  ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4],
  ū: ['u', 1], ú: ['u', 2], ǔ: ['u', 3], ù: ['u', 4],
  ǖ: ['v', 1], ǘ: ['v', 2], ǚ: ['v', 3], ǜ: ['v', 4], ü: ['v', 0],
};

// Token pairs the course writes as one pinyin word.
export const JOINED_PAIRS = new Set(['这个', '那个', '哪个']);
// Complements after which 不 is written neutral (V 不 C potential complement).
export const POTENTIAL_COMPLEMENTS = new Set([
  '了', '懂', '下', '到', '完', '见', '起', '动', '开', '住', '好', '出来', '进去', '上', '来', '去', '清楚', '着', '起来',
]);
const NUMERALS = new Set([...'零一二三四五六七八九十百千万两']);
const BIG_NUMERALS = new Set([...'百千万']);
// 一 keeps tone 1 before these (dates, floors, grades: counting, not "one ...").
const ORDINAL_NEXT = new Set(['月', '号', '日', '楼', '层', '年级', '班']);
// 一 keeps tone 1 after these (weekday names, ordinals).
const ORDINAL_PREV = new Set(['第', '星期', '礼拜', '周']);
// Two-syllable tokens the course writes as two pinyin words (earlier rulings).
export const SPLIT_TWO_SYLLABLE = new Set(['不太', '有人']);
// A token may join the previous pinyin word when it is one of these suffixes.
const JOIN_SUFFIXES = new Set(['们']);

interface Letter {
  ch: string;
  tone: number; // 0 = no mark on this letter
  word: number; // index of the pinyin word it belongs to
}

function letters(pinyin: string): Letter[] {
  const out: Letter[] = [];
  let word = 0;
  let inWord = false;
  for (const raw of pinyin.normalize('NFC').toLowerCase()) {
    const mark = MARKS[raw];
    const ch = mark ? mark[0] : raw;
    if (/[a-z]/.test(ch)) {
      if (!inWord && out.length > 0) word++;
      inWord = true;
      out.push({ ch, tone: mark ? mark[1] : 0, word });
    } else if (raw !== "'" && raw !== '’') {
      inWord = false;
    }
  }
  return out;
}

interface Syllable {
  text: string;
  tone: number; // 1-5
}

const syllables = (numeric: string): Syllable[] =>
  numeric
    .toLowerCase()
    .replace(/u:|ü/g, 'v')
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => ({ text: s.replace(/[0-9]/g, ''), tone: Number(s.match(/[1-5]/)?.[0] ?? 5) }));

interface Span {
  token: number;
  pos: number; // syllable index inside the token
  a: number;
  b: number;
  expected: number;
}

function* paths(
  flat: string,
  tokens: readonly Syllable[][][],
  k: number,
  p: number,
  acc: Span[],
): Generator<Span[]> {
  if (k === tokens.length) {
    if (p === flat.length) yield acc;
    return;
  }
  for (const reading of tokens[k]!) {
    let q = p;
    const spans: Span[] = [];
    let ok = true;
    for (const [i, s] of reading.entries()) {
      if (!flat.startsWith(s.text, q)) {
        ok = false;
        break;
      }
      spans.push({ token: k, pos: i, a: q, b: q + s.text.length, expected: s.tone });
      q += s.text.length;
    }
    if (ok) yield* paths(flat, tokens, k + 1, q, [...acc, ...spans]);
  }
}

const syllableCount = (path: readonly Span[], token: number) => path.filter((x) => x.token === token).length;

// Tones the course accepts for the span at index i of the path.
export function allowedTones(words: readonly string[], path: readonly Span[], i: number): Set<number> {
  const s = path[i]!;
  const token = words[s.token]!;
  const prev = words[s.token - 1];
  const next = words[s.token + 1];
  const nextTone = path[i + 1]?.expected;
  const allowed = new Set([s.expected]);

  const chars = [...token];
  const ch = chars.length === syllableCount(path, s.token) ? chars[s.pos] : undefined;
  const last = s.pos === syllableCount(path, s.token) - 1;
  // 不/一 sandhi: standalone tokens, and inside a word unless it is the word's last syllable.
  const sandhi = (ch === '不' || ch === '一') && nextTone !== undefined && (token.length === 1 || !last);
  if (sandhi && ch === '不') {
    allowed.clear();
    allowed.add(nextTone === 4 ? 2 : 4);
    if (s.pos > 0) allowed.add(5); // lexicalised V不C: 对不起, 差不多
    if (token === '不' && ((prev !== undefined && next !== undefined && next.startsWith(prev)) || POTENTIAL_COMPLEMENTS.has(next ?? '')))
      allowed.add(5);
  } else if (sandhi && ch === '一') {
    const counting =
      token === '一' &&
      ((prev !== undefined && (ORDINAL_PREV.has(prev) || NUMERALS.has(prev))) ||
        (next !== undefined && (ORDINAL_NEXT.has(next) || (NUMERALS.has(next) && !BIG_NUMERALS.has(next)))));
    allowed.clear();
    if (counting) allowed.add(1);
    else allowed.add(nextTone === 4 || nextTone === 5 ? 2 : 4);
    if (token === '一' && prev !== undefined && prev === next) allowed.add(5); // V一V
  }
  if (token === '个') allowed.add(5);
  if ((token === '过' || token === '了' || token === '着') && s.token > 0) allowed.add(5);
  // Reduplicated verb: 问问, 看看 (two tokens or one), V一V's second V.
  if (s.pos === 0 && token.length === 1 && (prev === token || (prev === '一' && words[s.token - 2] === token)))
    allowed.add(5);
  if (s.pos === 1 && token.length === 2 && token[0] === token[1]) {
    allowed.add(5);
    if (token === '好好') allowed.add(1);
  }
  return allowed;
}

function issuesFor(
  id: string,
  words: readonly string[],
  ls: readonly Letter[],
  path: readonly Span[],
): PinyinIssue[] {
  const out: PinyinIssue[] = [];
  path.forEach((s, i) => {
    const marks = ls.slice(s.a, s.b).filter((l) => l.tone > 0);
    const got = marks.length === 0 ? 5 : marks[0]!.tone;
    const allowed = allowedTones(words, path, i);
    if (!allowed.has(got))
      out.push({ id, kind: 'tone', token: words[s.token]!, expected: [...allowed].join('|'), got: String(got) });
  });
  // Boundaries: one token never spans two pinyin words; one pinyin word holds one token
  // unless the pair is in JOINED_PAIRS.
  for (let t = 0; t < words.length; t++) {
    const spans = path.filter((s) => s.token === t);
    if (spans.length === 0) continue;
    const first = ls[spans[0]!.a]!.word;
    const last = ls[spans[spans.length - 1]!.b - 1]!.word;
    if (first !== last && spans.length === 2 && !SPLIT_TWO_SYLLABLE.has(words[t]!)) out.push({ id, kind: 'split', token: words[t]!, expected: 'one word', got: 'split' });
    if (t > 0) {
      const prevSpans = path.filter((s) => s.token === t - 1);
      const prevLast = ls[prevSpans[prevSpans.length - 1]!.b - 1]!.word;
      const pair = words[t - 1]! + words[t]!;
      const numerals = [...pair].every((c) => NUMERALS.has(c));
      const redup = words[t - 1] === words[t];
      if (prevLast === first && !JOINED_PAIRS.has(pair) && !JOIN_SUFFIXES.has(words[t]!) && !numerals && !redup)
        out.push({ id, kind: 'join', token: words[t - 1]! + words[t]!, expected: 'separate', got: 'joined' });
    }
  }
  return out;
}

export function checkSentencePinyin(
  sentence: PinyinSentence,
  bySimplified: ReadonlyMap<string, ReadingWord>,
): PinyinIssue[] {
  const { id, words } = sentence;
  const tokens: Syllable[][][] = [];
  for (const t of words) {
    const w = bySimplified.get(t);
    if (!w) return [{ id, kind: 'unknown-token', token: t, expected: 'course word', got: t }];
    tokens.push([w.pinyinNumeric, ...(w.alternates ?? []).map((a) => a.pinyinNumeric)].map(syllables));
  }
  const ls = letters(sentence.pinyin);
  const flat = ls.map((l) => l.ch).join('');
  let best: PinyinIssue[] | undefined;
  let n = 0;
  for (const path of paths(flat, tokens, 0, 0, [])) {
    const issues = issuesFor(id, words, ls, path);
    if (best === undefined || issues.length < best.length) best = issues;
    if (best.length === 0 || ++n >= 64) break;
  }
  return best ?? [{ id, kind: 'syllables', token: words.join(' '), expected: 'token readings', got: flat }];
}
```

- [ ] **Step 4: Chạy test, xác nhận pass; typecheck**

Run: `pnpm -F @hi-chinese/content test sentence-pinyin && pnpm -F @hi-chinese/content typecheck`
Expected: PASS. Nếu một case fail vì luật trong module, sửa module (không sửa kỳ vọng) trừ khi kỳ vọng mâu thuẫn spec §3 — khi đó ghi lý do trong report.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/pipeline/sentence-pinyin.ts packages/content/test/sentence-pinyin.test.ts
git commit -m "feat(content): sentence pinyin checker"
```

---

### Task 2: Sửa pinyin toàn bộ câu + data test + 只 lượng từ

**Files:**
- Create: `packages/content/test/sentence-pinyin-data.test.ts`
- Modify: `packages/content/src/authored/sentences/level{1,2,3}.json`, `packages/content/src/authored/pinyin-overrides.json`, `packages/content/src/authored/meanings/level2.json`, grammar explanation có pinyin sai (vd `g:v-qilai-inchoative` trong `authored/grammar/level*.json`), `apps/web/public/content/**` (build)

**Interfaces:**
- Consumes: `checkSentencePinyin` (Task 1).

- [ ] **Step 1: Viết data test**

```ts
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkSentencePinyin, type PinyinIssue } from '../src/pipeline/sentence-pinyin.js';
import type { Word } from '../src/types.js';

// Spec 2026-09-24-unit-order-tech-debt-design.md §3: every sentence's pinyin spells its
// tokens' readings with the course's tone and word-boundary conventions.
const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../../../apps/web/public/content');
const authored = resolve(here, '../src/authored');
const readJson = async <T>(p: string): Promise<T> => JSON.parse(await readFile(p, 'utf8')) as T;

// `${sentenceId} ${token}` → why the checker's rule does not fit. Keep ≤ 10 entries.
const ALLOW: Record<string, string> = {};

const key = (i: PinyinIssue) => `${i.id} ${i.token}`;

const allIssues = async () => {
  const words = await readJson<Word[]>(resolve(content, 'words.json'));
  const by = new Map(words.map((w) => [w.simplified, w]));
  const issues: PinyinIssue[] = [];
  for (const level of [1, 2, 3]) {
    const sentences = await readJson<{ id: string; pinyin: string; words: string[] }[]>(
      resolve(authored, `sentences/level${level}.json`),
    );
    for (const s of sentences) issues.push(...checkSentencePinyin(s, by));
  }
  return issues;
};

describe('sentence pinyin', () => {
  it('matches token readings, tones and word boundaries', async () => {
    const issues = (await allIssues()).filter((i) => !(key(i) in ALLOW));
    expect(issues.map((i) => `${i.id} ${i.kind} ${i.token}: expected ${i.expected} got ${i.got}`)).toEqual([]);
  });

  it('keeps the allowlist small and every entry still needed', async () => {
    expect(Object.keys(ALLOW).length).toBeLessThanOrEqual(10);
    const live = new Set((await allIssues()).map(key));
    expect(Object.keys(ALLOW).filter((k) => !live.has(k))).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy, xem danh sách lỗi**

Run: `pnpm -F @hi-chinese/content test sentence-pinyin-data`
Expected: FAIL, ~150 dòng. Đo 2026-09-24, các nhóm chính:
- `一` chưa biến điệu (`yī gè` → `yí ge`, `yīzhí` → `yìzhí`, `yīqiè` → `yíqiè`, `yīxiàr` → `yíxiàr`, `yī fāngmiàn` → `yì fāngmiàn`); đếm số thật (`yī èr sān`, `yī jiā yī děngyú èr`) → nếu checker không bắt được ngữ cảnh đếm, cho vào `ALLOW` với lý do.
- `不` chưa biến điệu (`bù shì` → `bú shì`, `bù qù` → `bú qù`, `bùlùn` → `búlùn`).
- Thanh nhẹ theo từ điển: 起来 `qǐlai`, 看起来 `kàn qǐlai`, 回来 `huílai`, 学生, 值得, 那里, 照顾, 看上去 — quyết định từng từ: nếu cách đọc từ điển sai/lạ so với chuẩn phổ thông (vd 学生 `xué sheng5` vs `xuéshēng`, 记住), sửa `pinyin-overrides.json` về cách đọc chuẩn; nếu từ điển đúng, sửa câu.
- Bổ ngữ xu hướng viết nhẹ trong câu (出去 `chūqu`, 进来 `jìnlai`, 带来 `dàilai`) nhưng từ điển thanh đầy đủ → chọn một chuẩn (thanh đầy đủ theo entry) và sửa câu cho khớp.
- `split` (token 2 âm tiết bị tách: 第二 → `dì'èr`, 交给 → `jiāogěi`, 吃饭 → `chīfàn`, 在家 → `zàijiā`, 下雨 → `xiàyǔ`, 不用 → `búyòng`, 不够 → `búgòu`, 别的 → `biéde`, 走进…) → viết liền.
- `join` (了/着/过 dính động từ: `qùguo`, `zhànzhe`, `děngle`; 看书 `kànshū` là 2 token; 星期五 2 token) → tách.
- `syllables`: entry có `pinyinNumeric` dạng dấu thanh (这时候 `zhe4 shíhòu`, 见过 `jiànguò`, 笑话儿 `xiàohuar5`) → thêm override numeric đúng vào `pinyin-overrides.json` (`"这时候": "zhe4 shi2 hou5"`, `"见过": "jian4 guo5"`, `"笑话儿": "xiao4 hua5 r5"`); 那 `nèi` → `nà`; 女 `nǚ` chỉ lỗi do checker — nếu còn, sửa checker ở Task 1 file (ü) và ghi report.

- [ ] **Step 3: Sửa dữ liệu**

Sửa `pinyin` của câu (giữ `zh`/`words`, trừ khi tokenization sai — vd 只有 viết tách token 只+有 khi 只有 là từ trong khóa → đổi `words` thành `只有`). Sau khi sửa `pinyin-overrides.json`, chạy `pnpm content:build` để `words.json` cập nhật. Cũng sửa pinyin 起来 trong phần giải thích của `g:v-qilai-inchoative` (grep `qǐlái` trong `authored/grammar`).

- [ ] **Step 4: 只 lượng từ**

Trong `packages/content/src/authored/meanings/level2.json`, thêm vào cuối mảng `"只"`: `"(zhī) lượng từ cho con vật, chim"`. Câu 我家养了一只小狗 viết `yì zhī`.

- [ ] **Step 5: Build + chạy lại tới pass**

Run: `pnpm content:build && pnpm -F @hi-chinese/content test`
Expected: PASS toàn bộ (kể cả `sentence-pinyin-data`); build 0 lỗi placement/validate.

- [ ] **Step 6: Commit**

```bash
git add packages/content apps/web/public/content -f
git commit -m "fix(content): normalize sentence pinyin; add pinyin data guard"
```

---

### Task 3: Tier authored + khóa xếp trong `retheme.ts`

**Files:**
- Modify: `packages/content/src/pipeline/retheme.ts`, `packages/content/src/authored/themes/level{2,3}.json`, `packages/content/scripts/retheme-units.ts` (chỉ log), `packages/content/test/retheme.test.ts`, `packages/content/test/themes-data.test.ts`

**Interfaces:**
- Produces: `type Tier = 1 | 2 | 3`; `TIER_PENALTY: Record<Tier, number>`; `ThemesFile.tiers: Record<string, Tier>`; `DraftUnit.tier: Tier`; `orderUnits` sắp theo khóa tier.

- [ ] **Step 1: Test fail cho khóa tier**

Trong `test/retheme.test.ts`, đổi helper `draft` thành nhận `tier` (mặc định 1):

```ts
const draft = (subthemeId: string, broad: string, score: number, words: string[] = [], tier: Tier = 1): DraftUnit => ({
  subthemeId,
  broad,
  title: `${broad}: ${subthemeId}`,
  words,
  score,
  tier,
});
```

(import thêm `type Tier`). Thêm `tiers: { A: 1, B: 1 }` vào fixture `themes` của `describe('chunkSubthemes')` (và mọi `ThemesFile` literal khác trong file). Thêm test:

```ts
describe('orderUnits with tiers', () => {
  it('pushes an abstract (tier 3) unit behind concrete ones even with a lower score', () => {
    const out = orderUnits([draft('a', 'A', 1, [], 3), draft('b', 'B', 2), draft('c', 'C', 3)]);
    expect(out.map((u) => u.subthemeId)).toEqual(['b', 'c', 'a']);
  });

  it('introduces every broad theme before a second unit of a common one', () => {
    const out = orderUnits([
      draft('a1', 'A', 1),
      draft('a2', 'A', 2),
      draft('a3', 'A', 3),
      draft('b', 'B', 10),
      draft('c', 'C', 11),
      draft('d', 'D', 12),
    ]);
    expect(out.map((u) => u.subthemeId)).toEqual(['a1', 'b', 'c', 'a2', 'd', 'a3']);
  });
});

describe('chunkSubthemes tiers', () => {
  it('copies the broad theme tier and throws when it is missing', () => {
    const t: ThemesFile = {
      tiers: { A: 2 },
      subthemes: [{ id: 'a', broad: 'A', title: 'A: a' }],
      words: { x: 'a' },
    };
    expect(chunkSubthemes(t, [tw('x', 1)])[0]!.tier).toBe(2);
    expect(() => chunkSubthemes({ ...t, tiers: {} }, [tw('x', 1)])).toThrow(/no tier for broad A/);
  });
});
```

Run: `pnpm -F @hi-chinese/content test retheme.test`
Expected: FAIL (type/field missing, order differs).

- [ ] **Step 2: Implement**

Trong `retheme.ts`:

```ts
export type Tier = 1 | 2 | 3;

// Spec 2026-09-24-unit-order-tech-debt-design.md §2: concrete topics (tier 1) first,
// abstract ones (tier 3) later, still interleaved.
export const TIER_PENALTY: Record<Tier, number> = { 1: 0, 2: 0.15, 3: 0.35 };
```

`ThemesFile` thêm `tiers: Record<string, Tier>;`, `DraftUnit` thêm `tier: Tier;`. Trong `chunkSubthemes`, đầu vòng `for (const s of themes.subthemes)`:

```ts
    const tier = themes.tiers[s.broad];
    if (tier === undefined) throw new Error(`no tier for broad ${s.broad}`);
```

và thêm `tier,` vào object push. Thay dòng đầu `orderUnits` và comment của nó:

```ts
// Greedy by tier key, skipping the previous unit's broad theme. Key = j / n_broad
// (spreads each broad theme across its tier, first units early) + 0.1 × rank / N (common
// words first among equals) + TIER_PENALTY. When one broad theme holds more than half of
// what is left, it must be taken now (if allowed) or the tail can only be that theme back
// to back.
export function orderUnits(units: readonly DraftUnit[]): DraftUnit[] {
  const byScore = units.map((u, i) => ({ u, i })).sort((a, b) => a.u.score - b.u.score || a.i - b.i);
  const perBroad = new Map<string, number>();
  for (const { u } of byScore) perBroad.set(u.broad, (perBroad.get(u.broad) ?? 0) + 1);
  const seen = new Map<string, number>();
  const key = new Map<DraftUnit, number>();
  byScore.forEach(({ u }, rank) => {
    const j = seen.get(u.broad) ?? 0;
    seen.set(u.broad, j + 1);
    key.set(u, j / perBroad.get(u.broad)! + (0.1 * rank) / units.length + TIER_PENALTY[u.tier]);
  });
  const left = [...units].sort((a, b) => key.get(a)! - key.get(b)!);
```

(phần còn lại của hàm giữ nguyên). Nếu các test `orderUnits` cũ không còn đúng với khóa mới, cập nhật kỳ vọng của chúng theo khóa (tính tay, ghi trong report) — giữ nguyên ý test (không liền broad; broad áp đảo; còn một broad thì theo score).

- [ ] **Step 3: Dữ liệu tier**

Thêm `"tiers"` (khóa đầu tiên của object) vào `themes/level2.json` và `themes/level3.json`, chỉ gồm các broad có trong `subthemes` của file đó:
- 1: Ăn Uống, Mua Sắm, Trường Học, Nhà Cửa, Gia Đình & Quan Hệ, Giao Thông, Du Lịch, Thời Tiết & Thiên Nhiên, Sức Khỏe, Con Người & Ngoại Hình, Động Vật & Thực Vật, Thể Thao, Giải Trí, Thời Gian, Số Lượng
- 2: Công Việc, Ngôn Ngữ & Giao Tiếp, Tính Cách & Cảm Xúc, Công Nghệ, Địa Lý & Vị Trí, Miêu Tả
- 3: Suy Nghĩ, Xã Hội & Văn Hóa, An Toàn & Pháp Luật, Kinh Tế & Kinh Doanh, Báo Chí & Truyền Thông

Giữ định dạng file (2-space JSON, newline cuối).

- [ ] **Step 4: Guard tiers trong `themes-data.test.ts`**

Thêm vào `describe.each(LEVELS)`:

```ts
  it('gives every broad theme exactly one tier (1-3)', async () => {
    const { themes } = await load();
    const broads = [...new Set(themes.subthemes.map((s) => s.broad))].sort();
    expect(Object.keys(themes.tiers).sort()).toEqual(broads);
    expect(Object.values(themes.tiers).every((t) => t === 1 || t === 2 || t === 3)).toBe(true);
  });
```

- [ ] **Step 5: Log tier trong script**

Trong `scripts/retheme-units.ts`, sau dòng `console.log` thống kê của mỗi level, in số unit tier 3 trong quý đầu và vị trí trung bình mỗi tier (đọc `themes.tiers` bằng broad = tiền tố trước `': '` của title). Không đổi logic dựng.

- [ ] **Step 6: Test + typecheck**

Run: `pnpm -F @hi-chinese/content test retheme themes-data && pnpm -F @hi-chinese/content typecheck`
Expected: PASS. (Chưa chạy `retheme-units`; output shipped chưa đổi.)

- [ ] **Step 7: Commit**

```bash
git add packages/content
git commit -m "feat(content): tier-weighted unit order for L2/L3 retheme"
```

---

### Task 4: Dựng lại L2/L3 theo tier và sửa nội dung

**Files:**
- Modify: `packages/content/src/authored/units/level{2,3}.json` (sinh), `packages/content/scripts/retheme-units.ts` (`PINS`), `packages/content/src/authored/sentences/level{2,3}.json`, `packages/content/src/authored/grammar/level{2,3}.json` (`examples`), `packages/content/test/core-grammar-data.test.ts` (`CORE`), `packages/content/test/retheme-data.test.ts`, `apps/web/public/content/**`

**Interfaces:**
- Consumes: `orderUnits` tier (Task 3), `sentence-pinyin-data` guard (Task 2), `ThemesFile.tiers`.

- [ ] **Step 1: Thêm guard tier (fail trước khi dựng)**

Trong `test/retheme-data.test.ts`, import `type ThemesFile` từ `../src/pipeline/retheme.js`, và thêm vào `describe.each([2, 3])`:

```ts
  it('put concrete units first and abstract ones later', async () => {
    const units = await loadLevel(level);
    const themes = await readJson<ThemesFile>(resolve(here, '../src/authored/themes', `level${level}.json`));
    const tierOf = (u: Unit) => themes.tiers[broad(u)];
    expect(units.filter((u) => tierOf(u) === undefined).map((u) => u.id)).toEqual([]);
    const mean = (t: number) => {
      const idx = units.flatMap((u, i) => (tierOf(u) === t ? [i] : []));
      return idx.reduce((a, b) => a + b, 0) / idx.length;
    };
    expect(mean(1)).toBeLessThan(mean(2));
    expect(mean(2)).toBeLessThan(mean(3));
    const q = Math.ceil(units.length / 4);
    expect(units.slice(0, q).filter((u) => tierOf(u) === 3).length).toBeLessThanOrEqual(Math.floor(0.15 * q));
    const half = Math.ceil(units.length / 2);
    const lateTier1 = Object.entries(themes.tiers)
      .filter(([, t]) => t === 1)
      .map(([b]) => b)
      .filter((b) => units.findIndex((u) => broad(u) === b) >= half);
    expect(lateTier1).toEqual([]);
  });
```

Run: `pnpm -F @hi-chinese/content test retheme-data`
Expected: FAIL (thứ tự hiện tại).

- [ ] **Step 2: Dựng lại**

Run: `pnpm -F @hi-chinese/content retheme-units && pnpm content:build`
Build sẽ báo lỗi placement/cảnh báo dồn; ghi lại danh sách.

- [ ] **Step 3: Dẫn lại `PINS`**

Pin là số unit → mỗi pin cũ giờ trỏ unit khác. Với từng pin trong `PINS` (L2: 可以, 得, 条件, 取得, 那样; L3: 把): giữ `可以: 1`, `得: 1`; pin khác kiểm tra lý do còn đúng không (18-word cap, crowding), bỏ nếu không cần, hoặc đổi số unit sang unit hợp lý mới và cập nhật comment `// <lý do>; uNN <title mới>`. Chạy lại `retheme-units` + `content:build` sau mỗi thay đổi. Mục tiêu: guard 18 từ và ≤5 điểm ngữ pháp L2/L3 pass.

- [ ] **Step 4: Sửa placement, dồn, lesson trống**

Như phần 4 (spec retheme §4): lỗi `density-examples`/`anchor-examples` → viết câu mới (id `s:l2:fill:NNN`/`s:l3:fill:NNN` nối tiếp) và thêm id vào `examples`; dồn > 5 → pin hoặc câu bù; lesson trống → `pnpm -F @hi-chinese/content lesson-gaps --level 2` / `--level 3`, viết 1 câu/lesson trống. Mọi câu mới theo Global Constraints và phải qua `sentence-pinyin-data`.

- [ ] **Step 5: `CORE`**

Cập nhật unit của 6 điểm L2 trong map `CORE` của `test/core-grammar-data.test.ts` theo unit mới của anchor; `g:keyi-permission` và `g:de-degree` phải ở `l2-u01` (nếu không, sửa pin, không sửa kỳ vọng).

- [ ] **Step 6: Toàn bộ test**

Run: `pnpm content:build && pnpm -F @hi-chinese/content test && pnpm -F @hi-chinese/web test`
Expected: PASS; build 0 lỗi placement/validate, cảnh báo dồn chỉ còn `l1-u12`; `lesson-gaps` 0 lesson trống ở L2/L3.

- [ ] **Step 7: Commit**

```bash
git add packages/content apps/web/public/content -f
git commit -m "feat(content): rebuild L2/L3 units in tier order, re-derive pins, fill gaps"
```

Report: danh sách unit mới theo quý (broad + tier), pin cuối, số câu mới, id câu mới.

---

### Task 5: Gỡ dồn `l1-u12` + guard dồn mọi level

**Files:**
- Modify: `packages/content/src/authored/sentences/level1.json`, `packages/content/src/authored/grammar/level1.json` (`examples`), `packages/content/test/retheme-data.test.ts`, `apps/web/public/content/**`

**Interfaces:**
- Consumes: `findCrowdedUnits`, `MAX_GRAMMAR_PER_UNIT` (`src/pipeline/grammar-crowding.ts`); placement L1: điểm không anchor vào unit có ví dụ sớm nhất.

- [ ] **Step 1: Guard fail**

Trong `test/retheme-data.test.ts`, thêm (ngoài `describe.each`):

```ts
describe('shipped L1 units', () => {
  it(`hold at most ${MAX_GRAMMAR_PER_UNIT} grammar points per unit`, async () => {
    expect(findCrowdedUnits(await loadLevel(1))).toEqual([]);
  });
});
```

Run: `pnpm -F @hi-chinese/content test retheme-data`
Expected: FAIL `[{ unitId: 'l1-u12', count: 9 }]`.

- [ ] **Step 2: Dời điểm**

Điểm hiện ở `l1-u12`: `g:banian-halfunit g:bie-prohibition g:changchang-frequency g:gen-with g:meiyou-negation g:xian-first g:xiangdui-shijian g:xingqi-week g:xingqitian-sunday`. Với mỗi điểm không có `anchor` trong `authored/grammar/level1.json`, viết 1 câu ví dụ đúng mẫu chỉ dùng từ đã học tới một unit L1 sớm hơn (chọn unit hợp chủ đề và còn ≤ 4 điểm), id `s:l1:fill:NNN` nối tiếp, thêm id vào `examples` của điểm. Dời tới khi `l1-u12` ≤ 5 và không unit L1 nào > 5. Điểm có anchor ở `l1-u12` giữ nguyên.

- [ ] **Step 3: Build + test**

Run: `pnpm content:build && pnpm -F @hi-chinese/content test && pnpm -F @hi-chinese/web test`
Expected: PASS; build 0 cảnh báo dồn; `lesson-gaps --level 1` 0 lesson trống; `core-grammar-data` pass (CORE L1 không đổi).

- [ ] **Step 4: Commit**

```bash
git add packages/content apps/web/public/content -f
git commit -m "fix(content): spread l1-u12 grammar, guard crowding on every level"
```

---

### Task 6: `useLiveQuery` báo lỗi

**Files:**
- Modify: `apps/web/src/db/use-live-query.ts`, `apps/web/src/path/UnitScreen.tsx`, `apps/web/src/path/PathScreen.tsx`, `apps/web/src/lessons/LessonFlow.tsx`, `apps/web/test/path/UnitScreen.test.tsx`
- Create: `apps/web/test/db/use-live-query.test.tsx`

**Interfaces:**
- Produces: `useLiveQuery<T>(querier, deps): LiveQueryResult<T>` với `interface LiveQueryResult<T> { data: T | undefined; error: unknown; retry: () => void }`; `PROGRESS_READ_ERROR = 'Could not read saved progress on this device.'` export từ `use-live-query.ts`.

- [ ] **Step 1: Test hook fail**

`apps/web/test/db/use-live-query.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLiveQuery } from '../../src/db/use-live-query.js';

describe('useLiveQuery', () => {
  it('returns data from the querier', async () => {
    const { result } = renderHook(() => useLiveQuery(async () => 42, []));
    await waitFor(() => expect(result.current.data).toBe(42));
    expect(result.current.error).toBeUndefined();
  });

  it('surfaces a failure and recovers on retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let fail = true;
    const querier = vi.fn(async () => {
      if (fail) throw new Error('boom');
      return 'ok';
    });
    const { result } = renderHook(() => useLiveQuery(querier, []));
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.data).toBeUndefined();
    fail = false;
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.data).toBe('ok'));
    expect(result.current.error).toBeUndefined();
  });
});
```

Run: `pnpm -F @hi-chinese/web test use-live-query`
Expected: FAIL (`result.current.data` undefined — hook trả giá trị trần).

- [ ] **Step 2: Implement hook**

```ts
import { liveQuery } from 'dexie';
import { useCallback, useEffect, useState } from 'react';

export const PROGRESS_READ_ERROR = 'Could not read saved progress on this device.';

export interface LiveQueryResult<T> {
  /** `undefined` until the first result. */
  data: T | undefined;
  /** The last query failure, `undefined` when the query is healthy. */
  error: unknown;
  /** Re-subscribes after a failure. */
  retry: () => void;
}

/** Re-runs `querier` whenever the Dexie tables it reads change. */
export function useLiveQuery<T>(
  querier: () => Promise<T>,
  deps: readonly unknown[],
): LiveQueryResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(undefined);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setError(undefined);
    const sub = liveQuery(querier).subscribe({
      next: (v) => {
        setError(undefined);
        setData(v);
      },
      error: (err: unknown) => {
        console.error('live query failed', err);
        setError(err);
      },
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the caller's query inputs
  }, [...deps, attempt]);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { data, error, retry };
}
```

- [ ] **Step 3: Cập nhật màn hình**

`UnitScreen.tsx`:

```tsx
  const progressRows = useLiveQuery(() => db.unitProgress.toArray(), []);
  const rows = progressRows.data;
  const unit = content.unitById.get(unitId);

  if (!unit) return <p role="alert">Unknown unit.</p>;
  if (progressRows.error !== undefined)
    return <InlineError message={PROGRESS_READ_ERROR} onRetry={progressRows.retry} />;
  if (rows === undefined || chunk.status === 'loading') return <Loading />;
```

(import `PROGRESS_READ_ERROR` từ `../db/use-live-query.js`).

`PathScreen.tsx`:

```tsx
  const rowsQ = useLiveQuery(() => db.unitProgress.toArray(), []);
  const activitiesQ = useLiveQuery(() => db.activity.toArray(), []);
  const dueQ = useLiveQuery(() => getDueCount(db, Date.now()), []);
  const [unlockAll, setUnlockAll] = useUnlockAll();
  const failed = [rowsQ, activitiesQ, dueQ].filter((q) => q.error !== undefined);
  if (failed.length > 0)
    return <InlineError message={PROGRESS_READ_ERROR} onRetry={() => failed.forEach((q) => q.retry())} />;
  const rows = rowsQ.data;
  const activities = activitiesQ.data;
  const dueCount = dueQ.data;
  if (rows === undefined) return <Loading />;
```

(import `InlineError` từ `../ui/InlineError.js` nếu chưa có, và `PROGRESS_READ_ERROR`).

`LessonFlow.tsx`: đổi thành `const progressQ = useLiveQuery(() => db.unitProgress.get(chunk.unit.id), [chunk.unit.id]); const progress = progressQ.data;` (effect giữ nguyên, dùng `progress`). Sau `useEffect` và trước `if (state.phase === 'done')`, thêm:

```tsx
  if (progressQ.error !== undefined)
    return <InlineError message={PROGRESS_READ_ERROR} onRetry={progressQ.retry} />;
```

Grep `useLiveQuery(` trong `apps/web/src` — không còn nơi nào dùng giá trị trần.

- [ ] **Step 4: Test màn hình**

Trong `apps/web/test/path/UnitScreen.test.tsx`, thêm vào `describe('UnitScreen')`:

```tsx
  it('shows a retryable error when saved progress cannot be read', async () => {
    stubFetch(noSync);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const toArray = vi.spyOn(db.unitProgress, 'toArray').mockRejectedValueOnce(new Error('idb broken'));
    renderApp('/unit/l1-u01');
    expect(await screen.findByText('Could not read saved progress on this device.')).toBeTruthy();
    screen.getByRole('button', { name: 'Retry' }).click();
    expect(await screen.findByRole('heading', { name: 'Unit 1' })).toBeTruthy();
    toArray.mockRestore();
  });
```

(Nếu Dexie `liveQuery` không đi qua method đã spy — test không thấy lỗi — đổi sang `vi.spyOn(db, 'unitProgress', 'get')` trả table giả có `toArray` reject, và ghi lý do trong report.)

- [ ] **Step 5: Test + typecheck**

Run: `pnpm -F @hi-chinese/web test && pnpm -F @hi-chinese/web typecheck`
Expected: PASS (timeout lẻ dưới tải → chạy lại file đó một lần).

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "fix(web): surface IndexedDB query failures with a retry"
```

---

### Task 7: Track content build, roadmap, danh sách native review

**Files:**
- Modify: `.gitignore`, `docs/superpowers/plans/README.md`
- Create: `docs/superpowers/specs/2026-09-24-unit-order-tech-debt-native-review.md`

- [ ] **Step 1: `.gitignore`**

Xóa dòng `apps/web/public/content/`. Chạy `pnpm content:build && git status --porcelain` → Expected: không có dòng nào (mọi file content đã track; không lộ file tạm). Nếu có file untracked mới trong `apps/web/public/content`, xem đó là output thật (add) hay rác (thêm pattern hẹp vào `.gitignore`), ghi trong report. Grep `add -f` trong `README.md`, `CLAUDE.md`, `docs/` (không kể plan cũ) và bỏ hướng dẫn đó nếu có.

- [ ] **Step 2: Roadmap**

Trong `docs/superpowers/plans/README.md`, sau bảng phase 1-6 thêm bảng "Sau phase 6" với các plan: `2026-09-12-p0-authored-units-safety-net.md`, `2026-09-12-p1-han-viet-readings.md`, `2026-09-12-p2-vietnamese-meanings.md`, `2026-09-13-p4-p5-l2-l3-themes.md`, `2026-09-14-multi-user-sync.md`, và "Audit curriculum 2026-09-24": `2026-09-24-core-grammar.md`, `2026-09-24-l2-l3-grammar-placement.md`, `2026-09-24-lesson-sentence-coverage.md`, `2026-09-24-l2-l3-retheme.md`, `2026-09-24-unit-order-tech-debt.md` — mỗi dòng: plan, spec, một câu "Delivers" (đọc đầu mỗi plan để viết), trạng thái (merged / this branch). Thêm mục "Còn mở": native review trước deploy; lesson chỉ 1 câu (đo 2026-09-24: L1 64, L2 95, L3 143); từ chưa có câu (L1 240, L2 414, L3 580).

- [ ] **Step 3: Danh sách native review**

Liệt kê câu mới/sửa trên branch:

```bash
BASE=$(git merge-base HEAD main)
for L in 1 2 3; do
  git show $BASE:packages/content/src/authored/sentences/level$L.json > /tmp/old$L.json
  node -e '
    const [o,n]=[process.argv[1],process.argv[2]].map(p=>JSON.parse(require("fs").readFileSync(p)));
    const m=new Map(o.map(s=>[s.id,s]));
    for(const s of n){const p=m.get(s.id);if(!p)console.log("new",s.id,s.zh,s.pinyin,s.vi);else if(JSON.stringify(p)!==JSON.stringify(s))console.log("changed",s.id,s.zh,p.pinyin,"→",s.pinyin);}
  ' /tmp/old$L.json packages/content/src/authored/sentences/level$L.json
done
```

Ghi vào file native-review theo mẫu `2026-09-24-l2-l3-retheme-native-review.md` (bảng: id, zh, pinyin, vi, ghi chú; nhóm "câu mới" và "pinyin đã sửa"), kèm danh sách override mới trong `pinyin-overrides.json` và nghĩa mới của 只.

- [ ] **Step 4: Toàn bộ test**

Run: `pnpm test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .gitignore docs
git commit -m "chore: track built content; roadmap and native-review list for unit order"
```
