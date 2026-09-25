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
