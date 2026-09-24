import { describe, expect, it } from 'vitest';
import {
  chunkSubthemes,
  fixCharOrder,
  isFunctionWord,
  MISSING_FREQUENCY,
  nameUnits,
  orderUnits,
  spreadFunctionWords,
  type DraftUnit,
  type ThemesFile,
  type Tier,
  type WordInfo,
} from '../src/pipeline/retheme.js';
import type { AuthoredUnit, HskLevel } from '../src/types.js';

const tw = (simplified: string, frequency: number) => ({ simplified, frequency });
const draft = (subthemeId: string, broad: string, score: number, words: string[] = [], tier: Tier = 1): DraftUnit => ({
  subthemeId,
  broad,
  title: `${broad}: ${subthemeId}`,
  words,
  score,
  tier,
});

describe('isFunctionWord', () => {
  it('flags conjunctions, adverbs, prepositions and particles', () => {
    expect(isFunctionWord(['c'])).toBe(true);
    expect(isFunctionWord(['v', 'd'])).toBe(true);
    expect(isFunctionWord(['p'])).toBe(true);
    expect(isFunctionWord(['u'])).toBe(true);
    expect(isFunctionWord(['n', 'v'])).toBe(false);
    expect(isFunctionWord([])).toBe(false);
  });
});

describe('chunkSubthemes', () => {
  const themes: ThemesFile = {
    tiers: { A: 1, B: 1 },
    subthemes: [
      { id: 'a', broad: 'A', title: 'A: a' },
      { id: 'b', broad: 'B', title: 'B: b' },
    ],
    words: {},
  };

  it('splits a subtheme into round(n/12) frequency-sorted units', () => {
    const words = Array.from({ length: 24 }, (_, i) => tw(`a${i}`, 100 - i));
    const t = { ...themes, words: Object.fromEntries(words.map((w) => [w.simplified, 'a'])) };
    const units = chunkSubthemes(t, words);
    expect(units.map((u) => u.words.length)).toEqual([12, 12]);
    expect(units[0]!.words[0]).toBe('a23'); // frequency 77, the most common
    expect(units.every((u) => u.subthemeId === 'a' && u.broad === 'A')).toBe(true);
  });

  it('keeps a small subtheme as one unit and scores by mean frequency', () => {
    const words = [tw('x', 10), tw('y', 30)];
    const units = chunkSubthemes({ ...themes, words: { x: 'b', y: 'b' } }, words);
    expect(units).toHaveLength(1);
    expect(units[0]!.score).toBe(20);
  });

  it('ignores missing frequencies in the score', () => {
    const t = { ...themes, words: { x: 'b', y: 'b', z: 'b', m: 'a' } };
    const [a, b] = chunkSubthemes(t, [tw('x', 10), tw('y', 30), tw('z', MISSING_FREQUENCY), tw('m', 1_000_000)]);
    expect(a!.score).toBe(1_000_000);
    expect(b!.score).toBe(20);
  });

  it('throws on a word with no subtheme or an unknown subtheme', () => {
    expect(() => chunkSubthemes(themes, [tw('x', 1)])).toThrow(/no subtheme for x/);
    expect(() => chunkSubthemes({ ...themes, words: { x: 'zz' } }, [tw('x', 1)])).toThrow(/unknown subtheme zz/);
  });
});

describe('orderUnits', () => {
  it('orders by key but never puts two units of one broad theme side by side', () => {
    // keys: a1 0, b1 0.05, c1 0.075, a2 0.525 (second unit of A sits half-way into the tier)
    const out = orderUnits([draft('a1', 'A', 1), draft('a2', 'A', 2), draft('b1', 'B', 3), draft('c1', 'C', 4)]);
    expect(out.map((u) => u.subthemeId)).toEqual(['a1', 'b1', 'c1', 'a2']);
  });

  it('keeps a dominant broad theme separable', () => {
    const out = orderUnits([
      draft('b1', 'B', 1),
      draft('c1', 'C', 2),
      draft('a1', 'A', 3),
      draft('a2', 'A', 4),
      draft('a3', 'A', 5),
    ]);
    const broads = out.map((u) => u.broad);
    for (let i = 1; i < broads.length; i++) expect(broads[i]).not.toBe(broads[i - 1]);
  });

  it('falls back to score order when only one broad theme is left', () => {
    const out = orderUnits([draft('a1', 'A', 2), draft('a2', 'A', 1)]);
    expect(out.map((u) => u.subthemeId)).toEqual(['a2', 'a1']);
  });
});

describe('nameUnits', () => {
  it('numbers only subthemes that span several units, in order of appearance', () => {
    const out = nameUnits([draft('a', 'A', 1), draft('b', 'B', 2), draft('a', 'A', 3)]);
    expect(out.map((u) => u.title)).toEqual(['A: a 1', 'B: b', 'A: a 2']);
  });
});

describe('spreadFunctionWords', () => {
  const units = () => [draft('a', 'A', 1, ['x']), draft('b', 'B', 2, ['y']), draft('c', 'C', 3, ['z'])];

  it('spreads function words evenly, most common first, at the end of each unit', () => {
    const out = spreadFunctionWords(units(), [tw('f3', 30), tw('f1', 10), tw('f2', 20)]);
    expect(out.map((u) => u.words)).toEqual([['x', 'f1'], ['y', 'f2'], ['z', 'f3']]);
  });

  it('puts two per unit when there are twice as many function words', () => {
    const fn = [1, 2, 3, 4, 5, 6].map((i) => tw(`f${i}`, i));
    const out = spreadFunctionWords(units(), fn);
    expect(out.map((u) => u.words.length)).toEqual([3, 3, 3]);
  });

  it('moves pinned words (content or function) to the pinned 1-based unit', () => {
    const out = spreadFunctionWords(units(), [tw('f1', 1), tw('f2', 2)], { z: 1, f2: 1 });
    expect(out[0]!.words).toEqual(['x', 'f1', 'z', 'f2']);
    expect(out[2]!.words).toEqual([]);
  });

  it('does not mutate its input', () => {
    const input = units();
    spreadFunctionWords(input, [tw('f1', 1)]);
    expect(input[0]!.words).toEqual(['x']);
  });

  it('throws on a pin for a word that is not in the level', () => {
    expect(() => spreadFunctionWords(units(), [], { nope: 1 })).toThrow(/not a word of this level/);
  });

  it('throws on a pin outside the unit range', () => {
    expect(() => spreadFunctionWords(units(), [], { x: 4 })).toThrow(/out of range/);
  });
});

describe('fixCharOrder', () => {
  const unit = (id: string, level: HskLevel, order: number, words: string[]): AuthoredUnit => ({
    id,
    level,
    order,
    title: id,
    words,
  });
  const info = new Map<string, WordInfo>([
    ['大', { level: 1, characters: ['大'] }],
    ['学', { level: 2, characters: ['学'] }],
    ['生', { level: 2, characters: ['生'] }],
    ['学生', { level: 2, characters: ['学', '生'] }],
    ['大学', { level: 2, characters: ['大', '学'] }],
    ['难', { level: 3, characters: ['难'] }],
    ['难过', { level: 2, characters: ['难', '过'] }],
  ]);

  it('moves a single char from a later unit to just before its first compound', () => {
    const out = fixCharOrder(
      [unit('u1', 2, 1, ['学生']), unit('u2', 2, 2, ['学', '生'])],
      info,
      new Set<HskLevel>([1]),
    );
    expect(out.map((u) => u.words)).toEqual([['学', '生', '学生'], []]);
  });

  it('moves a single char later in the same unit before the compound', () => {
    const out = fixCharOrder([unit('u1', 2, 1, ['大学', '学'])], info, new Set<HskLevel>([1]));
    expect(out[0]!.words).toEqual(['学', '大学']);
  });

  it('leaves chars already taught, from frozen levels, or from a higher level', () => {
    const units = [unit('l1', 1, 1, ['大']), unit('u1', 2, 1, ['学', '大学', '难过']), unit('u2', 3, 1, ['难'])];
    const out = fixCharOrder(units, info, new Set<HskLevel>([1]));
    expect(out.map((u) => u.words)).toEqual([['大'], ['学', '大学', '难过'], ['难']]);
  });

  it('does not mutate its input', () => {
    const input = [unit('u1', 2, 1, ['学生']), unit('u2', 2, 2, ['学', '生'])];
    fixCharOrder(input, info, new Set<HskLevel>([1]));
    expect(input[1]!.words).toEqual(['学', '生']);
  });
});

describe('orderUnits with tiers', () => {
  it('pushes an abstract (tier 3) unit behind concrete ones even with a lower score', () => {
    const out = orderUnits([draft('a', 'A', 1, [], 3), draft('b', 'B', 2), draft('c', 'C', 3)]);
    expect(out.map((u) => u.subthemeId)).toEqual(['b', 'c', 'a']);
  });

  it('introduces every broad theme before a second unit of a common one', () => {
    const out = orderUnits([
      draft('a1', 'A', 1),
      draft('a2', 'A', 2),
      draft('a3', 'A', 3),
      draft('b', 'B', 10),
      draft('c', 'C', 11),
      draft('d', 'D', 12),
    ]);
    expect(out.map((u) => u.subthemeId)).toEqual(['a1', 'b', 'c', 'a2', 'd', 'a3']);
  });
});

describe('chunkSubthemes tiers', () => {
  it('copies the broad theme tier and throws when it is missing', () => {
    const t: ThemesFile = {
      tiers: { A: 2 },
      subthemes: [{ id: 'a', broad: 'A', title: 'A: a' }],
      words: { x: 'a' },
    };
    expect(chunkSubthemes(t, [tw('x', 1)])[0]!.tier).toBe(2);
    expect(() => chunkSubthemes({ ...t, tiers: {} }, [tw('x', 1)])).toThrow(/no tier for broad A/);
  });
});
