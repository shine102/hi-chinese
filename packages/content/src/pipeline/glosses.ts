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
          new Set(Object.keys(g).map((k) => k.normalize('NFC').toLowerCase())).size === Object.keys(g).length &&
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

export function glossFor(g: CharGloss | undefined, syllable: string, tone = ''): string {
  if (g === undefined) return '';
  if (typeof g === 'string') return g;
  if (tone !== '') {
    const hit = Object.entries(g).find(([k]) => k.normalize('NFC').toLowerCase() === tone);
    if (hit) return hit[1];
  }
  if (syllable === '') {
    const rMatches = Object.entries(g).filter(([k]) => tonelessSyllables(k)[0] === 'r');
    return rMatches.length === 1 ? rMatches[0]![1] : '';
  }
  const matches = Object.entries(g).filter(([k]) => tonelessSyllables(k)[0] === syllable);
  return matches.length === 1 ? matches[0]![1] : '';
}

export interface SingleCharWordRef {
  id: string;
  /** The toneless syllable this single-character word is taught with. */
  syllable: string;
}

export function buildParts(
  word: Word,
  glosses: Readonly<Record<string, CharGloss>>,
  singleCharIds: ReadonlyMap<string, SingleCharWordRef>,
  hanViet: HanVietResolver,
): WordPart[] {
  const chars = [...word.simplified].filter((c) => HAN.test(c));
  const aligned = alignSyllables(word.simplified, word.pinyin);
  const hvParts = word.hanViet.split(/\s+/).filter(Boolean);
  return chars.map((char, i) => {
    const ref = singleCharIds.get(char);
    // Only badge the part as "đã học" when it's read the same way here as the single-char word
    // teaches it — a polyphone read differently (e.g. 行 háng inside 银行, taught as 行 xíng)
    // isn't the word the learner already knows.
    const wordId =
      ref !== undefined && ref.id !== word.id && (aligned?.[i]?.syllable ?? '') === ref.syllable
        ? ref.id
        : undefined;
    return {
      char,
      hanViet: hvParts.length === chars.length ? hvParts[i]! : hanViet.char(char),
      gloss: glossFor(glosses[char], aligned?.[i]?.syllable ?? '', aligned?.[i]?.tone ?? ''),
      ...(wordId !== undefined ? { wordId } : {}),
    };
  });
}

export function attachParts(
  words: readonly Word[],
  glosses: Readonly<Record<string, CharGloss>>,
  hanViet: HanVietResolver,
): Word[] {
  const singleCharIds = new Map<string, SingleCharWordRef>(
    words
      .filter((w) => [...w.simplified].length === 1)
      .map((w) => [w.simplified, { id: w.id, syllable: tonelessSyllables(w.pinyin)[0] ?? '' }]),
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
