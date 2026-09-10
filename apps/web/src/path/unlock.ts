import type { UnitProgressRow } from '@hi-chinese/content';

export type UnitState = 'locked' | 'available' | 'in-progress' | 'completed';

/**
 * Spec §4: the unit after the last completed one is unlocked; everything before it
 * stays available (or shows its own progress); everything after it is locked.
 */
export function computeUnitStates(
  unitOrder: readonly string[],
  rows: readonly UnitProgressRow[],
): Map<string, UnitState> {
  const byId = new Map(rows.map((r) => [r.unitId, r] as const));
  let frontier = 0;
  unitOrder.forEach((id, i) => {
    if (byId.get(id)?.status === 'completed') frontier = Math.max(frontier, i + 1);
  });
  const states = new Map<string, UnitState>();
  unitOrder.forEach((id, i) => {
    const row = byId.get(id);
    if (row?.status === 'completed') states.set(id, 'completed');
    else if (i > frontier) states.set(id, 'locked');
    else if (row?.status === 'in-progress') states.set(id, 'in-progress');
    else states.set(id, 'available');
  });
  return states;
}
