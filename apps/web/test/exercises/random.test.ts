import { describe, expect, it } from 'vitest';
import { mulberry32, pick, randomInt, shuffle } from '../../src/exercises/random.js';

describe('mulberry32', () => {
  it('is deterministic and stays in [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const xs = Array.from({ length: 100 }, () => a());
    expect(xs).toEqual(Array.from({ length: 100 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(new Set(xs).size).toBeGreaterThan(90);
  });
});

describe('shuffle / pick / randomInt', () => {
  it('shuffle keeps every element exactly once and does not mutate its input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input, mulberry32(1));
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort((x, y) => x - y)).toEqual(input);
    expect(out).not.toEqual(input);
  });
  it('pick returns n distinct elements', () => {
    const out = pick(['a', 'b', 'c', 'd'], 3, mulberry32(7));
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
  });
  it('randomInt stays below the bound', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 50; i++) {
      const n = randomInt(4, rng);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(4);
    }
  });
});
