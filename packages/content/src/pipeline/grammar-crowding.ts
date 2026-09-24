import type { Unit } from '../types.js';

/**
 * Units with more grammar points than this get a build warning. Density placement puts each
 * point where its examples are, so conjunction/time-themed units can collect many; that is a
 * curation signal (re-theme the units), not an error.
 */
export const MAX_GRAMMAR_PER_UNIT = 5;

export function findCrowdedUnits(
  units: Pick<Unit, 'id' | 'grammarIds'>[],
  max = MAX_GRAMMAR_PER_UNIT,
): { unitId: string; count: number }[] {
  return units
    .filter((u) => u.grammarIds.length > max)
    .map((u) => ({ unitId: u.id, count: u.grammarIds.length }))
    .sort((a, b) => b.count - a.count || a.unitId.localeCompare(b.unitId));
}
