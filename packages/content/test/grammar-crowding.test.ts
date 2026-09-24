import { describe, expect, it } from 'vitest';
import { findCrowdedUnits } from '../src/pipeline/grammar-crowding.js';

const u = (id: string, n: number) => ({
  id,
  grammarIds: Array.from({ length: n }, (_, i) => `g${i}`),
});

describe('findCrowdedUnits', () => {
  it('lists units with more grammar points than the threshold, most crowded first', () => {
    expect(findCrowdedUnits([u('a', 5), u('b', 6), u('c', 8), u('d', 6)])).toEqual([
      { unitId: 'c', count: 8 },
      { unitId: 'b', count: 6 },
      { unitId: 'd', count: 6 },
    ]);
  });
  it('honours a custom threshold', () => {
    expect(findCrowdedUnits([u('a', 3), u('b', 2)], 2)).toEqual([{ unitId: 'a', count: 3 }]);
  });
});
