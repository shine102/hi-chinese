import type { ContentBundle } from '../types.js';

export interface OrderViolation {
  word: string;
  wordId: string;
  unitId: string;
  char: string;
  charWordId: string;
  charUnitId: string;
}

/**
 * Finds compound words that are taught at or before the single-character word made of one
 * of their own constituent characters (when that character is itself a course word). This
 * is a curation signal, not a hard rule: some holistic high-frequency terms (e.g. 谢谢) are
 * deliberately taught before their parts, so callers should warn rather than fail the build.
 *
 * A character whose own HSK level is HIGHER than the compound's level is skipped: HSK itself
 * lists that character as harder than the compound built from it (e.g. 名字 is HSK1 but 名 is
 * only an HSK2 headword), so no curation choice can front-load it without breaking the level
 * structure. That is not a curation defect, just a property of the source word list.
 */
export function findOrderViolations(
  bundle: Pick<ContentBundle, 'words' | 'units'>,
): OrderViolation[] {
  const wordBySimplified = new Map(bundle.words.map((w) => [w.simplified, w]));
  const unitOrderById = new Map(bundle.units.map((u) => [u.id, u.order]));
  const positionInUnit = new Map<string, number>();
  for (const u of bundle.units) {
    u.wordIds.forEach((id, idx) => positionInUnit.set(id, idx));
  }

  const violations: OrderViolation[] = [];
  for (const w of bundle.words) {
    const seenChars = new Set<string>();
    for (const ch of w.characters) {
      if (seenChars.has(ch) || ch === w.simplified) continue;
      seenChars.add(ch);
      const charWord = wordBySimplified.get(ch);
      if (!charWord) continue;
      if (charWord.level > w.level) continue;
      const wOrder = unitOrderById.get(w.unitId);
      const cOrder = unitOrderById.get(charWord.unitId);
      if (wOrder === undefined || cOrder === undefined) continue;
      const samePositionViolation =
        cOrder === wOrder &&
        (positionInUnit.get(charWord.id) ?? 0) >= (positionInUnit.get(w.id) ?? 0);
      if (cOrder > wOrder || samePositionViolation) {
        violations.push({
          word: w.simplified,
          wordId: w.id,
          unitId: w.unitId,
          char: ch,
          charWordId: charWord.id,
          charUnitId: charWord.unitId,
        });
      }
    }
  }
  return violations;
}
