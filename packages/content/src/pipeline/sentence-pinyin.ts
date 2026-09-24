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

// prettier-ignore
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
  '了',
  '懂',
  '下',
  '到',
  '完',
  '见',
  '起',
  '动',
  '开',
  '住',
  '好',
  '出来',
  '进去',
  '上',
  '来',
  '去',
  '清楚',
  '着',
  '起来',
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
  clause: number; // index of the clause (split at punctuation) it belongs to
}

function letters(pinyin: string): Letter[] {
  const out: Letter[] = [];
  let word = 0;
  let clause = 0;
  let inWord = false;
  for (const raw of pinyin.normalize('NFC').toLowerCase()) {
    const mark = MARKS[raw];
    const ch = mark ? mark[0] : raw;
    if (/[a-z]/.test(ch)) {
      if (!inWord && out.length > 0) word++;
      inWord = true;
      out.push({ ch, tone: mark ? mark[1] : 0, word, clause });
    } else if (raw !== "'" && raw !== '’') {
      inWord = false;
      if (/[,.!?;:，。！？；：、…]/.test(raw)) clause++;
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

const syllableCount = (path: readonly Span[], token: number) =>
  path.filter((x) => x.token === token).length;

// Tones the course accepts for the span at index i of the path.
export function allowedTones(
  words: readonly string[],
  path: readonly Span[],
  i: number,
): Set<number> {
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
  const sandhi =
    (ch === '不' || ch === '一') && nextTone !== undefined && (token.length === 1 || !last);
  if (sandhi && ch === '不') {
    allowed.clear();
    allowed.add(nextTone === 4 ? 2 : 4);
    if (s.pos > 0) allowed.add(5); // lexicalised V不C: 对不起, 差不多
    if (
      token === '不' &&
      ((prev !== undefined && next !== undefined && next.startsWith(prev)) ||
        POTENTIAL_COMPLEMENTS.has(next ?? ''))
    )
      allowed.add(5);
  } else if (sandhi && ch === '一') {
    const counting =
      token === '一' &&
      ((prev !== undefined && (ORDINAL_PREV.has(prev) || NUMERALS.has(prev))) ||
        (next !== undefined &&
          (ORDINAL_NEXT.has(next) || (NUMERALS.has(next) && !BIG_NUMERALS.has(next)))));
    allowed.clear();
    if (counting) allowed.add(1);
    else allowed.add(nextTone === 4 || nextTone === 5 ? 2 : 4);
    if (token === '一' && prev !== undefined && prev === next) allowed.add(5); // V一V
  }
  if (token === '个') allowed.add(5);
  // Reduplicated verb: 问问, 看看 (two tokens or one), V一V's second V.
  if (
    s.pos === 0 &&
    token.length === 1 &&
    (prev === token || (prev === '一' && words[s.token - 2] === token))
  )
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
    // Sandhi looks at the next syllable only inside the same clause.
    const next = path[i + 1];
    const clauseEnd = next !== undefined && ls[s.b - 1]!.clause !== ls[next.a]!.clause;
    const allowed = allowedTones(words, clauseEnd ? path.slice(0, i + 1) : path, i);
    if (!allowed.has(got))
      out.push({
        id,
        kind: 'tone',
        token: words[s.token]!,
        expected: [...allowed].join('|'),
        got: String(got),
      });
  });
  // Boundaries: one token never spans two pinyin words; one pinyin word holds one token
  // unless the pair is in JOINED_PAIRS.
  for (let t = 0; t < words.length; t++) {
    const spans = path.filter((s) => s.token === t);
    if (spans.length === 0) continue;
    const first = ls[spans[0]!.a]!.word;
    const last = ls[spans[spans.length - 1]!.b - 1]!.word;
    if (first !== last && spans.length === 2 && !SPLIT_TWO_SYLLABLE.has(words[t]!))
      out.push({ id, kind: 'split', token: words[t]!, expected: 'one word', got: 'split' });
    if (t > 0) {
      const prevSpans = path.filter((s) => s.token === t - 1);
      const prevLast = ls[prevSpans[prevSpans.length - 1]!.b - 1]!.word;
      const pair = words[t - 1]! + words[t]!;
      const numerals = [...pair].every((c) => NUMERALS.has(c));
      const redup = words[t - 1] === words[t];
      if (
        prevLast === first &&
        !JOINED_PAIRS.has(pair) &&
        !JOIN_SUFFIXES.has(words[t]!) &&
        !numerals &&
        !redup
      )
        out.push({
          id,
          kind: 'join',
          token: words[t - 1]! + words[t]!,
          expected: 'separate',
          got: 'joined',
        });
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
    // Capitalised alternates are surname/place readings (都 Dū), never the course reading.
    const readings = [
      w.pinyinNumeric,
      ...(w.alternates ?? []).map((a) => a.pinyinNumeric).filter((p) => !/^[A-Z]/.test(p)),
    ];
    tokens.push(readings.map(syllables));
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
  return (
    best ?? [
      { id, kind: 'syllables', token: words.join(' '), expected: 'token readings', got: flat },
    ]
  );
}
