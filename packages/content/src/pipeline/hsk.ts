import { compareWords, uniqueHanChars, wordId } from '../ids.js';
import { formatCedictRefs, numberedToMarked } from './cedict.js';
import type { HanVietResolver, HskLevel, PinyinOverrides, Word, WordReading } from '../types.js';

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

export function normalizeWord(
  entry: RawHskEntry,
  overrides: PinyinOverrides,
  hanViet: HanVietResolver,
  viMeanings: Record<string, string[]>,
): Word | null {
  const level = hskLevelOf(entry);
  if (level === null) return null;
  const { chosen, others } = chooseReading(entry, overrides);
  const alternates: WordReading[] = others.map((f) => ({
    pinyin: f.transcriptions.pinyin,
    pinyinNumeric: f.transcriptions.numeric,
    meanings: f.meanings.map(formatCedictRefs),
  }));
  return {
    id: wordId(entry.simplified),
    simplified: entry.simplified,
    traditional: chosen.traditional,
    pinyin: chosen.transcriptions.pinyin,
    pinyinNumeric: chosen.transcriptions.numeric,
    hanViet: hanViet.word(entry.simplified),
    meanings: (viMeanings[entry.simplified] ?? chosen.meanings).map(formatCedictRefs),
    alternates,
    pos: entry.pos ?? [],
    classifiers: chosen.classifiers ?? [],
    level,
    frequency: entry.frequency,
    characters: uniqueHanChars(entry.simplified),
    unitId: '',
  };
}

export function parseHskWords(
  entries: RawHskEntry[],
  overrides: PinyinOverrides,
  hanViet: HanVietResolver,
  viMeanings: Record<string, string[]>,
): Word[] {
  const seen = new Set<string>();
  const words: Word[] = [];
  for (const entry of entries) {
    if (seen.has(entry.simplified)) continue;
    const word = normalizeWord(entry, overrides, hanViet, viMeanings);
    if (!word) continue;
    seen.add(entry.simplified);
    words.push(word);
  }
  words.sort(compareWords);
  return words;
}

// Authored reading fixes (reading-fixes.json): simplified → numbered pinyin. For source forms
// whose transcription is malformed ("zhe4 shíhòu") or carries a non-standard tone, which
// pinyin-overrides.json cannot fix because it only picks among existing forms. A fix may
// change tones only, never letters.
export type ReadingFixes = Record<string, string>;

const letters = (pinyin: string) =>
  pinyin
    .normalize('NFD')
    .replace(/[̀-ͯ\d\s:]/g, '')
    .toLowerCase();

export function applyReadingFixes(words: Word[], fixes: ReadingFixes): Word[] {
  const bySimplified = new Set(words.map((w) => w.simplified));
  for (const s of Object.keys(fixes))
    if (!bySimplified.has(s)) throw new Error(`reading fix for ${s}: not a course word`);
  return words.map((w) => {
    const fix = fixes[w.simplified];
    if (fix === undefined) return w;
    const pinyin = numberedToMarked(fix);
    if (pinyin === null)
      throw new Error(`reading fix for ${w.simplified} = "${fix}": not numbered pinyin`);
    if (letters(fix) !== letters(w.pinyinNumeric))
      throw new Error(
        `reading fix for ${w.simplified} = "${fix}": letters differ from "${w.pinyinNumeric}"`,
      );
    return { ...w, pinyin, pinyinNumeric: fix };
  });
}
