import type { UnitProgressRow } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';
import { computeUnitStates } from '../../src/path/unlock.js';

const order = ['l1-u01', 'l1-u02', 'l1-u03', 'l1-u04'];
const row = (unitId: string, status: UnitProgressRow['status']): UnitProgressRow => ({
  unitId,
  status,
  completedAt: status === 'completed' ? 1 : null,
  lessonsCompleted: 0,
  updatedAt: 1,
});

describe('computeUnitStates', () => {
  it('unlocks only the first unit when nothing is done', () => {
    const s = computeUnitStates(order, []);
    expect([...s.values()]).toEqual(['available', 'locked', 'locked', 'locked']);
  });

  it('unlocks the unit after the last completed one and keeps earlier units available', () => {
    const s = computeUnitStates(order, [row('l1-u01', 'completed'), row('l1-u02', 'completed')]);
    expect([...s.values()]).toEqual(['completed', 'completed', 'available', 'locked']);
  });

  it('shows in-progress for opened units before the frontier', () => {
    const s = computeUnitStates(order, [row('l1-u01', 'in-progress')]);
    expect([...s.values()]).toEqual(['in-progress', 'locked', 'locked', 'locked']);
  });

  it('uses the furthest completed unit as the frontier even with gaps', () => {
    const s = computeUnitStates(order, [row('l1-u03', 'completed')]);
    expect([...s.values()]).toEqual(['available', 'available', 'completed', 'available']);
  });

  it('ignores rows for units that are not in the path', () => {
    const s = computeUnitStates(order, [row('zz', 'completed')]);
    expect(s.get('zz')).toBeUndefined();
    expect(s.get('l1-u01')).toBe('available');
  });
});
