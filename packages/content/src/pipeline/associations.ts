import type {
  Association,
  AuthoredAssociation,
  AuthoredAssociationEntry,
  HanVietResolver,
  HskLevel,
  Word,
} from '../types.js';
import { numberedToMarked, type CedictEntry } from './cedict.js';

export const MIN_ASSOCIATIONS = 1;
export const MAX_ASSOCIATIONS = 3;
/** Levels whose single-character words are fully authored; coverage guards apply to these. */
export const ASSOCIATION_LEVELS_DONE: readonly HskLevel[] = [1, 2, 3];
/** True once every course character has a gloss (authored/char-glosses.json). */
export const GLOSSES_DONE = true;

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

/** "Tài píng yáng" -> ["tài", "píng", "yáng"]; tone marks and ü are kept. */
export function toneSyllables(pinyin: string): string[] {
  return pinyin
    .toLowerCase()
    .normalize('NFC')
    .split(/[\s'’-]+/)
    .map((s) => s.normalize('NFC').replace(/[^\p{L}]/gu, ''))
    .filter((s) => s.length > 0);
}

/**
 * Pairs each Han character of `zh` with its toneless syllable and its tone-marked syllable. An
 * erhua 儿 written into the previous syllable ("kòngr") gets '' for both and the trailing r is
 * dropped from the previous syllable's toneless and tone forms. Null when the syllables cannot be
 * matched to the characters.
 */
export function alignSyllables(
  zh: string,
  pinyin: string,
): { char: string; syllable: string; tone: string }[] | null {
  const chars = [...zh].filter((c) => HAN.test(c));
  const syllables = tonelessSyllables(pinyin);
  const tones = toneSyllables(pinyin);
  if (syllables.length === chars.length) {
    return chars.map((char, i) => ({ char, syllable: syllables[i]!, tone: tones[i]! }));
  }
  const out: { char: string; syllable: string; tone: string }[] = [];
  let j = 0;
  for (const char of chars) {
    const prev = out[out.length - 1];
    if (char === '儿' && prev && prev.syllable.endsWith('r') && prev.syllable !== 'er') {
      prev.syllable = prev.syllable.slice(0, -1);
      if (prev.tone.endsWith('r')) prev.tone = prev.tone.slice(0, -1);
      out.push({ char, syllable: '', tone: '' });
      continue;
    }
    const s = syllables[j];
    const t = tones[j];
    j++;
    if (s === undefined) return null;
    out.push({ char, syllable: s, tone: t ?? '' });
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

/** Key for the (char, toneless syllable) -> Hán Việt map built from course words. */
const courseKey = (char: string, syllable: string) => `${char}\u0000${syllable}`;

/**
 * Maps each course character, keyed by the toneless syllable it's taught with, to the Hán Việt
 * reading it has in that course word — built from every course word whose Hán Việt splits into
 * one part per Han character. Used to catch a polyphone whose char-map reading doesn't match the
 * reading it's actually used with in a non-course association (e.g. 长 taught as cháng "Trường"
 * but char-mapped to "Trưởng", its other reading).
 */
function buildCourseHanVietMap(words: readonly Word[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const w of words) {
    const aligned = alignSyllables(w.simplified, w.pinyin);
    if (!aligned) continue;
    const hvParts = w.hanViet.split(/\s+/).filter(Boolean);
    if (hvParts.length !== aligned.length) continue;
    aligned.forEach((p, i) => {
      const key = courseKey(p.char, p.syllable);
      if (!map.has(key)) map.set(key, hvParts[i]!);
    });
  }
  return map;
}

export function resolveAssociations(
  authored: Readonly<Record<string, AuthoredAssociationEntry>>,
  words: readonly Word[],
  cvdict: ReadonlyMap<string, readonly CedictEntry[]>,
  hanViet: HanVietResolver,
): { byChar: ResolvedAssociations; errors: AssociationError[] } {
  const bySimplified = new Map(words.map((w) => [w.simplified, w]));
  const courseHanVietMap = buildCourseHanVietMap(words);
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
      if (!course && a.hanViet === undefined) {
        const mismatch = aligned.find((p) => {
          const courseHv = courseHanVietMap.get(courseKey(p.char, p.syllable));
          return courseHv !== undefined && courseHv !== hanViet.char(p.char);
        });
        if (mismatch) {
          const courseHv = courseHanVietMap.get(courseKey(mismatch.char, mismatch.syllable))!;
          const charMapHv = hanViet.char(mismatch.char);
          err(
            'association-hanviet',
            ref,
            `${a.zh}: Hán Việt of ${mismatch.char} for ${mismatch.syllable} in the course is ${courseHv}, char-map gives ${charMapHv} — add "hanViet"`,
          );
          continue;
        }
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

/** Single-character words of `levels` with neither 1–3 associations nor an explicit none. */
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
