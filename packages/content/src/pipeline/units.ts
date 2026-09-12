import { unitId } from '../ids.js';
import type { AuthoredUnit, HskLevel, Unit, Word } from '../types.js';

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
  authoredUnits: AuthoredUnit[] = [],
  options: UnitOptions = DEFAULT_UNIT_OPTIONS,
): { units: Unit[]; words: Word[] } {
  const idBySimplified = new Map(words.map((w) => [w.simplified, w.id]));

  const byLevel = new Map<HskLevel, Word[]>();
  for (const w of words) {
    const list = byLevel.get(w.level) ?? [];
    list.push(w);
    byLevel.set(w.level, list);
  }

  const authoredByLevel = new Map<HskLevel, AuthoredUnit[]>();
  for (const au of authoredUnits) {
    const list = authoredByLevel.get(au.level) ?? [];
    list.push(au);
    authoredByLevel.set(au.level, list);
  }

  const units: Unit[] = [];
  const unitByWordId = new Map<string, string>();
  let order = 0;
  for (const level of [...byLevel.keys()].sort((a, b) => a - b)) {
    const authored = authoredByLevel.get(level);
    if (authored && authored.length > 0) {
      for (const au of [...authored].sort((a, b) => a.order - b.order)) {
        order += 1;
        const wordIds = au.words.map((simplified) => {
          const id = idBySimplified.get(simplified);
          if (!id) throw new Error(`authored unit ${au.id}: unknown word "${simplified}"`);
          return id;
        });
        units.push({
          id: au.id,
          level,
          order,
          title: au.title,
          wordIds,
          grammarIds: [],
          sentenceIds: [],
        });
        for (const id of wordIds) unitByWordId.set(id, au.id);
      }
      continue;
    }

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
