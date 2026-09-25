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

// CVDICT senses that are dictionary noise for a course author rather than a usable everyday
// sense: place names, variant/bound-form stubs, name labels, vulgar slang, transliteration
// and abbreviation notes. Whole word is dropped when its only readable entry matches this.
const NOISE =
  /biến thể của|dị thể|thành phố|huyện|quận|tỉnh|thị trấn|địa danh|tên (người|riêng|họ)|họ \S+ ?$|\(tục\)|thô tục|chửi|phiên âm|viết tắt của/i;

export function cvdictCandidates(
  char: string,
  taught: string,
  cvdict: ReadonlyMap<string, readonly CedictEntry[]>,
  courseWords: ReadonlySet<string>,
  courseChars: ReadonlySet<string>,
  limit = 30,
): { zh: string; pinyin: string; vi: string; inCourse: boolean; allCourseChars: boolean }[] {
  const out: { zh: string; pinyin: string; vi: string; inCourse: boolean; allCourseChars: boolean }[] = [];
  for (const [zh, entries] of cvdict) {
    const len = [...zh].length;
    if (len < 2 || len > 4 || !zh.includes(char)) continue;
    for (const e of entries) {
      const pinyin = numberedToMarked(e.pinyin)?.toLowerCase();
      if (!pinyin) continue;
      const aligned = alignSyllables(zh, pinyin);
      if (!aligned || aligned.some((p) => p.char === char && p.syllable !== taught)) continue;
      if (NOISE.test(e.meanings.join('; '))) continue;
      out.push({
        zh,
        pinyin,
        vi: e.meanings.slice(0, 2).join('; '),
        inCourse: courseWords.has(zh),
        allCourseChars: [...zh].every((c) => courseChars.has(c)),
      });
      break;
    }
  }
  return out
    .sort(
      (a, b) =>
        Number(b.inCourse) - Number(a.inCourse) ||
        Number(b.allCourseChars) - Number(a.allCourseChars) ||
        [...a.zh].length - [...b.zh].length,
    )
    .slice(0, limit);
}
