import type { UnitProgressRow } from '@hi-chinese/content';
import { describe, expect, it } from 'vitest';
import { pickWinners } from '../../src/sync/merge.js';

const row = (unitId: string, updatedAt: number): UnitProgressRow => ({
  unitId,
  status: 'completed',
  completedAt: updatedAt,
  updatedAt,
});

describe('pickWinners', () => {
  it('keeps remote rows that are new locally or strictly newer', () => {
    const local = new Map([
      ['a', row('a', 100)],
      ['b', row('b', 200)],
      ['c', row('c', 300)],
    ]);
    const remote = [row('a', 150), row('b', 200), row('c', 250), row('d', 10)];
    expect(pickWinners(remote, local, (r) => r.unitId).map((r) => r.unitId)).toEqual(['a', 'd']);
  });
});
